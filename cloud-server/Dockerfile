# DataConnect Cloud Connector Runtime
# Runs headed Chromium via Xvfb with the API server, connectors, and built frontend.
#
# Build:  docker build -f cloud-server/Dockerfile -t data-connect-cloud .
# Run:    docker run --shm-size=2g -v profile-data:/data -p 3000:3000 data-connect-cloud

FROM mcr.microsoft.com/playwright:v1.57.0-noble

# Xvfb provides a virtual framebuffer so headed Chromium can render off-screen.
RUN apt-get update && apt-get install -y --no-install-recommends xvfb \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- Layer-cached dependency install ---
# Copy package manifests first so that npm ci is only re-run when deps change.
COPY cloud-server/package.json cloud-server/package-lock.json* ./cloud-server/
COPY playwright-runner/package.json playwright-runner/package-lock.json* ./playwright-runner/

RUN cd cloud-server && npm ci --ignore-scripts
RUN cd playwright-runner && npm ci --ignore-scripts

# Install Playwright's bundled Chromium (uses the base image's browser deps).
RUN cd playwright-runner && npx playwright install chromium

# --- Source & build ---
COPY connectors/ ./connectors/
COPY cloud-server/ ./cloud-server/
COPY playwright-runner/ ./playwright-runner/

RUN cd cloud-server && npm run build

# Copy the pre-built frontend (run `npm run build` in the repo root before docker build).
COPY dist/ ./dist/

# --- Runtime environment ---
ENV DISPLAY=:99
ENV NODE_ENV=production
ENV DATA_DIR=/data

VOLUME ["/data"]
EXPOSE 3000

ENTRYPOINT ["./cloud-server/entrypoint.sh"]
