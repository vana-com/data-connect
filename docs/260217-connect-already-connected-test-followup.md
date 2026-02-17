# 260217-connect-already-connected-test-followup

## Issue

Failing test:
- `Connect > title and copy > shows '(again)' suffix when platform is already connected`

Observed:
- render shows `data-testid="grant-page"`
- expected `"Connect your ChatGPT (again)"` not found

## Repro

```bash
npx vitest run --maxWorkers=1 src/pages/connect/index.test.tsx
```

## Suspected cause

`src/pages/connect/index.tsx` auto-navigates to `/grant` when `isAlreadyConnected` is true.  
Test expectation likely conflicts with redirect behavior (or race/timing).

## TODO

- Decide expected behavior:
  - immediate redirect to `/grant`, or
  - show `"(again)"` copy first
- Update test(s) and/or implementation to match intended behavior.
- Make assertion deterministic (no redirect race).

## Acceptance criteria

- `src/pages/connect/index.test.tsx` passes reliably in CI/local.
- Behavior is explicitly documented in the test name/assertions.
- No regression in connect-to-grant navigation behavior for already-connected platforms.
