# SPA Auth — Punchlist

Work items from the SPA auth experiment (2026-03-11) and Maciej's Linear connector build log (PR #14).

Context: Tim's `vana-connect` agent skill (data-connectors PR #28, branch `feat/agent-connect-skill`) guides AI agents to build data connectors. Maciej's agent tried to build a Linear connector and failed because the skill steered it toward REST+cookies, which doesn't work for WebSocket SPAs.

## Repo: `vana-com/data-connectors` (branch `feat/agent-connect-skill`)

### Skill changes (teach agents about SPA patterns)

- [x] **PATTERNS.md — reframe as extraction ladder.** Renamed Pattern A/B/C to Rung 1/2/3. Added fail-fast criteria per rung. Removed "fallback/last resort" language from DOM extraction. Added "Putting It Together" code example.

- [x] **PATTERNS.md — fix login detection template.** Replaced DOM-only approach with URL-based primary + DOM supplementary. Added good/bad selector guidance.

- [x] **CREATE.md — update extraction strategy guidance.** Replaced "choose upfront in preference order" with "follow the extraction ladder, max 2 attempts per rung." Updated reference connectors table with rung numbers. Updated diagnosis guide with CORS/401 → next rung.

- [x] **CREATE.md — add `requestInput` for API key pattern.** Template showing: `requestInput` → store key → use as Bearer token on public API. Added to CREATE.md auth pattern section and extraction strategy.

- [x] **PATTERNS.md — add `httpFetch` as primary extraction approach.** Documented API key shortcut + CORS workaround via `closeBrowser()` + `httpFetch()`. Also added to PAGE-API.md reference.

- [x] **SETUP.md — point to `docs/upstream-asks` branch.** Until PR #81 merges, agents need `requestInput` from this branch.

- [x] **PAGE-API.md — document `httpFetch`, `requestInput`, `screenshot`.** These existed in the runner but were missing from the skill reference.

### Runner/framework changes

- [x] **`requestInput` implemented.** Commits 8877717, 1eef778 in data-connect. Rebased PR branch picks this up.
- [x] **Stdout race condition fixed.** `process.exit()` now drains stdout before exiting. Prevents lost result messages.

### Nice-to-haves (from Maciej's feedback)

- [ ] **`page.debugAuth()` helper** — dumps cookies, localStorage, service worker registrations.
- [ ] **`scaffold.cjs --pattern` flag** — `--pattern=dom-scrape` or `--pattern=api-key` to generate the right template skeleton.

## Repo: `vana-com/data-connect` (this repo)

- [x] **Document SPA auth experiment results.** `docs/spa-auth-experiment-results.md` — done.
- [ ] **Update experiment results doc** to reference this punchlist and Maciej's build log.

## Done / validated

- [x] CDP `Network.requestWillBeSentExtraInfo` captures session cookies during bootstrap (proven on Linear)
- [x] DOM scraping works headlessly with a saved browser profile (proven: 20 issues extracted)
- [x] Linear uses cookie auth + query allowlist + WebSocket sync (not Bearer tokens)
- [x] Captured cookies don't replay externally (curl 401 — Cloudflare/TLS binding)
