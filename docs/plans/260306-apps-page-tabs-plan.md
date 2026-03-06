# 260306-apps-page-tabs-plan

## Strategy Lock

### Goal

Make `/apps` the canonical app hub by moving the current Home tab pattern onto the `Data Apps` page, with `Discover` as the default/first tab and `Connected` as the second tab.

### Scope

- In scope:
  - Reuse the existing Home tab system/pattern on `src/pages/data-apps/index.tsx`.
  - Show `Discover` first, `Connected` second.
  - Move the connected-apps surface out of Home and into the `Apps` page.
  - Keep `Discover` as the current registry-backed app catalog plus the "Add your app here" CTA.
  - Keep `Connected` as the current list of apps the user has connected with.
  - Add URL-backed tab state for `/apps`.
  - Update focused tests and page docs.
- Out of scope:
  - Redesigning the tab visual language.
  - Reworking connected-app permissions/settings behavior.
  - New filtering/sorting/search for apps.
  - Adding a new Home preview unless the page feels obviously broken after removal.

### Invariants

- `Apps` nav remains the canonical place for app inventory.
- `Discover` remains the default first-view tab.
- `Connected` continues to open apps and link to app permission management exactly as it does now.
- Home should no longer be the primary place to find connected apps.
- Invalid or missing tab query params fall back to `discover`.

### Approach

- Reuse the current Home stack:
  - `Tabs`
  - `SlidingTabs`
  - existing motion behavior
- Move the tab shell to `src/pages/data-apps/index.tsx`.
- Keep `ConnectedAppsList`, but stop treating it as a Home-owned concept:
  - either move it into `src/pages/data-apps/components/`
  - or wrap it in an apps-page-local panel component and rename later if needed
- Put tab state in the URL, e.g. `?tab=discover|connected`.
- Simplify Home by removing the current `Connected apps` tab/surface.

### Ordered implementation steps

1. Extract the Home tab pattern needed by `/apps`.
2. Add query-param-backed tab parsing/writing for `/apps`, defaulting to `discover`.
3. Convert `src/pages/data-apps/index.tsx` into a two-tab page shell.
4. Move the current catalog grid into the `Discover` tab.
5. Move the connected apps list into the `Connected` tab.
6. Remove the connected-apps tab from Home and keep Home focused on data/import surfaces.
7. Update tests for:
   - default tab
   - tab switching
   - invalid tab fallback
   - Home no longer owning the connected-apps tab
8. Update local page docs/README if needed.

### Expected file touch set

- `src/pages/data-apps/index.tsx`
- `src/pages/data-apps/index.test.tsx`
- `src/pages/data-apps/components/*`
- `src/pages/home/index.tsx`
- `src/pages/home/components/connected-apps-list.tsx` or moved equivalent
- `src/pages/data-apps/README.md`

### Risks

- Home and Apps can become semantically muddled if both keep full connected-app surfaces.
- Query-param tab state can get noisy if it collides with existing debug params.
- Moving the component without renaming may leave misleading Home-specific naming/comments behind.

### Done criteria

1. `/apps` opens on `Discover`.
2. `/apps?tab=connected` renders connected apps.
3. Invalid tab values fall back to `Discover`.
4. Home no longer contains the full connected-apps tab surface.
5. Existing open/manage-access behavior for connected apps is preserved.

### Unresolved questions

- Should Home keep a tiny apps preview/CTA after the move, or nothing app-related at all?
- Do we want to rename `ConnectedAppsList` in the same change, or only relocate it?
