# Page structure refactor for remaining routes

## Source

- `docs/260203-page-structure-refactor.md`

## Goals

- Align remaining root routes with `ui-page-structure` conventions.
- Separate route logic from view-state JSX via page-local components.
- Keep page-local data and utilities colocated with their routes.

## Constraints

- React frontend only (`src/`)
- Preserve existing styles and classes
- Don’t overwrite existing comments
- No UX changes beyond what the source doc calls out
- Follow `ui-page-structure` for route layout and logic/JSX split

## Skills

- Apply `ui-page-structure` when generating the plan and during implementation.

## Acceptance criteria

- `BrowserLogin` lives at `src/pages/browser-login/` with view-state components and a single route-level hook.
- `YourData` lives at `src/pages/your-data/` with section components and platform display mapping in `utils.ts`.
- `DataApps` lives at `src/pages/data-apps/` with `AppCard` in `components/` and mock data in `fixtures.ts`.
- `RickRollApp` remains at `src/pages/RickRollApp.tsx` (relocation explicitly deferred).
- The plan explicitly references applying `ui-page-structure`.
