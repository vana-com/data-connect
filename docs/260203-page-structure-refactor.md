# Page structure refactor for remaining routes

## Context

- Some pages still live as `src/pages/*.tsx` while others have been moved to route folders.
- We want consistency with `ui-page-structure` for layout and logic/JSX separation.

## Scope

- `src/pages/BrowserLogin.tsx`
- `src/pages/YourData.tsx`
- `src/pages/DataApps.tsx`
- `src/pages/RickRollApp.tsx` (defer relocation; keep at root for now and revisit once multiple app routes exist)

## Approach

- Move any page with page-local UI/data into `src/pages/<route>/index.tsx`.
- Split view-state JSX into page components; keep orchestration in route-level hooks.
- Colocate page-only components, utilities, and fixtures within the route folder.

## Skills

- Apply `ui-page-structure` when generating the plan and during implementation.

## Non-goals

- UX or visual changes.
- Behavior changes.

## Acceptance criteria

- `BrowserLogin` moved to `src/pages/browser-login/` with view-state components and a single route-level hook.
- `YourData` moved to `src/pages/your-data/` with section components and platform display mapping in `utils.ts`.
- `DataApps` moved to `src/pages/data-apps/` with `AppCard` in `components/` and mock data in `fixtures.ts`.
- `RickRollApp` remains at `src/pages/RickRollApp.tsx` (explicitly deferred).
- The plan explicitly references applying `ui-page-structure`.
