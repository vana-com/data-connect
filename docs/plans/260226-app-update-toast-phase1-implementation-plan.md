# 260226 plan: app update toast (phase 1 ship-now)

## Goal and scope

Ship phase 1 update notification in the desktop app:

- Detect when a newer app version exists.
- Show a global bottom-right toast with `Update now` and `Later`.
- Open release/download destination externally from `Update now`.

In scope:

- Frontend check + state + toast UI.
- Lightweight remote version fetch strategy.
- Optional user-triggered `Check for updates` entrypoint in Settings.
- Tests for decision logic and toast behavior.

Out of scope:

- In-app binary download/install.
- Tauri updater plugin integration.
- Release pipeline redesign.

## Execution status update (2026-02-26)

Current snapshot:

- Phase A implemented and validated.
- Phase B implemented and validated (global Sonner toast + Settings manual check action).
- Phase C implemented and validated (dismissed-version persistence + recheck cadence + single-flight guard).
- Phase D in progress (manual runtime smoke evidence capture pending final record).

Solution record:

- See `docs/solutions/260226-app-update-toast-phase1-implementation.md` for implementation decisions, root cause notes, and reusable rules from this ship.

Implemented notes:

- Toast implementation moved to Sonner (`src/components/ui/sonner.tsx`) instead of a custom toast component.
- Dev-only deterministic override path added via `appUpdateScenario` for reproducible manual smoke without live GitHub dependency.

Focused test evidence (latest run):

- `npm run test -- src/hooks/use-app-update.test.tsx src/hooks/app-update/app-update-ui-debug.test.ts src/hooks/app-update/check-app-update.test.ts src/pages/settings/components/settings-about.test.tsx src/pages/settings/index.test.tsx`
- Result: 5 files passed, 26 tests passed.

Post-review patch evidence:

- `npm run test -- src/hooks/use-app-update.test.tsx`
- Result: 1 file passed, 6 tests passed.
- Scope: fixed duplicate debug-trigger checks on initial debug mount and added regression coverage.

Known environment note:

- `npm run lint` currently fails due repository ESLint flat-config migration mismatch (`extends` key), not due this feature’s logic changes.

## Invariants

1. App remains usable while update check runs (non-blocking).
2. Failed update check must not error-block startup.
3. No route-specific coupling; toast is app-shell global.
4. No breaking changes to existing connector update flow.
5. Update action uses shared open helpers, not ad-hoc window logic.
6. Update check must use `corsFetch` (not raw `fetch`) for Tauri-safe networking.
7. Local-version lookup must be safe in test/browser contexts (no unguarded Tauri API access).
8. Automated tests and manual smoke must not depend on live GitHub API responses.

## External dependencies (block status)

| Dependency | Status | Owner | Notes |
|---|---|---|---|
| GitHub Releases API reachable | SOFT BLOCKED | runtime/network | On failure: silent no-toast + log |
| Release tags stay semver-like (`vX.Y.Z`) | SOFT BLOCKED | release process | On invalid tag: ignore update |
| Existing release artifacts remain published | UNBLOCKED | CI workflow | Already handled by release workflow |

## Ordered phases with exit gates

### Phase A: version-check seam and decision policy

Work:

- Add isolated logic for local-vs-remote version comparison.
- Add explicit local version provider:
  - Tauri runtime path: `@tauri-apps/api/app.getVersion()`.
  - Test/browser-safe path: injectable provider or guarded fallback.
- Fetch remote version via `corsFetch` (not raw `fetch`).
- Normalize/parse release tag format and semver compare.
- Release selection policy:
  - Fixed endpoint: `https://api.github.com/repos/vana-com/data-connect/releases/latest`.
  - Use `releases/latest` as the single-source release selector (no client-side list scanning).
  - Defensive guard: if payload marks `prerelease` or `draft`, treat as `unknown` (no toast).
  - Accept only tags matching `^v?\d+\.\d+\.\d+$`; treat others as `unknown`.
- Return deterministic status (`upToDate`, `updateAvailable`, `unknown`).

Exit gate:

- Unit tests prove compare behavior for:
  - equal version
  - remote newer
  - local newer
  - malformed remote version
  - fetch failure
  - Tauri/local-version provider path
  - non-Tauri test/browser-safe version path

### Phase B: global toast integration

Work:

- Add app-shell-level state/hook to run startup check.
- Render bottom-right toast outside route components.
- Implement action handlers (`Update now`, `Later`).
- Add Settings entrypoint to manually trigger update check.

Exit gate:

- Toast appears only when update is available.
- `Update now` opens expected URL.
- `Later` dismisses without side effects.
- Settings `Check for updates` action reuses the same decision path (no duplicate logic).

### Phase C: persistence + cadence hardening

Work:

- Session-dismiss behavior (required).
- Version-based skip behavior (required):
  - Persist dismissed version (`appUpdate.dismissedVersion`) in local storage/store.
  - Suppress toast when `remoteVersion === dismissedVersion`.
  - Clear suppression when a different newer `remoteVersion` is observed.
- Add coarse periodic recheck interval while app remains open (default: 6h, with single-flight guard).

Exit gate:

- Dismissed toast does not immediately reappear in same session.
- Dismissed version does not re-toast across app restart for the same remote version.
- New remote version re-enables toast even if previous version was dismissed.
- Recheck does not spam duplicate toasts.

### Phase D: final verification

Work:

- Run targeted tests and static checks.
- Validate manual behavior in Tauri dev app.
- Record evidence table.

Exit gate:

- All required gates marked `PASS` with command/runtime evidence.

## Mandatory File Edit Contract

Planned target files:

| File | Intent | Status |
|---|---|---|
| `src/hooks/useInitialize.ts` | add/trigger app update check without blocking existing init | NO-OP (check moved to app-shell `AppUpdateProvider`) |
| `src/App.tsx` | mount global toast surface at app-shell level | PASS |
| `src/lib/open-resource.ts` | reuse existing open helper for release URL action (likely NO-OP) | NO-OP (reused `openExternalUrl` without edits) |
| `src/lib/cors-fetch.ts` | reuse Tauri-safe fetch path for GitHub release lookup (likely NO-OP) | NO-OP (reused via hook, no edits) |
| `src/pages/settings/use-settings-page.ts` | manual `Check for updates` trigger wiring | PASS |
| `src/hooks/*app-update*` (new) | version-check + lifecycle hook | PASS |
| `src/components/*app-update*` (new) | toast UI surface | PASS (`src/components/ui/sonner.tsx`) |
| `src/**/*.test.ts(x)` (new/updated) | behavior and decision tests | PASS |

Execution-time status semantics:

- `PASS`: changed and validated.
- `NO-OP`: intentionally unchanged with proof (scan/evidence).
- `FAIL`: required change missing or incorrect.

## Non-negotiable verification commands

Use these exact checks during execution:

1. Target-file presence and wiring
   - `rg -n "update available|Update now|Later|check for updates|app update|release" src`
   - `rg -n "useInitialize|AppContent|openExternalUrl|corsFetch" src/App.tsx src/hooks/useInitialize.ts src/lib/open-resource.ts src/lib/cors-fetch.ts`
2. Tests
   - Run focused vitest paths for new update-check logic and toast behavior (including runtime-branch tests).
   - All tests must stub remote version responses; no live GitHub API calls.
   - Document exact commands used.
3. Build/lint confidence
   - `npm run lint`
   - `npm run test` (optional full sweep if needed for CI confidence)
4. Runtime behavior smoke (manual in Tauri dev)
   - launch `npm run tauri:dev`
   - run against deterministic mocked newer-version response (local stub endpoint or injected provider), not live GitHub
   - verify once for same-version dismiss persistence and once for new-version re-appearance

Expected outcomes:

- No failing tests/lint introduced by this feature.
- Manual check confirms toast appears/disappears and action routing.
- Manual smoke is reproducible without external network variability.

## Evidence capture template for PR

Fill this table during implementation:

| Gate class | Gate | Evidence | Status |
|---|---|---|---|
| Code-path | File contract rows resolved to PASS/NO-OP/FAIL | `AppUpdateProvider mounted in app shell; settings trigger wired; debug override path added` | PASS |
| Behavior | Toast appears only when remote newer | `check-app-update + use-app-update tests validate updateAvailable gating; manual debug scenario confirms visibility` | PASS |
| Behavior | `Update now` opens release URL | `use-app-update.test.tsx verifies action invokes openExternalUrl(releaseUrl)` | PASS |
| Behavior | `Later` dismisses in-session | `use-app-update.test.tsx verifies dismiss + same-version suppression` | PASS |
| Build | test suite outcome | `Focused vitest run: 5 files / 26 tests passed` | PASS |
| Build | lint outcome | `Repository-level flat-config migration error unrelated to feature changes` | NO-OP (repo baseline issue) |
| Packaging | no release workflow changes for phase 1 | `No release workflow file edits in this implementation` | PASS |

## Done criteria (merge-blocking)

All must be true:

1. No `FAIL` rows in file contract or evidence table.
2. Required gate classes (`Code-path`, `Behavior`, `Build`) are `PASS`.
3. Any `NO-OP` row has explicit scan proof.
4. Manual runtime smoke recorded for toast/action flow.
5. Scope remains phase-1 only (no hidden phase-2 partials).

## Risks and mitigations

1. **GitHub API rate/availability issues**
   - Mitigation: fail soft, no user-facing error toast for check failure.
2. **Semver/tag parsing drift**
   - Mitigation: strict stable-release policy + parser + tests; ignore invalid tags.
3. **Toast duplication/noise**
   - Mitigation: single active update toast + dismiss guard.
4. **Unclear update destination across platforms**
   - Mitigation: start with release page URL; refine to platform-specific asset later.

## Replan triggers

Stop and replan if:

- We discover required `src-tauri` updater plugin/config changes for phase 1.
- App-shell integration causes broad routing/layout churn.
- Toast architecture requires introducing a new UI framework dependency.
- Same core file is rewritten 3+ times during implementation.

## Phase 2 handoff stub (not part of this implementation)

Phase 2 should introduce:

- Tauri updater plugin setup in Rust/config.
- Signed update manifest/feed path.
- In-app download/install/relaunch UX.
- CI/release changes validated under packaging and CI gate classes.
