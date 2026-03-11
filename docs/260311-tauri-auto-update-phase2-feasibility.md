# 260311: Tauri auto-update phase 2 feasibility

## Goal

Ship true in-app app updates for the desktop build with this UX:

- app checks for updates in the background
- app downloads the update silently after startup settles
- user sees nothing until the update is fully staged
- user gets a single `Restart to update` style toast
- clicking the toast installs/applies the staged update and relaunches the app

This is an updater/distribution pipeline project, not mainly a UI project.

## Decisions so far

- Platform rollout: macOS first is acceptable.
- Feed/distribution: use GitHub Releases if it works; do not build a custom update service unless forced.
- Download timing: start after idle/startup settles, not immediately at launch.
- UX target: silent background download, then one-click restart/apply.
- Packaging assumption: treat the macOS post-build `node_modules` copy step as dead unless runtime or notarization evidence disproves it.
- Spike order: move next to updater plumbing; keep the nested in-app re-sign loop question as a narrower CI notarization follow-up.

## Spike outcome summary (2026-03-11)

What we did:

1. Proved raw Tauri macOS bundling already includes `personal-server/dist/node_modules`.
2. Removed the redundant macOS copy step from local and CI build paths.
3. Proved locally that pre-signed nested binaries keep their signatures/entitlements when Tauri bundles them.

What that means:

- The old “can Tauri package `node_modules` at all?” question is answered enough to unblock the next spike.
- The remaining packaging uncertainty is now much smaller: whether Apple notarization in CI still succeeds if we later remove the nested in-app re-sign loop.
- Updater plugin and updater artifact plumbing can now be planned against the simplified assumption that the copy step is gone.

## Current repo state

Missing today:

- no `tauri-plugin-updater` dependency in Rust
- no `@tauri-apps/plugin-updater` dependency in JS
- no updater plugin registration in `src-tauri/src/lib.rs`
- no updater config in `src-tauri/tauri.conf.json`
- no `bundle.createUpdaterArtifacts`
- no updater signing key setup in release automation
- no published updater metadata asset (`latest.json` or equivalent)

Relevant files:

- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/src/lib.rs`
- `src-tauri/capabilities/default.json`
- `src-tauri/tauri.conf.json`
- `.github/workflows/release.yml`
- `scripts/build-prod.js`
- `src/hooks/app-update/check-app-update.ts`
- `src/hooks/use-app-update.tsx`
- `src/components/ui/sonner.tsx`

## Answer: can we generate updater artifacts/signatures from the final post-processed bundles?

Not with the current release flow as written.

Why:

1. Tauri updater artifacts/signatures are generated during the Tauri build step.
2. Our workflow mutates the app bundle after that step:
   - copies `personal-server/dist/node_modules` into the bundle
   - re-signs nested binaries
   - re-signs the outer macOS app
   - recreates the DMG
3. Updater signatures must match the exact bytes of the artifact being served.

Implication:

- Any updater bundle/signature generated before those post-build mutations cannot be trusted as the final updater artifact.
- For macOS specifically, the updater uses a `.app.tar.gz` updater bundle, not the DMG, so the critical question is whether that `.app.tar.gz` was produced before or after the bundle was finalized. In the current flow, it would be produced too early.

What is still possible:

- We can likely make it work if we fully own final updater artifact generation/signing after post-processing.
- That means either:
  - stop mutating bundles after Tauri build, or
  - replace the current `tauri-action` “build then mutate” flow with a custom pipeline that creates the final updater bundle and signature from the finalized app.

Conclusion:

- **Current workflow:** no
- **In principle with custom final-artifact signing:** yes

## Answer: can we stop post-processing bundles by changing how `personal-server` resources are packaged?

For macOS resource copying, yes.

Why I think that:

- Tauri 2 resource docs explicitly support recursive directory bundling with preserved structure.
- `bundle.resources` supports `"dir/"` for recursive copy and object mapping for explicit target paths.
- The current repo comments still talk about old `dist/*` behavior (“only copies files”), but the actual config already uses object mapping, which suggests the current workaround may be partly stale or based on an older failure mode.

What we needed to prove:

- whether Tauri can already package `personal-server/dist/node_modules` into the raw `.app`
- whether the repo's current custom copy step is actually doing anything essential on macOS

Current remaining issue:

- `personal-server` is a `pkg` binary that still needs real filesystem `node_modules` beside it for native addons like `better-sqlite3`.
- the repo still needs a final signing/notarization strategy for the completed macOS app bundle

Best-case outcome:

- keep bundling `personal-server/dist` through normal Tauri resources
- remove the macOS resource-copy step from the custom post-processing path
- keep a final-sign step on the completed app bundle before creating updater artifacts / DMG

If that works, updater support gets much simpler because the Tauri-built bundle becomes the final shipped bundle.

Conclusion:

- **Yes for macOS resource copying**
- **Still need final app signing after bundle completion**

## GitHub Releases as feed

GitHub Releases is acceptable.

Important nuance:

- “GitHub Releases as feed” does **not** mean “only upload binaries”.
- Tauri updater still needs metadata describing the latest version and per-platform signed artifact URLs/signatures.

Practical shape:

- keep release assets on GitHub Releases
- publish updater metadata as a release asset too (`latest.json` or equivalent)
- point Tauri updater endpoints at that static metadata URL

This keeps the system backend-free while still using the real updater protocol.

## MacOS-first rollout

macOS first is a good idea.

Why:

- current release workflow is already most customized on macOS
- the desired UX matters most there right now
- it reduces surface area while we prove the packaging/signing/updater model

Recommended rollout:

1. prove packaging spike on macOS
2. ship updater on macOS only
3. extend to Windows/Linux once packaging and signing are stable

## Download timing

`after idle/startup settles` is safer than immediate launch download.

Recommended behavior:

- startup: check availability without blocking startup-critical work
- after app settles / idle delay: start silent download if update exists
- once fully staged: show `Restart to update`

This avoids competing with startup, connector initialization, and personal-server startup.

## What blocks shipping today

The main ship/no-ship questions are:

1. Can the updater plumbing be added cleanly now that the macOS copy step is removed?
2. Can GitHub Actions publish updater artifacts plus updater metadata cleanly for a macOS-first rollout?
3. Does Apple notarization in CI still pass if we later remove the nested in-app re-sign loop?

Question 3 is now the only unresolved macOS packaging-specific follow-up.
It should not block the updater plumbing spike.

## Recommended next steps

### Track A: packaging spike

Goal: remove post-processing.

#### Result (2026-03-11)

I ran a raw local macOS bundle build with no custom post-copy step:

- command: `CI=true npm run tauri -- build --bundles app`
- output: `src-tauri/target/release/bundle/macos/DataConnect.app`

Observed:

- raw Tauri packaging already included:
  - `Contents/Resources/personal-server/dist/personal-server`
  - `Contents/Resources/personal-server/dist/node_modules/better-sqlite3`
  - `Contents/Resources/personal-server/dist/node_modules/bindings`
  - `Contents/Resources/personal-server/dist/node_modules/file-uri-to-path`
- the same resource tree also existed earlier in Tauri's staging directory at `src-tauri/target/release/personal-server/dist`
- the bundled `personal-server` binary verified successfully with `codesign --verify --strict`
- the bundled `better_sqlite3.node` addon also verified successfully with `codesign --verify --strict`

Important failure:

- the outer raw `.app` failed `codesign --verify --strict`
- `codesign -dv --verbose=4` showed `Sealed Resources=none`
- ad-hoc re-signing the completed `.app` fixed verification immediately and produced `Sealed Resources version=2`

Interpretation:

- the current macOS resource-copy workaround is not needed to get `node_modules` into the final `.app`
- the remaining macOS finalization need is signing the completed app bundle after all resources are in place

Current status:

- status: partially proven
- raw macOS app already contains `personal-server/dist/node_modules`
- next proof still needed: launch/runtime validation from the packaged app
- if runtime passes, delete the macOS copy step and keep only final-sign/final-artifact steps

#### Follow-up cleanup (2026-03-11)

Implemented the first cleanup pass:

- removed the redundant macOS `node_modules` copy step from `scripts/build-prod.js`
- removed the redundant macOS `node_modules` copy step from `.github/workflows/release.yml`
- kept final app signing in place

Validation:

- `node scripts/build-prod.js` completed successfully
- `codesign --verify --strict` passed on the final `.app`
- bundled `personal-server/dist/node_modules` was still present in the final `.app`
- the packaged app binary stayed up during a short local smoke run

Open question that remains after this cleanup:

- whether CI still needs the nested in-app re-sign loop for `personal-server` and `.node` files, or whether pre-build signing plus final outer-app signing is sufficient

#### Nested-signature preservation check (2026-03-11)

Ran a follow-up preservation test:

- ad-hoc signed `personal-server/dist/personal-server` with `personal-server/entitlements.plist`
- ad-hoc signed `personal-server/dist/node_modules/better-sqlite3/build/Release/better_sqlite3.node`
- built a raw macOS app with `CI=true npm run tauri -- build --bundles app`
- inspected the bundled copies inside `DataConnect.app`

Observed:

- the bundled `personal-server` copy preserved the same signature metadata and CDHash as the pre-signed source binary
- the bundled `personal-server` copy preserved the JIT entitlements from `personal-server/entitlements.plist`
- the bundled `better_sqlite3.node` copy verified successfully with `codesign --verify --strict`

Interpretation:

- Tauri resource bundling preserves the nested binary signatures/entitlements we apply before build
- the current CI in-app nested re-sign loop is likely redundant

Remaining uncertainty:

- local ad-hoc signature preservation is proven
- Apple notarization with Developer ID signatures is still not yet proven in CI

Working recommendation:

- keep pre-build signing of `personal-server` and `.node` files
- keep final outer-app signing
- defer removing the CI in-app nested re-sign loop until one notarization-backed CI run proves it is unnecessary

### Track B: updater pipeline spike

Goal: prove updater mechanics on macOS once Track A works.

Implementation plan:

- `docs/plans/260311-tauri-auto-update-phase2-track-b-plan.md`

#### Scope decision

Proceed on the simplified assumption that:

- the macOS copy step is gone
- pre-build signing of nested binaries stays
- final outer-app signing stays
- the nested in-app re-sign loop remains temporarily in CI until notarization evidence proves it can be removed

#### Exact files to change

- `package.json`
  - add `@tauri-apps/plugin-updater`
  - likely add `@tauri-apps/plugin-process` if the relaunch step is owned in JS
- `src-tauri/Cargo.toml`
  - add `tauri-plugin-updater`
- `src-tauri/src/lib.rs`
  - register the updater plugin on the Tauri builder
- `src-tauri/capabilities/default.json`
  - add updater capability permissions (`updater:default`)
- `src-tauri/tauri.conf.json`
  - enable `bundle.createUpdaterArtifacts`
  - add `plugins.updater.pubkey`
  - add `plugins.updater.endpoints`
- `.github/workflows/release.yml`
  - inject updater signing private key env vars during build
  - upload updater bundle assets and generated signatures
  - publish/update static updater metadata asset on the GitHub Release
- `scripts/build-prod.js`
  - optionally mirror the updater-artifact path for local macOS smoke builds if we want local end-to-end update testing outside CI
- `src/hooks/app-update/check-app-update.ts`
  - either replace the GitHub Releases polling path on macOS or split “release page check” from “Tauri updater check”
- `src/hooks/use-app-update.tsx`
  - evolve from `check -> external release URL` into `check -> idle download -> restart toast`
- `src/components/ui/sonner.tsx`
  - reuse existing toast surface for the staged `Restart to update` UX

#### Updater keys and config

- generate a dedicated updater signing keypair with `npm run tauri signer generate`
- store the private key and optional password in CI secrets
- put the public key content directly in `src-tauri/tauri.conf.json` under `plugins.updater.pubkey`
- do not rely on `.env` files for the private key during build; Tauri reads it from environment variables at build time

#### GitHub Releases / metadata shape

For Tauri v2 static metadata, the endpoint can point directly at a JSON asset on GitHub Releases, for example:

- `https://github.com/vana-com/data-connect/releases/latest/download/latest.json`

That JSON should contain:

- top-level `version`
- optional `notes`
- optional `pub_date`
- `platforms` map keyed by platform-arch, for example:
  - `darwin-aarch64`
  - `darwin-x86_64`
- each platform entry needs:
  - `url` pointing to the updater bundle asset
  - `signature` containing the literal `.sig` file contents, not a URL

Important constraint:

- Tauri validates the JSON before version comparison, so every platform key present in the file must be complete and correct.
- For a macOS-first rollout, the safest static metadata is a macOS-only updater JSON until Windows/Linux updater artifacts are also supported.

Expected macOS release assets:

- normal installer:
  - `.dmg`
- updater assets:
  - `.app.tar.gz`
  - `.app.tar.gz.sig`
- static updater metadata:
  - `latest.json`

#### Runtime state machine

Target runtime behavior for macOS phase 2:

1. Startup:
   - call updater `check()`
   - do not block startup-critical work
2. No update:
   - stay idle
3. Update available:
   - record the available update
   - wait for startup-settled / idle delay
4. Idle download:
   - call updater download/install path in background
   - keep UI silent while downloading
5. Download staged:
   - show one persistent toast: `Restart to update`
6. User clicks restart:
   - install/apply if needed
   - relaunch app
7. Failure at any step:
   - fail soft
   - log for diagnostics
   - do not interrupt normal app usage

Recommended implementation note:

- keep the existing `useAppUpdate` provider as the single app-shell orchestration point
- split decision states so phase 1 (`external update available`) and phase 2 (`update downloading`, `update ready to restart`) are not conflated

#### Exit criteria

- macOS build produces updater artifacts and signatures from the finalized signed app pipeline
- release workflow uploads `.app.tar.gz`, `.sig`, and `latest.json`
- an older macOS build updates in-app to a newer macOS build through the full staged-download flow
- non-macOS platforms remain on the phase-1 external release flow until explicitly migrated

### Track C: fallback if Track A fails

Goal: keep current packaging but still support updater.

- replace current `tauri-action` usage with a custom final-artifact pipeline
- mutate bundle first
- re-sign final app
- create updater bundle from the finalized app
- sign the updater bundle
- publish matching metadata

This is more work and should only be used if Track A fails.

## Current recommendation

Do not start by wiring updater APIs into the app UI.

Start with the updater plumbing spike, not another broad packaging spike.

Current alignment:

- yes, the macOS resource-copy subproblem is solved enough to proceed
- updater plugin + updater artifact plumbing is the next concrete spike
- the only remaining packaging follow-up is whether CI notarization later lets us delete the nested in-app re-sign loop too
- keep that notarization question scoped as a follow-up validation, not as the blocker for updater planning
