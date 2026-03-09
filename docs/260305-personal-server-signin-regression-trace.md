# 260305-personal-server-signin-regression-trace

## Context

Bug report: clicking `Sign in to start` on Personal Server opens account auth, deep link returns to app, but UI stays signed out.

Focused UI branch:

- `src/pages/settings/components/settings-personal-server.tsx` (`if (!isAuthenticated)` branch)

This branch is display-only. The real failure is upstream auth hydration.

## Canonical behavior (ship contract)

This is the source-of-truth flow for Personal Server page sign-in:

1. User clicks `Sign in to start` on Personal Server page.
2. `SettingsPersonalServer` calls `onSignInToStart` from `useSettingsPage`.
3. App opens:
   - `https://account-dev.vana.org/connect?sessionId=local-server-auth&appName=DataConnect`
4. Account app returns via deep link:
   - `vana://connect?sessionId=local-server-auth&masterKeySig=...`
5. `useDeepLink` parses params and dispatches `setAuthenticated(...)` after recovering wallet from `masterKeySig`.
6. `useAuth` resolves authenticated state from `walletAddress` + `masterKeySignature`.
7. For `sessionId=local-server-auth`, route target remains `ROUTES.settings` (current intended behavior).

Implementation boundaries:

- Personal Server page owns presentation/composition only.
- Auth/deep-link hydration remains centralized in `useDeepLink`.
- Sign-in launch remains in `useSettingsPage`.

## Release decision

- Confirmed by operator: flow works in installed production app `0.7.30`.
- Therefore this is not currently treated as a production auth-logic blocker.
- Personal Server page extraction can ship independently of dev deep-link handler instability.

## Explicit non-goal for this PR

- Solving dev LaunchServices/protocol handler instability is not required to ship Personal Server page extraction.
- Track dev-mode deep-link reliability as follow-up tooling/runtime work.

## Files touched for this bugfix

Code:

- `src/pages/settings/use-settings-page.ts`
- `src/hooks/use-deep-link.ts`

Tests:

- `src/pages/personal-server/index.test.tsx`
- `src/hooks/use-deep-link.test.tsx`

## Change log by hypothesis

### 1) Hypothesis: sign-in click sometimes does not open auth URL

File:

- `src/pages/settings/use-settings-page.ts`

Change:

- `openExternalUrl(url)` now falls back to `window.open(url, "_blank", "noopener,noreferrer")` when:
  - it returns `false`, or
  - it throws

First-order effect:

- Sign-in button reliably opens auth page.

Second-order effect:

- Prevents silent no-op click path when shell/plugin open fails.

Third-order risk:

- Potential duplicate-open in edge timing; mitigated by existing in-flight sign-in guard in UI.

---

### 2) Hypothesis: callback route mismatch after Personal Server extraction

File:

- `src/hooks/use-deep-link.ts`

Change outcome:

- `local-server-auth` callback target is currently `ROUTES.settings` (old behavior restored).

First-order effect:

- Callback route behavior matches previous settings-panel flow.

Second-order effect:

- Removes route-based uncertainty introduced during debugging.

Third-order risk:

- None beyond existing settings-page redirect behavior.

---

### 3) Hypothesis: signature recovery path mismatch prevents auth hydration

File:

- `src/hooks/use-deep-link.ts`

Change:

- Added resilient recovery routine:
  - try `recoverMessageAddress({ message, signature })`
  - fallback `recoverAddress({ hash: hashMessage(message), signature })`
  - tried messages:
    - `vana-master-key-v1`
    - `vana-master-key`
    - `vana-master-key-v2`

First-order effect:

- More callback signatures can hydrate `walletAddress` + `masterKeySignature`.

Second-order effect:

- Reduces dependency on one exact signing format.

Third-order risk:

- Broader acceptance path can obscure protocol drift if upstream changes unexpectedly.

---

### 4) Hypothesis: deep-link event payload shape mismatch drops callback URL

File:

- `src/hooks/use-deep-link.ts`

Change:

- `onOpenUrl` handler now accepts both payload shapes:
  - `string[]`
  - `{ urls: string[] }`

First-order effect:

- Prevents silent callback drops when plugin emits object-shaped payload.

Second-order effect:

- Directly addresses symptom: returns to app, remains signed out because URL was never parsed.

Third-order risk:

- Minimal; parser only accepts string URLs.

## Test coverage added/updated

- `src/pages/personal-server/index.test.tsx`
  - fallback open path when external open returns `false`
- `src/hooks/use-deep-link.test.tsx`
  - local-server-auth route behavior
  - hash-recovery fallback when message-recovery fails
  - object payload `{ urls: [...] }` for `onOpenUrl`

Latest run during fix:

- `npx vitest run src/hooks/use-deep-link.test.tsx src/pages/personal-server/index.test.tsx src/pages/settings/components/settings-personal-server.test.tsx`
- Result: passing

## What to do now (operator runbook)

1. Fully quit DataConnect (all processes), then relaunch.
2. Click `Sign in to start`.
3. Complete auth at account page (existing session is fine).
4. Trigger deep link back to app.
5. Verify Personal Server no longer renders signed-out branch.

If still failing after cold restart:

- add temporary debug logs in `use-deep-link.ts` for:
  - raw `onOpenUrl` payload
  - parsed params
  - recovery path chosen/success
  - `setAuthenticated` dispatch payload
- reproduce once
- patch exact failed hop only

## Repro artifacts (persist these exact URLs)

Use these exact URLs for future incident repro, so nobody has to retype them:

- Outbound sign-in URL opened by `Sign in to start`:
  - `https://account-dev.vana.org/connect?sessionId=local-server-auth&appName=DataConnect`
- Inbound deep-link URL clicked to return to DataConnect:
  - `vana://connect?sessionId=local-server-auth&masterKeySig=0xa2ab6ef175269dfb1e761406d7b1605a91b2dca6a765f50f4c38094351cb01ad293a85f86fba2db29dba7d67bb7c4f0c91321db5d8ed973e37c8329318a4b9ca1c`

## Postmortem addendum (why it "used to work")

Observed failure mode after Personal Server extraction:

- Runtime deep-link callback payload arrived as a single string URL.
- `use-deep-link.ts` only handled `string[]` and `{ urls: string[] }`, so the callback URL was dropped.
- Dropped callback means no `handleGrantParams`, no `setAuthenticated`, and UI remains signed out.

What changed in fix:

- Added payload normalization for:
  - `string`
  - `string[]`
  - `{ url: string }`
  - `{ urls: string[] }`
  - nested `{ payload: ... }`
- Reused this normalizer for both:
  - `onOpenUrl(...)` runtime deep links
  - `getCurrent()` cold-start deep links

Test that now guards this exact regression:

- `src/hooks/use-deep-link.test.tsx`
  - `handles onOpenUrl payload as a single URL string`
  - This test failed before fix and passes after fix.

## Ninth-attempt hardening (native forwarding)

Observed in real runtime:

- Browser returns via deep link, app focuses, but signed-out UI remains.
- This indicates deep link may not be reaching frontend listener reliably on
  warm app instances (single-instance handoff path), even when callback URL is
  valid.

Hardening added:

- `src-tauri/src/lib.rs`
  - In `tauri_plugin_single_instance::init(...)`, explicitly parse intercepted
    second-instance args for `vana://...` URLs and emit:
    - `deep-link://new-url` with `Vec<String>` payload.
  - Existing window is still focused as before.
- Why:
  - Removes dependence on implicit/automatic deep-link forwarding behavior.
  - Forces a deterministic event into the exact frontend channel already used by
    `@tauri-apps/plugin-deep-link` `onOpenUrl(...)`.

Frontend observability added:

- `src/hooks/use-deep-link.ts` now logs in `DEV`:
  - `getCurrent` URLs
  - raw `onOpenUrl` payload
  - extracted URLs
  - parsed grant params
  - recovered wallet address from `masterKeySig`

Verification note:

- Rust change requires restarting Tauri app process (`tauri dev` restart or
  rebuild/relaunch) to take effect.

## Incident status (after nine attempts)

### Current status

- Not fully resolved in `tauri dev` runtime.
- Core user-visible symptom still occurs in dev: sign-in flow returns focus to
  app but auth state remains signed out.
- This incident should be treated as **partially isolated**, not closed.

### Primary conclusions (high confidence)

1. **Auth hydration code path is not the first failing hop in failing repros.**
   - In failing runs, frontend logs show no deep-link payload arrival:
     - no `onOpenUrl payload`
     - `getCurrent` and focus/visibility rechecks remain `[]`
   - Therefore `setAuthenticated(...)` is never reached in those runs.

2. **Deep-link URL is not reliably entering the dev process in failing runs.**
   - Rust app log evidence (from `~/Library/Logs/dev.dataconnect/DataConnect.log`):
     - `[DeepLink][single-instance] args=["/Applications/DataConnect.app/Contents/MacOS/dataconnect"]`
     - expected `vana://...` URL is absent.
   - This indicates single-instance handoff can occur without URL payload.

3. **`main` branch comparison did not reveal a different deep-link architecture.**
   - `origin/main` uses the same plugin-driven pattern (`getCurrent` + `onOpenUrl`)
     and same local-server-auth routing intent.
   - So this is not explained by a simple "settings tab vs standalone page"
     frontend difference.

4. **Environment/registration state is a likely contributing factor.**
   - LaunchServices shows many `dev.dataconnect`/`vana` claims across historical
     app locations.
   - This can produce nondeterministic handler resolution during dev.

### What was fixed during investigation (net positive)

- Deep-link payload parsing is now resilient across multiple shapes.
- Additional deep-link instrumentation exists in both frontend and Rust.
- Repeated sign-in launches were guarded to prevent tab storms.

### What remains unproven (must not be hand-waved)

- Exact root cause of why URL payload is missing in some single-instance
  handoffs (OS routing vs plugin behavior vs browser launch behavior).
- Whether installed app runtime behaves differently enough to avoid this issue.
- Why dev mode was previously reliable in this environment and is now not.

### Working hypothesis for "used to work in dev"

- Most likely: previously cleaner protocol-handler registration state (fewer
  competing installs/claims), so deep links reached the active dev process more
  consistently.
- This remains a hypothesis until validated with clean-room reproduction.

### Immediate next step (operator)

- Debug the exact flow in installed app runtime as planned.
- Capture the same evidence set:
  - frontend deep-link logs
  - `DataConnect.log` deep-link lines
  - whether `vana://...` appears in startup/single-instance/run-event logs
- If installed app succeeds while dev fails, split dev/prod schemes/identifier
  to eliminate handler collisions.

## New decisive evidence (2026-03-05)

- Verified by operator: flow works in installed production app `0.7.30`.
- Therefore:
  - This is **not** a protocol/auth-logic blocker in shipped runtime.
  - This is **dev-runtime deep-link delivery instability** (handler/routing
    path) rather than core Personal Server sign-in logic.

### Updated primary conclusion

- The "signed out after return" failure observed during this investigation is
  environment-specific to dev-mode callback delivery.
- Do not treat this as a release-blocking auth regression for `0.7.30` without
  contrary production evidence.

### Actionability after this evidence

1. Keep production-path auth/deep-link logic stable.
2. Treat dev deep-link reliability as separate tooling/environment work.
3. If needed, implement explicit dev/prod protocol split to avoid LaunchServices
   collisions (`vanadev://` for dev, `vana://` for release).

## Scope guard

To avoid destabilizing the PR:

- Do not touch UI/layout/styles for this bug.
- Do not touch `usePersonalServer` runtime behavior for this bug.
- Constrain further changes to deep-link/auth hydration path unless evidence proves otherwise.
