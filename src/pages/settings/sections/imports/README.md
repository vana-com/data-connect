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

## TODO: Add rerun capability

- Keep history rows informational-first:
  - running: status + stop action
  - terminal states (completed/failed/stopped): status + details
- Do not keep `Run again` integrated into each row.
- Add a top-level `Run again` action strip above the list:
  - one button/chip per previously connected platform (deduped by platform)
  - examples: `ChatGPT`, `Instagram`, etc.
- Button state for top action strip:
  - disable/hide if that platform currently has an active run
  - otherwise `Run again` starts a new run via `startExport(platform)`
- Keep failed details expandable from the failed badge; keep stopped non-expandable.
- Keep stop confirmation for meaningful in-progress runs:
  - confirm when `phase.step > 1` or `itemCount > 0`
  - stop immediately for very early runs

Rationale:

- Per-row rerun mixes history with primary action and creates duplicated buttons when there are multiple terminal rows for one platform.
- A single top action strip matches user intent better: “run ChatGPT again” is a global action, not tied to one specific old row instance.
