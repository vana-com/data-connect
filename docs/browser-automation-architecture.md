# Browser Automation Architecture

## Problem

DataBridge uses browser automation (Playwright) to export user data from platforms like ChatGPT and Instagram. The challenge: **bundling Chromium increased app size from ~70MB to 605MB**.

This creates:
- Poor user experience (large download)
- Slow CI builds
- Storage concerns for users

## Options Evaluated

| Approach | App Size | Pros | Cons |
|----------|----------|------|------|
| **Bundle Chromium** | 605MB | Works offline, no setup | Huge download, updates bloat |
| **Use system Chrome** | 70MB | Zero extra download | Not all users have Chrome |
| **WebView (Tauri native)** | 70MB | Built-in, no extra deps | Limited automation APIs, bot detection |
| **Headless-only Chrome** | ~200MB | Smaller than full Chrome | Still large, no user interaction |
| **On-demand download** | 70MB + 160MB lazy | Small initial download | First-run delay for some users |

## Chosen Solution: Hybrid Approach

```
App Launch
    │
    ▼
┌─────────────────────────┐
│ Check for system browser │
│ (Chrome, Edge, Chromium) │
└───────────┬─────────────┘
            │
    ┌───────┴───────┐
    │               │
    ▼               ▼
 Found          Not Found
    │               │
    ▼               ▼
 Use it      Download Chromium
 (0 MB)         (~160 MB)
                    │
                    ▼
              Store in ~/.databridge/browsers/
              (persists across app updates)
```

### Detection Priority

1. **System Chrome** - `/Applications/Google Chrome.app` (macOS), `chrome.exe` (Windows)
2. **System Edge** - Pre-installed on Windows
3. **Downloaded Chromium** - `~/.databridge/browsers/`
4. **Auto-download** - Triggered on first run if nothing found

## Results

| Metric | Before | After |
|--------|--------|-------|
| App download | 605MB | 74MB |
| DMG size | ~160MB | 26MB |
| Users with Chrome | 605MB total | 74MB total |
| Users without Chrome | 605MB total | 74MB + 160MB (one-time) |

## User Experience

**First launch flow:**

1. App opens, shows "Setting up DataBridge..."
2. Checks for browser (~1 second)
3. If browser found → App loads immediately
4. If not found → Shows download progress bar (~160MB, ~30-60 seconds)
5. Browser stored permanently, never downloaded again

## Implementation

- **Rust backend**: `check_browser_available()`, `download_browser()` commands
- **React frontend**: `BrowserSetup.tsx` wrapper component
- **Playwright runner**: Uses `PLAYWRIGHT_BROWSERS_PATH` env var for browser location

## Trade-offs Accepted

1. **First-run delay** for users without Chrome (~1 min download)
2. **Requires internet** on first run if no browser installed
3. **~160MB disk space** in user's home directory (outside app bundle)

## Future Considerations

- Could add WebKit support (smaller, ~80MB) as fallback
- Could pre-download during install via optional installer checkbox
- Could use system WebView for simple connectors (login-only flows)
