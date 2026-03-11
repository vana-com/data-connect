#!/usr/bin/env node

/**
 * Production build script for DataConnect
 *
 * This script:
 * 1. Builds the playwright-runner into a standalone binary
 * 2. Builds the personal-server into a standalone binary
 * 3. Builds the Tauri .app bundle
 * 4. Re-signs the completed .app so macOS seals bundled resources
 * 5. Creates the DMG from the complete .app
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { platform, arch } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PLAYWRIGHT_RUNNER = join(ROOT, 'playwright-runner');
const PERSONAL_SERVER = join(ROOT, 'personal-server');
const PLAT = platform();

function log(msg) {
  console.log(`\n🔨 ${msg}`);
}

function exec(cmd, opts = {}) {
  console.log(`   $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });
}

/** Read the version from tauri.conf.json */
function getVersion() {
  const conf = JSON.parse(readFileSync(join(ROOT, 'src-tauri', 'tauri.conf.json'), 'utf8'));
  return conf.version;
}

/** Find the .app bundle in the macos bundle directory */
function findAppBundle() {
  const macosBundle = join(ROOT, 'src-tauri', 'target', 'release', 'bundle', 'macos');
  if (!existsSync(macosBundle)) return null;
  for (const entry of readdirSync(macosBundle)) {
    if (entry.endsWith('.app')) {
      return join(macosBundle, entry);
    }
  }
  return null;
}

function finalizeAppBundle(appPath) {
  log(`Finalizing app signature for ${appPath}...`);
  exec(`codesign --force --sign - "${appPath}"`);
}

async function build() {
  log('Building DataConnect for production...');

  // 1. Install playwright-runner dependencies
  log('Installing playwright-runner dependencies...');
  exec('npm install', { cwd: PLAYWRIGHT_RUNNER });

  // 2. Build playwright-runner binary
  log('Building playwright-runner binary...');
  exec('npm run build', { cwd: PLAYWRIGHT_RUNNER });

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

  const personalServerDist = join(PERSONAL_SERVER, 'dist');
  if (!existsSync(personalServerDist)) {
    throw new Error('personal-server build failed - dist directory not found');
  }

  // 5. Build frontend
  log('Building frontend...');
  exec('npm run build');

  // 6. Build the .app bundle only (no DMG).
  log('Building Tauri .app bundle...');
  exec('CI=true npm run tauri -- build --bundles app');

  // 7. Re-sign the completed .app so the bundled resources are sealed.
  const appPath = findAppBundle();
  if (!appPath) {
    throw new Error('.app bundle not found after build');
  }
  finalizeAppBundle(appPath);

  // 8. Create DMG from the complete .app.
  if (PLAT === 'darwin') {
    const version = getVersion();
    const archName = arch() === 'arm64' ? 'aarch64' : 'x64';
    const dmgName = `DataConnect_${version}_${archName}.dmg`;
    const dmgDir = join(ROOT, 'src-tauri', 'target', 'release', 'bundle', 'dmg');
    const dmgPath = join(dmgDir, dmgName);

    mkdirSync(dmgDir, { recursive: true });

    log(`Creating DMG: ${dmgName}...`);
    const stagingDir = join(dmgDir, '_staging');
    execSync(`rm -rf "${stagingDir}" "${dmgPath}"`);
    mkdirSync(stagingDir, { recursive: true });

    // Copy .app and create Applications symlink for drag-to-install
    execSync(`cp -R "${appPath}" "${stagingDir}/"`);
    execSync(`ln -s /Applications "${stagingDir}/Applications"`);

    // Create compressed DMG
    execSync(
      `hdiutil create -volname "DataConnect" -srcfolder "${stagingDir}" -ov -format UDZO "${dmgPath}"`,
      { stdio: 'inherit' },
    );

    execSync(`rm -rf "${stagingDir}"`);
    log(`DMG created: ${dmgPath}`);
  }

  log('Build complete! Check src-tauri/target/release/bundle for the output.');
}

build().catch(err => {
  console.error('\n❌ Build failed:', err.message);
  process.exit(1);
});
