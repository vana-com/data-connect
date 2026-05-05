# CLI + Personal Server Auth QA Plan

**Date:** 2026-03-23
**Audience:** QA testers with limited project context
**Goal:** Validate the launch auth flows for:

1. Cloud Personal Server login from the CLI
2. Self-hosted Personal Server login from the CLI
3. Logout, re-login, and expiry behavior
4. DataConnect regression coverage for the legacy local `devToken` flow

## Read This First

This plan is written to be safe to run against production if needed, but only if you follow these rules:

1. Use a dedicated QA account, not a founder or employee's personal account.
2. Prefer read-only and self-revoking tests in prod.
3. Do not restart shared production infrastructure.
4. Do not modify server-side config in prod.
5. Run the local self-hosted and DataConnect sections on your own machine, not against shared prod systems.

## Simple Glossary

- **Cloud Personal Server**: A managed server at a URL like `https://<wallet>.myvana.app`
- **Self-hosted Personal Server**: Your own server, usually local during QA, for example `http://localhost:8080`
- **DataConnect**: The desktop app. It still uses a local dev-only token path and is a regression check in this plan.
- **Auth file**: `~/.vana/auth.json`

## What Changed

You do not need to know the implementation details, but these are the behaviors this plan is verifying:

1. Cloud CLI login should get a fresh Personal Server session token at login time.
2. Self-hosted CLI login should use the Personal Server's `/auth/device` flow.
3. `vana logout` should revoke the active Personal Server token before deleting local credentials.
4. Expired credentials should force a fresh login.
5. DataConnect's old local `devToken` path should still work.

## Recommended Test Order

Run the cases in this order:

1. Cloud login smoke test
2. Cloud logout and re-login
3. Cloud expiry simulation
4. Self-hosted login
5. Self-hosted logout and expiry
6. DataConnect regression

## Environment Checklist

Before starting, confirm you have all of these:

### For cloud tests

1. A dedicated QA Vana account
2. A provisioned cloud Personal Server for that account
3. The account website URL to use for login
4. The expected Personal Server URL, or enough access to discover it during login

### For self-hosted tests

1. A local checkout of `personal-server-ts` on the `login-v2` branch/worktree
2. A local checkout of `vana-connect` on the `feat/cli-auth` branch
3. Node.js installed
4. `npm` and `pnpm` installed

### For DataConnect regression tests

1. A local checkout of `data-connect`
2. Rust installed
3. Tauri prerequisites already working on your machine

## One-Time Local Setup

If you already have a working CLI binary, you can skip this section and use `vana` directly.

### A. Build the CLI locally

```bash
cd ~/code/vana-connect
pnpm install
pnpm build
export VANA="node $(pwd)/dist/cli/bin.js"
$VANA --help
```

If you are using an installed binary instead, replace `$VANA` below with `vana`.

### B. Start a local self-hosted Personal Server

Open a new terminal:

```bash
cd ~/code/personal-server-ts/.claude/worktrees/login-v2
npm install
cp .env.example .env
npm run dev
```

Leave that terminal running.

In another terminal, confirm the server is up:

```bash
curl http://localhost:8080/health
```

### C. Start DataConnect locally

Only do this when you reach the DataConnect regression section:

```bash
cd ~/code/data-connect
npm install
npm run tauri:dev
```

## Test Case 1: Cloud Login From a Clean Machine

**Purpose:** Verify the normal cloud login flow.
**Where to run:** Prod or staging
**Prod-safe:** Yes, on a dedicated QA account

### Steps

1. Run:

```bash
$VANA logout
```

2. If `~/.vana/auth.json` still exists, delete it manually.
3. Run:

```bash
$VANA login
```

4. In the terminal, note the login URL and code.
5. Open the URL in your browser.
6. Log in with the dedicated QA account.
7. Enter the code if prompted.
8. Finish the approval flow in the browser.
9. Wait for the CLI to finish.
10. Open `~/.vana/auth.json` in a text editor.

### Pass If

1. The CLI reports a successful login.
2. The CLI shows a Personal Server URL.
3. `~/.vana/auth.json` exists.
4. `account.address` looks like a wallet address, for example `0x...`
5. `account.session_token` is non-empty.
6. `account.expires_at` is in the future.
7. `personal_server.url` is a `https://...myvana.app` URL.
8. `personal_server.access_token` is non-empty and starts with `vana_ps_`.
9. `personal_server.expires_at` is in the future.

## Test Case 2: Cloud Authenticated Smoke Check

**Purpose:** Verify the saved cloud credentials actually work.
**Where to run:** Prod or staging
**Prod-safe:** Yes

### Steps

1. Run:

```bash
$VANA status
```

2. Run:

```bash
$VANA server data
```

### Pass If

1. `vana status` shows the account as authenticated.
2. `vana status` shows the Personal Server URL.
3. `vana server data` succeeds.
4. `vana server data` may return an empty list if no data exists. That is okay.
5. You do not see an auth error or a prompt to log in again.

## Test Case 3: Cloud Logout Revokes the Token

**Purpose:** Verify logout removes local credentials and revokes the Personal Server token on the server.
**Where to run:** Prod or staging
**Prod-safe:** Yes, on a dedicated QA account

### Steps

1. Open `~/.vana/auth.json`.
2. Copy these two values somewhere temporary:
   - `personal_server.url`
   - `personal_server.access_token`
3. Before logging out, run this and note the HTTP status:

```bash
curl -i -H "Authorization: Bearer <PASTE_TOKEN_HERE>" <PASTE_SERVER_URL_HERE>/v1/data
```

4. The status before logout should be anything except `401`.
5. Run:

```bash
$VANA logout
```

6. Confirm `~/.vana/auth.json` no longer exists.
7. Run the same `curl` command again with the old token.
8. Run:

```bash
$VANA status
```

### Pass If

1. The old token works before logout.
2. `vana logout` succeeds.
3. The auth file is removed.
4. The old token returns `401` after logout.
5. `vana status` no longer shows you as authenticated.

## Test Case 4: Cloud Re-Login Issues a Fresh Personal Server Token

**Purpose:** Verify a new login gets a new CLI Personal Server token.
**Where to run:** Prod or staging
**Prod-safe:** Yes, on a dedicated QA account

### Steps

1. Save the old `personal_server.access_token` from Test Case 3 somewhere temporary.
2. Run:

```bash
$VANA login
```

3. Complete the browser flow again.
4. Open the new `~/.vana/auth.json`.
5. Compare the new `personal_server.access_token` with the old one.

### Pass If

1. Login succeeds.
2. The new token is different from the old token.
3. `vana status` and `vana server data` still work afterward.

## Test Case 5: Cloud Expiry Simulation

**Purpose:** Verify expired credentials force a fresh login.
**Where to run:** Prod or staging
**Prod-safe:** Yes, because this changes only your local auth file

### Steps

1. Open `~/.vana/auth.json` in a text editor.
2. Change both of these fields to a past date, for example `2025-01-01T00:00:00.000Z`:
   - `account.expires_at`
   - `personal_server.expires_at`
3. Save the file.
4. Run:

```bash
$VANA status
```

5. Run:

```bash
$VANA server data
```

6. Run:

```bash
$VANA login
```

7. Complete the login flow again.
8. Re-open `~/.vana/auth.json`.

### Pass If

1. After editing the file, the CLI behaves as unauthenticated or asks you to log in again.
2. After re-login, the auth file is recreated with future expiry timestamps.
3. `vana server data` works again after re-login.

## Test Case 6: Self-Hosted Login on the Same Machine

**Purpose:** Verify the self-hosted `/auth/device` login flow.
**Where to run:** Local only
**Prod-safe:** Not applicable

### Steps

1. Confirm the local Personal Server is running at `http://localhost:8080`.
2. Run:

```bash
$VANA logout
```

3. If `~/.vana/auth.json` still exists, delete it manually.
4. Run:

```bash
$VANA login --server http://localhost:8080
```

5. The CLI should print a local browser URL for approval.
6. Open that URL on the same machine.
7. On the page, confirm you see:
   - the server URL
   - the owner address
   - an `Approve` button
8. Click `Approve`.
9. Wait for the browser page to show success.
10. Wait for the CLI to finish.
11. Open `~/.vana/auth.json`.

### Pass If

1. The browser page says `Device authorized! You can close this tab.`
2. The CLI says `Logged in to http://localhost:8080`.
3. `account.address` looks like a wallet address and is not literally `http://localhost:8080`.
4. `account.session_token` is an empty string.
5. `personal_server.url` is `http://localhost:8080`.
6. `personal_server.access_token` is non-empty and starts with `vana_ps_`.
7. `personal_server.expires_at` is in the future.

## Test Case 7: Self-Hosted Authenticated Smoke Check

**Purpose:** Verify the self-hosted token actually works after login.
**Where to run:** Local only
**Prod-safe:** Not applicable

### Steps

1. Run:

```bash
$VANA server data
```

2. Run:

```bash
$VANA status
```

### Pass If

1. `vana server data` succeeds.
2. `vana status` shows an authenticated state.
3. You do not see an auth failure.

## Test Case 8: Self-Hosted Logout Revokes the Token

**Purpose:** Verify self-hosted logout revokes the token server-side.
**Where to run:** Local only
**Prod-safe:** Not applicable

### Steps

1. Open `~/.vana/auth.json`.
2. Copy these two values somewhere temporary:
   - `personal_server.url`
   - `personal_server.access_token`
3. Before logout, run:

```bash
curl -i -H "Authorization: Bearer <PASTE_TOKEN_HERE>" <PASTE_SERVER_URL_HERE>/v1/data
```

4. The status before logout should be anything except `401`.
5. Run:

```bash
$VANA logout
```

6. Confirm `~/.vana/auth.json` is removed.
7. Run the same `curl` command again with the old token.

### Pass If

1. The old token works before logout.
2. The old token returns `401` after logout.
3. The auth file is removed.

## Test Case 9: Self-Hosted Expiry Simulation

**Purpose:** Verify expired self-hosted credentials force a fresh login.
**Where to run:** Local only
**Prod-safe:** Not applicable

### Steps

1. Log in again with:

```bash
$VANA login --server http://localhost:8080
```

2. Complete the approval flow.
3. Open `~/.vana/auth.json`.
4. Change both of these fields to a past date:
   - `account.expires_at`
   - `personal_server.expires_at`
5. Save the file.
6. Run:

```bash
$VANA status
$VANA server data
```

7. Run:

```bash
$VANA login --server http://localhost:8080
```

### Pass If

1. The CLI no longer treats the expired file as authenticated.
2. Re-login succeeds.
3. The recreated file contains future expiry timestamps.

## Test Case 10: Optional Self-Hosted Security Check

**Purpose:** Verify approval is restricted to localhost.
**Where to run:** Local or private test network only
**Prod-safe:** Do not run against shared prod infrastructure

### Steps

1. Start a fresh self-hosted login:

```bash
$VANA login --server http://localhost:8080
```

2. Copy the approval URL.
3. Try to open and approve it from a different machine, if you have one available.

### Pass If

1. Approval is rejected.
2. The response mentions that remote approval requires wallet authentication.
3. The original CLI remains waiting.

## Test Case 11: DataConnect Bundled Personal Server Regression

**Purpose:** Verify DataConnect's old local `devToken` flow still works.
**Where to run:** Local only
**Prod-safe:** Not applicable

### Steps

1. Start DataConnect locally with:

```bash
cd ~/code/data-connect
npm run tauri:dev
```

2. Sign in to the app if required.
3. Wait for the bundled Personal Server to start.
4. Open the `Settings` screen.
5. Go to the `Storage & Server` section.
6. Confirm the Personal Server appears healthy or running.
7. Go to the `App access` section in `Settings`.
8. Confirm the screen loads without an auth error.
9. Open the `Apps` page.
10. Switch to the `Connected Apps` tab.

### Pass If

1. The app does not show a Personal Server auth error.
2. The `Connected Apps` tab loads.
3. If there are no connected apps, an empty state is okay.
4. The page should not stay stuck on `Loading...` forever.

## Test Case 12: Optional DataConnect Grant Flow Regression

**Purpose:** Verify a real DataConnect grant flow still works end to end.
**Where to run:** Local only
**Prod-safe:** Not applicable

### Steps

1. Use a known working builder or grant link.
2. Open the grant flow in DataConnect.
3. Walk through the consent screen.
4. Click `Allow`.
5. Finish the flow and return to the app.
6. Re-open `Apps` or `Settings > App access`.

### Pass If

1. The consent flow completes successfully.
2. No Personal Server auth error appears.
3. The granted app appears in the connected apps list.

## Fast Failure Guide

If a test fails, this usually means:

1. `vana login` succeeds but `vana server data` returns `401`
   - token provisioning or token lookup is broken
2. The old token still works after `vana logout`
   - server-side revoke is broken
3. Self-hosted login stores `http://localhost:8080` as `account.address`
   - self-hosted poll response is wrong or the CLI saved the wrong field
4. Expired `auth.json` still works
   - expiry handling is broken
5. DataConnect cannot load connected apps
   - the old local `devToken` path regressed

## Suggested QA Report Format

Copy this template into your notes:

```text
Environment:
- Prod / staging / local
- CLI source build or installed binary
- Personal Server URL:
- Account used:

Results:
- TC1 Cloud login: pass / fail
- TC2 Cloud smoke: pass / fail
- TC3 Cloud logout revoke: pass / fail
- TC4 Cloud re-login new token: pass / fail
- TC5 Cloud expiry: pass / fail
- TC6 Self-hosted login: pass / fail
- TC7 Self-hosted smoke: pass / fail
- TC8 Self-hosted logout revoke: pass / fail
- TC9 Self-hosted expiry: pass / fail
- TC10 Self-hosted remote approval: pass / fail / skipped
- TC11 DataConnect regression: pass / fail
- TC12 DataConnect grant flow: pass / fail / skipped

Notes:
- Exact failing command or screen:
- Exact error message:
- Can it be reproduced:
- Screenshot or log path:
```
