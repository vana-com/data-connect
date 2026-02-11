---
tags: [source-page, refactor, testing]
impact: medium
prevents: "Page-level mixed-responsibility regressions and untested runtime branches."
---

# 260211-source-overview-p3-refactor-learnings

## Context

`src/pages/source/index.tsx` had grown into a mixed-responsibility page (routing, orchestration, Tauri IO, clipboard behavior, and UI rendering in one file). We needed to reduce coupling without overengineering for v0.

## Root cause

- Fast feature additions landed directly in the route entry file.
- No page-local orchestration hook existed, so side effects stayed in JSX files.
- Runtime-specific fallback behavior (Tauri vs browser) created branches that were easy to miss in tests.

## Final fix

- Split route into page-local structure:
  - `src/pages/source/index.tsx` (entry + composition only)
  - `src/pages/source/use-source-overview-page.ts` (orchestration + side effects)
  - `src/pages/source/components/*` (render-only sections)
  - `src/pages/source/utils.ts` + `src/pages/source/types.ts` (pure helpers/types)
- Added/expanded tests to lock behavior:
  - 404 route behavior
  - copy success and copy fallback failure states
  - preview fallback behavior in non-Tauri runtime
  - preview error surfacing in Tauri runtime
  - open-folder fallback path behavior

## Why this approach

- Keeps v0 implementation lean (no provider system, no speculative abstraction).
- Improves maintainability via logic/JSX split and explicit page-local boundaries.
- Preserves existing behavior and classes/styles while reducing merge conflict risk.
- Adds focused tests on high-risk branches instead of broad snapshots.

## Validation run

- [x] `npx vitest run src/pages/source`
- [x] `cargo test --manifest-path src-tauri/Cargo.toml build_source_export_preview`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
- [x] Targeted runtime/manual checks (copy/open/preview states validated in tests and local run flow)

## Reusable rule extracted

When a route file exceeds "entry + composition", move orchestration into one page-local `use-<page>-hook` and keep route entry responsible only for params, guards, and component wiring. Add at least one test for each runtime branch (desktop vs browser fallback) when behavior differs by runtime.

## Follow-ups

- Optionally quiet expected `console.error` output in failure-path tests (`vi.spyOn(console, "error")`) for cleaner CI logs.
- Backfill route README (`src/pages/source/README.md`) once TODO links/features are finalized.
