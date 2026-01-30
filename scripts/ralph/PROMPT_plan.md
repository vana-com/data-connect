0a. Study `__FEATURE_ROOT__/specs/*` to learn the feature requirements and
contracts.

0b. Study `__FEATURE_ROOT__/DOCS_INDEX.md` (if present) for architecture context.

0c. Study `__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md` (if present; it may be
incorrect) to understand what's already planned.

0d. Study relevant repo code to understand current implementation state (do not
assume not implemented). Prefer existing patterns/utilities and UI components.

0e. If any requirement/sequence is ambiguous, consult
`__FEATURE_ROOT__/refs/*` (do NOT blindly "study refs"; only pull what you need).

0f. Study repo root `AGENTS.md` for global rules and architecture context.

1. PLANNING MODE ONLY: compare `__FEATURE_ROOT__/specs/*` against existing repo
   code. Create/update `__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md` as a prioritized
   checklist of tasks that remain to ship the feature. For each task, derive
   required tests from acceptance criteria in specs — what specific outcomes
   need verification (behavior, edge cases, invariants). Tests verify WHAT
   works, not HOW it's implemented. Include as part of task definition.

Planning output requirements (optimize for Ralph loop discipline):

- Each task must be an **atomic plan row**: small enough to complete in a single
  iteration with one commit.
- Keep stable row **IDs** that can be referenced as `TASK_ID` in build mode.
- Each row must include:
  - **Done when**: concrete acceptance criteria
  - **Backpressure**: the minimal command(s) to run for that row (usually
    typecheck/build; add more only when necessary)
  - **File(s)**: optional, if you already know the target file(s)
- Output **3–10 tasks max**. If more are needed, split into phases and include
  only Phase 1 tasks; list Phase 2+ as a short note without adding more rows.
- Avoid “umbrella tasks” like “Implement Phase 3”. Split into the smallest
  shippable slices.
- If you need to insert a new prerequisite task, do so (even if it changes the
  ordering).

IMPORTANT:

- Plan only. Do NOT implement anything.
- Do NOT hardcode transports/endpoints into UI tasks; preserve adapter/runtime
  seams.
- If specs require a mock/fixture-first flow, keep that invariant in the plan.

ULTIMATE GOAL: As defined in `__FEATURE_ROOT__/specs/*`. Do not expand scope.
