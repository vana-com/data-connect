import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const serverDir = join(root, "personal-server");
const distDir = join(serverDir, "dist");
const nodeModulesDir = join(serverDir, "node_modules");

if (!existsSync(serverDir)) {
  console.error("[ensure-personal-server] Missing personal-server directory.");
  process.exit(1);
}

const distReady =
  existsSync(distDir) &&
  readdirSync(distDir).filter((f) => f !== ".gitkeep").length > 0;

if (distReady) {
  process.exit(0);
}

if (!existsSync(nodeModulesDir)) {
  console.log("[ensure-personal-server] Installing personal-server deps...");
  const install = spawnSync("npm", ["install"], {
    cwd: serverDir,
    stdio: "inherit",
  });
  if (install.status !== 0) {
    process.exit(install.status ?? 1);
  }
}

console.log("[ensure-personal-server] Building personal-server binary...");
const build = spawnSync("npm", ["run", "build"], {
  cwd: serverDir,
  stdio: "inherit",
});
process.exit(build.status ?? 1);
