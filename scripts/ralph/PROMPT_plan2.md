0a. Study `__FEATURE_ROOT__/specs/*` to learn feature goals, constraints, and acceptance criteria.
0b. Study `__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md` (if present) and treat it as fallible input.
0c. Study the relevant source code across the repository (do not assume a single runtime/layer owns behavior).
0d. Study repo guidance files (for example `AGENTS.md`) for architecture/rules/validation commands.

1. Produce or update `__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md` as a **phase-gated execution blueprint** (not a backlog list).

REQUIRED OUTPUT SHAPE (strict):
- A "Phase Derivation" section:
  - infer phases from `specs/*`
  - if phases already exist in specs/docs, preserve and align to them
  - if phases do not exist, define them explicitly from requirements
- For each phase, include:
  - Objective
  - In-scope outcomes
  - Code ownership (`file` + symbol/function/module names)
  - Concrete edits to perform (implementation-level, not generic advice)
  - Tests to add/update (exact test files + cases)
  - Entry criteria
  - Exit gate (binary pass/fail criteria)
  - Dependencies/blockers
  - Rollback/compat notes for risky migrations
- Include a "Spec -> Code Ownership -> Planned Change" mapping table.
- Include a "Dependency Graph" section (`must precede`, `can parallelize`).
- Include a "Slice Plan" section with ordered, reviewable implementation slices.
- Include a "Slice Validation Matrix" section that maps each slice to:
  - minimal commands required pre-commit
  - full boundary checks required at phase completion
- Include a "Validation Commands" section with exact commands and expected outcomes.
- Include an "Open Questions / External Blockers" section.
- Include a "Plan DoD Checklist" section that confirms completeness of this document.

2. Base every plan item on verified code evidence:
- For each item, cite actual existing files/symbols.
- If functionality already exists, mark as complete or partially complete with rationale.
- If missing, confirm absence by search before planning.
- Prefer surgical changes over broad rewrites unless a rewrite is justified by explicit gate criteria.

3. Enforce these planning constraints:
- Plan only. Do NOT implement.
- Keep the plan technology-agnostic and project-agnostic; derive specifics from local `specs/*` + code evidence.
- Explicitly identify boundary contracts (input validation, state transitions, persistence, and security-sensitive handling) as required by the local specs.

4. Ensure this is executable by loop slices:
- Provide an implementation sequence that can be landed in small reviewable slices.
- Each slice must map to at least one exit-gate test.
- If a slice cannot be validated in isolation, explain why and define the smallest safe integration slice.
- For legacy-removal phases, define an explicit canonical replacement decision rule before deletion begins.

FINAL SELF-CHECK (mandatory before finishing):
- If output is only a prioritized task list, rewrite into the required phase blueprint format.
- If any phase lacks binary exit criteria or test proof, rewrite that phase.
- If ownership is ambiguous for a planned change, resolve or record explicitly as an open blocker.
- If any phase exit gate allows TODO/skip/pending assertions for phase-critical contracts, rewrite that gate as FAIL-until-passing.

IMPORTANT:
- Do not output "remaining tasks only" bullets.
- Do not produce high-level fluff.
- If the current plan format is weak, replace it with this required structure.
