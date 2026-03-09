# 260306-apps-page-tabs-plan

## Strategy Lock

### Goal

Make `/apps` the canonical app hub and fix the current ownership bug where
connected-app behavior is effectively mounted by `Home`.

The change is not just "move a tab." It is:

- move the connected-app surface to `/apps`
- make `/apps` own its own tab/query orchestration
- stop relying on `Home` mount side effects to populate connected apps

### Problem statement

Today the connected-apps surface is rendered from `Home`, and the fetch that
hydrates connected apps also runs from `Home`.

That means page ownership is wrong:

- `Home` is acting as the implicit loader for connected apps
- the list component is Home-coupled instead of page-agnostic
- `/apps` cannot become the canonical destination unless it owns the behavior

This violates the intended page structure for `src/pages/*`:

- `index.tsx` should stay thin and compose the page
- page-specific side effects, URL state, and async orchestration should live in
  a page-local hook

### Scope

- In scope:
  - Convert `src/pages/data-apps/index.tsx` into the canonical two-tab apps page
  - Show `Discover` first and `Connected` second
  - Keep `Discover` as the current registry-backed catalog plus the submission CTA
  - Keep `Connected` as the current connected-apps quick-launch/manage-access surface
  - Add URL-backed tab state for `/apps`
  - Move connected-app orchestration off `Home` and onto `/apps`
  - Move or rename Home-owned connected-app code so ownership is no longer misleading
  - Remove the full connected-apps tab/surface from `Home`
  - Update focused tests and page docs
- Out of scope:
  - Redesigning the tab visual language
  - Reworking connected-app permissions/settings behavior
  - New filtering, sorting, or search for apps
  - Adding a new Home apps preview/CTA in the same change

### Invariants

- `Apps` nav remains the canonical place for app inventory
- `Discover` remains the default first view
- `Connected` preserves current open-app and manage-access behavior
- `Home` no longer owns the connected-apps surface or its fetch lifecycle
- Missing or invalid `tab` params fall back to `discover`
- Tab changes must preserve unrelated search params instead of clobbering them

### Target architecture

#### 1. Domain hook stays reusable

`useConnectedApps()` remains the reusable domain hook for:

- reading connected apps from Redux
- fetching grants from the Personal Server / Gateway
- revoking grants

This hook should stay page-agnostic.

#### 2. Page orchestration moves into page-local hooks

`/apps` should own its own orchestration via a page-local hook, for example:

- `src/pages/data-apps/use-data-apps-page.ts`

That hook should own:

- parsing and normalizing `tab`
- writing `tab` back to the URL
- preserving unrelated search params
- deciding when to call `fetchConnectedApps(...)`
- deriving the active tab model for the page

`src/pages/data-apps/index.tsx` should then be a thin composition layer.

#### 3. UI components stop depending on `Home`

The connected-apps list should no longer live behind `home/*` ownership if it is
rendered from `/apps`.

That means one of:

- move it to `src/pages/data-apps/components/`
- move it to a neutral shared location if it is truly multi-page

Do not keep `/apps` depending on `src/pages/home/components/...` or
`src/pages/home/connected-apps-ui-debug.ts`.

### Approach

- Reuse the current tab primitives and motion pattern:
  - `Tabs`
  - `SlidingTabs`
  - existing motion behavior
- Add an apps-page-local orchestration hook instead of re-creating Home-style
  page logic inline in `index.tsx`
- Move connected-app fetch ownership to `/apps`
- Move connected-app UI/debug ownership out of `home/`
- Simplify `Home` back to the data/import surface only

### Ordered implementation steps

1. Create a page-local hook for `/apps` orchestration.
2. In that hook, add query-param-backed tab parsing/writing for
   `discover|connected`, defaulting invalid or missing values to `discover`.
3. In that hook, trigger connected-app fetching when Personal Server state is
   ready, instead of relying on `Home` mount effects.
4. Convert `src/pages/data-apps/index.tsx` into a thin two-tab page shell.
5. Keep the current registry grid in the `Discover` tab.
6. Move the connected-apps list and its debug helpers out of `home/` ownership.
7. Render the connected-apps surface in the `Connected` tab.
8. Remove the connected-apps tab, fetch effect, and connected-app debug wiring
   from `Home`.
9. Update tests for:
   - `/apps` defaulting to `discover`
   - `/apps?tab=connected` working on cold render
   - invalid tab fallback
   - tab switching preserving unrelated search params
   - Home no longer rendering the connected-apps tab/surface
10. Update local page docs/README if needed.

### Implementation

#### Concrete execution plan

1. Extract the duplicated connected-app fetch effect into a tiny shared hook,
   for example:
   - `src/hooks/use-load-connected-apps-when-ready.ts`
2. Update current consumers of that fetch lifecycle to use the shared hook:
   - `Settings` keeps the behavior through the shared hook
   - `Home` drops the behavior when the connected-app surface is removed
   - `Data Apps` becomes the new page-level owner of the connected-app surface
3. Add a page-local orchestration hook for `/apps`, for example:
   - `src/pages/data-apps/use-data-apps-page.ts`
4. Put `/apps` URL-tab behavior in that page-local hook:
   - read `tab`
   - normalize invalid values to `discover`
   - preserve unrelated search params on write
   - remove `tab` when switching back to the default `discover` view
5. Move the connected-apps surface and its debug helpers out of `home/`
   ownership in the same diff.
6. Convert `src/pages/data-apps/index.tsx` into a thin composition shell that:
   - renders the tabs
   - renders the discover content
   - renders the connected-apps content
   - delegates orchestration to the page-local hook
7. Remove Home-specific apps ownership completely:
   - apps tab
   - `useConnectedApps()` usage
   - fetch effect
   - connected-app debug controls
8. Update page tests and only then consider README cleanup.

#### Implementation details to decide up front

- Canonical default URL:
  - use `/apps` as the canonical default
  - treat missing `tab` as `discover`
  - remove `tab` from the URL when switching back to `discover`
- Fetch timing:
  - fetch connected apps when `/apps` mounts
  - do not wait until the user clicks `Connected`
  - this keeps the connected tab instant and avoids lazy-load edge cases
- Search param writes:
  - update only `tab`
  - preserve unrelated params
  - delete only `tab` when returning to default state
- File ownership:
  - do not leave `/apps` importing connected-app UI or debug helpers from
    `src/pages/home/*`

#### Testing plan

- Add non-mocked URL-state behavior coverage for `/apps`:
  - `/apps` -> `discover`
  - `/apps?tab=connected` -> connected surface on first render
  - `/apps?tab=bogus` -> `discover`
  - click `Connected` -> writes `tab=connected`
  - click `Discover` -> removes `tab`
  - unrelated params survive tab changes
- Update Home tests to assert:
  - no connected-apps tab label
  - no connected-apps surface rendered from Home
- Run scoped tests first:
  - `src/pages/data-apps/index.test.tsx`
  - `src/pages/home/index.test.tsx`
  - any new hook tests only if the URL-state logic becomes non-trivial

#### Pushback / anti-scope-creep

This change is important because otherwise `/apps` will depend on unrelated
navigation history to show connected apps correctly.

What this change is not:

- a reason to build a generic tab-state framework
- a reason to introduce providers/contexts for this page flow
- a reason to move connected-app fetching into app-wide startup just because
  more than one page uses it

Keep the implementation small and surgical:

- one tiny shared loader hook for duplicated fetch lifecycle
- one page-local `/apps` orchestration hook
- one ownership move for the connected-app UI/debug code
- one cleanup pass in `Home`

### Expected file touch set

- `src/pages/data-apps/index.tsx`
- `src/pages/data-apps/index.test.tsx`
- `src/pages/data-apps/use-data-apps-page.ts`
- `src/pages/data-apps/components/*`
- moved connected-apps debug/helper files
- `src/pages/home/index.tsx`
- `src/pages/data-apps/README.md`

### Risks

- Moving only the UI surface but not the fetch ownership will make
  `/apps?tab=connected` depend on prior navigation state
- Keeping the component under `home/` after the move will preserve false
  ownership and invite future regressions
- Tab URL state can accidentally wipe unrelated debug params if implemented with
  naive `navigate({ search: ... })` replacement

### Done criteria

1. `/apps` opens on `Discover`.
2. `/apps?tab=connected` renders connected apps on first render without needing
   `Home` to mount first.
3. Invalid tab values fall back to `Discover`.
4. Tab switching preserves unrelated query params.
5. Home no longer contains the full connected-apps tab surface.
6. Home no longer owns connected-app fetch orchestration.
7. Existing open/manage-access behavior for connected apps is preserved.

### Explicit decisions

- Home keeps nothing app-related in this change.
- The connected-apps surface is relocated or renamed in the same diff.
- `/apps` owns its orchestration through a page-local hook; `index.tsx` stays
  mostly composition.

### Open follow-up, not blocking this change

- If we later want a small apps preview/CTA on Home, that should be a separate
  product decision after `/apps` is established as canonical.
