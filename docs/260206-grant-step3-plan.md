---
title: Grant Step 3 Authorization Plan
date: 2026-02-06
---

# Grant Step 3 Authorization Plan

## Purpose

Define what “Step 3: authorization” must do end-to-end for the grant flow.
This covers the browser auth page served by Tauri via `start_browser_auth`.

## Scope

- Grant flow auth step initiated from `/grant`.
- Browser auth page at `src/auth-page` (Privy JS SDK).
- Build/distribution into `src-tauri/auth-page`.
- Auth callback contract and error handling.

## Non-goals

- Step 4 (success/return to app UI in `/grant`).
- `/browser-login` (Privy React SDK) flow.
- Any redesign of `/grant` step 2 UI.

## Current implementation

- `useGrantFlow.handleApprove` triggers `start_browser_auth` when auth required.
- Auth page uses Privy JS SDK, embedded wallet, and posts `/auth-callback`.
- Dev server: `npm run auth:dev` (default `http://localhost:5175`).

## Step 3: Required behavior

### 1) Launch from Grant flow

- When **Allow** is clicked and user is unauthenticated:
  - `useGrantFlow` sets `auth-required`.
  - Calls `start_browser_auth` (Tauri).
  - Tauri opens the auth page in the user’s default browser.

### 2) Auth page (src/auth-page) states

Minimum states to support:

- **loading**:
  - `Starting...`
  - `Finishing sign-in...` (OAuth callback)
  - `Wallet setup...`
  - `Signing key...`
  - `Starting server...`
  - `Registering server...`
- **login**:
  - Email code flow
  - Google OAuth
  - Apple OAuth
  - Inline error banner
- **success**:
  - “Signed in.”
  - “You may now close this tab.”

### 3) Auth configuration validation

- Read config from `window.__AUTH_CONFIG__`.
- Missing/placeholder values => show login view + error:
  - “Missing Privy app configuration.”
  - “Missing Privy client configuration.”

### 4) Login flows

**Email code**

- Send code (`privy.auth.email.sendCode`)
- Show code input
- Verify code (`privy.auth.email.loginWithCode`)

**OAuth (Google/Apple)**

- Generate OAuth URL, redirect to provider.
- On callback: `privy_oauth_code` + `privy_oauth_state`
- Complete OAuth (`privy.auth.oauth.loginWithCode`)

### 5) Wallet setup

After auth:

- Ensure embedded wallet exists (create if missing).
- Load embedded wallet iframe and set message poster.
- Sign master key via `personal_sign` with `vana-master-key-v1`.

### 6) Auth result callback

Post to `/auth-callback` (same origin) with:

- `success`, `user`, `walletAddress`, `authToken`, `masterKeySignature`.
- If callback fails: show error and do not close tab.

**Contract (Tauri AuthResult)**

- `success` (required)
- `user` (optional, but include on success)
- `walletAddress` (optional)
- `authToken` (optional)
- `masterKeySignature` (optional)
- `error` (optional)

### 6.1) Success signal (back to /grant)

- No polling on `/grant`.
- Tauri emits `auth-complete` after `/auth-callback` is received.
- `useGrantFlow` listens to `auth-complete` and resumes.
- For mock/deep-link testing: `/grant?...&status=success` forces Step 4 success.

### 7) Personal server registration (non-fatal)

- Poll `/server-identity` (up to 30s).
- If identity present and not already registered:
  - Sign typed data via embedded wallet.
  - POST `/register-server`.
- Failure is non-fatal; continue to success view.

**Endpoint semantics**

- `GET /server-identity` proxies `http://localhost:{PERSONAL_SERVER_PORT}/health`
  - `200` returns health JSON
  - `503` when server not ready/unavailable
- `POST /register-server` forwards to gateway `/v1/servers`
  - Body: `{ signature, message }`
  - `200/201/409` treated as OK
  - `409` means already registered (non-fatal)
  - Other non-2xx = error (still non-fatal)

### 8) Completion message

- Show **success**.
- Do not auto-close the tab.

## UI mapping (Auth page)

| Auth action     | View    | UI copy                 |
| --------------- | ------- | ----------------------- |
| initialize      | loading | “Starting...”           |
| oauth callback  | loading | “Finishing sign-in...”  |
| wallet setup    | loading | “Wallet setup...”       |
| master key sign | loading | “Signing key...”        |
| server identity | loading | “Starting server...”    |
| register server | loading | “Registering server...” |
| failure         | login   | error banner            |
| success         | success | “Signed in.”            |

## Build + distribution

- Source: `src/auth-page`
- Output: `src-tauri/auth-page`
- Dev:
  - `npm run auth:dev` (auth page)
  - `npm run dev:app` (main app)
- Tauri should serve static auth assets from `src-tauri/auth-page`.

## Privy config

- Source of truth: frontend env vars
  - `VITE_PRIVY_APP_ID`
  - `VITE_PRIVY_CLIENT_ID`
- Providers enabled in production are controlled in the Privy dashboard.

## Test plan (minimum)

- Auth page:
  - Config missing -> login + error
  - OAuth callback path -> success view
  - Email code flow -> success view
  - Auth callback failure -> error view stays visible
- Grant flow:
  - Clicking **Allow** opens auth page and resumes after auth callback.

## Acceptance criteria

- Step 3 launches from `/grant` and completes auth in browser.
- Auth callback returns to app and grant flow resumes.
- Embedded wallet created if missing.
- Master key signed and returned in callback.
- Server registration attempted, failure is non-fatal.
- Auth page shows a clear “you may close this tab” message on success.
