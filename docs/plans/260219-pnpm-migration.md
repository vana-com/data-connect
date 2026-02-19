# 260219-pnpm-migration

## Objective

Switch this repo from npm to pnpm in one PR, with no behavior change, no follow-up fix cycle, and deterministic local + CI installs.

## Scope

- In scope: package manager/tooling migration only.
- Out of scope: product behavior changes, connector protocol changes, release process redesign.

## Preconditions

- Node version is `22` (matches `.nvmrc` and CI).
- Work from repo root.
- Use one command style in scripts/config: `pnpm run <script>` and `pnpm exec <bin>`.

## Implementation Checklist (execute in this exact order)

### 1) Create workspace + lockfile baseline

1. In root `package.json`, add:
   - `"packageManager": "pnpm@<PINNED_VERSION>"`
2. Create `pnpm-workspace.yaml` with:
   - `.`
   - `playwright-runner`
   - `personal-server`
3. Run `corepack enable`.
4. Run `pnpm install`.
5. Commit `pnpm-lock.yaml`.
6. Delete:
   - `package-lock.json`
   - `playwright-runner/package-lock.json`
   - `personal-server/package-lock.json`

### 2) Update root script wiring

Update `package.json`:

- Replace script-to-script chaining:
  - `npm run auth:build` -> `pnpm run auth:build`
  - `npm run prebuild:all` -> `pnpm run prebuild:all`
  - any remaining `npm run ...` in scripts -> `pnpm run ...`

Do not change script names or behavior.

### 3) Update Tauri build hooks

Update `src-tauri/tauri.conf.json`:

- `build.beforeDevCommand` -> `pnpm run auth:build && pnpm run dev`
- `build.beforeBuildCommand` -> `pnpm run build`

### 4) Update build orchestration scripts

#### `scripts/build-prod.js`

- `npm install` -> `pnpm install --frozen-lockfile`
- `npm run build` -> `pnpm run build`
- `npx tauri ...` -> `pnpm exec tauri ...`

#### `scripts/ensure-playwright-runner.js`

- `spawnSync("npm", ["install"])` -> `spawnSync("pnpm", ["install", "--frozen-lockfile"])`
- `spawnSync("npm", ["run", "build"])` -> `spawnSync("pnpm", ["run", "build"])`
- staleness input `package-lock.json` -> `pnpm-lock.yaml` (root lockfile path)

#### `scripts/ensure-personal-server.js`

- `spawnSync("npm", ["install"])` -> `spawnSync("pnpm", ["install", "--frozen-lockfile"])`
- `spawnSync("npm", ["run", "build"])` -> `spawnSync("pnpm", ["run", "build"])`
- staleness input `package-lock.json` -> `pnpm-lock.yaml` (root lockfile path)

### 5) Update sidecar build/runtime commands

#### `playwright-runner/scripts/build.js`

- `npx playwright install chromium` -> `pnpm exec playwright install chromium`
- `npx pkg ...` -> `pnpm exec pkg ...`
- warning/help text mentioning `npx ...` -> `pnpm exec ...`

#### `playwright-runner/index.cjs`

- runtime download command `npx playwright install chromium` -> `pnpm exec playwright install chromium`

#### `personal-server/scripts/build.js`

- `npx pkg ...` -> `pnpm exec pkg ...`
- `npx prebuild-install ...` -> `pnpm exec prebuild-install ...`
- Keep node_modules copy logic compatible with pnpm symlink layout (see Step 6).

### 6) Harden personal-server runtime deps copy

In `personal-server/scripts/build.js`, ensure copied runtime deps are physical files, not unresolved symlinks:

- For copied modules:
  - `better-sqlite3`
  - `bindings`
  - `file-uri-to-path`
- Copy operation must dereference symlinks when materializing `dist/node_modules`.
- Validate by checking copied module trees exist under `personal-server/dist/node_modules` and are readable without workspace context.

### 7) Update CI release workflow

Update `.github/workflows/release.yml`:

1. Node setup:
   - keep Node `22`
   - change cache mode from npm to pnpm
2. Add pnpm bootstrap before installs:
   - `corepack enable`
   - optionally pin via `corepack prepare pnpm@<PINNED_VERSION> --activate`
3. Replace all package manager commands:
   - `npm ci` -> `pnpm install --frozen-lockfile`
   - `npm run <script>` -> `pnpm run <script>`
   - `npx <bin>` -> `pnpm exec <bin>`
4. Keep release verification semantics unchanged:
   - version tag checks
   - matrix targets
   - artifact upload naming/paths

### 8) Update operational docs and runtime error text

Update:

- `README.md` (install/dev/build/release commands)
- `docs/260212-github-release-process.md` (release commands)
- user-facing dev guidance strings in:
  - `src-tauri/src/commands/server.rs`
  - `src-tauri/src/commands/connector.rs`

Do not mass-edit archived docs.

## Mandatory File Edit Contract

The implementer must touch all files below. If a file has no matching npm/npx string at execution time, record "verified no-op" in PR notes.

### Root + orchestration

- `package.json`
  - replace script chaining `npm run ...` with `pnpm run ...`
  - keep script names unchanged
- `src-tauri/tauri.conf.json`
  - `beforeDevCommand` and `beforeBuildCommand` to pnpm form
- `scripts/build-prod.js`
  - all `npm install` / `npm run` / `npx` calls migrated
- `scripts/ensure-playwright-runner.js`
  - `spawnSync("npm", ...)` migrated
  - stale-check lockfile input moved from sidecar `package-lock.json` to root `pnpm-lock.yaml`
- `scripts/ensure-personal-server.js`
  - `spawnSync("npm", ...)` migrated
  - stale-check lockfile input moved from sidecar `package-lock.json` to root `pnpm-lock.yaml`

### Sidecars

- `playwright-runner/scripts/build.js`
  - `npx playwright ...` and `npx pkg ...` migrated
- `playwright-runner/index.cjs`
  - runtime fallback `npx playwright install chromium` migrated
- `personal-server/scripts/build.js`
  - `npx pkg ...` and `npx prebuild-install ...` migrated
  - copy logic still materializes usable runtime deps under `dist/node_modules`

### CI + docs + runtime guidance strings

- `.github/workflows/release.yml`
  - setup-node cache mode `pnpm`
  - add corepack/pnpm bootstrap
  - all `npm ci` / `npm run` / `npx` replaced
- `README.md`
  - installation/dev/build/release commands migrated
- `docs/260212-github-release-process.md`
  - release command examples migrated
- `src-tauri/src/commands/server.rs`
  - npm install guidance text updated
- `src-tauri/src/commands/connector.rs`
  - npm install guidance text updated

## Non-Negotiable Verification Commands

Run these and paste output summary in PR notes.

1. Targeted executable-path scan (must be clean after migration):
   - `rg -n "\\bnpm\\b|\\bnpx\\b|package-lock\\.json" package.json src-tauri/tauri.conf.json scripts/ playwright-runner/ personal-server/ .github/workflows/release.yml README.md docs/260212-github-release-process.md src-tauri/src/commands/server.rs src-tauri/src/commands/connector.rs`
2. Lockfile/workspace state:
   - `rg -n "packageManager|pnpm@" package.json`
   - `rg -n "playwright-runner|personal-server" pnpm-workspace.yaml`
   - verify `pnpm-lock.yaml` exists
   - verify removed npm lockfiles are absent
3. Build + runtime gates:
   - local gates in this plan
   - sidecar gates in this plan
4. CI config sanity:
   - workflow contains `corepack enable` (or explicit pnpm setup)
   - workflow uses pnpm cache mode and pnpm commands for installs/build steps

## Evidence Capture Template (required in PR)

Use this exact template in the PR description.

### A) File contract evidence

| File | Change required | Status (`PASS`/`NO-OP`/`FAIL`) | Evidence |
|---|---|---|---|
| `package.json` | npm script chaining migrated |  | commit/diff reference |
| `src-tauri/tauri.conf.json` | pre-build hooks migrated |  | commit/diff reference |
| `scripts/build-prod.js` | npm/npx exec paths migrated |  | commit/diff reference |
| `scripts/ensure-playwright-runner.js` | spawn + stale-check migrated |  | commit/diff reference |
| `scripts/ensure-personal-server.js` | spawn + stale-check migrated |  | commit/diff reference |
| `playwright-runner/scripts/build.js` | npx -> pnpm exec |  | commit/diff reference |
| `playwright-runner/index.cjs` | runtime npx fallback migrated |  | commit/diff reference |
| `personal-server/scripts/build.js` | npx -> pnpm exec + runtime dep copy valid |  | commit/diff reference |
| `.github/workflows/release.yml` | corepack/cache/commands migrated |  | commit/diff reference |
| `README.md` | operational commands migrated |  | commit/diff reference |
| `docs/260212-github-release-process.md` | release examples migrated |  | commit/diff reference |
| `src-tauri/src/commands/server.rs` | npm guidance text migrated |  | commit/diff reference |
| `src-tauri/src/commands/connector.rs` | npm guidance text migrated |  | commit/diff reference |

Rules:
- `PASS` = file changed and required migration done.
- `NO-OP` = verified no matching legacy command in file at execution time.
- `FAIL` = required change missing or unclear.
- PR cannot merge if any row is `FAIL`.

### B) Command gate evidence

| Gate | Command | Expected result | Actual summary | Status |
|---|---|---|---|---|
| Legacy command scan | `rg -n "\\bnpm\\b|\\bnpx\\b|package-lock\\.json" package.json src-tauri/tauri.conf.json scripts/ playwright-runner/ personal-server/ .github/workflows/release.yml README.md docs/260212-github-release-process.md src-tauri/src/commands/server.rs src-tauri/src/commands/connector.rs` | No executable npm/npx paths remain in migrated targets |  |  |
| packageManager pin | `rg -n "packageManager|pnpm@" package.json` | pnpm packageManager present |  |  |
| workspace packages | `rg -n "playwright-runner|personal-server" pnpm-workspace.yaml` | both sidecars present |  |  |
| lockfile exists | check `pnpm-lock.yaml` | present |  |  |
| npm lockfiles removed | check 3 `package-lock.json` paths | absent |  |  |
| local install | `pnpm install --frozen-lockfile` | success exit code |  |  |
| lint | `pnpm run lint` | success exit code |  |  |
| tests | `pnpm run test` | success exit code |  |  |
| root build | `pnpm run build` | success exit code |  |  |
| tauri dev smoke | `pnpm run tauri:dev` | app boots + Settings loads + personal-server starts |  |  |
| sidecar build A | `pnpm --dir playwright-runner run build` | success exit code |  |  |
| sidecar build B | `pnpm --dir personal-server run build` | success exit code |  |  |
| runtime deps packaged | inspect `personal-server/dist/node_modules` | required deps present/readable |  |  |

Rules:
- Every row must be `PASS` before merge.
- Any flaky/intermittent result must be recorded as `FAIL` until reproduced as `PASS`.
- Include short output excerpts for failed gates and the fix commit that resolved them.

### C) Release/CI evidence

| Gate | Evidence required | Status |
|---|---|---|
| CI uses pnpm | workflow diff shows corepack/pnpm + pnpm cache + pnpm commands |  |
| matrix preserved | CI run includes same target matrix as baseline |  |
| artifact contract preserved | artifact names/locations unchanged from baseline |  |

### D) Fresh-clone evidence

| Gate | Steps | Status |
|---|---|---|
| pnpm-only bootstrap | clean clone -> documented pnpm setup -> dev start succeeds |  |
| no ad-hoc npm fallback | no npm/npx commands required during bootstrap |  |

## Exact Validation Gates (all must pass)

### Local

- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm run lint`
- [ ] `pnpm run test`
- [ ] `pnpm run build`
- [ ] `pnpm run tauri:dev`
- [ ] Settings page loads and personal-server starts without restart loop

### Sidecars

- [ ] `pnpm --dir playwright-runner run build`
- [ ] `pnpm --dir personal-server run build`
- [ ] `personal-server/dist/node_modules` contains usable runtime deps
- [ ] No broken symlink dependency path in packaged runtime folders

### Release path

- [ ] Release workflow runs with pnpm and completes matrix build
- [ ] macOS/Linux/Windows artifacts produced with same naming/locations as before

### Fresh clone

- [ ] On clean clone: only documented pnpm commands are needed to start dev successfully

## Done Criteria

Migration is done only when:

1. Mandatory File Edit Contract is completed (or explicit verified no-op recorded per file).
2. Targeted executable-path scan is clean for migrated files.
3. No `npm` or `npx` remains in executable paths (scripts, workflow, tauri hooks, sidecar runtime/build paths, active docs, runtime dev error strings).
4. All validation gates pass in one branch without ad-hoc fixes.
5. PR is scoped to package manager migration only.
