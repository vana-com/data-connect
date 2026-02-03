# UI Implementation Notes — Typography (Index)

This doc is intentionally thin. All UI implementation rules live in the
`ui-component-audit` skill.

## Source of truth

- Local skill file: `.cursor/skills/ui-component-audit/SKILL.md` (ignored by git)
- Committed source: `.agents/skills/ui-component-audit/SKILL.md`

## Rule (skills location)

- `.agents/skills` is the committed source of truth.
- `.cursor/skills` is local-only and should be a symlink to `../.agents/skills`.
- Add/remove skills → run the sync script; edits in `.agents/skills` are immediate.

## When to update

- Update the skill first whenever rules change.
- Keep this doc to pointers and high-level context only to avoid drift.
