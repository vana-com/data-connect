# 260311 plan: macOS updater CI proof run

Goal:

- run one real release workflow proof for the macOS updater artifact path
- verify asset publishing, notarization ordering, and post-tar validation on GitHub runners

Important constraint:

- with current repo tooling, a real proof run is a real version/tag/release
- `scripts/release-github.mjs` enforces:
  - clean worktree
  - current branch must equal `--target`
  - new version must be greater than latest remote tag
  - real `gh release create`
- so this proof consumes a real version number unless we later add a separate test-release workflow

## Preconditions

- branch pushed and clean
- Apple notarization secrets configured in GitHub Actions
- updater signing key secrets configured in GitHub Actions
- all release-path commits for this spike merged into the branch you are proving

### Exact GitHub Actions secrets required

Already required for the current release flow:

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

Required specifically for the updater proof path:

- `TAURI_SIGNING_PRIVATE_KEY`
  - value: the full contents of your Tauri updater private key file
  - preferred over path-based config in GitHub Actions
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
  - value: the password for that private key
  - if the key has no password, set this to an empty string or omit only if you have confirmed the CLI accepts that in CI

Do not rely on `TAURI_SIGNING_PRIVATE_KEY_PATH` in GitHub Actions for this flow.
The runner does not automatically have your local key file path.

### Exact setup commands for updater signing secrets

Generate a dedicated updater keypair locally with a real password you choose:

```bash
cd /Users/cflack/Repos/vana-com/data-connect
npm run tauri signer generate -- --password '<real-password>' --write-keys "$HOME/.dataconnect/updater.key" --force
```

Important notes from real execution:

- The current Tauri CLI may ignore the requested `--write-keys` path and still write the generated keypair under `$HOME/.vana/`.
- After generating, do not assume the output path. Check which files actually exist:

```bash
ls -l \
  "$HOME/.dataconnect/updater.key" \
  "$HOME/.dataconnect/updater.key.pub" \
  "$HOME/.vana/updater.key" \
  "$HOME/.vana/updater.key.pub"
```

If Tauri wrote to `$HOME/.vana/updater.key`, use that file for the GitHub secret upload.

Set the GitHub Actions secrets with the GitHub CLI:

```bash
gh secret set TAURI_SIGNING_PRIVATE_KEY --repo vana-com/data-connect < "$HOME/.vana/updater.key"
printf '%s' '<real-password>' | gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD --repo vana-com/data-connect
```

If the key really was written to `$HOME/.dataconnect/updater.key`, substitute that path in the first command.

Verify the secrets exist:

```bash
gh secret list --repo vana-com/data-connect | rg 'TAURI_SIGNING_PRIVATE_KEY|TAURI_SIGNING_PRIVATE_KEY_PASSWORD'
```

## Exact proof command

If proving on the current feature branch:

```bash
git checkout callum1/bui-249-auto-update-the-app-2
git pull --ff-only origin callum1/bui-249-auto-update-the-app-2
npm run release:github -- --version <proof-version> --target callum1/bui-249-auto-update-the-app-2
```

Choose `<proof-version>` as a real unused semver greater than the latest remote tag.

## Latest observed proof result

`v0.7.38` / run `23471687132` is the current best evidence snapshot.

Observed:

- Linux and Windows jobs passed
- both macOS jobs reached the custom post-finalization updater path
- both macOS jobs successfully re-signed the final app, notarized it, stapled it, validated the stapled app, and created the updater `.app.tar.gz`
- both macOS jobs then failed while signing that updater tarball
- the failing command was `npm run tauri -- signer sign -- <tarball>`
- the immediate error was `sh: tauri: command not found`
- only Linux and Windows assets were published on release `v0.7.38`; required macOS updater artifacts were missing

Interpretation:

- updater signing secrets are now correctly wired
- the custom updater path is definitely being exercised
- the current blocker is that the workflow deletes `node_modules` before the updater script calls `npm run tauri`, so the local Tauri CLI is no longer available

## Expected release assets

Minimum macOS proof assets that must exist on the GitHub Release:

- `DataConnect_<version>_aarch64.dmg`
- `DataConnect_<version>_x86_64.dmg`
- `DataConnect_<version>_aarch64.app.tar.gz`
- `DataConnect_<version>_aarch64.app.tar.gz.sig`
- `DataConnect_<version>_x64.app.tar.gz`
- `DataConnect_<version>_x64.app.tar.gz.sig`

Baseline non-macOS artifacts may also be present:

- Windows installer assets
- Linux `.deb`
- Linux `.AppImage`

## Exact log checks

For each macOS matrix job, confirm logs contain:

- `=== Finalizing macOS bundles for aarch64-apple-darwin ===` or `x86_64-apple-darwin`
- `Re-signed`
- `Submitting`
- `Stapling accepted ticket onto`
- `Validating stapled ticket on`
- `Created updater artifacts:`
- `xcrun stapler validate`
- `spctl --assess -vv`
- `codesign --verify --strict`
- `Created DataConnect_<version>_<arch>.dmg`
- `Notarized and stapled`
- `Uploaded DataConnect_<version>_<arch>.app.tar.gz`
- `Uploaded DataConnect_<version>_<arch>.app.tar.gz.sig`
- `Uploaded DataConnect_<version>_<arch>.dmg`

Red flags:

- `Skipping finalized macOS updater artifact generation`
- `sh: tauri: command not found`
- `Notarization FAILED`
- `does not have a ticket stapled`
- `rejected`
- `invalid`
- `Permission denied`
- generic macOS updater assets from `tauri-action`, for example:
  - `DataConnect.app.tar.gz`
  - `DataConnect_aarch64.app.tar.gz`
  - `DataConnect_x64.app.tar.gz` without matching `.sig`
- any overwrite/clobber behavior on macOS updater assets

## Exact post-run inspection commands

```bash
# inspect release assets
gh release view v<proof-version> --json assets

# locate the workflow run
gh run list --workflow Release --limit 10

# dump full logs for archive/review
gh run view <run-id> --log > "/tmp/dataconnect-release-proof-v<proof-version>.log"

# filter the log for proof markers
rg -n "Finalizing macOS bundles|Submitting|Stapling accepted ticket|Validating stapled ticket|Created updater artifacts|spctl --assess|codesign --verify|Uploaded DataConnect_|Notarized and stapled|Skipping finalized macOS updater artifact generation|tauri: command not found|Notarization FAILED|does not have a ticket stapled|rejected|invalid" "/tmp/dataconnect-release-proof-v<proof-version>.log"
```

## Pass criteria

- both macOS jobs pass
- all 6 required macOS assets exist on the release
- no macOS updater asset overwrite/clobber
- updater tarball smoke gate passes after untar
- app notarization/stapling passes before updater packaging
- DMG notarization/stapling passes afterward

## If the proof is just for validation

After review, decide whether to keep or clean up the proof release/tag.

Cleanup is manual:

- delete the GitHub Release
- delete the tag locally/remotely if you do not want to keep the proof artifact history

But note:

- the consumed version number stays consumed for practical purposes once pushed/shared
