# 260211-settings-layout-and-runs-integration

## Goal

Ship the new Settings page structure and styling, and integrate Runs into Settings with canonical URL-backed section state for deep-linking.

## Constraints

- Keep `src/pages/settings/index.tsx` as composition/entry only.
- Keep existing settings behavior intact (account/apps/storage/credentials/about actions).
- Preserve existing `/runs` links by redirecting to the new canonical Settings URL.
- Keep URL state canonical and shareable (`section` and `source`).

## Existing patterns

- `src/pages/source/index.tsx` + `source-overview-layout.tsx` for layout composition.
- `src/pages/runs/use-runs-page.ts` already owns runs URL filter behavior (`source`).
- `src/pages/settings/use-settings-page.ts` is route orchestration hook.

## Proposed approach

1. **Settings layout structure**
   - `settings-overview-layout` with 2-column grid at `lg`.
   - `settings-sidebar` for section nav state.
   - `settings-content` for title/description + section body.

2. **URL-backed section state**
   - Derive settings section from `?section=...`.
   - Fallback to `account` for invalid/missing values.
   - Update URL on sidebar selection.

3. **Runs integration**
   - Add `runs` to `SettingsSection`.
   - Render runs content inside settings content cell.
   - Add runs as sidebar section (same active styling model).

4. **Canonical URL helper**
   - Add `src/pages/settings/url.ts`:
     - `SETTINGS_SECTION_PARAM`
     - `DEFAULT_SETTINGS_SECTION`
     - `isSettingsSection`
     - `buildSettingsUrl(...)`
   - Use helper in `/runs` redirect and settings state logic.

5. **Runs route back-compat**
   - `/runs` redirects to `/settings?section=runs` and preserves query params like `source`.

## Edge cases

- Invalid `section` query: fallback to `account`.
- `/runs?source=<id>` keeps `source` after redirect.
- Settings section changes should not clobber unrelated query params.
- Runs panel in settings should fill available content-cell width.

## Validation checklist

- [x] `npx tsc --noEmit`
- [x] Scoped tests for settings/runs URL behavior
- [x] `ReadLints` clean on changed files
- [x] Manual check: sidebar active state reflects URL `section`
- [x] Manual check: `/runs` deep-links land on settings runs section

## Out of scope

- Storage/server provider persistence model finalization.
- Full visual parity pass for every settings subsection.
- Any unrelated page layout refactors.
