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

import { cpSync, existsSync, mkdirSync, readFileSync } from 'fs';
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

// Derive connector directories from registry.json file paths.
function getConnectorDirs() {
  const registryPath = join(SOURCE_CONNECTORS, 'registry.json');
  if (!existsSync(registryPath)) {
    log(`No registry.json found at ${registryPath}`);
    return [];
  }
  const registry = JSON.parse(readFileSync(registryPath, 'utf-8'));
  const dirs = new Set();
  for (const connector of registry.connectors ?? []) {
    for (const filePath of Object.values(connector.files ?? {})) {
      dirs.add(filePath.split('/')[0]);
    }
  }
  return [...dirs];
}

function main() {
  if (!existsSync(SOURCE_CONNECTORS)) {
    log(`Connectors source not found: ${SOURCE_CONNECTORS}, skipping`);
    return;
  }

  if (process.env.CONNECTORS_PATH) {
    log(`Using CONNECTORS_PATH: ${SOURCE_CONNECTORS}`);
  }

  const dirs = getConnectorDirs();

  if (dirs.length === 0) {
    log('No connector directories found, skipping');
    return;
  }

  mkdirSync(USER_CONNECTORS, { recursive: true });

  let copied = 0;
  for (const dir of dirs) {
    const src = join(SOURCE_CONNECTORS, dir);
    if (!existsSync(src)) {
      log(`Skipping ${dir}/ (not found in ${SOURCE_CONNECTORS})`);
      continue;
    }
    const dest = join(USER_CONNECTORS, dir);
    cpSync(src, dest, { recursive: true });
    copied++;
  }

  log(`Synced ${copied} connector(s) to ${USER_CONNECTORS}`);
}

main();
