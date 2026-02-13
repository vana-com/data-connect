# Settings Storage Server Components

## What this is

- UI rows and section composition for the Settings storage/server panel.
- Owns presentation for auth identity, server runtime, public endpoint, and on-chain registration status display.

## Files

- `settings-server-section.tsx`: orchestrates server option selection and expanded Personal Server details.
- `auth-row.tsx`: signed-in identity row (email/wallet/signed-in fallback).
- `status-row.tsx`: runtime server status row (`running`, `starting`, `error`, `stopped`).
- `public-endpoint-row.tsx`: tunnel URL availability + copy action.
- `registration-row.tsx`: On-Chain Registration row + state mapping and preview override.
- `row.tsx`: shared two-column label/value row primitive.
- `registration-row.test.tsx`: focused tests for registration state mapping and rendered badges.

## Data flow

- `settings-server-section.tsx` receives `personalServer` from `usePersonalServer`.
- It passes `status`/`tunnelUrl` into row components.
- `registration-row.tsx` currently derives display state from runtime inputs:
  - `error` when server status is `error`
  - `registered` when server is `running` and has `tunnelUrl`
  - `pending` otherwise

## App integration

- Rendered by storage settings section under `/settings` (not part of grant flow).
- Integrates with Personal Server controls (`restartServer`, `stopServer`) and clipboard copy.
- Uses shared settings badges/components from `src/pages/settings/components`.

## Behavior notes

- "On-Chain Registration" is the intended product concept: whether the Personal Server is a protocol participant registered on-chain.
- Current UI state in `registration-row.tsx` is a runtime-derived approximation, not an authoritative on-chain proof yet.
- Each row exposes a local `TEST_*` constant pattern for design-time state previews.
