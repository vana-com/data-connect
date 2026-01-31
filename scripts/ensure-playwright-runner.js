import { existsSync, readdirSync } from "node:fs";
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

const distReady =
  existsSync(distDir) && readdirSync(distDir, { withFileTypes: true }).length > 0;

if (distReady) {
  process.exit(0);
}

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

console.log("[ensure-playwright-runner] Building playwright-runner binary...");
const build = spawnSync("npm", ["run", "build"], {
  cwd: runnerDir,
  stdio: "inherit",
});
process.exit(build.status ?? 1);
