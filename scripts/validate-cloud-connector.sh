#!/usr/bin/env bash
# Validate the cloud connector Docker image end-to-end.
# Run on host (not in devcontainer) — requires Docker.
set -euo pipefail

CONTAINER_NAME="dc-validate-$$"
IMAGE_NAME="data-connect-cloud"
TEST_TOKEN="dev-test-token"
PASS=0
FAIL=0
RESULTS=()

pass() { PASS=$((PASS + 1)); RESULTS+=("PASS: $1"); echo "  PASS: $1"; }
fail() { FAIL=$((FAIL + 1)); RESULTS+=("FAIL: $1"); echo "  FAIL: $1"; }

cleanup() {
  echo ""
  echo "=== Cleaning up ==="
  docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
}
trap cleanup EXIT

echo "=== Building frontend ==="
npm run build

echo ""
echo "=== Building Docker image ==="
docker build -f cloud-server/Dockerfile -t "$IMAGE_NAME" .

echo ""
echo "=== Starting container ==="
docker run -d --name "$CONTAINER_NAME" --shm-size=2g \
  -p 3000:3000 -p 59000:59000/udp -p 59000:59000/tcp \
  -e NEKO_SERVER_BIND=0.0.0.0:8080 \
  -e NEKO_LEGACY=true \
  -e NEKO_WEBRTC_UDPMUX=59000 \
  -e NEKO_WEBRTC_TCPMUX=59000 \
  -e NEKO_WEBRTC_ICELITE=1 \
  -e NEKO_WEBRTC_NAT1TO1=127.0.0.1 \
  -e NEKO_MEMBER_PROVIDER=noauth \
  -e NEKO_SESSION_IMPLICIT_HOSTING=true \
  -e NEKO_IMPLICITCONTROL=true \
  -e NEKO_DESKTOP_SCREEN=1280x720@30 \
  -e AUTH_TOKEN="$TEST_TOKEN" \
  "$IMAGE_NAME"

echo ""
echo "=== Waiting for services ==="

# Check 1: API server health (port 3000)
echo "Checking API server..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000/health >/dev/null 2>&1; then
    pass "API server health (port 3000)"
    break
  fi
  if [ "$i" -eq 30 ]; then
    fail "API server health (port 3000) — not ready after 60s"
  fi
  sleep 2
done

# Check 2: n.eko via reverse proxy (/neko)
echo "Checking n.eko via proxy..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000/neko/ >/dev/null 2>&1; then
    pass "n.eko via reverse proxy (/neko)"
    break
  fi
  if [ "$i" -eq 30 ]; then
    fail "n.eko via reverse proxy (/neko) — not ready after 60s"
  fi
  sleep 2
done

# Check 3: CDP endpoint (inside container)
echo "Checking CDP endpoint (inside container)..."
for i in $(seq 1 20); do
  if timeout 5 docker exec "$CONTAINER_NAME" node -e "fetch('http://127.0.0.1:9222/json/version',{signal:AbortSignal.timeout(3000)}).then(r=>r.json()).then(d=>{console.log(d.Browser);process.exit(0)}).catch(()=>process.exit(1))" 2>/dev/null; then
    pass "CDP endpoint (internal port 9222)"
    break
  fi
  if [ "$i" -eq 20 ]; then
    fail "CDP endpoint (internal port 9222) — not reachable after 40s"
    echo "  Debug: checking if chromium is running..."
    docker exec "$CONTAINER_NAME" supervisorctl status 2>/dev/null || true
  fi
  sleep 1
done

# Check 4: Frontend is served
echo "Checking frontend..."
if curl -sf http://localhost:3000/ | grep -q '<div id="root"' 2>/dev/null; then
  pass "Frontend served at port 3000"
else
  fail "Frontend served at port 3000 — index.html not found or missing root div"
fi

# Check 5: API version endpoint
echo "Checking API version..."
if curl -sf http://localhost:3000/api/version | grep -q 'cloud' 2>/dev/null; then
  pass "API version endpoint returns cloud version"
else
  fail "API version endpoint — unexpected response"
fi

echo ""
echo "==============================="
echo "  Results: $PASS passed, $FAIL failed"
echo "==============================="
for r in "${RESULTS[@]}"; do
  echo "  $r"
done
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "Some checks failed. Inspect container logs with:"
  echo "  docker logs $CONTAINER_NAME"
  exit 1
fi

echo "All checks passed."
echo "Container '$CONTAINER_NAME' is still running."
echo ""
echo "Open http://localhost:3000/?token=$TEST_TOKEN in your browser to test the UI"
echo "n.eko is proxied at http://localhost:3000/neko/"
echo ""
echo "To stop: docker rm -f $CONTAINER_NAME"

# Disable cleanup so the container stays running for manual testing
trap - EXIT
