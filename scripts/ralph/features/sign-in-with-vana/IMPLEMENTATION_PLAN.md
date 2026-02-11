# Sign in with Vana — Implementation Plan

## Completed ✓

### P0 Core Implementation (DONE)
- **[DONE]** Add `secret` field to `GrantParams` in `src/lib/grant-params.ts`. Updated `getGrantParamsFromSearchParams()` and `buildGrantSearchParams()` to parse and propagate `secret` from deep link URL. Updated `src/hooks/use-deep-link.ts` to pass `secret` through navigation.

- **[DONE]** Rewrite `src/services/sessionRelay.ts` to use new Session Relay v1 API. Replaced `getSessionInfo(sessionId)` → `claimSession(sessionId, secret)` calling `POST /v1/session/claim` with `{ sessionId, secret }`. Replaced `approveSession()` → `approveSession(sessionId, { secret, grantId, userAddress, scopes })` calling `POST /v1/session/{id}/approve`. Added `denySession(sessionId, { secret, reason? })` calling `POST /v1/session/{id}/deny`. Updated base URL from `/sessions/*` to `/v1/session/*`. Error shape: `{ error: { code, errorCode, message, details? } }`. Error codes: `SESSION_NOT_FOUND`, `SESSION_EXPIRED`, `INVALID_SESSION_STATE`, `INVALID_CLAIM_SECRET`, `VALIDATION_ERROR`. Added types for all request/response shapes.

- **[DONE]** Create `src/services/personalServer.ts` — client for the bundled Personal Server grant endpoints. `createGrant({ granteeAddress, scopes, expiresAt?, nonce? })` calling `POST /v1/grants` → returns `{ grantId }`. `listGrants()` calling `GET /v1/grants` → returns array of grants. Both endpoints require `Authorization: Web3Signed <base64url(json)>.<signature>` header signed by the owner wallet (from Privy auth). Built the Web3Signed header: canonicalize JSON payload (sort keys), base64url encode, sign with EIP-191 `personal_sign` using the owner wallet key available from Redux auth state. Base URL is `http://localhost:{port}` where port comes from Personal Server startup.

- **[DONE]** Create `src/services/builder.ts` — builder verification service. `verifyBuilder(granteeAddress)` flow:
  1. Call Gateway `GET /v1/builders/{granteeAddress}` → `{ id, appUrl, publicKey }`.
  2. Fetch `{appUrl}` HTML, parse `<link rel="manifest" href="...">` (must be same-origin with `appUrl`).
  3. Fetch the linked W3C Web App Manifest JSON.
  4. Read `vana` block: `appUrl`, `privacyPolicyUrl`, `termsUrl`, `supportUrl`, `webhookUrl`, `signature`.
  5. Verify `vana.signature` — EIP-191 signature by builder address over canonical JSON of the `vana` block (sorted keys, excluding `signature` field). Recover signer and check it matches `granteeAddress`.
  6. Return builder metadata: `{ name, icons, appUrl, privacyPolicyUrl, termsUrl, supportUrl }` from manifest + vana block.
  Gateway base URL from env: `VITE_GATEWAY_URL` (default `https://data-gateway-env-dev-opendatalabs.vercel.app`).

- **[DONE]** Rewrite grant flow state machine in `src/pages/grant/use-grant-flow.ts`. New states: `loading → claiming → verifying-builder → consent → auth-required → creating-grant → approving → success`. Also `error` and `denied` terminal states. Key changes:
  - `loading`: parse `sessionId` + `secret` from URL params.
  - `claiming`: call `claimSession(sessionId, secret)` from rewritten `sessionRelay.ts`. Store `granteeAddress`, `scopes`, `expiresAt` in state.
  - `verifying-builder`: call `verifyBuilder(granteeAddress)` from new `builder.ts`. Store builder manifest metadata in state.
  - `consent`: show builder name/icon/scopes from manifest. No auth needed. Allow → advance to `auth-required` (or `creating-grant` if already authed). Cancel → call `denySession()` → navigate home.
  - `auth-required`: skipped if `isAuthenticated`. Otherwise trigger `startBrowserAuth()`. On auth complete → advance to `creating-grant`.
  - `creating-grant`: call `personalServer.createGrant({ granteeAddress, scopes })` → receive `{ grantId }`.
  - `approving`: call `approveSession(sessionId, { secret, grantId, userAddress, scopes })` → advance to `success`.
  - `success`: show confirmation.
  Thread `secret` through all relay calls from the initial parse.

- **[DONE]** Delete `src/services/grantSigning.ts` — mock EIP-712 grant signing replaced by Personal Server `POST /v1/grants`. Removed all references to `prepareGrantMessage()` and `verifyGrantSignature()` from the grant flow.

- **[DONE]** Updated all types: `GrantSession` now uses `granteeAddress` instead of `appId`. Added `BuilderManifest` type for builder verification. Added new flow states.

- **[DONE]** Updated grant page `index.tsx`, consent component, debug panel, and all tests to use new state machine and types.

- **[DONE]** Fixed test environment: switched from jsdom to happy-dom (jsdom had ESM compatibility issue with html-encoding-sniffer@6.0.0).

- **[DONE]** Added `VITE_GATEWAY_URL` to `.env.example`. Ensured `sessionRelay.ts`, `builder.ts`, and `personalServer.ts` all read base URLs from env with sensible defaults.

- **[DONE]** Handle demo mode — `sessionId.startsWith("grant-session-")` check gated behind `import.meta.env.DEV` so it doesn't ship to production. Demo mode bypasses relay claim and uses mock builder metadata.

- **[DONE]** Updated `src/pages/grant/components/consent/grant-consent-state.tsx` to display builder metadata from manifest. Component now receives `builderManifest` prop and displays: builder icon from manifest (with fallback to PlatformIcon), human-readable scope labels, and privacy policy/terms links from the manifest's vana block. Updated `src/pages/grant/index.tsx` to pass `builderManifest` through to the consent component.

- **[DONE]** Deny flow already fully wired: `handleDeny` passed as `onDeny` to `GrantConsentState`, Cancel button calls `onDeny()` which fires `denySession()` API call and transitions state to `denied`. Test coverage confirms the flow works end-to-end.

- **[DONE]** Fixed critical bug: connect page was not passing `secret` parameter through to the grant page URL. `src/pages/connect/index.tsx` now includes `secret` in `buildGrantSearchParams()` call when building the `/grant` navigation URL. Without this, real (non-demo) sessions would fail with 'No secret provided' error on the grant page.

- **[DONE]** Background pre-fetch: connect page now claims session and verifies builder in the background while the user exports data (per spec Screen 1). Pre-fetched data passed via React Router navigation state to grant page. Grant flow hook (`useGrantFlow`) accepts optional `PrefetchedGrantData` and skips claim + verify steps when available. New `PrefetchedGrantData` type in `src/pages/grant/types.ts`. Falls back to on-demand claim + verify if pre-fetch hasn't completed or failed. Test added for pre-fetch path (8 tests in use-grant-flow.test.tsx).

- **[DONE]** Added test for secret passthrough in connect page (verifies debug skip link includes secret in URL). Added mocks for `claimSession` and `verifyBuilder` in connect page test to prevent network calls during testing.

### P1 Connected Apps Migration (DONE)
- **[DONE]** Created `src/hooks/useConnectedApps.ts` — hook that fetches grants from Personal Server `GET /v1/grants`, converts `Grant` objects to `ConnectedApp` format (using grantId as id, truncated granteeAddress as name, scopes as permissions), filters revoked grants, and dispatches to Redux. Replaces the old localStorage-based storage approach with Gateway as the single source of truth.

- **[DONE]** Updated `src/pages/grant/use-grant-flow.ts` — after successful grant creation and session approval, dispatches `addConnectedApp` to Redux with builder manifest name, icon, scopes, and grantId. This ensures the home page updates immediately without requiring a server round-trip.

- **[DONE]** Updated `src/pages/home/index.tsx` — uses `useConnectedApps` hook and `usePersonalServer` to fetch connected apps when the Personal Server is running. Replaces the raw Redux selector.

- **[DONE]** Updated `src/pages/settings/use-settings-page.ts` — replaced `useSyncExternalStore(subscribeConnectedApps, getAllConnectedApps)` with `useConnectedApps` hook. Revoke handler now uses `removeApp` from the hook (optimistic Redux removal).

- **[DONE]** Updated `src/pages/settings/index.test.tsx` and `src/pages/home/index.test.tsx` — added mocks for `useConnectedApps` hook. Removed obsolete `@/lib/storage` mocks from settings test.

- **[DONE]** Fixed `src/lib/storage.test.ts` — 4 tests were failing due to happy-dom's `ClassMethodBinder` caching bound methods on the localStorage instance, causing `vi.spyOn(Storage.prototype, 'setItem')` to not intercept calls. Fixed by spying on `localStorage.setItem` (instance level) instead of `Storage.prototype.setItem`, with an `interceptSetItem` helper that uses a gate function pattern. All 9 storage tests now pass.

- **[DONE]** Implement revoke via Personal Server API — added `revokeGrant(port, grantId)` to `src/services/personalServer.ts` calling `DELETE /v1/grants/{grantId}`. Updated `useConnectedApps.removeApp` to fire the server revoke after optimistic Redux removal (graceful degradation if server endpoint not yet available). Settings page passes Personal Server port through to revoke handler. Added 4 tests for the new endpoint. File: `src/services/personalServer.test.ts` (now 14 tests).

- **[DONE]** Implement EIP-191 signature verification in `src/services/builder.ts` — replaced placeholder signature check with real cryptographic verification using `viem/utils` `verifyMessage`. Constructs canonical JSON of the vana block (sorted keys, `signature` field excluded), then verifies the EIP-191 signature recovers to the `granteeAddress`. Invalid signatures throw `BuilderVerificationError`. Missing signatures still warn-and-continue (no throw). Added 3 tests for signature verification (canonical JSON construction, invalid signature rejection, minimal vana block). File: `src/services/builder.test.ts` (now 25 tests).

- **[DONE]** Added unit tests for `sessionRelay.ts` (13 tests) — verifies request shapes for claim/approve/deny, URL encoding of sessionId, structured error handling for all error codes (SESSION_NOT_FOUND, INVALID_CLAIM_SECRET, SESSION_EXPIRED, INVALID_SESSION_STATE), network errors, non-JSON responses, and generic HTTP errors. File: `src/services/sessionRelay.test.ts`.

- **[DONE]** Added unit tests for `builder.ts` (25 tests) — verifies Gateway lookup, app HTML fetching, manifest JSON parsing, manifest link extraction (both attribute orders), relative URL resolution, same-origin enforcement, BuilderManifest construction with icon URL resolution, short_name fallback, missing name/vana block errors, unreachable endpoints, HTTP error codes, signature-absent warning, canonical JSON construction, invalid signature rejection, and minimal vana block. File: `src/services/builder.test.ts`.

- **[DONE]** Added unit tests for `personalServer.ts` (14 tests) — mocks `@tauri-apps/plugin-http` dynamic import, verifies createGrant, listGrants, and revokeGrant request shapes (URL, method, headers, body), correct port in URL, optional fields (expiresAt, nonce), network failure errors, non-JSON responses, structured error messages with statusCode, and empty grant lists. File: `src/services/personalServer.test.ts`.

## TODO

### P2 Future Enhancements
- **[P2]** Add Tauri deep-link plugin for native `vana://connect` URL scheme. Add `tauri-plugin-deep-link` to `Cargo.toml` and `tauri.conf.json`. Register `vana` scheme. Listen for `onOpenUrl` events in `src/hooks/use-deep-link.ts` and parse `sessionId` + `secret` from the URL. This replaces URL query param routing for production but current URL param approach works for dev/testing.

- **[P2]** Error recovery for split failure — if `POST /v1/grants` succeeds but `POST /v1/session/{id}/approve` fails (session expired, network error), the grant exists on Gateway but builder never learns about it. Store pending `{ sessionId, grantId, secret }` in localStorage. On next app open, retry the approve call. Clear on success.

## Validation

- `npm run typecheck` — no type errors after all changes.
- `npm run build` — clean production build.
- `npm run test` — all 109 tests passing across 16 test files. No pre-existing failures.
- Manual: open `vana://connect?sessionId=test&secret=abc` (or URL param equivalent in dev), verify full flow: claim → builder verify → consent → auth (if needed) → grant creation → session approve → success.
- Manual: click Cancel on consent screen, verify deny call fires and app navigates home.
