# Submit a Data App

Use GitHub so the submission itself is reviewable, linkable, and easy to preview locally before merge.

If you are shipping a new connector in DataConnect itself, not just submitting an app that uses an existing connector scope, also read [`docs/260310-adding-a-new-connector.md`](../docs/260310-adding-a-new-connector.md).

## What actually matters

- Only the frontmatter is machine-read.
- Anything below the closing `---` is optional reviewer context.
- If you do not need extra context, you can submit frontmatter only.

## How listing works

- A merged markdown file in `ecosystem/app-submissions/` is treated as approved.
- The app registry ingests those markdown files directly at build time.
- That means a local, unmerged markdown file will also show up in local preview.
- Invalid submission frontmatter should fail local preview/build so problems are fixed before merge.

## Preview before opening a PR

1. Create or edit a file in `ecosystem/app-submissions/`.
2. Run `npm run dev`.
3. Open `/apps`.
4. Confirm your app card renders correctly before you push anything.

This works pre-merge because Vite loads local submission markdown files directly from the repo.

## Preferred GitHub flow

1. Open the [one-click submission editor](https://github.com/vana-com/data-connect/new/main?filename=ecosystem%2Fapp-submissions%2Fyour-app-slug.md&value=---%0Aid%3A%20your-app-slug%0Aname%3A%20Your%20App%20Name%0Astatus%3A%20live%0AexternalUrl%3A%20https%3A%2F%2Fexample.com%0Aicon%3A%20Y%0Adescription%3A%20One-line%20description%20for%20the%20app%20card.%0Acategory%3A%20Assistant%0Ascopes%3A%0A%20%20-%20chatgpt.conversations%0A---%0A%0A##%20Builder%0A%0A-%20Name%3A%0A-%20Contact%3A%0A-%20Repo%3A%0A%0A##%20Demo%0A%0A-%20Demo%20URL%3A%0A-%20Screenshots%3A%0A%0A##%20Notes%0A%0A-%20Anything%20reviewers%20should%20know%3A%0A).
2. If GitHub asks you to fork the repo first, do that.
3. Fill out the frontmatter.
4. If you want, add optional reviewer notes below the closing `---`.
5. Commit the new file.
6. Open a pull request back to `vana-com/data-connect`.
7. Use the `data-app-submission.md` PR template if GitHub asks you to choose a template.

## Manual flow

1. Copy [`ecosystem/app-submissions/_template.md`](./app-submissions/_template.md).
2. Create `ecosystem/app-submissions/<your-app-slug>.md`.
3. Open a pull request with that file.

## Required frontmatter

For `live` apps:

- `id`
- `name`
- `status: live`
- `icon`
- `iconUrl` (optional, `https://` only)
- `builderName` (optional)
- `builderUrl` (optional, `https://` only)
- `description`
- `category`
- `externalUrl` (`https://` only)
- `scopes`

For `coming-soon` apps:

- `id`
- `name`
- `status: coming-soon`
- `icon`
- `iconUrl` (optional, `https://` only)
- `builderName` (optional)
- `builderUrl` (optional, `https://` only)
- `description`
- `category`

`icon` is the fallback letter tile. If you already know the exact website icon URL, include `iconUrl`.
If you omit it, DataConnect tries `/icon.svg`, `/icon.png`, `/favicon.ico`, and `/apple-touch-icon.png` from `externalUrl`.
`iconUrl` must also be `https://` if you provide it.
`builderName` and `builderUrl` let the community page show authorship for the app card.
`builderUrl` must also use `https://` if you provide it.
`externalUrl` must be a production `https://` URL. No `http://`, localhost, or custom URI schemes.

## Where to get scopes

You have probably already seen this while building the app, usually via the starter and connector metadata. This is just the refresh.

- Registry: [vana-com/data-connectors `registry.json`](https://raw.githubusercontent.com/vana-com/data-connectors/main/registry.json)
- Repo: [vana-com/data-connectors](https://github.com/vana-com/data-connectors)

Here's how to get the exact scopes you used in your app:

1. Open `registry.json`.
2. Find the connector you use.
3. Copy its `files.metadata` path.
4. Open that JSON file in the connectors repo.
5. Copy the scope names from that connector metadata into your submission.

Example:

- `linkedin-playwright` -> `linkedin/linkedin-playwright.json`
- `chatgpt-playwright` -> `openai/chatgpt-playwright.json`
- `oura` connector metadata should make the exact Oura scope obvious the same way.

Use the actual protocol-style scope strings from connector metadata, like `chatgpt.conversations` or `linkedin.profile`.

## What this doc does not cover

This doc is for app submission.

It does not cover the extra work for shipping a new runtime connector in DataConnect itself, such as:

- upstream connector script/metadata work
- runtime connector sync/verification
- optional platform registry overrides for non-standard domains or aliases

For that workflow, use [`docs/260310-adding-a-new-connector.md`](../docs/260310-adding-a-new-connector.md).

## Fallback

If GitHub is a blocker, email [callum+apps@opendatalabs.xyz](mailto:callum+apps@opendatalabs.xyz) with the same information.
