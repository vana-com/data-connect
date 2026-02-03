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

## Routing + deep links

- Grant flow parameters are canonical in the URL (`sessionId`, `appId`, `scopes`).
- Deep links normalize the URL then redirect to `/grant` using `replace`.
- No `location.state` is used for canonical inputs.

## Connected apps

- App registry defines the available apps, their metadata, and scopes.
- `/apps/:appId` is the dynamic entry route; unknown IDs default to the demo app.
- Each app page can decide its own gated UI, but should defer to shared grant logic.

## Where to add new apps

- Add metadata to the app registry.
- Add an app page/component and connect it through `/apps/:appId`.
- If the app needs a grant flow, generate a `sessionId` and link to `/grant` with URL params.
