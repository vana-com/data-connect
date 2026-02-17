# Passport auth + web grants conversion plan

## Goal

Refactor Data Connect to match the canonical external flow:

1. User authenticates on web (`/` auth experience with Passport).
2. User lands on web `/grants`.
3. `/grants` deep-links into installed Data Connect with canonical URL params for connect-grant (`sessionId`, `appId`, `scopes`, plus launch metadata).
4. If Data Connect is not installed, `/grants` shows download CTA.
5. On fresh install/open, Data Connect asks the user to log in, then resumes grant handling.

This plan replaces the current mixed assumptions so auth/grants/deep-link behavior is deterministic across repos.

## Important framing (web grants mental model)

- Web `/grants` is currently a launch/download bridge, not the final long-term consent UX.
- Its immediate purpose is to:
  - tell users Data Connect is required right now
  - launch installed Data Connect with grant context
  - present download/install fallback when app is missing
- Future web-native permissions can replace this later, but that is out of scope for this implementation.

## Canonical cross-repo contract (must be frozen first)

### Arrival mode contract (auth page)

- This contract is defined and enforced in the external web app, not this Data Connect repo.
- `mode=continue_to_grants` -> auth success redirects to `/grants`.
- `mode=return_to_app` -> auth success stays on success screen with "return to app" copy.
- Missing mode defaults to `continue_to_grants`.

### Query param preservation contract (auth -> OAuth -> grants)

Pick one and lock it before implementation:

1. **Minimal**: only `app`, `appId`, `appName` guaranteed on `/grants`.
2. **Launch-complete (recommended)**: guarantee pass-through for launch-critical params too:
   - `deepLinkUrl` (or `deep_link_url`)
   - `sessionId`
   - `secret`
   - `scopes`

`Launch-complete` is the safer contract because `/grants` already reads these for app launch.
This is currently an open cross-repo gap and may not be fully implemented yet.
Data Connect must treat this as an external dependency and keep explicit TODO stubs until that contract is finalized upstream.

### Data Connect deep-link input contract

- Data Connect treats URL params as source of truth for grant launch state.
- Do not rely on transient client state (for example `location.state`) for `sessionId`, `appId`, `scopes`.
- Deep link parsing must support both first-open and already-running app cases.

## Current state (Data Connect)

- Historically, grant flow could invoke local auth startup via `invoke("start_browser_auth", ...)`.
- Tauri currently still contains local auth-page serving/callback code in `src-tauri/src/commands/auth.rs`.
- `/browser-login` currently exists as a standalone page.
- Current auth state is effectively in-memory only and is lost on app restart.
- There is no complete durable-session implementation yet; logout semantics are therefore incomplete and must be fixed in this work.

## Target state (Data Connect)

- Data Connect is launched from web `/grants` deep link with canonical grant params.
- Data Connect does not perform a second grant-time auth flow after connect-grant starts.
- On fresh install/open without local auth session, Data Connect prompts login and then resumes pending grant context.
- Durable auth session is restored at startup.
- Logout clears local durable session and forces explicit re-auth.
- Legacy duplicate auth surfaces are removed (`src/auth-page`, `/browser-login`, extra build pipeline).
- Logged-out root state is explicit: primary action is to open external authorization flow.

## Implementation plan

### Step 0 — Freeze contracts for implementation (doc updates deferred)

- Freeze implementation assumptions in this plan doc only for now.
- Defer broader architecture doc updates (`docs/architecture.md`, historical grant-flow docs) until after feature delivery.
- Record explicit dependency note: launch-complete pass-through is blocked on external web repo alignment.

### Step 1 — Normalize deep-link grant intake in Data Connect

- In `src/hooks/use-deep-link.ts`:
  - parse and normalize launch params (`sessionId`, `appId`, `scopes`, `secret`, `deepLinkUrl/deep_link_url`)
  - persist a pending grant-launch payload if user is not authenticated
  - emit one internal event/action shape regardless of launch source (cold open or running app)
  - add prominent TODO banner: "Awaiting final cross-repo deep-link contract resolution"
- In grant flow coordinator (`src/pages/grant/use-grant-flow.ts`):
  - stub consumption of normalized payload behind explicit TODO gate
  - do not finalize strict URL-only connect-grant resolution until upstream contract is fixed

### Step 2 — Replace auth startup path with Passport browser flow

- In `src-tauri/src/commands/auth.rs`:
  - open Passport authorize URL in system browser
  - validate callback state/PKCE
  - exchange callback for session payload
  - emit normalized auth success event to frontend
- Keep callback transport implementation constrained to one path (prefer deep-link callback; only keep localhost callback if required by Passport constraints).
- Keep this as an isolated commit to maximize review clarity for cross-team sign-off.

### Step 3 — Add durable auth session + resume-pending-grant

- Add a session boundary (new service + tauri commands) for save/load/clear auth session.
- On app startup:
  - hydrate session
  - if valid and pending grant launch exists, resume grant flow automatically
- On login success:
  - store session durably
  - continue pending grant flow without requiring the user to relaunch from `/grants`

### Step 4 — Fresh install behavior

- If app is opened via deep link and no auth session exists:
  - show explicit logged-out root/login-required UI first
  - primary action opens external auth flow
  - preserve pending grant payload through login
  - after login, navigate user directly to connect-grant screen prefilled from pending payload
- If app is opened normally post-install (no deep-link payload):
  - show standard logged-out entry; no phantom grant resume.

### Step 5 — Remove legacy auth surfaces

- Delete:
  - `src/auth-page/*`
  - `vite.auth.config.ts`
  - `src/pages/browser-login/*` (if no remaining runtime dependency)
- Remove auth-page packaging/build hooks:
  - auth scripts in `package.json`
  - tauri resource packaging and generated-output references
- Remove route wiring/constants that are no longer used.

## Test plan (must pass in this PR)

1. **Arrival mode behavior (web app contract test)**
   - `mode=continue_to_grants` redirects to `/grants`.
   - `mode=return_to_app` stays on auth success page.
2. **Param preservation**
   - OAuth round-trip preserves contracted params.
   - `/grants` fallback link includes contracted launch params.
3. **Deep-link intake in Data Connect**
   - canonical payload parsed from URL.
   - both `deepLinkUrl` and `deep_link_url` are handled consistently.
4. **Fresh install + login gate**
   - no session + deep-link launch -> login gate -> successful login -> grant resumes with original params.
5. **Cold start persistence**
   - authenticated user restart keeps session and does not re-prompt login.
6. **Logout semantics**
   - local durable session cleared; next protected action requires fresh Passport login.
7. **Failure handling**
   - callback validation failure or token exchange failure does not mutate auth state and provides retry path.

## File impact map (Data Connect repo)

- **Backend/Tauri**
  - `src-tauri/src/commands/auth.rs`
  - `src-tauri/src/lib.rs` (if command signatures/events change)
  - `src-tauri/tauri.conf.json`
- **Frontend**
  - `src/hooks/use-deep-link.ts`
  - `src/pages/grant/use-grant-flow.ts`
  - `src/components/auth/InlineLogin.tsx`
  - `src/hooks/useAuth.ts`
  - `src/state/store.ts`
  - new auth session service module(s)
- **Deletion candidates**
  - `src/auth-page/*`
  - `src/pages/browser-login/*`
  - `vite.auth.config.ts`
  - auth-specific scripts in `package.json`

## Open decisions (blockers)

1. Confirm minimal vs launch-complete param contract (recommend launch-complete; currently blocked upstream).
2. Confirm callback transport accepted by Passport (deep-link preferred).
3. Confirm refresh-token policy and session TTL for desktop client.
4. Confirm Passport-side logout expectations vs local-only session clear.

## Rollout recommendation

- Treat this as a hard cut and remove legacy fallback code in same PR.
- Merge only after cross-repo contract tests pass.
- Share the frozen contract with web-auth and grants owners before implementation starts.
