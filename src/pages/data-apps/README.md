## Data Apps page

### What this is

- Discovery page for applications that can work with user data.
- Displays curated and markdown-submitted apps in one responsive grid.
- Uses repo-local markdown submissions from `ecosystem/app-submissions/` plus curated code entries.

### Files

- `index.tsx`: page shell, builder CTA card, and grid rendering.
- `src/apps/registry.ts`: merges curated entries with markdown-driven submission entries.
- `src/apps/submission-registry.ts`: parses `ecosystem/app-submissions/*.md` into registry entries.
- `components/AppCard.tsx`: product card component matching the page card shell.

### Data flow

- `index.tsx` reads from `getAppRegistryEntries()` and renders all entries after the builder CTA card.
- `submission-registry.ts` loads local markdown files at build time via Vite `import.meta.glob()`.
- `AppCard` receives an app registry entry and renders a clickable live card or passive coming-soon card.
- Live apps open an external URL in the browser (Tauri shell open or `window.open`).

### App integration

- Route: `/apps` is lazy-loaded in `src/App.tsx`.
- Navigation: `AppCard` opens external URLs; there is no `/apps/:appId`.

### Behavior

- Apps are displayed in a responsive grid (2-3 columns).
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
- No route-level hook needed due to simple filter-only logic.
- `_template.md` is ignored by the markdown ingest path.
- Local preview works pre-merge: add/edit a markdown file under `ecosystem/app-submissions/` and run `npm run dev`.
