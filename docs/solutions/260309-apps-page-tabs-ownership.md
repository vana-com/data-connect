---
tags: [apps-page, home-page, routing, connected-apps, testing]
impact: medium
prevents: "App-hub ownership drift between Home and /apps, plus accidental UX/layout regressions during structural refactors."
---

# 260309-apps-page-tabs-ownership

## Context

`/apps` needed to become the canonical app hub instead of a registry-only page.

Before this change:

- `Home` rendered the connected-apps surface
- `Home` also triggered the connected-app grant fetch
- `/apps` could not own connected-app behavior without depending on `Home` code

Source plan: `docs/plans/260306-apps-page-tabs-plan.md`.

This was primarily a design / ownership / UX improvement, not a user-reported product bug fix. The goal was to make navigation and page responsibility clearer:

- `Home` = sources/imports
- `/apps` = discover and use apps
- `Settings` = manage app access

## Root cause

- Route ownership had drifted.
- The reusable domain hook (`useConnectedApps()`) was fine, but the app-related UI and page orchestration were split across the wrong page boundary.
- The connected-app list and debug helpers lived under `src/pages/home/*`, which encouraged `/apps` to depend on `Home` implementation details.
- The connected-app fetch lifecycle was duplicated instead of being expressed once through a small readiness hook.
- During implementation, there was also a second class of issue: structural refactors can easily disturb spacing, headings, and page rhythm even when the intended change is “just ownership.”

## Final fix

1. Moved fetch ownership to reusable page-ready glue:
   - added `src/hooks/use-load-connected-apps-when-ready.ts`
   - `Settings` now reuses that hook instead of inlining the same effect
   - `/apps` now uses the same hook and owns connected-app loading for the apps page
   - final implementation fetches when the `Connected` tab is active, not eagerly on `/apps` mount
2. Added page-local `/apps` orchestration:
   - added `src/pages/data-apps/use-data-apps-page.ts`
   - normalizes `tab` to `discover|connected`
   - defaults invalid/missing values to `discover`
   - canonicalizes invalid `tab` values back out of the URL
   - preserves unrelated search params on tab changes
   - removes `tab` when switching back to default `discover`
   - owns connected-app debug query-param state for the Connected tab
   - owns app-open capability checks and app-launch behavior for connected apps
3. Made `/apps` the real two-tab page:
   - `src/pages/data-apps/index.tsx` now composes `Discover Apps` and `Connected Apps`
   - `Discover` keeps the existing registry/catalog surface
   - `Connected` renders the moved quick-launch/manage-access surface
   - final implementation uses page-local conditional rendering for the two sections instead of `TabsContent`
   - visible duplicate tab headings were removed; the page keeps an sr-only `h1`
4. Moved connected-app UI ownership out of `Home`:
   - added `src/pages/data-apps/components/connected-apps-list.tsx`
   - added `src/pages/data-apps/connected-apps-ui-debug.ts`
   - added `src/pages/data-apps/connected-apps-ui-debug.test.ts`
   - deleted `src/pages/home/components/connected-apps-list.tsx`
   - deleted `src/pages/home/connected-apps-ui-debug.ts`
5. Simplified `Home` back to sources/imports only:
   - removed the apps tab
   - removed `useConnectedApps()` usage
   - removed connected-app debug controls
   - restored the `Your data` page heading after the apps tab shell was removed
6. Locked behavior with focused tests:
   - `/apps` defaults to `discover`
   - `/apps?tab=connected` renders connected apps on first render
   - invalid tab values fall back to `discover` and canonicalize the URL
   - tab switching preserves unrelated query params
   - `Home` no longer renders the connected-apps tab/surface
   - connected-app debug scenarios resolve deterministically for `/apps?tab=connected`

## Why this approach

- Keeps the domain logic reusable without introducing app-wide startup fetching.
- Matches the repo’s intended route structure: thin `index.tsx`, page-local orchestration hook, UI under the page that owns it.
- Avoids speculative abstractions: one tiny shared readiness hook, one page-local hook, one ownership move.
- Keeps `/apps` and `Settings` intentionally different:
  - `/apps > Connected Apps` = open/use surface
  - `Settings > Connected apps` = revoke/manage surface
- Accepts a small deviation from the original plan: connected-app fetch now waits for the Connected tab instead of running immediately on `/apps` mount.

## Plan deviation

The original plan called for eager fetch on `/apps` mount so the Connected tab would always be warm.

The final implementation changed that to:

- fetch only when `activeTab === "connected"`

Reason for the change during implementation:

- keeps Discover lighter on initial render
- fits the current page-local debugger and connected-tab ownership more cleanly

Trade-off:

- less eager preloading than originally planned
- if strict adherence to the plan is preferred, this is the main behavior difference to revisit

## Validation run

- [ ] `npm run lint`
- [ ] `npm run test`
- [x] `npm test -- src/pages/data-apps/index.test.tsx src/pages/home/index.test.tsx`
- [x] `npm test -- src/pages/data-apps/index.test.tsx src/pages/data-apps/connected-apps-ui-debug.test.ts`
- [x] Targeted IDE lint check on touched files via `ReadLints`

## Reusable rule extracted

If a route becomes the canonical owner of a feature surface, move both the UI surface and its page-level data-loading trigger in the same diff. Do not leave fetch ownership behind on a previously related page.

When URL-backed page state is added, cover three behaviors with non-mocked page tests: param-to-state derivation, invalid-value fallback, and write/remove semantics that preserve unrelated search params.

If a change is intended to be structural/ownership-only, treat spacing, headings, and class rhythm as part of the contract. Do not “clean up” or recompose layout wrappers unless the visual change is intentional and reviewed.

In a tabbed UI, do not repeat the active tab label as a second visible heading directly beneath the tabs. Keep the visible title in the tab label; use an sr-only page heading if semantic structure still needs a route-level `h1`.

When deciding whether two surfaces are “duplicated,” compare the user-facing row functions first, not whether they share a component. In this change the rows were intentionally different:

- `/apps`: open app, route to settings
- `Settings`: inspect scopes, revoke access

## Follow-ups

- If Home later needs an apps preview again, ship it as a separate product decision with clearly reduced scope from the canonical `/apps` page.
- If more than two routes eventually need the same Personal Server readiness fetch pattern, reassess whether the shared loader hook should absorb dedupe logic. For now, keep it small.
- Decide explicitly whether `/apps` should keep connected-app fetch lazy-on-tab or return to the original eager-on-page-mount plan.
- Consider renaming `Settings > Connected apps` to something like `App access` if perceived duplication becomes a UX issue even though the row functions differ.
