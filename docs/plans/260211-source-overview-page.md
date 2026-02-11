# 260211-source-overview-page

## Goal

Build a real source overview page for connected sources (starting with ChatGPT), reachable from "Your sources", with:

- source identity block (logo + name),
- local data location (stubbed),
- last-used-by-app metadata (stubbed),
- separator + three stub links,
- conditional debug-only link to `ROUTES.runs`,
- JSON preview deferred to a later iteration.

Also fix naming/URL ergonomics so the route segment is stable and human-readable (`chatg`) instead of runtime-specific (`chatgpt-playwright`).

## Constraints

- Keep current app architecture: route constants in `src/config/routes.ts`, route registration in `src/App.tsx`, page module in `src/pages/source`.
- Do not change existing styles/classes unless needed for new UI structure.
- Keep first pass low-risk: stub non-critical data points, defer JSON preview.
- Debug access is not impersonation/auth switching; it is a dev-mode capability under the same user account.

## Existing patterns

- Route mapping is wired in `src/App.tsx`:
  - `<Route path={ROUTES.source} element={<SourceOverview />} />`
- Route token comes from `ROUTES.source = "/sources/:platformId"` in `src/config/routes.ts`.
- "Your sources" navigation is triggered from Home:
  - `navigate(ROUTES.source.replace(":platformId", platform.id))`
  - This currently injects raw platform IDs (e.g. `chatgpt-playwright`).
- Current source page is a placeholder in `src/pages/source/index.tsx` using `useParams<{ platformId: string }>()`.
- Platform canonical metadata already exists in `src/lib/platform/registry.ts` with stable IDs like `chatgpt`.

## Storage path note (confirmed)

- Rust writes exports to:
  - `app_data_dir()/exported_data/<company>/<name>/<run_id>/<platform_id>_<timestamp>.json`
- On macOS with `identifier: "dev.databridge"` this typically resolves under:
  - `~/Library/Application Support/dev.databridge/exported_data/...`
- Current source-page sidebar path remains a short local stub for UX; actual folder-open behavior should resolve from real run `exportPath`.

## Proposed approach

1. **Introduce canonical source slug for URL**
   - Add helper(s) in `src/lib/platform/utils.ts`:
     - `getSourceSlugFromPlatform(platform): string` -> use registry entry `id` when available, fallback to normalized `platform.id`.
     - `resolvePlatformBySourceSlug(platforms, slug): Platform | null` -> map slug back to a platform in loaded list.
   - Update Home navigation from raw `platform.id` to canonical slug:
     - `ROUTES.source.replace(":platformId", getSourceSlugFromPlatform(platform))`
   - Keep route param name as-is for now (`platformId`) to minimize churn; treat it semantically as source slug.

2. **Build v1 `SourceOverview` layout shell**
   - Replace placeholder in `src/pages/source/index.tsx` with two-column layout matching target UI:
     - left: source header + path + last used + divider + links.
     - right: placeholder panel for JSON preview (to be implemented later).
   - Derive source display metadata from slug + registry.
   - Stubs:
     - local path (e.g. `~/.data-connect/chatgpt`),
     - last used string (e.g. `"Last used yesterday"`),
     - 3 links as non-functional placeholders.

3. **Add debug capability gate for Runs link**
   - Add dev flag in `src/config/dev-flags.ts`:
     - `useDebugSourceAdmin` (from `VITE_USE_DEBUG_SOURCE_ADMIN`).
   - Show "View runs" / link to `ROUTES.runs` only when flag is true.
   - Keep this clearly separated from auth roles (no user model role mutation).

4. **Route backward compatibility**
   - Ensure existing links with raw IDs still render:
     - `resolvePlatformBySourceSlug` should accept either canonical slug (`chatgpt`) or historical raw ID (`chatgpt-playwright`).
   - This avoids breakage for old deep links/bookmarks.

5. **Follow-up iteration (not in this change)**
   - Implement actual JSON preview data model + copy action + active badge behavior.
   - Replace stubs with real local path + "last used by external app" signals.

### File touch list (expected)

- `src/pages/home/index.tsx` (source route param generation)
- `src/lib/platform/utils.ts` (slug mapping helpers)
- `src/pages/source/index.tsx` (new UI shell)
- `src/config/dev-flags.ts` (debug gate flag)
- `.env.example` (document new env flag)

## Edge cases

- Unknown slug in URL (`/sources/whatever`): show graceful empty/error state with back link to Home.
- Slug resolves to registry entry but platform not loaded: show metadata with disabled actions.
- Multiple platforms mapping to one registry slug: choose first connected platform, else first available.
- Legacy route `/sources/chatgpt-playwright` should still resolve correctly.
- Debug link visibility must be deterministic across reloads (env flag only, no runtime race).

## Validation checklist

- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] Manual: click ChatGPT in "Your sources" -> opens `/sources/chatg` (or chosen canonical slug)
- [ ] Manual: direct-open `/sources/chatgpt-playwright` still works
- [ ] Manual: debug flag off -> no Runs link
- [ ] Manual: debug flag on -> Runs link visible and navigates to `/runs`
- [ ] Manual: layout matches v1 structure (sidebar blocks + stub links + right preview shell)

## Out of scope

- Real JSON preview payload and rendering interactions.
- Real local file path detection for source data.
- Real "last used" telemetry from external apps.
- Authorization model changes (RBAC/permissions backend).
