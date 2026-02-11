---
tags: [runs, url-state, testing]
impact: low
prevents: "UI tests that pass while URL/filter hook behavior is broken"
---

# 260211-runs-filter-by-source

## Context

We added a simple source filter to `src/pages/runs`:

- `All` plus one option per connected source
- source selection hoisted into URL search params (`source`)
- filtering applied to both active and finished run lists

This was planned in `docs/plans/260211-runs-filter-by-source.md`.

## Root cause

The first test update only validated rendered labels on the page by mocking `useRunsPage`.

That can miss regressions in real hook behavior:

- parsing `source` from URL
- invalid-source fallback to `all`
- query-param updates when toggling filters

## Final fix

1. Implemented URL-backed filtering in `useRunsPage`:
   - source options derived from connected platforms
   - selected source derived from query param with invalid-id fallback
   - `setSourceFilter` writes/removes `source` in URL
2. Added focused hook tests in `src/pages/runs/use-runs-page.test.tsx` for:
   - valid source from URL
   - invalid source fallback to `all`
   - URL write/remove behavior for source changes

## Why this approach

- Keeps state model deterministic and shareable via URL.
- Keeps filtering logic centralized in one hook instead of duplicated in page UI.
- Adds behavior coverage at the level where logic actually lives, while keeping page tests lightweight.

## Validation run

- [ ] `bun run check:all`
- [x] `npx vitest run src/pages/runs`
- [x] Lint checks on touched runs test file

## Reusable rule extracted

For URL-backed page behavior, do not rely only on page tests that mock the page hook.

Add at least one focused hook-level test that covers:

- query param -> derived state
- invalid query values -> fallback behavior
- state update -> query param write/remove

### AGENTS.md decision

No mandatory `AGENTS.md` update yet.

Reason: this is useful, but still narrow. Better to keep it as a local solution pattern for now; if it repeats across 2-3 routes, promote it into shared guidance (likely `react-testing` skill or a concise AGENTS rule).

## Follow-ups

- Optional: add an integration test at page level that clicks real filter buttons and asserts list changes without mocking `useRunsPage`.
- Optional: if URL-backed filters become common, add a short test guideline snippet to the testing skill.
