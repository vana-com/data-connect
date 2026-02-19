# DataConnect

Desktop app for exporting your data from various platforms.

## Installation

Download the latest release from [Releases](../../releases).

### macOS

The app is not code-signed yet. After installing, run:

```bash
xattr -cr /Applications/DataConnect.app
```

Then open the app normally.

### Windows

Run the `.exe` installer and follow the prompts.

### Linux

Use the `.deb` or `.AppImage` package.

## Browser Requirements

DataConnect uses browser automation to export your data. On first launch:

1. **If you have Chrome/Edge installed:** The app uses your existing browser (recommended)
2. **If no browser is found:** The app downloads Chromium (~160 MB) automatically

The downloaded browser is stored in `~/.dataconnect/browsers/` and persists across app updates.

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
npm run tauri:dev
```

### Connector lifecycle (important)

Connector files have two locations in dev:

- Repo source: `./connectors/`
- User runtime copy: `~/.dataconnect/connectors/`

How they get there:

- `npm install` runs `postinstall` -> `node scripts/fetch-connectors.js`
  - This can download/regenerate connector files into `./connectors/`.
- `npm run tauri:dev` runs `node scripts/sync-connectors-dev.js` first
  - This copies repo connectors into `~/.dataconnect/connectors/`.

Key point:

- `tauri:dev` syncs what already exists in `./connectors/`.
- It does not fetch missing repo connectors by itself.

If you deleted connector folders and need to recover:

```bash
node scripts/fetch-connectors.js
node scripts/sync-connectors-dev.js
npm run tauri:dev
```

Optional environment flags:

- `SKIP_CONNECTOR_FETCH=1` -> skip connector download in `postinstall`.
- `CONNECTORS_PATH=/path/to/local/connectors` -> skip remote fetch and use local connector source.

### Agent config files

This repo keeps both `AGENTS.md` and `CLAUDE.md`: Claude Code auto‑loads `CLAUDE.md` but not `AGENTS.md`, and Cursor does the opposite. Keep them aligned.

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

### Releasing

Releases are created via the release script, which bumps the version in `tauri.conf.json`, commits, pushes, and creates a GitHub release that triggers CI builds across all platforms.

```bash
# Check current and suggested versions
npm run release:github -- --show-versions

# Dry run to preview what will happen
npm run release:github -- --version X.Y.Z --dry-run

# Create a new release
npm run release:github -- --version X.Y.Z
```

> **Do not** create releases manually via `gh release create` or the GitHub UI — the CI workflow will fail if `tauri.conf.json` version doesn't match the release tag.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    DataConnect App                        │
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
3. **Downloaded Chromium** - `~/.dataconnect/browsers/`
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
