/**
 * Personal Server wrapper for DataBridge (CJS entry for pkg)
 *
 * Runs as a subprocess managed by the Tauri backend.
 * Communicates status via JSON lines on stdout.
 */

const { join } = require('node:path');
const { readFileSync, writeFileSync } = require('node:fs');
const { randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');

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
    const { loadConfig } = await import('@opendatalabs/personal-server-ts-core/config');
    const { createServer } = await import('@opendatalabs/personal-server-ts-server');
    const { serve } = await import('@hono/node-server');

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

    const { app, devToken, tunnelUrl, tunnelManager, cleanup } = await createServer(config, { rootPath: configDir });

    // Fix stale proxy name collision on FRP server
    const { homedir } = require('node:os');
    const storageRoot = configDir || join(homedir(), '.data-connect', 'personal-server');
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
