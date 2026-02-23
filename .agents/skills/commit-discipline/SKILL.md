---
name: commit-discipline
description: Enforce clean, spec-compliant commit messages and commit hygiene. Use when writing, reviewing, or correcting commit messages, deciding commit scope, or preparing a commit for merge.
---

# Commit Discipline

Use Conventional Commits 1.0.0 with minimal noise and maximum signal.

## Required reference

- Read `.agents/skills/conventional-commits/SKILL.md` first.
- Treat this skill as stricter commit-hygiene guidance layered on top of that baseline.

## Message format

```text
<type>[optional scope][optional !]: <description>

[optional body]

[optional footer(s)]
```

## Required rules

- Use lowercase `type`.
- Use imperative subject (`add`, `fix`, `refactor`, `remove`, `rename`).
- Do not end subject with a period.
- Keep subject concise; prefer clarity over arbitrary length limits.
- Separate header/body/footer with one blank line.

## Types

- `feat`: user-facing feature
- `fix`: user-facing bug fix
- `docs`: documentation only
- `refactor`: no user-visible behavior change
- `perf`: performance improvement
- `test`: tests only
- `build`: build tooling/dependencies
- `ci`: CI/CD pipeline/workflow
- `chore`: maintenance not covered above
- `revert`: reverts a previous commit

Prefer `feat` or `fix` when either is true.

## Scope

- Use scope only when it improves precision, e.g. `fix(connect): ...`.
- Keep scope short and noun-like.
- Omit scope for cross-cutting or obvious changes.

## Breaking changes

Use one of these patterns:

1. `type(scope)!: description`
2. Footer: `BREAKING CHANGE: <details>`
3. Both, when clarity matters

`BREAKING CHANGE` footer token must be uppercase.

## Body: when to include

Include a body only when it adds non-obvious context:

- why a change exists
- design tradeoffs
- migration or rollback notes
- constraints reviewers need to know

Do not restate the diff.

## Footers

Use footers for structured metadata:

- `BREAKING CHANGE: ...`
- `Refs: #123`
- `Reviewed-by: Name`
- `Co-authored-by: Name <email>`

## Commit hygiene

- Keep each commit to one primary intent.
- If a change mixes intents (e.g. refactor + feature), split into separate commits when feasible.
- Stage intentionally; avoid accidental files.
- Avoid empty, vague subjects (`update stuff`, `fix things`).

## Rewrite policy

When asked to improve a message:

1. Preserve intent.
2. Normalize to Conventional Commits format.
3. Add scope/body/footer only if they add signal.
4. Return the final commit message text only.

## Examples

```text
fix(connect): preserve return path after auth handoff
```

```text
feat(auth)!: require signed nonce for session creation

BREAKING CHANGE: unsigned nonce requests are now rejected by default.
```

```text
refactor(login): isolate callback parsing from page state updates
```
