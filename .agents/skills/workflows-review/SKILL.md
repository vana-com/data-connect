---
name: workflows-review
description: Run the Compound Engineering review workflow locally using the upstream EveryInc review command text. Use when the user asks for workflows review, review gate behavior, or a multi-lens pre-merge review.
---

# Workflows Review

Use the upstream command text as the canonical process.

## Required source (verbatim mirror)

- Read `upstream-workflows-review.md` in this same skill directory.
- Follow it as-is for review flow, severity handling, and summary output.

## Local adaptation notes

- Treat references to slash commands (for example `/workflows:review`) as this skill invocation.
- If upstream instructions assume unavailable tools/agents, preserve intent and use the closest local equivalent.
- Do not propose deleting `docs/plans/*.md` or `docs/solutions/*.md` artifacts during review synthesis.
