# Connect Refactor + Validation

## Context

This change set refactors the connect flow for readability/safety and hardens runtime event handling after UX regressions around busy-state messaging and route behavior.

## What changed

### Connect page structure

- `src/pages/connect/index.tsx`
  - reduced to page composition + JSX only
- `src/pages/connect/use-connect-page.ts`
  - moved route orchestration, query parsing, prefetching, connector run lifecycle, and navigation effects
- `src/pages/connect/connect-run-status.ts`
  - central busy CTA mapping from run phase/status
- `src/pages/connect/connect-copy.ts`
  - title/CTA/data-label copy helpers
- `src/pages/connect/README.md`
  - updated file map

### Behavior updates

- Busy CTA now reflects connector phases (checking/downloading/opening/collecting) instead of stale generic text.
- Home -> `/connect` no longer auto-bounces to `/grant` when there is no grant `sessionId`.
- Auto-skip to `/grant` still works for deep-link/session flows when already connected.

### Event pipeline hardening

- `src/hooks/useEvents.ts`
  - added `WAITING_FOR_USER` and `RUNNING` handling
  - narrowed log noise to dev-only where appropriate
  - added runtime guard `isExportedData(...)` for unknown payloads
  - extracted shared `persistAndDeliverExport(...)` path to remove duplicated persistence/delivery logic
  - deduped persistence by `runId` to avoid duplicate writes from overlapping completion events
  - switched delivery-in-progress gate to `useRef` for stability across effect lifecycles
  - typed `invoke<string>("write_export_data", ...)`
  - replaced placeholder export size (`0`) with serialized payload length

### Rust event contract fix

- `src-tauri/src/commands/download.rs`
  - changed emitted event name from `export-complete` to `export-complete-rust`
  - avoids payload-shape collision with connector runtime `export-complete`

## Risk notes

- Kept canonical grant URL behavior (`sessionId`, `appId`, `scopes`, and `secret`) unchanged by design.
- Highest-risk area was event contract overlap between Rust download and connector runtime completion events; that is now separated by event name.

## Validation run

### Automated tests

- `npm run test -- src/pages/connect/index.test.tsx` ✅
- `npm run test -- src/pages/home/index.test.tsx src/hooks/use-deep-link.test.tsx` ✅

### Smoke checklist (behavior-level)

- Home -> Connect route remains reachable without forced redirect ✅
- Deep-link/session path can still reach Connect and proceed to Grant ✅
- Busy CTA updates with connector-phase messaging during active run ✅
- Connected-source auto-skip only applies to session-driven grant flows ✅

## Rollback plan

If regressions appear:

1. Revert this change set commit as a single unit.
2. Keep only the busy CTA UX fix commit (`b0db676`) while reworking structural extraction in smaller slices.

