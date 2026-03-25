# 260324 secret inventory: Track B updater runtime

Purpose:

- provide one exact list of secret names and local credentials needed for a clean-room implementation from `main`
- let an agent know what must already exist before it attempts signing, notarization, or a real release proof

Important:

- this file does **not** contain secret values
- this file is a names-only inventory
- actual values must come from GitHub repo/environment secrets or local machine credential setup

## Storage model

There are two different storage systems in play:

1. GitHub Actions secrets for the real CI release flow
2. local machine files, keychains, and environment variables for local signing/proof work

That distinction matters:

- an agent can verify that a GitHub secret name exists
- an agent cannot read the value of an existing GitHub Actions secret back out of GitHub
- for a local proof flow, some credentials can be pulled from known local paths
- for a GitHub Actions proof flow, a human must ensure the needed secrets have already been populated in GitHub

## Use this with the handoff spec

Primary implementation doc:

- `docs/plans/260324-track-b-updater-runtime-handoff-spec.md`

If an agent is implementing only code plus tests from `main`, this inventory is mostly informational.
If an agent is expected to run the real release/signing path, these secrets and local credentials must be available first.

## Mode A: implementation and tests only

If the agent is only doing:

- code changes
- unit tests
- typecheck
- workflow edits

Then no release secrets are strictly required.

## Mode B: real GitHub Actions release proof

If the agent is expected to cut a real release and let `.github/workflows/release.yml` run successfully, these GitHub Actions secrets must be present and readable by that branch's workflow run:

- `APPLE_BUILD_CERTIFICATE_BASE64`
- `APPLE_BUILD_CERTIFICATE_PASSWORD`
- `APPLE_ASC_API_KEY_KEY_BASE64`
- `APPLE_ASC_API_KEY_ID`
- `APPLE_ASC_API_KEY_ISSUER_UUID`
- `APPLE_TEAM_ID`
- `VITE_PRIVY_APP_ID`
- `VITE_PRIVY_CLIENT_ID`
- `VITE_SESSION_RELAY_URL`
- `VITE_GATEWAY_URL`
- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

Also used by the workflow:

- `GITHUB_TOKEN`

Notes:

- `GITHUB_TOKEN` is normally provided automatically by GitHub Actions
- the rest must exist in GitHub secrets or the workflow will fail
- for GitHub Actions proof, `TAURI_SIGNING_PRIVATE_KEY` should contain the full private key contents
- do **not** rely on `TAURI_SIGNING_PRIVATE_KEY_PATH` in GitHub Actions; the runner does not share your local filesystem path

### Where these are stored

Expected storage location:

- GitHub repository secrets for `vana-com/data-connect`

How to verify names exist:

```bash
gh secret list --repo vana-com/data-connect
```

Important limitation:

- GitHub does not let the agent or colleague read secret values back out once stored
- if a required secret is missing, a human must source the value from the original credential owner or local source material and set it again

How to set or reset a secret:

```bash
gh secret set SECRET_NAME --repo vana-com/data-connect
```

How to set the updater signing key secret correctly for GitHub Actions:

```bash
gh secret set TAURI_SIGNING_PRIVATE_KEY --repo vana-com/data-connect < "$HOME/.vana/updater.key"
```

If the real key path on a machine is `$HOME/.dataconnect/updater.key`, substitute that path instead.

### What a colleague needs to know

If the colleague is running a real release proof from `main`, they do **not** need a new secret store just because the branch changed.

They do need:

- the branch workflow run to have access to the same repository secrets
- confirmation that those names already exist in GitHub

If those names do not exist, the colleague cannot recover the values from GitHub and must ask whoever originally provisioned them.

## Mode C: local macOS release/signing proof

If the agent is expected to run the equivalent signing/notarization path locally on macOS, the local machine must have the following available.

### Local environment variables

Required for updater tarball signing:

- `TAURI_SIGNING_PRIVATE_KEY` or `TAURI_SIGNING_PRIVATE_KEY_PATH`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` if the key is password-protected

Required for notarization:

- `APPLE_NOTARY_KEY_PATH`
- `APPLE_NOTARY_KEY_ID`
- `APPLE_NOTARY_ISSUER`

Common app build environment values:

- `VITE_PRIVY_APP_ID`
- `VITE_PRIVY_CLIENT_ID`
- `VITE_SESSION_RELAY_URL`
- `VITE_GATEWAY_URL`

### Where these are stored locally

Updater signing key:

- expected local source path is one of:
  - `$HOME/.vana/updater.key`
  - `$HOME/.dataconnect/updater.key`

Public updater key:

- expected local source path is one of:
  - `$HOME/.vana/updater.key.pub`
  - `$HOME/.dataconnect/updater.key.pub`

How to check which path is real on a machine:

```bash
ls -l \
  "$HOME/.dataconnect/updater.key" \
  "$HOME/.dataconnect/updater.key.pub" \
  "$HOME/.vana/updater.key" \
  "$HOME/.vana/updater.key.pub"
```

Important note from prior proof work:

- the Tauri CLI may ignore the requested `--write-keys` path and write under `$HOME/.vana/` anyway
- always check which file actually exists before wiring secrets or local env vars

Apple notarization key:

- local storage path is operator-chosen
- the workflow decodes the App Store Connect key from `APPLE_ASC_API_KEY_KEY_BASE64` into a temporary `.p8` file at runtime
- for local proof work, the operator must provide a real `APPLE_NOTARY_KEY_PATH`

Build-time frontend env values:

- may come from local shell env or a local `.env` file if the operator uses one
- in CI they come from GitHub Actions secrets

### Local machine credentials and tooling

Required in the local macOS keychain/tooling setup:

- Apple Developer ID Application certificate imported into a keychain
- signing identity matching `Developer ID Application: Corsali, Inc (<APPLE_TEAM_ID>)`
- Xcode command line tools with `xcrun notarytool` and `stapler`
- Rust toolchain with `cargo`
- Node/npm

## Where these names come from

Current source-of-truth inputs on `main`:

- `.github/workflows/release.yml`
- [docs/plans/260324-track-b-updater-runtime-handoff-spec.md](/Users/cflack/Repos/vana-com/data-connect/docs/plans/260324-track-b-updater-runtime-handoff-spec.md)

This inventory intentionally avoids depending on branch-only helper scripts or proof notes.

## Retrieval instructions to give a colleague or agent

Use this exact guidance:

1. If you are only implementing and testing from `main`, do not block on release secrets.
2. If you are running a real release proof in GitHub Actions, first run:

```bash
gh secret list --repo vana-com/data-connect
```

3. Confirm the required names in this file exist.
4. If a required GitHub secret is missing, stop and ask a human to re-provision it. You cannot read the old value back out of GitHub.
5. If you are running local macOS signing work, first check whether the updater key exists at:
   - `$HOME/.vana/updater.key`
   - `$HOME/.dataconnect/updater.key`
6. If the updater key is missing locally, stop and ask a human for the key material or regenerate and re-wire it intentionally.
7. If local notarization is required, confirm the machine has a valid `APPLE_NOTARY_KEY_PATH`, Apple signing certificate, and keychain setup before continuing.

## What the agent should be told

Give the agent this instruction:

`Implement from main using docs/plans/260324-track-b-updater-runtime-handoff-spec.md. Do not assume secrets exist. Before any real release, signing, or notarization step, use docs/plans/260324-track-b-updater-runtime-secret-inventory.md to verify where each secret should live, check whether it is present, and stop if any required GitHub secret value or local signing credential cannot be sourced.`

## Exact practical meaning

If you switch to `main` and run the agent locally:

- the agent can implement the feature without secrets
- the agent cannot complete the real release/signing proof unless the local machine also has the local credentials above

If you switch to `main` and run a real GitHub release from the new branch:

- the branch does not need "its own" copy of the secrets
- GitHub Actions for that branch must still have access to the same repo/environment secrets listed above
- the proof release may target that branch intentionally, but normal production releases still remain main-first per [docs/release-process.md](/Users/cflack/Repos/vana-com/data-connect/docs/release-process.md)

That is the entire secret dependency surface for this feature.
