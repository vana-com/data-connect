# React Refactor - Two

## Source
- `docs/260130-react-refactor-implementation-gap.md`

## Goals
- Close remaining Phase 1–3 gaps from the refactor plan
- Remove duplicated platform icon logic and event listener risks
- Reduce bundle load by finishing page splitting and lazy loading

## Constraints
- React frontend only (`src/`)
- Preserve existing styles and classes
- Don’t overwrite existing comments
- No UX changes beyond what the source doc calls out

## Acceptance criteria
- Shared platform icon helper used by `Home` and `ConnectorUpdates`
- `useEvents` listener registration guarded against duplicate listeners (dev/HMR)
- InlineLogin listener cleanup is synchronous-safe on unmount
- `useConnectorUpdates` no longer auto-loads platforms and memoizes update counts
- `GrantFlow` session fetch does not re-run on auth state changes
- `Home` + `GrantFlow` split into subcomponents; `Home`, `DataApps`, `RickRollApp` are lazy loaded

