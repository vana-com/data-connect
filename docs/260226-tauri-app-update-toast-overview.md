# 260226: Tauri app update toast overview

## Context

We want users on older desktop builds to see a clear in-app prompt to update.

Current state:

- Connector update checks already exist (startup + silent background behavior).
- Tauri app auto-update plumbing does not exist yet in this repo.
- Release artifacts are published through GitHub release workflow.

This doc defines the product/technical direction in two phases:

- **Phase 1 (ship now):** update notification toast that links users to install latest version.
- **Phase 2 (next):** true in-app Tauri updater (download/install/relaunch).

## Product goal

Give users a reliable, low-friction signal that a newer desktop app version is available, without blocking current work.

## Non-goals

- No forced update.
- No background installer in phase 1.
- No major release process redesign in phase 1.
- No deep redesign of current app shell/UI system for this feature.

## Decision summary

### Phase 1: notify + redirect (fastest shippable)

Behavior:

1. App checks local version vs latest GitHub release version.
2. If a newer version exists, show a persistent **bottom-right toast**.
3. Toast actions:
   - `Update now`: opens latest release/download page.
   - `Later`: dismiss for current session.
4. Optional: `Skip this version` persisted by version key.

Why this first:

- Delivers user value immediately.
- Uses existing release pipeline.
- Avoids updater signing/manifest complexity.

### Phase 2: real Tauri auto-updater

Behavior target:

1. App checks signed update manifest/feed.
2. App downloads update in-app.
3. User installs and relaunches from app prompt.

Additional requirements:

- Updater plugin integration in Rust + config.
- Signing keys and secure distribution configuration.
- Release artifacts/metadata aligned to updater expectations.

## UX surface (phase 1)

Placement:

- Bottom-right toast stack, globally visible (not route-local).

Copy (initial):

- Title: `Update available`
- Body: `DataConnect vX.Y.Z is available.`
- Actions: `Update now` and `Later`

Interaction:

- Non-blocking and dismissible.
- Reappears on next launch if still outdated (unless version skipped).

## Technical shape (phase 1)

Inputs:

- Local version from Tauri app API.
- Remote latest version from GitHub Releases API/tag.

Decision:

- If `remote > local` by semver, show toast.

Failure policy:

- If remote check fails, fail silently (log only).

Refresh cadence:

- One startup check + periodic check while app runs (coarse interval).

## Risks and tradeoffs

Phase 1 tradeoffs:

- User leaves app to update (external flow).
- No guarantee user actually installs update.

Mitigations:

- Keep toast persistent enough to be actionable.
- Re-show on subsequent launches.

Phase 2 risks:

- Signing + update feed misconfiguration can block releases.
- Cross-platform updater behavior requires extra validation.

## Exit criteria

Phase 1 is complete when:

1. Outdated builds show toast consistently.
2. `Update now` reliably opens latest release destination.
3. Dismiss behavior is sane (session-level at minimum).
4. No regressions in app startup or navigation.

Phase 2 is complete when:

1. In-app download/install/relaunch works on supported platforms.
2. Update integrity is verified by signature.
3. CI/release artifacts satisfy updater pipeline constraints.

## Related references

- `docs/260212-github-release-process.md`
- `docs/plans/260226-app-update-toast-phase1-implementation-plan.md`
- `.github/workflows/release.yml`
- `src/hooks/useInitialize.ts`
- `src/hooks/check-connector-updates.ts`
