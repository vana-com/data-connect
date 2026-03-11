#!/usr/bin/env node

import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { basename, dirname, join, resolve } from 'path';

function printHelp() {
  console.log(`Usage: node scripts/build-macos-updater-artifacts.mjs --app <path> [--output-dir <path>]

Create a finalized macOS updater tarball from a signed .app bundle and sign it
with the Tauri updater private key.

Required environment:
  TAURI_SIGNING_PRIVATE_KEY or TAURI_SIGNING_PRIVATE_KEY_PATH
Optional environment:
  TAURI_SIGNING_PRIVATE_KEY_PASSWORD`);
}

function parseArgs(argv) {
  const args = { app: null, outputDir: null };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      args.help = true;
      continue;
    }

    if (arg === '--app') {
      args.app = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg === '--output-dir') {
      args.outputDir = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function log(message) {
  console.log(`\n🔨 ${message}`);
}

function run(command, args, options = {}) {
  console.log(`   $ ${command} ${args.join(' ')}`);
  execFileSync(command, args, { stdio: 'inherit', ...options });
}

function resolveNpmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function hasSigningKey() {
  return Boolean(
    process.env.TAURI_SIGNING_PRIVATE_KEY ||
      process.env.TAURI_SIGNING_PRIVATE_KEY_PATH
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  if (!args.app) {
    throw new Error('Missing required --app argument');
  }

  if (!hasSigningKey()) {
    throw new Error(
      'Missing updater signing key. Set TAURI_SIGNING_PRIVATE_KEY or TAURI_SIGNING_PRIVATE_KEY_PATH.'
    );
  }

  const appPath = resolve(args.app);
  if (!existsSync(appPath)) {
    throw new Error(`App bundle not found: ${appPath}`);
  }
  if (!appPath.endsWith('.app')) {
    throw new Error(`Expected a .app bundle, received: ${appPath}`);
  }

  const outputDir = resolve(args.outputDir ?? dirname(appPath));
  mkdirSync(outputDir, { recursive: true });

  const appName = basename(appPath);
  const tarballPath = join(outputDir, `${appName}.tar.gz`);
  const signaturePath = `${tarballPath}.sig`;

  rmSync(tarballPath, { force: true });
  rmSync(signaturePath, { force: true });

  log(`Creating updater tarball for ${appName}`);
  run('tar', ['-czf', tarballPath, '-C', dirname(appPath), appName]);

  log(`Signing updater tarball ${basename(tarballPath)}`);
  run(resolveNpmCommand(), ['run', 'tauri', 'signer', 'sign', '--', tarballPath]);

  if (!existsSync(tarballPath)) {
    throw new Error(`Updater tarball was not created: ${tarballPath}`);
  }
  if (!existsSync(signaturePath)) {
    throw new Error(`Updater signature was not created: ${signaturePath}`);
  }

  console.log(`\nCreated updater artifacts:
- ${tarballPath}
- ${signaturePath}`);
}

try {
  main();
} catch (error) {
  console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
