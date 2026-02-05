# Mock Apps (Dev Only)

This folder contains mock external apps used to validate the Data Apps handoff
and deep-link flow during development. These pages simulate a third‑party web
app that opens in the user's browser and then deep‑links back into DataBridge.

Important:

- Dev-only. Do not ship or rely on these pages in production.
- The mock app is intentionally minimal; it exists to exercise the handoff flow.

Current mock:

- RickRoll mock app (external web flow):
  `http://localhost:5173/rickroll` → `http://localhost:5173/signin`
  → in dev, Launch Data Connect routes to
  `http://localhost:5173/connect?sessionId&appId&scopes`
  (prod/installed app uses `dataconnect://?sessionId&appId&scopes`)
- RickRoll host page (in‑app shell):
  `http://localhost:5173/apps/rickroll`
  - If `external=1` is added, the Connect button deep‑links to `dataconnect://`
    instead of navigating to `/grant`. This flag is not used by the mock flow.

Usage:

- Open from Data Apps to verify external browser handoff.
- Use query params (`sessionId`, `appId`, `scopes`) to confirm deep-link inputs.

Why "Launch Data Connect" may do nothing right now (non‑dev):

- The `dataconnect://` scheme is an OS‑level protocol. If the DataBridge desktop
  app isn't registered as the handler (installed / running with deep‑link
  registration), the browser has nowhere to send the link.
- Even when the OS passes the deep link to Tauri, the frontend currently only
  reads URL search params (`/connect?...`). The native deep‑link event ingestion
  is still a backend task, so the app won't route from the deep‑link event yet.
- If you open `/rickroll` directly (no params), the deep link is just
  `dataconnect://` with no `sessionId/appId/scopes`, so it cannot start a flow.

Workaround for now:

- Copy the query params from the mock app and open
  `http://localhost:5173/connect?sessionId=...&appId=...&scopes=...` manually.
