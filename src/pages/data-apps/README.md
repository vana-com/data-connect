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
- Live apps navigate to `/apps/{appId}` on click.

### App integration

- Route: `/apps` is lazy-loaded in `src/App.tsx`.
- Navigation: `AppCard` uses `useNavigate` for routing to individual app pages.

### Behavior

- Apps are displayed in a responsive grid (2-3 columns).
- Coming-soon apps show a disabled "Connect" button and reduced opacity.
- Live apps show an "Open App" button that navigates to the app page.
- Call-to-action section links to Vana documentation for developers.

### Notes

- Direct imports only (no barrels) per Vercel React rule `bundle-barrel-imports`.
- This page uses static mock data; real API integration is planned for future.
- No route-level hook needed due to simple filter-only logic.
