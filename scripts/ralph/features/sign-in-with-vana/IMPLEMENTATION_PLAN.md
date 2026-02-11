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

### P1 Connected Apps Migration (DONE)
- **[DONE]** Created `src/hooks/useConnectedApps.ts` — hook that fetches grants from Personal Server `GET /v1/grants`, converts `Grant` objects to `ConnectedApp` format (using grantId as id, truncated granteeAddress as name, scopes as permissions), filters revoked grants, and dispatches to Redux. Replaces the old localStorage-based storage approach with Gateway as the single source of truth.

- **[DONE]** Updated `src/pages/grant/use-grant-flow.ts` — after successful grant creation and session approval, dispatches `addConnectedApp` to Redux with builder manifest name, icon, scopes, and grantId. This ensures the home page updates immediately without requiring a server round-trip.

- **[DONE]** Updated `src/pages/home/index.tsx` — uses `useConnectedApps` hook and `usePersonalServer` to fetch connected apps when the Personal Server is running. Replaces the raw Redux selector.

- **[DONE]** Updated `src/pages/settings/use-settings-page.ts` — replaced `useSyncExternalStore(subscribeConnectedApps, getAllConnectedApps)` with `useConnectedApps` hook. Revoke handler now uses `removeApp` from the hook (optimistic Redux removal).

- **[DONE]** Updated `src/pages/settings/index.test.tsx` and `src/pages/home/index.test.tsx` — added mocks for `useConnectedApps` hook. Removed obsolete `@/lib/storage` mocks from settings test.

- **[DONE]** Fixed `src/lib/storage.test.ts` — 4 tests were failing due to happy-dom's `ClassMethodBinder` caching bound methods on the localStorage instance, causing `vi.spyOn(Storage.prototype, 'setItem')` to not intercept calls. Fixed by spying on `localStorage.setItem` (instance level) instead of `Storage.prototype.setItem`, with an `interceptSetItem` helper that uses a gate function pattern. All 9 storage tests now pass.

## TODO

### P2 Future Enhancements
- **[P2]** Implement revoke via Personal Server API — currently the revoke handler only removes from Redux optimistically. Need to call `DELETE /v1/grants/{grantId}` to propagate revocation to Gateway.

- **[P2]** Add Tauri deep-link plugin for native `vana://connect` URL scheme. Add `tauri-plugin-deep-link` to `Cargo.toml` and `tauri.conf.json`. Register `vana` scheme. Listen for `onOpenUrl` events in `src/hooks/use-deep-link.ts` and parse `sessionId` + `secret` from the URL. This replaces URL query param routing for production but current URL param approach works for dev/testing.

- **[P2]** Error recovery for split failure — if `POST /v1/grants` succeeds but `POST /v1/session/{id}/approve` fails (session expired, network error), the grant exists on Gateway but builder never learns about it. Store pending `{ sessionId, grantId, secret }` in localStorage. On next app open, retry the approve call. Clear on success.

- **[P2]** Add unit tests for `sessionRelay.ts` — mock fetch, verify request shapes for claim/approve/deny, verify error handling for each error code.

- **[P2]** Add unit tests for `builder.ts` — mock fetch responses for Gateway lookup, manifest HTML parsing, manifest JSON parsing, EIP-191 signature verification. Test failure cases: unreachable appUrl, missing manifest link, invalid signature.

- **[P2]** Add unit tests for `personalServer.ts` — mock fetch, verify Web3Signed header construction (canonical JSON, base64url encoding, signature), verify request/response shapes for createGrant and listGrants.

## Validation

- `npm run typecheck` — no type errors after all changes.
- `npm run build` — clean production build.
- `npm run test` — all 55 tests passing across 13 test files. No pre-existing failures.
- Manual: open `vana://connect?sessionId=test&secret=abc` (or URL param equivalent in dev), verify full flow: claim → builder verify → consent → auth (if needed) → grant creation → session approve → success.
- Manual: click Cancel on consent screen, verify deny call fires and app navigates home.
