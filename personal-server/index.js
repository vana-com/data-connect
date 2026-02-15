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
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { execSync, spawn } from 'node:child_process';
import { loadConfig } from '@opendatalabs/personal-server-ts-core/config';
import { createServer } from '@opendatalabs/personal-server-ts-server';
import { serve } from '@hono/node-server';

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

/**
 * Kill any stale frpc processes from a previous app session.
 *
 * On macOS/Linux, uses pkill to match the frpc binary path.
 * On Windows, kills all frpc.exe processes.
 */
function killStaleFrpc(storageRoot, send) {
  const frpcPath = join(storageRoot, 'bin', process.platform === 'win32' ? 'frpc.exe' : 'frpc');
  try {
    if (process.platform === 'win32') {
      execSync('taskkill /F /IM frpc.exe 2>nul', { stdio: 'ignore' });
    } else {
      execSync(`pkill -f "${frpcPath}" 2>/dev/null`, { stdio: 'ignore' });
    }
    send({ type: 'log', message: '[tunnel] Killed stale frpc process' });
  } catch {
    // No stale process — expected on clean starts
  }
}

/**
 * Fix the static proxy name collision on the FRP server.
 *
 * The library's TunnelManager hardcodes proxy name "personal-server".
 * If a previous frpc session (from this or a prior server start) used that
 * name, the FRP server rejects the new connection or silently drops it.
 *
 * This stops the library's frpc, rewrites the TOML with a unique per-session
 * proxy name, and respawns frpc. Fire-and-forget: emits tunnel/tunnel-failed
 * events via send() as they happen.
 */
function fixTunnelProxyName(tunnelManager, storageRoot, send) {
  const tomlPath = join(storageRoot, 'tunnel', 'frpc.toml');
  const frpcPath = join(storageRoot, 'bin', process.platform === 'win32' ? 'frpc.exe' : 'frpc');

  // Stop the library's frpc (stuck with static "personal-server" name)
  tunnelManager.stop().then(() => {
    let toml;
    try {
      toml = readFileSync(tomlPath, 'utf-8');
    } catch {
      send({ type: 'tunnel-failed', message: 'Tunnel config not found' });
      return;
    }

    // Patch proxy name to a unique per-session value
    const uniqueName = `ps-${randomUUID().slice(0, 8)}`;
    toml = toml.replace(/name = "personal-server"/, `name = "${uniqueName}"`);
    writeFileSync(tomlPath, toml);

    // Extract subdomain to build public URL
    const match = toml.match(/subdomain = "(.+)"/);
    if (!match) {
      send({ type: 'tunnel-failed', message: 'No subdomain in tunnel config' });
      return;
    }
    const publicUrl = `https://${match[1]}.server.vana.org`;

    send({ type: 'log', message: `[tunnel] Respawning frpc with unique name: ${uniqueName}` });

    // Respawn frpc with the patched config
    const frpc = spawn(frpcPath, ['-c', tomlPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let connected = false;
    const onData = (data) => {
      const text = data.toString();
      if (!connected && (text.includes('start proxy success') || text.includes('login to server success'))) {
        connected = true;
        send({ type: 'tunnel', url: publicUrl });
      }
    };
    frpc.stdout?.on('data', onData);
    frpc.stderr?.on('data', onData);
    frpc.on('error', (err) => {
      if (!connected) {
        send({ type: 'tunnel-failed', message: `frpc error: ${err.message}` });
      }
    });
    frpc.on('exit', (code) => {
      if (!connected) {
        send({ type: 'tunnel-failed', message: `frpc exited with code ${code}` });
      }
    });

    // Ensure frpc is killed on process exit
    const killFrpc = () => { try { frpc.kill(); } catch {} };
    process.on('exit', killFrpc);
    process.on('SIGTERM', killFrpc);
    process.on('SIGINT', killFrpc);
  }).catch((err) => {
    send({ type: 'tunnel-failed', message: `Failed to stop library tunnel: ${err.message}` });
  });
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

    // Kill any stale frpc from a previous app session, then let the library
    // handle the initial tunnel setup.
    const storageRoot = configDir || join(
      (await import('node:os')).homedir(),
      '.data-connect', 'personal-server'
    );
    killStaleFrpc(storageRoot, send);

    // Start background services (gateway registration + tunnel setup).
    // This populates context.tunnelManager and context.tunnelUrl.
    await context.startBackgroundServices();

    const hasMasterKey = !!process.env.VANA_MASTER_KEY_SIGNATURE;

    if (context.tunnelManager) {
      // Library set up tunnel — fix the static proxy name to avoid FRP
      // server collisions, then emit tunnel URL when connected.
      fixTunnelProxyName(context.tunnelManager, storageRoot, send);
    } else if (context.tunnelUrl) {
      // Tunnel connected without a manager (shouldn't happen, but handle it)
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
