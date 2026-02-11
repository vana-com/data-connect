# 260211-source-overview-p3-refactor

## Goal

Refactor `src/pages/source/index.tsx` to reduce mixed responsibilities (P3) while preserving current v0 behavior and UI output.

## Constraints

- No behavior changes.
- No style/class rewrites unless required by extraction.
- Keep v0 scope lean: no provider architecture or speculative abstractions.
- Follow page-local structure (`src/pages/source/*` + `components/*`).
- Preserve current Tauri/runtime fallback semantics and copy status UX.

## Existing patterns

- Route page structure: `src/pages/<route>/index.tsx` + local `components/*`.
- Existing source-page tests already cover:
  - preview fallback in browser runtime
  - open-file parity with sidebar link
  - copy failure status path
- Existing helper logic in page:
  - `formatBytes`
  - `copyTextToClipboard`
  - source-specific derived data and handlers

## Proposed approach

### File touch list (ordered)

1. Create `src/pages/source/types.ts`
   - Move page-local UI and state types (`CopyStatus`, `SourceLinkRowProps`, hook return shape).

2. Create `src/pages/source/utils.ts`
   - Move pure helpers: `formatBytes`, `copyTextToClipboard`.

3. Create `src/pages/source/use-source-overview-page.ts`
   - Move all orchestration logic from page entry:
     - selectors, auth, local state, effects
     - derived fields (`sourceEntry`, `sourcePlatform`, `openSourcePath`, etc.)
     - handlers (`handleOpenSourcePath`, `handleOpenFile`, `handleCopyFullJson`)
   - Keep current runtime/preview fallback behavior exactly.

4. Create `src/pages/source/components/source-link-row.tsx`
   - Extract current polymorphic link row component + local `linkStyle`.

5. Create `src/pages/source/components/source-sidebar.tsx`
   - Extract left navigation/sidebar block.

6. Create `src/pages/source/components/source-preview-card.tsx`
   - Extract right preview panel (actions, preview rendering states, footer metadata).

7. Create `src/pages/source/components/source-overview-layout.tsx`
   - Thin two-column layout shell with slots.

8. Update `src/pages/source/index.tsx`
   - Keep only route param + 404 guard + composition of extracted components.

9. Update `src/pages/source/index.test.tsx`
   - Keep behavior assertions; adjust selectors/import wiring only as needed.

10. Create `src/pages/source/use-source-overview-page.test.ts`
    - Add focused orchestration tests for non-trivial logic paths.

## Edge cases

- Unknown `platformId` route must still render 404 block.
- Non-Tauri/browser runtime preview errors should still fall back to stub preview (not hard error text).
- `openPlatformExportFolder` failure should still fall through to `openLocalPath`.
- Clipboard API failure and `execCommand("copy") === false` must surface `Copy failed`.

## Validation checklist

- [ ] `npx vitest run src/pages/source/index.test.tsx`
- [ ] `npx vitest run src/pages/source/use-source-overview-page.test.ts`
- [ ] `npx vitest run src/pages/source`
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml build_source_export_preview`
- [ ] `cargo check --manifest-path src-tauri/Cargo.toml`
- [ ] Manual verification:
  - [ ] source page renders expected layout
  - [ ] copy success/failure labels
  - [ ] sidebar path and open-file button parity
  - [ ] preview fallback behavior in non-Tauri runtime

## Out of scope

- New source features from `src/pages/source/TODO.md`.
- Styling/visual redesign.
- Tauri backend API changes.
- Cross-page component extraction into `src/components`.
