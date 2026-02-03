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
- If tests exist for the changes being committed, they must be run first.
- Prefer scoped tests for the changed area (page dir or specific files).

## Speed rule (no back-and-forth on commit failures)

- If the user explicitly asked you to commit and the commit fails due to
  sandbox/permissions or `.git/index.lock`, automatically retry using the
  appropriate permissions and clear a stale lock (see
  `git-troubleshooting.mdc`).
