#!/usr/bin/env bash
set -euo pipefail

# Ralph loop runner (feature-root aware)
#
# Usage:
#   ./loop.sh                      # build mode, unlimited iterations
#   ./loop.sh plan                 # plan mode, unlimited iterations
#   ./loop.sh 10                   # build mode, max 10 iterations
#   ./loop.sh plan 1               # plan mode, max 1 iterations
#   ./loop.sh path/to/feature plan # plan mode, feature root override
#   ./loop.sh path/to/feature 3    # build mode, feature root override
#
# Notes:
# - This script supports stdin or prompt-arg agents (Cursor defaults to arg).
# - Default agent is Cursor CLI (override via RALPH_AGENT or RALPH_AGENT_CMD).
# - Toggle agent: RALPH_AGENT=cursor|claude (or set RALPH_AGENT_CMD for a custom command).
# - Prompt mode: RALPH_AGENT_PROMPT_MODE=arg|stdin.
# - Cursor model: RALPH_AGENT_MODEL=gpt-5.3-codex (default).
# - We intentionally keep this script close to the Ralph playbook: dumb outer loop,
#   shared state in files + git, minimal orchestration.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FEATURE_ROOT="${RALPH_FEATURE_ROOT:-$SCRIPT_DIR}"
if [[ -n "${1:-}" && -d "$1" ]]; then
  FEATURE_ROOT="$1"
  shift
fi

if [[ ! -d "$FEATURE_ROOT" ]]; then
  echo "Error: feature root not found: $FEATURE_ROOT" >&2
  exit 1
fi

FEATURE_ROOT="$(cd "$FEATURE_ROOT" && pwd)"
REPO_DIR="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || echo "$SCRIPT_DIR/../..")"
MODE="build"
PROMPT_FILE="$FEATURE_ROOT/PROMPT_build.md"
FALLBACK_PROMPT_FILE="$SCRIPT_DIR/PROMPT_build.md"
MAX_ITERATIONS=0

if [[ "${1:-}" == "plan" ]]; then
  MODE="plan"
  PROMPT_FILE="$FEATURE_ROOT/PROMPT_plan.md"
  FALLBACK_PROMPT_FILE="$SCRIPT_DIR/PROMPT_plan.md"
  MAX_ITERATIONS="${2:-0}"
elif [[ "${1:-}" =~ ^[0-9]+$ ]]; then
  MODE="build"
  PROMPT_FILE="$FEATURE_ROOT/PROMPT_build.md"
  FALLBACK_PROMPT_FILE="$SCRIPT_DIR/PROMPT_build.md"
  MAX_ITERATIONS="$1"
fi

if [[ ! -f "$PROMPT_FILE" ]]; then
  if [[ -f "$FALLBACK_PROMPT_FILE" ]]; then
    PROMPT_FILE="$FALLBACK_PROMPT_FILE"
  else
    echo "Error: prompt file not found: $PROMPT_FILE" >&2
    exit 1
  fi
fi

CURSOR_AGENT_MODEL_DEFAULT="gpt-5.3-codex"
CURSOR_AGENT_MODEL="${RALPH_AGENT_MODEL:-$CURSOR_AGENT_MODEL_DEFAULT}"
CURSOR_AGENT_CMD_DEFAULT=(agent -p --force --output-format text --model "$CURSOR_AGENT_MODEL")
CLAUDE_AGENT_CMD_DEFAULT=(claude -p --dangerously-skip-permissions)
AGENT_CMD_DEFAULT=("${CURSOR_AGENT_CMD_DEFAULT[@]}")
AGENT_FLAVOR="cursor"
if [[ -n "${RALPH_AGENT_CMD:-}" ]]; then
  AGENT_FLAVOR="custom"
  # shellcheck disable=SC2206
  AGENT_CMD=($RALPH_AGENT_CMD)
else
  case "${RALPH_AGENT:-cursor}" in
    claude)
      AGENT_FLAVOR="claude"
      AGENT_CMD=("${CLAUDE_AGENT_CMD_DEFAULT[@]}")
      ;;
    cursor)
      AGENT_FLAVOR="cursor"
      AGENT_CMD=("${CURSOR_AGENT_CMD_DEFAULT[@]}")
      ;;
    *)
      AGENT_FLAVOR="cursor"
      AGENT_CMD=("${AGENT_CMD_DEFAULT[@]}")
      ;;
  esac
fi
AGENT_MODEL=""
case "$AGENT_FLAVOR" in
  cursor)
    AGENT_MODEL="$CURSOR_AGENT_MODEL"
    ;;
  claude)
    AGENT_MODEL="(claude default)"
    ;;
  custom)
    AGENT_MODEL="(from RALPH_AGENT_CMD)"
    ;;
esac
AGENT_PROMPT_MODE_DEFAULT="stdin"
if [[ "$AGENT_FLAVOR" == "cursor" ]]; then
  AGENT_PROMPT_MODE_DEFAULT="arg"
fi
AGENT_PROMPT_MODE="${RALPH_AGENT_PROMPT_MODE:-$AGENT_PROMPT_MODE_DEFAULT}"

function render_prompt() {
  local src="$1"
  local feature_root="$2"
  local escaped_feature_root="${feature_root//\\/\\\\}"
  escaped_feature_root="${escaped_feature_root//&/\\&}"
  escaped_feature_root="${escaped_feature_root//|/\\|}"
  sed "s|__FEATURE_ROOT__|$escaped_feature_root|g" "$src"
}

ITERATION=0

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Mode:        $MODE"
echo "Prompt:      $PROMPT_FILE"
echo "Feature:     $FEATURE_ROOT"
if [[ "$MAX_ITERATIONS" -gt 0 ]]; then
  echo "Max loops:   $MAX_ITERATIONS"
else
  echo "Max loops:   unlimited"
fi
echo "Agent cmd:   ${AGENT_CMD[*]}"
if [[ -n "$AGENT_MODEL" ]]; then
  echo "Agent model: $AGENT_MODEL"
fi
echo "Prompt mode: $AGENT_PROMPT_MODE"
echo "Repo:        $REPO_DIR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

while true; do
  if [[ "$MAX_ITERATIONS" -gt 0 && "$ITERATION" -ge "$MAX_ITERATIONS" ]]; then
    echo "Reached max iterations: $MAX_ITERATIONS"
    break
  fi

  BEFORE_HEAD="$(git -C "$REPO_DIR" rev-parse HEAD 2>/dev/null || true)"

  # Capture exit code so we can print state even when the agent fails.
  set +e
  LOG_FILE="$(mktemp -t "ralph-${MODE}.loop-${ITERATION}.XXXXXX")"
  TMP_PROMPT="$(mktemp -t "ralph-${MODE}.prompt-${ITERATION}.XXXXXX")"
  # NOTE: macOS `date` (BSD) doesn't support GNU `-I`; use RFC3339-ish UTC instead.
  echo "ITERATION_START: iteration=$ITERATION mode=$MODE started_at=\"$(date -u "+%Y-%m-%dT%H:%M:%SZ")\""
  echo "ITERATION_LOG: $LOG_FILE"
  render_prompt "$PROMPT_FILE" "$FEATURE_ROOT" > "$TMP_PROMPT"
  if [[ "$AGENT_PROMPT_MODE" == "arg" ]]; then
    PROMPT_CONTENT="$(<"$TMP_PROMPT")"
    "${AGENT_CMD[@]}" "$PROMPT_CONTENT" 2>&1 | tee "$LOG_FILE"
  else
    "${AGENT_CMD[@]}" < "$TMP_PROMPT" 2>&1 | tee "$LOG_FILE"
  fi
  AGENT_EXIT_CODE_RAW="${PIPESTATUS[0]}"
  rm -f "$TMP_PROMPT"
  set -e

  AFTER_HEAD="$(git -C "$REPO_DIR" rev-parse HEAD 2>/dev/null || true)"
  DIRTY_COUNT="$(
    git -C "$REPO_DIR" status --porcelain 2>/dev/null | wc -l | tr -d ' '
  )"

  AGENT_EXIT_CODE_EFFECTIVE="$AGENT_EXIT_CODE_RAW"
  COMMIT_MADE="0"
  if [[ -n "$BEFORE_HEAD" && -n "$AFTER_HEAD" && "$BEFORE_HEAD" != "$AFTER_HEAD" ]]; then
    COMMIT_MADE="1"
  fi
  # Cursor Agent quirk: sometimes exits via SIGTERM (143) even after completing a
  # clean commit + push. Keep this logic behind an explicit opt-in flag to avoid
  # deviating from the playbook by default.
  if [[ "${RALPH_CURSOR_TREAT_SIGTERM_143_AS_SUCCESS:-0}" == "1" ]]; then
    if [[ "$AGENT_EXIT_CODE_RAW" -eq 143 && "$COMMIT_MADE" -eq 1 && "$DIRTY_COUNT" -eq 0 ]]; then
      echo "ITERATION_NOTE: cursor-agent exited 143 after a clean commit; treating as success (RALPH_CURSOR_TREAT_SIGTERM_143_AS_SUCCESS=1)."
      AGENT_EXIT_CODE_EFFECTIVE="0"
    fi
  fi

  COMMIT_STR="NO"
  if [[ "$COMMIT_MADE" -eq 1 ]]; then
    COMMIT_STR="YES"
  fi
  echo "ITERATION_RESULT: agent_exit_raw=$AGENT_EXIT_CODE_RAW agent_exit_effective=$AGENT_EXIT_CODE_EFFECTIVE commit=$COMMIT_STR dirty=$DIRTY_COUNT"
  echo "ITERATION_LOG: $LOG_FILE"

  if [[ "$AGENT_EXIT_CODE_EFFECTIVE" -ne 0 ]]; then
    echo "Agent exited non-zero ($AGENT_EXIT_CODE_RAW). Stopping loop."
    exit "$AGENT_EXIT_CODE_RAW"
  fi

  ITERATION=$((ITERATION + 1))
  echo
  echo "======================== LOOP $ITERATION ========================"
  echo
done

