# DataBridge

Software that enables users to interact with the protocol. Analogous to an email client. The Vana Desktop App is the reference implementation. NOT a protocol participant (not registered on-chain). It may bundle a Personal Server; in that case the Personal Server (not the client) is the protocol participant and must be registered on-chain.

## Git Workflow
**Commit only** - Do not push changes unless explicitly asked. Just commit locally.


## Source of Truth

For architecture and protocol details, refer to:
`../vana-product-interrogator/data-portability-v1/260121-data-portability-protocol-spec.md`

## Architecture

```
┌─────────────────────────────────────────┐
│        React Frontend (TypeScript)      │
│  Vite + Redux + TailwindCSS + Router    │
└──────────────────┬──────────────────────┘
                   │ Tauri IPC
┌──────────────────▼──────────────────────┐
│         Tauri/Rust Backend              │
│  Commands, file ops, subprocess mgmt    │
└──────────────────┬──────────────────────┘
                   │ stdin/stdout JSON
┌──────────────────▼──────────────────────┐
│     Playwright Runner (Node.js)         │
│  Standalone binary + bundled Chromium   │
└─────────────────────────────────────────┘
```

Delivery Estimates: https://linear.app/vana-team/document/data-portability-v1-delivery-estimates-a00639b10979