# React Refactor Plan (No Code Changes Yet)

Scope: React frontend in `src/` and related UI patterns. This doc focuses on refactor priorities, not implementation.

## Goals

- Reduce runtime risk from loose typing, event handling, and duplicated logic
- Improve performance by eliminating unnecessary re-renders and heavy eager loads
- Normalize styling and component structure for maintainability
- Keep UX identical unless explicitly specified

## Constraints

- No code changes until we agree on this plan
- Preserve existing styles and classes until a styling decision is made
- Avoid overwriting existing comments

## Key Findings (Condensed)

- Derived state stored in effects and recomputed lists on every render (`Home`, `Runs`)
- Per-render sorting/filtering for runs and platform lists (`Runs`, `Home`)
- Session fetch effect coupled to auth state (causes refetch on auth changes) (`GrantFlow`)
- Event listener cleanup is async and can race unmount (`InlineLogin`)
- Global event listeners created in hooks without singleton guard (`useEvents`)
- Hook coupling causes unintended side-effects (`useConnectorUpdates` → `usePlatforms` → auto `loadPlatforms()`)
- Derived counts recomputed on every render (`useConnectorUpdates`)
- LocalStorage used as store without schema/versioning and scans all keys (`Settings`, `GrantFlow`, `RickRollApp`)
- LocalStorage writes not guarded for quota/errors (`GrantFlow`)
- Heavy pages eagerly imported; no route-level lazy loading (`App`)
- Duplicate logic for platform icons + export data transformations
- Timers created without unmount guards (`BrowserContext`, `BrowserSetup`)
- Randomized computed values created every render (`useRickRollData`)

## Proposed Refactor Phases

### Phase 1 — Risk & Correctness

- Add a single source of truth for export data normalization
  - Extract normalization into a helper (shared by `useEvents` and `Runs`)
- Consolidate platform icon resolution
  - Move icon mapping and `getPlatformIcon` into a shared helper
- Introduce a safe event listener lifecycle
  - Guarantee `useEvents` runs once per app lifecycle
  - Guard against duplicate listeners in dev/hot reload
- Fix async listener cleanup
  - Ensure `InlineLogin` unlisten is synchronous-safe on unmount
- Decouple hook side-effects
  - `useConnectorUpdates` should not implicitly trigger `loadPlatforms()`
  - Separate data-fetching from subscription hooks
- Split session fetch from auth gating
  - Avoid refetching session data when auth flags change
- Add localStorage schema/versioning
  - Centralize `connected_app_*` read/write
  - Cache reads to avoid scanning localStorage on every mount
  - Guard writes against quota/errors

### Phase 2 — Performance & Rendering

- Replace effect-driven derived state with memoized values
  - `recentlyCompleted` in `Home`
- Memoize expensive filtering/sorting for platforms and runs
- Memoize derived counts in `useConnectorUpdates`
- Make `funFacts` deterministic per load (cache result)
- Ensure timers are cleared on unmount or restart

### Phase 3 — Structure & Bundle

- Split large pages into smaller components
  - `Home`, `Settings`, `GrantFlow`
- Add route-level lazy loading for page routes
  - `Home`, `Settings`, `GrantFlow`, `Runs`, `DataApps`, `RickRollApp`
- Replace `window.location` navigation with router navigation

### Phase 4 — Styling Decision

- Decide on Tailwind vs inline styles (or a hybrid rule)
- If Tailwind: define a migration strategy to avoid visual regressions
- If inline: centralize style objects/constants to reduce duplication

## Acceptance Criteria

- No duplicate event handlers registered at runtime
- Listener cleanup never relies on async teardown
- Export data normalization is single-sourced and type-safe
- No `window.location` for internal routing
- LocalStorage access is centralized and versioned
- No per-render sort/filter for runs or platform lists
- Largest pages are split into smaller components (clear ownership)
- Route bundle size reduced via lazy loading

## Open Questions

- Do we want to keep inline styles or switch to Tailwind?
- Should connected apps live in Redux, localStorage, or both (with sync)?
- Do we need strict typing for export payloads now or later?

## Suggested Order of Work

1. Shared helpers (icons, export normalization, localStorage service)
2. Event listener lifecycle hardening
3. Derived state/memoization
4. Route lazy loading + internal navigation
5. Component splitting
6. Styling standardization
