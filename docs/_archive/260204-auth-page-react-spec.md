# Auth Page React Build Spec (Option A)

## Objective

Render the external browser auth page with the same React design system as the main app, while keeping the current Privy auth flow and callbacks intact.

## Design reference

- Visual: `docs/_wip/260203-auth.png`
- UI decisions:
  - No top nav icons.
  - No back button.

## Source layout (new)

```
src/auth-page/
  index.html
  main.tsx
  App.tsx
  auth.ts
  types.ts
  styles.css (imports src/styles/index.css, required)
```

## Build output (generated)

```
src-tauri/auth-page/
  index.html
  assets/*
  fonts/*
```

## Vite auth build

Create `vite.auth.config.ts`:

- `import path from "path"`
- `root: "src/auth-page"`
- `base: "/"`
- `outDir: path.resolve(__dirname, "src-tauri/auth-page")`
- `publicDir: path.resolve(__dirname, "public")` (copies repo `/public/fonts` into output)
- `resolve.alias: { "@": path.resolve(__dirname, "src") }`
- `build.emptyOutDir: true`

## Scripts

Add to `package.json`:

- `auth:build`: `vite build --config vite.auth.config.ts`
- `pretauri:dev`: `npm run auth:build`
- `pretauri:build`: `npm run auth:build`

## Runtime config injection

In `src/auth-page/index.html`, inject:

```html
<script>
  window.__AUTH_CONFIG__ = {
    privyAppId: "%PRIVY_APP_ID%",
    privyClientId: "%PRIVY_CLIENT_ID%",
  }
</script>
```

React reads `window.__AUTH_CONFIG__` in `auth.ts`.

Constraints:

- The config `<script>` must appear **before** the app’s module script in `index.html`.
- Ensure `%PRIVY_*%` placeholders survive Vite’s HTML transform (verify in built `index.html`).

## Privy config source of truth

- Canonical values live in frontend env vars: `VITE_PRIVY_APP_ID` and `VITE_PRIVY_CLIENT_ID`.
- The app passes them into `start_browser_auth` (already done in `InlineLogin` / `use-grant-flow`).
- Rust injects those values into the auth page.
- Missing `VITE_PRIVY_APP_ID` or `VITE_PRIVY_CLIENT_ID` → show in‑app error and **do not** open the auth page.

## React UI implementation

`App.tsx`:

- Layout: full-page background, centered auth card, DS typography/spacing.
- Header matches design image.
- Form uses DS primitives (button, input, card, text) and DS tokens via `src/styles/index.css` (required).

## Auth logic port (from current HTML)

Move `src-tauri/auth-page/index.html` script into `src/auth-page/auth.ts`:

- `createPrivyClient` (Privy SDK init)
- OAuth redirect handling
- Email send/verify
- Embedded wallet iframe setup
- `masterKeySignature` signing
- `POST /auth-callback` with result
- `GET /server-identity` polling
- `POST /register-server`
- Success state + `window.close()` attempt
- Convert DOM show/hide to React state (`view`, `error`, `loadingText`); no direct DOM mutation.
- Attach OAuth/iframe message listeners via `useEffect`, cleanup on unmount.

## Dependencies

- Add `@privy-io/js-sdk-core` to `dependencies` (bundled, pinned).
- Add `mime_guess` to `src-tauri/Cargo.toml` for content types.

## Resource path resolution (dev/prod)

- Prod: `app.path().resolve("auth-page", BaseDirectory::Resource)`
- Dev fallback if resource dir missing:
  - `PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("auth-page")`
  - This resolves to `src-tauri/auth-page` in dev.

## Rust auth server changes

Update `src-tauri/src/commands/auth.rs`:

1. Locate auth bundle directory from Tauri resources:
   - `app.path().resolve("auth-page", BaseDirectory::Resource)` (or equivalent; use dev fallback above).
2. On `GET /`:
   - Read `index.html` from resource dir.
   - Replace `%PRIVY_APP_ID%` and `%PRIVY_CLIENT_ID%`.
   - Serve with `Content-Type: text/html; charset=utf-8`.
3. Static files:
   - Serve `/assets/*`, `/fonts/*`, `/favicon.ico` from resource dir.
   - Use `mime_guess` for `Content-Type`.
   - 404 if missing.
4. Keep existing handlers:
   - `POST /auth-callback`
   - `GET /server-identity`
   - `POST /register-server`
   - `GET /close-tab`

## Tauri bundle resources

In `src-tauri/tauri.conf.json`:

- Add `auth-page/**` to `bundle.resources` so the auth bundle ships with the app.

## Fonts and asset paths

- `src/styles/index.css` uses `/fonts/*` URLs.
- Ensure `/public/fonts/*` is copied into the auth build output.
- Rust static server must serve `/fonts/*` from the auth bundle root.

## Git hygiene

- Treat `src-tauri/auth-page/` as build output.
- Add `.gitignore` entry for `src-tauri/auth-page/`.
- Remove the committed static HTML once React build is wired.

## QA checklist

1. `npm run auth:build` succeeds.
2. `npm run tauri:dev` opens browser to auth page.
3. Visual parity with `docs/_wip/260203-auth.png` (typography, spacing, colors).
4. Email login flow works.
5. Google/Apple OAuth works.
6. Embedded wallet created, master key signed.
7. `/register-server` returns ok; auth event emitted.
8. Success state shown; tab close behavior works.

## Notes (resolved questions)

- Privy SDK source: use bundled npm dependency `@privy-io/js-sdk-core`, not CDN. Reason: deterministic, offline-capable, version-locked auth flow.
- `/close-tab` purpose: endpoint shown after auth completes; displays a success message and attempts to close the tab (and on macOS triggers Cmd+W). It exists to finish the flow cleanly and return the user to the desktop app without leaving a stray tab.
- Auth page chrome: no top nav icons; no back button.
- Build output policy: treat `src-tauri/auth-page/` as generated output and ignore it in git to prevent stale assets.
