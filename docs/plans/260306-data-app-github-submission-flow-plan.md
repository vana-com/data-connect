# 260306-data-app-github-submission-flow-plan

Use this template as a one doc in two modes:

- Start with Strategy Lock only.
- Don't implement until lock is stable.
- Then continue in the same file into Execution Contract.
- If strategy changes later, update Strategy delta section (same file).

## Strategy Lock (decide before implementation)

### Goal

Replace the `Data Apps` page email submission CTA with a GitHub-native submission flow that feels more OSS-native for technical builders while preserving a low-friction fallback path.

### Scope

- In scope:
  - Replace the page CTA target and copy in `src/pages/data-apps/index.tsx`.
  - Add a GitHub submission guide doc.
  - Add a reusable markdown submission template for contributors.
  - Add a dedicated PR template for app submissions.
  - Update focused tests and local page docs.
- Out of scope:
  - Rendering live app submissions from repository content.
  - Any moderation/review automation.
  - Any GitHub Actions or CI automation around submissions.
  - Removing the email fallback entirely.

### Invariants (must remain true)

- Data invariants:
  - No existing app listing data shape is changed.
  - No new runtime data dependency is introduced for the page.
- State/lifecycle invariants:
  - The page remains static and client-light.
  - External navigation still uses the existing external-link pattern.
- Security/reliability invariants:
  - The submission flow must work for users without repo write access by relying on standard fork + PR behavior.
  - The flow must have a documented non-GitHub fallback.

### Dependencies

List external dependencies and classify each:

| Dependency | Status (`HARD BLOCKED`/`SOFT BLOCKED`/`UNBLOCKED`) | Owner | Target date | Notes |
| ---------- | -------------------------------------------------- | ----- | ----------- | ----- |
| GitHub new-file URL flow | `UNBLOCKED` | agent | 2026-03-06 | Use documented `new/<branch>?filename=...&value=...` browser-editor pattern. |
| GitHub PR template support | `UNBLOCKED` | agent | 2026-03-06 | Use `.github/PULL_REQUEST_TEMPLATE/data-app-submission.md`. |
| Existing email fallback | `UNBLOCKED` | repo | 2026-03-06 | Keep as fallback in docs; do not remove current mailto config. |

### Approach

- Chosen approach:
  - Point the page CTA at a repo-hosted submission guide on GitHub.
  - The guide explains the fork/edit/PR flow and offers a one-click "create submission file" GitHub link.
  - Store submission intake as markdown docs under `docs/app-submissions/` to keep contribution UX GitHub-friendly without pretending the app consumes those files yet.
  - Add a dedicated PR template so submission PRs use a structured review surface.
- Rejected alternatives (and why):
  - Direct page CTA to a raw PR URL: GitHub cannot create a usable PR until the contributor has a branch/fork with changes.
  - Require editing runtime registry/app code directly: worse contributor UX and couples intake to product code too early.
  - Replace everything with a GitHub issue form: less aligned with the requested OSS/PR-based workflow.

### Replan triggers

- Trigger 1: GitHub's new-file prefill flow proves unreliable enough to confuse contributors.
- Trigger 2: The team decides submissions should live in a separate catalog repo instead of this app repo.

## Execution Contract (mechanical handoff)

### Ordered implementation steps

1. Add the docketed docs and templates for the GitHub submission flow.
2. Wire the `Data Apps` CTA to the GitHub submission guide.
3. Update focused tests and page-local docs.
4. Run the scoped page test and record results here.

### Mandatory file edit contract

| File | Required change | Status (`PASS`/`NO-OP`/`FAIL`) | Evidence |
| ---- | --------------- | ------------------------------ | -------- |
| `docs/plans/260306-data-app-github-submission-flow-plan.md` | Record strategy, execution steps, and verification evidence | `PASS` | This docket captures both plan and execution evidence. |
| `src/config/links.ts` | Add GitHub submission guide link while preserving email fallback link | `PASS` | Added `LINKS.appSubmissionGuide`; kept `LINKS.appSubmissionEmail` unchanged for fallback use. |
| `src/pages/data-apps/index.tsx` | Replace email CTA target/copy with GitHub submission CTA | `PASS` | Header CTA now points to `LINKS.appSubmissionGuide` with copy `Submit via GitHub`. |
| `src/pages/data-apps/index.test.tsx` | Add/update coverage for the new submission link contract | `PASS` | Added a focused assertion for the GitHub submission link and updated stale protocol-link assertions. |
| `src/pages/data-apps/README.md` | Update page docs to reflect GitHub submission flow | `PASS` | README now documents the GitHub submission flow and notes that submissions are not runtime-driven yet. |
| `docs/submit-data-app.md` | Add contributor-facing submission guide | `PASS` | Added a guide with one-click GitHub editor link, manual flow, review criteria, and email fallback. |
| `docs/app-submissions/_template.md` | Add reusable markdown submission template | `PASS` | Added the reusable submission intake template under `docs/app-submissions/`. |
| `.github/PULL_REQUEST_TEMPLATE/data-app-submission.md` | Add dedicated app-submission PR template | `PASS` | Added dedicated PR checklist and submission fields for app submissions. |

Rules:

- `PASS`: required change implemented.
- `NO-OP`: verified no matching change needed at execution time.
- `FAIL`: required change missing/unclear.

### Verification commands

List exact commands (not paraphrases):

```bash
npx vitest run src/pages/data-apps/index.test.tsx
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
| Data Apps scoped test | `npx vitest run src/pages/data-apps/index.test.tsx` | Passes with updated CTA assertions | Passed: `5` tests green in `src/pages/data-apps/index.test.tsx` | `PASS` |

### Done criteria

1. No `FAIL` rows in file contract or gate table.
2. All required gates are `PASS`.
3. Scope boundaries remained intact (or strategy delta recorded).

### Strategy delta (only if needed)

No strategy delta yet.
