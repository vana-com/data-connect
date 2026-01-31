# React Refactor Implementation Gap Review

Date: 2026-01-30

## Purpose

Validate which items from the refactor plan are done in code, identify missing or partially completed tasks, and record evidence for a follow-on Ralph feature.

## Source Docs

- `docs/260130-react-refactor-plan.md`
- `scripts/ralph/features/react-refactor/specs/react-refactor.md`
- `scripts/ralph/features/react-refactor/IMPLEMENTATION_PLAN.md`

## Summary

The implementation plan covers some but not all items from the refactor plan. Several Phase 1–3 items are still missing in code, while a few missing items are already done but not recorded in the plan/spec.

## Evidence-Based Status (by original refactor plan)

### Phase 1 — Risk & Correctness

- **Export data normalization single source**: DONE  
  Evidence: `normalizeExportData` used in `src/hooks/useEvents.ts`.
- **Platform icon consolidation**: NOT DONE  
  Evidence: duplicated icon mapping in `src/pages/Home.tsx` and `src/components/ConnectorUpdates.tsx`.
- **Safe event listener lifecycle (singleton + dev/HMR guard)**: NOT DONE  
  Evidence: `useEvents` registers listeners inside a `useEffect` without a singleton guard.
- **Fix async listener cleanup in InlineLogin**: NOT DONE  
  Evidence: cleanup still `unlisten.then(...)` in `src/components/auth/InlineLogin.tsx`.
- **Decouple hook side-effects (useConnectorUpdates → usePlatforms)**: NOT DONE  
  Evidence: `useConnectorUpdates` imports `usePlatforms` and calls `loadPlatforms`, while `usePlatforms` auto-loads on mount.
- **Split session fetch from auth gating in GrantFlow**: NOT DONE  
  Evidence: session fetch effect depends on `isAuthenticated`, `walletAddress`, `authLoading` in `src/pages/GrantFlow.tsx`.
- **LocalStorage schema/versioning + guards**: DONE  
  Evidence: `src/lib/storage.ts` uses versioned keys, index, and `safeSetItem` quota handling.

### Phase 2 — Performance & Rendering

- **Replace effect-driven derived state with memoized values**: PARTIAL  
  Evidence: `Home` uses memoized `recentlyCompleted` and platform filters.
- **Memoize expensive filtering/sorting for runs and platforms**: DONE  
  Evidence: `Runs`, `Home`, `YourData` use `useMemo` for filtering/sorting.
- **Memoize derived counts in useConnectorUpdates**: NOT DONE  
  Evidence: counts computed inline each render in `src/hooks/useConnectorUpdates.ts`.
- **Make funFacts deterministic per load**: DONE  
  Evidence: `src/apps/rickroll/index.tsx` uses seeded ref + memoized facts.
- **Ensure timers cleared on unmount/restart**: DONE  
  Evidence: `BrowserContext` clears interval on unmount and before restart.

### Phase 3 — Structure & Bundle

- **Split large pages (Home, Settings, GrantFlow)**: PARTIAL  
  Evidence: Settings split into sections; Home/GrantFlow still monoliths.
- **Route-level lazy loading for major pages**: PARTIAL  
  Evidence: `Runs`, `Settings`, `GrantFlow` lazy loaded; `Home`, `DataApps`, `RickRollApp` still eager.
- **Replace window.location for internal routing**: PARTIAL  
  Evidence: DataApps uses `useNavigate`; RickRoll still uses `window.location` for deep-link and reload (not internal, but still usage).

### Phase 4 — Styling Decision

- **Tailwind vs inline decision + migration strategy**: NOT STARTED  
  Evidence: no decision recorded; styles remain inline.

## Items Missing from Implementation Plan (but present in refactor plan)

These should be added to the next Ralph feature scope:

- Platform icon consolidation into shared helper
- `useEvents` singleton guard (prevent duplicate listeners in dev/HMR)
- InlineLogin listener cleanup without async teardown
- Decouple `useConnectorUpdates` from `usePlatforms` auto-load
- Session fetch decoupled from auth state in `GrantFlow`
- Memoize counts in `useConnectorUpdates`
- Split `Home` + `GrantFlow` into subcomponents
- Lazy load `Home`, `DataApps`, `RickRollApp`
- Decide styling strategy (Tailwind vs inline) and plan

## Items Done but Not Captured in the Plan/Spec

- LocalStorage versioning + quota guard in `src/lib/storage.ts`
- Deterministic fun facts in `src/apps/rickroll/index.tsx`

