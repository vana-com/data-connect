---
title: Grant + Connect Flow
date: 2026-02-03
---

# Grant + Connect Flow

## Purpose

Explain how connect UI, deep links, and the grant flow fit together so the system
is predictable, debuggable, and easy to extend.

## Flow diagram

```mermaid
flowchart TD
  A["Data app / Connect CTA"] -->|build /grant?sessionId&appId&scopes| B[Connect Flow UI]
  X[Deep link: dataconnect://?sessionId&appId&scopes] --> C[useDeepLink]
  C -->|normalize + replace| D["/grant?sessionId&appId&scopes"]
  B -->|Continue/Allow| D
  D --> E[GrantFlow orchestrator]
  E -->|auth required| F[Open Privy in browser]
  F -->|auth-complete event| E
  E -->|Approve| G[grantSigning + approveSession]
  G -->|success| H["setConnectedApp (localStorage)"]
  H --> I[App connected state]
```

## Responsibilities

- Connect Flow UI: presents the multi-step UI and sends the user into the grant flow.
- Grant Flow: owns auth/consent/signing states and persists the connected app.
- Deep links: normalize to canonical `/grant` URL params, then route with `replace`.
- App registry: defines available apps, default app, and scopes for demo usage.

## Current implementation status

- `src/pages/grant/*` covers consent/auth/success states only (steps 2-4).
- The step-1 Connect CTA screen from the linear design is not implemented yet.

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
- App registry + default: `src/apps/registry.ts`
