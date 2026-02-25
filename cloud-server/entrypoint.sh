#!/usr/bin/env bash
set -euo pipefail

DATA_DIR="${DATA_DIR:-/data}"
PROFILE_DIR="${DATA_DIR}/profile"
EXPORT_DIR="${DATA_DIR}/exports"

# ── Data directories ──────────────────────────────────────────────
mkdir -p "$PROFILE_DIR" "$EXPORT_DIR"

# ── Cleanup on exit ───────────────────────────────────────────────
cleanup() {
  kill "$CHROME_PID" 2>/dev/null || true
  kill "$XVFB_PID" 2>/dev/null || true
}
trap cleanup EXIT

# ── Xvfb (virtual framebuffer) ────────────────────────────────────
Xvfb :99 -screen 0 1920x1080x24 -ac &
XVFB_PID=$!
echo "Xvfb started (PID $XVFB_PID)"
sleep 1

# ── Chromium ──────────────────────────────────────────────────────
CHROMIUM_PATH=$(find /root/.cache/ms-playwright -name "chrome" -type f 2>/dev/null | head -1)
if [ -z "$CHROMIUM_PATH" ]; then
  CHROMIUM_PATH=$(find /ms-playwright -name "chrome" -type f 2>/dev/null | head -1)
fi
if [ -z "$CHROMIUM_PATH" ]; then
  echo "ERROR: Chromium binary not found" >&2
  exit 1
fi

"$CHROMIUM_PATH" \
  --remote-debugging-port=9222 \
  --user-data-dir="$PROFILE_DIR" \
  --no-first-run \
  --disable-default-apps \
  --disable-popup-blocking \
  --disable-translate \
  --disable-background-timer-throttling \
  --disable-renderer-backgrounding \
  --disable-backgrounding-occluded-windows \
  --window-size=1280,720 \
  --window-position=0,0 &
CHROME_PID=$!
echo "Chromium started (PID $CHROME_PID)"

# Wait for CDP to be ready
echo "Waiting for Chromium CDP on port 9222..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:9222/json/version >/dev/null 2>&1; then
    echo "Chromium CDP ready"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: Chromium did not start within 30 s" >&2
    exit 1
  fi
  sleep 1
done

# ── Auth token ────────────────────────────────────────────────────
if [ -z "${AUTH_TOKEN:-}" ]; then
  AUTH_TOKEN=$(openssl rand -hex 32)
  echo ""
  echo "============================================"
  echo "  Access URL: http://localhost:3000/?token=$AUTH_TOKEN"
  echo "============================================"
  echo ""
fi
export AUTH_TOKEN

# ── API server (foreground) ───────────────────────────────────────
exec node cloud-server/dist/server.js
