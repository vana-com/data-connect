## Build & Run (apps/vault)

This file is **operational only**: commands and minimal guardrails that enable
fast loopback/backpressure.

### Validation (minimal "prevent nonsense")

- **Typecheck**: `npx tsc -b`
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Test**: `npm run test` (uses happy-dom; jsdom broken by html-encoding-sniffer@6.0.0 ESM issue)
- **Test (subset)**: `npx vitest run src/path/to/test.ts` (runs specific test files)
- **Vitest OOM guard (Node 22)**: if a subset intermittently hits worker heap OOM, rerun with `--maxWorkers=1` for deterministic local validation.
- **Tauri Rust tests with auth resources**: run `npm run auth:build` first if `cargo test --manifest-path src-tauri/Cargo.toml` fails with `glob pattern auth-page/* path not found`.

### Preferred CLI tools (small quality-of-life)

- Prefer `bat` over `cat` (fallback: `cat`)
- Prefer `fd` over `find` (fallback: `find`)
- Prefer `eza` over `ls` (fallback: `ls`)

