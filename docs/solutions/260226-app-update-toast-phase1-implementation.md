---
tags: [app-update, toast, settings, tauri, testing]
impact: medium
prevents: "Duplicate update-check triggers in debug mode and regressions in update-toast behavior"
---

# 260226-app-update-toast-phase1-implementation

## Context

Phase 1 shipped app-update detection and user notification in DataConnect desktop:

- startup/background update check
- global toast with `Update now` + `Later`
- Settings action to manually re-check and bypass prior same-version dismissal
- deterministic DEV debug scenarios (`appUpdateScenario`) for smoke checks

Source plan: `docs/plans/260226-app-update-toast-phase1-implementation-plan.md`.

## Root cause

Two key implementation concerns had to be resolved:

1. **Update decision reliability across runtimes**
   - Tauri version lookup and GitHub release lookup needed to stay test-safe and fail-soft.
2. **Debug-mode duplicate trigger path**
   - `checkForUpdates()` could run twice on initial render in debug-scenario mode due to overlapping effects (mount effect + search-driven effect).

## Final fix

1. Added isolated decision logic:
   - `src/hooks/app-update/check-app-update.ts`
   - strict semver normalization/comparison
   - safe unknown-state fallback on network/parsing/runtime edge cases
2. Added provider-driven app-shell integration:
   - `src/hooks/use-app-update.tsx`
   - `src/App.tsx` mounts `AppUpdateProvider` and `Toaster`
3. Added toast surface + actions:
   - `src/components/ui/sonner.tsx`
   - action routes to `openExternalUrl`
   - cancel persists dismissed version and suppresses same-version repeats
4. Added manual and deterministic debug entry points:
   - Settings trigger wired through `use-settings-page`
   - DEV-only URL scenario resolver in `app-update-ui-debug.ts`
5. Post-review hardening:
   - gated the search-driven debug effect to skip initial pass
   - prevents duplicate initial debug-trigger checks while preserving URL-change rechecks
   - added regression test for single-toast behavior at initial debug mount

## Why this approach

- Keeps update behavior centralized in one provider/hook instead of scattering route-specific logic.
- Uses existing shared helpers (`corsFetch`, `openExternalUrl`) to align with runtime-safe app conventions.
- Makes manual verification deterministic without relying on live GitHub responses.
- Uses targeted tests to lock behavior at the hook boundary where lifecycle/side-effect logic lives.

## Validation run

- [ ] `npm run lint` (repo baseline still failing due flat-config migration mismatch)
- [ ] `npm run test` (full suite not re-run in this follow-up)
- [x] `npm run test -- src/hooks/use-app-update.test.tsx`
- [x] Prior focused app-update suite run from plan evidence (5 files / 26 tests)
- [ ] Targeted runtime/manual checks (Phase D still marked in progress in plan)

## Reusable rule extracted

For provider hooks that execute startup effects and URL-driven effects, explicitly guard first-run behavior so debug/search effects do not duplicate startup execution paths.

When the behavior is user-visible (toasts, dialogs, navigation), add a regression test that verifies call count semantics, not only final UI text.

### AGENTS.md decision

No immediate AGENTS.md update.

Reason: this is a strong local pattern for app-update lifecycle logic; promote to global guidance if repeated in other provider-based feature hooks.

## Follow-ups

- Resolve optional prop clarity for `onCheckAppUpdate` in `SettingsAbout` (or make required by contract).
- Add a dedicated test for non-DEV behavior in `app-update-ui-debug` so query params cannot accidentally activate debug flow outside DEV.
- Complete final Phase D runtime smoke evidence capture in the plan.
