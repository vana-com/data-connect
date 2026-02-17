---
name: react-testing
description: Pragmatic React/Vitest testing workflow for DataConnect. Use when writing or updating React/UI code, deciding what tests to add, running tests for a change, or before commit.
---

# React Testing

## Goal

Validate new behavior without overengineering; run the smallest test set that proves the change works.

## When to use

- Adding/changing React or UI behavior
- Writing or updating tests
- Deciding which tests to run
- Preparing a commit

## Workflow

1. Identify the change scope (page/component/hook).
2. Ensure coverage:
   - If tests exist for that area, update them to cover the new behavior.
   - If no tests exist, add a minimal test for the new behavior (no snapshots).
3. Run scoped tests first (not the full suite).
4. If scoped tests pass, stop unless broader coverage is requested.
5. If unrelated failures show up in a full suite, report and stop; do not fix unless asked.
6. Before commit, re-run the scoped tests and ensure green.

## Commands (Vitest)

- Single file: `npx vitest run src/pages/runs/index.test.tsx`
- Folder: `npx vitest run src/pages/runs`
- Test name: `npx vitest run -t "hides tabs when browser is not ready"`

## Testing style

- Use React Testing Library.
- Assert on user-visible output and accessible roles/labels.
- Prefer `getByRole`/`getByText`; use `*AllBy*` only when multiples are expected.
- Avoid snapshots and brittle DOM structure checks.
- For expected error-path tests, spy on `console.error` and assert calls to keep test output clean while preserving coverage.

## URL state coverage gate

If a change introduces URL-backed UI state (for example `useSearchParams`, `location.search`, or `URLSearchParams`), require at least one non-mocked behavior test that covers:

- query param -> derived state
- invalid query value -> fallback behavior
- state change action -> query param write/remove

Do not treat a page test that mocks the page hook as sufficient coverage for URL state logic.

## Reporting

- Always state which tests ran and their result.
- If tests were not run, say why.
