## Auth page (browser sign-in) location

The sign-in page opened during grant flow is a bundled static HTML file:

- Source: `src-tauri/auth-page/index.html`
- Served by: `start_browser_auth` in `src-tauri/src/commands/auth.rs`
- Mechanism: Rust reads the HTML via `include_str!` and injects `PRIVY_APP_ID` and `PRIVY_CLIENT_ID` at runtime.

This means it is not a React page by default. It is plain HTML/CSS/JS.

## Why React is not available

The auth page is served by a tiny local HTTP server inside the Tauri backend.
It returns a single HTML string, not a web build with bundled JS or assets.

No React runtime is shipped to this page unless we build and serve it ourselves.

## Options if you want React

### Option A: Ship a small React build for the auth page

1. Create a small Vite React app (e.g., `apps/auth-page/`).
2. Build it into static assets.
3. Copy the output into `src-tauri/auth-page/`.
4. Update the Rust server to serve static files (not just a single HTML string).
5. Keep placeholder tokens for `PRIVY_APP_ID` and `PRIVY_CLIENT_ID` if you still want runtime injection.

Pros: full React UI.
Cons: additional build step and server changes in Rust.

### Option B: Keep it static and update HTML/CSS/JS

Edit `src-tauri/auth-page/index.html` directly.
This is the simplest option and already wired for Privy.

## Current behavior summary

- When `start_browser_auth` runs, it starts a local server on a free port.
- It opens the default browser to `http://localhost:<port>`.
- The page lives in `src-tauri/auth-page/index.html`.

---

## Option A: How to ship a small React build for the auth page

**Do this:** build a tiny Vite React app that **imports your existing components** from `src/`, then **bundle it into `src-tauri/auth-page/`** and let the Rust auth server serve those static files. Inject the Privy IDs at runtime via a tiny inline script.

### Minimal setup (how it works)

1. **Create a tiny React entry** (example path):

```
src/auth-page/main.tsx
src/auth-page/App.tsx
src/auth-page/index.css  // can import src/styles/index.css
src/auth-page/index.html
```

2. **Vite config for auth build** (separate config):

- Output to `src-tauri/auth-page/`
- Alias `@` → `src/` so you can import your actual components
- Example imports:

```ts
import { Button } from "@/components/ui/button"
import "@/styles/index.css"
```

3. **Runtime config injection**
   In `src/auth-page/index.html`, add:

```html
<script>
  window.__AUTH_CONFIG__ = {
    privyAppId: "%PRIVY_APP_ID%",
    privyClientId: "%PRIVY_CLIENT_ID%",
  }
</script>
```

Then in the Rust server, **string‑replace those placeholders** before serving `index.html`.

Notes:

- Keep values sanitized (they are env vars, but still avoid raw injection).
- Avoid caching the HTML so injected values do not go stale.
- If you enforce CSP, inline scripts require `unsafe-inline` or a nonce.

4. **Serve static files from Rust**
   Update `start_browser_auth` to:

- Serve `/` → `index.html` (with replacements)
- Serve `/assets/*` → actual files from `src-tauri/auth-page/assets/*`

5. **Build command**
   Add:

```
"auth:build": "vite build --config vite.auth.config.ts"
```

Then include it in `tauri:dev` or `tauri:build`.
