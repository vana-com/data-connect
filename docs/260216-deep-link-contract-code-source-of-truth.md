---
title: Deep Link Contract (Code Source of Truth)
date: 2026-02-16
---

# Deep Link Contract (Code Source of Truth)

This document is intentionally based on implementation code, not historical plans.
If this document conflicts with older docs, trust code and update docs.

## Canonical deep link scheme (current runtime)

- Canonical scheme: `vana://connect`
- Desktop runtime registers only `vana` as a deep-link scheme.

Code references:
- `src-tauri/tauri.conf.json` (`plugins.deep-link.desktop.schemes = ["vana"]`)
- `src/hooks/use-deep-link.ts` (parsing comments and flow target logic for `vana://connect`)

## Canonical grant/connect URL params in app code

`src/lib/grant-params.ts` defines the parsed/built param contract:

- `sessionId?: string`
- `secret?: string`
- `appId?: string`
- `scopes?: string[]`
- `status?: "success"`

Behavior from runtime flow code:

- Real relay-backed flow requires `sessionId` and `secret`.
- Missing `secret` in non-demo flow is a hard error.
- `appId` and `scopes` are used when present (target app + source labeling/routing).
- `status=success` is optional and used only to force success UI path.

Code references:
- `src/lib/grant-params.ts`
- `src/pages/grant/use-grant-flow.ts` (non-demo missing-secret error path)
- `src/pages/connect/index.tsx` (threads `secret`, `appId`, `scopes` into `/grant`)

## Session Relay contract used by desktop app

The desktop app uses Session Relay APIs where `secret` is part of authorization
for claim/approve/deny operations.

Code references:
- `src/services/sessionRelay.ts`
  - `claimSession({ sessionId, secret })`
  - `approveSession(sessionId, { secret, grantId, userAddress, scopes })`
  - `denySession(sessionId, { secret, reason? })`

## Builder/app integration rule

App clients should not handcraft production deep links.

Use Session Relay session-init output `deepLinkUrl` directly and pass through
without mutation. This avoids drift in scheme/param requirements and guarantees
the `secret` is present for relay authorization.

Protocol reference (aligned with code behavior):
- `docs/260121-data-portability-protocol-spec.md`
  - Session init output includes `deepLinkUrl`
  - Deep link format includes `sessionId` and `secret`
  - `secret` is required for claim/approve/deny

## Legacy/doc drift notes

Some older docs still mention `dataconnect://` or pre-secret param shapes.
Those are historical artifacts and should be treated as stale unless code is
changed to reintroduce compatibility.

Known stale examples to clean up over time:
- `src/pages/connect/README.md` (mentions `dataconnect://`)
- `docs/260206-grant-step4-plan.md` (example uses `dataconnect://`)

## Decision summary

- Preferred and active scheme: `vana://connect`
- Preferred integration: relay-returned `deepLinkUrl` passthrough
- `secret` is mandatory for real claim flow and expected in relay deep links
- If docs and code disagree, code is source of truth
