import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

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

const isDirectoryOrSymlink = (entry) =>
  entry.isDirectory() || entry.isSymbolicLink();

const ensureTargetDir = (targetDir) => {
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
    return;
  }

  const stat = lstatSync(targetDir);
  if (!stat.isDirectory()) {
    rmSync(targetDir, { recursive: true, force: true });
    mkdirSync(targetDir, { recursive: true });
  }
};

const resolveLink = (linkPath) => resolve(dirname(linkPath), readlinkSync(linkPath));

export const syncSkills = (targetDir = defaultTargetDir) => {
  if (!existsSync(agentsDir)) {
    console.log("[sync-skills] No .agents/skills found; skipping.");
    return { linked: 0, removed: 0, skipped: 0 };
  }

  ensureTargetDir(targetDir);

  const agentEntries = readdirSync(agentsDir, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith("."))
    .filter(isDirectoryOrSymlink)
    .map((entry) => entry.name);

  const agentSet = new Set(agentEntries);

  let removed = 0;
  for (const entry of readdirSync(targetDir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) {
      continue;
    }
    if (!agentSet.has(entry.name)) {
      rmSync(join(targetDir, entry.name), { recursive: true, force: true });
      removed += 1;
    }
  }

  let linked = 0;
  let skipped = 0;
  for (const name of agentEntries) {
    const targetAbs = join(agentsDir, name);
    const linkPath = join(targetDir, name);
    const linkTarget = relative(targetDir, targetAbs);

    if (existsSync(linkPath)) {
      const stat = lstatSync(linkPath);
      if (stat.isSymbolicLink()) {
        const currentTarget = resolveLink(linkPath);
        if (currentTarget === resolve(targetAbs)) {
          skipped += 1;
          continue;
        }
      }
      rmSync(linkPath, { recursive: true, force: true });
    }

    symlinkSync(linkTarget, linkPath);
    linked += 1;
  }

  console.log(
    `[sync-skills] linked=${linked} removed=${removed} skipped=${skipped}`,
  );
  return { linked, removed, skipped };
};

const parseTargetArg = () => {
  const arg = process.argv.find((item) => item.startsWith("--target="));
  return arg ? arg.slice("--target=".length) : undefined;
};

const isMain = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isMain) {
  const targetDir = resolveTargetDir(parseTargetArg());
  syncSkills(targetDir);
}
