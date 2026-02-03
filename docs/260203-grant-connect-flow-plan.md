---
title: Grant + Connect Flow Plan
date: 2026-02-03
---

# Grant + Connect Flow Plan

## Scope

UI + flow orchestration for connect/grant, with backend-heavy items explicitly
tracked and owned separately.

## Ownership

- Frontend/UI + flow orchestration: Callum
- Backend-heavy items (signing/relay/deep-link events): Colleague

## Done

- Canonical `/grant` URL params (`sessionId`, `appId`, `scopes`)
- Deep-link normalization to `/grant` with `replace`
- App registry + default app + `/apps/:appId` routing
- Demo session behavior (registry metadata, scopes override)
- RickRoll connect CTA builds `/grant` URL params
- Minimal tests for URL params, deep links, app routing, grant flow
- Flow doc + architecture link (`docs/260203-grant-connect-flow.md`)

## Next (Frontend)

- Build Connect Flow UI to match design
- Implement step-1 Connect CTA screen (grant flow currently starts at consent)
- Reuse grant components where possible (auth-required, consent, success)
- Ensure external Passport sign-in flow is preserved
- UI polish + accessibility pass

## Current app routing note

- `/apps/:appId` renders a host page (e.g. `src/pages/RickRollApp.tsx`) that gates
  access and triggers `/grant`, then renders the app UI from
  `src/apps/<appId>/app.tsx` once connected.

## Next (Backend-heavy / Colleague)

- Replace mock signature with real Privy signing
- Confirm relay approval path + error handling (real sessions)
- Tauri deep-link event ingestion (not just current URL params)
- Decide persistence source of truth for connected apps (local vs backend)

## Risks / Open Questions

- Whether connected apps should remain local-only or sync with backend
- Exact handoff between Connect Flow UI and Grant Flow states
- How deep-link events are received in desktop context

## Definition of Done (this phase)

- Connect Flow UI matches design and routes into `/grant`
- Grant Flow still works via external Passport sign-in
- All tests pass; no regressions in grant/connect flow
