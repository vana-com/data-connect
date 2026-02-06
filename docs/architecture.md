---
title: Architecture
date: 2026-02-03
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

- Redux is used for auth state only.
- Grant flow state is local to the flow (`useGrantFlow`).
- Connected apps are stored in `localStorage` and observed via `useSyncExternalStore`.
- Storage is versioned and indexed for O(1) access.

## Auth + grant flow

- Auth is handled by opening a browser (Privy) and listening for `auth-complete`.
- Grant flow steps are UI states: loading → auth-required → consent → signing → success/error.
- The sign-in page is always external; the UI only orchestrates and reflects state.
- The auth page is a separate runtime surface served by Tauri (`src/auth-page` → `src-tauri/auth-page`)
  and launched via `start_browser_auth`.
- Auth results are posted to `/auth-callback` and bridged back into the app as `auth-complete`.

## Routing + deep links

- Grant flow parameters are canonical in the URL (`sessionId`, `appId`, `scopes`).
- Deep links normalize the URL then redirect to `/grant` using `replace`.
- No `location.state` is used for canonical inputs.
- `status=success` in the grant URL is the contract for Step 4 success and should replace history.

## Personal server registration

- After auth, the app may attempt personal server registration (non-fatal on failure).
- `GET /server-identity` proxies `http://localhost:{PERSONAL_SERVER_PORT}/health`.
- `POST /register-server` forwards to the gateway and treats `200/201/409` as success.

## Connected apps

- App registry defines the available apps, their metadata, and scopes.
- Data apps are external web apps; the client opens an external URL in the browser.
- There is currently no in-app `/apps/:appId` route for external apps.
- External app URLs are defined per app (no shared base URL).

## Dev + mock boundaries

- Mock external app routes can be enabled via `VITE_USE_RICKROLL_MOCK`.

## Where to add new apps

- Add metadata to the app registry.
- Add the external app URL for browser handoff.
- If the app needs a grant flow, generate a `sessionId` and link to `/grant` with URL params.
