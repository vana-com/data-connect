# DataBridge

A lightweight desktop app for exporting your personal data from various platforms. Built with Tauri v2 (Rust + React).

## Features

- **Lightweight** - ~7MB app size (uses native webviews, no bundled Chromium)
- **Plugin-based connectors** - Each platform is a standalone JS file
- **Privacy-first** - All data stays on your machine
- **Cross-platform** - macOS, Windows, Linux (macOS tested)

## Supported Platforms

| Platform | Status |
|----------|--------|
| ChatGPT | Working |
| Instagram | In Progress |

## Architecture

```
databridge/
├── src-tauri/           # Rust backend
│   └── src/
│       ├── commands/    # Tauri IPC commands
│       │   ├── connector.rs   # Webview management
│       │   ├── download.rs    # File downloads
│       │   └── file_ops.rs    # Data persistence
│       └── processors/  # Data processors (ZIP, JSON parsing)
├── src/                 # React frontend
│   ├── pages/           # Home, Platform views
│   ├── hooks/           # useConnector, usePlatforms
│   └── state/           # Redux store
└── connectors/          # Platform connectors (JS)
    ├── openai/
    │   └── chatgpt.js
    └── meta/
        └── instagram.js
```

### What runs where

| Layer | Technology | Responsibility |
|-------|------------|----------------|
| **Backend** | Rust | Window management, downloads, file system, ZIP extraction |
| **Frontend** | React + Redux | UI, state management, user interactions |
| **Connectors** | JavaScript | Platform-specific export logic (injected into webviews) |

## Writing Connectors

Connectors are standalone JavaScript files that run inside a webview. They have access to a simple API:

```javascript
(async function() {
  const api = window.__DATABRIDGE_API__;

  // Log messages (shown in app UI)
  api.log('Starting export...');

  // Wait for elements
  await api.waitForElement('#login-button', 10000);

  // Report status
  api.sendStatus('DOWNLOADING');

  // Send data back to app
  api.sendStatus({ data: { posts: [...] } });
})();
```

### Connector Metadata

Each connector needs a JSON metadata file:

```json
{
  "id": "chatgpt",
  "name": "ChatGPT",
  "company": "OpenAI",
  "description": "Export your ChatGPT conversations",
  "url": "https://chatgpt.com",
  "icon": "chatgpt.svg"
}
```

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) 1.70+
- [Tauri CLI](https://v2.tauri.app/start/prerequisites/)

### Setup

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

### Project Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (frontend only) |
| `npm run tauri dev` | Start full app in development mode |
| `npm run tauri build` | Build production app |
| `npm run build` | Build frontend only |

## Data Storage

Exported data is saved to:

```
~/Library/Application Support/com.databridge.app/exported_data/
└── {company}/
    └── {platform}/
        └── {run-id}/
            └── {platform}_{timestamp}.json
```

## Tech Stack

- **[Tauri v2](https://v2.tauri.app/)** - Desktop app framework
- **[React](https://react.dev/)** - UI framework
- **[Redux Toolkit](https://redux-toolkit.js.org/)** - State management
- **[Vite](https://vitejs.dev/)** - Build tool
- **[Rust](https://www.rust-lang.org/)** - Backend

## License

MIT
