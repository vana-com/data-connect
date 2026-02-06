## Auth Page

### What this is

- Standalone browser auth page opened by the Tauri backend when a grant flow
  needs user sign-in.
- Uses the Privy **JS SDK** (`@privy-io/js-sdk-core`) rather than the React SDK.
- Posts auth results back to the local auth server via `/auth-callback`, then
  auto-closes the tab.
- Creates an embedded wallet, signs the master key, and registers the Personal
  Server when possible.
- For the full rationale and flow tradeoffs, see
  `docs/_archive/spike-privy-auth-architecture.md`.

### How it is invoked

- `useGrantFlow` calls the Tauri command `start_browser_auth` when auth is
  required.
- The Tauri command serves this page and opens it in the user's real browser.

### Files

- `App.tsx`: UI shell and view switching.
- `auth.ts`: Privy JS SDK logic, wallet setup, server registration, callback.
- `types.ts`: request/response types and auth view states.
- `vite.auth.config.ts`: Vite config for the standalone auth build.

### Dev usage

- Run: `npm run auth:dev`
- Open: `http://localhost:5175`
- Optionally run the app: `npm run dev:app`

### Related routes

- `/browser-login` is a separate React Router page that uses the Privy **React**
  SDK and a different callback mechanism (`callbackPort` query param).
- As of now, the grant flow uses **this** auth page via `start_browser_auth`,
  not `/browser-login`.
