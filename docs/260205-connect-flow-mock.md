# Mock Data Connect

Note: to mock the connect flow, run both `npm run dev:app` and `npm run auth:dev` in separate tabs.

## Fresh install from an external app ("RickRoll")

0. Go to the **Data Apps** page: `http://localhost:5173/apps` and open the **RickRoll** app. This opens our mock app "externally in the browser" (ie. not in the Data COnnect Tauri app). This is our mock scenario for then "signing in with Vana" from an external app: using Data Connect to scrape data from a platform designated by the external app.

1. This directs you to: `http://localhost:5173/rickroll` (you can also start here if you wish)

2. Go to: `http://localhost:5173/rickroll/signin` and click **Launch Data Connect**
   - The sign-in page generates the grant params in dev and appends them to the
     Launch Data Connect button (mock-only).

3. `/connect` shows: "Could not load connectors. Scope: read:chatgpt-conversations. If you’re viewing this in a browser, connectors won’t load. Use the Tauri app."

- This is expected because connectors only run in Tauri. Underneath is a dev message.
- If you need to bypass connectors, click **Skip to grant step**.

4. `/grant` shows:
   "Allow access to your ChatGPT conversations"
   - Click **Allow**, then switch to the auth dev server tab at `http://localhost:5175`.
   - Clicking **Cancel** returns to `/apps`.

5. Allowing access on the `/grant` page opens the Vana Passport sign-in page in a new tab at `http://localhost:5175`.

6. [Success callback from Auth = goes back to /grant success page]
