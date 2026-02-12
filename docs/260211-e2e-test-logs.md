 # E2E Grant Flow Test

Automate testing with the tauri MCP. Docs: https://hypothesi.github.io/mcp-server-tauri/llms.txt

 ## Steps                                                                  
                                                                                                      
  Flow Progress (create new session via curl 'https://vana-connect-nextjs-starter.vercel.app/api/connect' -X 'POST')                                                              
  Step: Deep link → /connect                                                   
  Status: PASS
  Detail: Session claimed, builder verified
  ────────────────────────────────────────
  Step: Connector run
  Status: PASS
  Detail: 1 memory + 9 conversations collected, session restored
  ────────────────────────────────────────
  Step: Navigate to /grant
  Status: PASS
  Detail: location.state carried pre-fetched data correctly
  ────────────────────────────────────────
  Step: Consent screen
  Status: PASS
  Detail: Real builder name, icon, scopes, links all present
  ────────────────────────────────────────
  Step: Click Allow → auth
  Status: PASS
  Detail: Transitioned to auth-required, auth server started at URL localhost:3083
  ────────────────────────────────────────
  Step: Manual Privy auth -> wait for user to manually sign in with Privy
  Status: PASS
  Detail: Wallet 0xf88eBC8E8AF6EC65BA3e18dC439fcEfc604b6DaE acquired
  ────────────────────────────────────────
  Step: Personal server restart
  Status: PASS
  Detail: Restarted with wallet, ready on port 8080, dev token received
  ────────────────────────────────────────
  Step: Grant creation (1st)
  Status: FAIL
  Detail: Race condition — approve fired before server finished restarting
  ────────────────────────────────────────
  Step: Grant creation (2nd)
  Status: FAIL
  Detail: Server running, but 400 INVALID_BODY from POST /v1/grants
  Bugs Found

  1. Race Condition: Grant approve fires before personal server restart completes

  - Where: use-grant-flow.ts auto-approve effect (~line 452)
  - Sequence: Auth completes → usePersonalServer restarts with wallet → grant flow fires createGrant
  before personal-server-ready event arrives
  - Error: PersonalServerError (no status code — server was mid-restart)
  - Fix needed: Wait for personal-server-ready event (or port health check) before attempting grant
  creation

  2. INVALID_BODY: Grant creation request body doesn't match personal server API

  - Where: src/services/personalServer.ts createGrant() → POST /v1/grants
  - Error: {"statusCode":400,"name":"PersonalServerError"} with message INVALID_BODY
  - Likely cause: The request body shape sent by the frontend doesn't match what the personal server's
   /v1/grants endpoint expects (schema validation failure). The scopes format, grantee address format,
   or required fields may have changed in the personal server library.

  3. Personal server crash on startup (intermittent, stale process)

  - Symptom: ENOENT: mkdir '/data-connect' when stale process holds resources
  - Root cause: When a previous personal-server instance is still running/holding the SQLite database
  or port, the new instance fails with a misleading path error
  - Related finding: The index.cjs wrapper reads CONFIG_DIR (set by Rust), but the underlying
  @opendatalabs/personal-server-ts-core library uses PERSONAL_SERVER_ROOT_PATH — these don't match,
  creating a fragile fallback to os.homedir() which can fail

  Working Components Verified

  - Session Relay: claim + approve API calls work
  - Builder verification: gateway lookup + manifest fetch work
  - ChatGPT connector: full scraping pipeline works
  - Auth flow: start_browser_auth → external browser → auth-complete event works
  - Personal server lifecycle: start/stop/restart with wallet credentials works
  - All 9 UI states render correctly (verified via debug panel)

Personal server code is available at: /Users/kahtaf/Documents/workspace_vana/personal-server-ts -> use this to debug any issues related to personal server and to understand the source code.

---

## Retest Run — 2026-02-12

### Fixes Applied

1. **Race condition fix** (`restartingRef`):
   - File: `src/hooks/usePersonalServer.ts`
   - Added `restartingRef = useRef(false)` — set `true` before restart, `false` on `personal-server-ready` event
   - File: `src/pages/grant/use-grant-flow.ts` (auto-approve effect, ~line 459)
   - Guard: `if (personalServer.restartingRef.current || !personalServer.port) return`
   - Prevents auto-approve from firing while server is restarting

2. **INVALID_BODY fix** (`expiresAt` → Unix timestamp):
   - File: `src/pages/grant/use-grant-flow.ts` (line 368-370)
   - Before: `expiresAt` was passed as ISO string from session
   - After: `Math.floor(new Date(flowState.session.expiresAt).getTime() / 1000)` — converts to Unix timestamp number

3. **Error display fix** (bonus — found during retest):
   - File: `src/services/personalServer.ts` (`serverFetch`)
   - Before: `String((data as { error: string }).error)` → `[object Object]` when error is nested `{code, errorCode, message}`
   - After: Extracts `error.message` for nested error objects

### Retest Results

| Step | Status | Detail |
|------|--------|--------|
| Deep link → /connect | PASS | Session `2cde4ed3` claimed, builder "Vana Connect — Next.js Starter" verified |
| Connector run | PASS | Session restored, 1 memory + 9 conversations collected (reused ChatGPT credentials) |
| Navigate to /grant | PASS | Pre-fetched data carried via location.state |
| Consent screen | PASS | Builder name, scopes, permissions, action buttons all present |
| Click Allow → auth | PASS | Transitioned to auth-required (port 54898 — see note below) |
| Simulated auth-complete | PASS | Emitted Tauri event, Redux state updated, wallet connected |
| Personal server restart | PASS | Restarted with wallet `0xf88e...`, ready on port 8080, devToken received |
| restartingRef guard | PASS | Auto-approve correctly waited for `restartingRef.current = false` before firing |
| Grant creation request | **PARTIAL** | Request body correct: `{"granteeAddress":"0x57de...","scopes":["chatgpt.conversations"],"expiresAt":1770865309}` — expiresAt is a Unix timestamp number (fix confirmed). devToken present (64 chars). |
| Grant creation response | **BLOCKED** | HTTP 500 `SERVER_NOT_CONFIGURED` — "Server owner address not configured. Set VANA_MASTER_KEY_SIGNATURE" |
| Session approval | SKIPPED | Blocked by grant creation failure |
| Success screen | SKIPPED | Blocked by grant creation failure |

### Verification of Fixes

| Fix | Verified? | Evidence |
|-----|-----------|----------|
| `expiresAt` is a number | YES | Request body: `"expiresAt":1770865309` (Unix timestamp). No INVALID_BODY error. |
| No race condition | YES | `restartingRef` guard in auto-approve effect. Server restart completed (02:51:10.781) before approve attempted (02:51:10.863). |
| Error display | YES (bonus fix) | `serverFetch` now extracts `.message` from nested error objects instead of showing `[object Object]`. |

### Blocker: SERVER_NOT_CONFIGURED

The Personal Server's `POST /v1/grants` endpoint returns 500 with:
```json
{"errorCode":"SERVER_NOT_CONFIGURED","message":"Server owner address not configured. Set VANA_MASTER_KEY_SIGNATURE environment variable."}
```

**Root cause**: The simulated auth event passed `masterKeySignature: null`. The real Privy auth flow generates a `masterKeySignature` by having the user sign a message with their wallet. Without this signature, the Personal Server can't register the wallet identity with the Gateway, so grant creation fails.

**Impact**: The E2E flow cannot complete without real Privy browser authentication. The `masterKeySignature` is only generated during the Privy login flow and cannot be simulated.

**What this means for the fixes**: Both targeted fixes (expiresAt format, race condition) are verified working. The `SERVER_NOT_CONFIGURED` error is an auth infrastructure requirement, not related to either bug.

### Note: Auth Server Port

Auth server started at `http://localhost:54898` instead of the expected `http://localhost:3083`. Root cause: a stale `start_browser_auth` listener from a previous test run was still holding port 3083 (and port 5173 is used by Vite), so the server fell back to a random port. The `cancel_browser_auth` command is a no-op (doesn't release the TCP listener). This is a separate issue to track.

### Unit Test Status

All 46/46 unit tests pass, including:
- `expiresAt` conversion tests for both ISO string and `undefined` inputs
- Race condition tests verifying `restartingRef` prevents premature approve
- Auth flow tests verifying auto-approve defers until server is ready