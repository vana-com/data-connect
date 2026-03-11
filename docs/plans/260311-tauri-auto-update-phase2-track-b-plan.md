# 260311 plan: Tauri auto-update phase 2 Track B

Source docs:

- `docs/260311-tauri-auto-update-phase2-feasibility.md`
- `docs/260226-tauri-app-update-toast-overview.md`
- `docs/plans/260226-app-update-toast-phase1-implementation-plan.md`

Use this doc in two modes:

- Strategy lock before implementation.
- Execution contract during implementation.

## Strategy Lock

### Execution status update (2026-03-11)

New discovery from execution:

- Directly enabling Tauri `createUpdaterArtifacts` is not safe in the current macOS release flow.
- Reason: updater artifacts are generated during `tauri build`, but this repo final-signs the macOS `.app` after `tauri build`.
- That means the generated `.app.tar.gz` can drift from the final shipped app bytes.

Immediate strategy adjustment:

- Implement a custom post-finalization macOS updater-asset path first.
- Defer updater plugin/config/runtime wiring until the final-asset path is proven.

### Goal

Ship macOS-first phase 2 app updates in DataConnect:

- startup check through Tauri updater
- silent background download after startup settles
- single `Restart to update` toast after staging completes
- apply/relaunch from inside the app

### Scope

In scope:

- Tauri updater plugin wiring in Rust, JS, config, and capabilities
- updater signing-key contract
- macOS updater artifact generation
- GitHub Release asset upload for updater bundles and static metadata
- app-shell runtime state machine for `check -> idle download -> restart`
- focused tests and manual smoke for macOS phase 2

Out of scope:

- Windows/Linux phase 2 rollout
- custom update backend/service
- removal of the CI nested in-app re-sign loop
- broad redesign of the phase-1 toast surface

### Invariants

- The deleted macOS post-build copy step stays deleted.
- Final updater artifacts/signatures must match the final shipped bytes.
- macOS phase 2 must not block startup-critical work.
- Non-macOS platforms stay on the existing phase-1 external-release flow.
- Runtime failures fail soft: log, keep app usable, no blocking modal flow.
- `useAppUpdate` remains the single app-shell orchestration seam.

### Dependencies

| Dependency | Status | Owner | Target date | Notes |
| ---------- | ------ | ----- | ----------- | ----- |
| Tauri updater signing keypair generated and stored securely | SOFT BLOCKED | release owner | before implementation finish | Need private key + optional password in CI; public key embedded in config |
| GitHub Release workflow can upload updater bundle assets plus `latest.json` | UNBLOCKED | repo/CI | during implementation | Current workflow already uploads release artifacts; needs updater asset/metadata extension |
| Tauri default updater artifact generation happens before repo final-sign step | BLOCKED for direct adoption | implementation | discovered 2026-03-11 | Current workflow cannot safely rely on raw `createUpdaterArtifacts` output alone |
| Custom post-finalization macOS updater asset generation path | SOFT BLOCKED | implementation | first execution slice | Must generate `.app.tar.gz` and `.sig` from finalized signed `.app` |
| Real upgrade smoke path from old macOS build to new macOS build | SOFT BLOCKED | implementation/release | before merge/release | Need a reproducible way to test one released build upgrading to another |
| CI notarization result for removing nested in-app re-sign loop | UNBLOCKED for Track B, unresolved for follow-up | release owner | after Track B or alongside first CI proof | Not a blocker for updater plumbing |

### Approach

Chosen approach:

- macOS-first Tauri v2 updater
- custom post-finalization macOS updater asset generation before any runtime updater wiring
- static `latest.json` metadata hosted as a GitHub Release asset
- keep GitHub Releases as the only distribution surface
- keep phase-1 release-page check as the fallback path for non-macOS
- extend `useAppUpdate` instead of creating a second app-update provider
- generate updater metadata in a repo script, not inline shell glue in the workflow

Rejected alternatives:

- dynamic update server now: too much new infrastructure for this spike
- cross-platform phase 2 in one pass: adds avoidable surface area
- deleting the nested in-app re-sign loop in the same pass: separate notarization proof question
- replacing the whole release flow before proving static GitHub metadata works: too much churn

### Replan triggers

- `createUpdaterArtifacts` outputs do not match the finalized signed macOS app path we need to ship.
- Static GitHub Release metadata cannot express the macOS-first rollout cleanly.
- Updater plugin permissions/config force broader Tauri capability changes than expected.
- Runtime updater API shape forces a larger state-model rewrite than `useAppUpdate` can absorb cleanly.

## Execution Contract

### Ordered implementation steps

1. Implement a repo-owned script that creates and signs a macOS updater bundle from the finalized `.app`.
2. Extend `.github/workflows/release.yml` to:
   - call that script after final outer-app signing
   - upload `.app.tar.gz` and `.app.tar.gz.sig`
3. Only after the custom macOS asset path works, add updater dependencies and Tauri capability/config wiring.
4. Add a repo-owned script to build `latest.json` from final updater assets and `.sig` contents.
5. Extend `.github/workflows/release.yml` to:
   - inject updater signing key env vars
   - upload `latest.json`
6. Add a dedicated runtime seam around the Tauri updater plugin.
7. Refactor `useAppUpdate` from phase-1 `release available` logic into:
   - platform-aware decision path
   - startup check
   - idle download
   - staged restart toast
8. Preserve phase-1 behavior for non-macOS and for failure fallback.
9. Add focused tests for config, state transitions, and action behavior.
10. Run local macOS artifact smoke, then release/upgrade proof.

### Mandatory file edit contract

Fill `Status` with `PASS` / `NO-OP` / `FAIL` during execution.

| File | Required change | Status | Evidence |
| ---- | --------------- | ------ | -------- |
| `package.json` | add `@tauri-apps/plugin-updater`; add `@tauri-apps/plugin-process` if relaunch stays in JS |  |  |
| `src-tauri/Cargo.toml` | add `tauri-plugin-updater` |  |  |
| `src-tauri/src/lib.rs` | register updater plugin; move runtime config here only if config file is insufficient |  |  |
| `src-tauri/capabilities/default.json` | add updater permissions (`updater:default`) |  |  |
| `src-tauri/tauri.conf.json` | add `bundle.createUpdaterArtifacts`; add `plugins.updater.pubkey`; add `plugins.updater.endpoints` after post-finalization asset path is proven |  |  |
| `scripts/build-macos-updater-artifacts.mjs` | new script to archive/sign finalized macOS `.app` into `.app.tar.gz` and `.sig` | PASS | repo script added; uses `tauri signer sign` on finalized tarball |
| `scripts/build-updater-manifest.mjs` | new script to generate `latest.json` from release asset inputs |  |  |
| `.github/workflows/release.yml` | call post-finalization updater script; upload `.app.tar.gz`, `.sig`, later `latest.json` | PASS | finalization step now generates updater tarball/signature after outer app re-sign and uploads them when present |
| `scripts/build-prod.js` | optional local-macOS parity for updater-artifact smoke; otherwise mark `NO-OP` explicitly | NO-OP | local build path intentionally unchanged in this slice |
| `src/hooks/app-update/check-app-update.ts` | preserve or narrow phase-1 external-release check as fallback path |  |  |
| `src/hooks/app-update/tauri-updater.ts` | new seam around `@tauri-apps/plugin-updater` APIs |  |  |
| `src/hooks/use-app-update.tsx` | orchestrate phase-2 state machine and preserve non-macOS fallback |  |  |
| `src/components/ui/sonner.tsx` | reuse existing toast surface; change only if restart UX requires it |  |  |
| `src/**/*.test.ts(x)` | add/adjust tests for updater seam and restart-toast flow |  |  |

### Verification commands

Use these exact checks during execution:

```bash
# file-wiring scan
rg -n "plugin-updater|plugin-process|createUpdaterArtifacts|pubkey|endpoints|updater:default" \
  package.json src-tauri/Cargo.toml src-tauri/src/lib.rs src-tauri/tauri.conf.json src-tauri/capabilities/default.json

# runtime-surface scan
rg -n "check\\(|downloadAndInstall|relaunch|Restart to update|Update available|useAppUpdate" \
  src/hooks src/components src/pages

# focused tests
npm run test -- \
  src/hooks/use-app-update.test.tsx \
  src/hooks/app-update/check-app-update.test.ts \
  src/hooks/app-update/app-update-ui-debug.test.ts

# static confidence
npm run typecheck
npm run lint

# local macOS artifact smoke
TAURI_SIGNING_PRIVATE_KEY="..." TAURI_SIGNING_PRIVATE_KEY_PASSWORD="..." npm run tauri -- build --bundles app

# inspect generated updater artifacts
rg -n "\\.app\\.tar\\.gz|latest\\.json" src-tauri/target .github/workflows scripts
```

Release/upgrade proof commands:

```bash
# inspect release assets after workflow run
gh release view vX.Y.Z --json assets

# fetch generated metadata for inspection
gh release download vX.Y.Z --pattern "latest.json" --dir /tmp/dataconnect-updater-check
```

### Gate checklist

- [ ] Code-path gates passed
- [ ] Behavior/runtime gates passed
- [ ] Build/test/lint gates passed
- [ ] CI/release gates passed
- [ ] Real upgrade smoke passed on macOS

### PR evidence table

| Gate | Command/evidence | Expected | Actual summary | Status |
| ---- | ---------------- | -------- | -------------- | ------ |
| Config | updater dependency/config/capability scan | all required updater touch points present |  |  |
| Build | local updater-artifact build | macOS build emits `.app.tar.gz` and `.sig` |  |  |
| Release | workflow asset upload | Release contains `.dmg`, `.app.tar.gz`, `.sig`, `latest.json` |  |  |
| Runtime | startup check stays non-blocking | app remains usable while updater checks |  |  |
| Runtime | idle download path | update downloads without immediate startup contention |  |  |
| Runtime | staged restart toast | single persistent `Restart to update` toast after staging |  |  |
| Runtime | restart action | click applies/relaunches successfully |  |  |
| Fallback | non-macOS behavior | non-macOS still uses phase-1 external-release path |  |  |
| Build | test/typecheck/lint | no new failures beyond repo baseline |  |  |

### Done criteria

1. No `FAIL` rows in file contract or PR evidence table.
2. macOS updater artifacts and `latest.json` are produced and published by the release flow.
3. `useAppUpdate` supports phase-2 staged update flow on macOS without regressing the phase-1 fallback path elsewhere.
4. A real macOS upgrade proof exists from an older build to a newer build.
5. The nested in-app re-sign loop question remains explicitly scoped as follow-up unless separately proven.

### Strategy delta

Record here if implementation changes:

- updater metadata host
- relaunch ownership (JS vs Rust)
- macOS-only rollout boundary
- release workflow shape

## Unresolved questions

- Should `latest.json` live as a single `releases/latest/download/latest.json` asset only, or also be uploaded per tag for audit/debug?
- Should relaunch be owned in JS via `@tauri-apps/plugin-process`, or should Rust own the final restart/apply command path?
- What is the cleanest repeatable upgrade-proof path: disposable tagged releases, a private test repo, or a local static feed?
- Do we want the first Track B pass to show download progress anywhere, or stay intentionally silent until the staged restart toast?
