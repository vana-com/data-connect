---
title: React Refresh only-export-components disabled
date: 2026-01-30
---

We disable `react-refresh/only-export-components` to keep co-located variants
(`badgeVariants`, `buttonVariants`, etc.) in the same file as components.

The rule's `allowConstantExport` option only works for primitive constants, not
function call results like `cva()`. Since we use cva extensively, we turn it off
entirely. Fast Refresh still works; you just lose guaranteed state preservation
when editing files that export non-components.

Config:

```js
rules: {
  'react-refresh/only-export-components': 'off',
},
```
