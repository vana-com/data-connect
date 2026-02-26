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

## Invariants

1. App remains usable while update check runs (non-blocking).
2. Failed update check must not error-block startup.
3. No route-specific coupling; toast is app-shell global.
4. No breaking changes to existing connector update flow.
5. Update action uses shared open helpers, not ad-hoc window logic.
6. Update check must use `corsFetch` (not raw `fetch`) for Tauri-safe networking.
7. Local-version lookup must be safe in test/browser contexts (no unguarded Tauri API access).

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
  - Prefer stable latest release endpoint (`/releases/latest`).
  - Ignore prerelease/draft payloads if encountered.
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
- Optional version-based skip behavior (if included in scope).
- Add coarse periodic recheck interval while app remains open.

Exit gate:

- Dismissed toast does not immediately reappear in same session.
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
| `src/hooks/useInitialize.ts` | add/trigger app update check without blocking existing init | PENDING |
| `src/App.tsx` | mount global toast surface at app-shell level | PENDING |
| `src/lib/open-resource.ts` | reuse existing open helper for release URL action (likely NO-OP) | PENDING |
| `src/lib/cors-fetch.ts` | reuse Tauri-safe fetch path for GitHub release lookup (likely NO-OP) | PENDING |
| `src/pages/settings/use-settings-page.ts` | manual `Check for updates` trigger wiring | PENDING |
| `src/hooks/*app-update*` (new) | version-check + lifecycle hook | PENDING |
| `src/components/*app-update*` (new) | toast UI surface | PENDING |
| `src/**/*.test.ts(x)` (new/updated) | behavior and decision tests | PENDING |

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
   - Document exact commands used.
3. Build/lint confidence
   - `npm run lint`
   - `npm run test` (optional full sweep if needed for CI confidence)
4. Runtime behavior smoke (manual in Tauri dev)
   - launch `npm run tauri:dev`
   - verify update toast behavior under mocked newer-version response

Expected outcomes:

- No failing tests/lint introduced by this feature.
- Manual check confirms toast appears/disappears and action routing.

## Evidence capture template for PR

Fill this table during implementation:

| Gate class | Gate | Evidence | Status |
|---|---|---|---|
| Code-path | File contract rows resolved to PASS/NO-OP/FAIL | `<diff + notes>` | PENDING |
| Behavior | Toast appears only when remote newer | `<test name + manual note>` | PENDING |
| Behavior | `Update now` opens release URL | `<test/manual note>` | PENDING |
| Behavior | `Later` dismisses in-session | `<test/manual note>` | PENDING |
| Build | test suite outcome | `<command + summary>` | PENDING |
| Build | lint outcome | `<command + summary>` | PENDING |
| Packaging | no release workflow changes for phase 1 | `<diff proof>` | PENDING |

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
