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

## Mocking

- Localhost (dev): hit `/connect` directly with query params.
  - Example: `http://localhost:5173/connect?sessionId=ext-123&appId=rickroll&scopes=read:chatgpt-conversations`
  - JSON `scopes` also works: `scopes=["read:chatgpt-conversations"]`
  - Mock external app entry:
    - `http://localhost:5173/rickroll?sessionId=ext-123&appId=rickroll&scopes=read:chatgpt-conversations`
    - `/signin` preserves the same query string
    - In dev it launches: `http://localhost:5173/connect?sessionId=ext-123&appId=rickroll&scopes=read:chatgpt-conversations`
- Production: use deep linking with the same params.
  - Example: `dataconnect://?sessionId=ext-123&appId=rickroll&scopes=read:chatgpt-conversations`
  - In prod the mock sign-in launches `dataconnect://` instead of `/connect`

## Notes

- If `appId`/`scopes` are missing, it falls back to the default app (currently ChatGPT)
- External apps should deep‑link with all three params to show the correct source
