---
name: tailwind-sort
description:
  Sort Tailwind classes for legibility. Use when a JSX element or cva has more
  than five Tailwind classes.
---

# Sort Tailwind classes on a JSX element or a CVA object

**Only apply this sorting when there are more than 5 Tailwind class names.** For
1-4 classes, leave them as-is on a single line without grouping or comments.

To make styles legible, please sort the classes on a JSX element or within a
`cva` definition by using `cn` as shown below.

Remember to add a comment that labels each group.

Here's an example in CVA (components/ui/button: buttonVariants).

From:

```ts
cva(
  "ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {}
);
```

To:

```ts
cva(
  [
    // layout
    "inline-flex items-center justify-center gap-2",
    // shape
    "rounded-md",
    // typography
    "text-sm font-medium whitespace-nowrap",
    // focus
    "ring-offset-background focus-visible:ring-ring",
    // disabled
    "disabled:pointer-events-none disabled:opacity-50",
    // svg
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    // transitions
    "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
  ],
  {}
);
```

Here's an example in JSX (components/ui/tabs: TabsTrigger).

From:

```tsx
/*  */
<div
  className={cn(
    "ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm",
    className
  )}
/>
```

To:

```tsx
<div
  className={cn(
    // layout
    "inline-flex items-center justify-center",
    // shape
    "rounded-sm px-3 py-1.5",
    // typography
    "text-sm font-medium whitespace-nowrap",
    // focus
    "ring-offset-background",
    "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
    // disabled
    "disabled:pointer-events-none disabled:opacity-50",
    // transitions
    "transition-all",
    // states
    "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
    className
  )}
/>
```

Please note that:

- `cn` is a util that merges duplicate Tailwind classes, and handles aggregating
  a string of classes from all conditionals. Uses clsx and tailwind-merge.
- `cx` is calls-variance-authority's exported version of `clsx`. Use this
  instead of `cn` because `cn` will remove text-\* classes but we need those
  unduplicated because they can both style colour and font-size!
  `import { VariantProps, cva, cx } from "class-variance-authority";`
- `cva` from class-variance-authority allows us to create type-safe UI
  components with variants. See: https://cva.style/docs
