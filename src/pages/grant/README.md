# Grant Flow Refactor Notes

## Step 2 - Consent Screen

Purpose: define the consent screen ("Allow access to your <data source> data")
and how it behaves in the grant flow.

Inputs (canonical):

- `/grant?sessionId&appId&scopes`
- `status=success` forces Step 4 success state
- `sessionId` required (`grant-session-*` indicates demo)
- `appId` optional (defaults if missing)
- `scopes` JSON array or comma fallback (used to derive data-source label)

UI reference:

- Design: `docs/_wip/260204-connect-flow.png` (Step 2 frame)
- Copy:
  - Title: "Allow access to your <data source> data"
  - Subtext: "This will allow <app> to:"
  - Permission row: "<app> -> See your <data source> data"
  - Footnote: "You can revoke this permission at any time. Learn more."
  - Buttons: "Cancel" and "Allow"

Behavior:

1. `/connect` runs the connector and routes to `/grant` with `sessionId`, `appId`, `scopes`.
2. `/grant` loads session data in `useGrantFlow` and moves to `consent`.
3. Clicking **Allow**:
   - If unauthenticated, `useGrantFlow.handleApprove` saves a pending grant redirect and routes to `/`.
   - Home starts the browser auth flow (`start_browser_auth` in Tauri, direct Passport URL fallback in browser-only dev).
   - On `auth-complete`, app-global auth state updates and Home resumes the pending grant route.
4. Clicking **Cancel** returns to **Data Apps** (`/apps`).
5. Deep-link success: `/grant?...&status=success` renders the Step 4 success UI.

Data-source label:

- Example: `["read:chatgpt-conversations"]` -> `ChatGPT`
- Fallback: "data source" / "data"
- Shared helpers live in `src/lib/scope-labels.ts` and are used by `/connect` and `/grant`.

Dev flow visibility:

- **Tauri dev:** `start_browser_auth` opens external Passport with a callback port to the local auth callback server.
- **Web dev (mock-only):** root/login opens external Passport URL directly (no local callback server).

## Mocking the Grant URL

Use these in the browser when testing the grant flow directly:

- Raw scopes (comma fallback):
  `http://localhost:5173/grant?sessionId=grant-session-123&appId=rickroll&scopes=read:chatgpt-conversations`
- JSON scopes (what `buildGrantSearchParams` generates):
  `http://localhost:5173/grant?sessionId=grant-session-123&appId=rickroll&scopes=%5B%22read:chatgpt-conversations%22%5D`
- Step 4 success:
  `http://localhost:5173/grant?sessionId=grant-session-123&appId=rickroll&scopes=%5B%22read:chatgpt-conversations%22%5D&status=success`

Run the app:

```
npm run dev:app
```

If generating in code, do not encode the full query string:

```ts
const search = buildGrantSearchParams({ sessionId, appId, scopes }).toString()
navigate(`/grant?${search}`)
```
