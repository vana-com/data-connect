# Connector Auth UX — Thinking Notes

This is a thinking memo, not an implementation plan and not a proposed final solution.

## Why this note exists

Question being explored:

- Could we avoid the connector browser-login friction by asking users for credentials directly?
- Could macOS Keychain improve this flow?
- What might create a breakthrough-level low-friction UX?

## Current behavior (confirmed from code)

- Connector auth is browser-session based, not app-managed username/password based.
- On first run, connector profiles are created under `~/.dataconnect/browser-profiles/{connector}`.
- Sessions are reused in future runs; connectors explicitly check login state and report "Session restored from previous login".
- Connector runs are user-triggered on demand right now.
- `exportFrequency` exists in connector metadata but is not wired to a scheduler in runtime.
- Settings exposes stored sessions (list + clear) in the credentials section.

Working interpretation: we currently persist browser session artifacts (cookies/storage/profile), not a first-class "credential vault" of raw platform passwords.

## macOS Keychain in current setup

- When system Chrome is used, the runner disables Playwright's mock keychain so Chrome can use the real macOS Keychain.
- Cookie import logic relies on Chrome reading encrypted cookie values with its own keychain material.

So Keychain is already in the flow indirectly via Chrome cookie handling. It is not currently used as an app-owned secret store for third-party platform usernames/passwords.

## Thinking: direct credential entry vs session-first

### Direct credential entry in-app

Potential upside:

- Familiar "connect account" mental model.
- Could reduce a step for some users in ideal cases.

Potential downside (likely dominant):

- Pushes us into handling raw credentials, MFA prompts, CAPTCHAs, challenge pages, and constant anti-automation churn.
- Increases blast radius and support complexity.
- Many target platforms are more stable when user completes a real browser login and we reuse session state.

Working thought: direct credential entry sounds cleaner but may create more breakage than it removes.

### Session-first model

Potential upside:

- Aligns with current architecture.
- Better compatibility with real-world auth hurdles.
- Lower legal/security surface than app-managed password storage.

Potential downside:

- Friction still appears whenever sessions expire or are challenged.

Working thought: session lifecycle quality (detect/repair/reuse) may be the real leverage point, not password collection.

## Keychain usage options (thinking only)

1. **Status quo + improve UX**
   - Keep browser-session model.
   - Improve preflight checks and recovery UX.

2. **Keychain for app-owned encryption keys, not platform passwords**
   - Store a local master key in Keychain.
   - Encrypt connector session artifacts at rest with that key.
   - Keep browser login flow unchanged.

3. **Keychain for raw connector credentials**
   - Store platform credentials in Keychain and attempt automated entry.
   - Highest complexity/risk path due to challenge handling and anti-bot pressure.

Current bias: option 1 or 2 is more robust than option 3.

## Friction hotspots worth studying further

- First successful connector auth (bootstrap moment).
- Session expiry/challenge recovery (why users get thrown back into interactive login).
- Ambiguous errors that force users to guess whether to retry, clear session, or re-login.
- Repeated context switching between connect and grant stages.

## Breakthrough hypotheses

These are hypotheses to test, not recommendations:

- The best UX win may come from making interactive login extremely rare, rather than replacing it.
- A "session health" layer (valid/stale/challenged/expired) might matter more than a "credential entry" layer.
- If most runs can remain headless and only fail into precise recovery prompts, perceived friction drops dramatically.
- A central session control surface (inspect + repair + explain) may outperform hidden magic.

## Open questions

- What percentage of runs currently reuse session successfully vs require user re-login?
- Which connectors have the highest challenge/expiry rate?
- Is there a user segment that explicitly prefers "enter credentials once" despite reliability tradeoffs?
- If recurring imports are introduced, what reauth policy avoids silent failure loops?

## Grounding references

- `playwright-runner/index.cjs`
- `connectors/linkedin/linkedin-playwright.js`
- `connectors/openai/chatgpt-playwright.js`
- `connectors/spotify/spotify-playwright.js`
- `connectors/meta/instagram-playwright.js`
- `src/hooks/useConnector.ts`
- `src-tauri/src/commands/connector.rs`
- `src/pages/settings/components/settings-credentials.tsx`
- `docs/architecture.md`
- `docs/_archive/260203-grant-connect-flow.md`
