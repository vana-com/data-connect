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
import { spawn } from 'node:child_process';
import { loadConfig } from '@opendatalabs/personal-server-ts-core/config';
import { createServer } from '@opendatalabs/personal-server-ts-server';
import { serve } from '@hono/node-server';

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

/**
 * The library's TunnelManager uses a static proxy name ("personal-server")
 * which collides with stale sessions on the FRP server. This restarts frpc
 * with a unique per-session proxy name.
 */
async function fixTunnelProxyName(tunnelManager, storageRoot) {
  if (!tunnelManager) return null;

  const tomlPath = join(storageRoot, 'tunnel', 'frpc.toml');
  const frpcPath = join(storageRoot, 'bin', process.platform === 'win32' ? 'frpc.exe' : 'frpc');

  // Stop the library's frpc (stuck retrying with colliding name)
  await tunnelManager.stop();

  // Rewrite config with unique proxy name
  let toml = readFileSync(tomlPath, 'utf-8');
  const uniqueName = `ps-${randomUUID().slice(0, 8)}`;
  toml = toml.replace(/name = "personal-server"/, `name = "${uniqueName}"`);
  writeFileSync(tomlPath, toml);

  // Extract subdomain to build public URL
  const match = toml.match(/subdomain = "(.+)"/);
  const subdomain = match?.[1];
  if (!subdomain) return null;

  const publicUrl = `https://${subdomain}.server.vana.org`;

  // Spawn frpc with fixed config
  const frpc = spawn(frpcPath, ['-c', tomlPath], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // Wait for connection (up to 15s)
  const url = await new Promise((resolve) => {
    let resolved = false;
    const onData = (data) => {
      const text = data.toString();
      if (text.includes('start proxy success') || text.includes('login to server success')) {
        if (!resolved) { resolved = true; resolve(publicUrl); }
      }
    };
    frpc.stdout?.on('data', onData);
    frpc.stderr?.on('data', onData);
    frpc.on('error', () => { if (!resolved) { resolved = true; resolve(null); } });
    frpc.on('exit', (code) => { if (!resolved && code !== 0) { resolved = true; resolve(null); } });
    setTimeout(() => { if (!resolved) { resolved = true; resolve(publicUrl); } }, 15000);
  });

  // Ensure frpc is killed on process exit
  const killFrpc = () => { try { frpc.kill(); } catch {} };
  process.on('exit', killFrpc);
  process.on('SIGTERM', killFrpc);
  process.on('SIGINT', killFrpc);

  return url;
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

    const { app, devToken, tunnelUrl, tunnelManager, cleanup, gatewayClient, serverSigner } = await createServer(config, { rootPath: configDir });

    // --- Grant management routes ---
    // The library only exposes GET /v1/grants (list) and POST /v1/grants/verify.
    // Create and revoke go through the Gateway with EIP-712 signatures from the
    // server's derived keypair, so we add them here.

    app.post('/v1/grants', async (c) => {
      if (!serverSigner) {
        return c.json({ error: 'Server not configured for signing (no master key)' }, 500);
      }
      if (!gatewayClient) {
        return c.json({ error: 'Gateway client not initialized' }, 500);
      }

      let body;
      try {
        body = await c.req.json();
      } catch {
        return c.json({ error: 'Invalid JSON in request body' }, 400);
      }

      const { granteeAddress, scopes, expiresAt, nonce } = body;

      if (!granteeAddress || !Array.isArray(scopes) || scopes.length === 0) {
        return c.json({ error: 'granteeAddress and non-empty scopes[] are required' }, 400);
      }

      try {
        // Look up builder's bytes32 ID from the Gateway
        const builder = await gatewayClient.getBuilder(granteeAddress);
        if (!builder) {
          return c.json({ error: `Builder ${granteeAddress} not registered with Gateway` }, 400);
        }

        const ownerAddress = config.server.address;
        const expiresAtUnix = expiresAt
          ? Math.floor(new Date(expiresAt).getTime() / 1000)
          : 0;
        const grantNonce = nonce ? Number(nonce) : Math.floor(Math.random() * 1e9);

        // Build the grant payload string (opaque JSON stored on Gateway)
        const grantPayload = JSON.stringify({
          user: ownerAddress,
          builder: granteeAddress,
          scopes,
          expiresAt: expiresAtUnix,
          nonce: grantNonce,
        });

        // Sign the EIP-712 GrantRegistration message with the server's derived key
        const signature = await serverSigner.signGrantRegistration({
          grantorAddress: ownerAddress,
          granteeId: builder.id,
          grant: grantPayload,
          fileIds: [],
        });

        // Submit to Gateway
        const result = await gatewayClient.createGrant({
          grantorAddress: ownerAddress,
          granteeId: builder.id,
          grant: grantPayload,
          fileIds: [],
          signature,
        });

        return c.json({ grantId: result.grantId });
      } catch (err) {
        const message = err?.message || String(err);
        send({ type: 'log', message: `[POST /v1/grants] Error: ${message}` });
        return c.json({ error: message }, 500);
      }
    });

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

    // Fix stale proxy name collision on FRP server
    const storageRoot = configDir || join(
      (await import('node:os')).homedir(),
      '.data-connect', 'personal-server'
    );
    const effectiveTunnelUrl = tunnelManager
      ? await fixTunnelProxyName(tunnelManager, storageRoot)
      : tunnelUrl;

    // Custom status endpoint exposing owner
    app.get('/status', (c) => c.json({
      status: 'healthy',
      owner: config.server.address || null,
      port,
    }));

    const server = serve({ fetch: app.fetch, port }, (info) => {
      send({ type: 'ready', port: info.port });

      if (effectiveTunnelUrl) {
        send({ type: 'tunnel', url: effectiveTunnelUrl });
      }

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
