# YYMMDD-<feature-slug>

Use this template as a one doc in two modes:

- Start with Strategy Lock only.
- Don’t implement until lock is stable.
- Then continue in the same file into Execution Contract.
- If strategy changes later, update Strategy delta section (same file).

## Strategy Lock (decide before implementation)

### Goal

What gets built and for whom.

### Scope

- In scope:
- Out of scope:

### Invariants (must remain true)

- Data invariants:
- State/lifecycle invariants:
- Security/reliability invariants:

### Dependencies

List external dependencies and classify each:

| Dependency | Status (`HARD BLOCKED`/`SOFT BLOCKED`/`UNBLOCKED`) | Owner | Target date | Notes |
| ---------- | -------------------------------------------------- | ----- | ----------- | ----- |
|            |                                                    |       |             |       |

### Approach

- Chosen approach:
- Rejected alternatives (and why):

### Replan triggers

- Trigger 1:
- Trigger 2:

## Execution Contract (mechanical handoff)

### Ordered implementation steps

1. Step 1
2. Step 2
3. Step 3

### Mandatory file edit contract

| File           | Required change | Status (`PASS`/`NO-OP`/`FAIL`) | Evidence |
| -------------- | --------------- | ------------------------------ | -------- |
| `path/to/file` |                 |                                |          |

Rules:

- `PASS`: required change implemented.
- `NO-OP`: verified no matching change needed at execution time.
- `FAIL`: required change missing/unclear.

### Verification commands

List exact commands (not paraphrases):

```bash
# legacy pattern scan
rg -n "<pattern>" <paths>

# build/test checks
pnpm run lint
pnpm run test
```

### Gate checklist (all required)

- [ ] Code-path gates passed
- [ ] Behavior/runtime gates passed
- [ ] Build/test/lint gates passed
- [ ] CI/release gates passed (if applicable)
- [ ] Fresh-clone gate passed (if applicable)

### PR evidence table

| Gate | Command/evidence | Expected | Actual summary | Status |
| ---- | ---------------- | -------- | -------------- | ------ |
|      |                  |          |                |        |

### Done criteria

1. No `FAIL` rows in file contract or gate table.
2. All required gates are `PASS`.
3. Scope boundaries remained intact (or strategy delta recorded).

### Strategy delta (only if needed)

Record any change to goal, invariants, dependency status, or chosen approach after implementation starts.
