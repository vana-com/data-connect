# Passport auth conversion phase 1

## Source
- `docs/plans/260214-passport-auth-conversion-plan.md`

## What shipped
- Removed legacy local auth surfaces: `src/auth-page/*`, `src/pages/browser-login/*`, `vite.auth.config.ts`, and related route/build packaging wiring.
- Switched auth launch to external flow via `start_browser_auth` + shared launcher, with fail-closed behavior in Tauri runtime.
- Added app-global `auth-complete` handling so root login updates Redux auth state.
- Added pending grant redirect handoff (`save/get/clearPendingGrantRedirect`) so unauthenticated allow can resume after sign-in.
- Removed dead grant auth-required page wiring and aligned grant/home tests to the new flow.

## Hard decisions
- External web auth is now the source of truth; no in-app grant-time auth surface remains.
- Auth launch fallback now differs by runtime:
  - Tauri: do not fallback to plain Passport URL when invoke fails.
  - Non-Tauri: fallback to opening Passport URL directly.
- Grant resume persistence is local and minimal until deep-link contract finalization lands upstream.

## Validation run
- `npm run test -- src/lib/start-browser-auth.test.ts src/pages/home/index.test.tsx`
- `npm run test -- src/pages/grant/use-grant-flow.test.tsx src/pages/grant/index.test.tsx src/pages/home/index.test.tsx`
- `npx tsc -b`
- `cargo check --manifest-path src-tauri/Cargo.toml`

## Remaining scope (next slices)
- **Commit A:** contract-gated deep-link normalization stubs in `src/hooks/use-deep-link.ts` and `src/pages/grant/use-grant-flow.ts`.
- **Commit B:** durable auth session persistence + startup hydration + logout clear semantics.
- Final strict URL-only grant resolution waits on upstream launch-complete param contract confirmation.
