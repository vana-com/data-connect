## Settings page

### What this is

- Settings hub for account, connected apps, storage/server, and diagnostics.
- Frontend-only UI that calls Tauri commands and personal server helpers when needed.

### Files

- `index.tsx`: page shell, nav, section switching, handler wiring.
- `types.ts`: shared types for the settings route.
- `use-settings-page.ts`: route-level state, effects, and handlers.
- `components/settings-account.tsx`: session + account summary, sign-in/out actions.
- `components/settings-apps.tsx`: connected apps list and revoke action.
- `components/settings-storage.tsx`: data path, storage options, server status/registration.
- `components/settings-about.tsx`: version, diagnostics, browser status, debug tools.
- `components/settings-shared.tsx`: shared section/card/row layout helpers.
- `sections/runs/*`: canonical Runs section implementation rendered for `section=runs`.

### Data flow

- `index.tsx` loads:
  - `getVersion()` (app version)
  - `invoke("get_user_data_path")` (export location)
- Actions in `index.tsx`:
  - `invoke("test_nodejs")`
  - `invoke("check_browser_available")`
  - `invoke("debug_connector_paths")`
  - `invoke("open_folder", { path })`
- Auth + server:
  - `useAuth` provides `user`, `logout`, `isAuthenticated`, `walletAddress`.
  - `usePersonalServer` provides status + start/stop controls.
- Connected apps:
  - `useSyncExternalStore(subscribeConnectedApps, getAllConnectedApps)`
  - `SettingsApps` calls `removeConnectedApp(appId)` via `onRevokeApp`.
- Personal server registration:
  - `SettingsStorage` calls `fetchServerIdentity(port)` when server is running.

### App integration

- Route: `/settings` is lazy-loaded in `src/App.tsx`.
- Integration: Tauri IPC for filesystem/diagnostics; personal server status and identity.

### Behavior

- Left nav switches sections without changing the route.
- Diagnostics show Node.js runtime check results, browser availability, and server controls.
- Storage shows current export location and storage/server options.

### Notes

- Direct imports only (no barrels) per Vercel React rule `bundle-barrel-imports`.
- Keep static config (sections/options/status maps) at module scope to avoid re-allocs.
- This page does not participate in the grant flow.
