---
name: patch-first-debugging
description: Debug and repair code using minimal, reviewable patches instead of full-file rewrites. Use this whenever the user is fixing a bug, iterating on failing tests, asks for a surgical code change, wants a minimal diff, or is in a tight debug loop where output size and token cost matter. Prefer this even if the user does not explicitly say "patch."
---

# Patch-First Debugging

## Goal

Fix the problem with the smallest correct change, keep outputs reviewable, reduce token usage in iterative debug loops, and avoid regenerating entire files unless a full rewrite is clearly justified.

## Why this skill exists

- Smaller patches usually cost fewer tokens than full-file rewrites.
- Minimal diffs are easier to review and less likely to introduce unrelated churn.
- Tight debug loops work better when each iteration changes only the code justified by the latest failure.

## When to use

- Bug fixes
- Failing test or regression loops
- Small refactors with no intended behavior change
- Requests for minimal diffs or surgical edits
- Cases where only one or two files appear relevant

## Workflow

1. Reproduce or identify the failure.
2. Narrow scope to the smallest relevant file, function, or branch.
3. Inspect existing code before proposing changes.
4. Make the minimal patch that addresses the root cause.
5. Run the smallest verification that proves the fix.
6. Expand scope only if the minimal patch fails or the evidence points elsewhere.

## Output rules

- Prefer patch-oriented edits over full-file rewrites.
- Prefer unified diffs, `apply_patch`, or small in-place edits.
- Modify existing code instead of regenerating it.
- Keep outputs small when the task is local; this reduces token usage and makes repeated repair loops cheaper.
- Include only the changed context needed to understand the patch.
- Do not rewrite unrelated code, comments, or formatting.
- Rewrite a whole file only when the structure is fundamentally changing or patching would be less clear than replacement.

## Context rules

- Ask for or inspect only the relevant file, function, error, and test output first.
- Avoid pulling in whole directories or broad repo context unless the first pass is insufficient.
- If the problem spans multiple files, add them one at a time based on evidence.

## Verification rules

- Prefer targeted tests, builds, or lint checks over full-suite runs.
- State what was verified.
- If verification was not possible, say so plainly.
- If the first patch does not hold, iterate with another minimal patch instead of broadening the rewrite immediately.

## Escalation rules

- If the bug report is vague, first identify the failure mode before editing.
- If the requested change would trigger broad churn, say that a larger refactor is needed and explain why patch-first is no longer the right shape.
- If a rewrite is necessary, say why the patch boundary broke down.

## Examples

**Example 1**
Input: "This test started failing after a refactor. Fix it with the smallest possible change."
Output: Reproduce the failure, patch the relevant file only, rerun the affected test file, and report the result.

**Example 2**
Input: "Here is a stack trace and `auth.ts`. Find the bug and output only a unified diff."
Output: Limit analysis to `auth.ts` and the stack trace, then return a small diff instead of a full file.

**Example 3**
Input: "Login regressed. Please avoid touching unrelated files."
Output: Inspect the failing path, make the smallest safe patch, and verify only the login-related tests or checks.
