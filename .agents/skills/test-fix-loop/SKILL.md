---
name: test-fix-loop
description: Build or use a tight automated test-fix loop that repairs one failing test at a time with minimal patches and narrow context. Use whenever the user wants a repair harness, constrained bug-fixing loop, failing-test repair workflow, or a prompt that turns the model into a surgical fix engine instead of a general coding assistant.
---

# Test-Fix Loop

## Goal

Drive a tight repair loop:

1. run tests
2. find the failing test
3. collect traceback or stderr
4. collect only relevant files
5. ask the model for the smallest valid patch
6. apply the patch
7. rerun tests
8. repeat until pass or stop limit

This skill is for narrow repair work, not broad refactoring or feature design.

## Core stance

Treat the model as a constrained repair engine.

- Keep context small.
- Fix the reported failure only.
- Prefer surgical diffs over rewrites.
- Preserve existing style and structure.
- Stop when the failure is ambiguous.

## When to use

Use this skill when the user wants any of the following:

- an automated test-fix harness
- a minimal-patch bug fixing loop
- a failing-test repair workflow
- a prompt that returns only a patch
- strict guardrails against unrelated refactors

Do not use this skill for greenfield design, large refactors, or vague requests like "improve this codebase."

## Required loop shape

Keep the loop conceptually this small:

```text
run tests
-> find failing test
-> collect traceback / stderr
-> collect only relevant files
-> ask model for minimal patch
-> apply patch
-> rerun tests
-> repeat until pass or stop limit
```

Do not expand this into a broader autonomous workflow unless the user explicitly asks for that.

## Prompt contract

When drafting the repair prompt, preserve these rules:

- fix only the failing issue
- return a minimal diff
- avoid unrelated refactors
- preserve existing style
- stop if the failure is ambiguous

Use a system-style prompt close to this:

```text
You are a repair agent working in an automated test-fix loop.

Goal:
Make the smallest valid code change that fixes the reported failure.

Rules:
- Return only a unified diff patch.
- Do not rewrite entire files unless absolutely necessary.
- Do not refactor unrelated code.
- Preserve current code style and structure.
- Prefer surgical edits.
- If the error cannot be fixed confidently from the provided context, return:
  CANNOT_FIX_CONFIDENTLY

You will receive:
1. failing test name
2. error output
3. relevant file contents
4. optional project rules
```

If the user explicitly wants a short explanation with the patch, keep it brief and machine-friendly. Otherwise prefer patch-only output.

## Iteration payload

Each repair attempt should include only:

- failing test name
- error output
- relevant files
- project rules

Send only the smallest useful code context. Usually 2 to 5 files max.

Good file sources:

- file from traceback
- failed test file
- directly implicated source module
- config file only if clearly involved

Bad pattern:

- dumping large parts of the repo "just in case"

## Patch shape

Prefer unified diff output like this:

```diff
--- a/auth/token.ts
+++ b/auth/token.ts
@@
- if (token.isValid()) {
+ if (token.isValid() && !token.isExpired()) {
    return true
  }
```

Do not return essays, rewritten full files, or unrelated cleanup.

## Guardrails

Use hard stops to control cost and drift:

- max repair attempts per failure
- stop after repeated no-op patches
- stop if the same error repeats unchanged
- stop if failures increase sharply
- stop if the patch touches unrelated files

Before applying a patch automatically, validate:

- patch parses correctly
- changed files are allowed
- forbidden files are untouched
- diff size is under threshold
- tests are still runnable

Reject patches that fail these checks.

## Review pass

If the user wants a safer loop, recommend a two-step flow:

1. repair model proposes patch
2. review model checks likely fix and collateral risk

Keep the review narrow. It should judge the candidate patch, not redesign the solution.

## Output expectations

When helping the user build this workflow:

- keep recommendations concrete
- preserve the tight loop shape
- avoid turning the pattern into a generic coding agent
- name any disagreement with the user's design explicitly before changing it

