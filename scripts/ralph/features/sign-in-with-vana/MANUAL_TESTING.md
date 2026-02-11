# Manual Testing — Grant Flow v1 Rewrite

## Prerequisites

```bash
npm install
npm run dev          # starts Vite dev server (default http://localhost:5173)
```

Ensure `.env` has `VITE_PRIVY_APP_ID` and `VITE_PRIVY_CLIENT_ID` set.

---

## 1. Demo Mode (dev-only, no backend required)

Demo mode activates when `sessionId` starts with `grant-session-` and `import.meta.env.DEV` is true. It uses mock data and never calls the Session Relay, Gateway, or Personal Server.

### 1A. Happy path — consent → auth → success

Open in browser:
```
http://localhost:5173/grant?sessionId=grant-session-test-1
```

- [ ] Page loads without errors
- [ ] Loading spinner appears briefly, then consent screen shows
- [ ] Consent screen displays:
  - Title: "Allow access to your data"
  - Builder name "Demo App"
  - Scopes listed (chatgpt.conversations)
- [ ] Click **Allow**
- [ ] Since not authenticated, screen transitions to **auth-required** state
  - Shows "Sign In to Continue"
  - Shows dev auth URL (`http://localhost:5175`) or error message
- [ ] Complete authentication (or mock it via debug panel)
- [ ] After auth completes, flow auto-advances to **success** screen
  - Shows checkmark
  - Shows "Demo App has your data"
  - Shows "Manage your account" link pointing to `/settings`

### 1B. Cancel / deny flow

Open:
```
http://localhost:5173/grant?sessionId=grant-session-test-2
```

- [ ] Consent screen loads
- [ ] Click **Cancel**
- [ ] Navigates to `/apps` (the decline target)
- [ ] No errors in console

### 1C. Success override

Open:
```
http://localhost:5173/grant?sessionId=grant-session-test-3&status=success
```

- [ ] Jumps directly to success screen
- [ ] Shows "Demo App has your data"

---

## 2. Debug Panel (dev-only)

Open any `/grant` URL in dev mode. The debug panel appears fixed in the bottom-right.

- [ ] Panel is visible with "Grant debug" label
- [ ] Shows "Debug App · chatgpt.conversations"
- [ ] "Live" button is selected by default (real flow state)
- [ ] Clicking each status button overrides the displayed screen:
  - [ ] **loading** → loading spinner
  - [ ] **claiming** → loading spinner
  - [ ] **verifying-builder** → loading spinner
  - [ ] **consent** → consent screen with "Debug App"
  - [ ] **auth-required** → sign-in modal
  - [ ] **creating-grant** → consent screen with "Allowing..." spinner on button
  - [ ] **approving** → consent screen with "Allowing..." spinner on button
  - [ ] **success** → success screen
  - [ ] **error** → error screen with mock error message
- [ ] Clicking **Live** returns to the real flow state
- [ ] Wallet toggle button works (shows "connected" / "missing")

---

## 3. Real Flow (requires backend services)

> Requires: Session Relay running, Gateway accessible, Personal Server running.
> Set `VITE_SESSION_RELAY_URL` and `VITE_GATEWAY_URL` in `.env` if not using defaults.

### 3A. Session claim + builder verification

Trigger by opening a deep link with a real `sessionId` and `secret`:
```
http://localhost:5173/grant?sessionId=<real-id>&secret=<real-secret>
```

- [ ] Loading spinner shows (status: loading → claiming → verifying-builder)
- [ ] After claim + builder verification completes:
  - Consent screen shows with builder name from manifest
  - Builder name is NOT "Demo App" — it's the real builder's name
- [ ] Console shows `[GrantFlow]` logs for builder verification
- [ ] If builder verification fails, fallback name appears (e.g., "App 0x1a2b...")

### 3B. Missing secret parameter

Open:
```
http://localhost:5173/grant?sessionId=real-session-no-secret
```

- [ ] Error screen shows
- [ ] Error message: "No secret provided. The deep link URL is missing the secret parameter."

### 3C. Invalid/expired session

Open with a fake session ID and any secret:
```
http://localhost:5173/grant?sessionId=nonexistent&secret=fake
```

- [ ] Error screen shows
- [ ] Error message from Session Relay (e.g., "SESSION_NOT_FOUND" or "Failed to load session")

### 3D. Full approve flow (authenticated user)

Prerequisites: user is already signed in (wallet address available in Redux state).

```
http://localhost:5173/grant?sessionId=<real-id>&secret=<real-secret>
```

- [ ] Consent screen shows
- [ ] Click **Allow**
- [ ] Flow transitions through creating-grant → approving → success
  - Allow button shows "Allowing..." spinner
- [ ] Success screen shows with builder's name
- [ ] Console shows `[GrantFlow]` log — no errors
- [ ] Session Relay `POST /v1/session/{id}/approve` was called with correct grantId

### 3E. Full approve flow (unauthenticated user)

Prerequisites: user is NOT signed in.

- [ ] Consent screen shows
- [ ] Click **Allow**
- [ ] Transitions to auth-required screen
- [ ] Complete Privy sign-in
- [ ] After auth completes, flow automatically continues:
  - creating-grant → approving → success
- [ ] Success screen shows

### 3F. Deny flow with real session

- [ ] Consent screen shows
- [ ] Click **Cancel**
- [ ] Session Relay `POST /v1/session/{id}/deny` was called with `reason: "User declined"`
- [ ] Navigates to `/apps`

---

## 4. Error Handling

### 4A. Personal Server not running

When authenticated user clicks Allow but Personal Server is stopped:

- [ ] Error screen shows
- [ ] Error message: "Personal Server is not running. Please wait for it to start."

### 4B. Grant creation failure

If Personal Server's `POST /v1/grants` returns an error:

- [ ] Error screen shows
- [ ] Error message from Personal Server is displayed

### 4C. Session approve failure (split failure)

If grant creation succeeds but `POST /v1/session/{id}/approve` fails:

- [ ] Error screen shows
- [ ] The grant was already created on Gateway (this is the "split failure" scenario documented as a P2 item)

---

## 5. Deep Link Integration

> Requires Tauri runtime with deep-link plugin configured in `src-tauri/tauri.conf.json`
> (`"deep-link": { "desktop": { "schemes": ["vana"] } }`).

### 5A. URL parameter parsing

Open from any page with grant params:
```
http://localhost:5173/?sessionId=grant-session-1&secret=abc123
```

- [ ] `useDeepLink` hook detects the params
- [ ] Redirects to `/connect?sessionId=grant-session-1&secret=abc123`
- [ ] Secret is preserved through the redirect

---

## 6. TypeScript & Build Validation

```bash
npx tsc -b                        # typecheck
npm run build                     # production build
npm run test                      # runs all tests
```

- [ ] TypeScript: zero errors
- [ ] Build: succeeds (warnings about chunk size are expected)
- [ ] Tests: all pass (run `npm run test` for the full suite)

---

## Quick Reference — State Machine

```
loading → claiming → verifying-builder → consent → auth-required → creating-grant → approving → success
                                            │              │
                                            └──────────────┴─ Cancel ──→ POST /v1/session/{id}/deny → navigate to /apps
```

All `loading`/`claiming`/`verifying-builder` states show the same loading spinner.
`creating-grant`/`approving` show the consent screen with the Allow button in loading state.
`auth-required` shows the sign-in modal. Cancel from auth-required also calls deny.
If already authenticated, `auth-required` is skipped.
