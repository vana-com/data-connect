# Runs page

## What this is

- Export run history with per-run details and personal server status.

## Files

- `index.tsx`: page layout, empty state, run list.
- `use-runs-page.ts`: reads runs/auth/server status; filters/sorts.
- `components/personal-server-card.tsx`: personal server status card + sign-in CTA.
- `components/run-item/run-item.tsx`: run card UI.
- `components/run-item/use-run-item.ts`: expansion, ingest, open-folder actions.
- `components/run-item/run-icons.tsx`: status/ingest icon selection.
- `components/run-item/run-item-utils.ts`: date formatting + export data shaping + ingest labels.

## Data flow

- `useRunsPage` reads `state.app.runs`, filters out `running`/`pending`, sorts newest first.
- `useRunsPage` uses `usePersonalServer` + `fetchServerIdentity` to derive server readiness.
- `RunItem` uses `useRunItem` for expand state and ingest actions.
- `useRunItem` invokes `load_run_export_data` and calls `ingestData` when ready.

## App integration

- Route: `/runs` (lazy from `App.tsx`).
- Entry points: Home, YourData, TopNav.
- Tauri/IPC: `load_run_export_data`, `open_folder`.
- Personal server: `usePersonalServer`, `fetchServerIdentity`, `ingestData`.

## Behavior

- Shows empty state when there are no finished runs.
- Run cards show status, timestamp, item counts, and actions (open folder, ingest, expand).
- Expanding loads conversations or shows an empty message.

## Notes

- Ingest requires a running personal server, export path, and scope.
- Not part of the grant flow.
