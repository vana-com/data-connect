# Import History terminology follow-ups

## Purpose

Capture remaining naming mismatches after renaming Settings `runs` to `imports`.
This list is ordered by user-facing impact first, then internal consistency.

## Current state

- User-facing Settings section now uses **Import History** and `section=imports`.
- Internal data model still uses `Run`/`runs` and export-oriented names in several places.

## Rename candidates

| Current | Suggested | Surface | Priority | Notes |
| --- | --- | --- | --- | --- |
| `canAccessDebugRuns` | `canAccessImportHistory` | Internal + UI copy | P1 | Variable name no longer matches label "Import history". |
| `RunItem` | `ImportHistoryItem` | Internal component API | P2 | Improves section-level readability. |
| `run-item/*` path | `import-item/*` or `import-history-item/*` | Internal file structure | P2 | Keep alias exports if needed during migration. |
| `setRuns`, `state.app.runs` | `setImports`, `state.app.imports` | Core state model | P1 | Broadest impact; do separately with compatibility reducers/selectors. |
| `Run` type | `ImportRecord` (or `ImportRun`) | Core domain type | P1 | Prefer `ImportRecord` if this is history-centric; `ImportRun` if process-centric. |
| `startExport`/`stopExport` | `startImport`/`stopImport` | Hook/service API | P1 | User language now says import; API should match. |
| `load_run_export_data` (Tauri cmd) | `load_import_data` | Rust/IPC boundary | P2 | Keep old command as temporary alias for one release cycle if needed. |
| `write_export_data` (comments/docs refs) | `write_import_data` | Rust/IPC + docs | P2 | Rename with command aliases to reduce breakage risk. |
| `getLastRunLabel` | `getLastImportLabel` | Internal UI helper | P3 | Low risk cleanup. |
| "Debug runs" (if still present anywhere) | "Import history" / "Import diagnostics" | User copy | P1 | Ensure UI copy is consistent with section name. |

## Migration strategy

1. **User-facing copy first** (already done for Settings section).
2. **Component/module naming** (`RunItem`, folder names) in a no-behavior refactor.
3. **State/type/API renames** with compatibility adapters:
   - temp aliases in selectors/actions/IPC commands
   - remove aliases in a later cleanup pass.

## Recommendation

- Do a dedicated **domain rename pass** for `Run`/`runs`/`startExport` next.
- Keep it isolated from feature work and guard with targeted tests around:
  - start/stop process
  - history filtering
  - ingest flow
  - saved-history load on startup.
