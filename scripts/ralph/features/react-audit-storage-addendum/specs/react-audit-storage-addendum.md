# React Audit Storage Addendum (Connected Apps)

## Source

- `docs/260130-react-audit-storage-and-vercel-review-feedback.md`

## Goals

- Finalize connected-apps storage policy (per-key + index; no single-blob v2)
- Harden storage writes against quota/blocked failures (fail soft, log)
- Keep one subscription surface for connected apps (store API + `useSyncExternalStore`)
- Preserve same-tab reactive updates without adding cross-tab/window sync

## Constraints

- React frontend only (`src/`)
- Preserve existing styles and classes
- Don’t overwrite existing comments
- No UX changes beyond storage hardening
- Do not modify the completed `react-audit-storage` feature pack

## Acceptance criteria

- All connected-apps writes are guarded; quota/blocked failures do not throw (log + no-op)
- Storage strategy is explicitly documented as per-key + index (no single-blob v2)
- `subscribeConnectedApps` remains the single subscription surface; consumers use `useSyncExternalStore`
- Same-tab updates are reactive; cross-tab/window sync is explicitly out of scope
