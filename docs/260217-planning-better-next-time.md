# 260217-planning-better-next-time

## Why this exists

We delivered the passport auth conversion, but the path involved too many late fixes and reopened core files.

This doc captures the planning failures and the process upgrades required to reduce loop-back rework on future cross-boundary features.

## What actually hurt

1. Phase closure happened before boundary-hardening was truly done.
2. Known external dependency (param contract freeze) was not treated as a strict gate.
3. Security/authenticity criteria were present, but not enforced as phase exit conditions.
4. Architecture decomposition happened after behavior changes, not before.
5. Core files were reopened repeatedly, indicating the plan slices were too broad or misordered.

## Planning system upgrades (non-optional)

### 1) Invariant-first planning

For auth/grant/connect work, define invariants before implementation:

- callback accept path and request contract
- callback state lifecycle semantics
- durable session allowed fields
- secret handling and persistence boundaries
- external dependency contracts and ownership

If invariants are not explicit, planning is incomplete.

### 2) Gate-based phase completion

A phase is only complete when all are true:

- behavior implemented
- invariant tests for that phase are green
- no open P1 security/reliability findings
- no unresolved dependency hidden in TODO text

If one fails, phase is not done.

### 3) Dependency classification at plan time

Every external dependency gets one label:

- `HARD BLOCKED`: cannot proceed to strict implementation
- `SOFT BLOCKED`: proceed with temporary bounded fallback
- `UNBLOCKED`: safe to implement directly

Require owner + expected resolution date for each blocked item.

### 4) Ordered implementation strategy

Use this default order for high-risk flow rewrites:

1. boundary hardening
2. architecture seams/refactor
3. behavior additions
4. cleanup/deletions
5. observability polish

Reversing this order creates expensive rework.

### 5) Commit quality contract

Each commit must satisfy:

- one dominant reason to exist
- tests proving the reason
- clear rollback boundary
- no hidden second concern

If commit description requires "also", split it.

## Rework early-warning signals

Stop and replan when any trigger appears:

- same core file touched 3+ times in a feature stream
- phase closure doc lands while P1 fixes are still expected
- security boundary discussed as follow-up rather than gate
- external contract still unresolved but strict behavior is being implemented anyway
- commits become "boundary cleanup" batches instead of scoped deltas

## Minimum planning template for cross-repo flow work

Every plan must include these sections:

1. Goal and scope
2. Invariants (security, data, state, lifecycle)
3. External dependencies with hard/soft blocked labels
4. Phase list with explicit exit gates
5. Commit map (ordered)
6. Validation matrix (unit/integration/runtime)
7. Risks and mitigations
8. Out of scope

## PR/closure checklist (before declaring done)

- [ ] All phase gates met, not just behavior complete
- [ ] Blocked dependencies either resolved or explicitly deferred with owner/date
- [ ] No open P1/P2 findings in auth/grant boundaries
- [ ] Closure doc maps each risk to final mitigation status
- [ ] Regression suite run list recorded

## Operating principle

Do not optimize for "feature landed."
Optimize for "feature landed with stable boundaries and minimal follow-up commits."
