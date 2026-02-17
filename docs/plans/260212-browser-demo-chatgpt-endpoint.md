# 260212-browser-demo-chatgpt-endpoint

## Goal

Get a browser-only external demo app live in hours by exposing the latest ChatGPT parsed export over localhost HTTP from a running DataConnect instance, without touching core personal-server implementation.

Success criteria for this iteration:
- A standalone sidecar demo server serves `GET /v1/demo/chatgpt/latest`.
- External browser app fetches it without file picker flow.
- Core app paths remain unchanged (`personal-server/index.js`, Tauri commands).

## Scope for fast launch (strict)

In scope:
- One standalone read-only sidecar server script (not part of core server startup).
- Basic CORS to allow browser access.
- Fixed sidecar port for predictability (default `8787`).
- Clear 404/500 behavior for missing/bad export data.

Out of scope for this launch:
- Bearer token auth.
- Strict origin allowlist.
- Tauri-side config/env plumbing for demo token/paths.
- Schema versioning and production hardening.

## Existing patterns to follow

- ChatGPT parsed export file is produced at:
  - `.../exported_data/OpenAI/ChatGPT/<run>/extracted/1_parsed_conversations.json`
- Export run folders are timestamped (`<platformId>-<timestamp>`).
- Existing core personal-server and Tauri startup should not be changed for this demo.

## Implementation plan (minimum moving parts)

1. **Add standalone sidecar server script**
   - Add script file:
     - `scripts/demo-chatgpt-endpoint.mjs`
   - Run manually:
     - `node scripts/demo-chatgpt-endpoint.mjs`
   - Bind to:
     - `http://127.0.0.1:8787`
   - Add route:
     - `GET /v1/demo/chatgpt/latest`
   - Route behavior:
     - locate ChatGPT export root (fast-path local layout).
     - resolve most recent run that has `extracted/1_parsed_conversations.json`.
     - read and parse JSON.
     - return:
       - `ok: true`
       - `updatedAtMs`
       - `data`
   - Do not return absolute local file paths in response.

2. **Add demo-only CORS**
   - Apply middleware to `"/v1/demo/*"`.
   - Fast launch mode: permissive local CORS to unblock browser fetch.
   - Allow `GET` and `OPTIONS`.

3. **Demo app integration**
   - Demo app calls:
     - `http://127.0.0.1:8787/v1/demo/chatgpt/latest`
   - If sidecar is not running, show explicit error:
     - "Demo endpoint unavailable. Start sidecar server."

4. **Core isolation rule**
   - Do not modify:
     - `personal-server/index.js`
     - `src-tauri/src/commands/server.rs`
   - Keep all demo logic in sidecar script + demo app fetch call.

## File touch list (expected)

- `scripts/demo-chatgpt-endpoint.mjs` (standalone endpoint + CORS + latest-run lookup helper)
- Optional docs update for demo usage notes

## Error handling (must have)

- No ChatGPT export root/run/file -> `404` JSON:
  - `{ ok: false, error: "No ChatGPT parsed export found" }`
- JSON parse failure or unexpected read error -> `500` JSON:
  - `{ ok: false, error: "<message>" }`

## Validation checklist (fast)

- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] Manual: sidecar server starts with `node scripts/demo-chatgpt-endpoint.mjs`
- [ ] Manual: `curl http://127.0.0.1:8787/v1/demo/chatgpt/latest` returns `ok: true` after export
- [ ] Manual: external browser demo app fetches endpoint successfully with no file picker
- [ ] Manual: when no export exists, endpoint returns `404` JSON with actionable message

## Later polish (explicitly not part of fast launch)

1. **Auth hardening**
   - Add bearer token guard (`DATACONNECT_DEMO_TOKEN` or reuse existing `devToken` model).
   - Define token distribution/rotation strategy for demo app.

2. **CORS hardening**
   - Replace permissive mode with strict allowlist (`localhost:3000`, `localhost:5173`, etc.).
   - Explicitly set allowed headers and `Vary: Origin`.

3. **Path/runtime hardening**
   - Stop relying on fast-path local layout assumptions.
   - Resolve export root from a canonical runtime source shared with Tauri.

4. **Stability + contract hardening**
   - Add response schema versioning and endpoint tests (route, CORS preflight, latest-run selection, error codes).
   - Package sidecar startup into a one-command demo runner script.

## Out of scope

- On-chain Passport verification / grant enforcement.
- Long-term auth model beyond local demo needs.
- Multi-source generalized API (Instagram/LinkedIn/etc.).
- Production-grade remote serving, sync, or cloud relay.
