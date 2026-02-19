# 260219: `unused_mut` warning in `src-tauri/src/lib.rs`

## Context

During a production build, Rust emits:

- `variable does not need to be mutable`
- file: `src-tauri/src/lib.rs`
- line: builder initialization in `run()`

This is currently non-blocking (warning only), but it should be cleaned up in a separate, scoped change.

## Problem

`builder` is declared mutable:

- `let mut builder = tauri::Builder::default()...`

In release builds, the debug-only reassignment path is excluded, so `mut` is unnecessary and triggers `unused_mut`.

## Root Cause

The code pattern mixes:

- always-on mutable declaration
- conditional reassignment behind `#[cfg(debug_assertions)]`

When `debug_assertions` is off, reassignment disappears but mutable declaration remains.

## Proposed Fix

Use immutable shadowing instead of mutable reassignment.

### Before

- `let mut builder = ...`
- debug block does `builder = builder.plugin(...)`

### After

- `let builder = ...`
- debug path uses `let builder = builder.plugin(...)`

This preserves behavior and removes the warning in release.

## Scope

Only:

- `src-tauri/src/lib.rs`

No functional changes expected. No runtime behavior changes expected.

## Validation

From `src-tauri/` run:

- `cargo check --lib -p dataconnect`

Expected:

- no `unused_mut` warning for `builder`
- successful compile

## Commit Guidance

Keep this in a separate commit from icon/docs work.

Suggested commit message:

- `chore: remove unused mut in tauri builder setup`

## Ownership Recommendation

If today’s focus is icon/artwork pipeline, defer this to a follow-up micro-task owned by teammate or next cleanup pass.
