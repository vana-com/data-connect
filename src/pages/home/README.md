# Home page

## What this is

- Primary landing page for sources/imports.

## Files

- `index.tsx`: route entry and source/import orchestration.
- `home-debug-fixtures.ts`: DEV-only fixture data for Home debug scenarios.
- `home-import-sources-ui-debug.ts`: DEV-only import-sources debug state (isolated from real Home state).
- `components/available-sources-list.tsx`: available connector cards.
- `components/available-sources-estimator.ts`: coarse expectation-band builder for running imports.
- `components/connected-sources-list.tsx`: connected sources list and runs link.

## Data flow

- `usePlatforms` → platform list + connected status → source lists.
- `useConnector` → start export run on source selection.
- `state.app.runs` → source status and connected-source fallback state.
- App-level `useInitialize` runs a silent connector update check on startup.

## App integration

- Route: `/` (lazy from `App.tsx`).
- Entry points: `TopNav` Home.
- Tauri/IPC: `check_browser_available`, `download_browser`, `get_platforms`,
  `check_connected_platforms`, `start_connector_run`, `check_connector_updates`,
  `download_connector`.

## Behavior

- Provides source connect cards and connected-source status only.
- Does not render connector update UI; update checks happen silently at app init.

## Mock system (dev)

- `homeImportSourcesScenario=<name>` (URL param, DEV-only) drives Import sources debugger only.
- `connectedSourcesScenario=<name>` remains separate.
- Import sources debug now uses an explicit debug view model (platforms, runs, connected ids) and does not mutate real Home state.

## Design rationale (provenance)

- Blocking vs background run policy and ETA guardrails.
- `infoSlot` line priority and connector status copy rules.
- Volatile status copy lives in the top-right slot, not the CTA label.

## Notes

- Not part of the grant flow.
