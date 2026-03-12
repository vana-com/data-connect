# Embrowse data ingestion: open questions and gaps

## Context

For the demo flow, Embrowse runs inside an iframe on account.vana.org. After scraping Instagram, it needs to POST data to the user's Personal Server at `POST /v1/data/instagram.ads`.

## Gap 1: No auth on data write endpoint

`POST /v1/data/{scope}` is unauthenticated — only validates against the schema.
This is fine when the caller is on localhost (desktop app), but when Embrowse posts over the public tunnel URL, anyone who discovers the URL can write arbitrary (schema-valid) data.

**TODO:** Add auth to the data write endpoint. Options:
- Require the same `Web3Signed` header used for reads
- Use a short-lived token issued during the connect flow
- Accept a session-scoped bearer token from the session relay

**Relevant code:**
- Data ingest service: [`src/services/personalServerIngest.ts`](https://github.com/vana-com/data-connect/blob/main/src/services/personalServerIngest.ts)
- Personal Server wrapper (endpoint handler): [`personal-server/index.js`](https://github.com/vana-com/data-connect/blob/main/personal-server/index.js)
- Protocol spec (endpoint access control): [`data-portability-spec.md` lines 311-363](https://github.com/vana-com/data-connect/blob/main/data-portability-spec.md#L311-L363)

## Gap 2: Embrowse-to-parent communication protocol

Embrowse runs in an iframe on account.vana.org. It needs to:
1. **Receive configuration from the parent** — which platform to scrape, where to POST results (i.e. the Personal Server tunnel URL), auth tokens, scopes
2. **Signal progress/completion back to the parent** — scraping status, success/failure, data summary

The Personal Server URL question is part of this: account.vana.org is the management component and orchestrates the flow, so it should know the user's PS address (via gateway lookup, session relay metadata, or its own provisioning records) and pass it to Embrowse as config.

No protocol for this exists yet. Likely `postMessage` between iframe and parent, but the message contract needs defining.

**Relevant code:**
- Desktop ingest (hardcodes localhost): [`src/services/personalServerIngest.ts`](https://github.com/vana-com/data-connect/blob/main/src/services/personalServerIngest.ts)
- Tunnel URL event: [`src/hooks/usePersonalServer.ts` line 227](https://github.com/vana-com/data-connect/blob/main/src/hooks/usePersonalServer.ts#L227)
- PS self-registers with gateway, so the URL is discoverable after auth
