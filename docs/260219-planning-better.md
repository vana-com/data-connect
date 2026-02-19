# 260219-planning-better-next-time

## Why this exists

`260217-planning-better-next-time.md` captured core planning failures from auth flow work.

This follow-up captures what we learned from the pnpm migration planning run:

- how to convert a good strategy doc into an execution doc,
- how to make handoff deterministic,
- how to enforce proof, not trust.

## What still holds from 260217 (keep as-is)

These were correct and remain non-negotiable:

1. Invariant-first planning.
2. Gate-based phase closure.
3. Dependency classification (`HARD BLOCKED` / `SOFT BLOCKED` / `UNBLOCKED`).
4. Ordered implementation (boundary -> seams -> behavior -> cleanup -> polish).
5. Early replan triggers when loop-back signals appear.

No rollback on these principles.

## What 260219 added (new required mechanics)

The missing piece in 260217 was operational precision. We now require:

1. **Mandatory File Edit Contract**
   - Explicit list of files that must be touched.
   - Each file marked `PASS`, `NO-OP`, or `FAIL`.
2. **Targeted verification commands**
   - Concrete grep/rg commands and runtime/build checks.
   - Not just "run tests"; exact commands and expected outcomes.
3. **Evidence template in PR**
   - Table format for gate outcomes.
   - Required artifacts/output summary per gate.
4. **Definition of NO-OP**
   - "No change required" must be proven by scan at execution time.
5. **Done criteria that block merge**
   - Any `FAIL` gate blocks merge, even if feature appears to work.

## Bidirectional takeaways (both docs improve each other)

### 260217 -> migration planning

What helped from 260217 during this run:

- forcing phase gates prevented "looks done" closure,
- dependency handling mindset exposed hidden npm/npx coupling quickly,
- early-warning signals justified expanding scope before implementation.

### migration planning -> 260217 model

What 260217 lacked and should now inherit:

- explicit handoff contract (who changes what files),
- evidence capture format (not freeform notes),
- mechanical pass/fail semantics for each gate.

## Updated planning standard (v2)

Every non-trivial plan must include all of the below:

1. Goal and scope.
2. Invariants.
3. External dependencies with block status + owner/date.
4. Ordered phases with exit gates.
5. Mandatory File Edit Contract.
6. Non-negotiable verification commands.
7. Evidence Capture Template for PR.
8. Done criteria with merge-blocking conditions.
9. Risks and mitigations.
10. Out of scope.

If items 5-8 are missing, the plan is not handoff-safe.

## Gate taxonomy (standardized)

Use these gate classes in all plans:

- **Code-path gates**: target files updated as specified.
- **Behavior gates**: runtime behavior remains correct.
- **Build gates**: local build/test/lint pass.
- **Packaging gates**: release artifacts/runtime packaging integrity.
- **CI gates**: workflow semantics preserved after tooling changes.
- **Fresh-clone gates**: clean environment bootstrap works as documented.

## Evidence quality rules

1. "Pass" without command output summary is invalid.
2. "No-op" without scan evidence is invalid.
3. Flaky gate result is treated as `FAIL` until reproduced.
4. Fix commits must map to failed gates explicitly.
5. Closure statement must map each risk -> final status.

## Replan triggers (expanded)

Stop and replan when any of these occur:

- same core file edited 3+ times,
- new mandatory file discovered mid-implementation,
- gate wording becomes subjective ("seems fine", "probably"),
- evidence table contains unresolved `FAIL` or ambiguous `NO-OP`,
- scope silently expands without updating file contract and gates.

## Practical template snippet (drop into new plan)

Use this block as default:

- Mandatory File Edit Contract: `<list files>`
- Verification Commands: `<exact commands>`
- Evidence Table: `<file contract + command gates + CI/fresh clone gates>`
- Done Criteria:
  - no `FAIL` rows
  - no unresolved risks
  - all gate classes passed

## Operating principle

Do not ship "a good plan."

Ship a plan that can be executed by another engineer with no interpretation drift, and audited by gate evidence.
