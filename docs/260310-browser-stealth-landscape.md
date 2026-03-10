# Browser Stealth / Anti-Detection Landscape (March 2026)

## Why this matters

DataConnect connectors use Playwright to automate browser sessions. Anti-bot systems on target platforms can detect automation and block or CAPTCHA the session. Understanding the detection landscape informs tool choices and stealth strategy.

## Detection layers

Detection operates in four layers. Advanced systems (Cloudflare, DataDome, Akamai) cross-reference signals across all four.

### 1. TLS fingerprinting

Anti-bot systems fingerprint the TLS ClientHello **before any page loads or JS executes**. JA4+ (successor to JA3) is universally adopted by Cloudflare, AWS, and VirusTotal. A stock Node.js `fetch` or Python `requests` call has a completely different TLS fingerprint than Chrome — this is where most HTTP-only scrapers fail.

Browser automation tools (Playwright, Puppeteer, nodriver) use a real Chrome binary, so TLS fingerprints match real Chrome. This layer is not a problem for us.

### 2. CDP protocol artifacts

The **Runtime.Enable leak** is the single most important detection vector for Playwright/Puppeteer in 2026. When these tools send `Runtime.Enable` to manage execution contexts, side-effect callbacks fire that detection scripts observe. This is what Patchright and rebrowser-patches specifically target.

Other CDP artifacts: `$cdc_` DOM variables (chromedriver), WebSocket connection side effects.

### 3. Browser fingerprint signals

- `navigator.webdriver` flag (trivially patched but still checked)
- Canvas/WebGL: headless uses software rendering (no real GPU), producing detectable differences
- `window.outerWidth === window.innerWidth` (headless has no browser chrome, so these are equal)
- `navigator.plugins.length`, `window.chrome` object, system fonts, screen resolution

Chrome's `--headless=new` mode (default since 2022) closed most JS-level fingerprint gaps with headed mode. The remaining tells are canvas/WebGL software rendering and the missing window chrome dimensions.

### 4. Behavioral analysis

Mouse movement patterns, scroll behavior, typing cadence, inter-request timing. ML models combine behavioral signals with fingerprints from the other layers.

## Maintained tools

### Patchright
Playwright fork that patches detection vectors at the source level. Chromium only.

- Removes `--enable-automation`, suppresses `navigator.webdriver`
- Patches Runtime.Enable: executes JS in isolated ExecutionContexts instead
- Latest release: v1.58.0 (January 2026), actively maintained
- Auto-deploys new versions when upstream Playwright releases
- https://github.com/Kaliiiiiiiiii-Vinyzu/patchright

### rebrowser-patches
Patches applied on top of stock Puppeteer or Playwright (not a fork). Maintained by the Rebrowser commercial project.

- Core fix: disables automatic `Runtime.Enable` on every frame
- Two approaches: isolated world via `Page.createIsolatedWorld`, or enable-then-immediately-disable to catch context IDs before detection scripts observe them
- Claims undetectable by Cloudflare and DataDome in current tests
- Latest patch: v1.0.19 (Playwright 1.52.0 support). Repo updated Feb 2026
- https://github.com/rebrowser/rebrowser-patches

### Camoufox
Anti-detect browser built on Firefox. Patches fingerprint spoofing at the C++ engine level (not just JS overrides).

- Recovering from ~1-year maintenance gap (maintainer @daijro was hospitalized March 2025)
- Development resumed under CloverLabsAI. Latest: v146.0.1-beta.25 (January 2026) — experimental
- https://github.com/daijro/camoufox

### nodriver
Successor to undetected-chromedriver by the same author. No Selenium, no WebDriver binary, direct CDP over WebSocket.

- No `navigator.webdriver` flag because no WebDriver binary is involved
- Latest: v0.48.1 (November 2025). Alpha status. Python only
- https://github.com/ultrafunkamsterdam/nodriver

### Pydoll (emerging, February 2026)
Direct CDP communication with Chrome, no Playwright/Puppeteer dependency. Physics-based scrolling, humanized typing. 3,000+ GitHub stars quickly. Worth watching.

- https://github.com/autoscrape-labs/pydoll

### FlareSolverr — effectively dead
Deprecated, no longer actively maintained. Last version: 3.4.5. **Byparr** is the consensus drop-in replacement (API-compatible, actively maintained). A **Byparr-nodriver** variant also exists.

## Relevance to DataConnect

### Current position
DataConnect uses stock Playwright with persistent browser profiles. Session persistence (cookies saved across runs) is our primary stealth strategy — users typically log in once, and subsequent runs reuse the session without triggering login/CAPTCHA flows.

### Headless vs headed
Switching to headed mode does **not** meaningfully improve stealth in 2026. The detection gap is mostly closed in Chrome's new headless mode. The remaining detection targets CDP artifacts and behavioral signals — neither of which change by switching to headed.

This validates the headless-first architecture: there's no stealth reason to prefer headed mode.

### Potential improvements (not yet implemented)
1. **Patchright or rebrowser-patches** — patching the Runtime.Enable leak would reduce CAPTCHA frequency on platforms using Cloudflare/DataDome. Patchright is the easier integration (drop-in Playwright replacement). rebrowser-patches would let us stay on stock Playwright.
2. **Behavioral humanization** — randomized delays, mouse movement, typing cadence. Low priority until we see detection at this layer.
3. **Camoufox** — Firefox-based approach avoids Chrome CDP artifacts entirely. Would require significant runner changes. Not recommended short-term.

### What we should NOT do
- Ship a custom Chrome build or maintain browser patches ourselves — the maintenance burden is high and the tools above handle it better.
- Rely on headed mode as a stealth strategy — the detection landscape has moved past this.
- Attempt to bypass CAPTCHAs programmatically at scale — this violates platform ToS and is an arms race we don't want to enter. Session persistence is the right approach.
