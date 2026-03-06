## Personal Server exit state bug

`usePersonalServer()` was leaving a stale shared port behind after the `personal-server-exited` event.

### Symptom

- Hook state could become `status: "stopped"` while `port` still held the last ready value, e.g. `8080`.
- The failing test that exposed it was `src/hooks/usePersonalServer.test.tsx`:
  `sets status to stopped on graceful exit (not crash)`.

### Root cause

- The hook keeps both React state and module-level shared state.
- On `personal-server-ready`, both were updated with the active port.
- On `personal-server-exited`, React `port` was cleared, but `_sharedPort` was not.
- `_notifyAll()` then re-synced mounted hook instances from `_sharedPort`, restoring the stale port.

### Why this matters

- Consumers can treat `port` as a currently usable endpoint.
- A stopped server should not keep advertising a local port as active state.
- This creates internally inconsistent state: stopped process, non-null port.

### Fix

- Clear `_sharedPort` in the `personal-server-exited` handler before `_notifyAll()`.

### Scope

- This is a straightforward state-consistency bug fix, not a product-behavior change.
- The existing test contract was already describing the correct behavior.
