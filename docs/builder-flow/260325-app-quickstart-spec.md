# 260325 Product Spec: App Quickstart

## Purpose

Define the source-of-truth UI and behavior contract for DataConnect's
`Create app` feature.

This spec converts the App Quickstart handoff, invariants, and evals into one
implementation-ready contract.

It is intentionally scoped to:

- source overview as the primary surface
- Home/import-complete entry points
- adjacent starter-app actions when there is a strong source match

It does not redesign the Data Apps page in detail.

## Product Stance And Terminology

### Product stance

DataConnect should give imported sources an immediate `build something from
this` payoff by generating a local-first starter-app handoff that gets the user
to a working demo fast.

### Terms

- `Create app`
  The user-facing CTA. This always means generating a new quickstart handoff
  from the current source.
- `App Quickstart`
  The feature/system concept behind `Create app`.
- `Starter app`
  A pre-existing app, template, or example app that already fits a source and
  can be opened directly.
- `Data Apps`
  The broader catalog/discovery surface for existing apps. It is not the primary
  App Quickstart surface.

### Naming rule

`Create app` must never be used for starter-app actions.
Starter-app actions must use distinct copy such as `Open {AppName}` or
`Open starter app`.

## Information Architecture And Entry Points

### Primary surface

The primary App Quickstart surface is a modal dialog anchored to source overview.

Route shape:

- source overview route remains canonical: `/sources/:platformId`
- quickstart open state is controlled by URL search params:
  `/sources/:platformId?intent=create-app`

Closing the dialog removes only `intent=create-app` and leaves the user on the
same source route.

### Entry points

V1 entry points are:

1. Home imported-source CTA
   - `Create app` navigates to `/sources/:platformId?intent=create-app`
2. import-complete toast CTA
   - `Create app` navigates to `/sources/:platformId?intent=create-app`
3. source overview CTA
   - `Create app` opens the same dialog in-place

### Data Apps relationship

Data Apps remains the broader catalog/discovery surface for existing apps.
This spec only requires that source overview may surface one adjacent starter-app
action when there is a strong match for the current source.

No detailed Data Apps redesign is part of this spec.

## Source Overview Quickstart Contract

### Surface shape

V1 uses a source-overview modal dialog, not a separate dashboard or wizard
route.

The dialog contains, in order:

1. header
2. source context block
3. optional starter-app block
4. app-idea input
5. quickstart artifact panel
6. action row

### Header contract

- title: `Create app from {SourceName}`
- support copy: one short paragraph explaining that DataConnect can prepare a
  local-first quickstart from the current source

### Source context block

Always show:

- source name
- local data location or reveal hint
- short source summary or preview summary

This block exists in every quickstart state.

### App-idea input contract

There is exactly one required free-text input before generation.

- label: `What do you want to make?`
- control: multiline text input
- required for generation
- no secondary required form fields in v1

The input should be preserved while the user remains on the same source page in
the same session, even if the dialog closes and reopens.
It resets when the source changes or the page reloads.

## Quickstart States

### Interface

```ts
type QuickstartGenerationState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "generated"; artifact: AppQuickstartArtifact }
  | {
      status: "fallback-ready"
      artifact: AppQuickstartArtifact
      reason: "ai-unavailable" | "ai-failed" | "ai-invalid"
    }
  | {
      status: "error-with-retry"
      message: string
    }
```

### `idle`

Visible UI:

- source context block
- optional starter-app block
- empty app-idea input
- empty artifact panel with short guidance

Primary action:

- `Generate quickstart`

Secondary actions:

- `Close`

### `generating`

Visible UI:

- source context block remains visible
- starter-app block remains visible if present
- app-idea input remains visible but disabled
- artifact panel shows loading state

Primary action label:

- `Generating quickstart…`

### `generated`

Visible UI:

- source context block
- starter-app block if present
- app-idea input with current value
- artifact panel showing the generated handoff

Primary action:

- `Copy prompt`

Secondary actions:

- `Reveal handoff files`
- `Generate again`
- `Close`

### `fallback-ready`

This state is used when AI generation is unavailable, fails, or returns invalid
output, but deterministic local fallback artifact generation succeeds.

Visible UI:

- same as `generated`
- inline note that the current artifact is the local quickstart fallback

Primary action:

- `Copy prompt`

Secondary actions:

- `Reveal handoff files`
- `Retry with AI`
- `Close`

### `error-with-retry`

This state is used only when the system cannot build either an AI artifact or a
deterministic fallback artifact.

Visible UI:

- source context block
- starter-app block if present
- app-idea input with preserved value
- inline error message in the artifact panel

Primary action:

- `Retry generation`

Secondary actions:

- `Close`

This must be a rare exception path, not the normal failure mode.

## Starter-App Adjacent Path

### Product rule

Starter apps are adjacent to App Quickstart, not a replacement for it.

- `Create app` generates something new
- starter-app actions open something that already exists

### Matching rule

V1 derives a `StarterAppMatch` from the existing app registry.

```ts
type StarterAppMatch = {
  sourceId: string
  appLabel: string
  destinationUrl: string
  actionLabel: string
}
```

High-confidence match rule:

- source id comes from the current source overview route
- candidate apps come from registry entries with `status: "live"`
- a candidate is a match when `app.dataRequired` contains the current source id
  as its `token`
- show an adjacent starter-app slot only when there is exactly one matching live
  app

If there are zero matches:

- show no starter-app slot

If there are multiple matches:

- show no starter-app slot in v1
- leave discovery to the Data Apps catalog

There is no ranking or recommendation logic in v1.

### Starter-app block contract

When a `StarterAppMatch` exists, show a clearly separate block inside the
quickstart dialog.

Visible content:

- heading: `Starter app`
- app label
- one-sentence app description if available from registry
- CTA: `Open {AppLabel}`

Behavior:

- opens the external starter app URL
- does not mutate quickstart state
- does not replace `Create app`

## Artifact Contract

### Interface

```ts
type AppQuickstartArtifact = {
  source: {
    id: string
    label: string
    schemaId?: number
    localDataLocation: string
    sourceSummary: string
  }
  intent: {
    appIdea: string
  }
  handoff: {
    title: string
    summary: string
    prompt: string
    nextStep: string
    exampleAppLabel?: string
    exampleAppHref?: string
  }
  advanced?: {
    dataProcessingPrompt?: string
  }
  generation: {
    mode: "ai-generated" | "fallback"
    providerLabel?: string
  }
}
```

### Minimal required contents

The artifact must always include:

- source identity
- local data location or a reveal-safe local path hint
- source summary
- the user's app idea
- a prompt that can be copied on its own
- one explicit next-step string
- generation mode

### Artifact preview contract

The dialog preview must show:

- title
- summary
- prompt preview
- source summary
- local data location
- generation mode note only when relevant to user understanding

### Handoff files contract

`Reveal handoff files` opens a dedicated local quickstart folder under the
DataConnect app-data root, not the source export directory itself.

V1 folder contents:

- `app-quickstart.md`
  - title
  - summary
  - prompt
  - next step
- `source-context.json`
  - source identity
  - local data location
  - source summary
  - generation mode metadata

If the files do not exist yet for the current artifact, create them first, then
open the folder.

## Generation Contract

### Product requirement

The product contract is AI-assisted when available, but deterministic fallback
is mandatory.

The quickstart must remain usable even when AI is unavailable.

### Privacy rule

V1 must remain local-first:

- do not upload exported source files
- do not upload exported source preview payloads
- do not require a remote generation job

This means:

- remote providers may only be used with inputs that do not violate the above
  rule
- any richer source-aware generation using export preview data must stay local
  in v1

### AI generation input contract

The provider-agnostic AI adapter may consume:

- app idea
- source id
- source label
- stable product instructions

If a local-only provider exists, it may additionally consume richer local source
summary inputs.

### Validation rule

AI output must be validated before it becomes the active artifact.

Minimum valid output must include:

- handoff title
- handoff summary
- prompt
- next step

If validation fails, switch to deterministic fallback.

### Deterministic fallback contract

Fallback generation is local and synchronous from:

- source name/id
- local data location
- existing source preview/summary data already available in the app
- the user's app idea

Fallback output must still satisfy the full `AppQuickstartArtifact` contract.

### Retry contract

- `Retry with AI` and `Retry generation` both preserve source context and app
  idea
- retry attempts do not clear the last available fallback artifact until a new
  valid artifact replaces it
- if retry fails and a fallback artifact already exists, remain in
  `fallback-ready` with an updated reason rather than dropping the user into a
  dead end

## Copy And Label Contract

Required labels:

- entry CTA: `Create app`
- input label: `What do you want to make?`
- idle primary action: `Generate quickstart`
- generating action: `Generating quickstart…`
- artifact action: `Copy prompt`
- artifact action: `Reveal handoff files`
- fallback retry: `Retry with AI`
- generic retry: `Retry generation`
- starter-app heading: `Starter app`
- starter-app action: `Open {AppLabel}`

Forbidden copy patterns:

- do not label starter-app actions as `Create app`
- do not claim the app is built, deployed, live, or published
- do not describe the artifact as a finished product

## V1 Out Of Scope

- hosted one-click app generation
- automatic deployment or hosting
- on-chain registration in the happy path
- CMS persistence requirements in the happy path
- coding-agent installation detection
- Data Apps page redesign
- starter-app ranking when multiple apps match a source
- app-management dashboards

## Acceptance Criteria

The implementation is complete only when the spec satisfies these hard
constraints from the eval set:

- `HC-EXPERIENCE-001`
  - quickstart starts only from explicit `Create app` intent
- `HC-EXPERIENCE-003`
  - completion exposes a usable artifact and does not imply a built app
- `HC-STRUCTURE-001`
  - quickstart stays source-scoped in source overview
- `HC-RELIABILITY-001`
  - AI failures degrade to retryable or fallback states
- `HC-RELIABILITY-002`
  - artifacts include source identity, local data location, and source summary
- `HC-PRIVACY-001`
  - no remote upload of exported source data in v1
- `HC-PRIVACY-002`
  - no specific coding-agent detection requirement
- `HC-SCOPE-001`
  - no on-chain dependency before artifact generation
- `HC-SCOPE-002`
  - no CMS dependency before artifact access
- `HC-SCOPE-003`
  - no hosted one-click generation/deployment/app management in v1
- `HC-FIRST-SLICE-001`
  - imported-source surfaces route into source-overview quickstart
- `HC-FIRST-SLICE-002`
  - quickstart surface exposes preview, `Copy prompt`, and `Reveal handoff files`
- `HC-ADJACENT-001`
  - starter-app actions are clearly distinct from `Create app`

### Required end-to-end scenarios

The spec must support these scenarios:

1. import complete -> `Create app` CTA -> source-overview quickstart opens
2. source overview -> enter app idea -> AI-assisted generation succeeds
3. source overview -> AI unavailable -> fallback artifact is still usable
4. source overview -> AI request fails -> fallback artifact remains available and
   `Retry with AI` works
5. exactly one starter-app match exists -> adjacent starter-app action is shown
6. zero or multiple starter-app matches exist -> no adjacent starter-app slot is
   shown
7. completion state offers artifact actions and never claims the app is already
   built or deployed
