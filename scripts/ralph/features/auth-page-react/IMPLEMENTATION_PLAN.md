## Completed

- [P0] Create `src/auth-page/` with `index.html`, `main.tsx`, `App.tsx`,
  `auth.ts`, `types.ts`, `styles.css` (import `src/styles/index.css`), and move
  all auth UI to React with no direct DOM mutation.
- [P0] Port the existing auth logic from `src-tauri/auth-page/index.html` into
  `src/auth-page/auth.ts`: Privy client init, OAuth callback handling, email
  send/verify, embedded wallet iframe setup + message handling, master key
  signing, `/auth-callback`, `/server-identity` polling, `/register-server`,
  success state and `window.close()` attempt, all driven by React state.
- [P0] Add Vite auth build pipeline: `vite.auth.config.ts` (import `path`;
  root `src/auth-page`, `outDir` `path.resolve(__dirname, "src-tauri/auth-page")`,
  `publicDir` `path.resolve(__dirname, "public")` to copy `/public/fonts`,
  alias `@` via `path.resolve(__dirname, "src")`), and scripts `auth:build`,
  `pretauri:dev`, `pretauri:build`.
- [P0] Update `src-tauri/src/commands/auth.rs` to load the auth bundle from
  resources with dev fallback (use `src-tauri/auth-page` when resources missing),
  replace `%PRIVY_APP_ID%`/`%PRIVY_CLIENT_ID%`, serve static assets
  (`/assets/*`, `/fonts/*`, `/favicon.ico`) with correct MIME via `mime_guess`,
  and keep existing endpoints intact.
- [P0] Add `auth-page/**` to `src-tauri/tauri.conf.json` bundle resources and
  add `src-tauri/auth-page/` to `.gitignore` as generated output.
- [P1] Add dependency `@privy-io/js-sdk-core` (npm) and `mime_guess` (Cargo).
- [P1] Replace the committed static `src-tauri/auth-page/index.html` once the
  React build is wired and confirmed.
- [P1] Ensure `src/auth-page/index.html` injects `window.__AUTH_CONFIG__`
  placeholders _before_ the module script and that Vite keeps `%PRIVY_*%`
  placeholders in the built HTML.
- [P1] Navigate to `/close-tab` after auth success so the Rust server can close
  the tab and shut down the auth server.
- [P1] Ensure `/close-tab` navigation happens before `window.close()` so the
  auth server can shut down even if the window closes.
- [P2] Add unit test coverage to ensure `/close-tab` navigation precedes
  `window.close()` via invocation ordering in `scheduleCloseTab`.
- [P2] Prefer shared DS primitives and utilities from `src/lib`/components for
  the auth page UI (e.g., `Text`, `Button`, `cn`, shared input classes) over
  ad-hoc duplicates to keep the design system consistent.
- [P1] When Privy env vars are missing, show an in-app error and prevent
  launching browser auth (remove demo-mode fallback in `InlineLogin`).
- [P1] Attach the embedded wallet message listener after iframe load to avoid
  missing events when `contentWindow` is initially unavailable.

## Validation

- `npm run test -- src/auth-page/auth.test.ts` (ensures `/close-tab` navigation
  happens before `window.close()` so the Rust auth server can shut down cleanly).
