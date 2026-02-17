# Passport auth conversion phase 2 (Commit A + B closure)

## Source
- `docs/plans/260214-passport-auth-conversion-plan.md`
- `docs/solutions/260217-passport-auth-conversion-phase-1.md`

## What shipped
- Completed deep-link normalization and grant param passthrough hardening:
  - preserved non-canonical launch params for forward compatibility
  - stabilized contract-gated param signatures to include value changes
  - retained explicit TODO guardrails while upstream launch-complete contract finalizes
- Completed durable auth session hardening:
  - persisted only minimal auth identity (`user.id`, `email?`, `walletAddress`)
  - removed `masterKeySignature` from durable storage (memory-only runtime use)
  - added startup hydrate validation + stale/invalid session eviction
  - ensured logout-cleared session semantics remain enforced
- Closed unauthenticated grant resume gap without reintroducing secret-at-rest:
  - grant redirect route persistence strips `secret`
  - added process-scoped in-memory pending-secret bridge (`sessionId` keyed, TTL)
  - resumed grant approval after login in same process without URL/localStorage secret persistence
- Added auth-complete idempotency guard updates (including email changes) and expanded regression coverage for all above paths.

## Intentional behavior (explicit tradeoff)
- Pending grant secret recovery is **process-scoped and ephemeral**:
  - never persisted to URL/localStorage/disk
  - available only for same-process auth-return resume
  - if app fully restarts before auth return, auto-resume loses secret and requester must restart approval
- This is intentional to avoid secret-at-rest risk. Restart-safe resume, if required later, should use OS secure storage/tokenization.

## Validation run
- `npx vitest run src/pages/grant/use-grant-flow.test.tsx src/hooks/useEvents.test.ts src/lib/storage.test.ts src/hooks/useInitialize.test.ts src/lib/grant-params.test.ts src/pages/home/index.test.tsx`
- Result: passing (`6 files`, `54 tests`)

## Phase status
- Commit A scope: complete
- Commit B scope: complete
- Remaining external dependency: final strict URL-only grant resolution still waits on upstream launch-complete param contract confirmation.
