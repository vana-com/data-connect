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

- All text uses `Text` (`src/components/typography/text.tsx`), except button labels inside `Button`.
- Buttons must use `Button`; do not add custom focus rings.
- Use `intent` to express the type size/role (e.g. `title`, `heading`, `body`, `subtitle`, `eyebrow`).
- Use `as` to keep semantic HTML (`h1`, `p`, `li`, etc.).
- For links, use `Text as="a"` and pass link props (`href`, `target`, `rel`) directly; do not wrap `Text` in an `<a>`.
- Do not set `weight` unless the UI markup explicitly specifies it.
- No inline styles; use Tailwind classes + tokens.
- Use `cn` only when class names are dynamic, need conditional logic, or when grouping many classes (per Tailwind sort rule). For short static classes, use a string literal `className="..."`.
- Use tokenized colors (`text-foreground`, `bg-muted`, etc.), not hex.
- No raw colors anywhere outside `src/styles/vars.css` (no hex/rgb/hsl/oklch in components or CSS).
- No palette classes like `text-gray-*`, `bg-slate-*`, etc. Use tokens only.
- Prefer layout spacing via `gap-*`, `space-*`; avoid margins on text.
- Defer to base component styles (padding, radius, borders) unless the UI markup explicitly specifies an override.
- Use semantic radius/color tokens (e.g., `rounded-button`, tokenized color classes) instead of raw Tailwind radius/color classes.
- Icon sizing: use `size-*` for square icons instead of paired `w-*`/`h-*`.
- SVG sizing: `useBoxSize` sets inline `width/height` (`1em` by default). Use it when icons should scale with text; avoid mixing with `size-*` in the same element.
- Lucide icon imports must end with `Icon` suffix (e.g., `DownloadIcon`).
- Component filenames are kebab-case.

## Typography Notes

- `Text` runs formatting on string children (smart quotes). Pass a ReactNode if you need raw text.
- Display typography uses Inter Variable optical sizing: `title`, `display`, and `hero` auto-apply display opsz; override with `optical="auto"` or force with `optical="display"`.
- The typography system is defined in `textVariants` inside `src/components/typography/text.tsx`.
- When introducing new theme tokens (spacing, text, color, radius), update the custom Tailwind merge in `src/lib/classes.ts` so `cn` handles them correctly.
- Lucide stroke width is globally set to `1.5` via `.lucide` in `src/styles/index.css`.

## React + Composition Rules (apply where relevant)

- Avoid barrel imports for bundle size (import direct paths).
- Extract repeated UI variants into explicit components/variants.
- Memoize heavy list items (`React.memo`) when parent re-renders.
- Avoid inline `<style>` in render; use classes.
- Use reduced-motion friendly animations (`motion-reduce:animate-none`).

## Fix Workflow (when asked to refactor)

1. Convert inline styles → Tailwind classes + tokens.
2. Replace raw text nodes with `Text` (skip button labels inside `Button`).
3. Convert raw `<button>` to `Button` and drop custom focus rings.
4. Rename file to kebab-case and update imports if needed.
5. Enforce icon suffix and direct imports.
6. Add `type="button"` to non-submit buttons.
7. Verify null-safe rendering for optional fields.
8. Run lints for touched files.

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
