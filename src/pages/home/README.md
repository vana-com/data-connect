# Home page

## What this is

- Primary landing page for sources and connected apps.

## Files

- `index.tsx`: route entry, tab layout, hook orchestration.
- `home-debug-fixtures.ts`: DEV-only fixture data for Home debug scenarios.
- `home-import-sources-ui-debug.ts`: DEV-only import-sources debug state (isolated from real Home state).
- `components/available-sources-list.tsx`: available connector cards.
- `components/available-sources-estimator.ts`: coarse expectation-band builder for running imports.
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

- `homeImportSourcesScenario=<name>` (URL param, DEV-only) drives Import sources debugger only.
- `connectedSourcesScenario=<name>` and `connectedAppsScenario=<name>` remain separate.
- Import sources debug now uses an explicit debug view model (platforms, runs, connected ids) and does not mutate real Home state.

## Archived design docs (provenance)

- `docs/_archive/260224-home-connector-blocking-and-parallelization.md`
  - Defines blocking vs background run policy and ETA guardrails.
- `docs/_archive/260222-home-connectors-info-message-matrix.md`
  - Defines `infoSlot` line priority and connector status copy rules.
- `docs/_archive/260222-home-available-sources-status-slot.md`
  - Records why volatile status copy moved out of CTA label into top-right slot.

## Notes

- Not part of the grant flow.
