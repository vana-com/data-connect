/**
 * Build script for personal-server
 *
 * 1. Uses esbuild to bundle all dependencies into a single CJS file
 * 2. Uses @yao-pkg/pkg to create a standalone binary with Node.js
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync, readdirSync, statSync, lstatSync, readlinkSync, cpSync, writeFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { platform, arch } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');

const PLATFORM = platform();
const ARCH = arch();

function log(msg) {
  console.log(`[build] ${msg}`);
}

function exec(cmd, opts = {}) {
  log(`Running: ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });
}

function getPkgTarget() {
  const nodeVersion = 'node20';
  if (PLATFORM === 'darwin') {
    return ARCH === 'arm64'
      ? `${nodeVersion}-macos-arm64`
      : `${nodeVersion}-macos-x64`;
  } else if (PLATFORM === 'win32') {
    return `${nodeVersion}-win-x64`;
  }
  return `${nodeVersion}-linux-x64`;
}

function getOutputName() {
  const base = 'personal-server';
  return PLATFORM === 'win32' ? `${base}.exe` : base;
}

/**
 * Replace symlinks in node_modules with actual copies.
 * Required so esbuild and pkg can resolve file: dependencies.
 * Note: With npm packages from registry, symlinks are less common,
 * but we keep this for any linked local development.
 */
function dereferenceSymlinks() {
  const nodeModules = join(ROOT, 'node_modules');

  // Check scoped entries (e.g. @opendatalabs/*)
  const scopes = ['@opendatalabs'];
  for (const scope of scopes) {
    const scopeDir = join(nodeModules, scope);
    if (!existsSync(scopeDir)) continue;

    for (const entry of readdirSync(scopeDir)) {
      const entryPath = join(scopeDir, entry);
      if (existsSync(entryPath) && lstatSync(entryPath).isSymbolicLink()) {
        const realPath = resolve(dirname(entryPath), readlinkSync(entryPath));
        log(`Dereferencing symlink: ${entry} -> ${realPath}`);
        rmSync(entryPath, { recursive: true });
        cpSync(realPath, entryPath, { recursive: true });
      }
    }
  }
}

async function build() {
  log('Starting personal-server build...');

  if (existsSync(DIST)) {
    rmSync(DIST, { recursive: true });
  }
  mkdirSync(DIST, { recursive: true });

  // Dereference symlinks so esbuild can resolve all imports
  dereferenceSymlinks();

  // Step 1: Bundle with esbuild into a single CJS file
  const bundlePath = join(DIST, 'bundle.cjs');
  log('Bundling with esbuild...');
  // Patch require resolution so native addons load from beside the executable
  const nativeBanner = [
    'var _M=require("module"),_P=require("path"),_R=_M._resolveFilename;',
    '_M._resolveFilename=function(r,p,m,o){',
    'if(r==="better-sqlite3"){try{return _R.call(this,r,Object.assign({},p,',
    '{paths:[_P.join(_P.dirname(process.execPath),"node_modules")]}),m,o);}catch(e){}}',
    'return _R.call(this,r,p,m,o);};',
  ].join('');
  // Write banner to file to avoid shell quoting issues on Windows
  const bannerPath = join(DIST, '_banner.js');
  writeFileSync(bannerPath, nativeBanner);
  exec(`npx esbuild index.js --bundle --platform=node --format=cjs --outfile="${bundlePath}" --external:better-sqlite3 --banner:js=file:${bannerPath}`);
  rmSync(bannerPath, { force: true });

  // Step 2: Package with pkg
  const target = getPkgTarget();
  const outputName = getOutputName();
  const outputPath = join(DIST, outputName);

  log(`Building binary for target: ${target}`);
  exec(`npx pkg "${bundlePath}" -t ${target} -o "${outputPath}" --no-bytecode --public-packages '*' --public --options no-warnings`);

  // Clean up intermediate bundle
  rmSync(bundlePath, { force: true });

  // Copy better-sqlite3 and its runtime dependencies alongside the binary.
  // pkg cannot bundle native addons; they must be on the real filesystem.
  const nativeModules = ['better-sqlite3', 'bindings', 'file-uri-to-path'];
  for (const mod of nativeModules) {
    const src = join(ROOT, 'node_modules', mod);
    if (existsSync(src)) {
      const dest = join(DIST, 'node_modules', mod);
      log(`Copying ${mod}...`);
      cpSync(src, dest, { recursive: true });
    } else {
      log(`WARNING: ${mod} not found in node_modules`);
    }
  }

  log('Build complete!');
  log(`Output: ${DIST}`);

  const files = readdirSync(DIST);
  log('Contents:');
  for (const file of files) {
    const stat = statSync(join(DIST, file));
    const size = stat.isDirectory()
      ? 'dir'
      : `${(stat.size / 1024 / 1024).toFixed(1)}MB`;
    log(`  ${file} (${size})`);
  }
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
