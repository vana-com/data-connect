# 260217-passport-auth-rebuild-plan

## Goal

Recreate the passport auth conversion from a clean `main` branch in a way that is easier to review, easier to validate, and less likely to require late rework.

This plan assumes current feature behavior is mostly correct, and uses this branch as implementation reference while producing a cleaner, tighter commit history.

## Branching strategy (keep current work as reference)

Use the current feature branch as a read-only reference source and start a fresh implementation branch from `main`.

Recommended sequence:

1. Keep current branch intact (no force rewrites).
2. Update local `main` from `origin/main`.
3. Create new branch from updated `main`:
   - `callum1/bui-178-passport-auth-conversion-rebuild`
4. Implement from this plan, validating each phase gate before moving forward.
5. Use the previous feature branch for side-by-side reference and selective reuse where it reduces risk.

Example commands:

```bash
git checkout main
git pull --ff-only origin main
git checkout -b callum1/bui-178-passport-auth-conversion-rebuild
```

Optional local reference tag on current branch before switching:

```bash
git tag bui-178-passport-auth-conversion-reference
```

## Reference usage policy (explicitly allowed)

This rebuild is not "greenfield from memory." It is a clean-history re-implementation with bounded reuse of known-good behavior.

Allowed reference modes:

- read-only diffing against prior feature branch
- selective cherry-pick of isolated, test-backed commits/chunks
- copying small implementation fragments when invariant-compatible

Not allowed:

- cargo-cult bulk copy without phase-gate validation
- importing legacy coupling just because it already exists

Rule: reuse is good when it shortens path to a validated phase exit gate.

## Constraints

- External auth/grants contract is partially outside this repo.
- Strict allowlisted URL param handling is blocked until contract freeze upstream.
- Security boundaries must be first-class completion criteria, not post-feature fixes.
- No secret-at-rest persistence for grant secret unless explicitly designed with secure storage.

## Existing patterns and references

- Original plan: `docs/plans/260214-passport-auth-conversion-plan.md`
- Fixes follow-up: `docs/plans/260217-passport-auth-conversion-fixes-plan.md`
- Phase checkpoint docs:
  - `docs/solutions/260217-passport-auth-conversion-phase-1.md`
  - `docs/solutions/260217-passport-auth-conversion-phase-2.md`
- Closure: `docs/solutions/260217-passport-auth-conversion-fixes-closure.md`

## Proposed approach (phase-gated)

### Phase 0: Freeze invariants first (no feature behavior changes)

Deliverables:

- One short invariant section in this doc for:
  - callback acceptance contract (`POST /auth-callback` only)
  - callback state semantics (required, one-time, TTL)
  - session persistence boundary (allowed fields only)
  - grant secret boundary (ephemeral/process-scoped only)
- Explicit blocked item: strict URL allowlist waits for external contract freeze.
- Add or update tests that encode these invariants.

Exit gate:

- Invariants are codified and test-backed before functional refactors continue.

### Phase 1: Auth callback boundary hardening

Deliverables:

- Keep auth callback lifecycle isolated from proxy/gateway endpoints.
- Enforce request contract checks and replay/expiration protections.
- Add explicit rejection telemetry reasons.

Exit gate:

- Abuse-path tests pass: missing/invalid/replayed/expired/valid-once.
- Valid callback transitions happen exactly once.

### Phase 2: Grant-flow architecture before behavior additions

Deliverables:

- Introduce reducer/state-machine seam for transitions.
- Split bootstrap, approval side effects, and readiness gating modules.
- Keep behavior stable while reducing mixed concern density.

Exit gate:

- Transition-focused tests pass.
- Core hook complexity reduced and responsibilities separated.

### Phase 3: Durable auth + resume semantics

Deliverables:

- Persist minimal durable auth identity only.
- Hydrate on startup with stale/invalid eviction.
- Preserve pending grant resume with process-scoped secret bridge.

Exit gate:

- Restart/login/logout/resume scenarios tested and green.
- No secret-at-rest introduced.

### Phase 4: Deep-link normalization and contract gate

Deliverables:

- Normalize launch param intake and canonical internal payload shape.
- Keep temporary compatibility path explicit and bounded.
- Implement strict allowlisted behavior only after upstream contract freeze.

Exit gate:

- Deterministic param parsing tests pass.
- Blocked strict-mode item stays explicitly tracked if still unresolved.

### Phase 5: Legacy removal and observability polish

Deliverables:

- Remove legacy auth surfaces and obsolete build wiring.
- Gate hot-path info logs behind explicit debug flag.
- Keep warn/error logs always on.

Exit gate:

- No dead references.
- Regression tests confirm expected non-noisy logs in normal flow.

## Workstream sequence (illustrative, not prescriptive)

Use this as ordering guidance, not a required set of exact commits:

1. Add/lock invariant tests.
2. Isolate auth callback boundary responsibilities.
3. Harden callback request and state semantics.
4. Decompose grant flow seams (machine/bootstrap/approve/readiness).
5. Add durable auth lifecycle and resume semantics.
6. Normalize deep-link intake and bounded compatibility behavior.
7. Remove legacy surfaces and clean observability defaults.
8. Write closure doc with unresolved external dependency status.

Implementation freedom:

- number of commits per step can vary
- naming can vary
- file boundaries can vary

Non-negotiable constraint: each merged step must satisfy its phase exit gate and keep the relevant tests green.

## Ralph-loop fit

This is a strong Ralph-loop candidate if the loop is configured to optimize for phase gates (invariants + tests), not raw throughput.

Recommended loop framing:

- Input: this plan + prior branch as reference + explicit invariants.
- Loop unit: one phase-gated slice at a time.
- Review lens: boundary correctness, dependency status, and rework risk.
- Stop condition: gate satisfied, tests green, no hidden P1/P2 boundary debt.

## Risk register

- **R1 External contract drift**: strict param allowlist may diverge from web behavior.
  - Mitigation: keep strict path blocked and explicit until owners freeze contract.
- **R2 Security regression during refactor**: callback checks may be loosened inadvertently.
  - Mitigation: keep abuse-path matrix in fast test lane.
- **R3 Resume flow fragility**: login return path can break if secret handling leaks across boundaries.
  - Mitigation: test same-process resume and restart semantics separately.

## Validation checklist

- [ ] `npx vitest run src/pages/grant/use-grant-flow.test.tsx`
- [ ] `npx vitest run src/hooks/useEvents.test.ts src/hooks/useInitialize.test.ts`
- [ ] `npx vitest run src/lib/storage.test.ts src/lib/grant-params.test.ts`
- [ ] `npx vitest run src/pages/connect/index.test.tsx src/pages/home/index.test.tsx`
- [ ] `npx tsc -b`
- [ ] `cargo check --manifest-path src-tauri/Cargo.toml`

## Out of scope

- Unilaterally finalizing strict upstream auth/grants contract without cross-repo sign-off.
- Restart-safe secure secret persistence design (requires dedicated secure storage design work).
