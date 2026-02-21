# 260221-frontend-date-format-i18n-timezone-plan

Use this template as a one doc in two modes:

- Start with Strategy Lock only.
- Don’t implement until lock is stable.
- Then continue in the same file into Execution Contract.
- If strategy changes later, update Strategy delta section (same file).

## Strategy Lock (decide before implementation)

### Goal

Unify frontend date rendering behind `src/lib/date-format.ts` with explicit locale/timezone policy, while preserving intentional non-timestamp labels (for example weekday-only UI copy like `Last Monday`).

### Scope

- In scope:
  - Frontend TypeScript/TSX in `src/**`.
  - Date/timestamp display callsites currently using `toLocaleDateString`, `toLocaleString`, `toLocaleTimeString`.
  - Incremental migration in phases (policy first, then helpers, then callsites).
  - Tests that lock output shape and timezone semantics for formatter helpers.
- Out of scope:
  - Rust/Tauri serialization (`src-tauri/**`).
  - Playwright connector internals.
  - Backend/source-data timestamp generation contract changes.
  - Broad app localization rollout (this is date formatting policy only).

### Invariants (must remain true)

- Data invariants:
  - Stored run/session/export timestamps remain raw source values (no mutation of persisted data for this plan).
  - Formatter accepts `string | Date` and safely handles invalid values.
- State/lifecycle invariants:
  - Existing user flows remain unchanged (Home, Source, Settings imports/history).
  - UI copy/layout/classes remain unchanged except date text content where intended.
- Security/reliability invariants:
  - No new runtime dependency for date formatting.
  - No timezone guessing from file path/OS metadata; rely on parseable timestamp input + explicit formatter policy.

### Dependencies

| Dependency | Status (`HARD BLOCKED`/`SOFT BLOCKED`/`UNBLOCKED`) | Owner | Target date | Notes |
| ---------- | -------------------------------------------------- | ----- | ----------- | ----- |
| Product decision: display timezone policy (`viewer-local` vs `UTC`) | SOFT BLOCKED | Product + FE | Before Phase 2 | Needed before finalizing helper defaults. |
| Product decision: locale policy (`fixed English` vs `user locale`) | SOFT BLOCKED | Product + FE | Before Phase 2 | Current code is mixed; policy must be explicit. |
| Existing scripts (`npm run lint`, `npm run test`) | UNBLOCKED | FE | Per phase | Verification baseline already present. |

### Approach

- Chosen approach:
  - Phase 1 defines policy + helper API in `src/lib/date-format.ts` without mass callsite edits.
  - Phase 2 migrates only date+time callsites to canonical helper.
  - Phase 3 handles intentional variants (date-only/weekday-only) via explicit named helpers.
  - Phase 4 removes local ad-hoc formatters and closes with scan/test gates.
- Rejected alternatives (and why):
  - Big-bang replace all date renderers in one PR: too risky for interpretation drift and UI regressions.
  - Keep mixed per-component formatting: preserves current inconsistency and timezone ambiguity.
  - Introduce external date library now: unnecessary scope/cost for current requirement.

### Risks and mitigations

- Risk: naive timestamps (no `Z`/offset) render differently across machines.
  - Mitigation: add parse guard helper + explicit fallback label + test coverage for naive vs offset timestamps.
- Risk: `toLocaleDateString` with hour/minute options behaves inconsistently across engines.
  - Mitigation: use `Intl.DateTimeFormat` or helper composition in one place; prohibit inline locale formatting in JSX.
- Risk: accidental rewrite of intentional weekday-only strings.
  - Mitigation: classify each callsite before edit and map each to a named helper in file contract.

### Replan triggers

- Trigger 1: new date-render callsite discovered mid-migration that changes scope beyond `src/**` UI.
- Trigger 2: formatter output cannot be made deterministic in tests across CI/local runtime.
- Trigger 3: same formatter file (`src/lib/date-format.ts`) is revised 3+ times due to unclear policy.

## Execution Contract (mechanical handoff)

### Ordered implementation steps

1. Lock policy in this doc:
   - Decide default locale policy.
   - Decide default timezone policy.
2. Update `src/lib/date-format.ts`:
   - Keep `formatShortWeekdayMonthTime`.
   - Add explicit helper options or wrapper helpers for date-only/weekday-only where needed.
   - Add/adjust tests for invalid timestamps, timezone behavior, and stable shape.
3. Migrate date+time callsites first:
   - `src/pages/source/components/source-preview-card.tsx`.
   - `src/pages/settings/sections/imports/components/run-item/run-item-utils.ts`.
4. Migrate intentional non-date+time callsites to explicit helpers (no ad-hoc inline locale calls):
   - `src/pages/settings/components/settings-credentials.tsx` (date-only).
   - `src/pages/home/components/connected-apps-list.tsx` (weekday+month+day).
   - `src/lib/platform/ui.tsx` (`Last <weekday>` label).
5. Cleanup:
   - Remove dead local formatting helpers.
   - Run verification commands and complete evidence table.

### Mandatory file edit contract

| File | Required change | Status (`PASS`/`NO-OP`/`FAIL`) | Evidence |
| ---- | --------------- | ------------------------------ | -------- |
| `docs/plans/260221-frontend-date-format-i18n-timezone-plan.md` | Lock locale/timezone policy and fill evidence tables | FAIL | Not executed yet |
| `src/lib/date-format.ts` | Centralize formatter policy + helper surface | FAIL | Not executed yet |
| `src/pages/source/components/source-preview-card.tsx` | Replace inline `toLocaleString` with shared helper | FAIL | Not executed yet |
| `src/pages/settings/sections/imports/components/run-item/run-item-utils.ts` | Replace inline `toLocaleDateString` with shared helper | FAIL | Not executed yet |
| `src/pages/settings/components/settings-credentials.tsx` | Replace local date formatter with explicit shared helper | FAIL | Not executed yet |
| `src/pages/home/components/connected-apps-list.tsx` | Replace local date formatter with explicit shared helper | FAIL | Not executed yet |
| `src/lib/platform/ui.tsx` | Replace inline weekday formatting with explicit shared helper | FAIL | Not executed yet |
| `src/pages/settings/sections/imports/components/import-history-row-utils.ts` | Verify existing canonical helper usage remains correct | FAIL | Not executed yet |

Rules:

- `PASS`: required change implemented.
- `NO-OP`: verified no matching change needed at execution time.
- `FAIL`: required change missing/unclear.

### Verification commands

List exact commands (not paraphrases):

```bash
# legacy pattern scan
rg -n "toLocale(DateString|String|TimeString)\\(" src

# formatter/helper usage scan
rg -n "formatShortWeekdayMonthTime|format.*Weekday|format.*Date" src/lib/date-format.ts src/pages src/lib/platform

# build/test checks
npm run lint
npm run test
```

### Gate checklist (all required)

- [ ] Code-path gates passed
- [ ] Behavior/runtime gates passed
- [ ] Build/test/lint gates passed
- [ ] CI/release gates passed (if applicable)
- [ ] Fresh-clone gate passed (if applicable)

### PR evidence table

| Gate | Command/evidence | Expected | Actual summary | Status |
| ---- | ---------------- | -------- | -------------- | ------ |
| Code-path gate | `rg -n "toLocale(DateString|String|TimeString)\\(" src` | No inline locale formatting in migrated callsites | Pending | FAIL |
| Behavior gate | Manual check: Home + Source + Settings timestamps | Correct labels, no copy/layout regressions | Pending | FAIL |
| Build gate | `npm run lint` | No lint errors from touched files | Pending | FAIL |
| Test gate | `npm run test` | Existing + new formatter tests pass | Pending | FAIL |
| CI gate | PR checks | Required checks pass | Pending | FAIL |
| Fresh-clone gate | Optional clean install + `npm run test` | Reproducible formatter behavior | Pending | FAIL |

### Done criteria

1. No `FAIL` rows in file contract or gate table.
2. All required gates are `PASS`.
3. Scope boundaries remained intact (or strategy delta recorded).
4. Locale/timezone policy is explicit in `src/lib/date-format.ts` and reflected in tests.

### Strategy delta (only if needed)

Record any change to goal, invariants, dependency status, or chosen approach after implementation starts.
