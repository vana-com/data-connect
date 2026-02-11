## Auth Page

### What this is

- Standalone browser auth page — a **completely separate Vite application**, not
  a React Router page.
- The Tauri backend (`auth.rs`) serves this as static HTML in the user's **real
  browser** (Chrome/Safari/etc.), not inside the Tauri webview. OAuth redirects
  (Google, Apple) bounce back to a tiny local HTTP server that `start_browser_auth`
  spins up.
- Uses the Privy **JS SDK** (`@privy-io/js-sdk-core`) rather than the React SDK.
- Posts auth results back to the local auth server via `POST /auth-callback`,
  then shows a success message; the user closes the tab manually.
- Creates an embedded wallet, signs the master key, and registers the Personal
  Server when possible.
- For the full rationale and flow tradeoffs, see
  `docs/_archive/spike-privy-auth-architecture.md`.

### How it is invoked

- `useGrantFlow` calls the Tauri command `start_browser_auth` when auth is
  required.
- The Tauri command serves this page and opens it in the user's real browser.

### Build & output

- Builds via `npm run auth:build` → output lands in `src-tauri/auth-page/`.
- `pretauri:dev` and `pretauri:build` both run `auth:build` automatically, so
  the auth page is always rebuilt before any Tauri build.
- Commit policy: treat `src-tauri/auth-page/*` as generated output. Do not commit
  hash-only updates in `src-tauri/auth-page/index.html` unless the matching built
  assets in `src-tauri/auth-page/assets/*` (and related generated files) are
  committed together and validated.

### Config injection

- `index.html` contains `%PRIVY_APP_ID%` / `%PRIVY_CLIENT_ID%` placeholders.
- **Dev**: the `authHtmlPlaceholders` Vite plugin (in `vite.auth.config.ts`)
  replaces them with `VITE_PRIVY_*` env vars from `.env.local`.
- **Production**: Rust injects the real values at serve-time before sending
  the HTML to the browser.
- The page reads these via `window.__AUTH_CONFIG__` (declared in `types.ts`).

### Auth result contract

`POST /auth-callback` receives an `AuthResult`:

```ts
{
  success: boolean
  user?: { id: string; email?: string | null }
  walletAddress?: string | null
  authToken?: string | null
  masterKeySignature?: string | null
  error?: string
}
```

### Files

- `index.html`: HTML shell with config placeholders.
- `main.tsx`: Standalone React entry point (`createRoot`, no router).
- `App.tsx`: UI shell and view switching (loading → login → success).
- `auth.ts`: Privy JS SDK logic, wallet setup, server registration, callback.
- `types.ts`: `AuthResult`, `AuthConfig`, `AuthView`, `window.__AUTH_CONFIG__`.
- `styles.css`: Re-exports the main app styles (`@import "../styles/index.css"`).

### Shared component coupling

`App.tsx` imports `Button`, `Input`, `Text`, and icons from `@/components/` via
the `@` alias configured in `vite.auth.config.ts`. Changes to these shared
components affect the auth page.

### Dev usage

- Run: `npm run auth:dev`
- Open: `http://localhost:5175`
- Optionally run the app: `npm run dev:app`

### Related routes

- `/browser-login` is a separate React Router page that uses the Privy **React**
  SDK and a different callback mechanism (`callbackPort` query param).
- As of now, the grant flow uses **this** auth page via `start_browser_auth`,
  not `/browser-login`.
