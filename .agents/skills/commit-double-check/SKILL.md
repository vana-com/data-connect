---
name: commit-double-check
description: Review commit(s) for correctness, risk, and completeness. Use when the user asks to double-check a commit, review recent commits, or sanity-check before push/merge.
---

# Commit Double Check

## Scope

- Read-only review. Do not commit, amend, rebase, or push.
- Prefer the most capable model available; avoid fast mode for review.

## Default scope

- If the user does not specify, review the last 3 commits on the current branch.
- If there are uncommitted changes, call out that the review may be stale and
  ask whether to include those diffs.

## Scope parsing

Accept user overrides:

- "last commit" or "last 1" -> `HEAD~1..HEAD`
- "last N commits" -> `HEAD~N..HEAD`
- "range A..B" or "A...B" -> use that range verbatim
- "commit <sha>" -> single commit

If both range and count are provided, prefer the explicit range.

## Evidence collection (git)

Use shell commands to collect context (read-only):

1. `git status -sb`
2. `git log -n 3 --oneline` (or the user-provided count/range)
3. For each commit: `git show --stat <sha>` then `git show <sha>`
4. For a range: `git log --oneline <base>..<head>` then
   `git diff <base>..<head>`

## Methodical review loop

For each commit (in order):

1. Summarize intent from message + diff.
2. Apply checklist.
3. Record findings with file(s), why, fix.

## React/TypeScript emphasis

When any `.tsx`, `.ts`, `.jsx`, or `.js` files are touched:

- Load `vercel-react-best-practices` and apply relevant rules.
- If unclear, read `vercel-react-best-practices/AGENTS.md` or specific
  `vercel-react-best-practices/rules/*.md` entries that match the change.

## Review checklist

- Correctness: logic, edge cases, null handling, invariants
- Data safety: migrations, deletes, backwards compatibility
- Security: auth, input validation, secrets
- Performance: obvious hot paths, expensive loops, large payloads
- Reliability: retries, timeouts, error handling
- UX/API: breaking changes, schema mismatches, docs
- Tests: missing coverage or brittle tests called out
- Tooling/config: dependency changes, build/test scripts, env vars
- React/TypeScript focus (when applicable):
  - Hooks: deps arrays, stale closures, cleanup
  - Rendering: unnecessary re-renders, memo usage, key stability
  - Types: unsafe any, missing null guards, widening
  - Props/state: mutation, derived state pitfalls

## Output format

- Findings first, ordered by severity (Critical/Major/Minor).
- Each finding: short title + file(s) + why it matters + suggested fix.
- Then assumptions/questions.
- Then a 1-2 line summary + suggested test commands.

## Example triggers

- "double check this commit"
- "review last 3 commits"
- "sanity check before push"
