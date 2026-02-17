# DataConnect

Data Connect is software that enables users to interact with the Vana protocol. Analogous to an email client. This app (DataConnect aka Data Connect) is the reference implementation. NOT a protocol participant (not registered on-chain). It may bundle a Personal Server; in that case the Personal Server (not the client) is the protocol participant and must be registered on-chain.

## Architecture (Source of Truth)

Start here (core docs): `docs/260121-data-portability-protocol-spec.md`, `docs/architecture.md`, `docs/260203-grant-connect-flow.md`.

DataConnect is the protocol client: it runs connectors, orchestrates grants, and configures the Personal Server (the on-chain participant). Grant flow inputs are canonical in the URL (`sessionId`, `appId`, `scopes`), never `location.state`.

## Doc index (preferred for knowledge)

[Doc Index]|root: ./docs
|IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning
|docs:{260121-data-portability-protocol-spec.md,architecture.md,260203-grant-connect-flow.md,browser-packaging-options.md,privy-js-sdk-documentation.md}

## Agent guidance

### Always‑on rules

- Prefer retrieval‑led reasoning for project‑specific knowledge.
- Don’t overwrite comments; don’t change styles/classes unless asked.
- When I report a bug, don't start by trying to fix it. Instead, start by writing a test that reproduces the bug. Then, have subagents try to fix the bug and prove it with a passing test.
- Commit only when asked; never push; stage explicit paths only (no `git add .`, `-A`, `-u`, `git commit -a`); run relevant tests before commit.
- For links/actions that open URLs or local file/folder paths, use shared helpers in `src/lib/open-resource.ts` and `src/lib/tauri-paths.ts`; avoid inline runtime/OS branching in page components.
- For routes in `src/pages/*`, keep `index.tsx` as entry/composition (params, guards, wiring) and move side effects/async orchestration into a page-local hook (`use-<page>-*.ts`).
- If behavior branches by runtime capability (for example Tauri vs browser), add at least one test per branch before commit.

### Skills (JIT only)

Use skills only when the task matches; explore the code first.

- React code: explore project, then invoke vercel‑react‑best‑practices.
- Doc creation: follow .cursor/skills/doc-creation when creating/moving docs.
- CSS: invoke css skill when writing/adjusting CSS (non‑Tailwind).
- Tailwind: invoke tailwind skill when writing/adjusting Tailwind classes.
- ShadCN import: invoke tailwind-shadcn-adaptation for primitives.
- ShadCN semantics: invoke shadcn-primitives-wrappers for product wrappers.
- UI audit: invoke ui-component-audit when asked to audit/fix UI implementation.
- Text usage edits: when changing usage of `src/components/typography/text.tsx`, read ui-component-audit first (soft default; use judgment).
- Testing: invoke react-testing when writing/running tests or before commit.
- Linear: invoke linear skill when asked to create/update tickets or statuses.
- Committing: invoke committing skill only when user explicitly asks to commit.
