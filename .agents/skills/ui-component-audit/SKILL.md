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
5. If you touched any `Text` props, run a scoped check on touched files for verbose color props (`color="mutedForeground"` and `color="foregroundDim"`), then replace with boolean props (`muted` and `dim` respectively) unless a specific semantic color token is required.

## Primary principle

**Read the component source, understand its API, then apply it correctly.**
Before using any project component (`Text`, `Button`, etc.), read its source
to learn its props, variants, and default values. Do not hard-code assumptions
about component internals — verify them. Do not pass props that match defaults.

## UI Implementation Rules (must enforce)

- All user-visible text should use `Text` (`src/components/typography/text.tsx`) where appropriate. Exceptions include button labels inside `Button`, form labels, and aria-only content. When unsure, read the `Text` source to check if it fits.
- Buttons must use `Button`; do not add custom focus rings.
- `Text` uses `intent` for type size/role (e.g. `title`, `heading`, `subtitle`, `eyebrow`). Read the component source to check default prop values and do not pass props that match the default (e.g. if `intent` defaults to `"body"`, omit it for body text).
- Use `as` to keep semantic HTML (`h1`, `p`, `li`, etc.).
- Prefer `muted`/`dim` boolean props on `Text` for muted/dim copy; avoid verbose `color="mutedForeground"` unless a specific semantic color token is required.
- `Text` has props for icon layout (`withIcon`) and link styling (`link`). Read the component source to understand how they work before using them — do not guess at prop values or manually replicate behavior the component already handles.
- For links, use `Text as="a"` and pass link props (`href`, `target`, `rel`) directly; do not wrap `Text` in an `<a>`.
- Do not set `weight` unless the Figma design explicitly shows non-normal weight. Models tend to over-apply `font-medium` and `font-bold` — normal weight is almost always correct.
- No inline styles; use Tailwind classes + tokens.
- **Do not introduce `cn` as a formatting tool.** Use `cn` only when class names are dynamic or need conditional logic. For static classes (even 5-7 of them), prefer a plain string literal `className="..."`. Only group into `cn(...)` arrays when the element has 8+ classes (per Tailwind sort rule) or when classes are extracted into a reusable constant.
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

## React + Composition Rules

For React architecture, composition patterns, and performance (memoization,
barrel imports, etc.), defer to the **vercel-react-best-practices** and
**vercel-composition-patterns** skills when available. This skill focuses on
UI implementation correctness, not general React guidance.

## Fix Workflow (when asked to refactor)

1. Convert inline styles → Tailwind classes + tokens.
2. Replace raw text nodes with `Text` (skip button labels inside `Button`).
3. Convert raw `<button>` to `Button` and drop custom focus rings.
4. If a file is not kebab-case, flag it and suggest the new name — do not rename automatically. Wait for confirmation before renaming and updating imports.
5. Enforce icon suffix and direct imports.
6. For icon + text rows, use `Text` with `withIcon`; remove manual layout classes where possible.
7. Add `type="button"` to non-submit buttons.
8. Verify null-safe rendering for optional fields.
9. Run lints for touched files.

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
