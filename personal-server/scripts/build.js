/**
 * Build script for personal-server
 *
 * 1. Uses esbuild to bundle all dependencies into a single CJS file
 * 2. Uses @yao-pkg/pkg to create a standalone binary with Node.js
 */

import { execSync, spawnSync } from 'child_process';
import { existsSync, mkdirSync, rmSync, readdirSync, statSync, lstatSync, readlinkSync, cpSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname, resolve, relative } from 'path';
import { fileURLToPath } from 'url';
import { platform, arch } from 'os';
import { createRequire } from 'module';

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

function collectJsFiles(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const entryPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectJsFiles(entryPath, files);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(entryPath);
    }
  }
  return files;
}

function toImportPath(fromFile, toFile) {
  const rel = relative(dirname(fromFile), toFile).replace(/\\/g, '/');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

function resolveWorkspaceSpecifier(specifier, packageJsonCache) {
  const workspacePackages = [
    '@opendatalabs/personal-server-ts-core',
    '@opendatalabs/personal-server-ts-mcp',
  ];
  const packageName = workspacePackages.find(
    candidate => specifier === candidate || specifier.startsWith(`${candidate}/`)
  );
  if (!packageName) return null;

  const packageRoot = join(DIST, 'node_modules', ...packageName.split('/'));
  const packageJsonPath = join(packageRoot, 'package.json');
  const packageJson =
    packageJsonCache.get(packageJsonPath) ??
    JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  packageJsonCache.set(packageJsonPath, packageJson);

  const exportKey =
    specifier === packageName ? '.' : `./${specifier.slice(packageName.length + 1)}`;
  const exportEntry = packageJson.exports?.[exportKey];
  const importTarget =
    typeof exportEntry === 'string'
      ? exportEntry
      : exportEntry?.import ?? exportEntry?.default ?? null;

  if (!importTarget) {
    throw new Error(`Missing export mapping for ${specifier} in ${packageJsonPath}`);
  }

  return join(packageRoot, importTarget);
}

function resolveCopiedImportSpecifier(specifier, fromFile, packageJsonCache) {
  if (
    !specifier ||
    specifier.startsWith('.') ||
    specifier.startsWith('/') ||
    specifier.startsWith('node:')
  ) {
    return null;
  }

  if (
    specifier === '@opendatalabs/personal-server-ts-core' ||
    specifier.startsWith('@opendatalabs/personal-server-ts-core/') ||
    specifier === '@opendatalabs/personal-server-ts-mcp' ||
    specifier.startsWith('@opendatalabs/personal-server-ts-mcp/')
  ) {
    return resolveWorkspaceSpecifier(specifier, packageJsonCache);
  }

  const requireFromFile = createRequire(fromFile);
  return requireFromFile.resolve(specifier);
}

function rewriteCopiedPackageImports() {
  const packageJsonCache = new Map();
  const jsFiles = [
    ...collectJsFiles(
      join(DIST, 'node_modules', '@opendatalabs', 'personal-server-ts-core', 'dist')
    ),
    ...collectJsFiles(
      join(DIST, 'node_modules', '@opendatalabs', 'personal-server-ts-server', 'dist')
    ),
    ...collectJsFiles(
      join(DIST, 'node_modules', '@opendatalabs', 'personal-server-ts-mcp', 'dist')
    ),
  ];

  for (const file of jsFiles) {
    const original = readFileSync(file, 'utf8');
    const rewritten = original
      .split('\n')
      .map(line => {
        const trimmed = line.trimStart();
        if (
          !(trimmed.startsWith('import ') || trimmed.startsWith('export ')) ||
          !trimmed.includes(' from ')
        ) {
          return line;
        }

        return line.replace(/from\s+(["'])([^"'`]+)\1/, (match, quote, specifier) => {
          const target = resolveCopiedImportSpecifier(specifier, file, packageJsonCache);
          if (!target) {
            return match;
          }
          const importPath = toImportPath(file, target);
          return match.replace(specifier, importPath);
        });
      })
      .join('\n');

    if (rewritten !== original) {
      writeFileSync(file, rewritten);
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
  const runtimeExternalModules = [
    '@opendatalabs/personal-server-ts-core/config',
    '@opendatalabs/personal-server-ts-server',
    '@opendatalabs/personal-server-ts-mcp',
    '@hono/node-server',
    'hono',
  ];
  const nativeBanner = [
    'var _M=require("module"),_P=require("path"),_U=require("url"),_R=_M._resolveFilename;',
    // Shim for import.meta.url
    'if(typeof globalThis.__importMetaUrl==="undefined"){globalThis.__importMetaUrl=_U.pathToFileURL(__filename).href;}',
    // Patch require resolution for native modules.
    // pkg runs the bundle from a snapshot path, so native addons must be
    // resolved from dist/node_modules beside the executable.
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

  // Plugin to inline require("../package.json") calls from @opendatalabs
  // packages at build time, so the runtime never needs to resolve that path
  // inside the pkg snapshot. Applies to all @opendatalabs packages (not just
  // personal-server-ts-server) to prevent MODULE_NOT_FOUND errors.
  const inlinePackageJsonPlugin = {
    name: 'inline-package-json',
    setup(build) {
      build.onLoad(
        { filter: /node_modules[\\/]@opendatalabs[\\/][^\\/]+[\\/]dist[\\/].*\.js$/ },
        async (args) => {
          const { readFileSync } = await import('fs');
          const { join, dirname } = await import('path');
          let contents = readFileSync(args.path, 'utf8');
          if (contents.includes('require("../package.json")')) {
            const pkgJsonPath = join(dirname(args.path), '..', 'package.json');
            const pkgJson = readFileSync(pkgJsonPath, 'utf8');
            contents = contents.replace(
              /require\("\.\.\/package\.json"\)/g,
              `(${pkgJson.trim()})`
            );
          }
          return { contents, loader: 'js' };
        }
      );
    }
  };

  await esbuild.build({
    entryPoints: [join(ROOT, 'index.js')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: bundlePath,
    external: runtimeExternalModules,
    plugins: [inlinePackageJsonPlugin, dynamicNativeRequirePlugin],
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

  // Copy the full production dependency tree beside the binary.
  // The pkg snapshot cannot host native addons, and the external runtime
  // packages we intentionally leave on disk need their transitive deps too.
  const productionTree = spawnSync('npm', ['ls', '--omit=dev', '--all', '--parseable'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (productionTree.status !== 0) {
    throw new Error(`Failed to list production dependencies: ${productionTree.stderr || productionTree.stdout}`);
  }
  const dependencyPaths = productionTree.stdout
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => line !== ROOT)
    .filter(line => line.startsWith(join(ROOT, 'node_modules')));

  for (const src of dependencyPaths) {
    const relative = src.slice(ROOT.length + 1);
    const dest = join(DIST, relative);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest, { recursive: true, force: true });
  }

  rewriteCopiedPackageImports();

  // Re-download the better-sqlite3 prebuilt binary for the pkg target Node version.
  // The local npm install compiles for the host Node.js, which may differ from the
  // Node.js version embedded in the pkg binary (e.g. local Node 20 vs pkg Node 22).
  const pkgNodeMajor = target.match(/node(\d+)/)?.[1];
  if (pkgNodeMajor) {
    const bsqlDist = join(DIST, 'node_modules', 'better-sqlite3');
    if (existsSync(bsqlDist)) {
      log(`Downloading better-sqlite3 prebuilt for Node ${pkgNodeMajor}...`);
      try {
        exec(`npx prebuild-install -r node -t ${pkgNodeMajor}.0.0 --platform ${PLATFORM} --arch ${ARCH}`, { cwd: bsqlDist });
      } catch (e) {
        log(`WARNING: prebuild-install failed, falling back to local build: ${e.message}`);
      }
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
