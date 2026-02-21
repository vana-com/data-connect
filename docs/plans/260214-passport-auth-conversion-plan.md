# Passport-first auth conversion plan

## Goal

Move Data Connect auth from the current in-app/external hybrid (`src/auth-page`, `/browser-login`, `start_browser_auth`) to a single Passport-first flow where users authenticate with Vana Passport in the system browser and Data Connect restores auth on fresh open.

## Current state (from code)

- **Grant flow currently triggers external auth command** via `invoke("start_browser_auth", ...)` in `src/pages/grant/use-grant-flow.ts`.
- **Tauri command serves built auth-page assets** from `src-tauri/src/commands/auth.rs` (`auth-page` static HTML/assets + `/auth-callback` endpoint + `auth-complete` event).
- **`/browser-login` exists as a full React page** (`src/pages/browser-login/*`) but is not the active grant auth path.
- **Auth state persistence is in-memory Redux only** (`src/state/store.ts` + `useAuth`) and does not survive app restarts.
- **Current logout is local-only** (`useAuth.logout()` clears Redux auth state); it does not yet clear a durable session backend or Passport-side session.

## Target architecture

- Single auth mechanism: **system browser -> Passport -> callback -> Data Connect session**.
- No standalone `src/auth-page` build/distribution pipeline.
- No duplicate `browser-login` auth implementation.
- Persisted auth session is restored on fresh app open.
- Logout from Data Connect clears local auth and allows re-login via Passport URL.

## Major decisions to lock first

1. **Callback transport**
   - Preferred: deep link callback (`vana://...`) using existing deep-link plugin.
   - Alternative: localhost callback server (current model), but keep this only if Passport callback constraints require it.
2. **Session persistence backend**
   - Preferred: OS-backed secure storage (keychain/credential vault).
   - Minimum acceptable: encrypted local file with strict lifecycle handling.
3. **Cutover strategy**
   - Hard cut in a single PR: delete `src/auth-page` and `/browser-login` in the same pass as Passport auth wiring.

## One-pass execution plan

### Step 1 — Replace auth command + callback plumbing

- Update Tauri auth command implementation (`src-tauri/src/commands/auth.rs`):
  - open Passport authorize URL in system browser
  - validate callback `state` (and PKCE if used)
  - exchange callback payload for session/token data
  - emit normalized `auth-complete` payload
- Extend deep-link handling in `src/hooks/use-deep-link.ts`:
  - parse auth callback params (in addition to grant params)
  - forward auth callback data to auth coordinator
- Keep frontend listeners unchanged initially:
  - `src/pages/grant/use-grant-flow.ts`
  - `src/components/auth/InlineLogin.tsx`

### Step 2 — Add durable auth session bootstrap

- Create an auth session service boundary:
  - frontend coordinator: `src/services/auth-session.ts` (new)
  - tauri commands for save/load/clear session
- Add startup hydration:
  - at app initialization, read stored session and dispatch `setAuthenticated(...)` if valid
- Add explicit logout clear:
  - `useAuth.logout()` clears persisted session + Redux state
  - keep current behavior of routing user home after logout (`use-settings-page`)
  - if Passport supports it, call Passport logout/revocation endpoint (or document why local-only logout is sufficient)

### Step 3 — Delete legacy auth surfaces immediately

- Delete:
  - `src/auth-page/*`
  - `vite.auth.config.ts`
- Remove scripts/build hooks in `package.json`:
  - `auth:build`, `auth:dev`, auth-related prebuild/pretauri coupling
- Remove Tauri resource packaging for auth-page in `src-tauri/tauri.conf.json`.
- Remove `src-tauri/auth-page/` generated-output policy from `.gitignore` if no longer generated.
- Remove `/browser-login` route and page files if no longer needed:
  - `src/pages/browser-login/*`
  - route constant from `src/config/routes.ts`
  - route wiring from `src/App.tsx`

### Step 4 — Docs and cleanup

- Update architecture and flow docs:
  - `docs/architecture.md`
  - `docs/260203-grant-connect-flow.md`
  - any README that references `src/auth-page` or `/browser-login`
- Add one canonical auth flow doc with sequence diagrams.

## Test plan (must pass in this PR)

1. **Auth start**
   - command opens expected Passport URL with required params.
2. **Callback validation**
   - valid callback -> `auth-complete` success.
   - invalid/missing state -> failure path, no auth state mutation.
3. **Grant resume**
   - from `auth-required`, grant flow resumes and approves after `auth-complete`.
4. **Cold start persistence**
   - authenticated user closes app, reopens, remains authenticated without re-login.
5. **Logout semantics**
   - Data Connect logout clears local session and requires fresh Passport login next auth attempt.
6. **Error recovery**
   - network/token exchange failures render actionable error and allow retry.

## Explicit file impact map

- **Primary backend changes**
  - `src-tauri/src/commands/auth.rs`
  - `src-tauri/src/lib.rs` (if command shape changes)
  - `src-tauri/tauri.conf.json`
- **Primary frontend changes**
  - `src/hooks/use-deep-link.ts`
  - `src/pages/grant/use-grant-flow.ts`
  - `src/components/auth/InlineLogin.tsx`
  - `src/hooks/useAuth.ts`
  - `src/state/store.ts`
- **Deletion candidates**
  - `src/auth-page/*`
  - `src/pages/browser-login/*`
  - `vite.auth.config.ts`
  - auth-specific scripts in `package.json`

## Open questions to resolve with Passport/backend team

1. What exact callback format is supported (deep link vs HTTPS redirect + app handoff)?
2. Is refresh-token rotation supported for desktop clients, and with what expiry policy?
3. Is there an endpoint/contract for "session bootstrap on fresh install" without user interaction?
4. What is the required logout behavior at Passport level vs local app level?
5. Which identity fields are authoritative for Data Connect (`userId`, wallet, email), and which can be absent?

## Rollout recommendation

- Ship as a single hard cut before first release.
- Do not keep legacy fallback paths in the codebase.
- Block merge until all tests in this document pass locally and in CI.
