# 260212-demo-app-chatgpt-endpoint-instructions

This is the integration guide for external demo apps that need ChatGPT export data from DataConnect fast.

For implementation context and scope boundaries, see:
- `docs/plans/260212-browser-demo-chatgpt-endpoint.md`

## What is running

DataConnect repo now includes a standalone sidecar server script:
- `scripts/demo-chatgpt-endpoint.mjs`

It serves:
- `GET http://127.0.0.1:8787/v1/demo/chatgpt/latest`

It does not modify core personal-server or Tauri startup paths.

## Operator startup steps (manual)

1. Start DataConnect desktop app and ensure a ChatGPT export has completed at least once.
2. In this repo, start sidecar server:
   - `npm run demo:chatgpt-endpoint`
   - This force-clears port conflicts and runs sidecar in watch mode.
3. Confirm health:
   - `curl http://127.0.0.1:8787/healthz`
4. Confirm endpoint:
   - `curl http://127.0.0.1:8787/v1/demo/chatgpt/latest`

Port override (if needed):
- `DATACONNECT_DEMO_PORT=8788 npm run demo:chatgpt-endpoint`
- Then use `http://127.0.0.1:8788/v1/demo/chatgpt/latest` in the demo app.

If there is no parsed export yet, endpoint returns:
- `404 { ok: false, error: "No ChatGPT parsed export found" }`

## API contract for demo app

### Request

- Method: `GET`
- URL: `http://127.0.0.1:8787/v1/demo/chatgpt/latest`
- Auth: none (demo fast-path)

### Success response (`200`)

```json
{
  "ok": true,
  "updatedAtMs": 1739408825123,
  "data": {}
}
```

`data` is the latest parsed ChatGPT export object.

Source file resolution is:
- preferred: `extracted/1_parsed_conversations.json`
- fallback: latest `*.json` in the run directory (for current playwright export layout)

### Error responses

- `404` no export file found yet
- `500` read/parse error

All error responses use:

```json
{
  "ok": false,
  "error": "message"
}
```

## Demo app fetch implementation (copy/paste)

```ts
const ENDPOINT = "http://127.0.0.1:8787/v1/demo/chatgpt/latest";

export type ChatgptLatestResponse =
  | { ok: true; updatedAtMs: number; data: unknown }
  | { ok: false; error: string };

export async function fetchChatgptLatest(): Promise<ChatgptLatestResponse> {
  const res = await fetch(ENDPOINT, { method: "GET" });
  const body = (await res.json()) as ChatgptLatestResponse;

  if (!res.ok) {
    return body;
  }
  return body;
}
```

## UX handling recommendations (minimal)

- If network error: show `Demo endpoint unavailable. Start sidecar server.`
- If `404`: show `No ChatGPT export found yet. Run export in DataConnect first.`
- If `500`: show `Failed to read export data from local demo endpoint.`
- If sidecar just came up, no app restart needed; trigger a fresh fetch (retry button, route refresh, or hard refresh).

## Fast troubleshooting

- Verify sidecar process is running and listening on `127.0.0.1:8787`.
- Hit `GET /healthz` first, then `GET /v1/demo/chatgpt/latest`.
- If still failing, print response body directly in demo app logs before parsing assumptions.
- If the other app shows stale failure state, force a new fetch; do not assume it auto-retries.

## Non-goals for this integration

- Authentication/token flow
- Strict CORS allowlist
- Production-grade local API hardening
