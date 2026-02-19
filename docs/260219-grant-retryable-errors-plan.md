# Grant Retryable Errors Plan

## Goal

Show `Try Again` only for retryable grant failures. For non-retryable failures, show only `Return home`.

## Scope

- `src/pages/grant/types.ts`
- `src/pages/grant/use-grant-flow.ts`
- `src/pages/grant/index.tsx`
- `src/pages/grant/components/grant-error-state.tsx`
- `src/pages/grant/use-grant-flow.test.tsx`
- `src/pages/grant/index.test.tsx`

## Implementation

1. Add `retryable?: boolean` to `GrantFlowState` (error state metadata).
2. At each `status: "error"` write in `use-grant-flow.ts`, set `retryable`.
3. Pass `retryable` from `Grant` page into `GrantErrorState`.
4. Gate error CTAs in `GrantErrorState`:
   - `retryable === true` -> show `Try Again` + `Return home`
   - otherwise -> show only `Return home`

## Retryability Rules

- `retryable: false`
  - missing session ID / secret
  - session expired
  - builder verification hard fail
- `retryable: true`
  - session relay/network failures
  - grant create/approve failures
  - personal server startup/tunnel failures

## Test Plan

1. Unit test flow state: error transitions include correct `retryable` value.
2. UI test `GrantErrorState`: Retry button appears only when `retryable === true`.
3. Regression check:
   - expired session -> no Retry
   - tunnel timeout -> Retry visible
   - builder verification fail -> no Retry
   - transient relay failure -> Retry visible

## Notes

- Keep change surface minimal: one boolean only, no broad error taxonomy.
- Current runtime always returns home via `declineHref`; no external decline route in production flow.
