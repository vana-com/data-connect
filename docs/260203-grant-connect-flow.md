---
title: Grant + Connect Flow
date: 2026-02-03
---

# Grant + Connect Flow

## Purpose

Explain how connect UI, data-source login/scrape, deep links, and the grant flow
fit together so the system is predictable, debuggable, and easy to extend.

## Flow diagram

```mermaid
flowchart TD
  A["Connect CTA"] --> B[Step 1: data-source login + scrape]
  B -->|connector run completes| C["/grant?sessionId&appId&scopes"]
  X[Deep link: dataconnect://?sessionId&appId&scopes] --> D[useDeepLink]
  D -->|normalize + replace| E["/connect?sessionId&appId&scopes"]
  E --> B
  C --> F[GrantFlow orchestrator]
  F -->|auth required| G[Open Privy in browser]
  G -->|auth-complete event| F
  F -->|Approve| H[grantSigning + approveSession]
  H -->|success| I["setConnectedApp (localStorage)"]
  I --> J[App connected state]
```

## UI design reference

Linear 4-step connect/grant design: `docs/_wip/260202-connect-flow.png`.

## Responsibilities

- Connect Flow UI: `/connect` step 1, starts data-source login/scrape, then
  routes into the grant flow.
- Data-source login/scrape: connector run launched from step 1.
- Grant Flow: owns consent/auth/signing states and persists the connected app.
- Deep links: normalize to canonical params, then route to `/connect` with `replace`.
- App registry: defines available apps, default app, and scopes for demo usage.

## Current implementation status

- Step 1 (data-source login + scrape) is implemented at `/connect`.
- `src/pages/grant/*` covers consent/auth/success states only (steps 2-4).
- Demo app routing: `/apps/:appId` renders a host page (e.g. `src/pages/RickRollApp.tsx`)
  that handles gating + grant CTA, and then renders the app UI from
  `src/apps/<appId>/app.tsx` once connected.

## Canonical inputs

Grant flow inputs are canonical in the URL:

- `sessionId`
- `appId`
- `scopes` (JSON array or comma-delimited fallback)

Do not use `location.state` for these values.

## React state stability

- In `useGrantFlow`, the `scopes` dependency uses a stable key (`scopes.join("|")`) to
  avoid re-running effects on new array identities.

## Demo behavior (local)

Demo sessions (`sessionId` starts with `grant-session-`) use registry metadata and
skip relay calls. If `appId` is missing, the default app is used.

## Where to look

- URL parsing/building: `src/lib/grant-params.ts`
- Deep links: `src/hooks/useDeepLink.ts`
- Grant flow state machine: `src/pages/grant/use-grant-flow.ts`
- Grant flow UI: `src/pages/grant/*`
- Step 1 route: `src/pages/connect/index.tsx`
- App registry + default: `src/apps/registry.ts`
- Connector run entrypoint: `src/hooks/useConnector.ts` + `start_connector_run`
