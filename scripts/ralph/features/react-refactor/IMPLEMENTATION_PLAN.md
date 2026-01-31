# Implementation Plan

## Phase 1: Core Refactoring Tasks

| ID | Task | Done when | Backpressure | File(s) | Status | Notes |
|----|------|-----------|--------------|---------|--------|-------|
| R1 | Extract export data normalization to single-source utility | `normalizeExportData()` function exists in `src/lib/exportData.ts`, all 3 extraction sites in useEvents.ts use it, no `as any` casts for field access | `npm run typecheck && npm run build` | `src/lib/exportData.ts`, `src/hooks/useEvents.ts` | ✅ DONE | Created typed utility with 10 unit tests; 2 extraction sites in useEvents.ts now use it |
| R2 | Memoize runs sorting/filtering | `useMemo` wraps `sortedRuns`, `activeRuns`, `completedRuns` in Runs.tsx; deps array includes only `runs` | `npm run typecheck && npm run build` | `src/pages/Runs.tsx` | ✅ DONE | sortedRuns depends on `runs`, activeRuns and completedRuns depend on `sortedRuns` |
| R3 | Memoize Home page platform filtering | `useMemo` wraps `connectedPlatforms`, `availablePlatforms` in Home.tsx | `npm run typecheck && npm run build` | `src/pages/Home.tsx` | ✅ DONE | Both filters memoized with deps: `platforms`, `isPlatformConnected`, `recentlyCompleted` |
| R4 | Memoize YourData page filtering | `useMemo` wraps `connectedSources`, `availableSources` in YourData.tsx | `npm run typecheck && npm run build` | `src/pages/YourData.tsx` | ✅ DONE | Both filters memoized with deps: `platforms`, `connectedPlatforms` |
| R5 | Replace window.location.href with React Router navigate in DataApps | No `window.location.href` for internal routes in DataApps.tsx; uses `useNavigate()` instead | `npm run typecheck && npm run build` | `src/pages/DataApps.tsx` | ✅ DONE | AppCard component now uses useNavigate() for `/apps/${app.id}` navigation |
| R6 | Fix BrowserContext interval cleanup | `clearInterval(progressInterval)` called in cleanup function; no interval leak on unmount | `npm run typecheck && npm run build` | `src/context/BrowserContext.tsx` | ✅ DONE | Added useRef to track interval ID; cleanup function in useEffect clears on unmount |
| R7 | Remove unused handler callbacks from useConnector | `handleConnectorLog`, `handleConnectorStatus`, `handleExportComplete` removed from useConnector.ts (they're duplicated in useEvents.ts and never called) | `npm run typecheck && npm run build` | `src/hooks/useConnector.ts` | ✅ DONE | Removed 3 handlers and 3 unused imports (updateExportStatus, updateRunLogs, updateRunConnected); only startExport and stopExport are used by consumers |

## Phase 2: Component Splitting (after Phase 1)

| ID | Task | Done when | Backpressure | File(s) | Status | Notes |
|----|------|-----------|--------------|---------|--------|-------|
| R8 | Split Settings into section components | Settings.tsx imports and renders `<SettingsAccount>`, `<SettingsApps>`, `<SettingsStorage>`, `<SettingsAbout>`; each section in own file under `src/pages/settings-sections/` | `npm run typecheck && npm run build` | `src/pages/Settings.tsx`, `src/pages/settings-sections/*.tsx` | ✅ DONE | Folder named `settings-sections` to avoid case-sensitivity conflict with Settings.tsx; reduced from 957 to 233 lines; all logic and handlers remain in parent |
| R9 | Centralize localStorage access with versioned keys | `src/lib/storage.ts` exports typed get/set for `connected_app_*` keys; Settings.tsx and GrantFlow.tsx use it; version prefix in key names | `npm run typecheck && npm run build` | `src/lib/storage.ts`, `src/pages/Settings.tsx`, `src/pages/GrantFlow.tsx` | ✅ DONE | Created `v1_connected_app_` prefix; auto-migrates legacy unversioned keys on read; updated Settings.tsx, GrantFlow.tsx, RickRollApp.tsx; removed legacy `connected_apps` array |
| R10 | Add route lazy loading for largest pages | Settings, GrantFlow, Runs wrapped with `React.lazy()` in App.tsx; Suspense boundary with fallback | `npm run typecheck && npm run build` | `src/App.tsx` | ✅ DONE | Three separate chunks created: Runs (9.5kB), GrantFlow (11.6kB), Settings (21.4kB) |

## Notes

- **Phase 2** tasks (R8-R10) should only begin after Phase 1 is complete
- Tasks R2, R3, R4 are independent and can be done in any order
- R1 should be done first as it establishes the normalization pattern used elsewhere
- R7 removes dead code that could confuse future maintainers
- R8 is the largest task but is straightforward extraction (no logic changes)
