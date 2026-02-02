---
name: linear-task-creation
description:
  Standardize Linear task creation with assignee, project, team, and
  branch/commit conventions. Use when asked to create a Linear task or issue.
---

# Linear Task Creation Workflow

When asked to “create a Linear task”, follow this exact flow. Ask the required
questions first, then proceed.

## Required questions (ask before creating)

1. Assignee: "Assign to who? (me | unassigned)"
   - Resolve "me" via MCP Linear current user.
2. Project: "Which project? (default: <app-specific default>)"
   - Present the app-specific default (see below) as a suggestion; let user
     confirm or override.
3. Team: "Which team? (default: Build)"
4. Priority/Labels (optional): "Any priority or labels to add?"

If the user gives terse instructions like "assign to me" or "no project",
respect that.

## Defaults (when not specified)

- team: Build
- assignee: unassigned
- project: determined by current working directory:
  - `apps/web` → **Vana App v2**
  - `apps/stake` → **Vana Staking Upgrade**
  - other → ask user (no automatic fallback)
- labels: none
- priority: none

## Issue composition

- Title: concise imperative summary
- Description:
  - Short problem statement and context
  - Acceptance Criteria list (bullet points)
  - Notes/links if relevant

## Branch, commits, PR

- Always work on the Linear task branch.
  - If Linear returns `gitBranchName`: checkout that exact branch before making
    any code changes/commits.
  - If Linear does not return a branch: create and checkout a new branch after
    the issue is created (to include the identifier).
- If the task already has a branch (or multiple branches already exist):
  - Do not try to reuse the same branch name (it will collide).
  - Create a new uniquely-named branch for the same ISSUE_ID by suffixing `-2`,
    `-3`, or a short purpose tag.
    - Example: `callum/app-628-resolve-nextjs-warning-2`
    - Example: `callum/app-628-resolve-nextjs-warning-fix-telemetry`
- Branch name (when creating one):
  <assigneeHandle-or-gitUser>/<ISSUE_ID>-<kebab-title>
  - Example:
    callum/app-628-resolve-nextjs-externalization-warning-for-graphql-in
- Commit prefix: ISSUE_ID: <commit message>
  - Example: APP-628: add graphql dependency to apps/web
- PR title: ISSUE_ID: <issue title>
- Include the Linear issue link in the chat after creation.

## Execution steps

1. Ask the “Required questions”.
2. Create the Linear issue with team, project, assignee, labels/priority per
   answers/defaults.
3. Echo back: issue link, identifier, and branch name to be created.
4. Checkout the Linear task branch (prefer `gitBranchName` if provided by
   Linear; otherwise create one).
5. Do not run the dev server automatically. Avoid long-running processes.
6. Use pinned pnpm version from repo root when making dependency changes. Commit
   updated `pnpm-lock.yaml` only when changes are deliberate.
7. Do not commit unless the user explicitly asks you to commit. When asked,
   reference the ISSUE_ID in commit messages.

## Edge cases

- If working outside `apps/web` or `apps/stake`: ask the user which project to
  use (no silent fallback).
- If the app-specific project is not found in Linear: ask whether to use "no
  project" or a different project.
- If "me" cannot be resolved via MCP: fall back to unassigned and notify the
  user.
- If the user says "create, then immediately branch": do steps 2 and 4 without
  additional prompts.
