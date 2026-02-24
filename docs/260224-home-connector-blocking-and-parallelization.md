## Home connector blocking and parallelization

### Context

Art demoed a long-running ChatGPT connector (~1h45m for 2.1k conversations). We need to avoid freezing the rest of the product while one import runs.

### Decision

Treat connector runs in two UX buckets:

- **Blocking (foreground user action required):** opening browser, waiting for sign-in/login/user action.
- **Non-blocking (background work):** importing/collecting/downloading after credentials are accepted.

The home "Import sources" grid should:

- block new starts only while a run is in blocking states
- unblock other sources once the active run transitions to background work
- show spinner on the active source and pause icon on temporarily blocked sources

### What is implemented now

- `hasBlockingRun` on home available sources list, based on normalized status text + `isConnected`.
- Button disable/arrow/pause state now use `hasBlockingRun` (not "any running run").
- Connecting status/account lines are right-aligned and truncation-safe.

### Verification checklist (must stay true)

- If one run is `running` + "Waiting for sign in...", other available sources are disabled.
- If one run is `running` + "Collecting data...", other available sources are enabled.
- Active running card remains non-clickable while in progress.

### Known risks / blind spots

- Blocking policy currently relies on status text mapping; connector status taxonomy drift can regress behavior.
- Missing/empty status messages can fall back to "Opening browser…" and temporarily re-block.
- No ETA/time-remaining guidance yet for long-running background imports.

### Running backlog

- Add explicit run phase enum in state for gating (`requiresUserAction` vs `backgroundRunning`) to reduce string coupling.
- Add long-run UX improvements (ETA/confidence band, progress semantics, "safe to keep using app" messaging).
- Keep `available-sources-list.tsx` under watch for complexity growth; split policy helpers/view-model if readability drops further.

### Open verification gap

- `connectingAccountLine` is not fully production-plumbed yet.
  - Current behavior:
    - First tries structured identity (`run.exportData.userInfo.email`).
    - Falls back to email extraction from `statusMessage` text (heuristic).
  - Follow-up needed:
    - Emit active account identity from connector events while run is `running`.
    - Store that identity on `Run` explicitly (avoid parsing status text).
    - Add tests for account-line rendering precedence and fallback behavior.

### Decision log (2026-02-24)

- **Stop/cancel surface area:** support stopping from both Home and Import History.
  - Import History already has a running-row **Stop** action.
  - Home should add a matching **Cancel** action on connecting cards.
- **Confirmation threshold:** if run duration is under 10 minutes, stop immediately; at 10+ minutes, show confirm dialog.
- **ETA messaging:** do not fake a precise ETA yet. Use coarse language first (for example: "Large imports can take a while; you can continue using the app.").
- **Resume behavior:** keep it simple — no true resume. Use existing **Run again** semantics (restart from scratch).
- **Parallel cap (initial):** postpone hard cap UI in this iteration. Current behavior allows parallel background runs once user-action blocking clears.
  - If resource contention appears in real usage, add a simple cap (for example 3) and disable remaining cards with a clear reason.
- **Duplicate start clarification:** Home already has one card per platform and the active platform card is non-clickable while that run is connecting/running.

### Implementation slice (2026-02-24)

- Added Home card-level cancel action for running imports.
- Reused existing stop plumbing (`stop_connector_run`) via frontend hook.
- Added Home UI debug scenarios via URL params (`scenario=blocking-waiting|background|phase-label`).
- Added tests covering:
  - blocked vs unblocked available-source behavior
  - cancel affordance on running card
  - cancel confirmation + stop action path
