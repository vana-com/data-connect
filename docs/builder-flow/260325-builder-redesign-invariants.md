# App Quickstart Invariants

## Purpose

This document reframes the March 25 builder-flow learnings for DataConnect's
`Create app` feature.

It keeps the useful know-how from the earlier builder product, but narrows the
goal to a faster, more honest outcome inside DataConnect:

`import data -> click Create app -> get a working demo handoff fast`

The term `App Quickstart` replaces `builder` in this document because
`Builder` already has protocol meaning elsewhere in DataConnect.

## Product Stance

DataConnect should give imported sources an immediate `build something from
this` payoff by generating a local-first starter-app handoff that gets the user
to a working demo fast.

The user-facing CTA should remain:

- `Create app`

The feature/system concept should be:

- `App Quickstart`

## Goal

Build a source-scoped quickstart flow that helps a user:

1. start from an imported source
2. describe the app idea once
3. receive an AI-assisted starter handoff
4. optionally inspect advanced data-processing guidance
5. copy or reveal the handoff artifact
6. continue in the coding environment of their choice

## Prior Knowledge To Heed

These points come from the previous builder implementation and the newer
source-pipeline docs. They should shape the quickstart invariants directly.

### Carry forward

- Single-prompt seed analysis is the right instinct.
- Schema-aware prompt generation is valuable.
- Prompt sandbox/testing is useful as an advanced layer.
- Exporting a real artifact is better than ending on a checklist.
- Source overview is the right anchor for app creation in DataConnect.
- Import completion should create momentum into `Create app`.

### Do not carry forward as-is

- The old step-by-step wizard structure.
- Mixing creation, management, and infrastructure on one surface.
- On-chain registration inside the main quickstart path.
- CMS persistence as a requirement for first success.
- Lovable-specific behavior as the product model.

## Product Invariants

### Experience

- `Create app` is always explicit user intent. Never auto-start quickstart after
  import.
- Ask for the user's app idea once.
- Optimize the default path for time to first working demo, not maximum
  completeness.
- Prefer a generated handoff over empty forms.
- Keep advanced configuration collapsed by default.
- The success state must mean the user now has a usable handoff artifact.
- Never imply the app is already built, deployed, or published.

### Structure

- App Quickstart is source-scoped and starts from imported data.
- App Quickstart belongs in the source-overview context, not a separate builder
  dashboard.
- Creation/quickstart must stay separate from any future app-management surface.
- The flow should revolve around one canonical handoff artifact, not scattered
  wizard state.
- Source selection belongs at the start of the quickstart path when needed, but
  in DataConnect the ideal trigger is usually an already-imported source.

### Reliability

- AI generation failures must degrade to a retryable, editable handoff state,
  not a dead end.
- The handoff must still be useful if the user only copies plain text.
- The handoff must include enough source context to be actionable:
  local data location, source identity, and a meaningful preview/summary.
- Expensive or fragile operations must not block first quickstart success.
- Advanced prompt inspection/testing should be available without becoming a
  mandatory step.
- The user must be able to leave the quickstart with a real artifact even if no
  downstream tool integration exists.

### Privacy And Trust

- Keep the quickstart local-first in v1.
- Do not upload exported source data to remote infrastructure in v1.
- Do not require detecting a specific coding agent installation.
- External tools are destinations for the handoff, not the system of record.

### Scope

- Do not rebuild the old builder wizard.
- Do not couple quickstart to current on-chain mechanics.
- Do not couple quickstart to Sanity CMS.
- Do not make Lovable/Bolt/v0-specific behavior the core model.
- Do not turn quickstart into hosted one-click app generation in v1.
- Do not turn quickstart into app management.

## Canonical Artifact

The quickstart flow should revolve around one source of truth, conceptually
similar to:

```ts
type AppQuickstartArtifact = {
  source: {
    id: string;
    label: string;
    schemaId?: number;
    exportPath?: string;
  };
  intent: string;
  handoff: {
    title: string;
    summary: string;
    prompt: string;
    sourceSummary?: string;
    sampleOutput?: string;
    exampleAppLabel?: string;
    exampleAppHref?: string;
  };
  advanced?: {
    dataProcessingPrompt?: string;
  };
};
```

This is not a locked schema.
The important point is that quickstart produces one coherent handoff artifact
that can be previewed, copied, and optionally written to local files.

## First Build Slice

The first implementation should include:

- `Create app` entry from imported-source surfaces
- source-overview quickstart UI
- short app-idea input
- AI-assisted handoff generation
- prompt preview
- `Copy prompt`
- `Reveal handoff files`
- optional advanced prompt section

The first implementation should not include:

- hosted app generation jobs
- automatic deployment/hosting
- app-management dashboards
- on-chain registration on the happy path
- CMS persistence requirements
- provider-specific quickstart logic as the core flow

## Design Cues From The Prototype

These cues are still correct and should survive the rename to App Quickstart:

- ask once
- edit a generated draft instead of filling long forms
- keep advanced inspection secondary
- make the exported artifact explicit
- keep the path understandable without exposing infrastructure details

## Definition Of Success

App Quickstart succeeds when a user can go from imported data to a credible
starter-app handoff with very little friction.

That means:

- the source context is already clear
- the prompt/handoff feels specific rather than generic
- the user can copy or reveal it immediately
- the user understands that the next step is to build from the local export
- the payoff feels fast enough that importing data naturally leads into trying
  to make something with it
