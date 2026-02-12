# GitHub release process (deterministic)

Use `npm run release:github` to perform a deterministic release flow:

1. Validate tools (`git`, `gh`) and GitHub auth
2. Require a clean working tree
3. Require current branch equals target branch (default `main`)
4. Pull latest with fast-forward only
5. Bump `src-tauri/tauri.conf.json` version
6. Commit the version bump
7. Push branch
8. Create GitHub release tag (`vX.Y.Z`)

Creating the GitHub release triggers `.github/workflows/release.yml` (`on: release: created`), which builds and uploads artifacts.

The script also enforces version ordering:

- New version must be greater than `src-tauri/tauri.conf.json` version
- New version must be greater than latest remote `v*` semver tag

## Command

```bash
npm run release:github -- --version 0.8.0
```

## Options

- `--version X.Y.Z` (required)
- `--target main` (optional; default `main`)
- `--title "DataBridge vX.Y.Z"` (optional)
- `--notes "Release vX.Y.Z"` (optional)
- `--dry-run` (optional; print planned actions only)
- `--no-push` (optional; commit locally, skip push)
- `--show-versions` (optional; print local + latest remote version)
- `--suggest-version` (optional; print next valid patch version)
- `--check-version` (optional; validate ordering and exit)

## Examples

Dry run:

```bash
npm run release:github -- --version 0.8.0 --dry-run
```

Create release with custom notes:

```bash
npm run release:github -- --version 0.8.0 --notes "Adds source export fixes."
```

Show current version state:

```bash
npm run release:versions
```

Show suggested next version only:

```bash
npm run release:github -- --suggest-version
```

Validate candidate version only:

```bash
npm run release:github -- --version 0.8.0 --check-version
```

## Common failure cases

- Dirty git tree -> commit/stash first.
- Not on target branch -> checkout target branch.
- Tag already exists -> choose a new version.
- `gh` unauthenticated -> run `gh auth login`.
- Missing CI secrets -> GitHub workflow fails after release creation.
