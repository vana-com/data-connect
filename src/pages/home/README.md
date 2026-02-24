# Home page

## What this is

- Primary landing page for sources and connected apps.

## Files

- `index.tsx`: route entry, tab layout, hook orchestration.
- `home-debug-fixtures.ts`: DEV-only fixture data for Home debug scenarios.
- `components/available-sources-list.tsx`: available connector cards.
- `components/connected-sources-list.tsx`: connected sources list and runs link.
- `components/connected-apps-list.tsx`: connected apps list.

## Data flow

- `usePlatforms` → platform list + connected status → source lists.
- `useConnector` → start export run on source selection.
- `state.app.runs` + `state.app.connectedApps` → lists.
- App-level `useInitialize` runs a silent connector update check on startup.

## App integration

- Route: `/` (lazy from `App.tsx`).
- Entry points: `TopNav` Home.
- Tauri/IPC: `check_browser_available`, `download_browser`, `get_platforms`,
  `check_connected_platforms`, `start_connector_run`, `check_connector_updates`,
  `download_connector`.

## Behavior

- Provides source connect cards and connected apps list.
- Does not render connector update UI; update checks happen silently at app init.

## Mock system (dev)

- `scenario=<name>` (URL param, DEV-only) enables Home UI debug scenarios.
- When Home debug is enabled and live platforms are empty, fixture data is used.

## Notes

- Not part of the grant flow.
- Uses DEV-only Home debug fixtures when `scenario` is set to a valid debug case.
