# App Quickstart Handoff

## Purpose

This document packages the product/design learnings from the March 25 builder
flow exploration and reframes them for DataConnect's `Create app` feature.

It is intentionally product-first.

The goal is not to port the old builder implementation.
The goal is to preserve the useful know-how, avoid the old UX failures, and use
that learning to shape a cleaner `App Quickstart` inside DataConnect.

`App Quickstart` is the preferred feature name in this document because
`Builder` already has protocol meaning elsewhere in DataConnect.

## What We Produced

### Diagrams And Prototype Material

- Mermaid source: `apps/web/app/build/_docs/260325-builder-flow-mermaid.md`
- FigJam overview board:
  `https://www.figma.com/board/4BJ1BRNEqJOpvn1KTBuMEu/Builder-Flow-Overview`
- Prototype-inspired ideal flow lives on that board as:
  `Zoom 3: Prototype-Based Ideal Flow`

### Prototype Direction

We reviewed a cleaner prototype flow with these screens:

1. choose source + describe app
2. AI expands context into editable draft fields
3. review advanced data-processing prompt
4. confirm generated app instructions
5. create prompt / create record
6. copy or open in external tool

That direction is materially better than the old builder code flow, even though
the new DataConnect product should be framed as a fast quickstart rather than a
full prompt studio.

## Short Product Conclusion

The old builder behaved like an internal process.
DataConnect should behave like a fast local-first quickstart.

The right mental model is:

`import data -> click Create app -> get a working demo handoff fast`

And, when useful:

`already have a relevant starter app -> open that as a separate path`

Not:

`seed input -> separate wizard steps -> infra ceremony -> manual checklist`

## Product Stance

DataConnect should give imported sources an immediate `build something from
this` payoff by generating a local-first starter-app handoff that gets the user
to a working demo fast.

The user-facing CTA should stay:

- `Create app`

## What Was Wrong With The Old Builder

### Core Problems

- The user was asked for the same intent multiple times.
- Creation, gating, and app management were mixed on one surface.
- On-chain registration, encryption, and CMS save sat directly on the happy
  path.
- "Success" was really a manual checklist, not a completed artifact.
- The flow was form-heavy where it should have been draft/handoff-heavy.

### Practical UX Failures

- The seed input already inferred useful app metadata, but the user then had to
  re-enter overlapping details later.
- The `/build` page mixed checks, creation, and dashboard concerns.
- The product-description step did expensive and fragile work at the wrong time.
- Lovable handoff appeared too late and too awkwardly.

## What The Prototype Got Right

- It asks once.
- It keeps source selection lightweight.
- It uses AI expansion to create a draft instead of making the user fill long
  forms.
- It keeps `Advanced` secondary.
- It makes the export artifact explicit.

These are still the right cues for App Quickstart.

## Recommended DataConnect Product Shape

### Primary Thread: App Quickstart

1. start from an imported source
2. click `Create app`
3. describe the app idea once
4. generate an AI-assisted handoff
5. optionally inspect advanced data-processing guidance
6. copy the prompt and/or reveal local handoff files
7. continue in a coding environment of choice

### Adjacent Thread: Existing Starter Apps

There is a second, distinct path that already exists in the product ecosystem:
some sources may have existing starter apps, templates, or example apps that
the user can run locally or fork immediately.

Example shape:

- LinkedIn data -> open an existing app such as `linkedin-to-readcv`

This path is adjacent to App Quickstart, not a replacement for it.

The UI should account for both threads:

- `Create app` means generate a new quickstart handoff from the user's data.
- starter app/example app actions mean open something that already exists.

Those actions should be clearly distinct in copy and intent.

### Information Architecture Implication

App Quickstart should stay source-scoped and source-aware.
Starter apps belong to the discover/catalog/distribution side of the product,
but can be surfaced from source-overview when there is a clear match for the
current source.

The important thing is not to blur:

- generating a new app handoff
- opening an existing app/template/example

## What To Carry Forward From The Existing Builder Work

### Carry Forward

- AI seed analysis as a prefill mechanism
- schema-aware prompt generation
- prompt sandbox/testing as an advanced layer
- explicit final export artifact
- failure knowledge from auth-fetch and prompt execution

### Do Not Carry Forward As-Is

- the old wizard scaffolding
- Lovable-specific URL/ID generation as the core model
- on-chain registration inside the main quickstart path
- mixed creation and dashboard entry page
- heavy reliance on mutable wizard state as the main mental model

## Important Existing Nuances

These are worth preserving as knowledge even if implementation changes
substantially.

### 1. Seed Analysis Already Solved The Right Problem

`apps/web/lib/services/app-seed-analysis.service.ts`

The old system had the right instinct:
take one seed prompt and expand it into name, tagline, description, branding,
data prompt, and product description.

That should still inform App Quickstart.
The difference is that the output now serves a fast handoff, not a longer wizard
journey.

### 2. Prompt Generation Was Already Treated As A Real Artifact

`apps/web/lib/utils/app-seed-prompt.ts`

The old system generated a large structured prompt artifact for external AI app
builders.
That was directionally correct.

The export artifact should remain first-class, even if the exact format changes.

### 3. Data Prompt Testing Already Exists

- `apps/web/app/build/create/steps/step-data-prompt.tsx`
- `apps/web/components/sandbox/schema-subprompt-sandbox.tsx`
- `apps/web/app/api/sandbox/run-prompt/route.ts`

This is valuable.
In DataConnect, it should survive as an advanced inspection layer, not a
mandatory step in the happy path.

### 4. The Old Success State Was Not Real Success

`apps/web/app/build/create/steps/step-success.tsx`

The old success page was really a manual Lovable checklist.
That should not be copied.

For App Quickstart, success should mean:

- a real handoff artifact exists
- the user can copy it or reveal it locally
- the next step is immediately understandable

### 5. The Old Infra Path Was Too Heavy

- `apps/web/app/build/create/steps/step-product-description.tsx`
- `apps/web/app/api/app-creation/relayer-key/route.ts`
- `apps/web/app/api/build/register-grantee/route.ts`
- `apps/web/lib/services/app-cms.service.ts`

The old product-description step bundled:

- app-wallet generation
- relayer key fetch
- encryption
- on-chain registration
- chain confirmation waiting
- CMS persistence

That was exactly the wrong place for it.

If record-creation or publish steps exist in the future, they should happen
after the user already has a valid quickstart artifact, not before first
success.

### 6. Source Overview Is The Right Anchor In DataConnect

The newer source-pipeline thinking in this repo is correct:
the source overview page is the right place to turn imported data into action.

That means:

- Home can create momentum into `Create app`
- source overview can host the quickstart UI
- the user stays anchored on the actual imported data while deciding what to do

## Suggested Canonical Artifact

The flow should revolve around one coherent handoff artifact, conceptually
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

This is not a required schema.
It is a good directional model because it gives the product one clear artifact
to preview, copy, and optionally write to local files.

## First Product Slice

The first implementation should include:

- `Create app` CTA from imported-source surfaces
- source-overview quickstart UI
- short app-idea input
- AI-assisted handoff generation
- prompt preview
- `Copy prompt`
- `Reveal handoff files`
- optional advanced prompt inspection

The first implementation should not include:

- hosted generation jobs
- automatic deployment/hosting
- app-management dashboards
- on-chain registration in the happy path
- CMS persistence requirements
- provider-specific generation as the core flow

## Open Product Questions Worth Tracking

- when a source has a known starter app, where should that be surfaced:
  Home, source overview, data-app catalog, or some combination?
- should the quickstart UI show starter apps as adjacent actions only when a
  high-confidence source match exists?
- should the handoff artifact embed starter-app references when relevant, or
  should those stay visually separate in UI?

## Definition Of Success

App Quickstart succeeds when a user can go from imported data to a credible
starter-app handoff with very little friction.

That means:

- the source context is already clear
- the handoff feels specific rather than generic
- the user can copy or reveal it immediately
- the next step is obvious
- the path feels fast enough that importing data naturally leads into trying to
  make something with it
