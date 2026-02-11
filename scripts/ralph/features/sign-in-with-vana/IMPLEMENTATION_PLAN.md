# Sign in with Vana — Implementation Plan

## Status: COMPLETE

All P0, P1, and P2 items have been implemented, tested, and verified.

### What was built

1. **Session Relay v1 client** (`src/services/sessionRelay.ts`) — claim/approve/deny with secret threading, structured error handling (13 tests)
2. **Personal Server grant client** (`src/services/personalServer.ts`) — createGrant/listGrants/revokeGrant via Tauri HTTP plugin (18 tests)
3. **Builder verification service** (`src/services/builder.ts`) — Gateway lookup + W3C manifest fetch + EIP-191 signature verification (25 tests)
4. **Grant flow state machine** (`src/pages/grant/use-grant-flow.ts`) — `loading → claiming → verifying-builder → consent → [auth-required] → creating-grant → approving → success` with demo mode, pre-fetch support, and deferred auth (8 tests)
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

### Architecture notes

- The spec's `exporting` state was removed from `GrantFlowState` type — data export happens on the `/connect` route (Screen 1-2), not the `/grant` route (Screen 3-5). The grant page starts at `consent` after receiving pre-fetched data from the connect page.
- Demo mode (`sessionId.startsWith("grant-session-")`) is gated behind `import.meta.env.DEV`.
- Builder verification is non-fatal — uses fallback metadata (truncated address) if manifest fetch or signature check fails.
- Grant create/revoke routes in `personal-server/index.js` are unauthenticated (no Web3Signed header required). They run on localhost only, managed by Tauri — no external access possible. The library's `GET /v1/grants` route still requires auth, satisfied by the devToken bypass.
- The `createServer()` bootstrap returns `gatewayClient` and `serverSigner` alongside `app` — we destructure these to add custom routes without modifying the library.

## Validation

- `npx tsc -b` — zero type errors
- `npm run test` — 125 tests passing across 17 test files
- Test environment: happy-dom (jsdom broken by html-encoding-sniffer@6.0.0 ESM issue)

## Known non-blocking TODOs (outside this feature scope)

- `src/pages/connect/index.tsx:252` — `{/* TODO: busy loading state */}` (minor UX polish)
- `src/pages/data-apps/components/AppCard.tsx:22` — TODO about opening app in external browser with deep-link callback vs in-app route
- `src/pages/source/index.tsx:18` — Source overview page is a placeholder (separate feature)
