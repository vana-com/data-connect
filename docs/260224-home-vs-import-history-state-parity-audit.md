## Home vs Import History state parity audit

### Scope

Compare the "connect/import in progress" UX policy on:

- Home available-source cards (`src/pages/home/components/available-sources-list.tsx`)
- Settings import history rows (`src/pages/settings/sections/imports/components/import-history-panel.tsx`)

Focus: state handling parity, duplicated logic, and missing functions.

### Source files reviewed

Home:

- `src/pages/home/components/available-sources-list.tsx`
- `src/pages/home/components/available-sources-list.lib.ts`
- `src/pages/home/components/available-sources-list.policy.ts`
- `src/pages/home/home-ui-debug.ts`
- `src/pages/home/index.tsx`

Import History:

- `src/pages/settings/sections/imports/components/import-history-panel.tsx`
- `src/pages/settings/sections/imports/components/import-history-row.tsx`
- `src/pages/settings/sections/imports/components/import-history-row-actions.tsx`
- `src/pages/settings/sections/imports/components/import-history-row-utils.ts`
- `src/pages/settings/sections/imports/components/import-history-panel-state.ts`
- `src/pages/settings/sections/imports/components/import-history-ui-debug.ts`
- `src/pages/settings/sections/imports/use-imports-section.ts`

### What Home has that Import History does not

1. **Running-status normalization policy**
   - Home function: `getConnectingStatusLine(statusMessage, phaseLabel)`
   - Behavior:
     - phase label wins when present
     - maps `"Waiting for sign in..."` -> `"Waiting for sign-in..."`
     - maps `"Collecting data..."` -> `"Importing data..."`
     - fallback with empty status -> `"Opening browser..."`
   - Import History currently does not use an equivalent normalization layer; it renders status via generic row description and status labels.

2. **Blocking-vs-background gating policy**
   - Home functions: `isBlockingStatusLine`, `isBlockingRun`
   - Behavior:
     - blocks starting other sources only during pre-auth/foreground user-action states
     - unblocks other sources when active run transitions to background work
   - Import History has no equivalent policy function because it is a history surface; however this means no shared interpretation layer exists between Home and history.

3. **Active account hint extraction**
   - Home function: `getConnectingAccountLine(run)`
   - Behavior:
     - prefers `run.exportData.userInfo.email`
     - falls back to email regex from status text
   - Import History has no equivalent account-line presentation for running rows.

### What Import History has that Home does not

1. **Terminal-state row action system**
   - `Run again`, `Remove`, `Open`, failed-detail toggle in `import-history-row-actions.tsx`
   - row error-detail expansion in `import-history-row.tsx` + `getErrorDetail`

2. **Row description/status utility layer**
   - `getRowDescription`, `shouldConfirmStop`, `getErrorDetail` in `import-history-row-utils.ts`
   - includes step counts and terminal run summary text

3. **Pending-action UX for remove/stop**
   - `removingRunIds` + `stoppingRunIds` sets in `import-history-panel.tsx`
   - explicit `"Removing..."` / `"Stopping..."` row states

4. **History-specific debug fixtures**
   - scenarios: `empty`, `active`, `finished`, `mixed`, `remove-pending`, `stop-pending`
   - state fixture resolver: `resolveImportHistoryRuns` + `resolveImportHistoryUiDebug`

### Duplicated or near-duplicated logic

1. **URL-driven DEV scenario plumbing**
   - Home and Import History both implement:
     - scenario union type
     - scenario guard (`is...Scenario`)
     - URL parse/resolve config
     - enabled helper
     - panel button toggles for scenario switching

2. **Stop action wrappers**
   - Home:
     - `handleStopImport` in `home/index.tsx`
     - `stopRun` in `available-sources-list.tsx`
   - Import History:
     - `handleStop` in `import-history-panel.tsx`
   - All wrap `stopExport`/`onStopRun` with local pending state + async error boundary behavior.

3. **Stop confirmation content**
   - Equivalent confirmation copy appears in both surfaces ("Stop/Cancel import?" + same body).

### Concrete parity gaps (behavior-level)

1. **State interpretation drift risk**
   - Home runs through a dedicated policy module (`available-sources-list.policy.ts`).
   - Import History uses separate row utils and raw run fields.
   - Outcome: no single source of truth for "what does current run state mean to user".

2. **Running copy inconsistency**
   - Home can show connector phase label directly and normalized status strings.
   - Import History shows generic running/pending labels and row description text, not the same normalized status vocabulary.

3. **No shared account-identity presentation**
   - Home tries to show `Using <email>`.
   - Import History does not expose equivalent running identity signal.

### Missing functions across the two places

Missing in Import History (present in Home policy):

- `getConnectingStatusLine`
- `getConnectingAccountLine`
- `isBlockingStatusLine`
- `isBlockingRun`

Missing in Home (present in Import History utilities/actions):

- `getRowDescription`
- `getErrorDetail`
- `shouldConfirmStop`
- row action menu + remove flow helpers from `import-history-row-actions.tsx`

### Suggested consolidation target

If parity is a goal, create a shared run-state policy module (for example `src/lib/run-state-policy.ts`) and move cross-surface interpretation there:

- status normalization (`phase/statusMessage -> user-facing state line`)
- blocking classification (`foreground-user-action` vs `background-running`)
- active account hint extraction
- common stop-confirm trigger policy

Then keep Home and Import History as presentation-specific consumers of the same policy.

### Specific TODOs

- [ ] Fix Import History row `Reveal` action so clicking it opens the user's Personal Server folder in the OS file manager (not just row-level UI feedback/no-op). Use shared path/open helpers (`src/lib/tauri-paths.ts`, `src/lib/open-resource.ts`) so this works correctly in Tauri on the user's machine.
- [ ] Add import-duration expectation parity: Home connecting card and Import History running row should both show consistent "progress expectation" copy (for example: `X items found · Xm elapsed · Can take a while`) via shared run-state policy helpers.
