# 260324 secret inventory: Track B updater runtime

Purpose:

- provide one exact list of secret names and local credentials needed for a clean-room implementation from `main`
- let an agent know what must already exist before it attempts signing, notarization, or a real release proof

Important:

- this file does **not** contain secret values
- this file is a names-only inventory
- actual values must come from GitHub repo/environment secrets or local machine credential setup

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

### Local machine credentials and tooling

Required in the local macOS keychain/tooling setup:

- Apple Developer ID Application certificate imported into a keychain
- signing identity matching `Developer ID Application: Corsali, Inc (<APPLE_TEAM_ID>)`
- Xcode command line tools with `xcrun notarytool` and `stapler`
- Rust toolchain with `cargo`
- Node/npm

## Where these names come from

Workflow source:

- `.github/workflows/release.yml`

Script source:

- `scripts/build-macos-updater-artifacts.mjs`
- `scripts/notarize-macos-app.mjs`

## What the agent should be told

Give the agent this instruction:

`Implement from main using docs/plans/260324-track-b-updater-runtime-handoff-spec.md. Do not assume secrets exist. Before any real release, signing, or notarization step, verify that the secret names in docs/plans/260324-track-b-updater-runtime-secret-inventory.md are available in the target environment. If they are not available, stop before the release proof step.`

## Exact practical meaning

If you switch to `main` and run the agent locally:

- the agent can implement the feature without secrets
- the agent cannot complete the real release/signing proof unless the local machine also has the local credentials above

If you switch to `main` and run a real GitHub release from the new branch:

- the branch does not need "its own" copy of the secrets
- GitHub Actions for that branch must still have access to the same repo/environment secrets listed above

That is the entire secret dependency surface for this feature.
