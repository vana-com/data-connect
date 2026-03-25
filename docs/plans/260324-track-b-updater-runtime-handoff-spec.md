# 260324 handoff: Track B updater runtime implementation spec

Purpose:

- hand this feature to a colleague starting from `main`
- make implementation possible without reading this branch's commits
- remove ambiguity, dead ends, and accidental scope creep

## Independence rule

This spec is intended to be sufficient on its own.

The implementer should:

- branch from current `main`
- follow this document in order
- not use this feature branch's commits as implementation guidance

Historical commits may be used later for archaeology if something is genuinely unclear, but they are not part of the planned path.

## Feature goal

Ship the macOS in-app updater runtime on top of the already-proven release pipeline.

That means:

- release assets are already correct
- macOS updater tarballs and signatures are already published correctly
- asset naming is already clean enough
- what remains is app consumption of those release artifacts

## User-facing contract

### macOS

1. App launches normally.
2. After startup settles, app checks for an update in the background.
3. If no update exists, nothing is shown.
4. If an update exists, app downloads it silently.
5. Only after the update is fully staged, app shows one persistent toast:
   - title: `Restart to update`
   - description: `Version <version> is ready`
   - primary action: `Restart now`
   - secondary action: `Later`
6. `Restart now` installs the staged update and relaunches the app.
7. `Later` dismisses the toast for the current session only.
8. On next launch, the staged update should be offered again.
9. Any updater failure fails soft and keeps the app usable.

### non-macOS

- keep the current release-page fallback behavior unchanged

## Scope

In scope:

- publish `latest.json`
- add Tauri updater plugin/config/capability wiring
- add one app-side updater seam for macOS Tauri runtime
- refactor `useAppUpdate` to staged download plus restart toast
- preserve non-macOS fallback
- add focused tests

Out of scope:

- Windows/Linux in-app updater rollout
- toast redesign
- custom update backend
- changes to the proven post-finalization macOS release artifact path

## Locked decisions

These decisions are already made and should not be reopened during implementation:

1. `latest.json` is required.
2. `latest.json` must be published to `releases/latest/download/latest.json`.
3. `latest.json` must be generated after all matrix build artifacts are uploaded.
4. The app-side updater is macOS-only for this cut.
5. The app flow must use separate `check`, `download`, and `install/relaunch` steps.
6. Do not use a one-shot `downloadAndInstall()` flow.
7. Non-macOS stays on the existing release-page path.
8. Relaunch may stay in JS via `@tauri-apps/plugin-process`.
9. macOS-only updater/process permissions must not live in a capability file that is validated on Linux/Windows.
10. If the release workflow keeps Linux/Windows build legs, the shared/default capability must remain valid on those targets so the post-matrix `latest.json` job can run.
11. Release asset publication must have one authoritative upload path so default Tauri uploads do not create extra generic updater bundles alongside the canonical finalized artifacts.

## Files that should change

Expected code files:

- `package.json`
- `package-lock.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/src/lib.rs`
- `src-tauri/capabilities/default.json`
- `src-tauri/capabilities/updater-macos.json`
- `src-tauri/tauri.conf.json`
- `scripts/build-updater-manifest.mjs`
- `.github/workflows/release.yml`
- `src/hooks/app-update/tauri-updater.ts`
- `src/hooks/use-app-update.tsx`
- `src/pages/settings/components/settings-about.tsx`

Expected test files:

- `scripts/build-updater-manifest.test.mjs`
- `src/hooks/app-update/tauri-updater.test.ts`
- `src/hooks/use-app-update.test.tsx`
- existing fallback tests as needed

Files that should probably not change:

- release finalization scripts that already proved the macOS artifact path
- unrelated settings or toast primitives
- non-macOS updater behavior beyond preserving fallback

## Ordered implementation plan

### Step 1: implement `latest.json` generation

Add a script that consumes GitHub release asset metadata and local `.sig` file contents and emits a Tauri-compatible updater manifest.

Requirements:

- detect exactly one updater tarball per macOS target
- normalize legacy asset aliases before target matching:
  - `arm64` must be treated as `aarch64`
  - `x64` must be treated as `x86_64`
- fail if alias normalization makes multiple assets map to the same target
- detect exactly one matching `.sig` per tarball
- include both `darwin-aarch64` and `darwin-x86_64`
- use final public release asset URLs
- fail loudly if required assets are missing or ambiguous

Public contract:

- release assets should end up with clean canonical names using `aarch64` and `x86_64`
- manifest output keys must stay `darwin-aarch64` and `darwin-x86_64`

Output contract:

- `version`
- `notes`
- `pub_date`
- `platforms.darwin-aarch64.signature`
- `platforms.darwin-aarch64.url`
- `platforms.darwin-x86_64.signature`
- `platforms.darwin-x86_64.url`

Gate before moving on:

- unit test for manifest builder passes
- sample manifest clearly contains both macOS targets

### Step 2: publish `latest.json` in CI

Add one non-matrix workflow job after the matrix build completes.

Requirements:

- job depends on the existing build matrix
- if the matrix includes non-macOS targets, they must still succeed or be intentionally excluded, otherwise this job will be skipped
- release asset publication must stay single-path:
  - either let the Tauri action upload release assets
  - or run it in build-only mode and upload finalized artifacts explicitly
- for this cut, explicit upload of finalized artifacts is the canonical path
- job fetches the tagged release metadata
- job downloads the published `.sig` assets
- job runs the manifest builder once
- job uploads one `latest.json` asset to the tagged release

Do not:

- generate `latest.json` inside each macOS matrix job
- upload separate per-arch manifests
- mix default Tauri release uploads with the explicit finalized-artifact upload path

Gate before moving on:

- workflow definition is structurally correct
- manifest job clearly waits for all build jobs

### Step 3: wire the native updater engine

Add the required Tauri dependencies and config.

Requirements:

- JS dependency for updater plugin
- JS dependency for process plugin if relaunch stays in JS
- Rust dependency for updater plugin
- Rust dependency for process plugin if needed
- register plugins in Tauri app setup
- add updater/process permissions
- keep macOS-only updater/process permissions in a macOS-scoped capability file rather than the shared default capability
- configure updater public key
- configure updater endpoint to the stable `latest.json` URL

Gate before moving on:

- dependencies and config are in place
- lockfiles are updated

### Step 4: add a small runtime seam

Create a dedicated app-side wrapper for updater operations.

Requirements:

- all direct updater plugin calls live in this file
- expose small operations for `check`, `download`, `install`, and `relaunch`
- keep runtime detection close to the seam
- do not mix toast behavior into the seam

Gate before moving on:

- seam test covers success path and fail-soft behavior

### Step 5: refactor app orchestration

Update `useAppUpdate` to support two runtime lanes.

Lane A: macOS Tauri

- wait for startup settle delay
- current implementation decision: wait `5s` before the first background updater check
- current implementation decision: use a `6h` passive recheck interval after startup
- these timings are intentional for now and may be adjusted later if startup or update UX data suggests a better cadence
- background check
- silent download if update exists
- persistent restart toast only after staging completes
- `Restart now` installs and relaunches
- `Later` suppresses only for the current session

Lane B: non-macOS

- preserve existing release-page fallback

Requirements:

- no blocking modal
- no toast during download
- one staged-update toast only
- explicit runtime branch in hook logic

Gate before moving on:

- hook tests cover macOS path
- hook tests confirm non-macOS fallback is unchanged

### Step 6: update status surfaces

Ensure settings/about surfaces accurately reflect updater state where appropriate.

Requirements:

- staged-download states do not mislabel the updater flow
- restart-ready state is represented cleanly

Gate before finishing:

- UI remains coherent for idle, downloading, and restart-ready states

### Step 7: verify end to end

Run the scoped test suite and release proof.

Required checks:

- manifest builder tests
- updater seam tests
- app hook tests
- fallback tests
- `npm run typecheck`

Release proof:

This is a special proof flow, not the default production release flow.

- normal releases still follow [docs/release-process.md](/Users/cflack/Repos/vana-com/data-connect/docs/release-process.md) from `main`
- this proof may intentionally run from the implementation branch by passing `--target <branch>`

Suggested proof command shape:

```bash
npm run release:github -- --version <proof-version> --target <implementation-branch>
```

1. cut a tagged release from the implementation branch
2. verify both macOS updater tarballs are present
3. verify both `.sig` files are present
4. verify `latest.json` is present
5. verify `latest.json` includes both darwin targets
6. verify a real macOS app upgrades from an older release to the new release

## Error-prevention checklist

The implementer should explicitly check these before opening a PR:

- `latest.json` is built from release assets, not local guessed paths
- alias inputs like `arm64`/`x64` normalize to canonical targets without allowing duplicates
- both macOS targets are present in one manifest
- `.sig` contents are embedded into the manifest
- app does not install immediately after download
- app only offers restart once the update is fully staged
- `Later` is not persisted across launches
- non-macOS still uses the external release-page path
- failures only log and fail soft

## Suggested verification commands

```bash
npx vitest run \
  scripts/build-updater-manifest.test.mjs \
  src/hooks/app-update/tauri-updater.test.ts \
  src/hooks/use-app-update.test.tsx \
  src/hooks/app-update/check-app-update.test.ts
```

```bash
npm run typecheck
```

If Rust lockfiles need refreshing:

```bash
cd /Users/cflack/Repos/vana-com/data-connect/src-tauri
cargo generate-lockfile
```

For local native verification, bootstrap generated sidecar resources before assuming a cold native check is meaningful:

```bash
npm run prebuild:all
```

Then run the scoped JS/type checks first, and only after that proceed to any native validation you actually need.

## PR acceptance checklist

The PR is only done if all of the following are true:

- release workflow uploads `latest.json`
- release assets include the two signed macOS updater tarballs
- updater config points to `releases/latest/download/latest.json`
- macOS app silently stages updates
- app shows `Restart to update` only after staging completes
- `Restart now` installs and relaunches
- `Later` returns on next launch
- non-macOS fallback still works
- tests pass

## Handoff summary

If a colleague starts from `main` and follows this document in order, they should be able to implement the feature correctly without consulting this branch history.

That is the intended standard for this spec.
