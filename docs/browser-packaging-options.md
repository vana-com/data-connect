# Browser Packaging Options for DataConnect

## Current Approach: Lazy-Load Chromium

**What we do now:**
- App ships without a browser (~50MB installer)
- On first connector run, checks for system Chrome/Edge
- If none found, downloads Chromium (~160MB) on-demand
- Chromium stored in app data folder, reused for future runs

**Pros:** Small initial download, uses existing browser when available
**Cons:** First-run delay if no system browser, requires internet

---

## Alternatives Considered

### 1. Bundle Chromium in Installer
- **Size:** +160MB to installer (total ~210MB)
- **Pros:** Works offline immediately, no first-run surprise
- **Cons:** Large download for users who have Chrome, slower CI builds

### 2. Bundle Playwright with Chromium
- **Size:** +200MB (Playwright + browser)
- **Note:** Playwright itself doesn't add much - it's the browser that's large
- Same trade-offs as option 1

### 3. WebView-based (no Chromium)
- **Size:** No additional size
- **Pros:** Uses OS webview (WebKit on Mac, WebView2 on Windows)
- **Cons:** Inconsistent behavior across platforms, limited automation APIs, can't match Playwright's reliability

### 4. Headless-only Chromium
- **Size:** ~100MB (slightly smaller)
- **Pros:** Smaller than full Chromium
- **Cons:** User can't see what's happening, harder to debug, worse UX for auth flows

---

## Why Playwright?

- **Reliability:** Best-in-class for browser automation
- **Auth handling:** Users can log in visually when needed
- **Cross-platform:** Same code works on Mac/Windows/Linux
- **Maintenance:** Active development, frequent updates

---

## Recommendation

**Keep current lazy-load approach** with UX improvements:
1. Show clear "Downloading browser..." progress on first run
2. Add browser status in Settings for transparency
3. Consider optional "pre-download" button in Settings

This balances small installer size for most users (who have Chrome) with full functionality for those who don't.
