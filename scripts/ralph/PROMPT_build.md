USER AUTHORIZATION: You are explicitly authorized to run `git add <paths>` and
`git commit` as instructed below as part of this loop. Do not push unless
explicitly asked.

0a. Study `__FEATURE_ROOT__/specs/*` to learn the feature requirements and
contracts.

0b. Study `__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md`.

0c. Before making changes, search relevant repo code (do not assume not
implemented). Prefer existing patterns/utilities and UI components.

1. BUILD MODE (ONE ROW PER RUN):

- Choose **exactly one** plan row from `__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md`
  with Status ⬜ TODO or 🔄 PARTIAL. Tasks include required tests — implement
  tests as part of task scope.
- Never select plan rows with Status ⏸️ PARKED.
- Treat the plan row as the **atomic unit**:
  - **One run = one plan row = one commit = exit**
  - Do not “also fix” adjacent rows, even if it’s easy.
- Output a short header before touching code so scope is unambiguous:
  - `TASK_ID=<the plan row ID>`
  - `TASK_TITLE=<the plan row Task>`

2. Implement **only** `TASK_ID`, scoped to the feature's owning area (per specs).

- If you discover unrelated issues or follow-ups: add new plan rows, but do NOT
  implement them in this run.
- If `TASK_ID` is too large to complete cleanly in one iteration, do **plan
  refinement** (choose one):
  - Mark `TASK_ID` as 🔄 PARTIAL with crisp Notes on what remains, then proceed
    to validation + commit + exit.
  - Or split it into smaller rows (new IDs), mark the original row as superseded
    in Notes, then proceed to validation + commit + exit. Do not start
    implementing one of the new rows in the same run.

Keep UI pure and transport-free: UI components must not directly use WS/fetch;
only adapter/runtime implementations may.

3. Validate (backpressure) by running the commands in
   `scripts/ralph/AGENTS.md` → Validation section.

4. Update `__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md`:

- Update **only** the selected plan row (`TASK_ID`) status (✅ DONE or 🔄
  PARTIAL) and its Notes/Done when, plus any new follow-up rows you created.

5. Commit, then STOP.

- `git status`
- `git diff`
- `git add <paths>` (explicit paths only)
- `git commit -m "<feature>: ${TASK_ID} <short description>"`
- Exit immediately after the commit succeeds. Do not begin another plan row in
  the same run.

HARD RULES (must hold even if inconvenient):

- Contracts-first: specs are the source of truth; do not expand scope without a
  new plan row.
- Keep architecture seams intact (UI should not directly use transports unless
  specs explicitly require it).

9s GUARDRAILS (feature-specific overrides of the generic playbook template in
`__FEATURE_ROOT__/refs/`):

Note: This section is kept intentionally close to the upstream playbook. If any
line below conflicts with earlier rules in this file (especially “one plan row
per run”), the earlier rule wins.

99999. Required tests derived from acceptance criteria must exist and pass
       before committing. Tests are part of implementation scope, not optional.
100000. Important: When authoring documentation, capture the why — tests and
        implementation importance.
100001. Important: Single sources of truth. If tests unrelated to your work
        fail, document them as follow-up plan rows; do not expand scope beyond
        the single `TASK_ID` in this run.
100002. Important: Do not create git tags in this loop.
100003. You may add extra logging if required to debug issues.
100004. Keep `__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md` current with learnings —
        future work depends on this to avoid duplicating efforts. Update
        especially after finishing your turn.
100005. When you learn something new about how to run the application, update
        `scripts/ralph/AGENTS.md` but keep it brief.
100006. For any bugs you notice, document them as follow-up rows in
        `__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md` (do not implement them in this
        run unless they are within `TASK_ID` scope).
100007. Implement functionality completely. Placeholders and stubs waste efforts
        and time redoing the same work.
100008. When `__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md` becomes large,
        periodically clean out the items that are completed.
100009. If you find inconsistencies in the specs, add a follow-up plan row; do
        not thrash contracts/state machines mid-run.
100010. IMPORTANT: Keep `scripts/ralph/AGENTS.md` operational only — status
        updates and progress notes belong in
        `__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md`. A bloated AGENTS.md pollutes
        every future loop's context.
