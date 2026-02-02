---
name: tailwind-shadcn-adaptation
description:
  Adapt ShadCN components to the design system tokens. Use when importing ShadCN
  components into packages/ui.
---

# ShadCN Component Adaptation

When importing a ShadCN component into `packages/ui/src/components/`, apply
these transformations to align with the design system.

## Source of Truth

- **Token recognition**: `@packages/ui/src/lib/classes.ts` — the `customTwMerge`
  config defines what tailwind-merge recognizes
- **Token definitions**: `@packages/ui/src/styles/globals.css` — the actual CSS
  custom properties with values, line-heights, letter-spacing
- **Sorting rule**: `@.cursor/rules/tailwind-sort.mdc` — apply to any element
  with >5 classes

## Why This Matters

Tailwind's built-in `text-sm`, `text-lg`, `text-xl` have **hardcoded
line-heights** that don't match our design system. Our semantic tokens
(`text-small`, `text-large`, `text-xlarge`) include proper `--line-height` and
`--letter-spacing` definitions in globals.css.

## Token Mapping (ShadCN → Design System)

### Typography

| ShadCN      | Design System                                |
| ----------- | -------------------------------------------- |
| `text-xs`   | `text-fine`                                  |
| `text-sm`   | `text-small`                                 |
| `text-base` | `text-body` or `text-button` (app-dependent) |
| `text-lg`   | `text-large`                                 |
| `text-xl`   | `text-xlarge`                                |
| `text-2xl`  | `text-heading`                               |
| `text-3xl`  | `text-subtitle`                              |
| `text-4xl`  | `text-title`                                 |

See `globals.css` for actual values and associated line-heights/letter-spacing.

### Spacing (the -4 rule)

Replace Tailwind's `-4` spacing with `-inset` for consistent internal component
spacing.

| ShadCN Pattern                                        | Design System                                                                     |
| ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| `p-4`, `px-4`, `py-4`, `pt-4`, `pb-4`, `pl-4`, `pr-4` | `p-inset`, `px-inset`, `py-inset`, `pt-inset`, `pb-inset`, `pl-inset`, `pr-inset` |
| `m-4`, `mx-4`, `my-4`, `mt-4`, `mb-4`, `ml-4`, `mr-4` | `m-inset`, `mx-inset`, `my-inset`, `mt-inset`, `mb-inset`, `ml-inset`, `mr-inset` |
| `gap-4`                                               | `gap-inset`                                                                       |
| `space-x-4`, `space-y-4`                              | `space-x-inset`, `space-y-inset`                                                  |

Other spacing tokens: `inset2`, `inset3`, `inset4`, `inset5`. See `globals.css`
for values.

### Border Radius

| ShadCN       | Design System    |
| ------------ | ---------------- |
| `rounded-sm` | `rounded-button` |
| `rounded-md` | `rounded-card`   |
| `rounded-lg` | `rounded-squish` |
| `rounded-xl` | `rounded-dialog` |

Also available: `rounded-soft`. See `globals.css` for values.

## Processing Steps

1. **Sort classes** per the sorting rule (only if >5 classes on an element)
2. **Apply typography mappings** — never use `text-sm`, `text-lg`, `text-xl`
3. **Apply spacing mappings** — replace `-4` with `-inset`
4. **Apply radius mappings** — use semantic radius tokens
5. **Verify tokens exist** in `classes.ts` — if you need a new token, add it
   there first

## Example Transformation

### Before (raw ShadCN)

```tsx
<div className="flex items-center gap-4 rounded-md p-4 text-sm font-medium transition-colors hover:bg-accent">
```

### After (design system)

```tsx
<div
  className={cn(
    // layout
    "flex items-center gap-inset",
    // shape
    "rounded-card p-inset",
    // typography
    "text-small font-medium",
    // hover
    "hover:bg-accent",
    // transitions
    "transition-colors"
  )}
>
```

## Checklist

Before committing a ShadCN component adaptation:

- [ ] No `text-sm`, `text-lg`, `text-xl` — use `text-small`, `text-large`,
      `text-xlarge`
- [ ] No `-4` spacing — use `-inset` variants
- [ ] No `rounded-sm`, `rounded-md`, `rounded-lg` — use semantic radius tokens
- [ ] Classes sorted and commented (if >5 classes)
- [ ] Any new tokens added to `classes.ts`
