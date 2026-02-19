/**
 * Personal Server wrapper for DataConnect
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
  let json;
  try {
    json = JSON.stringify(msg);
  } catch {
    // Fallback for cyclic or non-serializable messages
    json = JSON.stringify({ type: msg?.type || 'error', message: String(msg?.message ?? 'Serialization error') });
  }
  process.stdout.write(json + '\n');
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
  } catch {
    // No stale process — expected on clean starts
  }
}

/**
 * Connect the tunnel with a unique proxy name.
 *
 * The library's TunnelManager hardcodes proxy name "personal-server" which
 * collides on the FRP server if a previous session used that name. The FRP
 * server reports "login to server success" even when the proxy registration
 * fails, so we can't detect the collision from frpc output alone.
 *
 * Fix: stop the library's frpc, rewrite the TOML with a unique per-session
 * proxy name, and respawn frpc. Fire-and-forget: emits tunnel/tunnel-failed
 * events via send() as they happen.
 */
async function connectTunnel(tunnelManager, storageRoot, send, { refreshAuth, attempt = 0 } = {}) {
  const MAX_RETRIES = 3;
  const tomlPath = join(storageRoot, 'tunnel', 'frpc.toml');
  const frpcPath = join(storageRoot, 'bin', process.platform === 'win32' ? 'frpc.exe' : 'frpc');

  // Stop the library's frpc
  try { await tunnelManager.stop(); } catch {}
  killStaleFrpc(storageRoot);

  // Read and patch the TOML config
  let toml;
  try {
    toml = readFileSync(tomlPath, 'utf-8');
  } catch {
    send({ type: 'tunnel-failed', message: 'Tunnel config not found' });
    return;
  }

  // Extract subdomain for the public URL
  const subdomainMatch = toml.match(/subdomain = "(.+)"/);
  if (!subdomainMatch) {
    send({ type: 'tunnel-failed', message: 'No subdomain in tunnel config' });
    return;
  }
  const publicUrl = `https://${subdomainMatch[1]}.server.vana.org`;

  // Replace static proxy name with a unique per-session name
  const uniqueName = `ps-${randomUUID().slice(0, 8)}`;
  toml = toml.replace(/name = "(?:personal-server|ps-[0-9a-f]+)"/, `name = "${uniqueName}"`);
  writeFileSync(tomlPath, toml);

  send({ type: 'log', message: `[tunnel] Connecting with proxy name: ${uniqueName}${attempt > 0 ? ` (retry ${attempt}/${MAX_RETRIES})` : ''}` });

  // Spawn frpc with the patched config
  const frpc = spawn(frpcPath, ['-c', tomlPath], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let connected = false;
  let tokenExpired = false;

  const retry = async () => {
    if (connected || attempt >= MAX_RETRIES) return;
    try { frpc.kill(); } catch {}
    if (refreshAuth) {
      send({ type: 'log', message: '[tunnel] Auth token expired, refreshing and retrying...' });
      try {
        await refreshAuth();
      } catch (err) {
        send({ type: 'tunnel-failed', message: `Failed to refresh tunnel auth: ${err.message}` });
        return;
      }
    }
    connectTunnel(tunnelManager, storageRoot, send, { refreshAuth, attempt: attempt + 1 });
  };

  const onData = (data) => {
    const text = data.toString();
    if (!connected && text.includes('start proxy success')) {
      connected = true;
      // Sync the library's TunnelManager state so /health reports correctly.
      // We killed the library's frpc and spawned our own, so the manager
      // still thinks the tunnel is "stopped".
      tunnelManager.status = 'connected';
      tunnelManager.publicUrl = publicUrl;
      tunnelManager.connectedSince = new Date();
      send({ type: 'tunnel', url: publicUrl });
    }
    // The FRP server auth token has a short TTL. If the initial connection
    // takes too long, the token expires and frpc retries forever with the
    // stale token. Detect this and retry with a fresh auth claim.
    if (!connected && !tokenExpired && text.includes('Token expired')) {
      tokenExpired = true;
      retry();
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
    if (!connected && !tokenExpired) {
      send({ type: 'tunnel-failed', message: `frpc exited with code ${code}` });
    }
  });

  // Ensure frpc is killed on process exit
  const killFrpc = () => { try { frpc.kill(); } catch {} };
  process.on('exit', killFrpc);
  process.on('SIGTERM', killFrpc);
  process.on('SIGINT', killFrpc);
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
      // Library set up tunnel infrastructure (TOML + frpc binary).
      // Reconnect with a unique proxy name to avoid FRP server collisions.
      // Pass refreshAuth so connectTunnel can retry with a fresh auth claim
      // if the FRP server rejects an expired token.
      connectTunnel(context.tunnelManager, storageRoot, send, {
        refreshAuth: () => context.startBackgroundServices(),
      });
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
    // Flush stdout before exiting so the parent process captures the error
    process.stdout.write('', () => process.exit(1));
  }
}

main();
