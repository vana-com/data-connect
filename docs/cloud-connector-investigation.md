# Cloud Connector — Investigation Notes

Living document. Updated as findings evolve.

## What works today

- End-to-end cloud connector runs: GitHub (95 repos + 10 starred collected), LinkedIn (profile scraped). Both completed successfully in Docker.
- CDP screencast relay streams browser frames to a React canvas component. User can see and interact with the remote browser during login.
- Keyboard input: printable characters (via CDP `Input.insertText`), Backspace/Delete/Enter/arrows (via `Input.dispatchKeyEvent` with `windowsVirtualKeyCode` from Puppeteer's `USKeyboardLayout`), paste (via `Input.insertText` for bulk text).
- Mouse input: click, move, scroll. Coordinates scaled from canvas CSS size to remote frame resolution.
- Playwright's `connectOverCDP` attaches to the shared Chromium instance. Connector automation and screencast relay coexist on the same browser.

## Known limitations of CDP screencast approach

- **Text selection** doesn't work reliably. CDP input injection simulates JavaScript-level events, not OS-level input. Click-drag selection requires precise mousedown→mousemove→mouseup sequencing that is fragile through CDP.
- **Clipboard** is one-directional. Local→remote paste works (we intercept Ctrl+V, read local clipboard, send via `Input.insertText`). Remote→local copy would require reading the remote page's clipboard via `Runtime.evaluate`, which needs clipboard permission on the remote page.
- **Frame rate** is 3-15fps JPEG, limited by CDP's ack-per-frame backpressure model. Adequate for auth flows, not for general browsing.
- **Performance** is slower than host-native due to Xvfb software rendering (no GPU in Docker) and CPU-based JPEG encoding.

## Display streaming options investigated

Three approaches to streaming a Docker-hosted browser to a user's web browser:

### CDP screencast (current)

Chromium's built-in `Page.startScreencast` sends JPEG frames over a WebSocket. Input goes back via `Input.dispatchKeyEvent` / `Input.dispatchMouseEvent`.

- **Pros:** Zero additional infrastructure. Chromium already exposes this. Smallest container image. Can stream individual page targets — multiple browser contexts can each have their own stream simultaneously.
- **Cons:** Input injection is application-level (fragile). No standard client library — every project (agent-browser, browserless) rolls their own. Key dispatch requires `windowsVirtualKeyCode` and correct `rawKeyDown` vs `keyDown` event types (ported from Puppeteer's `USKeyboardLayout`). Text selection, clipboard, and some keyboard shortcuts are unreliable.
- **Overhead:** None beyond Chromium itself.
- **Who uses it:** Vercel agent-browser, browserless.io screencast API. Developer/AI-agent tools, not consumer-facing interactive sessions.

### VNC (KasmVNC or x11vnc + noVNC)

VNC server captures the Xvfb framebuffer. noVNC is a standard browser-based VNC client that runs in an iframe.

- **Pros:** Input goes through the OS input stack — text selection, clipboard, drag-and-drop, keyboard shortcuts all work natively. noVNC is a mature standard client (no custom React component needed). KasmVNC adds WebP encoding, adaptive quality, and 60fps support.
- **Cons:** Streams the full virtual display, not individual browser tabs. Only shows whichever tab is in the foreground — switching between contexts requires foregrounding a different tab. Requires careful window sizing to avoid desktop artifacts. Adds a VNC server process to the container.
- **Overhead:** ~30-50MB RAM for VNC server. ~15-20MB added to container image.
- **Who uses it:** BrowserStack Live, Sauce Labs, LambdaTest. The major cross-browser testing platforms. BrowserStack uses VNC for interactive sessions and CDP only for automated test control.
- **Integration effort:** Small. Add VNC server to Dockerfile, start in entrypoint.sh, serve noVNC files, embed iframe. Delete cdp-relay.ts, ConnectorView, ScreencastModal, and key definition tables.

### WebRTC (n.eko)

n.eko runs Xvfb + browser + GStreamer in a Docker container, captures the X11 framebuffer, encodes to H.264/VP8, streams via WebRTC. Input goes through X11. Client uses a native `<video>` element.

- **Pros:** Lowest latency (UDP transport, <100ms). Best video quality (H.264 vs JPEG). Native `<video>` element on client. Input is OS-level (everything works). Audio support. Apache 2.0 license. Active open-source project (7k+ GitHub stars). v3 has REST API with OpenAPI 3.0, Prometheus metrics, plugin system, and screencast fallback for WebRTC.
- **Cons:** Same single-display limitation as VNC — streams the full screen, one view at a time. Needs UDP ports for WebRTC media (or TURN server for NAT traversal). v3 client is still Vue-based; planned framework-agnostic TS library not yet shipped.
- **Overhead:** ~100-200MB RAM (GStreamer + WebRTC). ~80-150MB added to container image.
- **Who uses it:** n.eko (open-source virtual browser), Kasm Workspaces (enterprise, commercial WebRTC streaming platform built on similar architecture).
- **Client embedding:** iframe with `?embed=1` (hides n.eko's UI chrome). Or `@demodesk/neko` npm package (Vue.js component, currently Vue 2). v3 roadmap includes a framework-agnostic TS client library.
- **Integration path:** Use `m1k1o/neko:chromium` as the base Docker image. Add `--remote-debugging-port=9222` to the Chromium supervisord config. Our connector process connects via `connectOverCDP`. n.eko handles display streaming and input. We handle connector orchestration and the DataConnect UI. Embed n.eko's UI via iframe (`?embed=1`). Delete cdp-relay.ts, ConnectorView, ScreencastModal, and key definition tables.

#### n.eko v3 client auto-connect (validated)

The v3 Docker image ships the `demodesk/neko-client` (not the v2 client from `client/`). The two clients handle auto-connect differently:

| | v2 client (`client/src/`) | v3 client (`demodesk/neko-client`) |
|---|---|---|
| Auto-connect trigger | `?usr=` + `?pwd=` (both non-empty) | `?token=` (session token from REST API) |
| Login form bypass | Auto-submits in `mounted()` if both params present | Validates token via `GET /api/whoami`, auto-connects if valid |
| Empty password | Fails — checks `password !== ''` | N/A — uses token, not password |
| Props for embedding | N/A (page-level app) | `autologin`, `autoconnect`, `autoplay` on `<neko-canvas>` |

To auto-connect with the v3 client shipped in `neko:chromium:3.0`:
1. Call `POST http://neko:8080/api/login` with `{"username":"user","password":""}` (works with `noauth` provider)
2. Extract `token` from the JSON response
3. Load iframe with `?embed=1&token=<token>` — client auto-connects, no login form shown

The `?usr=` and `?pwd=` params only work with the v2 client or when `NEKO_LEGACY=true` forces legacy mode. Even then, empty `?pwd=` fails the v2 client's non-empty check. The REST API token approach works with both v3 native mode and legacy mode.

**Implementation:** Our API server exposes `GET /api/neko-token` which calls n.eko's login API internally and returns the session token. The frontend fetches this token before loading the iframe.

#### n.eko v3 configuration gotchas (validated)

- **Legacy mode trigger:** Setting any v2 env var (e.g., `NEKO_BIND`) triggers legacy compatibility mode, which changes authentication behavior. Use v3 names (`NEKO_SERVER_BIND`) to stay in v3 mode. Can force with `NEKO_LEGACY=true/false`.
- **`noauth` provider:** Works in v3 mode. With legacy mode, the v2 multiuser provider is used instead regardless of `NEKO_MEMBER_PROVIDER`.
- **Chromium sandbox:** The n.eko base image's default chromium.conf includes `--no-sandbox`. When overriding the config, this flag must be preserved or Chromium crashes with `FATAL:zygote_host_impl_linux.cc` (namespace permission error in Docker).
- **CDP port:** `--remote-debugging-address=0.0.0.0` works in Docker — socat proxy is not needed. Chrome binds to all interfaces directly.

#### n.eko + Playwright coexistence (validated)

n.eko and Playwright operate on different layers with no CDP conflicts:

| | n.eko | Playwright |
|---|---|---|
| Display capture | X11 framebuffer → GStreamer → WebRTC | Not involved |
| Input injection | X11 events (OS-level) | CDP `Input.dispatch*` (application-level) |
| Page control | Not involved | CDP `Page.*`, `Runtime.*`, etc. |

n.eko does not use CDP at all — it captures the display via X11/GStreamer and injects input via X11 events. Playwright connects via CDP to control page targets. They don't compete for the same resources.

This is confirmed by the n.eko maintainer in [issue #391](https://github.com/m1k1o/neko/issues/391) and demonstrated by [jinyoung/remote-browser-neko](https://github.com/jinyoung/remote-browser-neko), which packages the n.eko + Playwright integration. The setup requires adding `--remote-debugging-port=9222` to the Chromium supervisord config and a `socat` proxy to expose the port (Chrome ignores `--remote-debugging-address` in Docker's network namespace).

### Cost comparison (per B4 spike pricing)

All three approaches require the same base: Xvfb + Chromium + Playwright. The difference is only the capture/relay layer.

| | CDP | VNC | WebRTC (n.eko) |
|---|---|---|---|
| Additional RAM | 0 | ~30-50 MB | ~100-200 MB |
| Additional CPU | ~0 | ~0.05-0.1 vCPU | ~0.1-0.2 vCPU |
| Container image delta | 0 | ~15-20 MB | ~80-150 MB |
| Cost per 30-min sync | ~$0.06 | ~$0.06 | ~$0.07-0.08 |
| Monthly (daily syncs) | ~$1.80 | ~$1.80 | ~$2.10-2.40 |

Cost differences are negligible. The meaningful differences are input fidelity, maintenance burden, and multi-view capability.

### Multi-view vs single-view

CDP screencast can stream individual page targets — each `Page.startScreencast` call targets a specific page, so multiple contexts can be streamed simultaneously to separate iframes/canvases. VNC and WebRTC capture the X11 display (one framebuffer), so they can only show whichever tab is foregrounded. Switching between contexts requires switching the foreground tab.

This is orthogonal to Chromium's `BrowserContext` feature. All three approaches support multiple concurrent browser contexts (isolated sessions with separate cookies/state). The difference is only whether the user can *see* multiple contexts at once (CDP) or must switch between them (VNC/WebRTC).

In practice, simultaneous views are rarely needed — the user typically interacts with one context at a time (e.g. logging into a platform) while other contexts run automation in the background. "Switch between views" is sufficient for known use cases.

## Browser context model

Chromium's `BrowserContext` provides isolated sessions (cookies, localStorage, cache, tabs) within a single browser process. Playwright exposes this via `browser.newContext()`. This enables:

- Connector A scraping LinkedIn in context 1
- Connector B scraping GitHub in context 2
- An agent browsing in context 3

Each context is isolated. Navigation in one doesn't affect others. Contexts share RAM (~90-250MB per active page depending on complexity). The B4 spike budgets 2GB total, supporting 2-3 concurrent contexts comfortably.

This model is independent of the streaming approach. Any process that can reach the CDP port can create contexts and control pages — whether the browser is owned by our entrypoint.sh, n.eko, or anything else.

## Key insight: Playwright is already in the container

The connector process already uses `playwright.chromium.connectOverCDP()` to control the browser. Playwright's `CdpKeyboard` and `CdpMouse` classes handle the full `USKeyboardLayout` mapping, `rawKeyDown` vs `keyDown`, `windowsVirtualKeyCode`, modifier state tracking, and all the edge cases we've been fixing manually. If we stay on CDP, refactoring the relay to call Playwright's API (instead of raw CDP WebSocket messages) would eliminate our key definition tables and input dispatch logic — reducing the relay to ~50 lines of switch statements.

## Prior art from B4 spike

The B4 spike (`spike-b4-hybrid-scraping.md`) validates the cloud connector approach:
- **VM sizing:** 2GB RAM, 1 vCPU sufficient. Peak ~950MB. Cost ~$0.06/sync.
- **Credential security:** In-memory only during login, session tokens encrypted at rest. Accepted risk model.
- **IP blocking:** Instagram/LinkedIn/Twitter block datacenter IPs. Residential proxy required for those platforms (~$0.50-2.00/month per user). Some platforms (GitHub, others) work fine from datacenter IPs.
- **Session persistence:** Credential entry is a one-time event per data source (~30-90 day sessions). Users interact with the browser view infrequently.
- **Legal:** Who operates the compute matters. User-provisioned compute, TEE network, or compute partners are viable models. "Vana operates a Docker service" is not.

## Decision matrix

Evaluated against project priorities: maintainability > complexity (if complexity is owned by a serious player), UX > cost (up to a point), multi-view is desirable but not blocking.

| | CDP (Playwright refactor) | VNC (noVNC) | WebRTC (n.eko) |
|---|---|---|---|
| **Maintainability** | Playwright owns input. We own relay glue + React canvas (~200 lines). | noVNC iframe embed. We own nothing custom. | n.eko iframe embed. We own nothing custom for streaming. |
| **Who owns hard parts** | Playwright (Microsoft) | noVNC + x11vnc/KasmVNC | n.eko (Apache 2.0, 7k stars, active) |
| **Input fidelity** | Application-level. Text selection fragile, clipboard one-way. | OS-level. Everything works natively. | OS-level. Everything works natively. |
| **Video quality** | 3-15fps JPEG | 15-30fps JPEG/WebP (KasmVNC: 60fps) | 30-60fps H.264/VP8. Best quality. |
| **Multi-view** | Simultaneous views of different contexts | Single display, switch tabs | Single display, switch tabs |
| **Cost per user** | +0 RAM, +0 image | +30-50MB RAM, +15-20MB image | +100-200MB RAM, +80-150MB image |
| **Client embedding** | Custom React canvas (we maintain) | iframe (standard) | iframe `?embed=1` or future TS library |
| **CDP coexistence** | N/A (same approach) | Needs validation | Validated — no conflicts ([#391](https://github.com/m1k1o/neko/issues/391)) |
| **Integration effort** | Refactor relay to Playwright API | Add VNC server, embed iframe, delete relay | Use neko:chromium image, add CDP port, embed iframe, delete relay |
| **Risk** | Known limitations | Proven (BrowserStack model) | Low — validated coexistence, active project |
| **Industry precedent** | Dev/AI-agent tools | BrowserStack, Sauce Labs, LambdaTest | Kasm Workspaces (commercial) |

**Summary:** If multi-view is a must-have now → CDP. If best UX + maintainability with single-view → n.eko. If lowest risk + good-enough UX → VNC.

## Open investigation threads

- **Streaming layer decision** — VNC vs CDP vs WebRTC. n.eko has the best UX-to-maintenance ratio now that CDP coexistence is validated. CDP is the only option for simultaneous multi-view. VNC is the lowest-risk option. Decision pending.
- **Playwright API refactor** — If staying on CDP, replace raw CDP WebSocket dispatch with Playwright's keyboard/mouse APIs to reduce maintenance. Planned.
- **Remote→local clipboard** — Copy from remote browser to local clipboard is unsolved with CDP. Works natively with VNC and WebRTC (OS-level clipboard sharing).
- **Mobile browser UX testing** — iOS Safari, Android Chrome. Not yet done.
- **n.eko client embedding** — v3 plans a framework-agnostic TS client library (replacing Vue.js). Currently iframe-only for non-Vue apps. Monitor progress.
