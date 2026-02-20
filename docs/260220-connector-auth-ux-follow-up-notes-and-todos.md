# Connector Auth UX — Follow-up Notes + To-Dos

This document is a follow-up thinking note.  
It is not a full implementation plan and not a finalized solution.

## Clarifications from discussion

### 1) Browser-session model is still the right default

- Keep connector auth browser-session based.
- Continue to prefer user-completed login in a real browser context.
- Optimize around session reuse and recovery, not raw credential collection.

### 2) "Can first interactive login be replaced?"

Sometimes yes, not universally.

- Current runner can import cookies from the user's system Chrome profile into connector profile state on first run.
- If cookies are valid and sufficient for that connector, first-run interactive login can be skipped.
- If not, interactive login is still needed.

So "first login is always required" is not strictly true in code, but may still be true in many practical cases depending on connector/site state.

### 3) Runtime surfaces vs route logic

- Route logic connect -> grant looks straightforward in current implementation.
- "Runtime surface switching" concern is about user cognitive flow across app surface + connector browser + auth browser (when auth-required occurs), not about routing correctness.
- If your users are already authenticated, that specific auth-browser switch often disappears.

## Key takeaway lines (banner)

- If most runs remain headless and only fail into precise recovery prompts, perceived friction drops dramatically.
- A central session control surface (inspect + repair + explain) likely outperforms hidden magic.

## What "precise recovery prompts" means in practice

When a run fails auth/session checks, do not show generic "failed" copy.  
Show:

- What failed (normalized reason category)
- Why it likely failed (short plain explanation)
- One best next action (single primary CTA)

Example reason categories (connector-facing, not user-hostile):

- `SESSION_EXPIRED`
- `MFA_OR_CHALLENGE_REQUIRED`
- `CHECKPOINT_OR_SUSPICIOUS_LOGIN`
- `PROFILE_COOKIE_MISSING`
- `CONNECTOR_AUTH_SELECTOR_CHANGED`
- `NETWORK_OR_TIMEOUT`

## Central session control surface (concrete shape)

Single place in Settings (or a shared sheet) with per-connector rows:

- Current session health: `Healthy`, `Needs Attention`, `Unknown`
- Last successful headless run
- Last interactive login completion
- Last failure reason (if any)
- Actions:
  - `Verify session`
  - `Repair from Chrome session` (when applicable)
  - `Open interactive repair`
  - `Clear session` (already exists)

Goal: "inspect + repair + explain" in one place.

## Near-term to-dos (actionable soon)

1. Define and implement a normalized connector auth error taxonomy.
2. Upgrade connect/grant copy to show reason-specific recovery prompts instead of generic errors.
3. Add preflight session validation before launching interactive connector browser.
4. Add a "repair" action that retries cookie/session bootstrap before forcing manual login.
5. Extend settings credentials UI from storage listing to session health + repair actions.
6. Capture dogfood metrics for session reuse and recovery (see below).

## Dogfood metrics questions (early instrumentation)

These questions should drive initial instrumentation and review:

1. What % of runs stay fully headless per connector?
2. What % require interactive login, and why (reason category)?
3. Of interactive-requiring runs, what % recover in one guided attempt?
4. Time-to-success from first run start to successful data export (P50/P90) by connector.
5. How often do users clear session as first move vs use guided repair?

Suggested minimal event fields:

- `connector_id`
- `run_id`
- `auth_mode_used` (`headless_only` | `interactive_required`)
- `auth_failure_reason`
- `recovery_action`
- `recovery_success`
- `time_to_success_ms`

## Next best question

What exact auth failure taxonomy should we implement first so it powers both precise prompts and dogfood metrics without overfitting?

## Known technical constraints to keep in mind

- Cookie import currently uses a one-time marker (`.cookies-imported`), which may limit auto-healing after first setup.
- Bootstrap source profile selection relies on Chrome profile heuristics (`last_used`/`Default`).
- Behavior differs when system Chrome path is not used.

These constraints are not blockers; they are likely first dogfood tuning targets.

## References

- `playwright-runner/index.cjs`
- `src/pages/connect/index.tsx`
- `src/pages/grant/index.tsx`
- `src/pages/grant/use-grant-flow.ts`
- `src/pages/grant/use-grant-flow.test.tsx`
- `src/pages/settings/components/settings-credentials.tsx`
- `docs/260220-connector-auth-ux-thinking.md`

