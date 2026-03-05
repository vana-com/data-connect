#!/usr/bin/env node

/**
 * Syncs connectors to ~/.dataconnect/connectors/ for dev mode.
 *
 * If CONNECTORS_PATH is set, syncs from that directory (e.g. a local
 * data-connectors repo checkout). Otherwise falls back to the project's
 * own connectors/ directory.
 *
 * Usage:
 *   CONNECTORS_PATH=../data-connectors npm run tauri:dev
 */

import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_CONNECTORS = join(__dirname, '..', 'connectors');
const SOURCE_CONNECTORS = process.env.CONNECTORS_PATH
  ? resolve(process.env.CONNECTORS_PATH)
  : PROJECT_CONNECTORS;
const USER_CONNECTORS = join(homedir(), '.dataconnect', 'connectors');

function log(msg) {
  console.log(`[sync-connectors-dev] ${msg}`);
}

// Only sync directories that contain a connector metadata file (*-playwright.json).
// Skips non-connector dirs (clearcut, proxy-test, docs, etc.) that happen to
// live in the data-connectors repo.
function isConnectorDir(name) {
  if (name.startsWith('.')) return false;
  const fullPath = join(SOURCE_CONNECTORS, name);
  if (!existsSync(fullPath) || !statSync(fullPath).isDirectory()) return false;
  // A real connector dir contains a *-playwright.json metadata file
  const files = readdirSync(fullPath);
  return files.some(f => f.endsWith('-playwright.json'));
}

function main() {
  if (!existsSync(SOURCE_CONNECTORS)) {
    log(`Connectors source not found: ${SOURCE_CONNECTORS}, skipping`);
    return;
  }

  if (process.env.CONNECTORS_PATH) {
    log(`Using CONNECTORS_PATH: ${SOURCE_CONNECTORS}`);
  }

  const dirs = readdirSync(SOURCE_CONNECTORS).filter(isConnectorDir);

  if (dirs.length === 0) {
    log('No connector directories found, skipping');
    return;
  }

  mkdirSync(USER_CONNECTORS, { recursive: true });

  let copied = 0;
  for (const dir of dirs) {
    const src = join(SOURCE_CONNECTORS, dir);
    const dest = join(USER_CONNECTORS, dir);
    cpSync(src, dest, {
      recursive: true,
      filter: (s) => !s.includes('/.git/') && !s.endsWith('/.git'),
    });
    copied++;
  }

  log(`Synced ${copied} connector(s) to ${USER_CONNECTORS}`);
}

main();
