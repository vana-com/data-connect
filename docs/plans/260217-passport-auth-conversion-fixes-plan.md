# Passport auth conversion fixes plan

## Source

- Original plan: `docs/plans/260214-passport-auth-conversion-plan.md`
- Phase checkpoints:
  - `docs/solutions/260217-passport-auth-conversion-phase-1.md`
  - `docs/solutions/260217-passport-auth-conversion-phase-2.md`
- Review inputs:
  - last 13 commits on `callum1/bui-178-refactor-connectgrant-flow-in-dc`
  - follow-up fixes:
    - `9f06b38` callback state one-time enforcement
    - `3f55eae` session-scoped grant prefetch handoff

## Goal

Close remaining auth/grant hardening and maintainability items for the passport conversion work so the feature is both secure and safe to iterate on.

## Status (as of 2026-02-17)

- New fixes landed:
  - callback state is now required and one-time consumed
  - connect -> grant prefetch handoff no longer relies on `location.state`
- Remaining closure work is grouped into 5 tracks (A-E below).

## Work tracks

### A) Callback authenticity closure (security)

**Priority:** P1  
**Status:** Partially complete

Scope:

- Keep current one-time callback state enforcement.
- Restrict callback accept path to `POST /auth-callback` only (remove `POST /` acceptance).
- Add callback-state TTL expiration and explicit rejected-callback telemetry path.
- Add strict callback request validation (content type/body guardrails).
- Terminology: avoid calling this "cryptographic verification"; this track is callback-state binding, replay resistance, and request-contract hardening.

Acceptance:

- Missing/invalid/replayed/expired state never reaches `auth-complete`.
- Valid callback succeeds exactly once.
- Regression tests cover all of the above.

### B) Split `start_browser_auth` responsibilities

**Priority:** P2  
**Status:** Open

Scope:

- Extract auth callback flow from gateway/server proxy endpoints.
- Move registration proxy handlers (`/register-server`, `/deregister-server`, `/check-server-url`, `/server-identity`) to a dedicated module or remove if obsolete.
- Remove hardcoded gateway URL from auth command path.
- Add explicit HTTP timeouts for proxy calls.

Acceptance:

- `start_browser_auth` is focused on auth lifecycle only.
- Proxy code no longer increases auth review surface area.

### C) `useGrantFlow` decomposition

**Priority:** P2  
**Status:** Open

Scope:

- Preserve behavior; reduce cognitive load by splitting concerns:
  - grant bootstrap (claim/verify/prefetch resolution)
  - approval/persistence actions
  - personal-server readiness gate/timeouts
- Introduce a reducer/state-machine boundary for transition logic.

Acceptance:

- Hook size and mixed concern density are materially reduced.
- Existing grant-flow tests remain green, plus transition-focused tests added.

### D) Strict contract-gated resolution closure

**Priority:** P2  
**Status:** Open (external dependency + local closure work)

Scope:

- Finalize param contract with upstream auth/grants owners.
- Replace open-ended non-canonical passthrough with strict allowlisted behavior once contract is frozen.
- Keep any compatibility toggle explicit and temporary.

Acceptance:

- Grant URL param handling is deterministic and explicitly bounded.
- TODO-deferred contract gate is removed or moved behind an explicit, scoped fallback flag.

### E) Hot-path debug logging cleanup

**Priority:** P3  
**Status:** Open

Scope:

- Reduce high-volume logging in hot paths (`useGrantFlow`, connect/grant handoff paths).
- Gate verbose logs behind dev/debug flag; keep actionable warn/error logs.

Acceptance:

- Normal runs stay readable.
- Failure diagnostics remain sufficient without noisy info logs.

## Execution order

1. **A** callback authenticity closure (blocker)
2. **B** split `start_browser_auth`
3. **D** strict contract-gated resolution closure
4. **C** `useGrantFlow` decomposition
5. **E** logging cleanup

## Test plan (closure pass)

1. Callback state tests: missing, invalid, replay, expired, valid-once.
2. Auth callback route tests: accepts only intended endpoint.
3. Grant flow regression suite:
   - `src/pages/grant/use-grant-flow.test.tsx`
   - `src/pages/connect/index.test.tsx`
   - `src/pages/grant/index.test.tsx`
4. Grant param contract tests:
   - non-canonical allowlist behavior and strict-mode behavior.
5. Smoke test end-to-end:
   - logged-out allow -> auth -> resume -> approve success
   - restart during auth return path behaves as designed (ephemeral secret tradeoff intact).

## Out of scope

- New feature behavior beyond closure for current passport conversion scope.
- Replacing process-scoped ephemeral secret/prefetch with durable secure-storage design.
