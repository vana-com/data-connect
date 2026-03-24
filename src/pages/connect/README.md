# Connect

## What this is

- Step-1 connect UI that launches a data-source import before `/grant`.

## Files

- `index.tsx`: route composition + JSX only.
- `use-connect-page.ts`: route orchestration (params, prefetch, run state, navigation).
- `connect-run-status.ts`: busy CTA mapping from run phase/status.
- `connect-copy.ts`: stable copy builders for title/CTA/labels.
- `index.test.tsx`: route behavior tests.

## Data flow

- URL params (`sessionId`, `secret`, `scopes`, optional `appId`) →
  `getGrantParamsFromSearchParams` → resolve platform
- For real grant sessions, background prefetch claims the session and verifies the
  builder before the user reaches `/grant`
- `startImport` → Tauri `start_connector_run` → run status in Redux → navigate to
  `/grant` with canonical query params, plus pre-fetched session/builder data in
  `location.state` as an optimization

## App integration

- Route: `/connect`
- Entry points: deep links via `useDeepLink`, or app code can link directly
- Integration: grant flow (`/grant`) + connector runtime (Tauri IPC)

## Behavior

- Renders “Connect your <data source>” based on `scopes`
- For real grant sessions, claims the session with `sessionId` + `secret` and
  verifies the builder in the background
- Starts connector run; on success routes to `/grant` with the built canonical
  query params
- Disables CTA if no connector platform is available

## Mocking

- Localhost (dev): hit `/connect` directly with query params.
  - Example: `http://localhost:5173/connect?sessionId=ext-123&secret=test-secret&scopes=chatgpt.conversations`
  - JSON `scopes` also works: `scopes=["read:chatgpt-conversations"]`
- Production: use deep linking with the same params.
  - Example: `vana://connect?sessionId=ext-123&secret=test-secret&scopes=chatgpt.conversations`

## Notes

- For grant sessions (`sessionId` present), scopes are canonical to URL/claimed session data:
  - uses `scopes` from URL when provided
  - otherwise uses claimed session scopes after `claimSession`
  - does not infer fallback app scopes
- For non-grant connect entries (no `sessionId`), app default scopes may be used
- `appId` is supplemental routing/context data, not the grant-session authority
- External apps should deep-link grant sessions with `sessionId`, `secret`, and `scopes`
