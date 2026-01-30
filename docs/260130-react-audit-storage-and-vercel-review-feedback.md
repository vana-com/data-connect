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
- We **now have** cross-window/cross-tab sync (storage event + in-tab notifier).
- Remaining risk: any code that writes directly to `localStorage` (bypassing `storage.ts`) will not notify in-tab listeners.

## Best practical path (summary) - Feedback

- We implemented the **indexed per-key storage** path (matches the “if per-key required” fallback).
- We implemented **reactive subscription** via `useSyncExternalStore` for connected apps.
  - See `docs/260130-react-external-store-subscriptions.md` for the pattern.
  - **Critical**: useState + useEffect subscription is an antipattern. Always use `useSyncExternalStore` for external store subscriptions.
- We did **not** implement the single-blob storage recommendation.
- We did **not** add quota failure handling on writes.

## Findings: high-impact - Feedback

- **Storage mutation while iterating**: resolved by indexed reads + no scan-mutate behavior.
- **Cross-window sync not handled**: resolved via `subscribeConnectedApps` with `storage` event + in-tab listeners.
- Other high-impact items in the doc remain as-is unless addressed elsewhere.

## Findings: medium-impact - Feedback

- **Async waterfall in Settings**: still sequential; not addressed in this pass.
- **Derived state stored in state + effect**: not addressed in this pass.
- **Runtime data validation missing**: partially addressed for connected apps via Zod; other areas still pending.

## Findings: low-impact / watchlist - Feedback

- **Cross-window sync not handled**: resolved for connected apps.
- **Async cleanup race (InlineLogin)**: not addressed here.

## Recommended priorities (no code changes) - Feedback

- The priority ordering still makes sense.
- For storage correctness, we are **partially** aligned:
  - ✅ Indexed keys + validation + sync
  - ✅ Store wrapper (`useSyncExternalStore` for connected apps)
  - ❌ Single-blob format
  - ❌ Quota handling

## Rule mapping summary - Feedback

- `client-localstorage-schema`, `js-cache-storage`: partially addressed for connected apps.
- `async-parallel`, `rerender-derived-state-no-effect`, etc.: unchanged.

## Appendix: files reviewed - Feedback

- No changes to the reviewed file list.

## Clarification: cross-tab vs cross-window sync - Feedback

- **Cross-tab**: updates made in *another browser tab* (same origin) are reflected here. Implemented via the `storage` event.
- **Cross-window**: same as cross-tab, but across separate windows (same origin). The `storage` event covers both.
- **Same-tab**: updates made in the *current tab* by `storage.ts` emit a local in-memory event, because `storage` does **not** fire in the same document.
