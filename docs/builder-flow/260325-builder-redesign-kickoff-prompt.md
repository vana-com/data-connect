# Kickoff Prompt For App Quickstart Work

Use this to start the next architecture/spec conversation for DataConnect's
`Create app` feature.

```md
We are designing and building `App Quickstart` in this repository.

This is not a port of the old builder.
Treat the old implementation as reference material for useful ideas, failure
cases, and product lessons.

Please read these documents first:

1. `260325-builder-redesign-handoff.md`
2. `260325-builder-redesign-invariants.md`
3. `260325-builder-flow-mermaid.md`
4. `260324-source-pipeline-home-and-local-app-creation-spec.md`

Context:

- The old builder mixed creation, management, infra ceremony, and manual
  handoff.
- We want a much faster local-first path inside DataConnect.
- The preferred product stance is:
  `import data -> click Create app -> get a working demo handoff fast`
- The user-facing CTA remains `Create app`.
- The feature/system concept is `App Quickstart`.
- We are deliberately not carrying forward the old on-chain/CMS flow as the
  happy path.
- Existing starter apps/templates are an adjacent thread:
  opening something that already exists is distinct from generating a new
  quickstart handoff.

Your first task:

1. inspect the repo
2. propose the minimum architecture for App Quickstart in DataConnect
3. define the canonical quickstart artifact
4. recommend the first implementation slice
5. call out anything missing or risky in the invariants
6. explain how UI should distinguish:
   - `Create app` (generate a new quickstart handoff)
   - starter app/example app actions (open something that already exists)

Important constraints:

- optimize for product simplicity and speed to first useful result
- avoid wizard-heavy UX
- prefer generated handoffs over manual form entry
- keep advanced configuration collapsed by default
- stay local-first in v1
- do not design around legacy infra assumptions unless clearly justified

Useful prior-art references from the old builder:

- seed analysis service
- schema-aware prompt generation
- prompt sandbox
- known auth/prompt failure modes

Do not begin implementation immediately.
First, provide a concise architecture and delivery plan for App Quickstart based
on these invariants.
```
