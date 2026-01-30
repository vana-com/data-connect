# React Refactor (Frontend)

## Goals

- Reduce runtime risk from loose typing, event handling, and duplicated logic
- Improve performance by eliminating unnecessary re-renders and heavy eager loads
- Normalize styling and component structure for maintainability
- Keep UX identical unless explicitly specified

## Constraints

- React frontend is in `src/`
- Preserve existing styles and classes unless explicitly specified
- Avoid overwriting existing comments
- Do not introduce behavioral changes beyond the refactor scope

## Acceptance criteria

- No duplicate event handlers registered at runtime
- Listener cleanup never relies on async teardown
- Export data normalization is single-sourced and type-safe
- No `window.location` for internal routing
- LocalStorage access is centralized and versioned
- No per-render sort/filter for runs or platform lists
- Largest pages are split into smaller components with clear ownership
- Route bundle size reduced via lazy loading
