# Home page

## What this is

- Primary landing page for sources and connected apps, with browser readiness gating.

## Files

- `index.tsx`: route entry, tab layout, hook orchestration.
- `home-debug-fixtures.ts`: DEV-only fixture data for Home debug scenarios.
- `components/BrowserSetupSection.tsx`: browser availability and download UI.
- `components/available-sources-list.tsx`: available connector cards.
- `components/connected-sources-list.tsx`: connected sources list and runs link.
- `components/connected-apps-list.tsx`: connected apps list.
- `components/connector-updates.tsx`: connector update list + download actions.

## Data flow

- `useBrowserStatus` → setup UI + tab gating.
- `usePlatforms` → platform list + connected status → source lists.
- `useConnector` → start export run on source selection.
- `useConnectorUpdates` → updates list + download actions.
- `state.app.runs` + `state.app.connectedApps` → lists.

## App integration

- Route: `/` (lazy from `App.tsx`).
- Entry points: `TopNav` Home.
- Tauri/IPC: `check_browser_available`, `download_browser`, `get_platforms`,
  `check_connected_platforms`, `start_connector_run`, `check_connector_updates`,
  `download_connector`.

## Behavior

- Blocks tab content until the browser is ready; shows setup UI otherwise.
- Shows connector updates panel when ready.
- Provides source connect cards and connected apps list.

## Mock system (dev)

- `homeDebug=1&scenario=<name>` (URL params) enables Home UI debug scenarios.
- When Home debug is enabled and live platforms are empty, fixture data is used.

## Notes

- Not part of the grant flow.
- Uses DEV-only Home debug fixtures when `homeDebug` is enabled.
