# Cloud Connector Runtime — Phase 1.5 Team Plan

## Goal

Migrate the cloud connector from CDP screencast (custom relay + canvas component) to n.eko WebRTC (iframe embed). See `docs/cloud-connector-spec.md` for full context.

## Agent team

Two agents, sequential execution. Coordinator (team lead) manages handoff.

### Agent 1 — "dev"

All code changes. Works in a worktree.

**Deletions:**
- `cloud-server/src/cdp-relay.ts`
- `cloud-server/src/chromium.ts`
- `cloud-server/entrypoint.sh`
- `src/components/connector-view/index.tsx`
- `src/components/connector-view/connector-view.test.tsx`

**Modifications:**
- `cloud-server/src/server.ts` — remove `import { setupCdpRelay }` and `setupCdpRelay(server)` call
- `src/components/connector-view/screencast-modal.tsx` — rewrite from ConnectorView canvas to iframe embedding n.eko (`?embed=1&cast=1`). Props change from `wsUrl` to `nekoUrl`. Keep modal chrome (close button, connection status text).
- `src/pages/home/index.tsx` — replace `screencastWsUrl` useMemo (lines ~153-159) with `nekoUrl` that points to n.eko's HTTP endpoint (port 8080). Update ScreencastModal usage to pass `nekoUrl` instead of `wsUrl`.

**New files:**
- `cloud-server/Dockerfile` — rewrite to extend `ghcr.io/m1k1o/neko/chromium:3.0`. Install Node.js 22, socat. Copy app code. Copy supervisord configs. Override chromium.conf and policies.json. See spec section 5 for the complete Dockerfile.
- `cloud-server/supervisord/api-server.conf` — supervisord program for Node.js API server. See spec for content.
- `cloud-server/supervisord/socat-cdp.conf` — socat proxy for CDP port. See spec for content.
- `cloud-server/neko/chromium.conf` — override n.eko's default Chromium supervisord config. Must add `--remote-debugging-port=9222 --remote-debugging-address=0.0.0.0 --remote-allow-origins=*` and remove `--bwsi`. Base the rest on n.eko's default chromium.conf (see spec references).
- `cloud-server/neko/policies.json` — override n.eko's default Chromium policies. Set `DefaultCookiesSetting: 1`, `DeveloperToolsAvailability: 1`, remove `DownloadRestrictions: 3`, keep security-relevant policies. Base on n.eko's default (see spec references).
- `docker-compose.yml` — at project root (or update existing). See spec section 7 for complete content.
- New test for iframe-based ScreencastModal (replaces the 6 deleted ConnectorView tests). Test: renders iframe with correct src, shows/hides based on connection, close button works.

**Validation (must all pass before declaring done):**
- `npx vitest run` — all tests pass
- `npx tsc --noEmit` — frontend type-checks
- `cd cloud-server && npx tsc --noEmit` — cloud-server type-checks
- `npx vite build` — frontend builds
- `cd cloud-server && npm run build` — cloud-server builds
- Grep for dangling references: no imports of `cdp-relay`, `chromium` (from cloud-server/src/), `ConnectorView`, `/ws/screencast`, `setupCdpRelay`, `startChromium`, `waitForChromium`, `getPageDebuggerUrl`, `getBrowserDebuggerUrl`

**Key context for the dev agent:**
- Read `docs/cloud-connector-spec.md` thoroughly before starting — it has the exact file contents for Dockerfile, supervisord configs, docker-compose.yml, and iframe component.
- Read `docs/cloud-connector-investigation.md` for background on the CDP → n.eko decision.
- The `routes/invoke.ts` file should NOT need changes — `CDP_ENDPOINT` env var defaults to `http://127.0.0.1:9222` which still works via the socat proxy.
- n.eko's default chromium.conf is at `/etc/neko/supervisord/chromium.conf` inside the neko:chromium image. The override must preserve the same structure (supervisord program format, openbox program, environment variables) while adding the debugging flags and removing --bwsi.
- For the chromium.conf override: look at what jinyoung/remote-browser-neko does (referenced in spec) and the n.eko apps/chromium/supervisord.conf on GitHub.

### Agent 2 — "validator"

Independent verification after dev completes. Works on the same branch.

**Checks:**
1. Read every file the dev changed or created. Compare against the spec.
2. Run `npx vitest run` — full test suite passes.
3. Run `npx tsc --noEmit` in both frontend and cloud-server.
4. Run `npx vite build` and `cd cloud-server && npm run build`.
5. Grep the entire codebase for dangling references to deleted files/functions.
6. Verify Dockerfile: correct base image, COPY paths exist, supervisord config paths match n.eko's include directory (`/etc/neko/supervisord/`).
7. Verify docker-compose.yml: valid YAML, correct port mappings, env vars match spec.
8. Verify supervisord configs: correct format (program name, command, priority, user, logfile), no syntax errors.
9. Verify the iframe in ScreencastModal: has `allow="clipboard-read; clipboard-write"`, uses `?embed=1&cast=1` params, handles the nekoUrl prop correctly.
10. Verify home/index.tsx: no references to screencast WebSocket, nekoUrl construction makes sense for HTTP mode.

**Write validation script** at `scripts/validate-cloud-connector.sh`:
```bash
#!/usr/bin/env bash
# Run on host (not in devcontainer) — requires Docker
set -euo pipefail

echo "=== Building frontend ==="
npm run build

echo "=== Building Docker image ==="
docker build -f cloud-server/Dockerfile -t data-connect-cloud .

echo "=== Starting container ==="
docker run -d --name dc-test --shm-size=2g \
  -p 3000:3000 -p 8080:8080 -p 59000:59000/udp -p 59000:59000/tcp \
  -e NEKO_BIND=0.0.0.0:8080 \
  -e NEKO_WEBRTC_UDPMUX=59000 \
  -e NEKO_WEBRTC_TCPMUX=59000 \
  -e NEKO_WEBRTC_ICELITE=1 \
  -e NEKO_MEMBER_PROVIDER=noauth \
  -e NEKO_DESKTOP_SCREEN=1280x720@30 \
  data-connect-cloud
trap "docker rm -f dc-test 2>/dev/null" EXIT

echo "=== Waiting for services ==="
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000/health >/dev/null 2>&1; then break; fi
  [ "$i" -eq 30 ] && { echo "FAIL: API server not ready"; exit 1; }
  sleep 2
done
echo "API server: OK"

for i in $(seq 1 30); do
  if curl -sf http://localhost:8080 >/dev/null 2>&1; then break; fi
  [ "$i" -eq 30 ] && { echo "FAIL: n.eko not ready"; exit 1; }
  sleep 2
done
echo "n.eko: OK"

for i in $(seq 1 30); do
  if curl -sf http://localhost:9222/json/version >/dev/null 2>&1; then break; fi
  [ "$i" -eq 30 ] && { echo "FAIL: CDP not reachable"; exit 1; }
  sleep 2
done
echo "CDP (via socat): OK"

echo ""
echo "=== All checks passed ==="
echo "Open http://localhost:3000 in your browser to test the UI"
echo "Open http://localhost:8080 to test n.eko directly"
```

**Report:** List of pass/fail for each check. If anything fails, describe exactly what's wrong and what file needs fixing.
