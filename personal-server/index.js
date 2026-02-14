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
import { execSync } from 'node:child_process';
import { loadConfig } from '@opendatalabs/personal-server-ts-core/config';
import { createServer } from '@opendatalabs/personal-server-ts-server';
import { serve } from '@hono/node-server';

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

/**
 * Kill any stale frpc processes from a previous server session.
 *
 * The library's TunnelManager uses a static proxy name ("personal-server").
 * If a previous frpc process is still connected to the FRP server with that
 * name, the new frpc will fail with a name collision. Killing the stale
 * process lets the FRP server detect the TCP disconnect and free the name,
 * so the library's own tunnel manager works natively.
 */
function killStaleFrpc(storageRoot, send) {
  const frpcPath = join(storageRoot, 'bin', process.platform === 'win32' ? 'frpc.exe' : 'frpc');
  try {
    if (process.platform === 'win32') {
      execSync('taskkill /F /IM frpc.exe 2>nul', { stdio: 'ignore' });
    } else {
      // Kill frpc processes running from our storage directory
      execSync(`pkill -f "${frpcPath}" 2>/dev/null`, { stdio: 'ignore' });
    }
    send({ type: 'log', message: '[tunnel] Killed stale frpc process' });
  } catch {
    // No stale process — expected on clean starts
  }
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

    // Keep as a reference — startBackgroundServices mutates context.tunnelManager / context.tunnelUrl.
    const context = await createServer(config, { rootPath: configDir });
    const { app, devToken, cleanup, gatewayClient, serverSigner } = context;

    // --- Grant management routes ---
    // The library ships POST /v1/grants (create) with Web3Auth middleware and
    // GET /v1/grants (list). The desktop client authenticates via the devToken
    // bypass in Web3Auth middleware (Bearer token). We only add DELETE here
    // because the library doesn't expose a revoke endpoint.

    app.delete('/v1/grants/:grantId', async (c) => {
      if (!serverSigner) {
        return c.json({ error: 'Server not configured for signing (no master key)' }, 500);
      }
      if (!gatewayClient) {
        return c.json({ error: 'Gateway client not initialized' }, 500);
      }

      const grantId = c.req.param('grantId');
      const ownerAddress = config.server.address;

      try {
        // Sign the EIP-712 GrantRevocation message
        const signature = await serverSigner.signGrantRevocation({
          grantorAddress: ownerAddress,
          grantId,
        });

        // Submit to Gateway
        await gatewayClient.revokeGrant({
          grantId,
          grantorAddress: ownerAddress,
          signature,
        });

        return c.body(null, 204);
      } catch (err) {
        const message = err?.message || String(err);
        send({ type: 'log', message: `[DELETE /v1/grants/${grantId}] Error: ${message}` });
        return c.json({ error: message }, 500);
      }
    });

    // Custom status endpoint exposing owner
    app.get('/status', (c) => c.json({
      status: 'healthy',
      owner: config.server.address || null,
      port,
    }));

    // Start HTTP server first so the desktop app can connect immediately.
    // Background services (gateway check, tunnel) run afterwards.
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

    // Kill any stale frpc from a previous session to avoid proxy name
    // collision on the FRP server, then let the library handle the tunnel.
    const storageRoot = configDir || join(
      (await import('node:os')).homedir(),
      '.data-connect', 'personal-server'
    );
    killStaleFrpc(storageRoot, send);

    // Start background services (gateway registration + tunnel setup).
    // This populates context.tunnelManager and context.tunnelUrl.
    await context.startBackgroundServices();

    const hasMasterKey = !!process.env.VANA_MASTER_KEY_SIGNATURE;

    if (context.tunnelUrl) {
      send({ type: 'tunnel', url: context.tunnelUrl });
    } else if (context.tunnelManager) {
      // Library set up tunnel manager but hasn't connected yet — it will
      // keep retrying in the background. We don't need to intervene.
      send({ type: 'log', message: '[tunnel] Tunnel manager active, waiting for connection...' });
    } else if (hasMasterKey) {
      send({ type: 'tunnel-failed', message: 'Tunnel could not be established' });
    }
    // Phase 1 (no masterKey): silently skip — tunnel is not expected

    function shutdown(signal) {
      send({ type: 'log', message: `Shutdown signal: ${signal}` });
      if (cleanup) cleanup().catch(() => {});
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
