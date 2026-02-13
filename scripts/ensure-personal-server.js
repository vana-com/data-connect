/**
 * Ensures the personal-server binary is built and up-to-date.
 *
 * Compares modification times of key input files (source, lockfile,
 * library code) against the output binary. Rebuilds only when stale
 * or missing, so dev startup stays fast when nothing changed.
 */

import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { platform } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const serverDir = join(root, "personal-server");
const distDir = join(serverDir, "dist");
const nodeModulesDir = join(serverDir, "node_modules");
const requiredDeps = [
  join(nodeModulesDir, "@opendatalabs", "personal-server-ts-core", "package.json"),
  join(nodeModulesDir, "@opendatalabs", "personal-server-ts-server", "package.json"),
];
const binaryName =
  platform() === "win32" ? "personal-server.exe" : "personal-server";
const binaryPath = join(distDir, binaryName);

if (!existsSync(serverDir)) {
  console.error("[ensure-personal-server] Missing personal-server directory.");
  process.exit(1);
}

// --- Staleness check ---
// If the binary exists, compare its mtime against key input files.
// If any input is newer, the binary is stale and needs rebuilding.
function isStale() {
  if (!existsSync(binaryPath)) return true;

  const binaryMtime = statSync(binaryPath).mtimeMs;

  // Files that, when changed, mean we need to rebuild
  const inputs = [
    join(serverDir, "index.js"),
    join(serverDir, "package.json"),
    join(serverDir, "package-lock.json"),
    // Library code — if npm updated the dependency, this will be newer
    join(
      nodeModulesDir,
      "@opendatalabs",
      "personal-server-ts-server",
      "dist",
      "app.js"
    ),
    join(
      nodeModulesDir,
      "@opendatalabs",
      "personal-server-ts-core",
      "package.json"
    ),
  ];

  for (const input of inputs) {
    if (!existsSync(input)) continue;
    if (statSync(input).mtimeMs > binaryMtime) {
      console.log(
        `[ensure-personal-server] Stale: ${input} is newer than binary.`
      );
      return true;
    }
  }

  return false;
}

if (!isStale()) {
  console.log("[ensure-personal-server] Binary is up-to-date, skipping build.");
  process.exit(0);
}

// --- Ensure deps are installed ---
const hasMissingRequiredDeps = requiredDeps.some((depPath) => !existsSync(depPath));
if (!existsSync(nodeModulesDir) || hasMissingRequiredDeps) {
  if (hasMissingRequiredDeps) {
    console.log(
      "[ensure-personal-server] Missing required personal-server dependencies, reinstalling..."
    );
  }
  console.log("[ensure-personal-server] Installing personal-server deps...");
  const install = spawnSync("npm", ["install"], {
    cwd: serverDir,
    stdio: "inherit",
  });
  if (install.status !== 0) {
    process.exit(install.status ?? 1);
  }
}

// --- Build ---
console.log("[ensure-personal-server] Building personal-server binary...");
const build = spawnSync("npm", ["run", "build"], {
  cwd: serverDir,
  stdio: "inherit",
});
process.exit(build.status ?? 1);
