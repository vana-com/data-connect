# 260305-personal-server-standalone-page-decision

## Short version (read this first)

### Decision

Yes: extract Personal Server into its own route/page now.

### Why (blunt)

- Personal Server is core product surface (runtime + endpoint), not "preferences".
- Keeping it as a Settings tab hides a primary capability behind a secondary IA bucket.
- Current nav already treats Server as first-class, but route semantics still say "Settings"; that mismatch creates cognitive drag.
- This is a low-to-medium effort move with high clarity payoff.

### What ships in v1 (minimal extraction)

1. Add `ROUTES.personalServer = "/personal-server"`.
2. Add route/page that renders existing `SettingsPersonalServer` UI.
3. Remove Personal Server from Settings section nav and section switch.
4. Update links that point to `settings?section=personalServer` to `/personal-server`.
5. Add back-compat redirect: `/settings?section=personalServer` -> `/personal-server` (replace).
6. Fix tests that assume Personal Server is default Settings section.

### What does NOT ship in v1

- No full Settings architecture rewrite.
- No renaming sweep of all shared components.
- No style/class redesign.

### Risk

- Small routing/test churn.
- Main regression risk is stale deep links; redirect removes that.

### Bottom line

Do the minimal extraction now. Cleanup can be phase 2.

---

## Long version (full argument + execution contract)

## Strategy Lock

### Goal

Make Personal Server a first-class route because it is a core runtime/data surface, while keeping implementation scope tight enough to ship quickly.

### Scope

- In scope:
  - New standalone route/page for Personal Server.
  - Remove Personal Server section from Settings page navigation/content switching.
  - Update internal links and nav to new route.
  - Preserve behavior and visuals of existing Personal Server UI.
  - Add redirect for old settings query URL.
  - Update route and settings tests.
- Out of scope:
  - Rebuild Settings layout system.
  - UI redesign.
  - Broad component renames and code movement not required for extraction.

### Invariants (must remain true)

- Data invariants:
  - Personal Server start/stop/sign-in flows behave exactly as before.
  - Endpoint and data-location actions remain unchanged.
- State/lifecycle invariants:
  - `usePersonalServer` remains the source of runtime state truth.
  - No new runtime ownership introduced in the page component.
- Security/reliability invariants:
  - No change to auth preconditions for start.
  - Legacy deep links continue to function via redirect.

### Approach

- Chosen approach:
  - Minimal extraction first (new route + wiring + redirect + tests).
  - Defer cleanup to optional phase 2.
- Rejected alternatives:
  - Keep everything in Settings because "single surface is simpler".
    - Rejected because it is only codepath-simple, not product-model-simple.
    - IA mismatch remains: top nav says "Server", URL says "Settings".
  - Full refactor in one pass.
    - Rejected because high churn for no immediate user value.

### Replan triggers

- Trigger 1: extraction breaks auth/runtime flow in manual or test verification.
- Trigger 2: additional route constraints discovered in desktop deep-link handling.

## Technical pushback on "single Settings is simpler"

### True part

- One route can be simpler mechanically.

### Missing part

- IA and user intent are not simpler:
  - "I want to check server health/start/endpoint" is operational intent.
  - "I want to adjust preferences" is settings intent.
  - Collapsing these can be simpler in code but noisier in user mental model.

### Practical conclusion

- For this product, Personal Server is not a niche preference panel.
- Treating it as first-class route is justified and aligned with how nav already positions it.

## Execution Contract (minimal extraction)

### Ordered implementation steps

1. Add new route constant and route entry.
2. Create Personal Server page that reuses current Personal Server UI component.
3. Remove Settings section entry and content branch for Personal Server.
4. Update all known links from `buildSettingsUrl({ section: "personalServer" })` to `ROUTES.personalServer`.
5. Add redirect from `?section=personalServer` to new route.
6. Update tests for new default/behavior.

### Mandatory file edit contract

| File | Required change | Status |
| ---- | --------------- | ------ |
| `src/config/routes.ts` | add `personalServer` route | PENDING |
| `src/App.tsx` | register new route/page | PENDING |
| `src/pages/personal-server/index.tsx` | new page composition | PENDING |
| `src/pages/settings/index.tsx` | remove personal-server section branch | PENDING |
| `src/pages/settings/sections.ts` | remove personal-server meta/order | PENDING |
| `src/pages/settings/types.ts` | remove `personalServer` section union | PENDING |
| `src/pages/settings/url.ts` | new default section + optional compatibility handling | PENDING |
| `src/components/navigation/top-nav.tsx` | server nav link -> `ROUTES.personalServer` | PENDING |
| `src/pages/home/components/connected-sources-list.tsx` | onboarding link -> `ROUTES.personalServer` | PENDING |
| `src/pages/settings/index.test.tsx` | adjust default/fallback expectations | PENDING |
| `src/pages/personal-server/index.test.tsx` | add coverage for standalone route/page | PENDING |

### Verification commands

```bash
rg -n "section: \"personalServer\"|\\?section=personalServer|\"personalServer\"" src
pnpm test src/pages/settings/index.test.tsx src/pages/settings/components/settings-personal-server.test.tsx
pnpm test src/pages/personal-server/index.test.tsx
```

### Gates

- [ ] Navigation routes to standalone page
- [ ] Legacy `settings?section=personalServer` lands on standalone page
- [ ] Personal Server actions behave unchanged
- [ ] Updated tests pass

## Recommendation

Approve and execute minimal extraction now, then decide if cleanup phase is worth it after merge.
