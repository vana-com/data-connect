---
title: React Audit + Storage Review (Vercel Patterns) - Feedback
date: 2026-01-30
scope: DataBridge React frontend
---

# React Audit + Storage Review (Vercel Patterns) - Feedback

This document maps feedback to `docs/260130-react-audit-storage-and-vercel-review.md`.
Each section mirrors the original heading and appends `- Feedback`.

## Scope - Feedback

- Scope is accurate for the audit targets listed.
- No change needed.

## Storage scenario: current behavior and risks - Feedback

- We **do** follow the "index key + per-app keys" fallback path now (no O(n) scans, runtime validation).
- We **still do not** implement the "single versioned blob" ideal (`connected_apps_v2`).
- We **still do not** handle quota/`setItem` failures on writes.
- We **do not** implement cross-window/cross-tab sync; intentionally omitted for now.
- Remaining risk: any code that writes directly to `localStorage` (bypassing `storage.ts`) will not notify in-tab listeners.

## Best practical path (summary) - Feedback

- We implemented the **indexed per-key storage** path (matches the “if per-key required” fallback).
- We implemented **reactive subscription** via `useSyncExternalStore` for connected apps.
  - See `docs/260130-react-external-store-subscriptions.md` for the pattern.
  - **Critical**: useState + useEffect subscription is an antipattern. Always use `useSyncExternalStore` for external store subscriptions.
- We did **not** implement the single-blob storage recommendation.
- We did **not** add quota failure handling on writes.
- We intentionally **did not** add cross-window/cross-tab sync.

## Findings: high-impact - Feedback

- **Storage mutation while iterating**: resolved by indexed reads + no scan-mutate behavior.
- **Cross-window sync not handled**: resolved via `subscribeConnectedApps` with `storage` event + in-tab listeners.
- Other high-impact items in the doc remain as-is unless addressed elsewhere.

## Findings: medium-impact - Feedback

- **Async waterfall in Settings**: no longer sequential; requests are fired in parallel with error handling.
- **Derived state stored in state + effect**: addressed via `useMemo` (no effect-stored derived state).
- **Runtime data validation missing**: partially addressed for connected apps via Zod; other areas still pending.

## Findings: low-impact / watchlist - Feedback

- **Cross-window sync not handled**: intentionally not implemented.
- **Async cleanup race (InlineLogin)**: not addressed here.

## Recommended priorities (no code changes) - Feedback

- The priority ordering still makes sense.
- For storage correctness, we are **partially** aligned:
  - ✅ Indexed keys + validation
  - ✅ Store wrapper (`useSyncExternalStore` for connected apps)
  - ❌ Single-blob format
  - ❌ Quota handling
  - ❌ Cross-window/cross-tab sync (intentionally omitted)

## Rule mapping summary - Feedback

- `client-localstorage-schema`, `js-cache-storage`: partially addressed for connected apps.
- `async-parallel`, `rerender-derived-state-no-effect`: addressed for Settings/Home.

## Appendix: files reviewed - Feedback

- No changes to the reviewed file list.

## Clarification: cross-tab vs cross-window sync - Feedback

- **Cross-tab**: updates made in *another browser tab* (same origin) are not reflected here (not implemented).
- **Cross-window**: same as cross-tab; not implemented.
- **Same-tab**: updates made in the *current tab* by `storage.ts` emit a local in-memory event, because `storage` does **not** fire in the same document.
