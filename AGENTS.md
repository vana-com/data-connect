# DataBridge

Data Connect is software that enables users to interact with the Vana protocol. Analogous to an email client. This app (Databridge aka Data Connect) is the reference implementation. NOT a protocol participant (not registered on-chain). It may bundle a Personal Server; in that case the Personal Server (not the client) is the protocol participant and must be registered on-chain.

## Architecture (Source of Truth)

For architecture and protocol details, refer to:
`docs/260121-data-portability-protocol-spec.md`

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

Key flows:
- Auth: Privy (optional) + browser login flow; `InlineLogin` listens for `auth-complete`.
- Exports: UI starts connector run → Rust → Playwright; Tauri events update Redux; exports persisted via `write_export_data`.
- Startup: `useInitialize` loads prior runs from disk.
- Browser setup: Chromium availability checks + download flow surfaced via `BrowserContext`.
- Connector updates: Rust checks/downloads; platforms reloaded after install.
- Storage: export files in user data dir; connected apps tracked in `localStorage`.

## Doc index (preferred for knowledge)
[Doc Index] | root: ./docs
| 260121-data-portability-protocol-spec.md
| 260130-react-refactor-plan.md
| browser-packaging-options.md
| ui-references/README.md

## Agent guidance

### Always‑on rules
- Commit only; never push unless asked.
- Commit is file-explicit only: stage specific paths, never `git add .`, `-A`, `-u`, or `git commit -a`. Ask if files are unclear.
- Prefer retrieval‑led reasoning for project‑specific knowledge.
- Don’t overwrite comments; don’t change styles/classes unless asked.

### Skills (JIT only)
Use skills only when the task matches; explore the code first.

- React code: explore project, then invoke vercel‑react‑best‑practices.
- Doc creation: follow .cursor/skills/doc-creation when creating/moving docs.
- CSS: invoke css skill when writing/adjusting CSS (non‑Tailwind).
- Tailwind: invoke tailwind skill when writing/adjusting Tailwind classes.
- Linear: invoke linear skill when asked to create/update tickets or statuses.
- Committing: invoke committing skill only when user explicitly asks to commit.