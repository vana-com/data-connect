# 260324 Implementation Plan: Source Pipeline Home And Local App Creation

> [!WARNING]
> SUPERSEDED — archived on 2026-03-25.
> This document is retained for early ideation/reference only and is no longer
> an active source of truth.
> Use `docs/builder-flow/260325-app-quickstart-spec.md` and
> `docs/plans/260325-app-quickstart-implementation-plan.md` instead.

## Goal

Implement the Home/source-overview changes needed to:

- recast Home as a source pipeline
- make imported sources actionable
- add a local-first `Create app` handoff flow

This plan intentionally covers `V1` and `V1.5`, and explicitly excludes hosted
one-click deployment.

## Confirmed decisions

- use a two-column Home board, not tabs
- preserve current import blocking/background behavior
- route `Create app` into source overview
- use URL search params to trigger app-creation UI state
- make app creation local-first and agent-agnostic
- do not attempt hosted one-click deployment in this phase

## Scope

### V1

- Home shows:
  - `Available / Importing`
  - `Imported / Ready to use`
- imported-source cards expose:
  - `View data`
  - `Create app`
  - `Fetch latest`
- import-complete toast exposes:
  - `View data`
  - `Create app`
- source overview can open app-creation UI based on URL intent
- source overview can generate/copy/reveal an agent handoff artifact

### V1.5

- improve handoff quality and clarity
- add example-app references where available
- anticipate user next steps in the generated handoff
- make source overview feel like a polished launch point for app creation

## Out of scope

- remote agent execution
- user account linking to Vercel
- repo provisioning and deployment automation
- job queue/progress system for app generation
- cloud transfer of exported user data

## Proposed UX

### Home

Left column:

- source cards for importable sources
- active imports stay here while running
- preserve current spinner/backgrounding semantics

Right column:

- imported-source cards
- each card includes:
  - last updated
  - `View data`
  - `Create app`
  - `Fetch latest`

### Import completion

- global toast:
  - `{Source} import complete`
  - `View data`
  - `Create app`

Routes:

- `View data` -> `/sources/:platformId`
- `Create app` -> `/sources/:platformId?intent=create-app`

### Source overview

Add app-creation entry point on the overview page:

- sidebar action or top action area
- opens a sheet/dialog/panel if `intent=create-app`

App-creation UI should offer:

- `Copy prompt`
- `Reveal handoff files`

V1.5 can add:

- `Open example app`
- `Open source folder`

## Technical slices

### Slice 1: Home IA refactor

Files likely touched:

- `src/pages/home/index.tsx`
- `src/pages/home/components/connected-sources-list.tsx`
- `src/pages/home/components/available-sources-list.tsx`
- new Home layout components

Work:

- replace current stacked sections with a two-column layout
- keep current orchestration in `index.tsx`
- introduce a dumb layout layer that takes prepared props and callback handlers
- avoid overloading the new layout with run/state derivation logic
- adapt imported-source list so each row/card can expose `Create app`
- keep current import-state policy logic intact

Suggested component organization:

- keep current functional/orchestration components working during migration
- add new layout-first components rather than mutating the current ones in place

Suggested split:

- `index.tsx`
  - owns data fetching, route navigation, callbacks, debug wiring
  - builds view-model props for presentation
- `home-source-pipeline-layout.tsx`
  - dumb two-column shell
  - receives:
    - page title
    - left column content props
    - right column content props
- `home-available-sources-section.tsx`
  - dumb presentational section for the left column
  - receives cards + callbacks
- `home-imported-sources-section.tsx`
  - dumb presentational section for the right column
  - receives rows/cards + callbacks

Migration rule:

- prefer creating new layout/presentation components
- leave current `ConnectedSourcesList` and `AvailableSourcesList` intact until
  the new structure proves cleaner
- reuse existing lower-level primitives where possible

Reason:

- this keeps layout agnostic from business logic
- this avoids turning existing mixed-responsibility components into harder-to-read
  transition code
- this gives us a clearer cut line between orchestration and presentation

### Concrete prop interface sketch

The target shape is:

- route/container builds view models
- layout components render only
- sections take plain data + callbacks
- lower-level item components stay small and dumb

Example sketch:

```ts
type HomePipelineColumnKey = "available" | "imported"

interface HomeSourcePipelineLayoutProps {
  title: string
  leftColumn: HomePipelineColumnProps
  rightColumn: HomePipelineColumnProps
}

interface HomePipelineColumnProps {
  key: HomePipelineColumnKey
  heading: string
  description?: string
  emptyState?: {
    title: string
    description?: string
  }
  children: ReactNode
}

interface HomeAvailableSourcesSectionProps {
  heading: string
  description?: string
  addYourOwnHref: string
  sources: HomeAvailableSourceCardProps[]
  onConnect: (platformId: string) => void
  onStopImport: (runId: string) => void
}

interface HomeAvailableSourceCardProps {
  id: string
  name: string
  iconName: string
  iconImageSrc?: string
  availability: "available" | "running" | "blocked" | "coming-soon"
  statusLine?: string
  accountLine?: string
  expectationLine?: string
  helperLine?: string
  runId?: string
  canConnect: boolean
  canStop: boolean
}

interface HomeImportedSourcesSectionProps {
  heading: string
  description?: string
  sources: HomeImportedSourceRowProps[]
  onViewData: (platformId: string) => void
  onCreateApp: (platformId: string) => void
  onSync: (platformId: string) => void
}

interface HomeImportedSourceRowProps {
  id: string
  name: string
  iconName: string
  lastUpdatedLabel?: string
  syncState?: "idle" | "running" | "backgrounding"
  syncDisabled?: boolean
  createAppDisabled?: boolean
}
```

Container responsibility:

- derive `availability`
- derive copy such as `statusLine`, `accountLine`, `expectationLine`
- derive whether actions are enabled
- map platform/run state to simple row/card props

Presentation responsibility:

- render headings and body copy with `Text`
- render layout spacing and column structure
- wire button clicks back through provided callbacks
- avoid reading router/store/hooks directly

### Suggested file shape

```text
src/pages/home/
  index.tsx
  use-home-page.ts
  components/
    home-source-pipeline-layout.tsx
    home-pipeline-column.tsx
    home-available-sources-section.tsx
    home-available-source-card.tsx
    home-imported-sources-section.tsx
    home-imported-source-row.tsx
```

The point of `use-home-page.ts` is not to invent more abstraction. It is just a
clean place to hold Home orchestration once the route starts doing more:

- derive available/imported view models
- expose callbacks
- handle import-success refresh/toast behavior
- keep `index.tsx` mostly composition

### Layout notes from existing components

Use the current page and source overview rhythm as the guide:

- keep `PageContainer` at the route level
- keep headings/subcopy grouped in `space-y-1` or `space-y-gap` blocks
- keep `Text` as the default for visible copy
- prefer simple column wrappers over deeply nested section shells
- preserve the existing calm spacing patterns before trying to redesign them

This should feel like the current app, just reorganized into a clearer pipeline.

### Slice 2: Completion CTA plumbing

Files likely touched:

- Home import orchestration files
- global toast usage points

Work:

- detect terminal success transition for a source import
- show one completion toast per successful run
- wire toast actions to source overview routes

### Slice 3: Source overview intent handling

Files likely touched:

- `src/pages/source/index.tsx`
- `src/pages/source/use-source-overview-page.ts`
- source overview components

Work:

- read `intent=create-app` from URL search params
- open app-creation UI state on first render for that intent
- keep route canonical to the source page, not a new app-builder route

### Slice 4: Local handoff generation

Files likely touched:

- source overview hook/components
- new helper(s) for handoff generation

Work:

- derive source summary from existing export preview/meta
- generate agent-agnostic prompt text
- expose `Copy prompt`
- expose `Reveal handoff files`

Potential artifact formats:

- markdown prompt file
- small folder with prompt + source metadata

### Slice 5: V1.5 smoothing

Work:

- add example-app mapping support
- enrich prompts with source-specific guidance
- make likely next actions obvious in source overview

## Data/product rules

- `Create app` is always explicit user intent
- never imply the app is already being built
- never upload source export data remotely in this phase
- do not depend on detecting Claude/Codex/etc.
- handoff must be useful even if the user only copies plain text

## Suggested implementation order

1. Home two-column layout
2. `Create app` CTA on imported sources
3. source overview URL-intent handling
4. completion toast CTA wiring
5. local prompt/handoff generation
6. v1.5 prompt quality and example-app refinement

## Testing

- Home layout tests for available/imported split
- tests covering import success -> toast CTA visibility
- source overview tests for `intent=create-app`
- runtime-branch tests for local file reveal/open helpers where needed
- regression test that `View data` and `Create app` routes stay source-scoped

## Risks

- Home can become more complex if imported-source actions are overstuffed
- source overview could feel overloaded if the app-creation UI is too large
- generated prompts may be weak until example-app mappings and schema summaries
  improve

## Exit criteria

- Home clearly reads as a source pipeline
- imported sources feel actionable
- users can reach app creation from both Home and source overview
- app-creation handoff is local-first and usable without a hosted backend
- the plan remains explicitly short of one-click deployed generation
