## Your Data page

### What this is

- Dashboard for managing connected data sources and apps.
- Tabbed interface switching between "Sources" and "Apps" views.
- Currently an orphaned page (not routed) but preserved for future use.

### Files

- `index.tsx`: page shell, tab switching, section wiring.
- `types.ts`: `TabKey` union type, `PlatformDisplay` type.
- `utils.ts`: `PLATFORM_DISPLAY` constant (10 platforms), `getPlatformDisplay` helper.
- `use-your-data-page.ts`: route-level state, derived lists, navigation handlers.
- `components/your-data-header.tsx`: page title and description.
- `components/your-data-tabs.tsx`: tab switcher UI.
- `components/connected-sources-section.tsx`: grid of connected platform cards.
- `components/available-sources-section.tsx`: grid of available platforms with connect buttons.
- `components/connected-apps-section.tsx`: empty state for apps tab.

### Data flow

- `use-your-data-page.ts` provides:
  - `activeTab` state for tab switching.
  - `connectedSources` and `availableSources` derived from `usePlatforms()` and Redux state.
  - `handleConnectSource(platformId)` navigates to `/?platform={platformId}`.
  - `handleViewRuns()` navigates to `/runs`.
- Components receive props from the hook; no direct Redux access in presentational components.

### App integration

- Route: Not currently routed (orphaned page).
- Dependencies: `usePlatforms` hook, Redux `connectedPlatforms` state.

### Behavior

- Sources tab shows connected platforms at top, available platforms below.
- Connected sources display a "View Runs" action.
- Available sources display a "Connect" action that navigates to home with platform param.
- Apps tab shows empty state placeholder.

### Notes

- Direct imports only (no barrels) per Vercel React rule `bundle-barrel-imports`.
- Platform display config is colocated in `utils.ts` for easy updates.
- Follows container/presenter pattern: hook handles logic, components handle rendering.
