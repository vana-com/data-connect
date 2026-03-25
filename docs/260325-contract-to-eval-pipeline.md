# 260325 contract-to-eval pipeline

Purpose:

- capture the eval method that emerged from the Track B updater runtime work
- make that method repeatable from `main` without relying on branch history
- operationalize a small internal template so future feature work can start from contracts instead of ad hoc test ideas

## Why this exists

The updater work was planned from a strong source-of-truth spec, but the eval strategy was still assembled during implementation.

The main lesson is that we can make this more deterministic:

1. extract contracts from the source-of-truth docs first
2. convert each contract into a single invariant sentence
3. assign each invariant to a fixed eval bucket
4. define fixture classes and oracles before implementation
5. add one regression eval for each real bug discovered during the work

If we do that up front, we get a cleaner implementation loop:

- the plan defines behavior
- the eval pack defines proof
- implementation becomes the act of making both true at once

## Deterministic method

### Step 1: extract contracts

Read the source-of-truth doc set and pull out only behavior or artifact statements that must remain true.

Good contract examples:

- `latest.json` must publish both macOS targets
- macOS only shows `Restart to update` after staging completes
- `Later` is session-only for staged macOS updates
- non-macOS stays on release-page fallback

Avoid extracting:

- implementation guesses
- library-specific convenience APIs
- branch history

### Step 2: normalize each contract into one invariant

Write each invariant as a sentence that can be proven true or false.

Examples:

- given valid signed assets for both macOS targets, the manifest builder emits one canonical updater manifest
- given a macOS Tauri update, the app only reaches `restartReady` after download completes
- given a dismissed staged macOS update, background rechecks do not claim a different state or discard the staged install handle
- given a non-macOS runtime, the app never enters the Tauri updater lane

### Step 3: assign a fixed eval bucket

Use the smallest bucket that matches the invariant.

| Bucket | What belongs here |
| --- | --- |
| Pure transform | file builders, parsers, normalization, manifest generation |
| Runtime seam | wrapper modules over native/browser APIs |
| Hook or state machine | polling, dismissal, retries, status transitions |
| Workflow or config | CI jobs, artifact publication, static config wiring |
| Proof run | tagged release or real credential-backed validation |

### Step 4: choose fixture classes

Use the same fixture classes each time unless the feature needs something special.

Core fixture classes:

- happy path
- missing input
- ambiguous input
- wrong platform or runtime
- retry or dismiss
- fail-soft path
- replacement or version change

### Step 5: define the oracle before writing the eval

Each eval needs one primary oracle.

Allowed oracle shapes:

- exact output artifact shape
- exact state transition
- exact side effect called
- exact side effect not called
- exact failure mode

If the oracle feels fuzzy, the contract is not normalized enough yet.

### Step 6: write one eval per invariant, then add regression evals

The first eval set should come directly from the contract list.

After implementation starts:

- every real bug gets one regression eval
- regression evals become part of the permanent contract pack for that feature area

## Track B updater runtime: retrospective eval map

This is the specific eval pack we effectively built, plus the ones that should be considered part of the durable contract for reruns from `main`.

### Pure transform evals

| Contract | Invariant | Fixture | Oracle |
| --- | --- | --- | --- |
| `latest.json` must include both macOS targets | given both signed macOS updater artifacts, the builder emits `darwin-aarch64` and `darwin-x86_64` | release asset metadata plus `.sig` fixtures | exact manifest shape |
| legacy names may be accepted on input | `arm64` normalizes to `aarch64` and `x64` normalizes to `x86_64` | alias-named assets | canonical manifest keys |
| ambiguous duplicates must fail loudly | two assets that normalize to the same target abort the build | canonical plus alias duplicate fixture | exact thrown failure |
| signatures are required | missing `.sig` prevents manifest generation | missing signature fixture | exact thrown failure |

### Runtime seam evals

| Contract | Invariant | Fixture | Oracle |
| --- | --- | --- | --- |
| updater lane is macOS Tauri only | non-macOS or non-Tauri returns no updater work | browser and non-mac fixtures | exact no-op result |
| staged flow is separate from install | install only succeeds after an update handle exists | check/download/install sequence fixture | exact boolean result and calls |
| same-version rechecks must not discard staged state | a repeated check for the same version keeps the original staged handle | two same-version update handles | install still uses the originally downloaded update |

### Hook and state-machine evals

| Contract | Invariant | Fixture | Oracle |
| --- | --- | --- | --- |
| startup should not check immediately | the first check happens after the settle delay | fake timer startup fixture | exact delayed call |
| macOS should stage before prompting | a macOS update downloads before the restart toast appears | available update fixture | `download` called before restart-ready surface |
| `Later` is session-only | dismissing a staged macOS update suppresses only the toast for the same session | dismiss plus recheck fixture | no duplicate toast on passive recheck |
| passive rechecks must stay truthful | after dismissal, the app stays `restartReady` only if the staged update is still retained | dismiss plus same-version recheck fixture | restart-ready without a second download, install still works |
| non-macOS fallback is preserved | browser or non-macOS still uses the release-page lane | fallback decision fixture | Tauri seam not called |
| failures fail soft | check, download, or install errors do not break the app | thrown error fixtures | exact `unknown` or safe fallback state |

### Workflow and config evals

| Contract | Invariant | Fixture | Oracle |
| --- | --- | --- | --- |
| `latest.json` is published once after matrix completion | the release workflow contains one post-matrix manifest job | workflow file | structural presence of the job and dependency chain |
| macOS-only permissions do not break non-mac builds | shared capabilities validate on Linux/Windows without `process` or `updater` permissions leaking in | capability files plus release-matrix targets | no macOS-only plugin permissions in globally validated capability files |
| canonical release assets come from one upload path | the workflow does not combine default Tauri release uploads with explicit finalized-artifact uploads | workflow file | one authoritative release upload path for updater artifacts |
| updater endpoint is stable | Tauri config points at the GitHub latest-download manifest URL | config file | exact URL and pubkey presence |
| finalized macOS assets are uploadable | release scripts output updater tarball plus `.sig` after finalization | script invocation inputs | exact emitted artifact names |

### Proof-run evals

| Contract | Invariant | Fixture | Oracle |
| --- | --- | --- | --- |
| release proof may use a branch target as a special flow | a proof release can be driven from an implementation branch without changing the normal main-first release rule | manual proof checklist | exact proof checklist completion |
| GitHub Actions signing uses secret contents | CI proof uses `TAURI_SIGNING_PRIVATE_KEY` contents, not a file path | credentialed workflow run | successful signing path |
| post-matrix publish depends on matrix health | when the workflow keeps Linux/Windows in the matrix, those legs do not fail before `latest.json` publication | real release run | build matrix succeeds and manifest upload job runs |
| release asset set stays canonical | a proof release does not publish extra generic updater tarballs alongside the finalized versioned ones | real release run | release asset list contains only the intended canonical updater artifacts |

## Operationalized template

Use this template at plan time for any feature with a meaningful runtime or release contract.

| Field | What to write |
| --- | --- |
| Contract | the behavior or artifact statement from the source-of-truth doc |
| Invariant | one sentence that can be proven true or false |
| Eval type | pure transform, runtime seam, hook/state machine, workflow/config, or proof run |
| Fixture | the smallest input setup that exercises the invariant |
| Oracle | the exact output, state transition, side effect, or failure to assert |
| Why this exists | the user-facing or operational risk guarded by this eval |

Example row:

| Field | Example |
| --- | --- |
| Contract | `Later` is session-only for staged macOS updates |
| Invariant | given a dismissed staged update, passive rechecks do not re-toast the same version in the same session |
| Eval type | hook/state machine |
| Fixture | mocked macOS Tauri runtime, one available update, dismiss action, second passive check |
| Oracle | restart toast shown once, no second toast on passive recheck |
| Why this exists | prevents notification spam without lying about update state |

## Suggested working loop for reruns from `main`

1. tighten or confirm the source-of-truth docs
2. build the contract table before writing code
3. implement evals bucket by bucket
4. implement the feature behind those evals
5. add one regression eval per discovered bug
6. only then run the real proof flow

## Exit criteria

The approach is working when:

- a new implementer can start from `main` and the docs alone
- the eval pack can be derived from the contracts without improvising new categories mid-stream
- discovered bugs become permanent regression evals
- proof runs are the last validation step, not the first moment behavior gets clarified
