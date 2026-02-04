/**
 * Personal Server wrapper for DataBridge
 *
 * Runs as a subprocess managed by the Tauri backend.
 * Communicates status via JSON lines on stdout.
 *
 * Environment variables:
 * - PORT (default: 8080)
 * - VANA_MASTER_KEY_SIGNATURE - hex signature for key derivation
 * - GATEWAY_URL - DP RPC gateway URL
 * - CONFIG_DIR - override ~/.vana config directory
 */

// Set NODE_ENV=production before imports to prevent pino-pretty transport loading
// This avoids "unable to determine transport target" errors in bundled binary
process.env.NODE_ENV = 'production';

import { join } from 'node:path';
import { loadConfig } from '@opendatalabs/personal-server-ts-core/config';
import { createServer } from '@opendatalabs/personal-server-ts-server';
import { serve } from '@hono/node-server';

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

async function main() {
  const port = parseInt(process.env.PORT || '8080', 10);
  const configDir = process.env.CONFIG_DIR || undefined;
  const gatewayUrl = process.env.GATEWAY_URL || undefined;
  const ownerAddress = process.env.OWNER_ADDRESS || undefined;

  try {
    // Load config from file (creates default if missing)
    const configPath = configDir ? join(configDir, 'server.json') : undefined;
    const config = await loadConfig({ configPath });

    // Override with env vars
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
