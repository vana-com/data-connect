# DataBridge

Desktop app for exporting your data from various platforms.

## Installation

Download the latest release from [Releases](../../releases).

### macOS

The app is not code-signed yet. After installing, run:

```bash
xattr -cr /Applications/DataBridge.app
```

Then open the app normally.

### Windows

Run the `.exe` installer and follow the prompts.

### Linux

Use the `.deb` or `.AppImage` package.

## Browser Requirements

DataBridge uses browser automation to export your data. On first launch:

1. **If you have Chrome/Edge installed:** The app uses your existing browser (recommended)
2. **If no browser is found:** The app downloads Chromium (~160 MB) automatically

The downloaded browser is stored in `~/.databridge/browsers/` and persists across app updates.

## Supported Platforms

| Platform | Status | Description |
|----------|--------|-------------|
| ChatGPT | ✅ | Export your conversation history |
| Instagram | ✅ | Export profile and posts (Playwright) |

## Development

### Prerequisites

- Node.js 20+
- Rust (latest stable)
- For Playwright connectors: `cd playwright-runner && npm install`

### Running locally

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Agent skills sync

Skills are stored in `.agents/skills` (source of truth). Cursor reads them via per-skill symlinks in `.cursor/skills`. The sync script rebuilds those symlinks so any manually created skills show up in Cursor.

```bash
# One-off sync (default is .cursor/skills)
npm run skills:sync

# Sync to Claude instead
npm run skills:sync -- --target=claude

# Auto-sync on changes
npm run skills:watch
```

### Building for production

```bash
# Build the playwright-runner binary first
cd playwright-runner
npm install
npx pkg index.js -t node20-macos-arm64 -o dist/playwright-runner

# Build the app
cd ..
npm run tauri build
```

The built app will be in `src-tauri/target/release/bundle/`.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    DataBridge App                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   React UI  │  │ Tauri/Rust  │  │ Playwright      │  │
│  │  (Frontend) │◄─►│  (Backend)  │◄─►│ Runner          │  │
│  └─────────────┘  └─────────────┘  └────────┬────────┘  │
└────────────────────────────────────────────┬┼───────────┘
                                             ││
                    ┌────────────────────────┘│
                    │                         │
              ┌─────▼─────┐           ┌───────▼───────┐
              │  System   │           │  Downloaded   │
              │  Chrome   │    OR     │   Chromium    │
              └───────────┘           └───────────────┘
```

### Browser Selection Priority

1. **System Chrome** - `/Applications/Google Chrome.app` (macOS)
2. **System Edge** - Available on Windows
3. **Downloaded Chromium** - `~/.databridge/browsers/`
4. **Auto-download** - If nothing found, downloads Chromium on first run

## Connectors

Connectors are JavaScript files that automate data export. Located in `connectors/`:

```
connectors/
├── openai/
│   ├── chatgpt.js       # ChatGPT connector
│   └── chatgpt.json     # Metadata
└── meta/
    ├── instagram-playwright.js
    └── instagram-playwright.json
```

### Creating a Connector

1. Create a folder under `connectors/{company}/`
2. Add a `.json` metadata file:
   ```json
   {
     "id": "my-connector",
     "name": "My Platform",
     "company": "Company",
     "description": "Exports your data",
     "connectURL": "https://example.com/login",
     "connectSelector": "selector-for-logged-in-state",
     "runtime": "playwright"
   }
   ```
3. Add a `.js` connector file using the page API

### Connector API (Playwright runtime)

```javascript
// Available in connector scripts:
page.goto(url)           // Navigate to URL
page.evaluate(script)    // Run JS in page context
page.sleep(ms)           // Wait for milliseconds
page.setData(key, value) // Send data back to app
page.promptUser(message, checkFn) // Wait for user action
```

## License

MIT
