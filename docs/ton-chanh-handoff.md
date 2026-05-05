# account.vana.org web porting — handoff for Ton-Chanh

## What this is about

We're demoing Vana's data portability flow to a partner on Tuesday. The flow:

1. **3PA** (third-party app, e.g. "Ad Insights") redirects user to account.vana.org
2. **account.vana.org** authenticates user, shows grant consent, user approves
3. **Embrowse** (browser-based scraper) opens as a popup, scrapes user's Instagram data
4. Embrowse **POSTs scraped data** to user's Personal Server via its tunnel URL
5. **3PA reads the data** from the Personal Server and renders it

Steps 1-2 already work. Step 3 is the new piece that needs to live on account.vana.org. Steps 4-5 are built and tested (data-connect PR #85, vana-connect PR #54).

## Architecture you need to know

| Piece | Repo | Framework | Deployed to |
|-------|------|-----------|-------------|
| **account.vana.org** | `vana-connect/connect/` | Next.js 16 (App Router) | Vercel |
| **DataConnect desktop** | `data-connect/` | Vite + Tauri (React 19) | Local install |
| **Personal Server** | `personal-server-ts/` | Hono.js | Sprites.dev (Volod) or local sidecar |
| **Embrowse** | Kahtaf is building | Standalone HTML/JS | Served as static file |
| **3PA example** | `vana-connect/examples/nextjs-starter/` | Next.js | Vercel preview |

Both DataConnect and account.vana.org use React 19, Radix UI, shadcn/ui, Tailwind, lucide-react — same design system, separate codebases.

The embrowse postMessage protocol is already built and tested. It's modeled after Plaid Link / Stripe Elements: parent sends config, child reports lifecycle events. See the [protocol spec PR](https://github.com/vana-com/data-connect/pull/85).

## Existing code to understand

**account.vana.org app structure** (`vana-connect/connect/src/app/`):
- `routes.ts` — current routes: `/`, `/connect`, `/login`, `/admin`, `/download-data-connect`
- `(handoff)/connect/` — the grant consent flow (this is where the user lands from the 3PA)
  - `use-connect-page.ts` — orchestrates the connect flow (session polling, grant approval)
  - `connect-page-client.tsx` — the UI
- `_auth/` — Privy auth wrappers
- `api/sign` — server-side signing oracle

**Embrowse protocol** (copy from `data-connect/`, framework-agnostic):
- `src/lib/embrowse-protocol.ts` — postMessage types + `connectEmbrowse()` helper
- `public/mock-embrowse.html` — mock that simulates scraping Instagram data
- `src/pages/embrowse/use-embrowse-page.ts` — React hook wiring protocol to component state

**How the protocol works:**
```
Parent (account.vana.org)              Embrowse (popup)
         │                                    │
         │  ◄── embrowse:ready ──────────────│  (popup loaded)
         │                                    │
         │──── embrowse:init ──────────────► │  (sends platform, scopes, PS URL)
         │                                    │
         │  ◄── embrowse:progress ───────────│  (status updates)
         │  ◄── embrowse:progress ───────────│
         │                                    │
         │     (Embrowse POSTs data to PS)    │
         │                                    │
         │  ◄── embrowse:complete ───────────│  (done, lists ingested scopes)
```

## Background reading

These docs explain the broader architecture and where this work fits:

| Doc | What it covers |
|-----|---------------|
| [Web-only experience spec](https://github.com/vana-com/vana-product-interrogator/pull/8/files) | The full plan for porting DataConnect UI to account.vana.org. Sections on codebase mapping (5 repos), build targets, shared UI strategy. **Read the "Codebase Changes" section.** |
| [UI refactoring plan](https://github.com/vana-com/vana-product-interrogator/blob/main/mobile-dp/260306-web-only-ui-refactoring-plan.md) | What UI can be shared between desktop and web, and how. |
| [Data ingestion gaps](https://github.com/vana-com/data-connect/blob/feat/embrowse-demo/docs/embrowse-data-ingestion-gaps.md) | Two open gaps: PS write auth and the embrowse↔parent protocol (protocol is now built). |
| [Protocol spec](https://github.com/vana-com/data-connect/blob/main/docs/260121-data-portability-protocol-spec.md) | Full data portability protocol. Sections on Personal Server endpoints, grant flow, session relay. |
| [Architecture doc](https://github.com/vana-com/data-connect/blob/main/docs/architecture.md) | DataConnect architecture overview. |

## Priority order — what to build

### P0 — Must have for Tuesday

**1. Embrowse popup integration on account.vana.org**

After the user approves a grant on account.vana.org, open the Embrowse mock as a **popup** (not iframe — Safari doesn't support `credentialless` attribute).

**What to do:**
1. Copy `embrowse-protocol.ts` into `vana-connect/connect/src/app/_lib/` (it's pure TypeScript, no framework deps)
2. Copy `mock-embrowse.html` into `vana-connect/connect/public/` (static file, served as-is)
3. Adapt `use-embrowse-page.ts` for Next.js (it's a React hook — mainly just update the import path for the protocol)
4. Wire it into the connect flow: after grant approval in `(handoff)/connect/`, open the popup and listen for completion
5. On `embrowse:complete`, show a success state

**The init message to send:**
```json
{
  "type": "embrowse:init",
  "platform": "instagram",
  "scopes": ["instagram.ads", "instagram.profile"],
  "serverUrl": "<PS tunnel URL>"
}
```

**Where does the PS tunnel URL come from?** For the demo, hardcode it or pass as a query param. Long-term, account.vana.org can look it up via the gateway by wallet address (the PS registers itself on startup).

**Testing:** Open popup → mock shows "Ready — waiting for init config..." → parent sends init → click "Simulate scrape" → mock POSTs to PS → popup sends `embrowse:complete` → parent shows success.

### P1 — Demo polish (if time allows)

**2. "Data connected" confirmation view**

After embrowse completes, show what data was imported. Something like:

> Instagram connected
> - Ad interests (7 topics, 8 advertisers)
> - Profile (demo_user)

This doesn't need to be a full page — just a success state after the embrowse popup closes. The `embrowse:complete` message includes which scopes were ingested.

**3. Connected apps view**

Show which 3PAs have been granted access. The PS exposes `GET /v1/grants` which returns a list of active grants. For the demo, a simple list showing the app name and granted scopes would suffice.

Desktop reference: `data-connect/src/pages/data-apps/index.tsx`

### P2 — Skip for Tuesday

- Import history, Personal Server status display, settings — these are desktop power-user features, not needed for the partner demo.

## PRs and branches

| Repo | Branch | PR | What's in it |
|------|--------|----|-------------|
| data-connect | `feat/embrowse-demo` | [#85](https://github.com/vana-com/data-connect/pull/85) | Embrowse page, protocol, mock HTML, cloud-server infra |
| vana-connect | `demo/instagram-ad-interests` | [#54](https://github.com/vana-com/vana-connect/pull/54) | 3PA example with Instagram ad interests cards |

## Blockers / things others are handling

- **PS tunnel URL discovery**: Hardcode for demo. Volod or gateway team for production lookup.
- **PS data write auth**: `POST /v1/data/{scope}` has no auth today — works on localhost, returns 401 over tunnel. Volod is aware and working on it. For demo, either use localhost PS or Volod ships auth.
- **Real Embrowse**: Kahtaf is building the real scraper. The mock is a drop-in placeholder — same postMessage protocol, just simulates the scraping.

## Quick-start

```bash
# Look at the existing connect flow to understand where embrowse hooks in
cd ~/code/vana-connect/connect
cat src/app/routes.ts
cat src/app/(handoff)/connect/use-connect-page.ts

# Look at the protocol and mock you'll be copying
cat ~/code/data-connect/src/lib/embrowse-protocol.ts
cat ~/code/data-connect/public/mock-embrowse.html
cat ~/code/data-connect/src/pages/embrowse/use-embrowse-page.ts

# Run account.vana.org locally
cd ~/code/vana-connect/connect
pnpm install && pnpm dev
```
