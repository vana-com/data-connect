---
title: Architecture
date: 2026-02-03
updated: 2026-02-10
---

# Architecture

## Overview

DataBridge is a desktop client that coordinates data export runs and app grants.
It is not a protocol participant; if a Personal Server is bundled, that server is
the on-chain participant.

This architecture exists to implement the Data Portability Protocol:
`docs/260121-data-portability-protocol-spec.md`. DataBridge extracts and stores
personal data locally so it can be used via the protocol, while keeping protocol
participation and on-chain responsibilities in the Personal Server.

Runtime boundaries:

- React frontend (Vite + Redux + Router + Tailwind)
- Tauri/Rust backend (commands, file ops, subprocesses)
- Playwright runner (Node.js, bundled Chromium)

```
┌─────────────────────────────────────────┐
│        React Frontend (TypeScript)      │
│  Vite + Redux + TailwindCSS + Router    │
└──────────────────┬──────────────────────┘
                   │ Tauri IPC
┌──────────────────▼──────────────────────┐
│         Tauri/Rust Backend              │
│  Commands, file ops, subprocess mgmt    │
└──────────────────┬──────────────────────┘
                   │ stdin/stdout JSON
┌──────────────────▼──────────────────────┐
│     Playwright Runner (Node.js)         │
│  Standalone binary + bundled Chromium   │
└─────────────────────────────────────────┘
```

## Flow architecture

- Grant + Connect flow overview: `docs/260203-grant-connect-flow.md`

## State ownership

- Redux is used for auth state and connected apps.
- Grant flow state is local to the flow (`useGrantFlow`).
- Connected apps are fetched from Gateway via Personal Server `GET /v1/grants` —
  Gateway is the single source of truth. localStorage is only used for pending
  approval recovery (split-failure scenario).

## Auth + grant flow

- Auth is handled by opening a browser (Privy) and listening for `auth-complete`.
- Grant flow state machine: `loading → claiming → verifying-builder → consent → auth-required → creating-grant → approving → success`.
- Key design: consent happens **before** sign-in. Session data is held in app state;
  sign-in is deferred until grant creation time. If already signed in, auth is skipped.
- The sign-in page is always external; the UI only orchestrates and reflects state.
- The auth page is a separate runtime surface served by Tauri (`src/auth-page` → `src-tauri/auth-page`)
  and launched via `start_browser_auth`.
- Auth results are posted to `/auth-callback` and bridged back into the app as `auth-complete`.
- Grant creation: Personal Server `POST /v1/grants` signs EIP-712 and submits to Gateway.
- Session approval: Session Relay `POST /v1/session/{id}/approve` notifies the builder.

## Routing + deep links

- Deep links use `vana://connect?sessionId={id}&secret={secret}` via Tauri deep-link plugin.
- `useDeepLink` normalizes the URL then redirects to `/connect` using `replace`.
- Grant flow parameters are canonical in the URL (`sessionId`, `secret`, `scopes`).
- Pre-fetched data (`session` + `builderManifest`) is passed via `location.state`
  from `/connect` to `/grant` as a performance optimization — not a canonical input.
- `status=success` in the grant URL forces success UI and should replace history.

## Personal Server

- Personal Server is launched by Tauri with `VANA_MASTER_KEY_SIGNATURE`. It derives
  its signing keypair from this and registers with Gateway.
- Grant endpoints: `POST /v1/grants` (create — EIP-712 sign + Gateway submit),
  `GET /v1/grants` (list — proxies Gateway), `DELETE /v1/grants/{grantId}` (revoke).
- Create and revoke routes are unauthenticated (localhost only, managed by Tauri).
  `GET /v1/grants` requires auth (devToken bypass).
- Emits `dev-token` on stdout → Rust forwards via `personal-server-dev-token` event
  → `usePersonalServer` hook captures for `GET /v1/grants` auth header.
- `GET /server-identity` proxies `http://localhost:{PERSONAL_SERVER_PORT}/health`.
- `POST /register-server` forwards to the gateway and treats `200/201/409` as success.

## Connected apps

- Gateway is the source of truth. `useConnectedApps` fetches grants from Personal
  Server `GET /v1/grants`, filters out revoked grants, derives display names from
  scope labels (e.g., "ChatGPT access").
- Revocation: `DELETE /v1/grants/{grantId}` with optimistic Redux update + rollback
  on failure.
- Data apps are external web apps; the client opens an external URL in the browser.
- There is currently no in-app `/apps/:appId` route for external apps.

## Dev + mock boundaries

- Mock external app routes can be enabled via `VITE_USE_RICKROLL_MOCK`.
- Demo sessions (`sessionId` starts with `grant-session-`) skip network calls.
  Gated behind `import.meta.env.DEV`.

## Where to add new apps

- Add metadata to the app registry.
- Add the external app URL for browser handoff.
- If the app needs a grant flow, generate a `sessionId` and link to `/grant` with URL params.
