# 260324 Source Pipeline Home And Local App Creation Spec

## Goal

Make Home immediately answer two questions:

1. What can I import next?
2. What can I do with data I already imported?

The page should optimize for more imports without making imported sources feel
dead or "done".

## Product decisions

- Home is a `source pipeline` page, not a storage/status page.
- Keep `available sources` always visible.
- Do not use tabs for `available` vs `imported`.
- Use a two-column board:
  - left: `Available / Importing`
  - right: `Imported / Ready to use`
- Keep the current blocking policy:
  - block only while user action is required for auth/sign-in
  - once the run is backgroundable, the app remains usable
- Do not auto-build an app after import completes.
- Do immediately offer app creation when import completes.
- Route app-creation intent into the source overview page.
- Prefer a local-first handoff over cloud execution.

## Problem statement

The current Home page correctly separates `imported data` and `import sources`,
but the relationship between those sections is weak. A user can see both, but
the UI does not clearly express the lifecycle:

`source available -> import running -> source imported -> use data`

As a result:

- `available sources` does not feel like the primary next action
- `imported data` does not clearly suggest what to do next
- finishing an import does not create momentum into app usage or app creation

## Proposed Home IA

### Left column: Available / Importing

Purpose: start more imports.

Contents:

- all importable sources
- running imports remain in this column while active
- running cards keep lightweight progress state
- cards remain blocked only during credential-required states

Primary CTA:

- `Connect {Source}`

Running state:

- keep current backgrounding behavior
- keep spinner/status copy on the active card
- optionally add one short reassurance line only:
  - `You can keep using the app`

### Right column: Imported / Ready to use

Purpose: turn imported data into action.

Contents per source:

- source name
- last updated
- `View data`
- `Create app`
- `Sync` or `Fetch latest`

Primary CTAs:

- `View data`
- `Create app`

## Source overview page role

The source overview page is the `use this data` surface.

It should remain the destination for `View data`.

It should also expose `Create app from this data` as a first-class action in the
sidebar or primary action area. This is the right place for the app-creation
handoff because the user can inspect the exported JSON first and keep the mental
model anchored on one source.

## Import completion flow

When an import finishes:

1. the source leaves the left column
2. the source appears in the right column
3. show a global completion toast

Toast copy:

- title: `{Source} import complete`
- actions:
  - `View data`
  - `Create app`

Rules:

- do not interrupt the user with a modal
- `View data` routes to the source overview page
- `Create app` routes to the source overview page with app-creation intent in
  the URL search params

Suggested pattern:

- `/sources/:platformId?intent=create-app`

This lets the overview page open a sheet/dialog on top of the source context
without inventing a separate mental model or route family.

## App creation proposal

### Core decision

App creation should be an explicit user action that generates a local handoff
for an external coding agent, not a cloud-hosted build pipeline.

### Delivery phases

#### V1

Generate an agent-agnostic handoff bundle that can be copied into Claude Code,
Codex, or another coding agent.

#### V1.5

Keep the same local-first model, but remove more user friction around it:

- pre-generate a better source-specific prompt
- include stronger example-app references
- make `Copy prompt` and `Reveal handoff files` extremely obvious
- anticipate common follow-up needs in the generated handoff
- keep the user anchored in source overview while doing this

### Preferred first implementation

Generate an agent-agnostic handoff bundle that can be copied into Claude Code,
Codex, or another coding agent.

Flow:

1. user clicks `Create app`
2. DataConnect opens source overview with app-creation UI active
3. DataConnect generates a source-specific handoff
4. user copies the prompt or opens the generated handoff files
5. the coding agent builds a starter app using the imported source

### Why this approach

- simplest implementation path
- keeps user data local-first
- avoids standing up remote job orchestration
- avoids ambiguous trust/privacy boundaries
- supports many agents instead of binding the product to one
- matches the "vibe code from my data" goal without pretending DataConnect is a
  hosted app generator

## Handoff artifact

The first version should generate a small local artifact bundle:

- a prompt file and/or skill-like instruction file
- path to the exported data file/folder
- source summary:
  - platform
  - top-level schema hints
  - export summary/counts if present
- link/reference to an example app if one exists

Example:

- LinkedIn import -> handoff includes:
  - path to LinkedIn export JSON
  - summary of key entities
  - reference to the LinkedIn demo app pattern
  - instruction to create a starter app against that local export

## UX rules for app creation

- `Create app` must never imply the app is already built
- label it as a guided generation/handoff action
- primary actions should be:
  - `Copy prompt`
  - `Reveal handoff files`
- v1.5 can add:
  - `Copy prompt`
  - `Reveal handoff files`
  - `Open example app`
  - `Open source folder`
- do not require DataConnect to detect a specific agent installation in v1
- do not require cloud execution for v1
- do not upload exported user data to remote infrastructure in v1

## Why hosted one-click generation is not v1

To make `Create app` become `press one button and get a deployed app`, the
product would need to own a much larger system:

- authenticated user identity for app-generation jobs
- remote worker/runtime that can run coding agents safely
- secure upload or remote access to exported user data
- template/repo provisioning
- deployment-provider integration such as Vercel auth and project creation
- job progress, retry, failure, and cost controls
- trust/privacy language for sending personal exports to remote infrastructure

That is a valid later direction, but it is materially bigger than the current
DataConnect scope.

## Note on one-click deployment generation

One-click `Create app -> deployed app` is probably not impossible. A credible
future version could look like:

1. user clicks `Create app`
2. DataConnect provisions a starter repo from a source-specific template
3. an agent runs against the user's exported source data
4. the build is committed to the repo
5. Vercel deploys it
6. the user gets a live URL

That could be a strong long-term product direction. It is explicitly not the
recommended current implementation because it requires a large jump in system
scope, trust model, and operations burden.

## Non-goals for v1

- remote long-running app generation
- automatic app deployment/hosting
- one-click fully autonomous app generation inside DataConnect
- syncing app-generation job state back into DataConnect
- provider-specific setup such as Vercel account linking

## Success criteria

- a user can instantly see where to import more data
- a user can instantly see which imported sources are ready to use
- finishing an import creates a clear next step
- `View data` and `Create app` are both visible and understandable
- app creation has a privacy-preserving local-first path
- v1.5 makes the handoff feel smooth enough that most users do not get stuck on
  "what do I do with this prompt/file?"

## Open decisions

- whether the source overview uses a sheet, dialog, or inline panel for the
  app-creation handoff UI
- whether the generated handoff is a single markdown file, a skill folder, or
  both
- whether example-app mappings live in source registry metadata
