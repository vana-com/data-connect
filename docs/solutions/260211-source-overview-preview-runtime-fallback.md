---
tags: [source-overview, tauri, preview, runtime-fallback, testing]
impact: medium
prevents: "source preview regressions between Tauri and localhost"
---

# 260211-source-overview-preview-runtime-fallback

## Context

The source overview page moved from a stub JSON panel to a real preview flow backed by Tauri commands. During iteration, localhost behavior regressed and the page stopped showing useful preview content outside Tauri. We also saw action parity issues (`Open file` button vs sidebar path link) and copy feedback risks.

## Root cause

- Runtime assumptions leaked into UI flow: preview loading treated all command failures as hard errors.
- Action paths diverged during rapid iteration (`Open file` and sidebar link took different branches).
- Clipboard fallback path was not explicitly validated in tests.

## Final fix

- Added Tauri-backed source preview commands:
  - `load_latest_source_export_preview(company, name, max_bytes?)`
  - `load_latest_source_export_full(company, name)`
- Source page now:
  - loads truncated preview for UI,
  - supports full-copy action,
  - supports open-file action,
  - keeps MCP button disabled (stub),
  - shows footer metadata.
- Added non-Tauri fallback behavior:
  - on preview command failure in browser runtime, render fallback preview content instead of hard error state.
- Unified file-open behavior:
  - `Open file` button and sidebar path link both use the same `handleOpenSourcePath` path.
- Standardized open behavior via shared libs:
  - `src/lib/open-resource.ts`
  - `src/lib/tauri-paths.ts`
- Added tests:
  - `src/pages/source/index.test.tsx`
  - verifies browser fallback preview rendering
  - verifies sidebar link and Open file button share open behavior.

## Why this approach

- Keeps Tauri-first behavior where it matters (real file system access).
- Preserves localhost/dev usefulness without pretending browser has native file system parity.
- Uses lightweight guardrails instead of over-abstracting a still-evolving page.

## Validation run

- [ ] `npm run lint`
- [ ] `npm run test`
- [x] `cargo check -q` (Rust commands compile)
- [x] Targeted runtime/manual checks (Tauri file open + localhost fallback preview)
- [x] Targeted tests for regression-prone behavior (`src/pages/source/index.test.tsx`)

## Reusable rule extracted

Added to `AGENTS.md`:

- For URL/local path opening, use `src/lib/open-resource.ts` + `src/lib/tauri-paths.ts` and avoid inline runtime/OS branching in page components.

## Follow-ups

- Tighten copy feedback semantics (don’t show “Copied” if fallback copy fails).
- Consider preview generation that avoids full pretty-serialization before truncation for very large exports.
- Add source-page test coverage for copy error state transitions.
