# Source Overview Route

## What this is
- Route-level UI for inspecting one source (`/sources/:platformId`), previewing the latest local export, and running quick file actions (copy full JSON, open file/folder).
- Owns source-specific read/debug UX only; this route does not manage grants or Personal Server lifecycle.

## Files
- `index.tsx`: route entry; reads URL param, handles 404 guard, composes page sections.
- `use-source-overview-page.ts`: orchestration hook (Redux reads, Tauri calls, fallback behavior, handlers).
- `types.ts`: page-local types (`CopyStatus`, `SourceLinkRowProps`, hook state contract).
- `utils.ts`: pure helpers (`formatBytes`, clipboard copy helper).
- `components/source-overview-layout.tsx`: page shell and two-column layout.
- `components/source-sidebar.tsx`: source identity + nav/action links.
- `components/source-preview-card.tsx`: preview panel, action buttons, metadata footer.
- `components/source-link-row.tsx`: shared link row primitive for sidebar rows.
- `index.test.tsx`: page wiring/route behavior tests.
- `use-source-overview-page.test.ts`: orchestration and runtime-branch behavior tests.
- `TODO.md`: deferred UX enhancements for this route.

## Data flow
- `platformId` (router) -> `useSourceOverviewPage(platformId)` -> derived source/preview/action state -> presentational components render.
- Hook reads `runs` and `platforms` from Redux and maps route source to the latest local export.
- Hook fetches preview/full JSON via Tauri commands (`loadLatestSourceExportPreview`, `loadLatestSourceExportFull`) and exposes user actions.

## App integration
- Route: `/sources/:platformId`
- Entry points (current): Home page `ConnectedSourcesList` only.
- Integration:
  - React + Redux state for source/run context
  - Tauri IPC for local filesystem/export access
  - Shared open helpers in `src/lib/open-resource.ts` and `src/lib/tauri-paths.ts`
- Grant flow: unrelated to this route (no `sessionId/appId/scopes` handling here).

## Behavior
- Valid source id: renders source sidebar + preview card.
- Unknown source id: renders 404 block with route token.
- Preview load:
  - On Tauri runtime errors, surfaces error text.
  - On browser runtime (no Tauri), falls back to stub preview content.
- Copy action:
  - Uses Clipboard API first, then `execCommand("copy")` fallback.
  - UI states: `Copying...` -> `Copied` or `Copy failed`.
- Open action:
  - Tries platform folder open first, then falls back to generic local path open.

## Notes
- Keep `index.tsx` entry/composition only; put side effects and async orchestration in the page-local hook.
- If behavior diverges by runtime capability (desktop/Tauri vs browser), maintain tests for both branches.
