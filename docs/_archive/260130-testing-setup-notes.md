# Testing setup notes (Vitest only for now)

Status: decision deferred on UI tests.

TL;DR:
- Vitest = runner + assertions
- jsdom/happy‑dom = fake browser environment
- Testing Library = render/query helpers for UI tests

## What we have today

- Vitest is installed and configured in `vite.config.ts`.
- `test` script runs `vitest run`.
- `jsdom` is installed and `test.environment` is set to `jsdom`.

## What this means

- Vitest is the test runner and assertion framework.
- `jsdom` provides a fake browser environment for DOM APIs. It is only needed
  if we run tests that touch DOM APIs (React components, browser code).
- We are not committing to UI tests yet.

## Decision deferred

We are deferring UI/component testing. If we decide to add UI tests later:

- Keep Vitest as the runner (already in place).
- Choose a DOM environment:
  - `jsdom` (feature-rich, heavier)
  - `happy-dom` (faster, less complete)
- Optionally add a render helper:
  - React Testing Library for component tests
  - Or React Test Renderer for snapshot-only tests

If we never add UI tests, we can remove the DOM environment later.
