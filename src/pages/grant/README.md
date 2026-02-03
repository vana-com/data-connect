# Grant Flow Refactor Notes

## Issues In Original Implementation

- Single component mixed data loading, auth orchestration, and rendering for 4 states.
- Repeated outer shell markup across loading/auth/error/success/consent views.
- Multiple inline style objects and inline event handlers per render.
- UI state transitions (current step) were set in multiple places.
- Demo session setup and session fetching logic lived inside the page render file.

## Changes Made

- Split UI into focused state components under `components/`.
- Extracted flow logic into `use-grant-flow.ts` hook.
- Centralized session/demo logic in the hook with a module-level demo map.
- Kept view switching in `index.tsx` to route to the right state UI.
- Moved shared types to `types.ts`.
