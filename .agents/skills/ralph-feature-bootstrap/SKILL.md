---
name: ralph-feature-bootstrap
description: Bootstrap a new Ralph feature pack from a source document. Use when the user asks to set up a new Ralph feature, feature pack, or loop from a document/audit/plan and wants the scaffolding created automatically.
---

# Ralph Feature Bootstrap

## Goal

Create a new Ralph feature pack from a source document with minimal scaffolding:

- `specs/<slug>.md` derived from the source doc
- `IMPLEMENTATION_PLAN.md` as an empty stub (planning mode fills it)

## Inputs

- **Required**: source document path (e.g. `docs/260130-react-audit-storage-and-vercel-review.md`)
- **Optional**: feature slug (e.g. `react-audit-storage`)
- **Optional**: feature title (human‑readable)

If slug/title are not provided, derive them from the source doc path.

## Derive feature slug

1. Start from the source doc basename (no extension).
2. Remove leading `YYMMDD-` if present.
3. Drop common suffixes: `-review`, `-plan`, `-spec`, `-notes`.
4. Replace spaces/underscores with hyphens.
5. Lowercase the result.

## Files to create

Target root: `scripts/ralph/features/<slug>/`

```
scripts/ralph/features/<slug>/
  IMPLEMENTATION_PLAN.md
  specs/
    <slug>.md
```

## Content rules

### `specs/<slug>.md`

Read the source doc and extract the *minimum* viable spec:

```
# <Feature title>

## Source
- `<source doc path>`

## Goals
- <2–4 bullets distilled from the doc>

## Constraints
- React frontend only (`src/`)
- Preserve existing styles and classes
- Don’t overwrite existing comments
- No UX changes beyond what the source doc calls out

## Acceptance criteria
- <3–6 bullets distilled from the doc>
```

Keep it concise; no extra commentary.

### `IMPLEMENTATION_PLAN.md`

Create an **empty file** (no template). Planning mode generates the plan.

## Execution checklist

1. Create the directory structure.
2. Create `specs/<slug>.md` from the source doc.
3. Create empty `IMPLEMENTATION_PLAN.md`.
4. Do **not** run the loop unless the user explicitly asks.
