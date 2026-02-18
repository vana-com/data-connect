# 260219-pnpm-migration

## Goal

Migrate DataConnect from npm to pnpm as the primary package manager with zero behavior regressions in local dev, Settings page runtime, and release packaging.

## Constraints

- Keep app behavior unchanged; this is a tooling migration, not a product refactor.
- Do not break sidecar packaging for `playwright-runner` and `personal-server`.
- Preserve current Node engine constraints (`>=20 <24`) and current release flow semantics.
- Support fresh-clone onboarding with deterministic install behavior.
- Existing npm warning (`Unknown project config "link-workspace-packages"`) appears environment-specific and should not be relied on as repo state.

## Existing patterns

- Root app + two sidecar Node packages:
  - `package.json`
  - `playwright-runner/package.json`
  - `personal-server/package.json`
- npm is hardcoded in scripts/config:
  - `scripts/build-prod.js`
  - `scripts/ensure-playwright-runner.js`
  - `scripts/ensure-personal-server.js`
  - `src-tauri/tauri.conf.json`
  - `.github/workflows/release.yml`
- Sidecar build relies on copied runtime deps (native modules) in:
  - `personal-server/scripts/build.js`

## Proposed approach

### 1) Introduce pnpm workspace as source of truth

- Add root `packageManager` field:
  - `"packageManager": "pnpm@<pinned-version>"`
- Add `pnpm-workspace.yaml` including:
  - `.`
  - `playwright-runner`
  - `personal-server`
- Generate and commit `pnpm-lock.yaml`.
- Remove npm lockfiles:
  - `package-lock.json`
  - `playwright-runner/package-lock.json`
  - `personal-server/package-lock.json`

### 2) Convert command wiring from npm to pnpm

- Root `package.json` scripts:
  - Replace `npm run ...` chaining with `pnpm ...` equivalents.
- `src-tauri/tauri.conf.json`:
  - `beforeDevCommand`: `pnpm auth:build && pnpm dev`
  - `beforeBuildCommand`: `pnpm build`
- `scripts/build-prod.js`:
  - Replace `npm install`/`npm run build` with pnpm commands.
  - Replace `npx tauri ...` with `pnpm tauri ...` (or `pnpm exec tauri ...`).
- `scripts/ensure-playwright-runner.js` and `scripts/ensure-personal-server.js`:
  - Replace `spawnSync("npm", ...)` with `spawnSync("pnpm", ...)`.
  - Update stale-check lockfile references from `package-lock.json` to `pnpm-lock.yaml` (root/sidecar-aware).

### 3) Harden sidecar build against pnpm symlink layout

- In `personal-server/scripts/build.js`, ensure copied runtime modules are dereferenced to physical files when placed in `dist/node_modules`.
- Keep native module loading behavior unchanged (`better-sqlite3`, `bindings`, `file-uri-to-path`).
- Verify `playwright-runner` packaging remains compatible with pnpm-installed dependencies.

### 4) Update CI/release workflow to pnpm

- `.github/workflows/release.yml`:
  - Switch Node cache from npm to pnpm.
  - Install pnpm explicitly (setup action or corepack).
  - Replace `npm ci` / `npm run ...` / `npx ...` usage with pnpm equivalents.
- Ensure matrix builds still produce and upload the same artifact set.

### 5) Update developer docs

- `README.md`:
  - Replace install/run/build commands with pnpm equivalents.
- Any active operational docs referencing npm commands for local setup/release should be updated where they are treated as source-of-truth instructions.
- Historical/archive docs can remain unchanged unless they are still used operationally.

## Edge cases

- **Settings page inaccessible after migration**
  - Likely caused by `personal-server` subprocess/runtime dependency resolution failure under pnpm symlinks.
  - Mitigation: dereference copied runtime deps and verify personal-server starts in Tauri runtime.
- **Lockfile drift across three package roots**
  - Mitigation: single workspace lockfile + remove per-package npm lockfiles.
- **Script invocation differences (`pnpm <script>` vs `pnpm run <script>`)**
  - Mitigation: use one style consistently across config and scripts.
- **CI cache/install mismatch**
  - Mitigation: align setup-node cache + pnpm installation strategy in workflow.
- **Developer local npm config noise (warning)**
  - Mitigation: migration should not depend on clearing local npm config; repo should be pnpm-native post-change.

## Validation checklist

### Local

- [ ] `pnpm install`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm tauri:dev` launches app and Settings page loads
- [ ] Settings page actions that rely on personal server still work (server status visible, no startup error loop)

### Sidecars

- [ ] `pnpm --dir playwright-runner build`
- [ ] `pnpm --dir personal-server build`
- [ ] `personal-server/dist/node_modules` contains usable runtime deps after build

### Release path

- [ ] CI workflow installs with pnpm and completes matrix build
- [ ] macOS/Linux/Windows artifacts are produced with unchanged naming/locations

## Out of scope

- Refactoring unrelated runtime code in settings/auth/connect flow.
- Changing connector protocol behavior.
- Reworking release strategy beyond package-manager migration.
