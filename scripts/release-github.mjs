#!/usr/bin/env node

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const TAURI_CONF_PATH = join(ROOT, "src-tauri", "tauri.conf.json");

function run(command, options = {}) {
  return execSync(command, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
}

function runInherit(command) {
  execSync(command, {
    cwd: ROOT,
    stdio: "inherit",
  });
}

function fail(message) {
  process.stderr.write(`\n[release] ${message}\n`);
  process.exit(1);
}

function info(message) {
  process.stdout.write(`[release] ${message}\n`);
}

function parseArgs(argv) {
  const args = {
    version: "",
    target: "main",
    title: "",
    notes: "",
    dryRun: false,
    noPush: false,
    checkVersion: false,
    showVersions: false,
    suggestVersion: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--version") {
      args.version = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (token === "--target") {
      args.target = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (token === "--title") {
      args.title = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (token === "--notes") {
      args.notes = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (token === "--no-push") {
      args.noPush = true;
      continue;
    }
    if (token === "--check-version") {
      args.checkVersion = true;
      continue;
    }
    if (token === "--show-versions") {
      args.showVersions = true;
      continue;
    }
    if (token === "--suggest-version") {
      args.suggestVersion = true;
      continue;
    }

    fail(`Unknown argument: ${token}`);
  }

  return args;
}

function requireTool(name, command) {
  try {
    run(command);
  } catch {
    fail(`${name} is required but not available`);
  }
}

function ensureGhAuthenticated() {
  try {
    run("gh auth status");
  } catch {
    fail("GitHub CLI is not authenticated. Run: gh auth login");
  }
}

function assertCleanGitState() {
  const status = run("git status --porcelain");
  if (status.length > 0) {
    fail("Working tree is not clean. Commit or stash changes first.");
  }
}

function assertBranch(targetBranch) {
  const current = run("git rev-parse --abbrev-ref HEAD");
  if (current !== targetBranch) {
    fail(`Current branch is '${current}', expected '${targetBranch}'`);
  }
}

function assertTagMissing(tagName) {
  const localTags = run(`git tag -l "${tagName}"`);
  if (localTags === tagName) {
    fail(`Tag '${tagName}' already exists locally`);
  }

  const remoteTags = run(`git ls-remote --tags origin "refs/tags/${tagName}"`);
  if (remoteTags.length > 0) {
    fail(`Tag '${tagName}' already exists on origin`);
  }
}

function parseVersion(value) {
  const semver = /^\d+\.\d+\.\d+$/;
  if (!semver.test(value)) {
    fail(`Invalid version '${value}'. Expected format: X.Y.Z`);
  }
  return value;
}

function compareSemver(left, right) {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (leftParts[i] > rightParts[i]) return 1;
    if (leftParts[i] < rightParts[i]) return -1;
  }
  return 0;
}

function bumpPatch(version) {
  const [major, minor, patch] = version.split(".").map(Number);
  return `${major}.${minor}.${patch + 1}`;
}

function getLatestRemoteTagVersion() {
  const output = run('git ls-remote --tags origin "refs/tags/v*"');
  if (!output) return null;

  const versions = output
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => line.split(/\s+/)[1] ?? "")
    .map(ref => ref.replace(/^refs\/tags\//, "").replace(/\^\{\}$/, ""))
    .filter(tag => /^v\d+\.\d+\.\d+$/.test(tag))
    .map(tag => tag.slice(1));

  if (versions.length === 0) return null;
  return versions.sort((a, b) => compareSemver(a, b)).at(-1) ?? null;
}

function readTauriConf() {
  const raw = readFileSync(TAURI_CONF_PATH, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed.version || typeof parsed.version !== "string") {
    fail("src-tauri/tauri.conf.json has no valid version field");
  }
  return parsed;
}

function updateTauriVersion(nextVersion) {
  const parsed = readTauriConf();
  parsed.version = nextVersion;
  writeFileSync(TAURI_CONF_PATH, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
}

function assertVersionOrdering(nextVersion, currentTauriVersion, latestRemoteTagVersion) {
  if (compareSemver(nextVersion, currentTauriVersion) <= 0) {
    fail(
      `Version ${nextVersion} must be greater than tauri.conf.json version ${currentTauriVersion}`,
    );
  }
  if (latestRemoteTagVersion && compareSemver(nextVersion, latestRemoteTagVersion) <= 0) {
    fail(`Version ${nextVersion} must be greater than latest remote tag v${latestRemoteTagVersion}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  requireTool("git", "git --version");
  const currentTauriVersion = parseVersion(readTauriConf().version);
  const latestRemoteTagVersion = getLatestRemoteTagVersion();
  const maxKnownVersion =
    latestRemoteTagVersion && compareSemver(latestRemoteTagVersion, currentTauriVersion) > 0
      ? latestRemoteTagVersion
      : currentTauriVersion;
  const suggestedVersion = bumpPatch(maxKnownVersion);

  if (args.showVersions) {
    info(`tauri.conf.json version: ${currentTauriVersion}`);
    info(`latest remote tag version: ${latestRemoteTagVersion ? `v${latestRemoteTagVersion}` : "none"}`);
    info(`suggested next version: ${suggestedVersion}`);
    if (!args.version) {
      return;
    }
  }

  if (args.suggestVersion) {
    info(`suggested next version: ${suggestedVersion}`);
    if (!args.version) {
      return;
    }
  }

  if (!args.version) {
    fail("Missing required argument: --version X.Y.Z");
  }

  const version = parseVersion(args.version);
  const tagName = `v${version}`;
  const releaseTitle = args.title || `DataConnect v${version}`;
  const releaseNotes = args.notes || `Release v${version}`;
  assertVersionOrdering(version, currentTauriVersion, latestRemoteTagVersion);

  if (args.checkVersion) {
    info(`Version check passed for ${version}`);
    return;
  }

  requireTool("gh", "gh --version");
  ensureGhAuthenticated();
  assertCleanGitState();
  assertBranch(args.target);
  assertTagMissing(tagName);

  if (args.dryRun) {
    info("Dry run mode enabled");
    info(`Would release tag: ${tagName}`);
    info(`Would target branch: ${args.target}`);
    info(`Would release title: ${releaseTitle}`);
    info(`Would release notes: ${releaseNotes}`);
    info(`Current tauri version: ${currentTauriVersion}`);
    info(`Latest remote tag version: ${latestRemoteTagVersion ? `v${latestRemoteTagVersion}` : "none"}`);
    info(`Suggested next version: ${suggestedVersion}`);
    info(`Would run: git pull --ff-only origin ${args.target}`);
    info(`Would update: src-tauri/tauri.conf.json version -> ${version}`);
    info(`Would run: git add src-tauri/tauri.conf.json`);
    info(`Would run: git commit -m "release: ${tagName}"`);
    if (!args.noPush) {
      info(`Would run: git push origin ${args.target}`);
    }
    info(
      `Would run: gh release create ${tagName} --target ${args.target} --title "${releaseTitle}" --notes "${releaseNotes}"`,
    );
    return;
  }

  info(`Pulling latest '${args.target}'`);
  runInherit(`git pull --ff-only origin ${args.target}`);

  info(`Updating tauri version: ${currentTauriVersion} -> ${version}`);
  updateTauriVersion(version);

  runInherit("git add src-tauri/tauri.conf.json");
  runInherit(`git commit -m "release: ${tagName}"`);

  if (!args.noPush) {
    runInherit(`git push origin ${args.target}`);
  } else {
    info("Skipping push because --no-push is set");
  }

  runInherit(
    `gh release create ${tagName} --target ${args.target} --title "${releaseTitle}" --notes "${releaseNotes}"`,
  );

  info(`Release created: ${tagName}`);
}

main();
