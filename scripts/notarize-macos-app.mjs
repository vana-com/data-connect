#!/usr/bin/env node

import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { basename, dirname, join, resolve } from 'path';

function printHelp() {
  console.log(`Usage: node scripts/notarize-macos-app.mjs --app <path> [--output-dir <path>]

Submit a signed macOS .app for notarization via a temporary zip archive, then
staple the accepted ticket back onto the .app bundle.

Required environment:
  APPLE_NOTARY_KEY_PATH
  APPLE_NOTARY_KEY_ID
  APPLE_NOTARY_ISSUER`);
}

function parseArgs(argv) {
  const args = { app: null, outputDir: null, help: false };

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

function runWithCapturedOutput(command, args, options = {}) {
  console.log(`   $ ${command} ${args.join(' ')}`);
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
    ...options,
  });
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function extractSubmissionId(output) {
  const match = output.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  );
  return match?.[0] ?? null;
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

  const keyPath = requireEnv('APPLE_NOTARY_KEY_PATH');
  const keyId = requireEnv('APPLE_NOTARY_KEY_ID');
  const issuer = requireEnv('APPLE_NOTARY_ISSUER');

  const appPath = resolve(args.app);
  if (!existsSync(appPath)) {
    throw new Error(`App bundle not found: ${appPath}`);
  }
  if (!appPath.endsWith('.app')) {
    throw new Error(`Expected a .app bundle, received: ${appPath}`);
  }

  const outputDir = resolve(args.outputDir ?? dirname(appPath));
  mkdirSync(outputDir, { recursive: true });

  const zipPath = join(outputDir, `${basename(appPath)}.notary.zip`);
  rmSync(zipPath, { force: true });

  log(`Creating notarization zip for ${basename(appPath)}`);
  run('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', appPath, zipPath]);

  log(`Submitting ${basename(zipPath)} for notarization`);
  let notarizeOutput = '';
  try {
    notarizeOutput = runWithCapturedOutput('xcrun', [
      'notarytool',
      'submit',
      zipPath,
      '--key',
      keyPath,
      '--key-id',
      keyId,
      '--issuer',
      issuer,
      '--wait',
    ]);
    process.stdout.write(notarizeOutput);
  } catch (error) {
    const stdout =
      typeof error?.stdout === 'string' ? error.stdout : error?.stdout?.toString?.() ?? '';
    const stderr =
      typeof error?.stderr === 'string' ? error.stderr : error?.stderr?.toString?.() ?? '';
    notarizeOutput = `${stdout}\n${stderr}`;
    process.stdout.write(stdout);
    process.stderr.write(stderr);

    const submissionId = extractSubmissionId(notarizeOutput);
    if (submissionId) {
      console.error(`\n=== Fetching notarization log for ${submissionId} ===`);
      try {
        run('xcrun', [
          'notarytool',
          'log',
          submissionId,
          '--key',
          keyPath,
          '--key-id',
          keyId,
          '--issuer',
          issuer,
        ]);
      } catch {
        // Best effort only; keep original failure.
      }
    }

    throw new Error(`Notarization failed for ${zipPath}`);
  } finally {
    rmSync(zipPath, { force: true });
  }

  log(`Stapling accepted ticket onto ${basename(appPath)}`);
  run('xcrun', ['stapler', 'staple', appPath]);

  log(`Validating stapled ticket on ${basename(appPath)}`);
  run('xcrun', ['stapler', 'validate', appPath]);
}

try {
  main();
} catch (error) {
  console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
