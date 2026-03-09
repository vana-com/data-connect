## Data Apps page

### What this is

- Discovery page for applications that can work with user data.
- Canonical apps hub for both discovery and connected-app management.
- Displays curated and markdown-submitted apps in the Discover tab.
- Uses repo-local markdown submissions from `ecosystem/app-submissions/` plus curated code entries.

### Files

- `index.tsx`: page shell, header copy, tabs, and tab content composition.
- `use-data-apps-page.ts`: page-local tab/search orchestration and connected-app fetch ownership.
- `connected-apps-ui-debug.ts`: DEV-only connected-app debug scenarios for the Connected tab.
- `components/connected-apps-list.tsx`: connected-app quick-launch/manage-access surface.
- `src/apps/registry.ts`: merges curated entries with markdown-driven submission entries.
- `src/apps/submission-registry.ts`: parses `ecosystem/app-submissions/*.md` into registry entries.
- `components/AppCard.tsx`: product card component matching the page card shell.

### Data flow

- `index.tsx` reads from `getAppRegistryEntries()` for Discover and `use-data-apps-page.ts` for Connected.
- `use-data-apps-page.ts` owns the route query params, connected-app debug state, and fetches connected apps when the Connected tab is active and the Personal Server is ready.
- `submission-registry.ts` loads local markdown files at build time via Vite `import.meta.glob()`.
- `AppCard` receives an app registry entry and renders a clickable live card or passive coming-soon card.
- `ConnectedAppsList` is presentational; it renders app data and callbacks supplied by `use-data-apps-page.ts`.
- Live apps open an external URL in the browser (Tauri shell open or `window.open`).

### App integration

- Route: `/apps` is lazy-loaded in `src/App.tsx`.
- Navigation: `AppCard` opens external URLs; there is no `/apps/:appId`.

### Behavior

- `Discover` is the default tab and renders the responsive app grid.
- `Connected` renders the connected-app quick-launch/manage-access surface.
- Switching back to the default `Discover` tab removes `tab` from the URL.
- Unrelated query params are preserved when tabs change.
- The first card is the builder CTA linking to the example app.
- Live apps render as fully clickable cards.
- Coming-soon apps render in the same shell with a non-interactive footer.
- Header links point builders to protocol docs and the GitHub submission flow.

### App URL behavior

- Live apps must define `externalUrl` in the app registry.
- "Open App" appends canonical grant params (`sessionId`, `appId`, `scopes`) to that external URL.
- Missing `externalUrl` throws on click to enforce external URLs.

### Notes

- Direct imports only (no barrels) per Vercel React rule `bundle-barrel-imports`.
- `_template.md` is ignored by the markdown ingest path.
- Local preview works pre-merge: add/edit a markdown file under `ecosystem/app-submissions/` and run `npm run dev`.
