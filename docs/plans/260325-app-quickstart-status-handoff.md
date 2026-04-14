# 260325 Status Handoff: App Quickstart

## Purpose

This file is the explicit handoff/status checkpoint for the current
`App Quickstart` workstream.

Use it together with:

- [260325 App Quickstart Spec](/Users/cflack/Repos/vana-com/data-connect-source-pipeline/docs/builder-flow/260325-app-quickstart-spec.md)
- [260325 App Quickstart Implementation Plan](/Users/cflack/Repos/vana-com/data-connect-source-pipeline/docs/plans/260325-app-quickstart-implementation-plan.md)
- [260325 App Quickstart Invariants Evals](/Users/cflack/Repos/vana-com/data-connect-source-pipeline/docs/builder-flow/260325-app-quickstart-invariants-evals.yaml)

This document exists because the feature has now moved from doc/spec work into
implemented code, and the next collaborator should not have to reconstruct the
current state from chat history.

## Current Status

The first implementation wedge is complete and committed.

Latest relevant commits:

- `3560332`
  - docs checkpoint for App Quickstart framing/spec/planning
- `26c8e5c`
  - first code slice for source-scoped App Quickstart

Branch context:

- currently on the PR branch used for this workstream:
  `callum/source-pipeline-home-spec`

## What Is Implemented

The following parts of the plan are now implemented:

### 1. Entry points and routing

- Home imported-source surfaces now expose `Create app`
- successful import completion now offers a `Create app` toast CTA
- source overview still supports the same CTA
- quickstart is URL-backed via:
  `/sources/:platformId?intent=create-app`
- closing the quickstart removes only `intent=create-app`

### 2. Source-overview quickstart surface

- source overview now opens a dedicated App Quickstart dialog
- the dialog uses a proper shadcn-style `Dialog` primitive, not `AlertDialog`
- the dialog is source-scoped and not a separate builder dashboard

### 3. Quickstart state machine

Implemented states:

- `idle`
- `generating`
- `fallback-ready`
- `error-with-retry`

Also structurally supported:

- `generated`

Important nuance:

- the current AI adapter is a stub that returns `unavailable`, so the shipped
  user path goes through deterministic fallback
- the state machine is already shaped to accept optional AI generation later,
  but AI/provider work is not the current product boundary for this slice

### 4. Artifact contract

Implemented:

- `AppQuickstartArtifact`
- deterministic fallback artifact generation
- source-aware prompt generation
- source summary generation
- generation mode metadata

### 5. Handoff file flow

Implemented:

- `Copy prompt`
- `Reveal handoff files`
- dedicated quickstart folder under app-data
- handoff files:
  - `app-quickstart.md`
  - `source-context.json`

Important product behavior:

- handoff files are not written into the source export directory

### 6. Starter-app adjacent path

Implemented:

- exact-one-match starter-app slot from registry
- distinct `Open {App}` action
- kept separate from `Create app`

Current matching rule in code:

- only show when exactly one live app matches the current source token
- if zero or multiple live matches exist, show nothing in v1

## Current Execution Boundary

The current slice guarantees a dense, copyable local-first handoff artifact.

This means:

- `Copy prompt` is a truthful primary success action today
- the handoff is designed for tools that can run in the user's local
  environment and access local files and/or the bundled Personal Server
- DataConnect does not yet guarantee that a generic hosted builder can complete
  the Personal Server grant/tunnel handshake from the generated prompt alone

Important nuance:

- this is not a protocol limitation; the repo already has grant/tunnel
  infrastructure for protocol-aware external apps
- the unresolved gap is packaging that infrastructure into a reusable hosted
  builder quickstart contract

## What Is Not Implemented Yet

These are the next wedges, in order of cleanliness:

### Next wedge: handoff artifact quality pass

Current state:

- the fallback artifact already satisfies the core evals and gives the user a
  copyable handoff
- [app-quickstart-ai.ts](/Users/cflack/Repos/vana-com/data-connect-source-pipeline/src/pages/source/app-quickstart-ai.ts)
  remains a stub by design for now

Needed:

- sharper source summaries
- denser prompt structure with stronger build constraints
- a more explicit local-first execution story
- a more useful `nextStep`
- tests that gate for source-specific, truthful, non-generic artifact content

### Later wedge: protocol-aware hosted-builder handshake

Potential future work:

- investigate how an external hosted builder could participate in the existing
  Personal Server grant/tunnel flow
- define what would be required for a generated app to become a protocol-aware
  external builder rather than just a copied prompt target

Important rule:

- this should be scoped separately from the artifact-quality pass
- do not imply that paste-into-Lovable is a guaranteed happy path before this
  contract exists

### Optional later wedge: starter-app matching UX

Current behavior is intentionally strict:

- exactly one match -> show starter app
- zero or multiple matches -> show nothing

Possible future decision:

- add a separate “See matching apps” path for multi-match cases

### Separate cleanup track: Tauri build hygiene

This is not an App Quickstart design problem, but it is a current repo friction:

- `cargo check --manifest-path src-tauri/Cargo.toml` is blocked by an existing
  build-script assumption about `../connectors/openai/**/*`

That should be cleaned up separately from the product slice.

## What Was Explicitly Deleted

Yesterday's March 24 spike was intentionally removed before rebuilding this
slice.

Deleted approach:

- the early two-column Home/source-pipeline spike
- the old prompt-preview `AlertDialog` implementation
- the earlier lightweight “copy a generic prompt” version of create-app

Reason:

- it did not match the new App Quickstart spec/evals
- it used the wrong dialog primitive
- it blurred the older ideation with the now-defined product contract

## Files To Start From

If a new collaborator is continuing this work, the key files are:

### Product docs

- [260325 App Quickstart Spec](/Users/cflack/Repos/vana-com/data-connect-source-pipeline/docs/builder-flow/260325-app-quickstart-spec.md)
- [260325 App Quickstart Implementation Plan](/Users/cflack/Repos/vana-com/data-connect-source-pipeline/docs/plans/260325-app-quickstart-implementation-plan.md)
- [260325 App Quickstart Invariants Evals](/Users/cflack/Repos/vana-com/data-connect-source-pipeline/docs/builder-flow/260325-app-quickstart-invariants-evals.yaml)

### UI entry points

- [home index](/Users/cflack/Repos/vana-com/data-connect-source-pipeline/src/pages/home/index.tsx)
- [connected sources list](/Users/cflack/Repos/vana-com/data-connect-source-pipeline/src/pages/home/components/connected-sources-list.tsx)
- [source overview index](/Users/cflack/Repos/vana-com/data-connect-source-pipeline/src/pages/source/index.tsx)

### Quickstart logic

- [source hook](/Users/cflack/Repos/vana-com/data-connect-source-pipeline/src/pages/source/use-source-overview-page.ts)
- [quickstart dialog](/Users/cflack/Repos/vana-com/data-connect-source-pipeline/src/pages/source/components/source-app-quickstart-dialog.tsx)
- [artifact helpers](/Users/cflack/Repos/vana-com/data-connect-source-pipeline/src/pages/source/app-quickstart.ts)
- [AI adapter seam](/Users/cflack/Repos/vana-com/data-connect-source-pipeline/src/pages/source/app-quickstart-ai.ts)
- [quickstart types](/Users/cflack/Repos/vana-com/data-connect-source-pipeline/src/pages/source/types.ts)
- [dialog primitive](/Users/cflack/Repos/vana-com/data-connect-source-pipeline/src/components/ui/dialog.tsx)

### Tauri handoff-file plumbing

- [tauri path bindings](/Users/cflack/Repos/vana-com/data-connect-source-pipeline/src/lib/tauri-paths.ts)
- [tauri file ops command](/Users/cflack/Repos/vana-com/data-connect-source-pipeline/src-tauri/src/commands/file_ops.rs)
- [tauri lib command registration](/Users/cflack/Repos/vana-com/data-connect-source-pipeline/src-tauri/src/lib.rs)

### Tests

- [home tests](/Users/cflack/Repos/vana-com/data-connect-source-pipeline/src/pages/home/index.test.tsx)
- [connected sources list tests](/Users/cflack/Repos/vana-com/data-connect-source-pipeline/src/pages/home/components/connected-sources-list.test.tsx)
- [source overview tests](/Users/cflack/Repos/vana-com/data-connect-source-pipeline/src/pages/source/index.test.tsx)
- [source hook tests](/Users/cflack/Repos/vana-com/data-connect-source-pipeline/src/pages/source/use-source-overview-page.test.ts)

## Verification Status

For commit `26c8e5c`, the following passed:

- `npx vitest run src/pages/source/index.test.tsx src/pages/source/use-source-overview-page.test.ts src/pages/home/index.test.tsx src/pages/home/components/connected-sources-list.test.tsx`
- `npm run typecheck`
- `git diff --check`

The following did not complete due to an existing repo/environment issue:

- `cargo check --manifest-path src-tauri/Cargo.toml`
  - blocked by missing connector glob expectations unrelated to the new feature

## Recommended Next Instruction

If handing this to another collaborator, the cleanest next instruction is:

`Strengthen the App Quickstart handoff artifact in src/pages/source/app-quickstart.ts so it is denser, more source-specific, and more truthful about the current local-first execution boundary, while preserving the current fallback path, state machine, and eval-backed tests.`

## Notes

- The checked-in implementation plan has not been rewritten line-by-line to mark
  slices complete.
- This file is the explicit status checkpoint for where the process is now.
