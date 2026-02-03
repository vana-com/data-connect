# Agents.md best practices (Vercel study)

## Core findings

- AGENTS.md outperformed skills because it is always present in context, removing the “should I invoke a tool?” decision point.
- Skills were often never triggered unless explicitly instructed; wording was fragile and produced different outcomes.
- Skills without explicit instructions performed the same as baseline; with explicit instructions they reached 79% pass rate.
- A compressed AGENTS.md docs index (about 8KB) achieved 100% pass rates in their evals.
  - Build/Lint/Test breakdown: baseline 84/95/63, skill default 84/89/58, skill + explicit instructions 95/100/84, AGENTS.md 100/100/100.

## Practical rules

- Prefer retrieval-led reasoning over pre-training-led reasoning.
- Put the most critical instructions directly in AGENTS.md so they are always visible.
- Use a docs index that points to files, not embedded docs content.
- Compress aggressively to minimize context bloat.
- Validate changes with behavior-based tests, not implementation-detail assertions.

## Suggested format

Use a pipe-delimited index to keep it compact:

[Docs Index]|root: ./.next-docs
|IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning
|01-app/01-getting-started:{01-installation.mdx,02-project-structure.mdx,...}

## Notes on instruction wording

- “You MUST invoke the skill” caused agents to anchor too early and miss project context.
- “Explore project first, then invoke skill” performed better.
- AGENTS.md removes this ordering risk entirely.

## Takeaway

Use AGENTS.md as the always-on, compressed index of where truth lives, and guide the agent to retrieve specifics from the repo rather than rely on pre-training.

Sources:
https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals
