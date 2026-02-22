# 260222-sync-on-open-plan

## Goal

Add a Home-page header toggle (`Sync on open`) that controls whether DataConnect automatically runs connector sync for all connected sources when the app opens.

## Scope

In scope:

- Home header UI toggle placement and copy.
- Persisted preference for `syncOnOpen`.
- Startup orchestration that triggers `startImport` for connected platforms.
- Tests for toggle state, persistence, and one-time startup behavior.

Out of scope (v1):

- Retry/backoff scheduling.
- Per-source sync-on-open controls.
- Background sync after app is already open.
- Advanced headless readiness matrix per connector runtime.

## Invariants

1. Manual source import flow must remain unchanged.
2. Startup sync must not duplicate on rerender/StrictMode remount.
3. Startup sync runs only when toggle is enabled.
4. Preference persists in app config (`get_app_config` / `set_app_config`) rather than ad hoc localStorage.
5. Page entry/composition remains in `src/pages/home/index.tsx`; async orchestration moves to a page-local hook.

## Dependencies and block status

- `get_app_config` / `set_app_config` already exist in Tauri commands: `UNBLOCKED`.
- Home already has `usePlatforms`, `useConnector`, connected status, and runs: `UNBLOCKED`.
- Existing `Switch` UI primitive available: `UNBLOCKED`.

## Ordered phases with gates

### Phase 1 — Config contract

Add `syncOnOpen?: boolean` to frontend and Rust app config structures and defaults.

Exit gate:

- Frontend can read and write `syncOnOpen` via app config without runtime errors.

### Phase 2 — Startup orchestration hook

Create a dedicated hook that:

- takes `enabled`, `platforms`, `connectedPlatforms`, and `startImport`;
- waits for platform data availability;
- starts imports for connected platforms only;
- executes once per app session using a guard ref;
- isolates per-platform failures so one connector failure does not abort the rest.

Exit gate:

- With `enabled=true`, startup attempts imports for connected sources once.
- With `enabled=false`, zero startup imports.

### Phase 3 — Home header UI

Add right-side header control next to tabs:

- visible label: `Sync on open`
- switch state bound to persisted config
- change handler writes config immediately
- accessible label describes full behavior

Exit gate:

- Toggle renders in header, reflects persisted value, and updates value when changed.

### Phase 4 — Test coverage

Add/extend tests for:

- toggle render and interaction;
- loading initial state from config;
- persisting preference on toggle;
- startup ON path;
- startup OFF path;
- no duplicate startup run on rerender/remount;
- connected-only source filtering.

Exit gate:

- Home tests pass with explicit assertions for ON/OFF and no-duplication behavior.

## Mandatory File Edit Contract

- `src/pages/home/index.tsx` — `PASS`
- `src/pages/home/index.test.tsx` — `PASS`
- `src/types/index.ts` — `PASS`
- `src-tauri/src/commands/file_ops.rs` — `PASS`
- `src/pages/home/use-home-startup-sync.ts` (new) — `PASS`
- `src/hooks/use-app-config.ts` (new, if extracted) — `PASS`
- `src-tauri/src/lib.rs` — `NO-OP` expected (commands already registered)

`NO-OP` definition for this plan:

- File was scanned during implementation and either already satisfied the requirement or was not needed after wiring was complete.

## Verification commands

- `pnpm test src/pages/home/index.test.tsx`
- `pnpm test`
- `pnpm lint`
- `pnpm build`
- `rg "syncOnOpen" src src-tauri/src`
- `rg "get_app_config|set_app_config" src src-tauri/src`

## Evidence capture template

Use this table in PR/checklist:

| Gate Class | Item | Result (`PASS`/`NO-OP`/`FAIL`) | Evidence |
| --- | --- | --- | --- |
| Code-path | File edit contract rows |  |  |
| Behavior | Startup ON/OFF + no-dup tests |  |  |
| Build | lint/test/build commands |  |  |
| Packaging | N/A for this change unless surfaced |  |  |
| CI | Workflow result for branch |  |  |
| Fresh-clone | N/A unless startup config bootstrap changed |  |  |

Rules:

- A `PASS` row without output summary is invalid.
- A `NO-OP` row without scan proof is invalid.
- Any `FAIL` row blocks merge.

## Risks and mitigations

- Risk: duplicate startup imports.
  - Mitigation: one-time ref guard + explicit rerender/remount test.
- Risk: startup sync before platform readiness.
  - Mitigation: run only after platform list and connection map are loaded.
- Risk: preference drift between UI and persisted config.
  - Mitigation: load from `get_app_config` on mount and write through `set_app_config` on toggle.

## Done criteria (merge blocking)

- No `FAIL` rows in evidence table.
- All required file-contract rows are `PASS` or proven `NO-OP`.
- Behavior gate tests for ON/OFF/no-dup all pass.
- Lint/test/build pass for touched scope.
- No unresolved risk left in final checklist.
