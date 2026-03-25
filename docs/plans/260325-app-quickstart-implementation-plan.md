# 260325 Implementation Plan: App Quickstart

## Goal

Implement the first App Quickstart slice in DataConnect using the new product
spec as the source of truth.

This plan replaces the earlier March 24 ideation plan and is organized around
the concrete v1 contract:

- source-overview quickstart
- explicit `Create app` entry points
- deterministic local handoff artifact
- optional AI-assisted generation through the same contract
- adjacent starter-app action when there is exactly one strong source match

## Decision Anchors

- `Create app` always means generate a new quickstart handoff from the current
  source.
- source overview is the primary quickstart surface.
- starter-app actions are separate from quickstart and appear only when there is
  exactly one live registry match for the current source.
- v1 must remain local-first and must not upload exported source data remotely.
- deterministic fallback artifact is mandatory even if AI generation exists.
- on-chain, CMS, deployment, and app-management concerns remain out of scope.

## Thin Vertical Slice

The first end-to-end implementation slice is:

1. imported source exposes `Create app`
2. user lands on source overview with quickstart open
3. user enters one app idea
4. DataConnect generates a usable fallback-backed quickstart artifact
5. user can `Copy prompt`
6. user can `Reveal handoff files`
7. if exactly one starter app matches, user also sees a separate `Open {App}`
   action

AI-assisted generation plugs into this same slice, but the slice is not allowed
to depend on AI availability for usability.

## Implementation Slices

### Slice 1: Entry points and routing

Work:

- keep Home imported-source `Create app` CTA routing to
  `/sources/:platformId?intent=create-app`
- keep import-complete toast `Create app` CTA routing to the same URL
- keep source-overview `Create app` CTA opening the same quickstart state
- closing quickstart removes only `intent=create-app`

Expected files:

- `src/pages/home/*`
- `src/pages/source/index.tsx`

### Slice 2: Source-overview quickstart state machine

Work:

- replace the current simple prompt-preview dialog behavior with the spec state
  machine:
  - `idle`
  - `generating`
  - `generated`
  - `fallback-ready`
  - `error-with-retry`
- keep one required multiline app-idea input
- preserve source context and app idea through retries
- preserve quickstart state while the user remains on the same source page in
  the same session
- reset quickstart state when the source changes or the page reloads

Expected files:

- `src/pages/source/use-source-overview-page.ts`
- `src/pages/source/components/source-create-app-dialog.tsx`
- source-page-local quickstart helper/types file(s)

### Slice 3: Artifact generation and validation

Work:

- define app-local interfaces matching the spec:
  - `AppQuickstartArtifact`
  - `StarterAppMatch`
  - `QuickstartGenerationState`
- implement deterministic fallback artifact generation from:
  - source id/label
  - local data location
  - preview/summary data already available in the app
  - user app idea
- validate AI-generated artifacts before activation
- if AI is unavailable, fails, or returns invalid output, switch to
  `fallback-ready`
- if both AI and fallback fail, use `error-with-retry`

Important rule:

- no exported source file contents or preview payloads may be sent to remote
  services in this slice

### Slice 4: Handoff files

Work:

- create a dedicated quickstart folder under the DataConnect app-data root
- write:
  - `app-quickstart.md`
  - `source-context.json`
- wire `Reveal handoff files` to create-if-needed then open the folder
- keep this separate from the source export directory

Expected files:

- source quickstart helper(s)
- Tauri path/open-resource helpers as needed

### Slice 5: Starter-app adjacent slot

Work:

- derive a starter-app match from the existing app registry
- use the current source id as the matching token
- consider only `status: "live"` apps
- consider an app a strong match when `dataRequired` contains the source token
- show an adjacent starter-app slot only when there is exactly one live match
- open the matched app via its existing external URL behavior

Do not implement in v1:

- multi-app ranking
- carousel/list of starter apps
- Data Apps page redesign

Expected files:

- `src/apps/*` helper for source-to-app matching
- `src/pages/source/*` quickstart UI state

### Slice 6: AI adapter hook-in

Work:

- expose one provider-agnostic generation interface behind the quickstart state
  machine
- keep the adapter optional from the product-availability perspective
- if an approved local or privacy-safe provider exists, connect it here
- if no approved provider exists yet, the fallback path still ships as the
  usable implementation

This slice must not change the UI contract.

## Test Plan

### Route and UI behavior

- Home imported-source `Create app` routes to source overview with
  `intent=create-app`
- import-complete toast `Create app` routes to source overview with the same
  intent
- source-overview `Create app` opens quickstart and closing clears only the
  intent param

### Quickstart state machine

- idle state renders source context and app-idea input
- generating state disables generation controls and preserves context
- AI success enters `generated`
- AI unavailable enters `fallback-ready`
- AI failure after fallback generation keeps fallback visible and offers retry
- total failure enters `error-with-retry`

### Artifact contract

- generated/fallback artifacts include:
  - source id/label
  - local data location
  - source summary
  - app idea
  - prompt
  - next step
- `Copy prompt` copies the prompt string
- `Reveal handoff files` creates and opens the quickstart folder

### Starter-app path

- exactly one live registry match shows one starter-app slot
- zero matches show no slot
- multiple matches show no slot
- starter-app action copy is distinct from `Create app`

### Regression coverage

- completion states never claim the app is built/deployed/live
- no quickstart happy-path code depends on on-chain or CMS calls
- no quickstart path is gated on coding-agent installation detection

## Acceptance Gates

Implementation is not complete until the following eval-backed gates pass:

- `HC-EXPERIENCE-001`
- `HC-EXPERIENCE-003`
- `HC-STRUCTURE-001`
- `HC-RELIABILITY-001`
- `HC-RELIABILITY-002`
- `HC-PRIVACY-001`
- `HC-PRIVACY-002`
- `HC-SCOPE-001`
- `HC-SCOPE-002`
- `HC-SCOPE-003`
- `HC-FIRST-SLICE-001`
- `HC-FIRST-SLICE-002`
- `HC-ADJACENT-001`

## Risks

- source-overview quickstart can become too large if starter-app UI competes
  with artifact UI
- fallback artifact quality may feel generic until source summaries improve
- adding AI too early can pressure the privacy boundary if the adapter contract
  is not enforced strictly

## Exit Criteria

- imported sources consistently offer a source-scoped `Create app` path
- quickstart produces a usable local-first artifact without depending on AI
- starter-app actions appear only when there is exactly one strong match and are
  clearly distinct from quickstart
- users can copy the prompt and reveal handoff files from source overview
- the shipped slice still excludes hosted generation, deployment, on-chain happy
  path work, CMS dependency, and Data Apps redesign
