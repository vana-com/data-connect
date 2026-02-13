---
name: workflows-review-react-augment
description: Run upstream workflows-review unchanged, then add a React best-practices and composition-pattern review pass for UI changes. Use when the user asks for review/workflows-review and TSX/UI files are involved.
---

# Workflows Review React Augment

## Goal

Keep upstream `workflows-review` as the source of truth while adding a frontend lens for React quality.

## Non-negotiable execution contract

- This skill is only considered complete if all required review lenses are explicitly invoked and reported.
- Do not do an implicit/manual-only review when this skill applies.
- If any required lens cannot be run, state that explicitly before findings and mark the review as partial.

## Procedure

1. Run `workflows-review` first, unchanged.
2. Identify changed frontend files from the review target:
   - Prefer files in `src/pages/**`, `src/components/**`, `src/**/components/**`, `src/**/hooks/**`
   - Limit to `*.tsx` and related `*.ts` UI logic files
3. Explicitly invoke and run two additional review lenses:
   - `vercel-react-best-practices`
   - `vercel-composition-patterns`
4. Synthesize findings into the same report format/severity model used by `workflows-review`.

## Severity policy for augment findings

- P1: correctness/perf/a11y regressions or production risk.
- P2: maintainability/composition issues likely to cause defects.
- P3: optional cleanup and ergonomics improvements.

## Output additions

- Add a required `Skills/Lenses Invoked` section before findings:
  - `workflows-review`
  - `vercel-react-best-practices`
  - `vercel-composition-patterns`
- For each finding, include `source_lens` metadata (`workflows-review`, `react-best-practice`, or `composition-pattern`).
- Tag relevant findings with `react-best-practice` and/or `composition-pattern`.
- Avoid style-only nitpicks unless they impact correctness, accessibility, performance, or long-term maintainability.
