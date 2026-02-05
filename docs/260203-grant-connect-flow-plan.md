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
- Backend-heavy items (signing/relay/deep-link events): Colleague

## Done

- Connect Flow UI (step 1) matches design and routes into `/grant`
- Canonical `/grant` URL params (`sessionId`, `appId`, `scopes`)
- Deep-link normalization to `/connect` with `replace`
- App registry + default app + `/apps/:appId` routing
- App card handoff opens external app in browser
- Mock external app routes (`/rickroll` → `/signin`) with dev loop to `/connect`
- Demo session behavior (registry metadata, scopes override)
- RickRoll connect CTA builds `/grant` URL params
- Minimal tests for URL params, deep links, app routing, grant flow
- Flow doc + architecture link (`docs/260203-grant-connect-flow.md`)
- Step 1 `/connect` route wired to connector run + `/grant` handoff
- Step-2 consent UI ("Allow access to your <data source>") matches design
- Shared data-source label helper across `/connect` + `/grant`
- Web dev mock runs with `auth:dev` + `dev:app` in separate tabs

## Next (Frontend)

- Decide external app base URL for handoff, ie. choose a real, non‑Tauri URL to open when you “Open App” in production. (dev: Vite web origin; prod: not `tauri://`, needs a real web URL or registry value)
- Grant cancel/back behavior: disable cancel CTA for now in the grant mock flow to avoid routing back to `/apps/:appId` (confusing duplicate of `/connect`). Only re-enable after external app URL/back target is defined.
- Step-3: Passport auth if not authenticated (external browser via `start_browser_auth`; this means create & test the src/auth-page app and distribute it with the tauri app binary)
- Step-4: success + return to app
- Reuse grant components where possible (auth-required, consent, success)
- Ensure external Passport sign-in flow is preserved
- UI polish + accessibility pass

## Current app routing note

- `/apps/:appId` renders a host page (e.g. `src/pages/RickRollApp.tsx`) that gates
  access and triggers `/grant`, then renders the app UI from
  `src/apps/<appId>/app.tsx` once connected.
- `/apps/:appId` is an internal app detail/host view, not an external app landing
  page. It should not be the back target for external grant flows.
- App ID design reference: `docs/260205-app-id-design.md`

## External app URL decision (pending)

We can't lock this yet, but the likely direction is storing the external app URL
in the app registry. Options to decide later:

- App registry entry per app (preferred/likely)
- Env base URL + app path convention
- Backend/remote registry lookup

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
