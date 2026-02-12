# Settings Standardization Plan

## Goal

Standardize repeated Settings UI patterns across `settings-account`, `settings-apps`, and `settings-storage` without over-abstracting behavior.

Primary outcome: reduce visual and API drift in repeated row/copy/action patterns while preserving panel-specific logic.

## Current Shared Baseline

Already shared and in active use:

- `SettingsSection` (section title + description block)
- `SettingsCard` (card shell, optional dividers)
- `SettingsRow` (icon + content + optional right action)
- `SettingsMetaRow` (summary/content on left + badge/action on right)
- `SettingsBadge*` (status dot + label variants)

## Frozen UI Contracts (Phase 1)

Treat these as stable conventions to apply uniformly across the first three panels:

1. Card stack wrapper:
   - `form-outset space-y-3`
   - Promote to `SettingsCardStack` wrapper primitive.
2. Row copy contract:
   - Row title: `Text as="div" intent="body" weight="semi"`
   - Row description: `Text as="div" intent="small" muted"`
   - Section description: `Text as="p" intent="small" dim"`
3. Row-right action contract:
   - `Button variant="ghost" size="sm"` for row-level actions.
   - Promote to `SettingsRowAction` primitive (rendering only, no business logic).
4. Header/meta row contract:
   - Unify "summary row" usage (for example, account session summary and storage meta rows) under one shared shape.
   - Keep content/labels panel-local.

## Promotion Rule (When to Move to Shared)

Promote only when all are true:

1. Pattern appears in 2+ settings panels.
2. DOM shape and spacing are effectively the same.
3. Variation is prop-driven (not branch-heavy conditional layout).

If extraction requires complex branching, keep it local.

## Non-Goals (Phase 1)

- No dialog abstraction (`AlertDialog` flows stay local).
- No state/behavior abstraction (`useState`, selection/save logic stays local).
- No broad class/token rewrites.
- No visual redesign.

## Candidate Shared Primitives (Priority Order)

1. `SettingsCardStack`
2. `SettingsRowAction`
3. `SettingsInlineStatus` (status dot + label + optional meta text)
4. `SettingsHeaderRow` (group summary + right affordance)

`SettingsSection` and `SettingsRow` remain the base contracts; this phase tightens usage consistency around them.

## Evaluation Workflow Per Panel

For each panel block:

1. Label it:
   - Same as baseline
   - Same with minor prop differences
   - Different shape
2. Promote only first two categories.
3. Keep "Different shape" local until it appears again in another panel.

## Low-Risk Extraction Sequence

1. Create panel-local helper first (prove the API).
2. Reuse the helper in a second panel.
3. Move helper to `settings-shared`.
4. Replace both call sites with the shared primitive.

This sequence minimizes churn and avoids premature generalization.

## Done Criteria (for this standardization pass)

- All three panels use one shared card-stack wrapper primitive.
- Repeated row title/description text patterns use one shared contract.
- Row-right actions use one shared rendering primitive.
- Summary/meta rows align to one shared shape where layout matches.
- No behavior changes and no intentional visual diffs beyond text/content.

## Guardrails

- Keep shared APIs small and literal.
- Prefer composition slots over boolean prop bloat.
- Do not extract one-off layouts.
- Run touched-file lint checks after each extraction PR.

