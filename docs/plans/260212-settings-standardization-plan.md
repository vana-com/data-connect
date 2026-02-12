# Settings Standardization Plan

## Goal

Capture reusable settings UI patterns from `settings-account` without prematurely abstracting, then apply the same framework to the next settings panel.

## Stable Patterns Observed in Account

- Card stack wrapper pattern (`form-outset space-y-3`)
- Section heading pattern (`SettingsSection` title + description)
- Row shape (`SettingsRow`: icon, content column, right action)
- Row description text pattern (`intent="small"` + `muted`/`dim`)
- Action button pattern (row-right ghost small actions)
- Session status inline pattern (dot + status text + meta text)

## Promotion Rule (When to Move to Shared)

Promote only when all are true:

1. Pattern appears in 2+ settings panels
2. DOM shape and spacing are effectively the same
3. Variation is prop-driven (not branch-heavy conditional layout)

If extraction requires complex branching, keep it local.

## Candidate Shared Primitives (In Likely Order)

1. `SettingsCardStack` (encapsulate `form-outset space-y-3`)
2. `SettingsRowAction` (standard row-right ghost/sm action affordance)
3. `SettingsInlineStatus` (status dot + label + meta text)
4. `SettingsGroupHeaderRow` (summary + right action row, e.g. "1 other session")

`SettingsSection` and `SettingsRow` already exist; keep tightening their contracts incrementally.

## Next Panel Evaluation Workflow

Before refactoring:

1. Mark each block as:
   - Same as Account
   - Same with minor prop differences
   - Different shape
2. Promote only first two categories to shared candidates
3. Keep "Different shape" local until another panel matches it

## Low-Risk Extraction Strategy

1. Create panel-local helper first (prove API)
2. Reuse helper in a second panel
3. Move helper to `settings-shared`
4. Replace both usages with shared primitive

This reduces churn and avoids over-generalization.

## Guardrails

- No broad style rewrites during extraction
- Keep shared APIs small and literal
- Prefer composition slots over boolean prop bloat
- Run touched-file lint checks after each extraction

