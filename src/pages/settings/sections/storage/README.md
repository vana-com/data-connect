# Settings Storage Section

## Status
- Reactivated (Slice 1, local-first): visible in the Settings sidebar.
- Exposes the local-vs-Vana storage provider choice: "Local Only" (default,
  no sign-in) vs "Vana Storage" (opt-in, starts the bundled Personal Server
  and requires Vana sign-in).

## Current integration
- Route surface: `/settings` section implementation via `index.tsx`.
- Nav visibility is enabled in `src/pages/settings/index.tsx`.
- Selecting a storage option dispatches `appConfig.serverMode` in
  `src/state/store.ts` (`'local-only' | 'local' | 'remote'`), which is the
  single choke point `resolveIngestTarget()` (`src/hooks/useEvents.ts`)
  reads to decide whether to sync exports anywhere beyond local disk.

## Notes
- This section is unrelated to the grant-connect flow.
- Co-located component details live in `components/README.md`.
