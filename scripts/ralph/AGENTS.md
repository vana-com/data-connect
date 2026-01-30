## Build & Run (apps/vault)

This file is **operational only**: commands and minimal guardrails that enable
fast loopback/backpressure.

### Validation (minimal "prevent nonsense")

- **Typecheck**: `npx tsc -b`
- **Build**: `npm run build`
- **Test**: `npm run test` (when tests exist for the task)

### Preferred CLI tools (small quality-of-life)

- Prefer `bat` over `cat` (fallback: `cat`)
- Prefer `fd` over `find` (fallback: `find`)
- Prefer `eza` over `ls` (fallback: `ls`)

