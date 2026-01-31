import { existsSync, watch } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { syncSkills } from "./sync-skills.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const agentsDir = join(root, ".agents", "skills");
const defaultTargetDir = join(root, ".cursor", "skills");

const resolveTargetDir = (targetArg) => {
  if (!targetArg || targetArg === "cursor") {
    return defaultTargetDir;
  }
  if (targetArg === "claude") {
    return join(root, ".claude", "skills");
  }
  return resolve(root, targetArg);
};

if (!existsSync(agentsDir)) {
  console.log("[skills-watch] No .agents/skills found; exiting.");
  process.exit(0);
}

const targetDir = resolveTargetDir(
  process.argv.find((item) => item.startsWith("--target="))?.slice("--target=".length),
);

syncSkills(targetDir);

let timer;
const scheduleSync = () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    syncSkills(targetDir);
  }, 150);
};

watch(agentsDir, { recursive: true }, scheduleSync);
console.log("[skills-watch] Watching .agents/skills for changes...");
