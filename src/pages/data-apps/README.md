## Data Apps page

### What this is

- Discovery page for applications that can work with user data.
- Displays live apps and coming-soon apps in separate sections.
- Frontend-only UI using mock data (no backend integration yet).

### Files

- `index.tsx`: page shell, filters apps by status, renders sections and call-to-action.
- `src/apps/registry.ts`: app registry with catalog + grant metadata.
- `components/AppCard.tsx`: card component displaying app details with conditional styling.

### Data flow

- `index.tsx` reads from the app registry and renders all entries.
- `AppCard` receives an app registry entry and renders status-aware UI (disabled button for coming-soon).
- Live apps open an external URL in the browser (Tauri shell open or `window.open`).

### App integration

- Route: `/apps` is lazy-loaded in `src/App.tsx`.
- Navigation: `AppCard` opens external URLs; there is no `/apps/:appId`.

### Behavior

- Apps are displayed in a responsive grid (2-3 columns).
- Coming-soon apps show a disabled "Connect" button and reduced opacity.
- Live apps show an "Open App" button that opens the external app URL.
- Call-to-action section links to Vana documentation for developers.

### App URL behavior

- Live apps must define `externalUrl` in the app registry.
- "Open App" appends canonical grant params (`sessionId`, `appId`, `scopes`) to that external URL.
- Missing `externalUrl` throws on click to enforce external URLs.

### Notes

- Direct imports only (no barrels) per Vercel React rule `bundle-barrel-imports`.
- This page uses static mock data; real API integration is planned for future.
- No route-level hook needed due to simple filter-only logic.
