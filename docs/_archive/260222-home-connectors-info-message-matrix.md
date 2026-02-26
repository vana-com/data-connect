# Home connectors info message matrix

Scope: `src/pages/home/components/available-sources-list.tsx` + `src/components/elements/source-row.tsx`.

This doc captures exactly what messaging the home connector cards show today.

## Connect-list connectors (current)

From `PLATFORM_REGISTRY` where `showInConnectList: true`:

- ChatGPT (`chatgpt`)
- Instagram (`instagram`)
- LinkedIn (`linkedin`)
- Spotify (`spotify`)

## Shared message rules (applies to each connector)

Card label (bottom-left):

- Always `Connect <DisplayName>` (stable; no status text injected).

Top-right line 1 (`infoSlot`):

1. If `run.phase.label` exists and is non-empty → show `run.phase.label`.
2. Else if `run.statusMessage` is empty/undefined → `Opening browser…`.
3. Else if status is exactly `Waiting for sign in...` or `Waiting for sign in…` → `Waiting for sign-in…`.
4. Else if status is exactly `Collecting data...` or `Collecting data…` → `Importing data…`.
5. Else → show raw `run.statusMessage`.

Top-right line 2 (`infoSlot`, optional):

1. If `run.exportData.userInfo.email` exists → `Using <email>`.
2. Else if `run.statusMessage` contains an email-like token (regex match) → `Using <matched-email>`.
3. Else → hidden (no second line).

Bottom-right indicator:

- `Spinner` when this connector is actively connecting/importing.
- `PauseIcon` when another connector is running and this one is otherwise available.
- `soon` badge when connector is not available (`comingSoon` state).
- Chevron arrow only when connector is available and no connector is currently running.

## Matrix by connector

All four connect-list connectors follow the same rendering rules. The only per-connector differences are display name and incoming run data.

| Connector | Card label | Line 1 while connecting | Line 2 while connecting | Bottom-right while connecting |
|---|---|---|---|---|
| ChatGPT | `Connect ChatGPT` | Shared rules above | Shared rules above | Spinner |
| Instagram | `Connect Instagram` | Shared rules above | Shared rules above | Spinner |
| LinkedIn | `Connect LinkedIn` | Shared rules above | Shared rules above | Spinner |
| Spotify | `Connect Spotify` | Shared rules above | Shared rules above | Spinner |

## Instagram worked examples

| `phase.label` | `statusMessage` | Line 1 | Line 2 |
|---|---|---|---|
| `Fetching profile` | `Collecting data...` | `Fetching profile` | _(none, unless email found)_ |
| _(empty)_ | `Waiting for sign in...` | `Waiting for sign-in…` | _(none, unless email found)_ |
| _(empty)_ | _(empty)_ | `Opening browser…` | _(none)_ |
| _(empty)_ | `Signed in as jane@brand.com` | `Signed in as jane@brand.com` | `Using jane@brand.com` |

## Follow-up recommendation

Line 2 should become first-class from connector events (for in-flight state), instead of regex fallback:

- Add `activeAccount?: string` on `Run`.
- Populate it from connector status payload in `useEvents`.
- Prefer `activeAccount` in `getConnectingAccountLine`.
