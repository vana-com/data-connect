# Tauri renderer input trust boundary

## Why this document exists

We hit a deletion-path safety bug while implementing **Remove imported data** from Import History.

The key confusion was: “the renderer provides this path, so is it trusted?”

Short answer: **No. Treat all Tauri command inputs as untrusted.**

## Trust model (practical)

- The Tauri backend (`#[tauri::command]`) is the trust boundary.
- The renderer is application code, but still an external caller from the backend perspective.
- Any string path (including `export_path`) must be validated server-side before filesystem mutation.

That means:

1. resolve paths
2. enforce a canonical allow-list root
3. perform the mutation only after that check

## What was wrong before

`delete_exported_run` used lexical prefix checks (`starts_with`) on non-canonical paths.

Risk:

- `..` segments or symlinked subpaths can make a path appear in-bounds lexically while resolving out-of-bounds physically.

## Fix implemented

In `src-tauri/src/commands/file_ops.rs`:

- canonicalize `exported_data` root
- canonicalize target directory path
- enforce `canonical_target.starts_with(canonical_root)`
- run deletion and parent cleanup using canonical paths

This closes the traversal/symlink escape class for this command.

## UI behavior decision (current)

For remove action UX:

- confirmation dialog is not used during async removal
- removal starts from dropdown menu item directly
- menu item shows loading state (`Removing…`) and is disabled while pending
- errors are logged to console only for now

## Known gap (explicitly unresolved)

We **do not yet provide user-facing remove failure feedback**.

Current failure behavior:

- console log only (`Failed to remove imported data:`)
- no inline/toast recovery guidance

This is intentionally accepted for now to ship the safer filesystem behavior and reduce click duplication risk.

## Follow-up recommendation

Add a lightweight failure surface in a later pass:

- toast or row-level non-blocking error state with retry
- keep no extra modal complexity

## Review checklist for future path-based commands

- Is command input treated as untrusted?
- Are both root and target canonicalized?
- Is mutation gated by canonical root prefix check?
- Are cleanup loops bounded to canonical root?
- Are error messages safe for frontend exposure?
