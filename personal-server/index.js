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
import { readFileSync } from 'node:fs';
import { execSync, spawn } from 'node:child_process';
import { loadConfig } from '@opendatalabs/personal-server-ts-core/config';
import { createServer } from '@opendatalabs/personal-server-ts-server';
import { serve } from '@hono/node-server';

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

/**
 * Kill any stale frpc processes from a previous app session.
 */
function killStaleFrpc(storageRoot) {
  const frpcPath = join(storageRoot, 'bin', process.platform === 'win32' ? 'frpc.exe' : 'frpc');
  try {
    if (process.platform === 'win32') {
      execSync('taskkill /F /IM frpc.exe 2>nul', { stdio: 'ignore' });
    } else {
      execSync(`pkill -f "${frpcPath}" 2>/dev/null`, { stdio: 'ignore' });
    }
    return true; // killed something
  } catch {
    return false; // no stale process
  }
}

/**
 * Spawn frpc and wait for it to connect or fail.
 *
 * Returns a promise that resolves to the public URL on success, or null on failure.
 * The spawned frpc process is registered for cleanup on process exit.
 */
function spawnFrpc(frpcPath, tomlPath, publicUrl, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const frpc = spawn(frpcPath, ['-c', tomlPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        frpc.kill();
        resolve(null);
      }
    }, timeoutMs);

    const onData = (data) => {
      const text = data.toString();
      if (!settled && (text.includes('start proxy success') || text.includes('login to server success'))) {
        settled = true;
        clearTimeout(timer);

        // Keep frpc alive — register cleanup handlers
        const killFrpc = () => { try { frpc.kill(); } catch {} };
        process.on('exit', killFrpc);
        process.on('SIGTERM', killFrpc);
        process.on('SIGINT', killFrpc);

        resolve(publicUrl);
      }
    };
    frpc.stdout?.on('data', onData);
    frpc.stderr?.on('data', onData);

    frpc.on('error', () => {
      if (!settled) { settled = true; clearTimeout(timer); resolve(null); }
    });
    frpc.on('exit', () => {
      if (!settled) { settled = true; clearTimeout(timer); resolve(null); }
    });
  });
}

/**
 * Connect the tunnel with retries.
 *
 * The library's TunnelManager hardcodes proxy name "personal-server" which
 * collides on the FRP server if a previous frpc session held that name.
 * After the library sets up the tunnel config (TOML + frpc binary), we:
 *   1. Stop the library's frpc
 *   2. Kill any remaining frpc processes
 *   3. Wait for the FRP server to release the proxy name
 *   4. Spawn frpc ourselves from the existing TOML
 *   5. Retry with increasing delays if the connection fails
 */
async function connectTunnelWithRetry(tunnelManager, storageRoot, send, maxRetries = 3) {
  const tomlPath = join(storageRoot, 'tunnel', 'frpc.toml');
  const frpcPath = join(storageRoot, 'bin', process.platform === 'win32' ? 'frpc.exe' : 'frpc');

  // Read TOML to extract the public URL
  let toml;
  try {
    toml = readFileSync(tomlPath, 'utf-8');
  } catch {
    send({ type: 'tunnel-failed', message: 'Tunnel config not found' });
    return;
  }

  const match = toml.match(/subdomain = "(.+)"/);
  if (!match) {
    send({ type: 'tunnel-failed', message: 'No subdomain in tunnel config' });
    return;
  }
  const publicUrl = `https://${match[1]}.server.vana.org`;

  // Stop the library's frpc (it uses the static "personal-server" name
  // which may collide on the FRP server)
  try { await tunnelManager.stop(); } catch {}

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Kill any lingering frpc and wait for FRP server to release the name
    killStaleFrpc(storageRoot);
    const delay = attempt * 3000; // 3s, 6s, 9s
    send({ type: 'log', message: `[tunnel] Attempt ${attempt}/${maxRetries}, waiting ${delay / 1000}s for FRP server...` });
    await new Promise((r) => setTimeout(r, delay));

    const url = await spawnFrpc(frpcPath, tomlPath, publicUrl);
    if (url) {
      send({ type: 'tunnel', url });
      return;
    }

    send({ type: 'log', message: `[tunnel] Attempt ${attempt}/${maxRetries} failed` });
  }

  send({ type: 'tunnel-failed', message: 'Tunnel could not be established after retries' });
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

    // Kill any stale frpc from a previous app session.
    const storageRoot = configDir || join(
      (await import('node:os')).homedir(),
      '.data-connect', 'personal-server'
    );
    killStaleFrpc(storageRoot);

    // Start background services (gateway registration + tunnel setup).
    // The library creates the tunnel config (TOML) and downloads frpc.
    await context.startBackgroundServices();

    const hasMasterKey = !!process.env.VANA_MASTER_KEY_SIGNATURE;

    if (context.tunnelManager) {
      // Library set up tunnel infrastructure. Reconnect with retries to
      // handle FRP server proxy name collisions from stale sessions.
      connectTunnelWithRetry(context.tunnelManager, storageRoot, send);
    } else if (context.tunnelUrl) {
      send({ type: 'tunnel', url: context.tunnelUrl });
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
