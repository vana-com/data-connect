#!/usr/bin/env node

/**
 * Production build script for DataBridge
 *
 * This script:
 * 1. Builds the playwright-runner into a standalone binary
 * 2. Builds the Tauri app (connectors fetched via postinstall)
 */

import { execSync } from 'child_process';
import { existsSync, cpSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { platform } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PLAYWRIGHT_RUNNER = join(ROOT, 'playwright-runner');
const PERSONAL_SERVER = join(ROOT, 'personal-server');

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

  // 3. Install personal-server dependencies
  log('Installing personal-server dependencies...');
  exec('npm install', { cwd: PERSONAL_SERVER });

  // 4. Build personal-server binary
  log('Building personal-server binary...');
  exec('npm run build', { cwd: PERSONAL_SERVER });

  // Verify the build output exists
  const personalServerDist = join(PERSONAL_SERVER, 'dist');
  if (!existsSync(personalServerDist)) {
    throw new Error('personal-server build failed - dist directory not found');
  }

  // 5. Move personal-server native addons out of dist/ temporarily.
  // Tauri's resource glob can't handle directories, so we move node_modules/
  // out before the build and copy it into the bundle after.
  const psDistNodeModules = join(PERSONAL_SERVER, 'dist', 'node_modules');
  const psTempNodeModules = join(PERSONAL_SERVER, '_node_modules_tmp');
  if (existsSync(psDistNodeModules)) {
    log('Temporarily moving personal-server native addons out of dist/...');
    cpSync(psDistNodeModules, psTempNodeModules, { recursive: true });
    execSync(`rm -rf "${psDistNodeModules}"`);
  }

  // 6. Build frontend
  log('Building frontend...');
  exec('npm run build');

  // 7. Build Tauri app
  log('Building Tauri app...');
  try {
    exec('npm run tauri build');
  } finally {
    // 8. Always restore node_modules in dist/ even if build fails
    if (existsSync(psTempNodeModules)) {
      cpSync(psTempNodeModules, psDistNodeModules, { recursive: true });
      execSync(`rm -rf "${psTempNodeModules}"`);
    }
  }

  // 7. Copy personal-server native addons into the app bundle.
  // Tauri's resource glob flattens subdirectories, so we copy node_modules/
  // into the bundle manually after the build.
  log('Copying personal-server native addons into bundle...');
  const PLATFORM = platform();
  const bundleBase = join(ROOT, 'src-tauri', 'target', 'release', 'bundle');
  let resourceDirs = [];

  if (PLATFORM === 'darwin') {
    // Find the .app bundle(s)
    const macosBundle = join(bundleBase, 'macos');
    if (existsSync(macosBundle)) {
      for (const entry of readdirSync(macosBundle)) {
        if (entry.endsWith('.app')) {
          resourceDirs.push(join(macosBundle, entry, 'Contents', 'Resources'));
        }
      }
    }
  } else if (PLATFORM === 'win32') {
    resourceDirs.push(join(bundleBase, 'nsis'));
  } else {
    resourceDirs.push(join(bundleBase, 'appimage'));
  }

  const srcNodeModules = join(PERSONAL_SERVER, 'dist', 'node_modules');
  for (const resDir of resourceDirs) {
    const destNodeModules = join(resDir, 'personal-server', 'dist', 'node_modules');
    if (existsSync(srcNodeModules) && existsSync(resDir)) {
      log(`  Copying to ${destNodeModules}`);
      cpSync(srcNodeModules, destNodeModules, { recursive: true });
    }
  }

  log('Build complete! Check src-tauri/target/release/bundle for the output.');
}

build().catch(err => {
  console.error('\n❌ Build failed:', err.message);
  process.exit(1);
});
