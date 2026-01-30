## Ralph (Feature Loop)

This folder contains the **Ralph-style planning/build loop** artifacts. Treat
this as a reusable feature pack (specs + plan + prompts + backpressure).

It is based on the Ralph Playbook (see `refs/RALPH-README.md`) — refer to it and
stick to the fundamental rules. Remember, Ralph is a dumb bash loop to manage
your context window and let the agent do its best work. It moves you out of the
loop and lets you focus on the work.

Extra text is literally context tax: verbose inputs degrade determinism!

### What lives here

- **`specs/`**: stable contracts (“what”)
- **`IMPLEMENTATION_PLAN.md`**: disposable scheduler (“what next”)
- **`PROGRESS.md`**: persistent memory (“what we learned / patterns”, per feature)
- **`AGENTS.md`**: minimal backpressure + guardrails (“how to validate”, shared)
- **`PROMPT_plan.md` / `PROMPT_build.md`**: prompts fed to the agent runner
- **`refs/`**: large reference docs (not loaded by default)

### Will this clog context?

No — **as long as you don’t instruct the agent to “study” this README every
loop**.

Our prompts intentionally load only:

- `__FEATURE_ROOT__/specs/*`
- `__FEATURE_ROOT__/IMPLEMENTATION_PLAN.md`
- `__FEATURE_ROOT__/PROGRESS.md` (especially **Codebase Patterns**)
- `scripts/ralph/AGENTS.md` (shared)
- `__FEATURE_ROOT__/DOCS_INDEX.md` (if present)
- plus relevant repo code when needed

### One-time setup per terminal (repo-local)

In the terminal where you run the loop, set ONE of the following:

**Claude Code (default):**

If you do nothing, `loop.sh` defaults to:

- `claude -p --dangerously-skip-permissions`

If you want to be explicit (recommended so it’s obvious what’s running):

```bash
export RALPH_AGENT_CMD='claude -p --dangerously-skip-permissions'
```

Optional: add `--model opus` or `--model sonnet` to specify model.

**Cursor Agent (works, but has been flaky):**

```bash
export RALPH_AGENT_CMD='cursor-agent --print --output-format text --force agent'
export RALPH_CURSOR_TREAT_SIGTERM_143_AS_SUCCESS=1
```

Notes:

- `RALPH_CURSOR_TREAT_SIGTERM_143_AS_SUCCESS=1` is an opt-in quirk: Cursor Agent
  sometimes exits `143` even after a clean commit; we normalize that so the loop
  can continue.
- We intentionally do **not** auto-enable `--output-format stream-json` or any
  stream parsing. It has not helped with the Cursor Agent “silent failure” class
  we’ve seen, and it’s extra surface area.

---

This is **not persisted** to your shell config; it only affects the current
session.

### Run the loop

From the repo root (feature-root aware):

- **Planning mode** (no code changes expected; updates
  `IMPLEMENTATION_PLAN.md`):

```bash
./scripts/ralph/loop.sh plan 1
```

- **Build mode** (implements one task per iteration):

```bash
./scripts/ralph/loop.sh 1
```

Remove the trailing `1` to run indefinitely:

```bash
./scripts/ralph/loop.sh plan
./scripts/ralph/loop.sh
```

To run a different feature pack, pass its root directory:

```bash
./scripts/ralph/loop.sh path/to/feature plan 1
./scripts/ralph/loop.sh path/to/feature 1
```

### Using `PROGRESS.md` (rules)

`__FEATURE_ROOT__/PROGRESS.md` is **memory**, not a task list.

- **Update always (cheap)**: append a short entry to **Session Log** after each
  iteration/commit explaining what changed and why (2–6 bullets).
- **Update sometimes (curated)**: keep **Codebase Patterns** short and
  high-signal. If you add a new pattern, ensure it’s stable and broadly reusable
  (not “this one task did X”).
- **Do not** copy the implementation plan into PROGRESS. If something is work to
  do, it belongs in `IMPLEMENTATION_PLAN.md` as a plan row.
- **Backpressure**: keep validation commands in `AGENTS.md` only.

### When to update `AGENTS.md` vs `PROMPT_*.md`

Keep the system close to Ralph: prompts stay stable; operations
(loopback/backpressure) stay in AGENTS.

AGENTS is loaded each iteration, specifying the actual commands. This is how
backpressure gets wired in per-project.

- **Update `AGENTS.md` when**:
  - a command is wrong / missing (typecheck/build/test)
  - there’s an operational gotcha that affects running/validating (ports, env
    vars, “run X before Y”)
  - you need a _tiny_ evergreen guardrail that prevents repeated nonsense (keep
    this file small—every iteration loads it)
- **Update `PROMPT_plan.md` / `PROMPT_build.md` when**:
  - you’re changing loop discipline (e.g. “one plan row per run” rules)
  - you’re changing selection strategy / scope boundaries / invariants
  - you want to change what files are always loaded each iteration

Rule of thumb: **AGENTS = commands + tiny signage. PROMPTs = process + scope +
contracts. PROGRESS = learnings. PLAN = what next.**

### Notes / gotchas

- **Reference docs** live in `refs/` on purpose. Don’t add `refs/*` to the
  default “study” step unless you need them for a specific task.
- If the plan becomes stale, re-run **planning mode** to regenerate/clean it.

### Cursor Agent: known issues (why we default to Claude Code)

Cursor Agent has been flaky for us in this repo:

- **Silent runs**: `loop.sh` prints the header, then Cursor produces no useful
  output and/or exits without obvious work.
- **Upstream flake**: `ECONNRESET` / `ConnectError` transport failures.

Nothing in the previous “heartbeat / tail / extra logging” approach reliably
explained or prevented these failures, so we stripped the loop down to the
playbook core and keep Cursor workarounds minimal and opt-in.

If you must run Cursor, prefer running one iteration at a time:

- `./scripts/ralph/loop.sh 1`

### If it looks stuck (header printed, then nothing)

The loop prints a per-iteration log path up front as `ITERATION_LOG: ...`. Even
if output is quiet, you can always inspect that log file.

Quick checks:

```bash
# Run these in a second terminal if `loop.sh` is still running in the foreground
# (i.e. you don't have a prompt in the original terminal).

# 1) Is the agent actually running?
pgrep -a claude || echo "no claude running"
pgrep -a cursor-agent || echo "no cursor-agent running"

# 2) If you have an ITERATION_LOG path, follow it:
tail -f /path/from/ITERATION_LOG
```

Notes:

- If you see `exit 0` next to your command in the terminal UI, that’s usually
  **your prompt decoration showing the last exit code**, not `loop.sh` printing
  “exit 0”.
- If there’s **no `cursor-agent` process** and you already got your shell prompt
  back, the loop really ended (check the last `ITERATION_RESULT:` line).
