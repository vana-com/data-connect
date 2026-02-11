# 260211-runs-filter-by-source

## Goal

Add a very simple filter control to `src/pages/runs`:

- `All` (default)
- one filter per data source available to the current account

Filtering is by data source only (no other sorting/filter dimensions in this iteration).

## Constraints

- Filter options must match the same account-scoped sources shown in Home "Your sources" (`src/pages/home/components/connected-sources-list.tsx` input data).
- URL search state is the source of truth for selected filter (hoisted state), not local component-only state.
- Keep UI simple: horizontal filter row at top of runs page content.
- Preserve existing run grouping/order behavior unless required for source filtering.

## Existing patterns

- Runs page composition: `src/pages/runs/index.tsx` + `src/pages/runs/use-runs-page.ts`
- Home "Your sources" reference: `src/pages/home/components/connected-sources-list.tsx`
- URL param handling pattern: `useSearchParams` in `src/pages/connect/index.tsx`, `src/pages/grant/index.tsx`

## Proposed approach (stub)

1. Add URL-backed filter param for runs page
   - Param name (proposal): `source`
   - Allowed values:
     - `all` (or absence of param)
     - a specific source/platform id
2. Derive filter options from the same connected sources dataset used to render Home "Your sources"
3. Render simple filter chips/buttons at top of runs page:
   - first option: `All`
   - then one option per available source
4. Apply selected filter to both active and finished run lists in `use-runs-page.ts`
5. Keep navigation/share behavior deterministic:
   - opening `/runs?source=<id>` restores that selected filter

## Edge cases

- No connected sources: show only `All`; runs list still renders current behavior.
- URL contains unknown source id: fallback to `All`.
- Source exists but has zero runs: filter is selectable and shows empty state for that subset.

## Validation checklist

- [ ] `All` shows current unfiltered runs behavior.
- [ ] Selecting a source updates URL and filters list.
- [ ] Reload preserves selected source from URL.
- [ ] Invalid `source` query falls back to `All`.
- [ ] Filter options match Home "Your sources" for the same account.

## Out of scope

- Multi-select filters.
- Status/date/search filters.
- Reordering/sorting changes beyond existing runs ordering.
- Any backend/API changes.
