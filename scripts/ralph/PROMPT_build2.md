USER AUTHORIZATION: You are explicitly authorized to run `git add <paths>` and
`git commit` as instructed below as part of this loop. Do not push or create
tags unless explicitly asked.

0a. Study `__FEATURE_ROOT__/specs/*` with up to 500 parallel Sonnet subagents to
learn the application specifications.
0b. Study `__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md`.
0c. For reference, application source may live in `src/*`, `src-tauri/*`, and
`scripts/*` when relevant to the feature.
0d. Study `scripts/ralph/AGENTS.md` for loopback/backpressure commands.
0e. Study repo root `AGENTS.md` for global rules and architecture context.

1. Your task is to implement functionality per the specifications using
parallel subagents. Follow `__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md` and choose
the most important item to address. Before making changes, search the codebase
(don't assume not implemented) using Sonnet subagents. You may use up to 500
parallel Sonnet subagents for searches/reads and only 1 Sonnet subagent for
build/tests. Use Opus subagents when complex reasoning is needed (debugging,
architectural decisions).
2. After implementing functionality or resolving problems, run tests for
the unit of code improved (plus at least one relevant phase/exit-gate test if
defined in `__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md`). If functionality is
missing then it's your job to add it as per the application specifications.
Ultrathink.
3. When you discover issues, immediately update
`__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md` with your findings using a subagent.
When resolved, update and remove the item.
4. When tests pass, update `__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md`, then
`git add <paths>` (explicit paths only) then `git commit` with a message
describing the changes. Do not push unless explicitly asked.
5. Treat `Open Questions / External Blockers` in
`__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md` as active plan state, not a passive log.
When discovering a question/blocker, either:
  - convert it into an explicit slice/validation item in the plan, or
  - keep it in `Open Questions / External Blockers` with structured fields:
    - `status: open|resolved|deferred`
    - `impact: blocking-current-slice|blocking-future-slice|non-blocking`
    - `owner`
    - `next_action`
    - `evidence` (commit/test/doc reference)
6. Completion protocol (mandatory): before ending a build iteration, classify
overall plan state in `__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md` under a
`Final Status` section as exactly one of:
  - `PLAN_STATUS: IN_PROGRESS`
  - `PLAN_STATUS: COMPLETE`
  - `PLAN_STATUS: COMPLETE_WITH_OPEN_QUESTIONS`
  - `PLAN_STATUS: BLOCKED`
Use these rules:
  - `COMPLETE_WITH_OPEN_QUESTIONS` when implementation + required validations
    are done and remaining questions are non-blocking or external timing/ownership
    decisions.
  - `BLOCKED` only when a current required slice cannot proceed or validate due to
    an unresolved dependency.
  - Do not mark `BLOCKED` solely because open questions exist.
7. When `PLAN_STATUS` is `COMPLETE` or `COMPLETE_WITH_OPEN_QUESTIONS`, append
`Completion Evidence` in the plan:
  - final slice(s) landed (commit SHA + short description)
  - validation commands run + pass/fail
  - remaining open questions (if any) with ownership and next action

99999. Important: When authoring documentation, capture the why — tests and
implementation importance.
999999. Important: Single sources of truth, no migrations/adapters. If tests
unrelated to your work fail, document them in
`__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md` with repro details; do not expand
scope unless those failures block validation of your touched slice.
9999999. Do not create git tags in this loop.
99999999. You may add extra logging if required to debug issues, but temporary
debug logs must be removed or debug-gated before commit.
999999999. Keep `__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md` current with
learnings using a subagent — future work depends on this to avoid duplicating
efforts. Update especially after finishing your turn.
9999999999. When you learn something new about how to run the application,
update `scripts/ralph/AGENTS.md` using a subagent but keep it brief. For example
if you run commands multiple times before learning the correct command then that
file should be updated.
99999999999. For bugs unrelated to the current slice, document them in
`__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md`; fix only if they are severe or block
the current slice.
999999999999. Implement functionality completely. Placeholders and stubs waste
efforts and time redoing the same work.
9999999999999. When `__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md` becomes large
periodically clean out items that are completed from the file using a
subagent.
99999999999999. If you find inconsistencies in `specs/*`, use an Opus 4.5
subagent with 'ultrathink' requested to update the specs. If specs are changed,
append rationale and impacted plan items in
`__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md` in the same iteration.
999999999999999. IMPORTANT: Keep `scripts/ralph/AGENTS.md` operational only —
status updates and progress notes belong in
`__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md`. A bloated AGENTS.md pollutes every
future loop's context.
