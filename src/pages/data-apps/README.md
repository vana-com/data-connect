## Data Apps page

### What this is

- Discovery page for applications that can work with user data.
- Displays live apps and coming-soon apps in separate sections.
- Frontend-only UI using mock data (no backend integration yet).

### Files

- `index.tsx`: page shell, filters apps by status, renders sections and call-to-action.
- `types.ts`: `MockApp` interface with status union type.
- `fixtures.ts`: mock data array with 7 sample apps.
- `components/AppCard.tsx`: card component displaying app details with conditional styling.

### Data flow

- `index.tsx` imports `mockApps` from fixtures and filters into `liveApps` and `comingSoonApps`.
- `AppCard` receives a `MockApp` prop and renders status-aware UI (disabled button for coming-soon).
- Live apps open an external URL in the browser (Tauri shell open or `window.open`).

### App integration

- Route: `/apps` is lazy-loaded in `src/App.tsx`.
- Navigation: `AppCard` opens external URLs; there is no `/apps/:appId`.

### Behavior

- Apps are displayed in a responsive grid (2-3 columns).
- Coming-soon apps show a disabled "Connect" button and reduced opacity.
- Live apps show an "Open App" button that opens the external app URL.
- Call-to-action section links to Vana documentation for developers.

### Mock system (dev)

- RickRoll is the only mock external app (`/rickroll`).
- `VITE_USE_RICKROLL_MOCK=true` forces **all** app cards to open the RickRoll mock.
- Otherwise, live apps must define `mockApps[].externalUrl`.
- Missing `externalUrl` throws on click to enforce external URLs.

### Notes

- Direct imports only (no barrels) per Vercel React rule `bundle-barrel-imports`.
- This page uses static mock data; real API integration is planned for future.
- No route-level hook needed due to simple filter-only logic.
