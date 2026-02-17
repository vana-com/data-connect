# Passport auth conversion fixes closure

## Source
- `docs/plans/260217-passport-auth-conversion-fixes-plan.md`
- `docs/solutions/260217-passport-auth-conversion-phase-1.md`
- `docs/solutions/260217-passport-auth-conversion-phase-2.md`
- `docs/260210-compound-engineering.md`

## Context

Passport auth conversion landed in multiple phases, then needed a closure pass to finish security boundaries, reduce grant-flow complexity, and remove hot-path logging noise while preserving behavior.

## Root cause

- Auth callback and gateway proxy concerns lived in the same command path, which widened review surface area and made hardening harder to reason about.
- `useGrantFlow` mixed bootstrap, state transitions, approval side effects, and server-readiness gating in one place.
- Connect/grant path had info-level logs on normal success paths, making routine runs noisy.
- Strict contract-gated URL param closure depends on upstream auth/grants contract freeze and cannot be safely finalized unilaterally.

## Final fix

### Track A: callback authenticity closure (implemented)
- Callback accept path restricted to `POST /auth-callback` only.
- Callback state validation enforces required, one-time, TTL-bounded state consumption.
- Callback request contract hardened (content type, content length, body read/encoding/json guards).
- Added explicit rejected-callback telemetry path to distinguish rejection reasons.

Commits:
- `e2e63a9`

### Track B: split `start_browser_auth` responsibilities (implemented)
- Extracted proxy routes out of auth callback flow into `src-tauri/src/commands/auth_proxy.rs`.
- Kept `start_browser_auth` focused on auth lifecycle.
- Replaced hardcoded gateway coupling with env-driven gateway URL resolution.
- Added explicit HTTP connect/request timeouts for proxy calls.

Commits:
- `0d1dff9`

### Track C: `useGrantFlow` decomposition (implemented)
- Added pure reducer/state-machine boundary (`grant-flow-machine`).
- Split bootstrap concern into `grant-flow-bootstrap`.
- Split approval side effects into `grant-flow-approve`.
- Extracted personal-server readiness timeout/gating to `use-personal-server-readiness-gate`.
- Added focused tests for machine/bootstrap/approval seam behavior.

Commits:
- `7ab95d6`
- `d0a1cd4`

### Track E: hot-path debug logging cleanup (implemented for connect/grant handoff)
- Gated connect prefetch + grant-navigation info logs behind explicit debug flag:
  - `import.meta.env.DEV && import.meta.env.VITE_DEBUG_GRANT_FLOW === "true"`
- Preserved failure-path warn/error logging.
- Added regression test to ensure normal prefetch flow does not emit `[Connect]` info logs.

Commits:
- `fcd3cbb`

### Track D: strict contract-gated resolution closure (intentionally deferred)
- Deferred until auth/grants owners freeze incoming param contract.
- Plan status updated to blocked pending team agreement.

Commit:
- `16df218`

## Why this approach

- Security-first ordering: close callback authenticity boundary before broader refactors.
- Separation of concerns: move proxy transport out of auth callback flow and isolate grant transition logic behind a reducer boundary.
- Keep behavior stable while reducing cognitive load: decomposition + seam tests protect side-effect ordering and failure semantics.
- Make observability intentional: keep actionable warnings/errors always on, gate high-volume success-path logs behind explicit opt-in debug flag.
- Respect external dependency boundary: avoid shipping strict allowlist behavior before contract freeze to prevent protocol drift.

## Validation run

Previously recorded during phase work:
- `npx vitest run src/pages/grant/use-grant-flow.test.tsx src/hooks/useEvents.test.ts src/lib/storage.test.ts src/hooks/useInitialize.test.ts src/lib/grant-params.test.ts src/pages/home/index.test.tsx`
- `npm run test -- src/lib/start-browser-auth.test.ts src/pages/home/index.test.tsx`
- `npm run test -- src/pages/grant/use-grant-flow.test.tsx src/pages/grant/index.test.tsx src/pages/home/index.test.tsx`
- `npx tsc -b`
- `cargo check --manifest-path src-tauri/Cargo.toml`

Track E closure pass:
- `npx vitest run src/pages/connect/index.test.tsx` (passing: `25` tests)

## Reusable rule extracted

For connect/grant/auth flows, keep success-path logging behind explicit debug flags and reserve always-on logs for warn/error paths that carry actionable failure diagnostics.

## Follow-ups

- Track D: implement strict allowlisted contract-gated param handling only after team agreement/freeze.
- Track A depth (deferred): add full request-level callback rejection regression matrix if needed after contract freeze aligns test fixtures.
