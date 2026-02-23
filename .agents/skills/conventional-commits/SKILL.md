---
name: conventional-commits
description: Write commit messages using Conventional Commits 1.0.0. Use when creating, reviewing, or fixing commit messages so they follow <type>[optional scope]: <description> with optional body/footer and proper BREAKING CHANGE handling.
---

# Conventional Commits

Reference: https://www.conventionalcommits.org/en/v1.0.0/

Use this format exactly:

```text
<type>[optional scope][optional !]: <description>

[optional body]

[optional footer(s)]
```

## Required rules

- Start with a lowercase `type`, then `: `, then a short description.
- Keep subject imperative and concise.
- Use `!` before `:` for breaking changes, for example `feat(api)!: drop v1 endpoint`.
- Put `BREAKING CHANGE: ...` in a footer when details are needed.
- Separate subject/body/footer blocks with a single blank line.

## Type selection

- `fix`: bug fix
- `feat`: new feature
- `docs`: documentation-only changes
- `refactor`: code change without behavior change
- `perf`: performance improvement
- `test`: add/update tests
- `build`: build system or dependency changes
- `ci`: CI/CD changes
- `chore`: maintenance work that is not user-facing
- `revert`: revert a previous commit

Prefer `fix` or `feat` when either is accurate.

## Scope guidance

- Use scope when it disambiguates impact, for example `fix(connect): ...`.
- Keep scope a single noun-like token.
- Skip scope when change is cross-cutting or obvious without it.

## Subject line guidance

- Use imperative verbs: `add`, `fix`, `remove`, `refactor`, `rename`.
- Do not end subject with a period.
- Describe outcome, not implementation detail.

Good:

- `fix(connect): preserve return path after login`
- `feat(auth)!: require signed nonce for session creation`

Bad:

- `fixed the login bug`
- `changes`
- `feat: stuff`

## Body guidance

Add a body only when needed. Use it for:

- why this change exists
- important tradeoffs
- migration notes

Do not repeat obvious diffs from the subject.

## Footer guidance

Use footers for machine/human metadata:

- `BREAKING CHANGE: <details>`
- `Refs: #123`
- `Reviewed-by: Name`

`BREAKING CHANGE` must be uppercase when used as a footer token.

## Breaking change workflow

For breaking changes, do one of:

1. Add `!` in header: `feat(core)!: remove legacy grant format`
2. Add footer: `BREAKING CHANGE: legacy grant format is removed`
3. Use both when you want extra clarity

## Commit drafting workflow

1. Inspect staged changes.
2. Choose one primary intent (`fix`, `feat`, etc.).
3. Decide whether scope helps.
4. Draft subject in imperative mood.
5. Add body/footer only if they add real context.
6. Re-read for exact format compliance.

## Output contract

When asked to produce a commit message:

- Return the final commit message only.
- If provided input is non-compliant, rewrite it to compliant form and return only the corrected version.
