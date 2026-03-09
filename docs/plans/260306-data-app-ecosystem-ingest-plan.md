# 260306-data-app-ecosystem-ingest-plan

Use this template as a one doc in two modes:

- Start with Strategy Lock only.
- Don't implement until lock is stable.
- Then continue in the same file into Execution Contract.
- If strategy changes later, update Strategy delta section (same file).

## Strategy Lock (decide before implementation)

### Goal

Move app-submission content out of `docs/`, ingest same-repo markdown submissions into the app registry with `gray-matter`, and replace the placeholder card flow on `/apps` with a real card component driven by registry data.

### Scope

- In scope:
  - Move the submission guide and template to an `ecosystem/` directory.
  - Add markdown submission ingestion via `import.meta.glob()` + `gray-matter` + `zod`.
  - Feed submission markdown into `src/apps/registry.ts`.
  - Replace the current placeholder app-card path with a new `AppCard` based on the existing page JSX shell.
  - Update focused tests and page docs.
- Out of scope:
  - Separate catalog repo.
  - Moderation workflows beyond merge == approval.
  - GitHub Actions or deploy-preview automation.

### Invariants (must remain true)

- Data invariants:
  - Merged markdown submissions are valid `AppRegistryEntry` values or fail fast.
  - `_template.md` must never render as an app.
- State/lifecycle invariants:
  - Local preview of an unmerged submission must work by adding/editing a local markdown file and running the app.
  - The existing external app-open flow keeps using canonical grant params.
- Security/reliability invariants:
  - Invalid merged submission metadata must fail loudly during app startup/build rather than silently rendering bad data.
  - The GitHub submission flow remains repo-local and low-surface-area.

### Dependencies

List external dependencies and classify each:

| Dependency | Status (`HARD BLOCKED`/`SOFT BLOCKED`/`UNBLOCKED`) | Owner | Target date | Notes |
| ---------- | -------------------------------------------------- | ----- | ----------- | ----- |
| `gray-matter` | `UNBLOCKED` | agent | 2026-03-06 | Needed for markdown frontmatter parsing. |
| Vite `import.meta.glob` raw imports | `UNBLOCKED` | repo | 2026-03-06 | Build-time ingestion path for local markdown files. |
| Existing `zod` dependency | `UNBLOCKED` | repo | 2026-03-06 | Validate frontmatter into registry shape. |

### Approach

- Chosen approach:
  - Use `ecosystem/app-submissions/*.md` as the contributor-facing intake surface.
  - Parse those markdown files at build time with `import.meta.glob(..., { eager: true, query: "?raw" })`.
  - Validate frontmatter with `zod` and map it into `AppRegistryEntry`.
  - Keep hardcoded curated entries for now and append markdown-driven entries.
  - Move one real app (`rickroll`) into markdown so the ingest path is exercised end-to-end immediately.
  - Replace the current app card component with a new card that reuses the existing `/apps` placeholder-card visual structure.
- Rejected alternatives (and why):
  - Generate a registry file with a separate script: more moving parts than needed right now.
  - Keep submission content in `docs/`: wrong audience boundary.
  - Keep the existing `AppCard`: user explicitly rejected the current design direction.

### Replan triggers

- Trigger 1: Vite raw markdown ingestion proves unreliable in tests or production builds.
- Trigger 2: Submission metadata grows enough that markdown frontmatter becomes too awkward to maintain.

## Execution Contract (mechanical handoff)

### Ordered implementation steps

1. Add the new docket and install `gray-matter`.
2. Move submission guide/template into `ecosystem/` and update links/PR template paths.
3. Add markdown-ingest registry code and a real sample submission file.
4. Replace the page placeholder app-card path with the new `AppCard`.
5. Update focused tests, run them, and record the results here.

### Mandatory file edit contract

| File | Required change | Status (`PASS`/`NO-OP`/`FAIL`) | Evidence |
| ---- | --------------- | ------------------------------ | -------- |
| `docs/plans/260306-data-app-ecosystem-ingest-plan.md` | Record strategy, execution steps, and verification evidence | `PASS` | This docket is the execution ledger. |
| `package.json` | Add `gray-matter` dependency | `PASS` | Installed `gray-matter` via `npm install gray-matter` and updated lockfile. |
| `src/config/links.ts` | Point submission guide link at `ecosystem/` path | `PASS` | `LINKS.appSubmissionGuide` now targets `ecosystem/submit-data-app.md` on GitHub. |
| `ecosystem/submit-data-app.md` | Add ecosystem submission guide with local preview instructions | `PASS` | Guide now explains local preview via `npm run dev` and the repo-local GitHub flow. |
| `ecosystem/app-submissions/_template.md` | Add frontmatter-based submission template | `PASS` | Added machine-readable frontmatter plus freeform markdown notes. |
| `ecosystem/app-submissions/rickroll.md` | Add one real markdown-driven submission entry | `PASS` | Added `rickroll.md` as the live reference submission for end-to-end ingest. |
| `.github/PULL_REQUEST_TEMPLATE/data-app-submission.md` | Update checklist/paths to `ecosystem/` | `PASS` | PR checklist now points contributors at `ecosystem/app-submissions/`. |
| `src/apps/registry.ts` | Merge curated entries with markdown-driven entries | `PASS` | Registry now combines curated entries with `getSubmittedAppRegistryEntries()` and rejects duplicate ids. |
| `src/apps/submission-registry.ts` | Parse and validate markdown submissions | `PASS` | Added `gray-matter` + `zod` parsing with `_template.md` exclusion. |
| `src/pages/data-apps/components/AppCard.tsx` | Replace card implementation with one based on current page JSX | `PASS` | Rebuilt `AppCard` using the placeholder-card shell and footer treatment from the page. |
| `src/pages/data-apps/index.tsx` | Render real app cards instead of placeholder filler cards | `PASS` | Page now renders the builder CTA plus registry-backed cards via `AppCard`. |
| `src/pages/data-apps/index.test.tsx` | Update page test coverage for real registry-backed cards | `PASS` | Added assertions for registry-backed cards and updated link assertions for the ecosystem guide. |
| `src/apps/submission-registry.test.ts` | Add focused parsing tests | `PASS` | Added tests for valid parsing, template exclusion, and live-app validation failure. |
| `src/pages/data-apps/README.md` | Update page docs for ecosystem submissions + registry ingest | `PASS` | README now documents the ingest path and local-preview behavior. |

Rules:

- `PASS`: required change implemented.
- `NO-OP`: verified no matching change needed at execution time.
- `FAIL`: required change missing/unclear.

### Verification commands

List exact commands (not paraphrases):

```bash
npx vitest run src/apps/submission-registry.test.ts src/pages/data-apps/index.test.tsx
```

### Gate checklist (all required)

- [x] Code-path gates passed
- [x] Behavior/runtime gates passed
- [x] Build/test/lint gates passed
- [x] CI/release gates passed (if applicable)
- [x] Fresh-clone gate passed (if applicable)

### PR evidence table

| Gate | Command/evidence | Expected | Actual summary | Status |
| ---- | ---------------- | -------- | -------------- | ------ |
| Focused ingest + page tests | `npx vitest run src/apps/submission-registry.test.ts src/pages/data-apps/index.test.tsx` | Passes with markdown ingestion and page rendering assertions | Passed: `9` tests green across ingest parsing and `/apps` page rendering | `PASS` |

### Done criteria

1. No `FAIL` rows in file contract or gate table.
2. All required gates are `PASS`.
3. Scope boundaries remained intact (or strategy delta recorded).

### Strategy delta (only if needed)

No strategy delta yet.
