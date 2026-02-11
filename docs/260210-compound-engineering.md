# Compound engineering method

Source article: https://every.to/guides/compound-engineering

This repo uses the same core model:

Plan -> Work -> Review -> Compound -> Repeat

The defining idea is simple: each unit of work should make future work easier, not harder.

## The method

### 1) Plan

Planning turns an idea into a blueprint.

At this step:
- understand requirement, constraints, and edge cases
- research existing repo patterns
- check framework docs when needed
- write a concrete implementation plan before coding

### 2) Work

Execution follows the plan.

At this step:
- implement in an isolated branch
- run validations as changes land
- adapt when issues appear

### 3) Review

Review catches problems before merge and captures what should compound.

At this step:
- review through multiple lenses (correctness, performance, maintainability, regressions)
- prioritize findings:
  - P1: must fix
  - P2: should fix
  - P3: nice to fix
- resolve and re-validate

### 4) Compound (the point of the system)

Traditional flow often stops at review. Compound engineering does not.

At this step:
- capture what worked, what failed, and why
- make the learning findable
- update always-read guidance when a pattern is reusable
- improve checks/workflow so similar issues are caught earlier next time

## Time split guidance

Inside a feature loop:
- ~80% plan + review
- ~20% work + compound

Across total engineering time:
- ~50% feature delivery
- ~50% system improvement (docs, checks, automation, agents)

## Adoption stages

- Stage 0: manual development
- Stage 1: chat-based assistance
- Stage 2: agentic tooling with line-level review
- Stage 3: plan-first execution, PR-level review
- Stage 4: idea to PR on a single machine
- Stage 5: parallel cloud execution

Default target in this repo: Stage 3.

## Principles to preserve

- taste belongs in systems, not only in human review
- trust comes from safety nets (tests/checks/review systems), not manual gatekeeping
- plans are first-class artifacts
- environments should be agent-native (if a human can do it, agent should also be able to do it where safe)
- parallelization is leverage

## Agent-native checklist (repo baseline)

The workflow is strongest when agents can:
- read/write repo files
- run lint/typecheck/test commands
- run git branch/commit/PR flows
- inspect runtime signals needed for debugging

Every capability withheld from agents becomes manual overhead.

## Repo mapping (minimal implementation)

This repo maps the method to concrete artifacts:

- plans: `docs/plans/`
- solutions: `docs/solutions/`
- queue: `todos/`
- always-read guidance: `AGENTS.md`

Current helper commands:
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run skills:sync`

Use these as method support, not as a substitute for judgment in planning/review/compound steps.

## Review prompts (from the article)

For substantive changes, ask:
1. What was the hardest decision?
2. What alternatives were rejected, and why?
3. What are we least confident about?

## Reference

- Kieran Klaassen, "Compound Engineering: Make Every Unit of Work Compound Into the Next", Every, https://every.to/guides/compound-engineering
