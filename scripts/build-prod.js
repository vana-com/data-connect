#!/usr/bin/env node

/**
 * Production build script for DataBridge
 *
 * This script:
 * 1. Builds the playwright-runner into a standalone binary
 * 2. Builds the Tauri app (connectors fetched via postinstall)
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PLAYWRIGHT_RUNNER = join(ROOT, 'playwright-runner');

function log(msg) {
  console.log(`\n🔨 ${msg}`);
}

function exec(cmd, opts = {}) {
  console.log(`   $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });
}

async function build() {
  log('Building DataBridge for production...');

  // 1. Install playwright-runner dependencies
  log('Installing playwright-runner dependencies...');
  exec('npm install', { cwd: PLAYWRIGHT_RUNNER });

  // 2. Build playwright-runner binary
  log('Building playwright-runner binary...');
  exec('npm run build', { cwd: PLAYWRIGHT_RUNNER });

  // Verify the build output exists
  const distDir = join(PLAYWRIGHT_RUNNER, 'dist');
  if (!existsSync(distDir)) {
    throw new Error('playwright-runner build failed - dist directory not found');
  }

  // 3. Build frontend
  log('Building frontend...');
  exec('npm run build');

  // 4. Build Tauri app
  log('Building Tauri app...');
  exec('npm run tauri build');

  log('Build complete! Check src-tauri/target/release/bundle for the output.');
}

build().catch(err => {
  console.error('\n❌ Build failed:', err.message);
  process.exit(1);
});
