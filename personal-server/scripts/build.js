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
  const nodeVersion = 'node22';
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
  // Also provide import.meta.url shim for ESM code bundled to CJS
  // Must redirect better-sqlite3, bindings, and file-uri-to-path to external node_modules
  const nativeModulesList = ['better-sqlite3', 'bindings', 'file-uri-to-path'];
  const nativeBanner = [
    'var _M=require("module"),_P=require("path"),_U=require("url"),_R=_M._resolveFilename;',
    // Shim for import.meta.url
    'if(typeof globalThis.__importMetaUrl==="undefined"){globalThis.__importMetaUrl=_U.pathToFileURL(__filename).href;}',
    // Patch require resolution for native modules
    // _resolveFilename(request, parent, isMain, options) - paths goes in options (4th param)
    `var _NM=${JSON.stringify(nativeModulesList)};`,
    '_M._resolveFilename=function(r,p,m,o){',
    'if(_NM.includes(r)){var _np=_P.join(_P.dirname(process.execPath),"node_modules");',
    'try{return _R.call(this,r,p,m,Object.assign({},o||{},{paths:[_np]}));}catch(e){}}',
    'return _R.call(this,r,p,m,o);};',
  ].join('');

  // Create shim file for import.meta.url injection
  const shimPath = join(DIST, '_shim.js');
  writeFileSync(shimPath, `
    const { pathToFileURL } = require('url');
    globalThis.__importMetaUrl = pathToFileURL(__filename).href;
  `);

  // Use esbuild JavaScript API for reliable banner injection
  const esbuild = await import('esbuild');

  // Plugin to make native module requires invisible to pkg's static analysis.
  // pkg bundles any require() it finds statically. By using eval('require'),
  // we hide these from pkg so they're loaded from the real filesystem at runtime.
  const dynamicNativeRequirePlugin = {
    name: 'dynamic-native-require',
    setup(build) {
      // For each native module, intercept the require and replace with dynamic require
      for (const mod of nativeModulesList) {
        build.onResolve({ filter: new RegExp(`^${mod}$`) }, args => ({
          path: mod,
          namespace: 'dynamic-native',
        }));
      }
      build.onLoad({ filter: /.*/, namespace: 'dynamic-native' }, args => ({
        // eval('require') hides the require from pkg's static analysis
        contents: `module.exports = eval('require')(${JSON.stringify(args.path)});`,
        loader: 'js',
      }));
    }
  };

  await esbuild.build({
    entryPoints: [join(ROOT, 'index.js')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: bundlePath,
    plugins: [dynamicNativeRequirePlugin],
    banner: { js: nativeBanner },
    inject: [shimPath],
    define: {
      'import.meta.url': 'globalThis.__importMetaUrl',
    },
  });

  // Clean up shim file
  rmSync(shimPath, { force: true });

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
