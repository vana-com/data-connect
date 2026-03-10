# Adding a New Connector

This doc covers the work beyond `ecosystem/submit-data-app.md`.

That submission doc is enough when you are only listing a data app on `/apps`.
It is not the full checklist for shipping a new connector inside DataConnect.

## Two cases

### 1. You are only submitting a data app

Follow `ecosystem/submit-data-app.md`.

Current rule:

- if your app submission uses valid protocol scopes
- and those scopes identify a platform token like `amazon`, `linkedin`, or `shop`
- the `/apps` card can derive required-source logos from those scope tokens
- no manual icon wiring is required for normal `.com` domains

Examples:

- `amazon.orders` -> `amazon` -> `amazon.com` -> Logo.dev
- `shop.orders` -> `shop` -> `shop.app` via registry override -> Logo.dev

Extra work is only needed for weird domains or custom branding rules.

### 2. You are shipping a new connector in DataConnect itself

This is bigger than app submission. Do this checklist.

## Connector checklist

### Upstream connector source

Add the connector in `vana-com/data-connectors`:

- add the connector script
- add the connector metadata JSON
- add the connector entry to upstream `registry.json`

DataConnect reads connector availability from the connector registry/metadata, not from app submissions.

## Local runtime verification

DataConnect has two connector locations in dev:

- repo source: `./connectors/`
- runtime copy: `~/.dataconnect/connectors/`

Use:

- `npm run tauri:dev`

That fetches missing required connectors and syncs the repo copy into the runtime copy.

Verify:

- the connector shows up in runtime platform loading
- you can start it from the app

## Platform registry: when you still need it

You do not always need a platform registry entry for app-submission logos anymore.

You still need `src/lib/platform/registry.ts` when any of these are true:

- the real brand domain is not the default `<token>.com`
- you need canonical aliasing between connector ids, names, and product names
- you want a curated display name
- you need `ingestScope`
- you want source/home/connect surfaces to resolve the platform consistently

Examples where registry metadata matters:

- `shop` -> `shop.app`
- `oura` -> `ouraring.com`
- `x` -> `x.com`

Add a registry entry with:

- `id`
- `displayName`
- `brandDomain` when the domain is not trivially derivable
- `platformIds` for connector ids
- `aliases` when names differ
- `ingestScope` when needed by scope-driven UI

## Local icon component: optional

You only need `src/lib/platform/icons.ts` and a custom icon component when you want a hand-authored local icon instead of provider-backed logos.

This is optional.

Provider-backed logos should be the default path for new platforms.

## What should work with no extra human icon step

For a normal new platform, the intended happy path is:

1. connector metadata defines valid scopes
2. app submission uses those scopes
3. UI extracts the canonical platform token from the scope
4. UI derives the provider domain from the token or registry override
5. logo renders

That means "add a valid connector scope" should be enough for `/apps` card source logos in the common case.

## Verification checklist

- connector metadata contains the actual protocol scopes
- app submission uses those exact scopes
- `/apps` shows the required-source logos you expect
- if the brand domain is not `<token>.com`, `src/lib/platform/registry.ts` has a `brandDomain` override
- if the runtime connector name/id is weird, `platformIds` or `aliases` are present
- if you want a handcrafted icon instead of Logo.dev, add an icon component mapping

## Decision rule

Ask one question first:

- "Am I only listing an app, or am I shipping a connector in DataConnect?"

If it is app listing only:

- `ecosystem/submit-data-app.md` should usually be enough

If it is connector shipping:

- use this doc as the extra checklist
