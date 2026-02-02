# UI Implementation Notes — Typography (Progressive)

## What we learned

- All text must be rendered via the `Text` component in `src/components/typography/text.tsx`.
- Use `intent` to express the type size/role (e.g. `title`, `heading`, `body`, `subtitle`, `eyebrow`).
- Use `as` to keep semantic HTML (`h1`, `p`, `li`, etc.) while centralizing styling.
- For links, use `Text as="a"` and pass link props (`href`, `target`, `rel`) directly to avoid wrapping `Text` in an `<a>`.
- Use tokenized color variants (e.g. `mutedForeground`) instead of inline hex.
- Use spacing utilities (`className="mb-2"`) instead of inline styles.
- Display typography uses Inter Variable optical sizing: `title`, `display`, and `hero` auto-apply display opsz; override with `optical="auto"` or force with `optical="display"`.

## Example

```tsx
<Text as="h1" intent="title" className="mb-2">
  Your Data
</Text>
<Text as="p" intent="body" color="mutedForeground" className="mb-8">
  Manage your connected data sources and applications
</Text>
```

## Notes

- `Text` runs formatting on string children (smart quotes). Pass a ReactNode if you need raw text.
- The typography system is defined in `textVariants` inside `src/components/typography/text.tsx`.
- When introducing new theme tokens (spacing, text, color, radius), update the custom Tailwind merge in `src/lib/classes.ts` so `cn` handles them correctly.
- Do not set `weight` unless the UI markup explicitly specifies it.
- Avoid margins/padding on text elements; use parent layout spacing (`gap-*`, `space-x/y-*`, etc.).
- Defer to base component styles (padding, radius, borders) unless the UI markup explicitly specifies an override.
- Component files must use kebab-case (e.g., `connect-source-card.tsx`).
- Lucide icons must be imported with an `Icon` suffix (e.g., `DatabaseIcon`).
- Icon sizing: use `size-*` for square icons instead of paired `w-*`/`h-*`.
- SVG sizing: `useBoxSize` sets inline `width/height` (`1em` by default). Use it when icons should scale with text; avoid mixing with `size-*` in the same element.
- Use semantic radius/color tokens (e.g., `rounded-button`, tokenized color classes) instead of raw Tailwind radius/color classes.
- Lucide stroke width is globally set to `1.5` via `.lucide` in `src/styles/index.css`.

## Home page tabs behavior

- "Your sources" (`ConnectedSourcesList`) must show only actually connected platforms.
- "Connect sources" (`AvailableSourcesList`) shows connectable platforms and coming soon items.
- Never show "Coming soon" items inside "Your sources."

## Component audit workflow

- Use the `ui-component-audit` skill for UI refactors or audits.
- Audit order:
  1. Replace raw text with `Text`.
  2. Remove inline styles; use Tailwind + tokens.
  3. Fix Lucide `Icon` suffix and kebab-case filenames.
  4. Minimize diffs; don’t change classes/styles unless asked.
- `lucide-react` exports `*Icon` aliases (e.g., `DatabaseIcon`), so direct imports are valid.
- Reason: the `*Icon` names are already exported by `lucide-react`, so you do not need to alias `Database` yourself.
- Prefer direct alias imports to avoid manual renaming:
  ```tsx
  import { DatabaseIcon } from "lucide-react"
  ```
- If needed, this is equivalent:
  ```tsx
  import { Database as DatabaseIcon } from "lucide-react"
  ```
