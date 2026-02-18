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
   - Auth must already be populated from the deep link (`masterKeySig` param).
   - If not authenticated, an error is shown directing the user to account.vana.org.
4. Clicking **Cancel** returns to **Data Apps** (`/apps`).
5. Deep-link success: `/grant?...&status=success` renders the Step 4 success UI.

Data-source label:

- Example: `["read:chatgpt-conversations"]` -> `ChatGPT`
- Fallback: "data source" / "data"
- Shared helpers live in `src/lib/scope-labels.ts` and are used by `/connect` and `/grant`.

## Mocking the Grant URL

Use these in the browser when testing the grant flow directly:

- Raw scopes (comma fallback):
  `http://localhost:5173/grant?sessionId=grant-session-123&appId=rickroll&scopes=read:chatgpt-conversations`
- JSON scopes (what `buildGrantSearchParams` generates):
  `http://localhost:5173/grant?sessionId=grant-session-123&appId=rickroll&scopes=%5B%22read:chatgpt-conversations%22%5D`
- Step 4 success:
  `http://localhost:5173/grant?sessionId=grant-session-123&appId=rickroll&scopes=%5B%22read:chatgpt-conversations%22%5D&status=success`

If generating in code, do not encode the full query string:

```ts
const search = buildGrantSearchParams({ sessionId, appId, scopes }).toString()
navigate(`/grant?${search}`)
```
