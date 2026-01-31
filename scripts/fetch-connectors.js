#!/usr/bin/env node

/**
 * Fetches connector files from the remote registry.
 *
 * Used by:
 * - npm postinstall (local dev + CI)
 * - Can be run manually: node scripts/fetch-connectors.js
 *
 * Environment variables:
 * - CONNECTORS_PATH: Skip fetch, use local directory instead (for connector devs)
 * - SKIP_CONNECTOR_FETCH: Skip fetch entirely (offline dev)
 * - REGISTRY_URL: Override registry URL
 */

import { createHash } from 'crypto';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONNECTORS_DIR = join(ROOT, 'connectors');
const DEFAULT_REGISTRY_URL = 'https://raw.githubusercontent.com/volod-vana/registry/main/registry.json';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function log(msg) {
  console.log(`[fetch-connectors] ${msg}`);
}

function warn(msg) {
  console.warn(`[fetch-connectors] WARN: ${msg}`);
}

function calculateChecksum(data) {
  const hash = createHash('sha256').update(data).digest('hex');
  return `sha256:${hash}`;
}

async function fetchWithRetry(url, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return res;
    } catch (err) {
      if (attempt === retries) throw err;
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      warn(`Attempt ${attempt}/${retries} failed for ${url}: ${err.message}. Retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

async function fetchRegistry() {
  const url = process.env.REGISTRY_URL || DEFAULT_REGISTRY_URL;
  log(`Fetching registry from ${url}`);
  const res = await fetchWithRetry(url);
  return res.json();
}

async function downloadAndVerify(baseUrl, filePath, expectedChecksum) {
  const url = `${baseUrl}/${filePath}`;
  const res = await fetchWithRetry(url);
  const buffer = Buffer.from(await res.arrayBuffer());

  const actual = calculateChecksum(buffer);
  if (actual !== expectedChecksum) {
    throw new Error(
      `Checksum mismatch for ${filePath}\n` +
      `  Expected: ${expectedChecksum}\n` +
      `  Actual:   ${actual}`
    );
  }

  return buffer;
}

async function main() {
  // Skip if CONNECTORS_PATH is set (connector developer mode)
  if (process.env.CONNECTORS_PATH) {
    log(`CONNECTORS_PATH set to ${process.env.CONNECTORS_PATH} — skipping fetch`);
    return;
  }

  // Skip if explicitly disabled
  if (process.env.SKIP_CONNECTOR_FETCH) {
    log('SKIP_CONNECTOR_FETCH set — skipping fetch');
    return;
  }

  const registry = await fetchRegistry();
  log(`Registry v${registry.version} — ${registry.connectors.length} connector(s)`);

  let fetched = 0;
  let skipped = 0;

  for (const connector of registry.connectors) {
    const { id, company, files, checksums } = connector;

    // Check if files already exist with correct checksums
    const scriptPath = join(CONNECTORS_DIR, files.script);
    const metadataPath = join(CONNECTORS_DIR, files.metadata);

    if (existsSync(scriptPath) && existsSync(metadataPath)) {
      const scriptData = readFileSync(scriptPath);
      const metaData = readFileSync(metadataPath);
      if (calculateChecksum(scriptData) === checksums.script &&
          calculateChecksum(metaData) === checksums.metadata) {
        skipped++;
        continue;
      }
    }

    log(`Downloading ${id} (${company})...`);

    // Ensure directory exists
    const companyDir = join(CONNECTORS_DIR, company);
    mkdirSync(companyDir, { recursive: true });

    // Download and verify script
    const scriptBuffer = await downloadAndVerify(registry.baseUrl, files.script, checksums.script);
    writeFileSync(scriptPath, scriptBuffer);

    // Download and verify metadata
    const metadataBuffer = await downloadAndVerify(registry.baseUrl, files.metadata, checksums.metadata);
    writeFileSync(metadataPath, metadataBuffer);

    fetched++;
  }

  log(`Done. ${fetched} downloaded, ${skipped} up-to-date.`);
}

main().catch(err => {
  console.error(`[fetch-connectors] ERROR: ${err.message}`);
  process.exit(1);
});
