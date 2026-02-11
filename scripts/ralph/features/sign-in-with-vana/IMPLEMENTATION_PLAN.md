# Sign in with Vana — Implementation Plan

## Status: COMPLETE

All P0, P1, and P2 items have been implemented, tested, and verified.

### What was built

1. **Session Relay v1 client** (`src/services/sessionRelay.ts`) — claim/approve/deny with secret threading, structured error handling (13 tests)
2. **Personal Server grant client** (`src/services/personalServer.ts`) — createGrant/listGrants/revokeGrant via Tauri HTTP plugin (18 tests)
3. **Builder verification service** (`src/services/builder.ts`) — Gateway lookup + W3C manifest fetch + EIP-191 signature verification + required field validation + appUrl/webhookUrl checks (30 tests)
4. **Grant flow state machine** (`src/pages/grant/use-grant-flow.ts`) — `loading → claiming → verifying-builder → consent → [auth-required] → creating-grant → approving → success` with demo mode, pre-fetch support, and deferred auth (13 tests)
5. **Deep link plugin** — Tauri deep-link plugin for `vana://connect` URL scheme with cold-start/runtime listeners (5 tests)
6. **Connected apps** (`src/hooks/useConnectedApps.ts`) — fetches from Personal Server `GET /v1/grants`, revokes via `DELETE /v1/grants/{grantId}`, replaces localStorage
7. **Split-failure recovery** (`src/hooks/usePendingApproval.ts`, `src/lib/storage.ts`) — persists pending approval, retries on next app startup (8 tests)
8. **Background pre-fetch** — connect page claims session + verifies builder in background during export, passes via React Router navigation state
9. **Consent UI** — builder name/icon/scopes from manifest, privacy/terms links, Allow/Cancel buttons
10. **Deny flow** — Cancel → `POST /v1/session/{id}/deny` → navigate to apps page
11. **Dead code cleanup** — removed 4 unused consent sub-components (`GrantAppInfo`, `GrantProgressSteps`, `GrantScopesList`, `GrantWalletInfo`) and the `currentStep`/`GrantStep` state that was only consumed by the deleted components
12. **Personal Server grant routes** (`personal-server/index.js`) — `POST /v1/grants` (create with EIP-712 signing via serverSigner + Gateway submission) and `DELETE /v1/grants/:grantId` (revoke with signed Gateway call). The library (`@opendatalabs/personal-server-ts-server@0.0.1-canary.e647e76`) only shipped `GET /v1/grants` (list) and `POST /v1/grants/verify` — create and revoke were missing.
13. **Dev token plumbing** — Personal Server emits `dev-token` on stdout → Rust handler in `server.rs` forwards via `personal-server-dev-token` Tauri event → `usePersonalServer` hook captures and exposes `devToken` → threaded to `listGrants()` as `Authorization: Bearer` header (required by library's Web3Auth middleware on GET /v1/grants)
14. **listGrants envelope fix** — library returns `{ grants: Grant[] }` not `Grant[]`; client now unwraps both formats
15. **revokeGrant 204 handling** — DELETE route returns 204 No Content; client no longer tries to parse JSON body on success
16. **Builder description field** — added `description` field to `BuilderManifest` type, extracted from W3C manifest `description`, displayed in consent UI below the "allow" message (26 tests in builder.test.ts)
17. **Support URL link** — `supportUrl` was already extracted from manifest but not displayed; now shown as a link in consent UI alongside Privacy Policy and Terms of Service
18. **Unverified app warning** — added `verified` boolean to `BuilderManifest`; set to `true` by `verifyBuilder()`, `false` in fallback paths when verification fails; consent UI shows yellow warning banner "This app could not be verified. Proceed with caution." when `verified === false`
19. **Dead localStorage cleanup** — removed connected apps CRUD functions (`setConnectedApp`, `getConnectedApp`, `removeConnectedApp`, `getAllConnectedApps`, `subscribeConnectedApps`, `isAppConnected`, `migrateConnectedAppsStorage`) and their 9 tests from `src/lib/storage.ts`. Gateway via Personal Server `GET /v1/grants` is the single source of truth; nothing read the localStorage data anymore.
20. **Deny flow navigation fix** — Cancel button previously set a `"denied"` status that rendered an error screen ("Access was denied.") instead of navigating away. Fixed: `handleDeny` now calls `navigate(ROUTES.apps)` after the deny API call, matching the spec's "cancel → navigate away" requirement. Removed dead `"denied"` status from `GrantFlowState` type, debug panel, and grant page rendering. Cancel button changed from `<Link>` to plain `<Button>` since navigation is now handled programmatically.
21. **Error scenario test coverage** — added 5 tests to `use-grant-flow.test.tsx`: session claim failure (SessionRelayError), builder verification fallback (uses truncated address + `verified: false`), grant creation failure (PersonalServerError), deny API failure (navigates away regardless), and Personal Server not running.
22. **Signature verification security fix** — `verifyBuilder()` previously returned `verified: true` even when the manifest's `vana.signature` field was missing. Fixed in two iterations: first set `verified: false`, then (item #30) made it fatal per protocol spec.
23. **Missing secret guard during approve** — `handleApprove()` previously silently skipped the `POST /v1/session/{id}/approve` call when `secret` was undefined, creating a split failure where the grant exists on Gateway but the builder never learns about it (no error shown to user). Fixed: now throws `SessionRelayError` so the error is surfaced to the user. (14 tests in use-grant-flow.test.tsx)
24. **Personal Server grant route error handling** — Added try-catch blocks around all async operations in `POST /v1/grants` and `DELETE /v1/grants/:grantId` routes. Added `gatewayClient` null checks (previously only `serverSigner` was checked). Added JSON parse error handling for malformed request bodies. Added empty scopes array validation. Errors now return HTTP 500 with error message and log via `send()` for Tauri stdout monitoring.
25. **MANUAL_TESTING.md accuracy fix** — Removed reference to `denied` debug panel button (state was removed in item #20). Updated state machine diagram to show Cancel → POST deny → navigate to /apps instead of the removed `denied` state.
26. **Auth-required deny fix** — Cancel button on the auth-required screen (Screen 4) previously used a plain `<Link>` to navigate away without calling `denySession()`. The builder's polling loop would hang until TTL expiry. Fixed: Cancel now calls `handleDeny()` → `POST /v1/session/{id}/deny` → navigate to `/apps`, matching the consent screen's Cancel behavior. Test added for auth-required → deny path.
27. **Pre-fetch race condition fix** — Connect page's background pre-fetch used a `useRef<Promise>` that was never cleared. If the user navigated to a new session ID, the old ref blocked the new prefetch. Fixed: keyed the ref on `sessionId` so each session gets its own prefetch.
28. **Revoke rollback fix** — `useConnectedApps.removeApp()` optimistically removed apps from Redux but never rolled back on server failure. A failed `revokeGrant()` left the UI out of sync with Gateway (user thinks revoked, builder still has access). Fixed: on failure, the app is re-added to Redux via `addConnectedApp()`.
29. **useConnectedApps test coverage** — Added 8 unit tests covering: fetch with dev token, revoked grant filtering, null port guard, unauthenticated guard, fetch error handling, successful revoke, revoke rollback on failure, and null port revoke.
30. **Builder verification security hardening (protocol spec compliance)** — Five security issues found by auditing `builder.ts` against protocol spec section 5.5. All fixed:
    - **(a) Verification failure is now fatal**: Protocol spec says "MUST NOT render the consent screen and MUST fail the session flow" if manifest discovery or signature verification fails. Previously, `use-grant-flow.ts` and `connect/index.tsx` caught `verifyBuilder()` errors and fell back to unverified metadata (truncated address, `verified: false`), allowing the consent screen to render for unverified builders. Fixed: the catch blocks are removed — `verifyBuilder()` errors now propagate to the outer error handler, transitioning the flow to `"error"` state.
    - **(b) Missing `vana.signature` is now fatal**: Previously logged a warning and returned `verified: false`. Now throws `BuilderVerificationError` — a builder must provide a valid EIP-191 signature.
    - **(c) `vana.appUrl` equality check added**: Protocol spec step 2 requires "Verify `vana.appUrl` equals the on-chain `appUrl`". Previously used `vana.appUrl || builder.appUrl` fallback. Now throws if `vana.appUrl` is missing or doesn't match the Gateway value.
    - **(d) `webhookUrl` validation added**: Protocol spec step 4 requires "Ensure requested `webhookUrl` matches `vana.webhookUrl`". `verifyBuilder()` now accepts an optional `sessionWebhookUrl` parameter; if the session has a webhookUrl, it must match the manifest's `vana.webhookUrl`.
    - **(e) Required `vana` fields validated**: `appUrl` and `signature` are now checked before proceeding to signature verification. (30 tests in builder.test.ts, 15 tests in use-grant-flow.test.tsx)

31. **Scope format parsing fix** — `getPrimaryScopeToken()` in `src/lib/scope-labels.ts` only handled the legacy `"read:chatgpt-conversations"` format (split on `:` then `-`). The protocol spec uses dot-separated scopes like `"chatgpt.conversations"`. The old parser returned `"chatgpt.conversations"` as a single token, which failed to match any platform registry entry (id `"chatgpt"`), producing broken labels like `"Chatgpt.conversations"` and failing platform resolution on the connect page. Fixed: parser now handles both formats — splits on `:` for legacy, splits on `.` for protocol format. Added 15 tests covering both scope formats, edge cases, and label generation.

32. **Scope label formatting consolidation** — The consent screen (`grant-consent-state.tsx`) had a local `formatScope` function that produced labels like "Chatgpt Conversations" (wrong casing). Created `formatScopeLabel()` in `src/lib/scope-labels.ts` that uses the platform display name registry for proper casing (e.g., "ChatGPT Conversations", "Spotify History"). Consent screen now imports from `scope-labels.ts` — single source of truth for scope display formatting. (8 new tests in scope-labels.test.ts)

33. **Connected apps name derivation from scopes** — `useConnectedApps.grantToConnectedApp()` previously showed truncated addresses ("App 0xabcd…7890") for all grants fetched from Gateway on app restart — the builder's display name was lost because `GET /v1/grants` doesn't include builder metadata. Fixed: derives display name from the grant's scopes using `getPrimaryDataSourceLabel()` (e.g., "ChatGPT access", "Spotify access"). Falls back to truncated address only when scopes don't map to a known platform. (2 new tests in useConnectedApps.test.ts)

34. **Error retry UX** — Grant error screen previously had no retry button, forcing users to restart the entire flow from the builder app for transient failures (network hiccups, gateway timeouts). Added `handleRetry` to `useGrantFlow` which bumps a `retryCount` state to re-trigger the main flow effect (claim → verify → consent). Error screen now shows a "Try Again" button alongside "Go to Your Data". (2 new tests in use-grant-flow.test.tsx)

35. **Client-side session expiry check** — Previously, an expired session was only caught by the server (returns `SESSION_EXPIRED`), showing a generic error. Now `handleApprove` checks `session.expiresAt` against `Date.now()` before attempting grant creation, surfacing a clear "This session has expired" message. Prevents unnecessary server round-trips and gives users an actionable error message. (1 new test)

36. **Stale TODO cleanup** — Removed `{/* TODO: busy loading state */}` comment from `src/pages/connect/index.tsx`. The busy state was already fully implemented (spinner overlay with "Checking connectors..." / "Opening browser..." text) — the TODO was left over from the initial implementation.


### Architecture notes

- The spec's `exporting` state was removed from `GrantFlowState` type — data export happens on the `/connect` route (Screen 1-2), not the `/grant` route (Screen 3-5). The grant page starts at `consent` after receiving pre-fetched data from the connect page.
- Demo mode (`sessionId.startsWith("grant-session-")`) is gated behind `import.meta.env.DEV`.
- Builder verification is fatal per protocol spec — if manifest discovery or signature verification fails, the flow errors out. No fallback metadata is used. This means builders must maintain their `appUrl` availability and provide valid EIP-191 signatures.
- Grant create/revoke routes in `personal-server/index.js` are unauthenticated (no Web3Signed header required). They run on localhost only, managed by Tauri — no external access possible. The library's `GET /v1/grants` route still requires auth, satisfied by the devToken bypass.
- The `createServer()` bootstrap returns `gatewayClient` and `serverSigner` alongside `app` — we destructure these to add custom routes without modifying the library.

## Validation

- `npx tsc -b` — zero type errors
- `npm run test` — 162 tests passing across 19 test files
- Test environment: happy-dom (jsdom broken by html-encoding-sniffer@6.0.0 ESM issue)

## Known non-blocking TODOs (outside this feature scope)

- `src/pages/data-apps/components/AppCard.tsx:22` — TODO about opening app in external browser with deep-link callback vs in-app route
- `src/pages/source/index.tsx:18` — Source overview page is a placeholder (separate feature)
