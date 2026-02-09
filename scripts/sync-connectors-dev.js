#!/usr/bin/env node

/**
 * Syncs project connectors to ~/.databridge/connectors/ for dev mode.
 *
 * The Rust backend checks ~/.databridge/connectors/ first (user overrides),
 * falling back to the project's connectors/ directory. In production this
 * allows OTA updates, but in dev it means local edits are shadowed by stale
 * copies. This script copies the project connectors into the user directory
 * so dev always runs the latest source tree version.
 */

import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_CONNECTORS = join(__dirname, '..', 'connectors');
const USER_CONNECTORS = join(homedir(), '.databridge', 'connectors');

function log(msg) {
  console.log(`[sync-connectors-dev] ${msg}`);
}

// Only sync company/connector dirs (skip schemas/, types/, lib/, registry.json, etc.)
function isConnectorDir(name) {
  const skipDirs = ['schemas', 'types', 'lib', 'node_modules'];
  if (skipDirs.includes(name)) return false;
  const fullPath = join(PROJECT_CONNECTORS, name);
  return statSync(fullPath).isDirectory();
}

function main() {
  if (!existsSync(PROJECT_CONNECTORS)) {
    log('No project connectors directory found, skipping');
    return;
  }

  const dirs = readdirSync(PROJECT_CONNECTORS).filter(isConnectorDir);

  if (dirs.length === 0) {
    log('No connector directories found, skipping');
    return;
  }

  mkdirSync(USER_CONNECTORS, { recursive: true });

  let copied = 0;
  for (const dir of dirs) {
    const src = join(PROJECT_CONNECTORS, dir);
    const dest = join(USER_CONNECTORS, dir);
    cpSync(src, dest, { recursive: true });
    copied++;
  }

  log(`Synced ${copied} connector(s) to ${USER_CONNECTORS}`);
}

main();
