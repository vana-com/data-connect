---
name: ui-page-readme
description: Write concise README.md files for a page/route folder or co-located components, covering purpose, boundaries, data flow, integration points, and tests. Use when asked to document a page, route, or component bundle.
---

# UI Page README

## When to use

- User asks for a README for a page, route, or co-located component set.
- User asks to “describe this page/section” in repo docs.
- User asks for a README inside a `src/pages/*` directory.

## Required reads (before writing)

- `docs/architecture.md` to align with runtime boundaries and system roles.
- If the page touches grant flow, also read `docs/260203-grant-connect-flow.md`.
- If unrelated to grant flow, explicitly say so in the README.

## Placement

- Put `README.md` in the page’s folder (co-located with route components).
- This is an intentional exception to `doc-creation` (no `YYMMDD-*` prefix).

## Content checklist (keep it tight)

Use short sections; prefer bullets; no fluff.

1. **What this is**
   - One sentence purpose + what it owns.
2. **Files**
   - List co-located files and their roles.
3. **Data flow**
   - Key hooks/state sources + how data moves.
4. **App integration**
   - Route, entry points, integration with other flows.
   - Explicitly mention Tauri/IPC or Personal Server if used.
5. **Behavior**
   - Key user-visible behaviors and actions.
6. **Notes**
   - Constraints, edge cases, or gotchas.

## Template

Use this structure:

```
# <Page name>

## What this is
- <Purpose and boundary>

## Files
- <file>: <role>

## Data flow
- <source> → <transform> → <render>

## App integration
- Route: <path>
- Entry points: <where linked from>
- Integration: <flows or systems touched>

## Behavior
- <user-visible behavior>

## Notes
- <constraints/edge cases>
```

## Style rules

- If the user asks for cross-repo/system docs, use `doc-creation` instead.
- Keep it under ~50 lines unless asked for more.
- Use repo terminology (runs, grants, personal server).
- Don’t invent flows; cite actual integrations only.
