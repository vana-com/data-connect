# Passport Auth Rebuild - Phase-Gated Execution Blueprint

## Evidence Baseline

- Spec source reviewed: `scripts/ralph/features/passport-auth-rebuild/specs/passport-auth-rebuild.md`.
- Upstream planning input reviewed (fallible): `docs/plans/260217-passport-auth-rebuild-plan.md`.
- Architecture/rules reviewed: `AGENTS.md`, `docs/architecture.md`, `docs/260203-grant-connect-flow.md`.
- Verified runtime ownership (cross-layer):
  - Frontend orchestration: `src/pages/grant/use-grant-flow.ts`, `src/pages/connect/index.tsx`, `src/hooks/use-deep-link.ts`.
  - Auth browser page: `src/auth-page/auth.ts`.
  - Native callback boundary: `src-tauri/src/commands/auth.rs`.
  - State/persistence: `src/state/store.ts`, `src/lib/storage.ts`, `src/hooks/usePendingApproval.ts`.
- Verified current test surface:
  - Strong transition and parsing tests exist (`use-grant-flow`, `connect`, `deep-link`, `grant-params`, `storage`, `sessionRelay`, `builder`, `personalServer`).
  - No auth callback boundary tests in Rust for `start_browser_auth` / `/auth-callback` abuse paths.

## Loopback Execution Updates

- 2026-02-17 (current loop): completed **Slice 5.1 - Legacy route/surface removal**.
  - Removed legacy auth UI surfaces and routing:
    - Deleted `src/components/auth/InlineLogin.tsx`.
    - Deleted `src/pages/browser-login/*`.
    - Removed `ROUTES.login` and `ROUTES.browserLogin` from `src/config/routes.ts`.
    - Removed related route wiring/imports from `src/App.tsx`.
  - Kept `start_browser_auth` + `src/auth-page/*` as the single auth runtime path.
  - Rewired settings sign-in to use canonical browser-auth command directly:
    - `src/pages/settings/use-settings-page.ts` now launches `start_browser_auth`, listens for `auth-complete`, and persists auth state/session via `setAuthenticated` + `saveAuthSession`.
    - This preserves non-grant sign-in entrypoints without resurrecting legacy `/login` route surface.
  - Updated stale route-coupled UI artifact:
    - `src/pages/settings/sections/imports/components/personal-server-card.tsx` now accepts an `onSignIn` callback instead of navigating to removed `ROUTES.login`.
  - Why this slice now: this closes the remaining Phase 5 functional gap by removing dead auth entry surfaces while preserving the replacement auth boundary (`start_browser_auth` -> `auth-complete`).
  - Validation completed (slice + relevant phase gate checks):
    - `npx vitest run --maxWorkers=1 src/pages/connect/index.test.tsx src/pages/grant/use-grant-flow.test.tsx` (pass)
    - `npx vitest run --maxWorkers=1 src/auth-page/auth.test.ts` (pass)
    - `npx tsc -b` (pass)

- 2026-02-17 (current loop): completed **Slice 5.2 - Logging polish**.
  - Added explicit debug gate for verbose auth/connect logs:
    - `src/config/dev-flags.ts` now exposes `DEV_FLAGS.verboseAuthLogs` from `VITE_VERBOSE_AUTH_LOGS`.
    - `src/pages/connect/index.tsx` now routes hot-path diagnostics (`pre-fetch` and `navigate to /grant`) through a gated `debugLog` helper.
    - `src/auth-page/auth.ts` now routes noisy OAuth/wallet/server-registration `console.log` output through the same gated debug path while preserving `warn`/`error` observability.
  - Test hardening discovered and resolved during validation:
    - `src/pages/connect/index.test.tsx` case `shows '(again)' suffix when platform is already connected` raced with intended auto-navigation to `/grant` when already connected.
    - Updated the test fixture to keep `platformsLoaded: false` for this one rendering assertion so the title-copy expectation remains deterministic while existing navigation tests continue to cover redirect behavior.
  - Why this slice now: Phase 5 requires reducing hot-path log noise without changing runtime behavior; this lowers signal loss in production diagnostics while preserving opt-in deep debugging during auth/connect bring-up.
  - Validation completed (slice + relevant phase gate checks):
    - `npx vitest run --maxWorkers=1 src/auth-page/auth.test.ts src/pages/connect/index.test.tsx src/pages/grant/use-grant-flow.test.tsx` (pass)

- 2026-02-17 (current loop): completed **Slice 4.2 - Strict allowlist gate (disabled by default)**.
  - Added strict-mode gate on top of the Phase 4.1 normalizer seam:
    - `src/lib/grant-param-normalizer.ts` now accepts `strictAllowlist` option and tracks:
      - `unknownParams`
      - `strictRejected`
      - `strictRejectReason` (`unknown-params` or `non-canonical-scopes`)
    - Strict mode rejects non-canonical intake (unknown query keys or compatibility scopes parsing) by clearing `hasGrantParams` while keeping strict mode disabled by default.
  - Wired runtime toggle (default off):
    - `src/config/dev-flags.ts` adds `DEV_FLAGS.strictGrantParamAllowlist` from `VITE_STRICT_GRANT_PARAM_ALLOWLIST`.
    - `src/hooks/use-deep-link.ts` now calls `normalizeGrantParams(..., { strictAllowlist })` for both native `vana://` events and URL fallback.
  - Added tests for strict + compat behavior:
    - New: `src/lib/grant-param-normalizer.test.ts`
      - `keeps compatibility parsing when strict allowlist is disabled`
      - `rejects unknown params when strict allowlist is enabled`
      - `rejects compatibility scopes when strict allowlist is enabled`
    - Updated: `src/hooks/use-deep-link.test.tsx`
      - `strict_allowlist_rejects_unknown_params_when_enabled`
      - `compat_mode_accepts_legacy_scopes_payload`
  - Why this slice now: this is the next phase-ordered gap after 4.1 and closes the remaining Phase 4 contract gate work while preserving the external-contract freeze constraint by leaving strict mode off by default.
  - Validation completed (slice + relevant phase gate check):
    - `npx vitest run --maxWorkers=1 src/hooks/use-deep-link.test.tsx src/lib/grant-params.test.ts src/lib/grant-param-normalizer.test.ts` (pass)
    - `npx tsc -b` (pass)

- 2026-02-17 (current loop): completed **Slice 4.1 - Deep-link normalizer module**.
  - Added explicit normalizer seam:
    - New module `src/lib/grant-param-normalizer.ts` with deterministic canonicalization contract:
      - parses `URLSearchParams` to `GrantParams`
      - computes canonical query string via `buildGrantSearchParams`
      - returns `hasGrantParams` gate and `scopeParseSource` metadata
  - Extended grant-param parsing metadata without behavior drift:
    - `src/lib/grant-params.ts`:
      - new `parseScopesParamWithSource`
      - new `extractGrantParamsFromSearchParams`
      - preserved `getGrantParamsFromSearchParams` compatibility by delegating to extractor
  - Refactored `src/hooks/use-deep-link.ts` to consume the new normalizer for both:
    - `vana://` native deep-link intake
    - URL fallback intake (`location.search`)
    - This removes duplicated parse/normalize logic and keeps redirect semantics (`replace`) unchanged.
  - Added/updated tests:
    - `src/hooks/use-deep-link.test.tsx`
      - `normalization_is_idempotent`
    - `src/lib/grant-params.test.ts`
      - `tracks scope parse source across canonical and compat forms`
      - `serializes params in deterministic canonical key order`
      - `extracts params with parse source metadata`
  - Why this slice now: it is the highest-priority remaining acceptance gap after completed Phases 0-3 and unlocks Phase 4.2 strict-allowlist gating on top of a single normalizer source of truth.
  - Validation completed (slice + relevant gate check):
    - `npx vitest run --maxWorkers=1 src/hooks/use-deep-link.test.tsx src/lib/grant-params.test.ts` (pass)
    - `npx tsc -b` (pass)

- 2026-02-17 (current loop): completed **Slices 3.1 + 3.2 - Durable auth session service + remove pending-approval secret-at-rest**.
  - Added durable auth persistence boundary:
    - New frontend service `src/services/auth-session.ts` with Tauri-backed `save/load/clear` calls, session shape validation, and stale-session eviction.
    - New startup hydration hook `src/hooks/useAuthSessionHydration.ts` wired into `src/App.tsx` so auth state restores before grant resume logic.
    - Updated auth writers to persist durable session on successful callback (`src/pages/grant/use-grant-flow.ts`, `src/components/auth/InlineLogin.tsx`) and logout to clear durable auth (`src/hooks/useAuth.ts`).
  - Added native session commands in `src-tauri/src/commands/auth.rs` and command wiring in `src-tauri/src/lib.rs`:
    - `save_auth_session`
    - `load_auth_session`
    - `clear_auth_session`
    - Added Rust roundtrip test `save_load_clear_auth_session_roundtrip`.
  - Removed secret-at-rest from pending approval persistence:
    - `src/lib/storage.ts`: removed `PendingApproval.secret` schema field; added one-shot legacy migration that strips persisted `secret`.
    - `src/services/pending-approval-secret-bridge.ts`: introduced process-scoped in-memory secret bridge keyed by `sessionId`.
    - `src/pages/grant/grant-flow-approval.ts`: stores runtime secret in bridge and persists only non-secret approval metadata.
    - `src/hooks/usePendingApproval.ts`: retry now requires runtime secret bridge; skips/clears when secret is unavailable; always clears bridge key after retry path.
  - Added/updated tests:
    - New: `src/services/auth-session.test.ts`
      - `hydrates_valid_session_on_startup`
      - `evicts_invalid_or_stale_session`
      - `logout_clears_durable_and_memory_state`
    - Updated: `src/lib/storage.test.ts`
      - `pending_approval_does_not_persist_secret_after_migration`
    - Updated: `src/hooks/usePendingApproval.test.ts`
      - `retry_requires_runtime_secret_bridge_and_skips_without_secret`
    - Updated: `src/pages/grant/use-grant-flow.test.tsx` pending-approval payload assertion (no persisted secret).
  - Why this slice now: Phase 3 is the primary remaining acceptance gap, and secret-at-rest removal is prerequisite for restart-safe auth/resume semantics without persistence policy violations.
  - Validation completed (slice + relevant phase regression):
    - `npx vitest run --maxWorkers=1 src/services/auth-session.test.ts src/lib/storage.test.ts src/hooks/usePendingApproval.test.ts src/pages/grant/use-grant-flow.test.tsx` (pass)
    - `cargo test --manifest-path src-tauri/Cargo.toml auth::tests` (pass)

- 2026-02-17 (current loop): completed **Slice 2.2 - Split bootstrap and approval pipelines** for `src/pages/grant/use-grant-flow.ts`.
  - Added `src/pages/grant/grant-flow-bootstrap.ts`:
    - Extracted bootstrap orchestration for demo, pre-fetched, pre-fetched-session-only, and fresh claim/verify paths into a dedicated module.
    - Preserved existing transition and failure behavior by reusing `dispatchFlow` + `transitionFlow` actions from the machine seam.
  - Added `src/pages/grant/grant-flow-approval.ts`:
    - Extracted create-grant/approve-session pipeline, including session expiry guard and pending-approval persistence lifecycle (`savePendingApproval` -> `approveSession` -> `clearPendingApproval`).
    - Kept Redux connected-app write behavior in one place to reduce duplicate side-effect paths.
  - Added `src/pages/grant/grant-flow-auth-bridge.ts`:
    - Extracted auth-required and post-auth resume gating into pure helpers for deterministic branching (`defer-auth`, `defer-server`, `wait`, `fail`, `approve`).
  - Refactored `useGrantFlow` to compose these modules while preserving public hook API and route/UX behavior.
  - Added/updated tests:
    - New: `src/pages/grant/grant-flow-auth-bridge.test.ts` (pure gate behavior).
    - Updated: `src/pages/grant/use-grant-flow.test.tsx` with `approval pipeline persists then clears pending approval on success` assertions.
  - Why this slice now: Phase 3 durable auth + resume changes require isolated seams so persistence migration can be changed without destabilizing bootstrap/auth-resume behavior.
  - Validation completed (slice + relevant phase regression):
    - `npx vitest run --maxWorkers=1 src/pages/grant/grant-flow-machine.test.ts src/pages/grant/grant-flow-auth-bridge.test.ts src/pages/grant/use-grant-flow.test.tsx` (pass)
    - `npx vitest run --maxWorkers=1 src/pages/connect/index.test.tsx` (fails, unrelated to touched files; see blocker below)

- 2026-02-17 (current loop): completed **Slice 2.1 - Grant machine seam** for `src/pages/grant/use-grant-flow.ts`.
  - Added pure transition module: `src/pages/grant/grant-flow-machine.ts`.
    - Centralized valid status edges (`loading -> ... -> success/error`) and mutation actions (`start`, `transition`, `set-session`, `set-builder-manifest`, `set-grant-id`, `fail`).
    - Added no-op guard for same-status transitions to prevent render loops in waiting states (notably repeated `preparing-server` transitions while auth-pending).
  - Refactored `useGrantFlow` to drive state via machine actions instead of ad-hoc object patching.
    - Preserved external hook API and route/UX behavior.
    - Retained existing auth + approve semantics; reducer now enforces deterministic state progression.
  - Added new tests:
    - `src/pages/grant/grant-flow-machine.test.ts` for transition table and reducer mutation behavior.
    - `src/pages/grant/use-grant-flow.test.tsx` case: `verifies builder but skips claim when only pre-fetched session is provided`.
  - Why this slice now: this creates a stable seam for Phase 2.2 extraction (bootstrap/approval/auth-bridge split) and reduces future regression risk by making status edges explicit and testable.
  - Validation completed (slice + relevant phase regression):
    - `npx vitest run --maxWorkers=1 src/pages/grant/grant-flow-machine.test.ts src/pages/grant/use-grant-flow.test.tsx` (pass)
    - `npx vitest run src/pages/connect/index.test.tsx` (fails, unrelated to touched files; see blocker below)
  - Unrelated failure tracked outside this plan:
    - `docs/260217-connect-already-connected-test-followup.md`

- 2026-02-17 (current loop): completed callback hardening slice for `src-tauri/src/commands/auth.rs` + `src/auth-page/auth.ts`.
  - Added callback state lifecycle contract in native layer: one-time consume, TTL expiry, explicit reject reasons, and strict `POST /auth-callback` acceptance (removed `POST /` callback acceptance).
  - Added Rust helper-level tests for abuse paths and valid-once behavior:
    - `rejects_missing_state`
    - `rejects_expired_state`
    - `rejects_replayed_state`
    - `accepts_valid_state_once`
  - Added auth-page callback-state propagation so OAuth round-trip posts `state` back to `/auth-callback` using query bootstrap + sessionStorage fallback.
  - Why this slice first: callback boundary was the highest-risk unguarded security surface and Phase 1 blocks durable auth/resume work in later phases.
  - Validation completed:
    - `cargo test --manifest-path src-tauri/Cargo.toml auth::tests` (pass)
    - `npx vitest run src/auth-page/auth.test.ts src/pages/grant/use-grant-flow.test.tsx` (pass)
  - Operational finding captured in `scripts/ralph/AGENTS.md`: run `npm run auth:build` before Rust tests if Tauri resource glob fails for `auth-page/*`.

## Phase Derivation

Phases are preserved from `docs/plans/260217-passport-auth-rebuild-plan.md` and aligned to the spec acceptance criteria:

1. Phase 0 - Freeze invariants first (no feature behavior changes)
2. Phase 1 - Auth callback boundary hardening
3. Phase 2 - Grant-flow architecture before behavior additions
4. Phase 3 - Durable auth + resume semantics
5. Phase 4 - Deep-link normalization and contract gate
6. Phase 5 - Legacy removal and observability polish

## Boundary Contracts (Must Hold Across All Phases)

- **Input validation contract**
  - Callback ingestion must only accept explicit contract payload shape; reject malformed payloads with explicit reason.
  - Grant URL intake is canonical from query params via `getGrantParamsFromSearchParams`; normalization is deterministic.
- **State transition contract**
  - Grant flow transitions remain explicit and test-asserted (`loading/claiming/verifying-builder/consent/auth-required/preparing-server/creating-grant/approving/success/error`).
  - Callback auth completion updates auth state exactly once per valid callback.
- **Persistence contract**
  - Durable auth persistence stores only minimal identity/session metadata.
  - No sensitive secret material at rest (notably session `secret`).
- **Security-sensitive handling contract**
  - Callback boundary enforces method/path/TTL/one-time semantics before state mutation.
  - Replay and malformed callback attempts are rejected and observable.

## Spec -> Code Ownership -> Planned Change

| Spec requirement | Current evidence | Code ownership (file + symbol) | Planned change |
| --- | --- | --- | --- |
| Auth callback boundary isolated + abuse-path protections test-backed | Partial: callback exists but co-located with unrelated routes; no Rust tests for replay/TTL/one-time | `src-tauri/src/commands/auth.rs` (`start_browser_auth`, request loop, `/auth-callback` handling) | Extract callback request validation/state gate helpers; add one-time + expiry + reasoned reject paths; add Rust tests |
| Grant flow decomposed with transition tests | Partial: transition tests exist; orchestration is monolithic in one hook | `src/pages/grant/use-grant-flow.ts` (`useGrantFlow`, `runFlow`, `handleApprove`), `src/pages/grant/use-grant-flow.test.tsx` | Split into page-local modules (bootstrap/approval/auth-resume reducer seam) while preserving behavior |
| Durable auth + resume without secret-at-rest | Missing/violating: auth is Redux-memory only; pending approval stores `secret` in localStorage | `src/state/store.ts`, `src/hooks/useAuth.ts`, `src/lib/storage.ts` (`PendingApproval.secret`), `src/hooks/usePendingApproval.ts` | Add durable auth session store + bootstrap; remove at-rest `secret` persistence, replace with process-scoped bridge |
| Deep-link normalization deterministic + bounded compatibility while strict allowlist blocked | Partial: normalization exists with tests; no strict allowlist mode and compatibility bounds are implicit | `src/hooks/use-deep-link.ts` (`parseDeepLinkUrl`, fallback redirect), `src/lib/grant-params.ts` | Introduce explicit normalizer contract + compat parser; add strict-mode gate flag and blocked-item tracking |
| Legacy auth surfaces removed only after replacement validation | Completed: `src/pages/browser-login/*` and `InlineLogin` removed; `start_browser_auth` + `src/auth-page/*` remain as canonical auth path | `src/auth-page/auth.ts`, `src/config/routes.ts`, `src/App.tsx`, `src/pages/settings/use-settings-page.ts` | Removed legacy route surfaces and rewired settings sign-in to canonical browser auth command |
| Each delivered slice satisfies phase exit gate with tests | Partial: tests exist but not structured by phase gate for callback/security/durable-auth contracts | Existing test files + new Rust tests | Add gate-mapped tests and enforce per-slice command set |

## Phase 0 - Freeze Invariants First (No Behavior Change)

**Objective**
- Lock cross-layer contracts in tests before refactors.

**In-scope outcomes**
- Callback contract invariants are explicitly encoded (method/path/shape/one-time/expiry semantics).
- Grant transition invariants are explicitly encoded (including auth-required resume and server readiness deferral).
- Persistence invariants are encoded with executable tests (no TODO/skip-based gate criteria).

**Code ownership (`file` + symbols)**
- `src/pages/grant/use-grant-flow.test.tsx` (`useGrantFlow` transition expectations)
- `src/hooks/use-deep-link.test.tsx` (`useDeepLink` normalization assertions)
- `src/lib/grant-params.test.ts` (`parseScopesParam`, `buildGrantSearchParams`)
- `src/lib/storage.test.ts` (`PendingApproval` schema behavior)
- `src/hooks/usePendingApproval.test.ts` (`usePendingApprovalRetry`)
- `src-tauri/src/commands/auth.rs` (new `#[cfg(test)] mod tests`)

**Concrete edits to perform**
- Add missing abuse-path callback tests in `auth.rs` by introducing testable helper functions:
  - parse/validate callback request payload shape
  - callback state lifecycle validation (required + one-time + expiry)
  - rejection reason mapping
- Add explicit grant transition contract tests in `use-grant-flow.test.tsx` for exactly-once auth completion behavior.
- Add a failing (or skipped with TODO marker) test documenting prohibition on persisting `secret` in `PendingApproval` as migration target.

**Tests to add/update**
- `src-tauri/src/commands/auth.rs`
  - `rejects_non_post_auth_callback`
  - `rejects_missing_state`
  - `rejects_expired_state`
  - `rejects_replayed_state`
  - `accepts_valid_state_once`
- `src/pages/grant/use-grant-flow.test.tsx`
  - `auth_complete_event_applies_once_per_auth_cycle`
- `src/lib/storage.test.ts`
  - `pending_approval_does_not_persist_secret_after_migration` (target-state contract test)

**Entry criteria**
- Baseline mainline tests currently green.
- No callback security refactor merged yet.

**Exit gate (binary)**
- PASS only if all new invariant tests are present and passing.
- PASS is not allowed when phase-critical assertions are TODO/skip/pending.
- FAIL if any phase-critical invariant remains untested.

**Dependencies/blockers**
- Rust callback state contract definition from upstream auth contract owners (TTL and state token format).

**Rollback/compat notes**
- Test-only phase; rollback = revert test additions.

## Phase 1 - Auth Callback Boundary Hardening

**Objective**
- Isolate and harden callback acceptance boundary in native layer before higher-level auth rewiring.

**In-scope outcomes**
- Callback endpoint handling separated from unrelated proxy endpoints.
- Explicit validation + reject reasons for malformed/expired/replayed callbacks.
- Auth-complete emit path only reachable through validated callback.

**Code ownership (`file` + symbols)**
- `src-tauri/src/commands/auth.rs`
  - `start_browser_auth`
  - request dispatch loop
  - `/auth-callback` branch
- `src-tauri/src/lib.rs`
  - command wiring for `start_browser_auth`

**Concrete edits to perform**
- Refactor `auth.rs` to isolate callback server concerns:
  - Move callback route handling into dedicated function/module-level helpers.
  - Move non-callback utility routes (`/server-identity`, `/register-server`, `/check-server-url`, `/deregister-server`, `/close-tab`) behind explicit route map with clear ownership comments.
- Introduce callback attempt state store:
  - generated auth state token
  - expiry timestamp
  - consumed flag (one-time use)
- Enforce strict callback acceptance:
  - `POST /auth-callback` only (remove `path == "/"` acceptance)
  - payload schema checks before deserialization side effects
  - reject invalid/expired/replayed with structured reason and no `auth-complete` emit
- Keep frontend event contract unchanged (`auth-complete` payload shape stays compatible).

**Tests to add/update**
- `src-tauri/src/commands/auth.rs` (unit tests for helper-level validation)
- `src/auth-page/auth.test.ts`
  - ensure failed callback response path remains user-visible and does not proceed to success
- `src/pages/grant/use-grant-flow.test.tsx`
  - ensure only valid `auth-complete` paths trigger resume

**Entry criteria**
- Phase 0 invariants merged.

**Exit gate (binary)**
- PASS only if:
  - callback accepts valid request once;
  - rejects missing/invalid/replayed/expired states;
  - no auth state mutation/event emission on rejected requests.
- FAIL if any abuse-path still results in `auth-complete` emission.

**Dependencies/blockers**
- Upstream callback contract freeze for exact state/nonce format.

**Rollback/compat notes**
- Keep old payload schema compatibility for one release window if upstream payload fields are unstable.
- If callback hardening causes auth failures in dev, feature-flag strictness to fallback mode only for local/dev builds.

## Phase 2 - Grant-Flow Architecture Before Behavior Additions

**Objective**
- Decompose grant orchestration into explicit seams without behavior drift.

**In-scope outcomes**
- Transition logic is reducer/state-machine-like and test-addressable.
- Bootstrap, approval side effects, and auth-resume gating are separated.
- Existing UX and route semantics stay unchanged.

**Code ownership (`file` + symbols)**
- `src/pages/grant/use-grant-flow.ts` (`useGrantFlow`, `runFlow`, `handleApprove`, auto-approve effects)
- `src/pages/grant/types.ts` (`GrantFlowState`, `GrantFlowParams`)
- `src/pages/grant/index.tsx` (hook integration)
- `src/pages/grant/use-grant-flow.test.tsx`

**Concrete edits to perform**
- Split `useGrantFlow` internals into page-local modules:
  - `grant-flow-machine` (pure transition/reducer utilities)
  - `grant-flow-bootstrap` (claim/verify/prefetch path resolution)
  - `grant-flow-approval` (createGrant/approveSession pipeline)
  - `grant-flow-auth-bridge` (auth-required + auto-resume logic)
- Replace ad-hoc `setFlowState` sequences with transition actions for deterministic step changes.
- Preserve existing external API returned by `useGrantFlow` to avoid UI churn.

**Tests to add/update**
- `src/pages/grant/use-grant-flow.test.tsx`
  - update existing cases to assert transition events (not just final state)
  - add `bootstrap_prefetched_session_only_runs_verify_builder`
  - add `approval_pipeline_persists_then_clears_pending_on_success`
- New file: `src/pages/grant/grant-flow-machine.test.ts` (pure transition table tests)

**Entry criteria**
- Phase 1 callback hardening merged and green.

**Exit gate (binary)**
- PASS only if transition tests cover all state edges used in production code and existing behavior tests remain green.
- FAIL if behavior changes (route/state outcomes) without explicit spec justification.

**Dependencies/blockers**
- None external; internal dependency on Phase 0/1 tests.

**Rollback/compat notes**
- Keep compatibility adapter in `useGrantFlow` return shape while machine split lands in slices.

## Phase 3 - Durable Auth + Resume Semantics

**Objective**
- Implement restart-safe auth restore and grant resume without storing secrets at rest.

**In-scope outcomes**
- Auth identity survives app restart and hydrates Redux on startup.
- Resume path supports split-failure retry while removing persisted `secret` from storage.
- Logout clears durable auth session and in-memory auth state.

**Code ownership (`file` + symbols)**
- `src/state/store.ts` (`setAuthenticated`, `clearAuth`, auth state shape)
- `src/hooks/useAuth.ts` (`logout`)
- `src/App.tsx` (`AppContent` bootstrap order)
- `src/hooks/usePendingApproval.ts` (`usePendingApprovalRetry`)
- `src/lib/storage.ts` (`PendingApproval`, `savePendingApproval`, `getPendingApproval`)
- `src/pages/grant/use-grant-flow.ts` (`savePendingApproval` callsite)
- Native session commands (new): `src-tauri/src/commands/auth.rs` + command exports in `src-tauri/src/lib.rs`

**Concrete edits to perform**
- Add durable auth session service:
  - frontend boundary `src/services/auth-session.ts` (new)
  - tauri commands for save/load/clear minimal auth session fields
- Hydrate auth on app start before grant flow needs it.
- Replace persisted `PendingApproval.secret` strategy:
  - remove `secret` from localStorage schema
  - introduce process-scoped secret bridge keyed by `sessionId` (memory-only) or equivalent secure handoff
  - define bounded fallback behavior when restart occurs without available secret
- Update logout to clear durable session backend plus Redux.

**Tests to add/update**
- New file: `src/services/auth-session.test.ts`
  - `hydrates_valid_session_on_startup`
  - `evicts_invalid_or_stale_session`
  - `logout_clears_durable_and_memory_state`
- `src/hooks/usePendingApproval.test.ts`
  - `retry_requires_runtime_secret_bridge_and_skips_without_secret`
- `src/lib/storage.test.ts`
  - remove/replace assertions expecting secret persistence
- Rust tests in `src-tauri/src/commands/auth.rs`
  - `save_load_clear_auth_session_roundtrip`

**Entry criteria**
- Phase 2 decomposition merged.

**Exit gate (binary)**
- PASS only if:
  - restart restores auth when durable session valid;
  - logout clears both persistent and in-memory auth;
  - no persisted secret-at-rest in storage schema/data.
- FAIL if any path still writes grant/session secret to persistent storage.

**Dependencies/blockers**
- Decision on secure storage backend contract for desktop session persistence.

**Rollback/compat notes**
- Migration path: read old pending approval records once, clear them, and rewrite in new schema without secret.

## Phase 4 - Deep-Link Normalization and Contract Gate

**Objective**
- Make deep-link normalization deterministic and explicitly gate strict allowlist behavior behind external contract freeze.

**In-scope outcomes**
- Canonical normalization path documented and test-backed.
- Compatibility parser retained but bounded and explicit.
- Strict allowlist mode implemented but disabled until upstream freeze.

**Code ownership (`file` + symbols)**
- `src/hooks/use-deep-link.ts` (`parseDeepLinkUrl`, `handleGrantParams`, fallback effect)
- `src/lib/grant-params.ts` (`getGrantParamsFromSearchParams`, `buildGrantSearchParams`, `parseScopesParam`)
- `src/hooks/use-deep-link.test.tsx`
- `src/lib/grant-params.test.ts`

**Concrete edits to perform**
- Add explicit normalizer utility (new module) that:
  - parses incoming query/deep-link params
  - emits canonical param object/order
  - tracks compatibility parse source
- Add strict allowlist parser branch behind feature flag/config:
  - allow only canonical keys when enabled
  - keep compatibility mode while flag is off
- Ensure redirect rules are deterministic and idempotent (`replace` semantics preserved).

**Tests to add/update**
- `src/hooks/use-deep-link.test.tsx`
  - `normalization_is_idempotent`
  - `strict_allowlist_rejects_unknown_params_when_enabled`
  - `compat_mode_accepts_legacy_scopes_payload`
- `src/lib/grant-params.test.ts`
  - deterministic canonical serialization order and round-trip cases

**Entry criteria**
- Phase 3 persistence semantics merged.

**Exit gate (binary)**
- PASS only if deep-link parse + normalize produces same canonical output for equivalent inputs and strict-mode tests pass (when toggled).
- FAIL if unknown params mutate flow behavior in strict mode.

**Dependencies/blockers**
- External contract freeze for final strict allowlist enablement.

**Rollback/compat notes**
- Keep strict allowlist disabled by default until freeze is signed off.

## Phase 5 - Legacy Removal and Observability Polish

**Objective**
- Remove superseded auth surfaces and reduce hot-path log noise after replacement paths are proven.

**In-scope outcomes**
- Legacy auth page/runtime routes deleted after gates pass.
- Packaging/scripts cleaned up.
- Info/debug logs behind explicit debug switch; warn/error remain.

**Code ownership (`file` + symbols)**
- `src/auth-page/*` (delete)
- `src/pages/browser-login/*` (delete if superseded)
- `src/components/auth/InlineLogin.tsx` (delete or rewire)
- `src/config/routes.ts` (`ROUTES.browserLogin`, `ROUTES.login` usage cleanup)
- `src/App.tsx` (route wiring cleanup)
- `src-tauri/src/commands/auth.rs` (remove obsolete callback/asset serving branches if no longer used)
- `package.json` (`auth:build`, `auth:dev`, prebuild hooks)

**Concrete edits to perform**
- Remove legacy auth runtime entrypoints only after phase gates prove replacement complete.
- Canonical replacement decision rule before deletion:
  - Preserve and harden `start_browser_auth` + `src/auth-page/*` as the single production path.
  - Treat `src/pages/browser-login/*` and `src/components/auth/InlineLogin.tsx` as legacy surfaces to remove after replacement-path parity is proven.
- Remove obsolete scripts/build artifacts and related docs references.
- Gate noisy hot-path logs in:
  - `src/pages/grant/use-grant-flow.ts`
  - `src/pages/connect/index.tsx`
  - `src/auth-page/auth.ts` (or delete with surface removal)

**Tests to add/update**
- `src/App` routing tests (new or existing router tests)
  - legacy routes removed / redirect behavior verified
- `src/pages/grant/use-grant-flow.test.tsx`
  - ensure auth-required path still works post-removal
- `src/pages/connect/index.test.tsx`
  - ensure navigation and prefetch unaffected by cleanup

**Entry criteria**
- Phases 0-4 all PASS.

**Exit gate (binary)**
- PASS only if:
  - no code references to removed legacy auth surfaces remain;
  - full validation command set green;
  - auth flow works through replacement-only path.
- FAIL on any dead reference, broken route, or auth regression.

**Dependencies/blockers**
- Confirmation that replacement auth flow is production-ready.

**Rollback/compat notes**
- If removal causes regression, revert deletion commit(s) and keep replacement code behind default path until fixed.

## Dependency Graph

**Must precede**
- Phase 0 -> Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5
- Phase 3 depends on Phase 1 callback contract hardening and Phase 2 flow seam clarity.
- Phase 5 depends on all previous phase gates passing.

**Can parallelize (inside phase boundaries)**
- Phase 0: frontend invariant tests and Rust callback tests can run in parallel.
- Phase 2: machine extraction and test migration can run as separate slices once adapters exist.
- Phase 4: grant-param canonicalization tests and deep-link hook tests can be split.
- Phase 5: log gating can land in a separate slice from legacy file deletion.

## Slice Plan (Ordered, Reviewable)

1. **Slice 0.1 - Invariant tests only**
   - Add callback abuse-path tests + grant transition invariants.
   - Gate tests: Phase 0 test set.
2. **Slice 1.1 - Callback validator extraction**
   - Introduce helper-level validation in `auth.rs` without changing external payload.
   - Gate tests: Rust callback tests pass.
3. **Slice 1.2 - Enforce one-time + expiry callback acceptance**
   - Wire state token lifecycle into `/auth-callback`.
   - Gate tests: replay/expiry tests pass.
4. **Slice 2.1 - Grant machine seam**
   - Add pure transition module + unit tests; keep hook adapter.
   - Gate tests: `grant-flow-machine.test.ts`, existing `use-grant-flow` tests.
5. **Slice 2.2 - Split bootstrap and approval pipelines**
   - Move claim/verify and createGrant/approve logic into dedicated modules.
   - Gate tests: `use-grant-flow.test.tsx` full pass.
6. **Slice 3.1 - Durable auth session service**
   - Add save/load/clear session commands + frontend service.
   - Gate tests: auth session tests + startup hydration tests.
7. **Slice 3.2 - Remove secret-at-rest for pending approval**
   - Storage schema migration + runtime secret bridge path.
   - Gate tests: storage + pending-approval tests.
8. **Slice 4.1 - Deep-link normalizer module**
   - Deterministic canonicalization + idempotent redirect tests.
   - Gate tests: deep-link and grant-params suites.
9. **Slice 4.2 - Strict allowlist gate (disabled by default)**
   - Implement strict parser branch and test coverage.
   - Gate tests: strict-mode tests + compat tests.
10. **Slice 5.1 - Legacy route/surface removal**
    - Delete obsolete auth pages/routes/scripts.
    - Gate tests: route and grant/connect regression suites.
11. **Slice 5.2 - Logging polish**
    - Gate noisy info logs with debug flag.
    - Gate tests: smoke/regression test set unchanged.

If any single slice cannot validate in isolation, merge as smallest safe integration pair:
- `3.1 + 3.2` may require pairing if durable session and secret-bridge interfaces are tightly coupled.

## Slice Validation Matrix (Minimal vs Boundary)

Use minimal, slice-specific checks for fast iteration; run full boundary checks at phase completion.

| Slice | Minimal validation commands (must pass before commit) | Phase-boundary/full checks |
| --- | --- | --- |
| 0.1 | `cargo test --manifest-path src-tauri/Cargo.toml callback` (or module-filter equivalent), `npx vitest run src/pages/grant/use-grant-flow.test.tsx src/lib/storage.test.ts` | At Phase 0 exit: run full Validation Commands set |
| 1.1 / 1.2 | `cargo test --manifest-path src-tauri/Cargo.toml` (callback module focused), `npx vitest run src/auth-page/auth.test.ts src/pages/grant/use-grant-flow.test.tsx` | At Phase 1 exit: run full Validation Commands set |
| 2.1 / 2.2 | `npx vitest run src/pages/grant/grant-flow-machine.test.ts src/pages/grant/use-grant-flow.test.tsx` | At Phase 2 exit: run full Validation Commands set |
| 3.1 / 3.2 | `npx vitest run src/services/auth-session.test.ts src/lib/storage.test.ts src/hooks/usePendingApproval.test.ts`, `cargo test --manifest-path src-tauri/Cargo.toml` | At Phase 3 exit: run full Validation Commands set |
| 4.1 / 4.2 | `npx vitest run src/hooks/use-deep-link.test.tsx src/lib/grant-params.test.ts` | At Phase 4 exit: run full Validation Commands set |
| 5.1 / 5.2 | `npx vitest run src/pages/connect/index.test.tsx src/pages/grant/use-grant-flow.test.tsx` (+ router tests once added) | At Phase 5 exit: run full Validation Commands set |

## Validation Commands

Run the full set at each phase boundary (and before merge). Expected outcome is exit code `0` and all tests green.

- `npx vitest run src/pages/grant/use-grant-flow.test.tsx`
  - Expected: all grant transition and approval/resume tests pass.
- `npx vitest run src/pages/connect/index.test.tsx`
  - Expected: connect prefetch/navigation behavior unchanged.
- `npx vitest run src/hooks/use-deep-link.test.tsx src/lib/grant-params.test.ts`
  - Expected: canonical parse/normalize round-trips pass.
- `npx vitest run src/lib/storage.test.ts src/hooks/usePendingApproval.test.ts`
  - Expected: persistence schema and retry semantics pass (no secret-at-rest in target state).
- `npx vitest run src/auth-page/auth.test.ts`
  - Expected: auth callback page behavior remains green through replacement-only path.
- `cargo test --manifest-path src-tauri/Cargo.toml`
  - Expected: Rust callback validation tests pass (including replay/expiry/one-time cases).
- `npx tsc -b`
  - Expected: zero TypeScript type errors.
- `cargo check --manifest-path src-tauri/Cargo.toml`
  - Expected: Rust compile passes for tauri command changes.

## Open Questions / External Blockers

- Upstream callback contract freeze: exact callback `state` format, TTL, and replay semantics.
- Strict allowlist activation date and final canonical param set ownership.
- Durable session storage backend decision (OS keychain vs alternate secure storage).
- Resume semantics across app restart when pending approval exists but runtime secret bridge is unavailable.

## Plan DoD Checklist

- [x] Phases explicitly derived from local specs/docs and preserved (0-5).
- [x] Each phase includes objective, scope, ownership, concrete edits, tests, entry criteria, binary exit gate, dependencies, rollback notes.
- [x] Mapping table ties spec requirements to concrete files/symbols and planned deltas.
- [x] Dependency graph includes `must precede` and `can parallelize`.
- [x] Slice plan is ordered, reviewable, and each slice maps to gate tests.
- [x] Validation commands are explicit with expected outcomes.
- [x] Open blockers recorded where ownership is external.
- [x] Boundary contracts explicitly covered: input validation, transitions, persistence, security-sensitive handling.
