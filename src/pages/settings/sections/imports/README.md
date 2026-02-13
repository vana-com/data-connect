# Settings Import History section

## What this is

- Import history with per-import details and personal server status.
- This is the canonical Import History implementation and is rendered inside Settings.

## Files

- `index.tsx`: section entry for settings.
- `use-imports-section.ts`: reads import records/auth/server status; filters/sorts.
- `components/personal-server-card.tsx`: personal server status card + sign-in CTA.
- `components/run-item/run-item.tsx`: import item card UI.
- `components/run-item/use-run-item.ts`: expansion, ingest, open-folder actions.
- `components/run-item/run-icons.tsx`: status/ingest icon selection.
- `components/run-item/run-item-utils.ts`: date formatting + export data shaping + ingest labels.

## Data flow

- `useImportsSection` reads `state.app.runs`, splits active/finished imports, sorts newest first.
- `useImportsSection` uses `usePersonalServer` + `fetchServerIdentity` to derive server readiness.
- `RunItem` uses `useRunItem` for expand state and ingest actions.
- `useRunItem` invokes `load_run_export_data` and calls `ingestData` when ready.

## App integration

- Rendered from settings `section=imports` in `src/pages/settings/index.tsx`.
- Tauri/IPC: `load_run_export_data`, `open_folder`.
- Personal server: `usePersonalServer`, `fetchServerIdentity`, `ingestData`.

## Notes

- Ingest requires a running personal server, export path, and scope.
- Not part of the grant flow.
