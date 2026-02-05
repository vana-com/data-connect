# Mock Data Connect

Note: to mock the connect flow, run both `npm run dev:app` and `npm run auth:dev` in separate tabs.

## Fresh install from an external app ("RickRoll")

1. Start at:
   `http://localhost:5173/rickroll`

2. Go to: `http://localhost:5173/rickroll/signin` and click **Launch Data Connect**
   - The sign-in page generates the grant params in dev and appends them to the
     Launch Data Connect button (mock-only).

3. `/connect` shows: "Could not load connectors. Scope: read:chatgpt-conversations. If you’re viewing this in a browser, connectors won’t load. Use the Tauri app."

- This is expected because connectors only run in Tauri. Underneath is a dev message.
- Click **emulate the RickRoll deep link** to refresh `/connect` with params.
- If you need to bypass connectors, click **Skip to grant step**.

4. `/grant` shows:
   "Allow access to your ChatGPT conversations"
   - Click **Allow** to continue, goes to 5175 auth-page.
   - Click "cancel" goes to `apps/:appId`, which is not eh same as the prior /connect?... page but it means we can have an assured back button for all possible connect flows.
