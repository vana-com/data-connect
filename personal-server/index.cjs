/**
 * Personal Server wrapper for DataBridge
 *
 * Runs as a subprocess managed by the Tauri backend.
 * Communicates status via JSON lines on stdout.
 */

const { join } = require('node:path');

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

async function main() {
  const port = parseInt(process.env.PORT || '8080', 10);
  const configDir = process.env.CONFIG_DIR || undefined;
  const gatewayUrl = process.env.GATEWAY_URL || undefined;
  const ownerAddress = process.env.OWNER_ADDRESS || undefined;

  try {
    const { loadConfig } = await import('./node_modules/personal-server-ts/packages/core/dist/config/index.js');
    const { createServer } = await import('./node_modules/personal-server-ts/packages/server/dist/bootstrap.js');
    const { serve } = await import('./node_modules/@hono/node-server/dist/index.js');

    const configPath = configDir ? join(configDir, 'server.json') : undefined;
    const config = await loadConfig({ configPath });

    config.server.port = port;
    config.logging.level = 'info';
    config.logging.pretty = false;
    config.devUi = { enabled: true };
    if (gatewayUrl) {
      config.gatewayUrl = gatewayUrl;
    }
    if (ownerAddress) {
      config.server.address = ownerAddress;
    }

    const { app, devToken } = await createServer(config, { configDir });

    // Custom status endpoint exposing owner
    app.get('/status', (c) => c.json({
      status: 'healthy',
      owner: config.server.address || null,
      port,
    }));

    const server = serve({ fetch: app.fetch, port }, (info) => {
      send({ type: 'ready', port: info.port });

      if (devToken) {
        send({
          type: 'log',
          message: `Dev UI available at http://localhost:${info.port}/ui`,
        });
        send({ type: 'dev-token', token: devToken });
      }
    });

    function shutdown(signal) {
      send({ type: 'log', message: `Shutdown signal: ${signal}` });
      server.close(() => {
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 5000).unref();
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    send({ type: 'error', message: err.message || String(err) });
    process.exit(1);
  }
}

main();
