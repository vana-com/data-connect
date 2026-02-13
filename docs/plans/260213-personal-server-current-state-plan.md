# Personal Server Current-State Plan (Worktree)

## Purpose

Document what the Personal Server system currently does, what is ambiguous, and the shortest path to reliable behavior for Settings and related flows.

## Milestone Status (current)

### Done in this milestone

- Settings server detail rows were refactored and clarified:
  - order is now `Server status` -> `Public endpoint` -> `Authorisation`
  - dot + text status presentation is standardized across rows
  - row labels support optional info tooltip text
- Registration UI was explicitly de-risked:
  - registration row is hidden on purpose for now
  - copy/text now avoids implying authoritative guarantees
- Runtime controls were simplified:
  - `Stop server` removed from primary panel controls
  - `Restart server` only appears when status is `error` or `stopped`
- Clipboard behavior was centralized and fixed:
  - shared helper in `src/lib/clipboard.ts`
  - public endpoint copy now copies the visible URL value

### In progress / intentionally temporary

- Multiple local `TEST_*` preview constants are still in component files for rapid UI iteration.
- Some UI labels and row semantics are improved, but final wording still depends on registration contract decisions.

### Open team decision (blocking final wiring)

- Keep the current "election" UX (`Save & create` + persisted provider) and make runtime obey it, **or**
- treat Personal Server as default always-on and remove/soften election UX.

## Current System Model (as implemented)

### 1) Runtime ownership

- The actual process lifecycle is controlled in Tauri Rust commands:
  - `start_personal_server`
  - `stop_personal_server`
  - process/event handling in `src-tauri/src/commands/server.rs`.
- The React layer does not directly own the process; it invokes commands and reacts to events.

### 2) Frontend state owner

- `usePersonalServer` is the frontend state owner.
- It keeps module-level shared state (`_sharedStatus`, `_sharedPort`, `_sharedTunnelUrl`, `_sharedDevToken`) so state survives hook remounts.
- It exposes `status`, `port`, `tunnelUrl`, `devToken`, `error`, and commands `startServer`, `stopServer`, `restartServer`.

### 3) Startup flow (today)

- Phase 1: hook mount triggers unauthenticated start (`startServer(null)`).
- Phase 2: when `walletAddress` appears, hook triggers `restartServer(walletAddress)` to restart with owner credentials.
- Tauri emits structured events consumed by hook:
  - `personal-server-ready`
  - `personal-server-error`
  - `personal-server-tunnel`
  - `personal-server-dev-token`
  - `personal-server-exited`

### 4) Failure/recovery model (today)

- Crash path (`personal-server-exited` with `crashed=true`) retries with exponential backoff.
- Max retries: 3 attempts, then frontend status transitions to `error`.
- Graceful stop does not emit exit event (intentional stop flag in Rust).

### 5) Settings UI (storage/server section)

- `SettingsStorage` delegates server UX to `SettingsServerSection`.
- Server provider selection is now persisted in local storage under `settings.active-server-option`.
- Runtime controls shown in UI (current):
  - Restart server is only shown for `error`/`stopped`.
  - Stop server is not shown in the current panel iteration.
- Repair flow is intentionally deferred and not exposed in Settings UI yet.

## What "Registration" Currently Means (and does not mean)

Current UI registration badge logic is inferred from runtime+tunnel:

- `registered` if `status === "running"` and `tunnelUrl` exists
- `error` if `status === "error"`
- `pending` otherwise

This is an approximation, not a true registration proof. There is no explicit registration success/failure event wired into the hook/UI contract yet.

## Known Ambiguities

1. Is re-sign-in intended to trigger any managed re-registration path, or only wallet refresh?
2. What is the authoritative signal for "registered" vs "not registered" vs "repair needed"?
3. Should Settings provider selection be purely UI preference, or persisted protocol config?
4. Should "Repair registration" exist as a user action at all, or remain an internal/operator flow until registration contract is explicit?

## Plan (tight, non-overengineered)

### Step 1: Define one registration contract

- Add explicit event/state contract for registration outcome (success/failure/pending), instead of inferring from tunnel URL.
- Source of truth should be one place (prefer hook-level model consumed by UI).

### Step 2: Align UI copy and actions to real behavior

- Keep action labels literal to what they do.
- If action restarts server, label it as restart/repair restart until true registration repair exists.
- Avoid labels that imply guarantees we do not have.

### Step 3: Keep process state and preference state separated

- Process health: from Tauri events/hook.
- UI preference (selected provider): local setting.
- Do not let preference imply process/registration health.

### Step 4: Add only high-value tests

- Hook tests (already strong): keep crash/restart and auth transition coverage.
- Add focused `SettingsServerSection` tests:
  1. saved personal-server can be removed (regression guard),
  2. persisted provider restores on remount,
  3. remove clears persisted provider.

### Step 5: Team decisions to unblock final wiring

- Confirm exact semantics of "registration" and repair expectations.
- Decide if repair should be restart-only or a dedicated register/reconcile command.
- Decide whether provider persistence remains local-only or becomes backend-backed user setting.

## Definition of "Good Enough" for this iteration

- Runtime controls are stable and reversible.
- UI does not claim unsupported registration guarantees.
- Core user path is predictable for the chosen product model once the election-vs-runtime decision is finalized.

## Code References

- `src/hooks/usePersonalServer.ts`
- `src/hooks/usePersonalServer.test.tsx`
- `src-tauri/src/commands/server.rs`
- `src/pages/settings/sections/storage/components/settings-storage.tsx`
- `src/pages/settings/sections/storage/components/settings-server-section.tsx`

## Big Decision Question: Election vs Runtime

### How a user "elects" personal server today (UI flow)

In `SettingsServerSection`:

1. User selects `Personal Server (advanced)` in the radio list.
2. That sets a draft choice (`draftServerOption`).
3. User clicks `Save & create`.
4. That persists `settings.active-server-option` in local storage and marks it active in UI.
5. Choice is locked until `Remove`.

### But this does not control runtime

`usePersonalServer` auto-starts on mount regardless:

- phase 1: `startServer(null)`
- phase 2: restart with wallet when available

So runtime behavior is effectively: **Personal Server is on by default**, independent of provider selection UI.

### Why this is the big team question

This is currently split-brain:

- **UI election** = preference/local storage + what panel expands
- **actual server runtime** = always auto-managed by hook

That is why `Save & create` feels confusing: it looks like setup control, but it does not gate process lifecycle.

### Decision to make

Pick one explicit product model:

- **A)** Personal Server is default always-on (remove/soften election UI), or
- **B)** Election actually gates runtime start/stop (hook/runtime behavior follows selected provider).
