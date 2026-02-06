# TODOs

## Dead code: `src/pages/your-data`

- `/your-data` is not in the routes config, not lazy-loaded in `App.tsx`, and nothing links to it.
- Ask Volod whether it should be removed or repurposed.

## Data source overview page

- Stub route created at `/sources/:platformId` → `src/pages/source/index.tsx`.
- Home page connected sources now navigate to this route.
- Page needs to be built out (see `docs/260206-data-src-overview.png` for design reference).

## Possibly dead: `/browser-login` auth page?

**`src/auth-page`** — A **standalone HTML page** (its own Vite entry point, `vite.auth.config.ts`). Tauri's `start_browser_auth` command serves it and opens it in the user's **real system browser**. Uses the Privy **JS SDK** (`@privy-io/js-sdk-core`). Posts results back to a local auth server at `/auth-callback`. This is what the grant flow actually invokes.

**`src/pages/browser-login`** — A **React Router page** inside the main Tauri webview app at `/browser-login`. Uses the Privy **React SDK**. Communicates auth results via a `callbackPort` query parameter. It's rendered standalone (outside `AppContent`, no `TopNav`), but it lives inside the SPA.

So they're not duplicates — they target different runtimes:

- `auth-page` = real browser tab (needed because the Tauri webview can't do OAuth popups reliably)
- `browser-login` = Tauri webview page (React SDK, different callback mechanism)

The open question is whether `browser-login` is still actively reached by any code path, or if `auth-page` fully replaced it. That's the thing to ask Volod about.
