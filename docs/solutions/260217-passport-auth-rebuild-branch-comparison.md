---
tags: [passport-auth, branch-comparison, review]
impact: high
prevents: "Haphazard auth/grant refactors with weak phase-gate traceability"
---

# 260217-passport-auth-rebuild-branch-comparison

## Context

Compare two implementations of the same passport auth conversion effort:

- current rebuild branch: `callum1/bui-178-passport-auth-conversion-rebuild`
- prior branch: `callum1/bui-178-refactor-connectgrant-flow-in-dc`

Comparison goal: validate whether the rebuild did a better job against `docs/plans/260217-passport-auth-rebuild-plan.md` (phase gates, safety, testability, and reviewability).

## Root cause

The prior branch reached similar product behavior, but changes were delivered with broader early-scope refactors and mixed concerns in the same windows (legacy removals, docs/archive, auth/grant boundaries), increasing review burden and regression risk.

The rebuild branch was intentionally executed as a phase-gated reimplementation and briefly introduced a callback token entropy regression, which was corrected in `e23acdf`.

## Final fix

Branch-comparison findings and verdict:

### Findings (ordered by severity)

- **P1 security regression found and fixed:** `new_callback_state()` had temporarily moved to predictable `auth-<pid>-<timestamp>` and was restored to CSPRNG-backed URL-safe base64 token generation in `e23acdf` (with regression test coverage).
- **Old branch sequencing is riskier:** starts with broad legacy auth surface removal (`e0ed5a5`) before callback hardening / seam extraction / gate tests, so blast radius is high early.
- **Current branch is more phase-gated and reviewable:** commits map closely to plan phases (`9254214 -> 3607f33 -> 9edada2 -> 1ac0973 -> ad5e8e6/7b97ad0 -> bbd8e1f`) with tests interleaved.
- **Phase 4 quality is better on current:** old branch kept contract-gated pass-through TODO path in `use-deep-link.ts`; current adds explicit normalizer seam and strict allowlist gate.
- **Old branch has more mixed-concern/noise in feature window:** 22 commits, 81 files, 3542+/3563- vs current 19 commits, 59 files, 3528+/1478-.

### Phase-by-phase winner

- **Phase 1 (callback boundary hardening):** Current (clear win) for method-contract tests + reject reasons + exactly-once behavior coverage; callback token entropy regression is now fixed in `e23acdf`.
- **Phase 2 (grant-flow architecture):** Current (clean seam extraction and decomposition sequence).
- **Phase 3 (durable auth + resume boundaries):** Current (clearer service/bridge boundaries and less scattered orchestration).
- **Phase 4 (deep-link normalization + contract gate):** Current (deterministic normalization + strict gate path beats pass-through TODO).
- **Phase 5 (legacy removal + observability):** Tie with slight current edge (both remove legacy and reduce hot-path logs; current sequencing is safer).
- **Docs/process traceability for rebuild objective:** Current.

### Evidence matrix

| Phase | Current branch evidence | Old branch evidence | Winner | Why |
| --- | --- | --- | --- | --- |
| Phase 1: callback boundary hardening | `9254214` (one-time callback state), `4b03498` (POST-only contract tests in `auth.rs`), `e23acdf` (CSPRNG callback token restore + entropy test) | `9f06b38`, `e2e63a9`, `0d1dff9` | Current | Better gate-first sequencing, explicit callback contract tests, and restored high-entropy callback token generation. |
| Phase 2: grant-flow architecture | `3607f33` (machine seam), `9edada2` (bootstrap/approval/auth bridge split), `6bbcb5d` (exactly-once test) | `7ab95d6`, `d0a1cd4` | Current | Cleaner separation trajectory with tighter phase mapping and less mixed scope. |
| Phase 3: durable auth + resume semantics | `1ac0973` (`auth-session` service, `pending-approval-secret-bridge`, hydration hooks) | `4bb096b`, `08e3cab`, `d001bbc` | Current | More explicit module boundaries and clearer no-secret-at-rest behavior shape. |
| Phase 4: deep-link normalization + contract gate | `ad5e8e6` (`grant-param-normalizer` seam), `7b97ad0` (strict allowlist gate), tests in `use-deep-link.test.tsx` and `grant-param-normalizer.test.ts` | `b31f270` (contract-gated pass-through + TODO logging) | Current | Deterministic canonicalization + enforceable strict mode beats deferred warning-only path. |
| Phase 5: legacy removal + observability | `bbd8e1f` (legacy browser-login/auth route removal), `e4e5140` (legacy route contract coverage), `7f53a88` (dev-gated verbose logs) | `e0ed5a5` (large legacy removal), `fcd3cbb` (quiet logs) | Tie, slight current edge | Both achieve target behavior; current sequence is safer because removal lands after more boundary/test hardening. |
| Cross-cutting hardening | `943f6d5`, `a2f13c3`, `e163adc` (settings sign-in correctness + failure cleanup tests) | `3f55eae` (prefetch handoff), various follow-ups | Current | Better post-refactor hardening around real interaction paths with explicit test proof. |

### Verdict

The rebuild branch is the better engineering effort for mergeability, reviewability, and plan fidelity.
The previously identified callback token entropy regression has been resolved in `e23acdf`.

## Why this approach

This comparison method is phase-gate first, not narrative first:

- map commits to planned phase exit criteria
- score quality by boundary integrity + test proof + blast radius
- compare branch outcomes by phase, not by commit count alone

This makes the result defensible in review and reusable for future rebuild-vs-original branch audits.

## Validation run

- [x] `git log --oneline --decorate --graph -n 30 callum1/bui-178-passport-auth-conversion-rebuild`
- [x] `git log --oneline --decorate --graph -n 30 callum1/bui-178-refactor-connectgrant-flow-in-dc`
- [x] `git log --reverse --oneline main..callum1/bui-178-passport-auth-conversion-rebuild`
- [x] `git log --reverse --oneline main..callum1/bui-178-refactor-connectgrant-flow-in-dc`
- [x] `git log --name-only --pretty=format:'--- %h %s' main..callum1/bui-178-refactor-connectgrant-flow-in-dc`
- [x] `git diff --stat main...callum1/bui-178-passport-auth-conversion-rebuild`
- [x] `git diff --stat main...callum1/bui-178-refactor-connectgrant-flow-in-dc`
- [x] `git log --left-right --cherry-pick --oneline callum1/bui-178-refactor-connectgrant-flow-in-dc...callum1/bui-178-passport-auth-conversion-rebuild`
- [x] `git show callum1/bui-178-passport-auth-conversion-rebuild:src-tauri/src/commands/auth.rs | rg -n "state|signature|verify|authentic|Sha256|Digest"`
- [x] `git show callum1/bui-178-refactor-connectgrant-flow-in-dc:src-tauri/src/commands/auth.rs | rg -n "state|signature|verify|authentic|Sha256|Digest"`
- [x] `cargo test --manifest-path src-tauri/Cargo.toml new_callback_state_tokens_are_high_entropy_and_unique`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`

## Reusable rule extracted

When doing a rebuild-vs-original comparison for auth/security-sensitive work:

1. Evaluate branch quality with phase-gate mapping first.
2. Prioritize finding regressions in invariants before declaring rebuild superiority.
3. Require at least one deterministic evidence table: commit mapping, scope stats, and targeted contract/security scans.

## Follow-ups

- (Completed in `e23acdf`) Restore CSPRNG-backed callback state token generation on current branch and add explicit callback token entropy regression coverage.
