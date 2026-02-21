# Settings Storage Section

## Status
- This section is currently not in active use in the Settings UI.
- It is intentionally retained for potential future reactivation.

## Why it remains
- It contains prior Storage + Server UI composition work.
- Keeping it in-repo preserves implementation context and reduces rebuild effort if the section returns.

## Current integration
- Route surface: `/settings` section implementation via `index.tsx`.
- Nav visibility is currently disabled in `src/pages/settings/index.tsx` (the `storage` section is filtered out from sidebar items).

## Notes
- This section is unrelated to the grant-connect flow.
- Co-located component details live in `components/README.md`.
