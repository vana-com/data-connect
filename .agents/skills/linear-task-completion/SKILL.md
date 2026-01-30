---
name: linear-task-completion
description:
  Complete a Linear task by checking out its branch, scoping session changes,
  and preparing a commit. Use when the user says "complete [ISSUE-ID]", "branch
  for [ISSUE-ID]", or after finishing work on a Linear task.
---

# Linear Task Completion

After finishing work on a Linear task, execute this workflow.

## Steps

### 1. Fetch the issue

Use the MCP Linear tool via `CallMcpTool` after reading its schema in
`/Users/callumflack/.cursor/projects/Users-callumflack-Repos-vana-vana-app/mcps/user-Linear/tools/`.

Extract `gitBranchName` and the issue ID from the response.

### 2. Create branch

```bash
git checkout -b <gitBranchName>
```

If `gitBranchName` is missing, follow `.cursor/rules/linear-task-creation.mdc`
to create and checkout a branch name that includes the issue ID.

### 3. Identify session-specific changes (not everything in git status)

**Important**: Track which files were actually modified during this session.

- Review the edits made (search_replace, write tool calls)
- Verify with `git status` to see unstaged changes
- List the specific files, not just "everything"

### 4. Stage and prepare commit

```bash
git add <specific-files-from-step-3>
```

Commit message format:

```
ISSUE_ID: <commit message>
```

**Do NOT commit unless explicitly asked.**

If the user asks for a commit message only, provide the message and stop.

## References

Commit/branch conventions: `.cursor/rules/linear-task-creation.mdc`
