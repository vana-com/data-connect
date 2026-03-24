# 260324 plan: Track B updater runtime cut

Goal:

- execute the next Track B slice after the release-path proof
- keep the release pipeline work as-is
- add the in-app macOS updater runtime with the exact toast behavior we want

## Exact UX spec

On macOS:

1. App starts normally with no blocking update UI.
2. After startup settles, app checks for an update in the background.
3. If no update exists, nothing is shown.
4. If an update exists, app downloads it silently in the background.
5. While downloading, no toast is shown unless we need a debug-only surface.
6. When the update is fully staged, show one persistent toast:
   - title: `Restart to update`
   - description: `Version <version> is ready`
   - primary action: `Restart now`
   - secondary action: `Later`
7. `Restart now` applies the staged update and relaunches the app.
8. `Later` dismisses the toast for the current session, but the staged update should be offered again on next launch.
9. Any updater failure fails soft:
   - log it
   - keep app usable
   - do not show a blocking modal

On non-macOS:

- keep the current phase-1 release-page flow unchanged

## This cut does

- add Tauri updater runtime/config wiring
- add updater metadata generation/upload (`latest.json`)
- add a macOS-only updater seam in the app
- refactor `useAppUpdate` to `check -> silent download -> restart toast`
- preserve the current non-macOS fallback

## This cut does not

- ship Windows/Linux in-app updater flow
- redesign the toast system
- add a custom update backend

## File contract

- `package.json`
  - add `@tauri-apps/plugin-updater`
- `src-tauri/Cargo.toml`
  - add `tauri-plugin-updater`
- `src-tauri/src/lib.rs`
  - register updater plugin
- `src-tauri/capabilities/default.json`
  - add updater permissions
- `src-tauri/tauri.conf.json`
  - add updater config, public key, and endpoints
- `scripts/build-updater-manifest.mjs`
  - generate `latest.json` from the finalized release assets
- `.github/workflows/release.yml`
  - upload `latest.json`
- `src/hooks/app-update/tauri-updater.ts`
  - add the macOS updater seam
- `src/hooks/app-update/check-app-update.ts`
  - preserve current non-macOS fallback role or narrow it to that role explicitly
- `src/hooks/use-app-update.tsx`
  - implement the new runtime state machine
- tests
  - cover macOS staged-update path and non-macOS fallback

## Execution order

1. Keep the proven release artifact path intact.
2. Normalize release asset naming if needed so the public surface is stable.
3. Generate and upload `latest.json`.
4. Add updater plugin/config/capability wiring.
5. Add the Tauri updater seam.
6. Refactor `useAppUpdate` to the staged-update toast flow.
7. Add focused tests.
8. Prove a real macOS update from one released build to a newer released build.

## Exit criteria

- macOS release assets and updater metadata publish correctly
- app silently stages a macOS update after startup settles
- app shows only the `Restart to update` toast once staging completes
- `Restart now` applies and relaunches
- non-macOS still uses the current release-page flow
