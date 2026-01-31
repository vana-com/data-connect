---
name: commit-message-format
description:
  Define commit message structure and when to include a body. Use when asked to
  write or review commit messages.
---

# Commit Message Format

## Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <subject>
```

Or with body for complex changes:

```
<type>: <subject>

<body>
```

- **type**: `feat`, `fix`, `refactor`, `docs`, `chore`, `ci`, `test`, `perf`
- **subject**: imperative mood, lowercase, no period (max 50 chars)
- **body**: Only if needed to explain _why_ or _how_ (not what—the code shows
  that). Wrap at 72 chars. Be brutal about compression.

## When to add body

- **Don't**: trivial fixes, obvious refactors, doc updates, config changes where
  the subject is self-explanatory
- **Do**: breaking changes, complex logic, non-obvious design decisions,
  migration notes

**Bad (repeats what the subject already says):**

```
chore(config): declare NEXT_PUBLIC_DISABLE_DARK_MODE env var in turbo.json

Adds NEXT_PUBLIC_DISABLE_DARK_MODE to globalEnv to satisfy turbo linting rules
```

**Good (subject is sufficient):**

```
chore(config): declare NEXT_PUBLIC_DISABLE_DARK_MODE env var in turbo.json
```

## Include affected files in body when unclear

If changes span multiple packages/areas or the scope isn't obvious from the
subject line, add files to the body:

```
feat: add eslint rules for neutral tailwind enforcement

Changes:
- packages/eslint-config/package.json – added eslint-plugin-tailwindcss
- packages/eslint-config/base.js – integrated plugin and custom rules
- packages/eslint-config/rules/ – added no-neutral-colors and prefer-cn

Details:
- Custom vana-tailwind plugin enforces semantic tokens over hardcoded neutrals
- Configured for cn/clsx callees
```

## Compression means clarity, not erasure

Compression = remove fluff, keep signal. Don't sacrifice important context just
to fit in fewer lines. Better to write 5 clear lines than 2 cryptic ones.

**Bad (too compressed, lost details):**

```
feat: add rules
```

**Good (compressed but complete):**

```
feat: add eslint rules for neutral tailwind enforcement

- Integrates eslint-plugin-tailwindcss
- Adds custom vana-tailwind plugin with no-neutral-colors rule
- Enforces use of semantic tokens over hardcoded neutrals
- Configures callees for cn and clsx
```

## Examples

```
feat: add neutral color codemod with glob parsing
```

```
fix: resolve type annotation in codemod script
```

```
docs: update color-system audit documentation
```

## Why Semantic?

Conventional commits enable:

- Automated changelog generation (by type)
- Semantic versioning (feat → minor, fix → patch)
- Clear change categorization in git history
- Consistency with Linear issue prefixes (see `linear-task-creation.mdc`)
