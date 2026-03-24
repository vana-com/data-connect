# 260324 execution: Track B updater runtime

Source docs:

- `docs/plans/260324-track-b-updater-runtime-canonical-plan.md`
- `docs/plans/260324-track-b-updater-runtime-cut.md`
- `docs/plans/260311-tauri-auto-update-phase2-track-b-plan.md`
- `docs/260311-tauri-auto-update-phase2-feasibility.md`
- `docs/plans/260311-macos-updater-ci-proof-run.md`

Purpose:

- provide one standalone execution tracker for the app-side updater cut
- keep the release-path proof separate from the runtime implementation work
- record status and evidence as implementation lands

## Scope lock

Done already:

- finalized macOS updater tarballs and signatures are published correctly
- release asset naming is now clean enough to build the runtime on top
- raw pre-finalization macOS updater tarballs no longer leak onto releases

In scope now:

1. publish `latest.json` from the final release assets
2. wire the Tauri updater plugin/config/capabilities into the app
3. add a macOS-only updater seam in app code
4. refactor `useAppUpdate` to `check -> silent download -> restart toast`
5. preserve the existing non-macOS external-release fallback
6. add focused tests and runtime evidence

Out of scope:

- changing the proven post-finalization macOS updater artifact path
- Windows/Linux in-app updater rollout
- redesigning the app toast system
- solving the nested in-app re-sign loop follow-up

## Hard rules

1. `latest.json` must be generated from final published asset names and inline `.sig` contents.
2. The manifest upload must happen after matrix artifact upload, in one non-matrix job, so both macOS targets appear in one file.
3. The macOS app flow must use separate `check`, `download`, and `install/relaunch` steps. Do not collapse it into `downloadAndInstall()`.
4. `Later` on the staged macOS restart toast is session-only. It must not persist across app restarts.
5. Non-macOS must keep the phase-1 release-page flow.
6. Updater failures must fail soft and keep the app usable.

## Ordered execution plan

### Step 1: execution tracker

- create this doc
- record the exact runtime cut and contract

### Step 2: updater metadata publication

- add `scripts/build-updater-manifest.mjs`
- build `latest.json` from GitHub Release asset metadata plus `.sig` file contents
- add a follow-up workflow job that runs after `build`
- upload one `latest.json` to the release

### Step 3: Tauri updater wiring

- add JS and Rust updater dependencies
- register updater plugin
- add updater/process permissions
- add updater config in `tauri.conf.json`

### Step 4: app updater seam

- add `src/hooks/app-update/tauri-updater.ts`
- keep all updater-plugin API calls in that file
- expose a small API the hook can orchestrate cleanly

### Step 5: app-shell orchestration

- refactor `src/hooks/use-app-update.tsx`
- macOS Tauri path:
  - startup check after settle delay
  - silent background download
  - persistent `Restart to update` toast once staged
  - `Restart now` installs and relaunches
- non-macOS path:
  - keep current external-release behavior

### Step 6: tests and evidence

- add focused tests for manifest generation
- add hook/seam tests for macOS staged-update flow
- keep and verify non-macOS fallback tests
- run scoped tests, then typecheck/lint as confidence gates

## File contract

| File                                                     | Required change                                                 | Status | Evidence                                                                             |
| -------------------------------------------------------- | --------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| `docs/plans/260324-track-b-updater-runtime-execution.md` | create and update execution tracker                             | PASS   | file created                                                                         |
| `package.json`                                           | add updater/process JS deps                                     | PASS   | `@tauri-apps/plugin-updater` and `@tauri-apps/plugin-process` added                  |
| `package-lock.json`                                      | capture new JS deps                                             | PASS   | lockfile updated by `npm install`                                                    |
| `src-tauri/Cargo.toml`                                   | add updater/process Rust deps if needed by chosen relaunch path | PASS   | `tauri-plugin-updater` and `tauri-plugin-process` added                              |
| `src-tauri/Cargo.lock`                                   | capture Rust dependency graph update                            | FAIL   | `cargo` is not available in this shell, so lockfile could not be regenerated locally |
| `src-tauri/src/lib.rs`                                   | register updater plugin                                         | PASS   | process plugin registered; updater plugin registered in `setup()`                    |
| `src-tauri/capabilities/default.json`                    | add updater/process permissions                                 | PASS   | `updater:default` and `process:default` added                                        |
| `src-tauri/tauri.conf.json`                              | add updater config and public key/endpoints                     | PASS   | updater public key and `latest.json` endpoint added                                  |
| `scripts/build-updater-manifest.mjs`                     | generate `latest.json` from final release assets                | PASS   | script builds static Tauri updater manifest from release JSON plus `.sig` contents   |
| `.github/workflows/release.yml`                          | add manifest-generation/upload job after matrix build           | PASS   | `publish_updater_manifest` job added after `build`                                   |
| `src/hooks/app-update/check-app-update.ts`               | narrow role to fallback release-page path                       | NO-OP  | app hook now routes macOS Tauri to native updater seam; file remains fallback logic  |
| `src/hooks/app-update/tauri-updater.ts`                  | add macOS updater seam                                          | PASS   | new seam wraps `check`, `download`, `install`, and `relaunch`                        |
| `src/hooks/use-app-update.tsx`                           | stage/update/restart flow on macOS and fallback elsewhere       | PASS   | macOS staged-update path and non-macOS fallback implemented                          |
| `src/hooks/use-app-update.test.tsx`                      | cover staged macOS flow and fallback path                       | PASS   | scoped hook tests cover both runtime lanes                                           |
| `src/hooks/app-update/check-app-update.test.ts`          | keep fallback release-check coverage aligned                    | PASS   | fallback coverage re-run and kept green                                              |
| `src/**/*.test.ts(x)`                                    | add any additional focused coverage needed                      | PASS   | seam and manifest tests added for new runtime behavior                               |

Status semantics:

- `TODO`: not started yet
- `WIP`: currently being changed
- `PASS`: implemented and verified enough for this cut
- `NO-OP`: intentionally unchanged with proof
- `FAIL`: missing or incorrect

## Verification checklist

### Code-path checks

```bash
rg -n "plugin-updater|plugin-process|updater:default|process:default|plugins.updater|latest.json" \
  package.json package-lock.json src-tauri/Cargo.toml src-tauri/Cargo.lock \
  src-tauri/src/lib.rs src-tauri/capabilities/default.json src-tauri/tauri.conf.json \
  scripts/build-updater-manifest.mjs .github/workflows/release.yml
```

### Runtime checks

```bash
rg -n "Restart to update|Restart now|download\\(|install\\(|relaunch\\(|check\\(" \
  src/hooks src/pages
```

### Tests

```bash
npx vitest run \
  src/hooks/use-app-update.test.tsx \
  src/hooks/app-update/check-app-update.test.ts
```

### Static confidence

```bash
npm run typecheck
npm run lint
```

## Evidence log

| Step                 | Evidence                                                                                                                                                                            | Status |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Tracker created      | standalone execution doc added                                                                                                                                                      | PASS   |
| Manifest generation  | `scripts/build-updater-manifest.mjs` plus `scripts/build-updater-manifest.test.mjs` added                                                                                           | PASS   |
| Workflow publication | `publish_updater_manifest` job added to `release.yml`                                                                                                                               | PASS   |
| Tauri wiring         | updater/process deps, config, plugin registration, and capabilities added                                                                                                           | PASS   |
| App seam             | `src/hooks/app-update/tauri-updater.ts` added                                                                                                                                       | PASS   |
| Hook orchestration   | `src/hooks/use-app-update.tsx` now stages macOS updates and preserves fallback elsewhere                                                                                            | PASS   |
| Tests                | `npx vitest run src/hooks/use-app-update.test.tsx src/hooks/app-update/check-app-update.test.ts src/hooks/app-update/tauri-updater.test.ts scripts/build-updater-manifest.test.mjs` | PASS   |
| Static confidence    | `npm run typecheck` passed; `npm run lint` still fails on the repo's existing ESLint flat-config migration issue                                                                    | NO-OP  |

## Open decisions

Current implementation choice unless blocked:

- generate `latest.json` in a follow-up non-matrix workflow job
- keep relaunch ownership in JS through `@tauri-apps/plugin-process`
- keep macOS updater rollout boundary explicit in app code
- leave non-macOS on the existing release-page fallback
