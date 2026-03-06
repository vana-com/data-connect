#!/bin/sh
exec /usr/bin/chromium \
  --window-position=0,0 \
  --display="${DISPLAY}" \
  --user-data-dir=/home/neko/.config/chromium \
  --no-first-run \
  --no-sandbox \
  --start-maximized \
  --kiosk \
  --force-dark-mode \
  --disable-file-system \
  --disable-gpu \
  --disable-software-rasterizer \
  --disable-dev-shm-usage \
  --remote-debugging-port=9222 \
  --remote-debugging-address=0.0.0.0 \
  --remote-allow-origins=* \
  ${CHROMIUM_MOBILE_FLAGS}
