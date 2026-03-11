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

- `src-tauri/Cargo.toml`
- `src-tauri/src/lib.rs`
- `src-tauri/tauri.conf.json`
- `.github/workflows/release.yml`
- `scripts/build-prod.js`

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

1. Can we eliminate post-build bundle mutation by packaging `personal-server/dist` correctly through Tauri resources?
2. If not, can we generate final updater bundles/signatures after all mutations and re-signing are complete?
3. Can GitHub Actions publish the final updater metadata/assets cleanly for macOS-first rollout?

Question 1 is the best first bet.

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

### Track B: updater pipeline spike

Goal: prove updater mechanics on macOS once Track A works.

- add updater plugin/config
- generate signing keys
- enable `createUpdaterArtifacts`
- publish updater metadata to GitHub Releases
- wire a minimal check -> download -> restart flow
- verify update from one macOS release to the next

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

Start with a macOS packaging spike to answer one binary question:

- can `personal-server/dist/node_modules` be bundled correctly by Tauri without post-build mutation?

Current answer:

- yes for resource packaging
- not yet fully proven for runtime launch behavior
- final-sign/final-artifact generation still needs to happen after the completed app exists
