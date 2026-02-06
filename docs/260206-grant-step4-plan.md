---
title: Grant + Connect Step 4 (Success + Return)
date: 2026-02-06
---

# Grant + Connect Step 4 (Success + Return)

## Context

- Step 3 happens in an external browser (Vana Passport auth).
- Step 4 is back in Data Connect and should confirm success + guide next action.

## Goals

- Return the user to Data Connect after Passport auth.
- Confirm success with clear, confident copy.
- Make the “what happens next” obvious.
- Provide a fallback path if the deep link fails.

## Success return (deep link)

### Expected redirect after Passport auth

- Passport success redirects to a deep link handled by Data Connect.
- Example (prod): `dataconnect://?sessionId=...&appId=...&scopes=...&status=success`
- Example (dev): `http://localhost:<port>/grant?sessionId=...&appId=...&scopes=...&status=success`

### Data Connect handling

- Parse the deep link URL params (`status=success` triggers Step 4).
- Confirm the grant is complete for `sessionId` + `appId`.
- Navigate to Step 4 success UI (replace history).
- Optional: persist a “last completed grant” entry for audit/UX.

## Step 4 UI content

- Success state headline: “Access granted” or “Connection complete”.
- Context line: “You just granted <app> access to <data source>.”
- Primary CTA: “Return to <app>” (opens external app URL).
- Secondary CTA: “View connected apps”.
- Quiet hint: “You can close the browser tab.”

## Fallbacks (when deep link fails)

- Show a browser success page with a big “Open Data Connect” button.
- Display the deep link URL as a copyable fallback.
- If the app is already open, warn the user to focus it.

## UX smoothing ideas (apply here even if Step 3 owns it)

- Use a short “returning you to Data Connect…” bridge page.
- Offer a universal link (https) that hands off to the app if installed.
- Auto-open the external app after success (return CTA).
- Keep external tab minimal and dismissible.
- Echo the goal: “This grants <app> access to your data in Vana.”

## Open questions

- Do we want Step 4 to auto-open the external app after a short delay?
- Should Step 4 include a “disconnect” or “manage access” link?
