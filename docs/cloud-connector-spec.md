# Cloud Connector Runtime — Spec

## Problem

DataConnect connectors scrape user data from platforms (LinkedIn, Instagram, ChatGPT, etc.) using Playwright browser automation. Today this requires the Tauri desktop app — which means a desktop computer running during the export. Users without a desktop (phone-only, tablet-only, or users who can't leave a machine running) can't use DataConnect.

## Goal

Let users run connectors from a cloud-hosted environment without a desktop. The user interacts with a web UI that looks and feels native — no visible browser chrome, no "remoting into a server" feeling. When a connector needs user interaction (login, CAPTCHA), the user interacts directly in the web UI.

## Non-goals

- Replacing the desktop app (it continues to exist for users who want it)
- Personal server hosting (separate concern; the personal server can run anywhere)
- OAuth/API-based connectors (assume all platforms require browser scraping)
- Mobile app

## Architecture

```
User's phone/tablet browser
    ↓ HTTPS + WebRTC (UDP)
Cloud Connector Runtime (Docker container, extends m1k1o/neko:chromium)
    ├── n.eko server (WebRTC streaming, X11 input, browser lifecycle)
    ├── Chromium (headed, Xorg, persistent profile, --remote-debugging-port, --kiosk)
    ├── API server (serves frontend, reverse-proxies n.eko, CDP relay)
    ├── Playwright (connector automation via CDP)
    [all managed by supervisord]
```

A single Docker container per user, extending the `m1k1o/neko:chromium` base image. n.eko owns Chromium, the X11 display, and WebRTC streaming. Our API server and Playwright connectors are added as supervisord programs. Playwright connects to Chromium via CDP (`connectOverCDP`) on `--remote-debugging-address=0.0.0.0` — n.eko and Playwright operate on different layers with no conflicts (see investigation doc).

The API server on port 3000 serves the frontend, API endpoints, and reverse-proxies n.eko at `/neko` so the iframe is same-origin (required for reliable clipboard access). The user accesses the container via a URL. The browser view supports two modes selectable via `?view=` URL parameter: n.eko WebRTC (default, iframe) and CDP screencast (canvas + WebSocket). n.eko mode uses OS-level X11 input injection; CDP mode uses `Input.dispatch*Event` and `Input.insertText`.

## Key design decisions

### n.eko WebRTC over CDP screencast

The initial prototype used CDP screencast (JPEG frames over WebSocket with CDP input injection). This worked for basic login flows but had fundamental limitations: application-level input injection made text selection, clipboard, and keyboard shortcuts unreliable. CDP screencast is 3-15fps JPEG with no delta compression.

n.eko provides OS-level input fidelity (everything works natively), 30-60fps H.264/VP8 video via WebRTC, and is maintained by an active open-source project (7k+ GitHub stars, Apache 2.0). The same architecture is used commercially by Kasm Workspaces. BrowserStack uses VNC (similar OS-level approach) for interactive sessions.

Trade-off: n.eko streams the full X11 display, not individual browser tabs. Multiple browser contexts are supported (Playwright creates them via CDP), but only one is visible at a time. The user switches between contexts by foregrounding tabs. For our use case (user logs in, automation takes over), this is sufficient.

See `docs/cloud-connector-investigation.md` for the full comparison of CDP vs VNC vs WebRTC.

### Single container, not sidecar

n.eko's ecosystem uses single-container extension via supervisord. The established pattern (demonstrated by [jinyoung/remote-browser-neko](https://github.com/jinyoung/remote-browser-neko)) is: `FROM m1k1o/neko:chromium`, add your service as a supervisord program, expose additional ports. This is simpler than sidecar orchestration and keeps all processes (Xorg, Chromium, n.eko, API server, Playwright) sharing the same filesystem and network namespace.

### Headed Chromium with Xorg

Headless Chrome has a different fingerprint that anti-bot systems detect. Headed Chromium with Xorg (n.eko's default) behaves identically to a real desktop browser. n.eko uses Openbox as a minimal window manager.

### Persistent browser profile

Chromium's user data directory persists on a Docker volume mounted at `/home/neko/.config/chromium` (n.eko's default path). After the user logs into a platform once, subsequent connector runs reuse the session without re-authentication — until the platform expires the session (~30-90 days), at which point the user re-authenticates via the browser view.

Requires overriding n.eko's default Chromium policies (which enforce `--bwsi` and `SanitizeOnShutdown`) with permissive cookie/session settings.

### No residential proxy required (initially)

Most platforms don't immediately kill sessions from datacenter IPs for normal single-user activity. GitHub, ChatGPT, Spotify work fine. Instagram, LinkedIn, and Twitter may block datacenter IPs — residential proxy support can be added later as a configuration option (~$0.50-2.00/month per user).

## Components

### 1. Frontend runtime abstraction (`src/lib/runtime/`) — unchanged

The DataConnect frontend abstracts all Tauri API calls behind a `Runtime` interface:

```typescript
// src/lib/runtime/types.ts
export interface Runtime {
  mode: "tauri" | "http"
  invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>
  onEvent<T>(event: string, handler: (payload: T) => void): () => void
  fetch(url: string, init?: RequestInit): Promise<Response>
  openUrl(url: string): Promise<void>
  openPath(path: string): Promise<void>
  copyToClipboard(text: string): Promise<void>
  getAppVersion(): Promise<string>
}
```

**Implementations:**
- **`tauri-runtime.ts`** — Wraps `@tauri-apps/api` calls. Preserves existing desktop behavior.
- **`http-runtime.ts`** — Uses `fetch('/api/invoke/{command}')` for commands, shared WebSocket at `/ws/events` for events with auto-reconnect.

**Detection:** A React context (`RuntimeProvider`) detects the environment via `window.__TAURI__` and provides the appropriate runtime via `useRuntime()`.

### 2. API server (`cloud-server/`)

Node.js/Express server that implements the Tauri command equivalents:

| Command | Notes |
|---|---|
| `check_platforms` | Scans connector directories |
| `start_connector_run` | Spawns playwright-runner with stdin/stdout JSON RPC, sets `CDP_ENDPOINT` env var |
| `stop_connector` | Kills connector process |
| `get_connector_status` | Returns running/stopped state |
| `write_export_data` | Writes export data to filesystem |
| `load_runs` | Lists completed runs |
| `get_server_status` | Health check |
| `get_app_config` / `set_app_config` | Reads/writes app configuration |

**Auth:** Token-based. Random 32-byte hex token generated at startup (or set via `AUTH_TOKEN` env var). Validated on all API requests and WebSocket upgrades.

**Key files:** `server.ts` (Express + n.eko reverse proxy + WebSocket upgrade routing), `cdp-relay.ts` (CDP screencast relay at `/ws/screencast`), `auth.ts`, `routes/invoke.ts`, `events.ts`.

### 3. Browser view — dual mode (n.eko + CDP)

`ScreencastModal` supports two viewing modes via `?view=` URL parameter:

**n.eko mode (default, `?view=neko`):** iframe embedding n.eko's WebRTC client at `/neko/?embed=1&usr=user&pwd=x`. The `/neko` path is reverse-proxied by the API server to make it same-origin (required for clipboard). Chromium runs in `--kiosk` mode to hide browser chrome. `NEKO_LEGACY=true` enables the v2 WebSocket auth flow (the Docker image ships the v2 client). `NEKO_MEMBER_PROVIDER=noauth` with `NEKO_SESSION_IMPLICIT_HOSTING=true` and `NEKO_IMPLICITCONTROL=true` gives automatic control.

**CDP mode (`?view=cdp`):** Canvas-based viewer (`ConnectorView`) connected to `/ws/screencast` WebSocket. The CDP relay in `cdp-relay.ts` connects to Chromium's CDP endpoint, streams `Page.screencastFrame` JPEG frames, and forwards mouse/keyboard input via `Input.dispatch*Event`. Clipboard paste uses `Input.insertText` — reliable, no permission prompts. Trade-off: lower framerate (3-15fps JPEG) vs n.eko's 30fps H.264.

Both modes coexist — the backend always registers both endpoints. Adding `?view=vnc` later requires only a new viewer branch and union member.

### 4. Playwright runner CDP mode (`playwright-runner/index.cjs`) — unchanged

`connectOverCDP` mode activated by `CDP_ENDPOINT` env var. Connects to n.eko's Chromium the same way it connected before — the CDP endpoint is still `http://localhost:9222` (via socat proxy). No changes needed.

### 5. Docker image

```dockerfile
FROM ghcr.io/m1k1o/neko/chromium:3.0

# Install Node.js for our API server
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Layer-cached dependency install
COPY cloud-server/package.json cloud-server/package-lock.json* ./cloud-server/
COPY playwright-runner/package.json playwright-runner/package-lock.json* ./playwright-runner/
RUN cd cloud-server && npm ci --ignore-scripts
RUN cd playwright-runner && npm ci --ignore-scripts

# Source & build
COPY connectors/ ./connectors/
COPY cloud-server/ ./cloud-server/
COPY playwright-runner/ ./playwright-runner/
RUN cd cloud-server && npm run build

# Pre-built frontend
COPY dist/ ./dist/

# Supervisord configs for our services
COPY cloud-server/supervisord/*.conf /etc/neko/supervisord/

# Override Chromium config to add --remote-debugging-port and relax policies
COPY cloud-server/neko/chromium.conf /etc/neko/supervisord/chromium.conf
COPY cloud-server/neko/policies.json /etc/chromium/policies/managed/policies.json

VOLUME ["/home/neko/.config/chromium"]
EXPOSE 3000
```

n.eko's supervisord is PID 1. It manages Xorg, PulseAudio, Openbox, Chromium, and the n.eko server. We add the API server as a supervisord program. Port 8080 (n.eko) is internal-only — the API server reverse-proxies it at `/neko`. Chromium uses `--remote-debugging-address=0.0.0.0` so Playwright connects directly to CDP on port 9222 (no socat needed).

**`cloud-server/neko/chromium.conf`** — overrides default to add `--remote-debugging-port=9222`, `--remote-debugging-address=0.0.0.0`, `--no-sandbox`, `--kiosk`, and remove `--bwsi`.

**`cloud-server/neko/policies.json`** — overrides default to allow cookies (`DefaultCookiesSetting: 1`), enable DevTools (`DeveloperToolsAvailability: 1`), and allow downloads.

### 6. Authentication — two layers

| Layer | Purpose | Mechanism |
|---|---|---|
| **Our API server** | Protects `/api/*` and `/ws/events` | Privy session token (production) or random hex token (dev) |
| **n.eko** | Protects browser view access | `noauth` provider — n.eko is only reachable via the iframe in our authenticated frontend |

**Prototype (current):** Random 32-byte hex token generated at startup. Passed as query param or `Authorization: Bearer` header. Same as Phase 1.

**Production:** Privy authentication, same as the desktop app. User hits the cloud connector URL → Privy login (wallet + social) → frontend gets a Privy session token → API server validates it on every request. The API server adds Privy's JWT verification (same library the desktop app uses). n.eko stays on `noauth` — it's internal to the container, only accessible via the iframe served by the authenticated frontend. No need to integrate n.eko's auth system with Privy since n.eko's port doesn't need to be exposed to the public internet (the iframe loads it from the same host).

### 7. Port architecture

| Port | Protocol | Service | Exposed | Purpose |
|---|---|---|---|---|
| 3000 | TCP | API server | Yes | Frontend, API, n.eko reverse proxy, CDP relay WS |
| 8080 | TCP | n.eko | No (internal) | WebRTC signaling (proxied at `/neko`) |
| 9222 | TCP | Chromium CDP | No (internal) | Playwright + CDP relay |
| 59000 | UDP | n.eko | Yes | WebRTC media (single port via `NEKO_WEBRTC_UDPMUX`) |
| 59000 | TCP | n.eko | Yes | WebRTC TCP fallback (via `NEKO_WEBRTC_TCPMUX`) |

Only port 3000 and 59000 are exposed. n.eko (8080) and CDP (9222) are internal. The API server reverse-proxies n.eko at `/neko` for same-origin iframe access.

```yaml
# docker-compose.yml
services:
  cloud-connector:
    build:
      context: .
      dockerfile: cloud-server/Dockerfile
    shm_size: "2gb"
    ports:
      - "3000:3000"
      - "59000:59000/udp"
      - "59000:59000/tcp"
    environment:
      NEKO_SERVER_BIND: "0.0.0.0:8080"
      NEKO_LEGACY: "true"
      NEKO_WEBRTC_UDPMUX: 59000
      NEKO_WEBRTC_TCPMUX: 59000
      NEKO_WEBRTC_ICELITE: 1
      NEKO_WEBRTC_NAT1TO1: "${PUBLIC_IP}"
      NEKO_MEMBER_PROVIDER: "noauth"
      NEKO_SESSION_IMPLICIT_HOSTING: "true"
      NEKO_IMPLICITCONTROL: "true"
      NEKO_DESKTOP_SCREEN: "1280x720@30"
      AUTH_TOKEN: "${AUTH_TOKEN:-dev-test-token}"
    volumes:
      - profile-data:/home/neko/.config/chromium
      - export-data:/data/exports
```

### 8. Deployment and networking

WebRTC uses UDP for media transport. n.eko supports three modes:

- **UDP (default):** Best quality. Requires the hosting platform to expose UDP ports.
- **TCPMUX:** WebRTC over TCP on a single port (`NEKO_WEBRTC_TCPMUX`). No UDP required on the server side. Works on TCP-only platforms. Latency impact is negligible on good networks (~10-30ms). On lossy networks (mobile, congested wifi), individual frames can stall 100-500ms due to TCP head-of-line blocking. For login flows (typing, clicking), this is fine.
- **TURN relay:** Solves client-side network restrictions. ~15-25% of users are behind firewalls or symmetric NATs (corporate networks, universities) that block outbound connections to arbitrary ports. A TURN server relays traffic through port 443 (which firewalls always allow). Cloudflare Calls offers a free tier. Phase 3 concern.

TCPMUX and TURN solve different problems: TCPMUX eliminates the server's UDP requirement, TURN handles restrictive client networks. Both can be used together.

| Platform | UDP | TCP-only viable | Notes |
|---|---|---|---|
| **Any VPS (Hetzner/DO/Vultr)** | Yes | N/A | Full control, simplest |
| **Coolify (self-hosted)** | Yes | N/A | PaaS on your VPS |
| **Fly.io** | Yes ($2/mo dedicated IPv4) | Yes via TCPMUX | Best PaaS option |
| **AWS ECS on EC2 + NLB** | Yes | Yes via TCPMUX | Production grade |
| Railway | No | Yes via TCPMUX | Higher tail latency |
| Render | No | Yes via TCPMUX | Higher tail latency |
| Google Cloud Run | No | Yes via TCPMUX | Higher tail latency |
| RunPod | No | Probably not (no port ranges, random port assignment) | Not recommended |

For Phase 2 (prototype): VPS with Docker Compose or Coolify. Deployment platform choice deferred to Phase 3.

## Test coverage

- **Frontend:** 303 tests across 38 files (all passing)
  - Runtime context detection and provider (5 tests)
  - All refactored hooks and services tested with mock runtime
- **Cloud server:** 10 tests across 2 suites (all passing)
  - Auth middleware and token validation (5 tests)
  - Invoke route handlers (5 tests)

ConnectorView tests (6 tests) will be removed with the component. New tests needed for iframe integration.

## User flow

1. User deploys a container (runs `docker compose up` or clicks a deploy button)
2. Gets back a URL like `https://my-instance.example.com/?token=abc123`
3. Opens it on their phone/tablet — sees the DataConnect UI
4. Clicks "Connect Instagram"
5. A browser panel appears showing the Instagram login page (n.eko WebRTC stream in an iframe)
6. User types credentials directly — OS-level input, text selection, clipboard all work natively
7. After login, automation takes over — panel shows progress, then closes
8. Data appears in DataConnect, synced to personal server

Subsequent runs reuse the browser session. When a session expires, the user re-authenticates via the browser panel.

## Implementation status

### Phase 1: Core infrastructure ✅

- [x] Runtime abstraction (`src/lib/runtime/`) with Tauri and HTTP implementations
- [x] All 16+ frontend files refactored to use `useRuntime()` / `Runtime` parameter
- [x] API server with connector orchestration commands
- [x] Playwright runner CDP connection mode
- [x] Token-based auth
- [x] Test coverage for all new code
- [x] End-to-end validation: GitHub (95 repos), LinkedIn (profile) completed in Docker

### Phase 1.5: n.eko migration + dual viewer ✅

- [x] Rewrite Dockerfile to extend `ghcr.io/m1k1o/neko/chromium:3.0`
- [x] Add API server as supervisord program
- [x] Override Chromium supervisord config (`--remote-debugging-port`, `--kiosk`, `--no-sandbox`)
- [x] Override Chromium policies (allow cookies, enable DevTools)
- [x] n.eko iframe embed at `/neko` (reverse-proxied for same-origin clipboard)
- [x] Dual viewer: `?view=neko` (WebRTC iframe, default) and `?view=cdp` (canvas + WebSocket)
- [x] ScreencastModal with close button (stops running connectors)
- [x] n.eko config: `NEKO_LEGACY=true`, `NEKO_SERVER_BIND`, `noauth`, implicit control
- [x] Update docker-compose.yml — only port 3000 exposed (n.eko internal)
- [x] Validate: connector run with WebRTC streaming + Playwright CDP coexistence
- [x] Validate: GitHub connector export (95 repos) in Docker
- [x] Validation script (`scripts/validate-cloud-connector.sh`)

**Known limitation:** n.eko clipboard sync is unreliable in iframes — it triggers on mouse-enter (not focus), and `hasFocus()` returns false inside iframes. CDP mode handles paste reliably via `Input.insertText`.

### Phase 2: Integration testing

- [ ] Test on actual platforms (ChatGPT, Spotify, GitHub, LinkedIn)
- [ ] Session persistence verification (stop/restart container, verify cookies survive)
- [ ] Mobile browser testing (iOS Safari, Android Chrome)
- [ ] WebRTC connectivity testing (various network conditions, firewall scenarios)

### Phase 3: Deployment UX

- [ ] One-click deploy (Fly.io or Coolify)
- [ ] TURN server for production (Coturn or Cloudflare Calls)
- [ ] Container lifecycle management (start/stop/restart)
- [ ] Personal server integration (runs inside the container)
- [ ] Cost management (auto-stop idle containers)

## Design notes

- **One container per user.** Browser profiles would conflict with shared containers, and n.eko's multi-user model (shared screen control) doesn't match our use case.
- **Single exposed port (3000).** n.eko is reverse-proxied at `/neko` for same-origin iframe access. WebRTC media on 59000 (UDP/TCP).
- **Clipboard sharing:** n.eko mode syncs via X11 clipboard + browser Clipboard API, but is unreliable in iframes (sync triggers on mouse-enter only, `hasFocus()` broken in iframes). CDP mode uses `Input.insertText` for reliable paste. `allow="clipboard-read; clipboard-write"` on the iframe enables the Permissions Policy delegation.
- **2FA on same phone:** User switches to authenticator app, copies code, switches back, pastes into the browser view. Works via clipboard sharing above.
- **Phone sleep mid-export:** Automation continues server-side. WebRTC reconnects when the user returns.
- **Chromium SingletonLock:** [Issue #605](https://github.com/m1k1o/neko/issues/605) reports persistent profiles can cause black screens. If hit during validation, fix with a pre-start `rm -f SingletonLock` in the supervisord config.

## References

- [n.eko](https://neko.m1k1o.net/) — self-hosted virtual browser (Apache 2.0)
- [n.eko + Playwright coexistence](https://github.com/m1k1o/neko/issues/391) — maintainer-confirmed
- [jinyoung/remote-browser-neko](https://github.com/jinyoung/remote-browser-neko) — reference implementation of n.eko + Playwright
- [Kasm Workspaces](https://kasm.com/) — commercial WebRTC browser streaming
- [n.eko v3 WebRTC config](https://neko.m1k1o.net/docs/v3/configuration/webrtc) — UDPMUX, TCPMUX, ICE Lite
- [n.eko v3 auth config](https://neko.m1k1o.net/docs/v3/configuration/authentication) — noauth, multiuser providers
- [n.eko v3 browser customization](https://neko.m1k1o.net/docs/v3/customization/browsers) — profile persistence, policies
- [n.eko UI query params](https://neko.m1k1o.net/docs/v3/customization/ui) — embed, cast, usr, pwd
- [Playwright Docker docs](https://playwright.dev/docs/docker) — base images
- [cloud-connector-investigation.md](./cloud-connector-investigation.md) — CDP vs VNC vs WebRTC analysis
