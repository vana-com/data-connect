---
title: Grant + Connect Flow Plan
date: 2026-02-03
---

# Grant + Connect Flow Plan

## Scope

UI + flow orchestration for connect/grant, with backend-heavy items explicitly
tracked and owned separately. Includes step 1 data-source login + scrape.

## Ownership

- Frontend/UI + flow orchestration: Callum
- Backend-heavy items (signing/relay/deep-link events): Volod

## Done

- Connect Flow UI (step 1) matches design and routes into `/grant`
- Canonical `/grant` URL params (`sessionId`, `appId`, `scopes`)
- Deep-link normalization to `/connect` with `replace`
- App registry + default app + external app handoff
- App card handoff opens external app in browser
- Mock external app routes (`/rickroll` → `/signin`) with dev loop to `/connect`
- Mock app handoff is opt-in via `VITE_USE_RICKROLL_MOCK`; mock sign-in deep-links
  back to `/connect` in dev/localhost (`dataconnect://` in prod).
- Demo session behavior (registry metadata, scopes override)
- RickRoll connect CTA builds `/grant` URL params
- Minimal tests for URL params, deep links, app routing, grant flow
- Flow doc + architecture link (`docs/260203-grant-connect-flow.md`)
- Step 1 `/connect` route wired to connector run + `/grant` handoff
- Step-2 consent UI ("Allow access to your <data source>") matches design
- Shared data-source label helper across `/connect` + `/grant`
- Web dev mock runs with `auth:dev` + `dev:app` in separate tabs

## TODO (Frontend)

- Decide external app URL per app for handoff, stored in the app registry (no single base URL). (dev: Vite web origin; prod: real web URLs, not `tauri://`)
- Step-3: Passport auth if not authenticated (external browser via `start_browser_auth`; this means create & test the src/auth-page app and distribute it with the tauri app binary)
- Step-4: success + return to app
- Reuse grant components where possible (auth-required, consent, success)
- Ensure external Passport sign-in flow is preserved
- UI polish + accessibility pass
- Step 3/4 plan refs: `docs/260206-grant-step3-plan.md`, `docs/260206-grant-step4-plan.md` (includes `status=success` deep-link)

## External app routing note

- Data apps always open an external web URL in the user's browser.
- Grant cancel/back routes to `/apps`.
- There is no `/apps/:appId` in-app host route and design says there are no plans for one.
- RickRoll (`/rickroll`) is the only mock external app in dev.
- App ID design reference: `docs/260205-app-id-design.md`

## External app URLs (current)

- External app URLs are required per app (registry/fixtures), no shared base URL.

## Next (Backend-heavy / Colleague)

- Replace mock signature with real Privy signing
- Confirm relay approval path + error handling (real sessions)
- Tauri deep-link event ingestion (not just current URL params)
- Decide persistence source of truth for connected apps (local vs backend)

## Risks / Open Questions

- Whether connected apps should remain local-only or sync with backend
- Exact handoff between data-source scrape completion and grant flow states
- How deep-link events are received in desktop context
- Where connector-run completion state is stored (local storage vs backend)

## Definition of Done (this phase)

- Connect Flow UI matches design and routes into `/grant`
- Grant Flow still works via external Passport sign-in
- All tests pass; no regressions in grant/connect flow
