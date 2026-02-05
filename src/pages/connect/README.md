# Connect

## What this is

- Step‑1 connect UI that launches a data‑source login/scrape before `/grant`.

## Files

- `index.tsx`: route component, connector run kickoff, `/grant` handoff.

## Data flow

- URL params (`sessionId`, `appId`, `scopes`) → `getGrantParamsFromSearchParams` → resolve platform
- `startExport` → Tauri `start_connector_run` → run status in Redux → navigate to `/grant`

## App integration

- Route: `/connect`
- Entry points: deep links via `useDeepLink`, or app code can link directly
- Integration: grant flow (`/grant`) + connector runtime (Tauri IPC)

## Behavior

- Renders “Connect your <data source>” based on `scopes`
- Starts connector run; on success routes to `/grant?sessionId&appId&scopes`
- Disables CTA if no connector platform is available

## Notes

- If `appId`/`scopes` are missing, it falls back to the default app (currently ChatGPT)
- External apps should deep‑link with all three params to show the correct source
