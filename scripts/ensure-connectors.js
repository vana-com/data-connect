#!/usr/bin/env node

/**
 * Ensures connector directories required by tauri.conf.json exist.
 * If any required directory is missing, run fetch-connectors automatically.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CONNECTORS_DIR = join(ROOT, "connectors");
const TAURI_CONFIG = join(ROOT, "src-tauri", "tauri.conf.json");
const FETCH_SCRIPT = join(ROOT, "scripts", "fetch-connectors.js");

function log(message) {
  console.log(`[ensure-connectors] ${message}`);
}

function readRequiredConnectorDirs() {
  const raw = readFileSync(TAURI_CONFIG, "utf8");
  const config = JSON.parse(raw);
  const resources = config?.bundle?.resources ?? {};
  const keys = Object.keys(resources);

  const required = new Set();
  for (const key of keys) {
    const match = key.match(/^\.\.\/connectors\/([^/*]+)\/\*\*\/\*$/);
    if (!match) continue;
    required.add(match[1]);
  }

  return [...required];
}

function hasConnectorFiles(dirPath) {
  if (!existsSync(dirPath)) return false;
  if (!statSync(dirPath).isDirectory()) return false;
  const entries = readdirSync(dirPath).filter((name) => !name.startsWith("."));
  return entries.length > 0;
}

function getMissingConnectorDirs(requiredDirs) {
  return requiredDirs.filter(
    (name) => !hasConnectorFiles(join(CONNECTORS_DIR, name)),
  );
}

function runFetchConnectors() {
  const result = spawnSync(process.execPath, [FETCH_SCRIPT], {
    stdio: "inherit",
    cwd: ROOT,
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`fetch-connectors exited with status ${result.status}`);
  }
}

function main() {
  const requiredDirs = readRequiredConnectorDirs();
  if (requiredDirs.length === 0) {
    log("No required connector dirs declared in tauri.conf.json, skipping.");
    return;
  }

  const missing = getMissingConnectorDirs(requiredDirs);
  if (missing.length === 0) {
    log("connectors present -> skip fetch");
    return;
  }

  log(`Missing required connector dirs: ${missing.join(", ")}`);
  runFetchConnectors();

  const stillMissing = getMissingConnectorDirs(requiredDirs);
  if (stillMissing.length > 0) {
    throw new Error(
      `Connector fetch completed, but required dirs are still missing: ${stillMissing.join(", ")}`,
    );
  }

  log("connectors missing -> fetched from registry");
}

main();
