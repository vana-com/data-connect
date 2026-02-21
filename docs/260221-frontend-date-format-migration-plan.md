# Frontend date format migration plan

Target output format for UI timestamps: `Sat Feb 21, 09:51`.

Scope constraints:

- Frontend TypeScript/TSX only (`src/**`)
- Do not modify Playwright connector files
- Do not modify Rust (`src-tauri/**`)

## Canonical formatter

- Keep `src/lib/date-format.ts` as the single formatting surface.
- Current function: `formatShortWeekdayMonthTime(value: string | Date)`.
- Rule: JSX files should call the formatter, not `toLocaleString()` directly.

## Frontend callsites (6)

1. `src/pages/settings/sections/imports/components/import-history-panel.tsx`
2. `src/pages/settings/components/settings-credentials.tsx`
3. `src/pages/home/components/connected-apps-list.tsx`
4. `src/pages/source/components/source-preview-card.tsx`
5. `src/pages/settings/sections/imports/components/run-item/run-item-utils.ts`
6. `src/lib/platform/ui.tsx`

## Migration steps

1. Replace inline date formatting in each callsite with `formatShortWeekdayMonthTime`.
2. Preserve existing UI copy and layout; only swap date formatting implementation.
3. If a callsite intentionally needs date-only/weekday-only text, add a dedicated helper in
   `src/lib/date-format.ts` and use that helper explicitly.
4. Remove dead local date-format helper functions after replacement.
5. Run lint for touched files and resolve warnings/errors.

## File-by-file execution order

1. `settings-credentials.tsx`
2. `connected-apps-list.tsx`
3. `source-preview-card.tsx`
4. `run-item-utils.ts`
5. `platform/ui.tsx`
6. Final pass on `import-history-panel.tsx` consistency check

## Verification checklist

- All frontend date formatting routes through `src/lib/date-format.ts`.
- Rendered timestamp shape is consistent (`Sat Feb 21, 09:51`) where date+time is shown.
- No regressions in Settings imports/history rows.
- No changes in Playwright connector behavior or Rust timestamp serialization.
