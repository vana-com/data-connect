# 260211-debug-access-by-account

## Goal

Replace global env-based debug gating with per-account debug access so only specific accounts can see/use debug UI (starting with the Runs debug view), without implementing backend RBAC in this iteration.

## Problem statement

Today, debug access is controlled by `VITE_DEBUG_MODE` (`DEV_FLAGS.debugMode`), which is global to the app build/runtime and not tied to the signed-in user.

That creates a product mismatch:

- we need debug visibility for a subset of accounts,
- but env flags enable debug for everyone using that build,
- and there is no account role/capability model in frontend state yet.

## Current state (retrieval trace)

### Auth/login flow

1. Frontend starts browser auth via Tauri command:
   - `invoke("start_browser_auth", { privyAppId, privyClientId })`
   - called in `src/components/auth/InlineLogin.tsx` and `src/pages/grant/use-grant-flow.ts`
2. Tauri command serves localhost auth page and listens for callback:
   - `start_browser_auth` in `src-tauri/src/commands/auth.rs`
3. Auth page performs Privy login and posts result to `/auth-callback`:
   - `sendAuthResult(...)` in `src/auth-page/auth.ts`
4. Tauri parses callback JSON and emits `auth-complete` event:
   - `app_handle.emit("auth-complete", auth_result)` in `src-tauri/src/commands/auth.rs`
5. Frontend listens for `auth-complete` and writes auth into Redux:
   - dispatches `setAuthenticated(...)` in `InlineLogin` and `use-grant-flow`

### Auth state shape

Auth is in Redux only (session/in-memory, not persisted through reload):

- `src/state/store.ts` -> `state.app.auth`
- `src/types/index.ts`:
  - `AuthState` has `isAuthenticated`, `isLoading`, `user`, `walletAddress`, `masterKeySignature`
  - `AuthUser` has `id`, `email?`, `wallet?`
- There is no `role`, `capabilities`, or permissions model in auth state.

### Debug gating today

- `src/config/dev-flags.ts` exposes:
  - `debugMode: parseEnvFlag(import.meta.env.VITE_DEBUG_MODE)`
- `src/pages/source/index.tsx` uses:
  - `DEV_FLAGS.debugMode ? <Link to={ROUTES.runs}>Debug runs</Link> : null`

Only env toggles this link; no user/account check exists.

### Trust boundary constraints

- Tauri auth command relays callback payload; it does not currently verify roles/capabilities.
- Existing identity available in frontend at login time: `user.id`, `user.email`, optional wallet fields.
- For this iteration, we accept client-side gating as a pragmatic internal/debug control.

## Constraints

- Do not rely on a new global env flag for selecting who gets debug.
- Keep changes low risk and localized to auth + debug routing/link gates.
- Do not break existing login flow (Inline login + grant flow).
- Keep existing styling/classes unchanged unless absolutely required.
- Do not implement backend role service in this iteration.

## Existing patterns

- Auth write point:
  - `setAuthenticated(...)` reducer in `src/state/store.ts`
- Auth read point:
  - `useAuth()` in `src/hooks/useAuth.ts`
- Debug link gate:
  - `src/pages/source/index.tsx`
- Debug route:
  - `ROUTES.runs` route in `src/App.tsx`

## Proposed approach (Option 1 now)

Option 1 = local per-account role/capability mapping in app code (non-env), keyed by stable account identifier (`user.id` primary, `email` fallback), then gate debug features with that derived capability.

### Why Option 1 for this iteration

- fastest path to per-account behavior now,
- no backend dependency,
- no protocol/auth server changes,
- easy to replace later with backend-driven capabilities.

### Design details

1. Add a local account capability resolver
   - New module: `src/config/account-access.ts` (or `src/lib/auth/account-access.ts`)
   - Define deterministic map/set for debug-allowed accounts.
   - Keying strategy:
     - primary: `user.id` (Privy stable id)
     - fallback: normalized lowercase email
   - Export API:
     - `canAccessDebugRuns(user: AuthUser | null): boolean`
     - optional `getAccountRole(user): "standard" | "debug"`

2. Extend auth state with derived access
   - Add one of:
     - `auth.capabilities: string[]` (preferred for future growth), or
     - `auth.role: "standard" | "debug"` (smallest initial surface)
   - Populate at authentication time inside `setAuthenticated(...)` using resolver.
   - Keep resolver pure/synchronous; no async calls in reducer.

3. Centralize UI consumption
   - Update `useAuth()` to return:
     - `canAccessDebugRuns` (from state), or derive via shared selector.
   - Avoid re-computing access ad hoc in page components.

4. Gate debug entry points
   - Link-level gate:
     - `src/pages/source/index.tsx`
     - replace `DEV_FLAGS.debugMode` gate with account capability gate (optionally keep `debugMode` as global kill switch if desired).
   - Route/page-level gate (required):
     - guard `ROUTES.runs` in `src/App.tsx` (or in runs page wrapper)
     - if unauthorized, redirect to `ROUTES.home` (or render lightweight unauthorized state)
   - This prevents URL paste/direct navigation bypass.

5. Keep env cleanup explicit
   - Remove dependency on `VITE_DEBUG_MODE` for account targeting.
   - Optional transitional mode:
     - `debugMode && canAccessDebugRuns` for temporary rollout.

## Implementation scope (no code yet)

### Expected file touch list

- `src/types/index.ts`
  - add auth role/capability field(s)
- `src/state/store.ts`
  - compute/store account debug capability at `setAuthenticated`
- `src/hooks/useAuth.ts`
  - expose `canAccessDebugRuns` (or role/capabilities)
- `src/pages/source/index.tsx`
  - switch debug link gate to account-based gate
- `src/App.tsx`
  - add route-level guard for `ROUTES.runs`
- `src/config/account-access.ts` (new)
  - local account policy mapping + resolver
- optional cleanup:
  - `src/config/dev-flags.ts` and `.env.example` if removing `VITE_DEBUG_MODE`

### Suggested code-level shape

- `account-access.ts`
  - `const DEBUG_USER_IDS = new Set<string>([ ... ])`
  - `const DEBUG_EMAILS = new Set<string>([ ...normalized... ])`
  - `export const canAccessDebugRuns = (user) => Boolean(user && (DEBUG_USER_IDS.has(user.id) || (user.email && DEBUG_EMAILS.has(user.email.toLowerCase()))))`
- `store.ts`
  - on `setAuthenticated`, compute `canAccessDebugRuns` and store in auth slice
- `useAuth.ts`
  - return `canAccessDebugRuns`
- `source/index.tsx`
  - show debug link when `canAccessDebugRuns`
- `App.tsx`
  - wrap `<Route path={ROUTES.runs} ...>` with guard component reading auth capability

## Edge cases

- User has id but no email -> id-based mapping still works.
- Email case variance -> normalize lowercase before lookup.
- Account not in allowlist -> no debug link, direct `/runs` blocked.
- Auth reload/logout -> derived capability clears with auth state.
- Two auth entry points (Inline + grant flow) must produce identical capability derivation because reducer is shared.

## Validation checklist

- [ ] Sign in as allowed debug account -> "Debug runs" link visible in source page.
- [ ] Sign in as non-allowed account -> link hidden.
- [ ] Direct open `/runs` as non-allowed account -> redirected/blocked.
- [ ] Direct open `/runs` as allowed account -> accessible.
- [ ] Logout/login transitions correctly recompute capability.
- [ ] Existing auth flows (Inline login, grant flow) continue working.
- [ ] `npm run lint`
- [ ] `npm run test`

## Risks / tradeoffs

- Client-side policy is not strong security (local tampering possible).
- Hardcoded mapping requires code change/redeploy to adjust access.
- Good enough for internal debug gating; not sufficient for sensitive production authorization.

## Follow-up path (post Option 1)

Move to backend-driven capabilities:

- fetch capabilities for authenticated user from trusted API,
- verify token/claims server-side,
- keep same frontend gating API (`canAccessDebugRuns`) so migration is mostly implementation swap.

## Out of scope

- Backend RBAC/permissions service.
- Token claim verification changes in Tauri auth relay.
- Full authorization hardening for privileged operations.
- Changes to non-debug feature flags (`useTestData`, `useRickrollMock`).
