---
name: commit-discipline
description: Enforce commit safety and approval gates. Use when asked to commit, amend,
  rebase, or generate a commit message.
---

# Commit Discipline

## Hard gate

**NEVER commit unless the user explicitly says to commit in this conversation.**

- No `git commit`, `git commit --amend`, rebase/squash, or any git operation
  that _creates or rewrites commits_ unless explicitly asked.
- Default: make code changes, show a tight diff summary, and ask for approval.
- If the user asks for a commit message, only provide the message — do not
  commit unless they also explicitly say to commit.
- If the user explicitly says not to push (for example "do not push"), treat
  that as binding for the rest of the current commit workflow unless they later
  revoke it.
- If tests exist for the changes being committed, they must be run first.
- Prefer scoped tests for the changed area (page dir or specific files).
- If the user gave prior commit-structure instructions in this thread (for example "series of atomic commits"), treat them as binding. If a later request could conflict (for example "commit all"), stop and ask for explicit confirmation before committing.

## Pre-commit staging hygiene

- Always stage explicit file paths only (no `git add .`, `-A`, `-u`, `-i`,
  `git commit -a`).
- Do not reset or unstage anything as part of this workflow (no `git reset`,
  `git restore --staged`, or `git reset --mixed`) unless the user explicitly
  asks for it.
- Never stage unrelated files or any untracked files unless the user explicitly
  asked to include them.
- Before committing, run `git diff --staged` and confirm **only** the intended
  files are staged. If anything unexpected is staged, STOP and ask.
- Before each commit in a multi-commit sequence, run both:
  - `git diff --staged --name-only`
  - `git diff --staged`
  and verify the staged set still matches the intended atomic scope.
- Before running `git commit`, post a short pre-commit checklist in chat:
  - files to include
  - files to exclude
  - number of commits to create
  - tests run for this commit set
- If the working tree is dirty and unrelated changes are present, keep them
  untouched and out of staged changes; if unrelated files are accidentally
  staged, STOP and ask before proceeding.
- After each successful commit, run `git show --name-only --oneline -1` and
  verify only the intended files were captured before moving to the next commit.

## Speed rule (no back-and-forth on commit failures)

- If the user explicitly asked you to commit and the commit fails due to
  sandbox/permissions or `.git/index.lock`, automatically retry using the
  appropriate permissions and clear a stale lock (see
  `git-troubleshooting.mdc`).
