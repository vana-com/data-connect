# Runs page

## What this is

- Export run history for data connectors.
- Shows completed runs and details, plus the personal server status card.

## Files

- `runs-page.tsx`: page shell and layout.
- `use-runs-page.ts`: page-level state (runs list, server status, identity).
- `run-item.tsx`: presentational card for a single run.
- `use-run-item.ts`: run item logic and side effects (expand, ingest, open folder).
- `run-utils.ts`: pure helpers (date formatting, export data transform, ingest label).
- `run-icons.tsx`: status/ingest icon selection (JSX only).
- `personal-server-card.tsx`: personal server status card.

## Data flow

- `useRunsPage` reads `state.app.runs` and derives `finishedRuns`.
- `RunItem` renders a single run card.
- On expand, `useRunItem` loads export data via Tauri:
  - `invoke("load_run_export_data", { runId, exportPath })`
- Ingest sends the export payload to the personal server when available.

## App integration

- Route: lazy-loaded at `/runs` from `App.tsx`.
- Entry points: Home, YourData, and TopNav link to `/runs`.
- State: consumes `state.app.runs` written by export/connector flows.
- Tauri: loads export data and opens the export folder.
- Personal server: uses `usePersonalServer` + `fetchServerIdentity` for status and `ingestData` for ingest.

## Behavior

- Filters out `running` and `pending` runs in the list.
- Shows status, timestamp, item count, and action buttons.
- Supports:
  - Stop (for running runs)
  - Open folder (when export path exists)
  - Ingest (when personal server is ready)
  - Expand to view conversations (lazy loaded)

## Notes

- `use-run-item.ts` is logic-only (no JSX) to keep TS inference stable.
- Use kebab-case for filenames; React components remain PascalCase.
