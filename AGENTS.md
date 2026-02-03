# DataBridge

Data Connect is software that enables users to interact with the Vana protocol. Analogous to an email client. This app (Databridge aka Data Connect) is the reference implementation. NOT a protocol participant (not registered on-chain). It may bundle a Personal Server; in that case the Personal Server (not the client) is the protocol participant and must be registered on-chain.

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

### Skills (JIT only)

Use skills only when the task matches; explore the code first.

- React code: explore project, then invoke vercel‑react‑best‑practices.
- Doc creation: follow .cursor/skills/doc-creation when creating/moving docs.
- CSS: invoke css skill when writing/adjusting CSS (non‑Tailwind).
- Tailwind: invoke tailwind skill when writing/adjusting Tailwind classes.
- UI audit: invoke ui-component-audit when asked to audit/fix UI implementation.
- Linear: invoke linear skill when asked to create/update tickets or statuses.
- Committing: invoke committing skill only when user explicitly asks to commit.
