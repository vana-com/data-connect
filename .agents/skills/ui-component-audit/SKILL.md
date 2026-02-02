---
name: ui-component-audit
description: Audit and refactor React UI components to match DataBridge UI implementation rules (Text component, tokens, Tailwind, naming) and Vercel React/composition guidance. Use when the user asks for a UI audit, React audit, composition review, or to fix UI implementation issues in components.
---

# UI Component Audit (DataBridge)

## Scope

Use this skill to audit or refactor React components to align with:

- `docs/260202-ui-implementation-typography.md`
- `AGENTS.md` (no comment overwrites; do not change styles/classes unless asked)
- Vercel React best practices + composition patterns

## Quick Start (Audit)

1. Read target component(s).
2. Read `docs/260202-ui-implementation-typography.md` and `AGENTS.md`.
3. List violations by file with terse bullets.
4. If asked to fix, apply minimal diff.

## UI Implementation Rules (must enforce)

- All text uses `Text` (`src/components/typography/text.tsx`).
- No inline styles; use Tailwind classes + tokens.
- Use tokenized colors (`text-foreground`, `bg-muted`, etc.), not hex.
- No raw colors anywhere outside `src/styles/vars.css` (no hex/rgb/hsl/oklch in components or CSS).
- No palette classes like `text-gray-*`, `bg-slate-*`, etc. Use tokens only.
- Prefer layout spacing via `gap-*`, `space-*`; avoid margins on text.
- Defer to base component styles (padding, radius, borders) unless the UI markup explicitly specifies an override.
- Lucide icon imports must end with `Icon` suffix (e.g., `DownloadIcon`).
- Component filenames are kebab-case.

## React + Composition Rules (apply where relevant)

- Avoid barrel imports for bundle size (import direct paths).
- Extract repeated UI variants into explicit components/variants.
- Memoize heavy list items (`React.memo`) when parent re-renders.
- Avoid inline `<style>` in render; use classes.
- Use reduced-motion friendly animations (`motion-reduce:animate-none`).

## Fix Workflow (when asked to refactor)

1. Convert inline styles → Tailwind classes + tokens.
2. Replace raw text nodes with `Text`.
3. Rename file to kebab-case and update imports if needed.
4. Enforce icon suffix and direct imports.
5. Add `type="button"` to non-submit buttons.
6. Verify null-safe rendering for optional fields.
7. Run lints for touched files.

## Output Format

Group findings by file.

```
## src/components/example.tsx
src/components/example.tsx:12 - inline style; use Tailwind tokens
src/components/example.tsx:21 - raw text; use Text
```

## Notes

- Do not overwrite comments.
- Do not change styles/classes unless user asks for refactor.
