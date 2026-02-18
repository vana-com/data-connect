# Active Issues

## Fixed (2026-02-18, commit 60c8525)

- [x] macOS "prevented from modifying apps" dialog — runtime codesign on bundled binary triggered Gatekeeper. Now verifies signature first, skips if already valid.
- [x] macOS "find devices on local networks" dialog — Chrome mDNS discovery. Disabled via `--disable-features=MediaRouter,DialMediaRouteProvider`.
- [x] LinkedIn connector 30s timeout — `goto()` now accepts `{timeout, waitUntil}`, LinkedIn uses 60s.

## Muscan

### Auth redirects to passport.vana.org which is down
Signing in through the Data Connect app redirects to `https://passport.vana.org/` which is currently not working. Need to figure out whether this is the desktop app or the web app doing the redirect. The desktop app's auth uses Privy with a local callback server on port 3083 — passport.vana.org shouldn't be in that flow at all. Could be the web app, or an old cached redirect, or a backend config pointing to the wrong URL.

### Forced re-login on every app reopen
DONE. Every time the app is reopened and connected with the web app, it forces a fresh Vana Passport login. The root cause is that auth tokens (`authToken`, `masterKeySignature`) are received via Privy callback but stored only in Rust memory (`PERSONAL_SERVER_DEV_TOKEN`, etc.) — everything resets when the app restarts. We need persistent token storage across sessions (keychain, Tauri store plugin, or encrypted file). Check `auth.rs` for what's there today.

### ChatGPT shows login even though user is already logged in browser
The user is already logged into ChatGPT in their browser but the app still asks them to log in again. This is partially by design — the Playwright runner imports cookies from the system Chrome profile into a separate browser profile, and the `promptUser` flow verifies the session. But if cookie import fails silently (Chrome profile locked, different encryption key, keychain access denied), the user sees a login page with no explanation. Need to check if cookie import actually succeeds and give better feedback when it doesn't.

## Maciej (v0.7.13, dev build — says release build was fine)

### Duplicated log lines
DONE. Every single log line appears twice in the log file. This is a logging architecture issue: the Tauri log plugin writes to the file, and the stdout reader in `server.rs` also forwards process output to the same log, doubling everything. Not a functional bug but makes debugging painful. Check the log subscriber config and stdout forwarding.

### Blank screen when opening Profile
Opening the Profile icon from the home screen shows a completely blank white page. Only happens in dev build, not in the release build he tested earlier. Likely a frontend issue — missing env var, different base URL in dev, or a data fetch that fails silently and leaves the page empty. Need to reproduce in dev mode and check the browser console.

### Personal server binary warnings in dev mode
Logs show warnings about "node_modules/ not found alongside binary" and "Personal server binary not found" before falling through to the dev binary. This is expected dev-mode behavior — `get_bundled_personal_server()` checks the debug target paths first, doesn't find node_modules there, and correctly falls through to the source tree at `personal-server/dist/`. The server starts fine. Could downgrade these to debug-level logs to reduce noise.
