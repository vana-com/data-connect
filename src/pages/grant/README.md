# Grant Flow Refactor Notes

## Step 2 - Consent Screen

Purpose: define the consent screen ("Allow access to your <data source> data")
and how it behaves in the grant flow.

Inputs (canonical):

- `/grant?sessionId&appId&scopes`
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
   - If unauthenticated, `useGrantFlow.handleApprove` sets status `auth-required` and triggers `start_browser_auth`.
   - External auth page opens in a new tab.
   - On `auth-complete`, the flow resumes and approval continues.
4. Clicking **Cancel** goes to the app route (`declineHref`).
   - Keep this for now but validate in mock flow; first-run users may find `/apps/:appId` confusing.

Data-source label:

- Example: `["read:chatgpt-conversations"]` -> `ChatGPT`
- Fallback: "data source" / "data"
- Shared helpers live in `src/lib/scope-labels.ts` and are used by `/connect` and `/grant`.

Dev flow visibility:

- **Tauri dev:** `start_browser_auth` serves `src-tauri/auth-page` and opens the browser.
- **Web dev fallback (mock-only):** if Tauri `invoke` fails, open `http://localhost:5175`.
  - Run `npm run auth:dev` to start the auth page dev server.

## Mocking the Grant URL

Use these in the browser when testing the grant flow directly:

- Raw scopes (comma fallback):
  `http://localhost:5173/grant?sessionId=grant-session-123&appId=rickroll&scopes=read:chatgpt-conversations`
- JSON scopes (what `buildGrantSearchParams` generates):
  `http://localhost:5173/grant?sessionId=grant-session-123&appId=rickroll&scopes=%5B%22read:chatgpt-conversations%22%5D`

When you click **Allow** in the browser, switch to the auth page dev server at
`http://localhost:5175`. Run this first:

```
npm run auth:dev
```

Run the app in another tab:

```
npm run dev:app
```

If generating in code, do not encode the full query string:

```ts
const search = buildGrantSearchParams({ sessionId, appId, scopes }).toString()
navigate(`/grant?${search}`)
```
