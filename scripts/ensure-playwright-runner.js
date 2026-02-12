/**
 * Ensures the playwright-runner binary is built and up-to-date.
 *
 * Compares modification times of key input files against the output binary.
 * Rebuilds only when stale or missing.
 */

import { existsSync, statSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const runnerDir = join(root, "playwright-runner");
const distDir = join(runnerDir, "dist");
const nodeModulesDir = join(runnerDir, "node_modules");

if (!existsSync(runnerDir)) {
  console.error("[ensure-playwright-runner] Missing playwright-runner directory.");
  process.exit(1);
}

// --- Staleness check ---
function isStale() {
  if (!existsSync(distDir)) return true;

  const distFiles = readdirSync(distDir, { withFileTypes: true });
  if (distFiles.length === 0) return true;

  // Find the oldest file in dist/ as the build timestamp
  let oldestMtime = Infinity;
  for (const f of distFiles) {
    const mtime = statSync(join(distDir, f.name)).mtimeMs;
    if (mtime < oldestMtime) oldestMtime = mtime;
  }

  // Check key input files
  const inputs = [
    join(runnerDir, "package.json"),
    join(runnerDir, "package-lock.json"),
  ];

  // Check all source files in src/ if it exists
  const srcDir = join(runnerDir, "src");
  if (existsSync(srcDir)) {
    for (const f of readdirSync(srcDir)) {
      inputs.push(join(srcDir, f));
    }
  }

  for (const input of inputs) {
    if (!existsSync(input)) continue;
    if (statSync(input).mtimeMs > oldestMtime) {
      console.log(
        `[ensure-playwright-runner] Stale: ${input} is newer than dist.`
      );
      return true;
    }
  }

  return false;
}

if (!isStale()) {
  console.log("[ensure-playwright-runner] Build is up-to-date, skipping.");
  process.exit(0);
}

// --- Ensure deps are installed ---
if (!existsSync(nodeModulesDir)) {
  console.log("[ensure-playwright-runner] Installing playwright-runner deps...");
  const install = spawnSync("npm", ["install"], {
    cwd: runnerDir,
    stdio: "inherit",
  });
  if (install.status !== 0) {
    process.exit(install.status ?? 1);
  }
}

// --- Build ---
console.log("[ensure-playwright-runner] Building playwright-runner...");
const build = spawnSync("npm", ["run", "build"], {
  cwd: runnerDir,
  stdio: "inherit",
});
process.exit(build.status ?? 1);
