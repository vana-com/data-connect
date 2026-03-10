# Headless-First Playwright Runner

## Motivation

The playwright-runner currently handles login by closing the headless browser and relaunching Chrome in headed mode so the user can visually enter credentials. This breaks in three scenarios:

1. **Headless VPS / cloud deployments** — no display server available.
2. **Remote agent drivers** — the agent can't see or interact with a headed Chrome window.
3. **Desktop users** — popping up a Chrome window is jarring; users would rather type credentials in the app.

This spec describes the protocol changes and connector patterns that make headless the default execution mode, with headed as an explicit fallback for cases that require visual interaction (e.g., drag-puzzle CAPTCHAs).

## Protocol changes

### `evaluate` command (implemented)

The driver can execute arbitrary JS in the active browser page while a connector is running.

**stdin (driver → runner):**
```json
{"type": "evaluate", "runId": "run-123", "script": "document.querySelector('input').value"}
```

**stdout (runner → driver):**
```json
{"type": "evaluate-result", "runId": "run-123", "result": "user@example.com"}
```

On error:
```json
{"type": "evaluate-result", "runId": "run-123", "error": "Cannot read properties of null"}
```

### `requestInput` — connector requests data from the driver (implemented)

The runner is a pipe. It relays the connector's request to stdout and the driver's response back to the connector. It does not validate or interpret the payload in either direction.

The connector defines what it needs using a JSON Schema in the `schema` field. This is the same format used by OpenAI, Anthropic, and Google for LLM tool definitions — so agent drivers can handle it natively.

**Connector calls:**
```javascript
const { email, password } = await page.requestInput({
  message: 'Log in to ChatGPT',
  schema: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', format: 'password' }
    },
    required: ['email', 'password']
  }
});
```

**stdout (runner → driver):**
```json
{
  "type": "request-input",
  "runId": "run-123",
  "requestId": "input-1",
  "payload": {
    "message": "Log in to ChatGPT",
    "schema": {
      "type": "object",
      "properties": {
        "email": { "type": "string", "format": "email" },
        "password": { "type": "string", "format": "password" }
      },
      "required": ["email", "password"]
    }
  }
}
```

**stdin (driver → runner):**
```json
{
  "type": "input-response",
  "runId": "run-123",
  "requestId": "input-1",
  "data": {"email": "user@example.com", "password": "hunter2"}
}
```

`requestInput` resolves with `data`. If the driver sends an error, `requestInput` throws:

```json
{"type": "input-response", "runId": "run-123", "requestId": "input-1", "error": "User cancelled"}
```

The `schema` field is optional — a connector can send just `{ message: '...' }` if it only needs the driver to do something (e.g., solve a CAPTCHA via `evaluate`) and doesn't need structured data back.

**No timeouts.** The runner does not enforce timeouts on `requestInput`. The driver can send an error response to unblock the connector at any time. A default timeout would create bad UX (e.g., "you took too long to type your password"). Connectors that want timeouts can implement them.

### Runner implementation

Added to `createPageApi`:

```javascript
requestInput: async (payload) => {
  const requestId = `input-${++runState.requestCounter}`;
  send({
    type: 'request-input',
    runId,
    requestId,
    payload
  });

  return new Promise((resolve, reject) => {
    runState.pendingInputs = runState.pendingInputs || new Map();
    runState.pendingInputs.set(requestId, { resolve, reject });
  });
}
```

Stdin handler:

```javascript
case 'input-response': {
  const run = activeRuns.get(cmd.runId);
  if (!run) break;
  const pending = run.runState.pendingInputs?.get(cmd.requestId);
  if (!pending) break;
  run.runState.pendingInputs.delete(cmd.requestId);
  if (cmd.error) {
    pending.reject(new Error(cmd.error));
  } else {
    pending.resolve(cmd.data);
  }
  break;
}
```

### `screenshot` command (implemented)

The driver can take a JPEG screenshot of the active browser page. Also available to connectors via `page.screenshot()`. Uses JPEG at quality 70 to keep payloads small (typically 100-300 KB vs 3-10 MB for PNG).

**stdin (driver → runner):**
```json
{"type": "screenshot", "runId": "run-123"}
```

**stdout (runner → driver):**
```json
{"type": "screenshot-result", "runId": "run-123", "data": "<base64-encoded JPEG>"}
```

On error:
```json
{"type": "screenshot-result", "runId": "run-123", "error": "Browser is closed"}
```

Connectors can use `page.screenshot()` to capture the page and include it in a `requestInput` payload (e.g., for CAPTCHA solving):

```javascript
const image = await page.screenshot();
const { solution } = await page.requestInput({
  message: 'Solve this CAPTCHA',
  schema: {
    type: 'object',
    properties: { solution: { type: 'string' } },
    required: ['solution']
  },
  image // base64 JPEG — driver can display or feed to a solver
});
```

## Runner behavior changes

### `allowHeaded` capability flag (implemented)

The `run` command accepts a new `allowHeaded` field (default: `true`). This is a driver capability declaration, not a connector decision:

- **Tauri desktop app:** `{ headless: true, allowHeaded: true }` — starts headless, but `showBrowser` can switch to headed for CAPTCHAs
- **Cloud/agent driver:** `{ headless: true, allowHeaded: false }` — headless only, `showBrowser` stays headless

### `showBrowser(url)` — capability-gated (implemented)

When `allowHeaded` is true: existing behavior, switches to headed mode.

When `allowHeaded` is false:
- Does not crash or kill the session.
- Navigates to the URL in the existing headless browser.
- Returns `{ headed: false }` so the connector can adapt (e.g., skip visual CAPTCHA, retry later, report error).

When headed: returns `{ headed: true }`.

### `goHeadless()` — no-op when already headless

Already handled: `if (runState.headless && !runState.browserClosed) return`. Migrated connectors that never call `showBrowser` will never need `goHeadless` either, but it's safe to call.

## New connector pattern

The connector owns the login flow. It knows its platform's form structure, requests data via `requestInput` with a JSON Schema, and fills forms programmatically. The driver provides data; the runner relays it.

**Wrong credentials / retry** is the connector's responsibility — it can call `requestInput` again with an updated message.

### ChatGPT connector example (before/after)

**Before (headed-dependent):**
```javascript
if (!isLoggedIn) {
  await page.showBrowser('https://chatgpt.com/');
  await page.promptUser(
    'Please log in to ChatGPT...',
    async () => await checkLoginStatus(),
    2000
  );
  await page.goHeadless();
}
```

**After (headless-first):**
```javascript
if (!isLoggedIn) {
  await page.goto('https://chatgpt.com/');

  const { email, password } = await page.requestInput({
    message: 'Log in to ChatGPT',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', format: 'password' }
      },
      required: ['email', 'password']
    }
  });

  // Click "Log in" button
  await page.evaluate(`
    document.querySelector('button[data-testid="login-button"]')?.click()
    || Array.from(document.querySelectorAll('a, button'))
         .find(el => el.textContent?.toLowerCase().includes('log in'))?.click()
  `);
  await page.sleep(2000);

  // Fill email (Auth0/OpenAI login page)
  await page.evaluate(`document.querySelector('#email-input').value = ${JSON.stringify(email)}`);
  await page.evaluate(`document.querySelector('#email-input').dispatchEvent(new Event('input', {bubbles:true}))`);
  await page.evaluate(`document.querySelector('button[type="submit"]').click()`);
  await page.sleep(2000);

  // Fill password
  await page.evaluate(`document.querySelector('#password').value = ${JSON.stringify(password)}`);
  await page.evaluate(`document.querySelector('#password').dispatchEvent(new Event('input', {bubbles:true}))`);
  await page.evaluate(`document.querySelector('button[type="submit"]').click()`);
  await page.sleep(3000);

  // Handle 2FA if present
  const needs2fa = await page.evaluate(`!!document.querySelector('[name="code"], [name="totp"]')`);
  if (needs2fa) {
    const { code } = await page.requestInput({
      message: 'Enter your ChatGPT 2FA code',
      schema: {
        type: 'object',
        properties: { code: { type: 'string' } },
        required: ['code']
      }
    });
    await page.evaluate(`document.querySelector('[name="code"], [name="totp"]').value = ${JSON.stringify(code)}`);
    await page.evaluate(`document.querySelector('button[type="submit"]').click()`);
    await page.sleep(3000);
  }

  if (!await checkLoginStatus()) {
    throw new Error('Login failed after entering credentials');
  }
}
```

## CAPTCHA / headed fallback

Some anti-bot challenges (drag puzzles, click-coordinate CAPTCHAs) can't be relayed as structured data. The strategy:

1. **Detect the CAPTCHA.** Connector checks for known CAPTCHA selectors after navigation.
2. **Try structured first.** For text CAPTCHAs or simple image challenges, use `requestInput` with a screenshot attached to the payload. The driver shows it to the user inline or feeds it to a solver.
3. **Escalate to headed.** If the CAPTCHA requires live pointer interaction (drag, click-coordinates), the connector calls `showBrowser()`. On headless-only deployments this is a no-op — the connector should handle the failure (retry, wait, or report error).
4. **Reduce CAPTCHA frequency.** Session persistence already helps. Browser stealth improvements are tracked separately.

## Security

Credentials flow as plaintext JSON over stdin/stdout between local processes. This is not a meaningful escalation — connectors already have full access to the browser context (cookies, DOM, network responses). They literally scrape authenticated pages. The security boundary is access to the machine/container, not the pipe between runner and connector.

## Migration path

### Phase 1: Runner protocol (done)

- `evaluate` stdin command
- `screenshot` stdin command + `page.screenshot()` PageAPI
- `requestInput` / `input-response` protocol + `page.requestInput()` PageAPI
- `allowHeaded` capability flag
- `showBrowser()` capability-gated

### Phase 2: First connector migration

Convert one connector (e.g., ChatGPT) to headless-first:
- Replace `showBrowser` + `promptUser` login with `requestInput` + form filling.
- Keep `showBrowser` for CAPTCHAs only.
- Verify session persistence still works.

The Tauri app continues working as-is during this phase — existing connectors still use `showBrowser` + `promptUser`. The Tauri app only needs to handle `request-input` events when connectors are migrated.

### Phase 3: Remaining connectors

Each connector's login form is different, so each migration is connector-specific. The runner protocol is the same for all.

### Phase 4: Cloud driver

The cloud deployment responds to `request-input` from an agent or credential store instead of a Tauri UI modal. Same protocol — the connector doesn't know who's providing data.

## Browser stealth / anti-detection

Tracked separately. The headless vs headed fingerprint gap is closed in Chrome's new headless mode. Detection in 2026 targets CDP protocol artifacts, TLS fingerprinting, and behavioral signals — none of which are addressed by switching to headed mode.

See [browser stealth landscape](260310-browser-stealth-landscape.md) for the current tool landscape (Patchright, rebrowser-patches, Camoufox, nodriver).

## Backward compatibility

- `showBrowser` and `promptUser` still work. Existing connectors don't break.
- `requestInput` is additive — old connectors that don't call it are unaffected.
- The `headless` flag on the `run` command defaults to `true` (already the case).
- Headed mode remains available for CAPTCHAs and as a debug escape hatch.
