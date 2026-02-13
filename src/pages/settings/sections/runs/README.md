# Settings Runs section

## What this is

- Export run history with per-run details and personal server status.
- This is the canonical Runs implementation and is rendered inside Settings.

## Files

- `index.tsx`: section entry for settings.
- `use-runs-section.ts`: reads runs/auth/server status; filters/sorts.
- `components/personal-server-card.tsx`: personal server status card + sign-in CTA.
- `components/run-item/run-item.tsx`: run card UI.
- `components/run-item/use-run-item.ts`: expansion, ingest, open-folder actions.
- `components/run-item/run-icons.tsx`: status/ingest icon selection.
- `components/run-item/run-item-utils.ts`: date formatting + export data shaping + ingest labels.

## Data flow

- `useRunsSection` reads `state.app.runs`, splits active/finished runs, sorts newest first.
- `useRunsSection` uses `usePersonalServer` + `fetchServerIdentity` to derive server readiness.
- `RunItem` uses `useRunItem` for expand state and ingest actions.
- `useRunItem` invokes `load_run_export_data` and calls `ingestData` when ready.

## App integration

- Rendered from settings `section=runs` in `src/pages/settings/index.tsx`.
- Tauri/IPC: `load_run_export_data`, `open_folder`.
- Personal server: `usePersonalServer`, `fetchServerIdentity`, `ingestData`.

## Notes

- Ingest requires a running personal server, export path, and scope.
- Not part of the grant flow.
