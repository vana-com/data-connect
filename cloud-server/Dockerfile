# DataConnect Cloud Connector Runtime
# Extends n.eko chromium with our API server and connector automation.
#
# Build:  docker build -f cloud-server/Dockerfile -t data-connect-cloud .
# Run:    docker compose up

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

# Override Chromium config and launcher script
COPY cloud-server/neko/chromium.conf /etc/neko/supervisord/chromium.conf
COPY cloud-server/neko/start-chromium.sh /usr/local/bin/start-chromium.sh
RUN chmod +x /usr/local/bin/start-chromium.sh
COPY cloud-server/neko/policies.json /etc/chromium/policies/managed/policies.json
# Override xorg.conf to add portrait modes for mobile viewports
COPY cloud-server/neko/xorg.conf /etc/neko/xorg.conf

# Clean stale Chromium profile locks on startup (different container hostname)
RUN echo '#!/bin/sh\nrm -f /home/neko/.config/chromium/SingletonLock /home/neko/.config/chromium/SingletonSocket /home/neko/.config/chromium/SingletonCookie\nexec "$@"' > /usr/local/bin/cleanup-locks.sh && chmod +x /usr/local/bin/cleanup-locks.sh
ENTRYPOINT ["/usr/local/bin/cleanup-locks.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/neko/supervisord.conf"]

VOLUME ["/home/neko/.config/chromium"]
EXPOSE 3000
