# 260324 plan: Track B updater runtime canonical rebuild

Purpose:

- define the clean, canonical way to rebuild the macOS in-app updater from `main`
- use the branch and commits as evidence only, not as the implementation shape
- replace the jagged discovery path with one ordered, test-gated execution path

Primary handoff doc for a fresh implementer:

- `docs/plans/260324-track-b-updater-runtime-handoff-spec.md`

## What this plan is

This is a clean-room rebuild plan for the updater runtime cut.

It assumes:

- the release-side publication path is already proven
- the correct product goal is already known
- we want one smooth implementation path that avoids prior dead ends

This plan does not try to preserve the historical order we discovered things in.
It only preserves the final contract.

## Final product contract

### Release side

- release assets stay human-clean
- finalized macOS updater tarballs and signatures are published correctly
- one machine-readable `latest.json` is published after all matrix assets are available

### App side

On macOS:

1. app starts with no blocking update UI
2. after startup settles, app checks for an update in the background
3. if no update exists, nothing is shown
4. if an update exists, app downloads it silently
5. once the update is fully staged, show one persistent toast:
   - title: `Restart to update`
   - description: `Version <version> is ready`
   - primary action: `Restart now`
   - secondary action: `Later`
6. `Restart now` installs and relaunches
7. `Later` is session-only and must not suppress the staged update on next launch
8. updater failures fail soft and never block normal app use

On non-macOS:

- keep the existing release-page fallback flow

## Non-goals

- no Windows/Linux in-app updater rollout
- no redesign of the toast system
- no custom update backend
- no change to the proven post-finalization macOS artifact pipeline
- no attempt to reproduce the exact historical diff shape

## Hard rules

1. `latest.json` must be built from final published release assets, not guessed from local build outputs.
2. `latest.json` must be created in one follow-up non-matrix job so both macOS targets appear in the same file.
3. macOS app flow must use separate `check`, `download`, and `install/relaunch` stages.
4. Do not use `downloadAndInstall()` for this UX.
5. Non-macOS must keep the existing external release-page fallback.
6. All updater errors must fail soft.
7. The public updater endpoint must stay stable: `releases/latest/download/latest.json`.

## Known bad paths to avoid

- generating `latest.json` inside each macOS matrix job
- publishing pre-finalization updater tarballs
- letting raw Tauri-generated updater artifact naming leak to the public release surface
- collapsing staged download and install into one action
- persisting `Later` across launches for a staged macOS update
- mixing updater-plugin calls directly into `useAppUpdate`

## Clean implementation order

### Phase 1: freeze the contract first

Before touching code, confirm these are fixed inputs:

- updater manifest URL
- updater public key source
- exact toast copy
- macOS-only runtime rollout boundary
- non-macOS fallback behavior

If any of those are still moving, stop and settle them first.

### Phase 2: implement updater metadata publication

Create the manifest builder first.

Required outcome:

- one script builds `latest.json` from GitHub release asset metadata plus inline `.sig` contents

Required files:

- `scripts/build-updater-manifest.mjs`
- `.github/workflows/release.yml`

Success criteria:

- script rejects missing or ambiguous macOS updater assets
- manifest contains both `darwin-aarch64` and `darwin-x86_64`
- manifest job runs only after all matrix build jobs succeed
- manifest uploads to the same tagged release

### Phase 3: wire the native updater engine

Add the native plumbing without touching the app UX yet.

Required files:

- `package.json`
- `package-lock.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/src/lib.rs`
- `src-tauri/capabilities/default.json`
- `src-tauri/tauri.conf.json`

Success criteria:

- updater plugin is installed and registered
- process plugin is installed and registered if relaunch stays in JS
- capabilities include updater and process permissions
- `tauri.conf.json` points to the stable `latest.json` endpoint
- updater public key is configured

### Phase 4: isolate the runtime seam

Add one app-layer wrapper around the Tauri updater APIs.

Required file:

- `src/hooks/app-update/tauri-updater.ts`

The seam owns:

- runtime detection for macOS Tauri path
- `check`
- `download`
- `install`
- `relaunch`

The seam must not own:

- toast orchestration
- dismissal persistence policy
- product copy

Success criteria:

- `useAppUpdate` can treat the seam as a small stateful service
- all direct plugin imports stay out of product hook code

### Phase 5: refactor app orchestration

Move `useAppUpdate` to the final two-lane model.

Required files:

- `src/hooks/use-app-update.tsx`
- `src/hooks/app-update/check-app-update.ts`
- `src/pages/settings/components/settings-about.tsx`

Lane A: macOS Tauri

- wait for startup settle delay
- check for update
- download silently if update exists
- show persistent restart toast only after staging completes
- install and relaunch on `Restart now`
- dismiss for session only on `Later`

Lane B: non-macOS

- keep current external release-page flow

Success criteria:

- there is one explicit runtime branch
- staged update state is visible in the app hook status
- no release-page redirect happens on macOS Tauri when staged update path is available

### Phase 6: prove with focused tests

Tests are part of the implementation, not a cleanup step.

Required tests:

- manifest builder test
- seam test for `check -> download -> install/relaunch`
- hook tests for macOS staged-update UX
- hook tests for non-macOS fallback
- failure-path tests that confirm fail-soft behavior

Primary test targets:

- `scripts/build-updater-manifest.test.mjs`
- `src/hooks/app-update/tauri-updater.test.ts`
- `src/hooks/use-app-update.test.tsx`
- `src/hooks/app-update/check-app-update.test.ts`

## Deterministic execution model

We can make this deterministic in execution, but not in raw diff shape.

What is deterministic:

- the contract
- the phase order
- the touched file set
- the acceptance tests
- the release acceptance check

What is not deterministic:

- exact line-by-line code shape from a fresh LLM pass
- exact commit boundaries from a fresh LLM pass

So the deterministic rebuild loop is:

1. start from clean `main`
2. implement only the current phase
3. run the phase gate
4. do not advance until the gate is green
5. after all phases are green, run one real release proof

## Suggested rebuild loop

From a fresh branch:

```bash
git checkout main
git pull --ff-only
git checkout -b callum/updater-runtime-clean-rebuild
```

During implementation:

```bash
npx vitest run \
  scripts/build-updater-manifest.test.mjs \
  src/hooks/app-update/tauri-updater.test.ts \
  src/hooks/use-app-update.test.tsx \
  src/hooks/app-update/check-app-update.test.ts
```

Static gates:

```bash
npm run typecheck
```

Rust lock refresh when needed:

```bash
cd /Users/cflack/Repos/vana-com/data-connect/src-tauri
cargo metadata --format-version 1 >/tmp/dataconnect-cargo-metadata.json
```

Release proof:

1. cut a tagged release from the rebuild branch
2. confirm both macOS updater tarballs and both `.sig` files are published
3. confirm `latest.json` is uploaded
4. confirm `latest.json` contains both darwin targets
5. test a real macOS app upgrade from an older release to the rebuilt release

## Review checklist

Before calling the rebuild complete, answer yes to all of these:

- does the release contain both signed macOS updater tarballs?
- does the release contain `latest.json`?
- does `latest.json` point to the finalized tarballs, not local or temporary paths?
- does macOS do silent background download before showing UI?
- is the only updater toast the staged `Restart to update` toast?
- does `Restart now` install and relaunch?
- does `Later` return on next launch?
- does non-macOS still use the release-page path?
- do failures fail soft?

## Source evidence

These are evidence inputs for the plan, not implementation instructions:

- `docs/plans/260324-track-b-updater-runtime-cut.md`
- `docs/plans/260324-track-b-updater-runtime-execution.md`
- branch commits that proved the final contract

If we ever rebuild this again, this document should be the starting point, not the branch archaeology.
