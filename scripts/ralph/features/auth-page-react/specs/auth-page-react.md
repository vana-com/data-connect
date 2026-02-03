# Auth Page React Build

## Source

- `docs/260204-auth-page-react-spec.md`

## Goals

- Build a React-based auth page that matches the app design system and the reference image.
- Preserve the existing Privy auth flow while moving logic into React/TS with runtime config injection.
- Ship the auth bundle via Vite and Tauri resources with correct asset/font handling.

## Constraints

- React frontend only (`src/`)
- Preserve existing styles and classes
- Don’t overwrite existing comments
- No UX changes beyond what the source doc calls out

## Acceptance criteria

- `src/auth-page/` exists with React UI + ported auth logic; no direct DOM mutation.
- `vite.auth.config.ts` and npm scripts (`auth:build`, `pretauri:dev`, `pretauri:build`) produce `src-tauri/auth-page/` with fonts/assets.
- `index.html` injects `window.__AUTH_CONFIG__` before module script and placeholders survive build.
- Rust auth server serves the bundle with placeholder replacement, static assets with correct MIME, and dev fallback path; `tauri.conf.json` includes `auth-page/**`.
- `src-tauri/auth-page/` is treated as build output and ignored in git.
