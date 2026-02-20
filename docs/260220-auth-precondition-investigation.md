# Auth Precondition Investigation for Connect/Grant

This is an investigation note, not a plan.

## Question

Can Data Connect guarantee users are already authenticated before they reach `/connect` or `/grant`, so grant-phase login is never needed in normal flow?

## Product intent (as stated)

- Users start from an external app (builder app).
- They authenticate via Vana Passport (Privy flow) before entering Data Connect.
- Data Connect should retain that auth state after install/open/deep-link.
- Therefore, users should not need to sign in during grant flow.

This intent is coherent.

## What "master signature" means

Team wording ("master signature") maps to `masterKeySignature` in code.

- In auth page flow, Data Connect signs a fixed message with embedded wallet:
  - message: `vana-master-key-v1`
  - method: `personal_sign`
- That signature is returned in auth result as `masterKeySignature`.
- Tauri passes it to Personal Server as `VANA_MASTER_KEY_SIGNATURE`.
- Personal Server derives its signing keypair from it.

So `masterKeySignature` is the portable proof/key-seed artifact needed for server-side grant operations, without exposing private key material to Data Connect.

## Current code reality (why guarantee is not hard yet)

### 1) Grant flow still has an auth fallback path

`useGrantFlow.handleApprove` sets `auth-required` when auth is missing:

- condition: `!isAuthenticated || !walletAddress`
- behavior: status becomes `auth-required`, then browser auth orchestration can run.

So grant-phase auth is still implemented as a safety path.

### 2) Auth state bootstrapping appears incomplete for hard guarantees

- Redux auth defaults to unauthenticated at boot.
- Existing app init (`useInitialize`) loads runs, not auth state.
- Deep-link grant/connect params do not contain auth artifacts.

This means a fresh app process can reach connect/grant without guaranteed hydrated auth unless some prior flow already set auth state.

### 3) Master signature requirement is real for successful grant path

Personal Server startup and grant success depend on the signature path:

- Auth page emits `masterKeySignature`.
- Server command consumes it as `VANA_MASTER_KEY_SIGNATURE`.
- Without this, grant flow can fail (already reflected in internal test logs/docs).

## What would make "no grant-phase login" true as an invariant

You need a strict precondition contract before rendering connect/grant:

- `isAuthenticated === true`
- `walletAddress` present
- `masterKeySignature` present
- auth freshness/validity known (not unknown)

If any fail, block route progression and recover upstream or via a dedicated pre-entry auth gate (not mid-grant UI).

## Minimal invariant-oriented architecture (investigation outcome)

1. **Startup auth hydration**
  - Load/verify persisted auth artifacts before route-level connect/grant access.
2. **Route guards**
  - Gate `/connect` and `/grant` behind the auth precondition contract.
3. **Fallback policy**
  - Keep current grant auth fallback only as emergency/dev escape hatch, not expected product path.
4. **Telemetry**
  - Track any entry into grant auth fallback as a contract violation event.

## Suggested dogfood checks

- How often does a deep-linked fresh install reach `/grant` with missing `masterKeySignature`?
- How often does connect/grant render before auth hydration completes?
- How often is grant auth fallback entered after the precondition guard is added?
- What % of users complete full flow without any auth UI inside Data Connect?

## Grounding references

- `src/pages/grant/use-grant-flow.ts`
- `src/pages/grant/index.tsx`
- `src/auth-page/auth.ts`
- `src-tauri/src/commands/auth.rs`
- `src-tauri/src/commands/server.rs`
- `src/state/store.ts`
- `src/hooks/useInitialize.ts`
- `src/lib/grant-params.ts`
- `docs/architecture.md`
- `docs/260121-data-portability-protocol-spec.md`

