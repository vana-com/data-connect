---
title: React Refresh constant exports
date: 2026-01-30
---

We allow constant exports in component modules to keep co-located variants
(`badgeVariants`, etc.) without tripping React Refresh linting. This keeps the
developer flow while preserving Fast Refresh semantics.

Config:

```
rules: {
  'react-refresh/only-export-components': [
    'error',
    { allowConstantExport: true },
  ],
},
```
