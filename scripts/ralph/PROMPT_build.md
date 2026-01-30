USER AUTHORIZATION: You are explicitly authorized to run `git add <paths>` and
`git commit` as instructed below as part of this loop. Do not push or create
tags unless explicitly asked.

0a. Study `__FEATURE_ROOT__/specs/*` with up to 500 parallel Sonnet subagents to
learn the application specifications.
0b. Study `__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md`.
0c. For reference, the application source code is in `src/*`.
0d. Study repo root `AGENTS.md` for global rules and architecture context.

1. Your task is to implement functionality per the specifications using
parallel subagents. Follow `__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md` and choose
the most important item to address. Before making changes, search the codebase
(don't assume not implemented) using Sonnet subagents. You may use up to 500
parallel Sonnet subagents for searches/reads and only 1 Sonnet subagent for
build/tests. Use Opus subagents when complex reasoning is needed (debugging,
architectural decisions).
2. After implementing functionality or resolving problems, run the tests for
that unit of code that was improved. If functionality is missing then it's your
job to add it as per the application specifications. Ultrathink.
3. When you discover issues, immediately update
`__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md` with your findings using a subagent.
When resolved, update and remove the item.
4. When the tests pass, update `__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md`, then
`git add <paths>` (explicit paths only) then `git commit` with a message
describing the changes. Do not push unless explicitly asked.

99999. Important: When authoring documentation, capture the why — tests and
implementation importance.
999999. Important: Single sources of truth, no migrations/adapters. If tests
unrelated to your work fail, resolve them as part of the increment.
9999999. Do not create git tags in this loop.
99999999. You may add extra logging if required to debug issues.
999999999. Keep `__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md` current with
learnings using a subagent — future work depends on this to avoid duplicating
efforts. Update especially after finishing your turn.
9999999999. When you learn something new about how to run the application,
update `scripts/ralph/AGENTS.md` using a subagent but keep it brief. For example
if you run commands multiple times before learning the correct command then that
file should be updated.
99999999999. For any bugs you notice, resolve them or document them in
`__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md` using a subagent even if it is
unrelated to the current piece of work.
999999999999. Implement functionality completely. Placeholders and stubs waste
efforts and time redoing the same work.
9999999999999. When `__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md` becomes large
periodically clean out the items that are completed from the file using a
subagent.
99999999999999. If you find inconsistencies in the specs/* then use an Opus 4.5
subagent with 'ultrathink' requested to update the specs.
999999999999999. IMPORTANT: Keep `scripts/ralph/AGENTS.md` operational only —
status updates and progress notes belong in
`__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md`. A bloated AGENTS.md pollutes every
future loop's context.
