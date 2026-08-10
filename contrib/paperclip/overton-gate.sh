#!/usr/bin/env bash
# overton-gate.sh — gate a Paperclip `process` agent on Overton, with no
# changes to Paperclip at all.
#
# Point a `process`-type agent's command at this script:
#
#   ./overton-gate.sh <project> <account> -- <the command you were running>
#
# e.g.  ./overton-gate.sh ccmonitor claude-work -- claude -p "$PAPERCLIP_PROMPT"
#
# Exits 75 (EX_TEMPFAIL) without running anything when the budget says no, so
# the heartbeat is a visible no-op rather than a silent success.

set -uo pipefail

PROJECT="${1:?usage: overton-gate.sh <project> <account> -- <command>...}"
ACCOUNT="${2:?usage: overton-gate.sh <project> <account> -- <command>...}"
shift 2
[[ "${1:-}" == "--" ]] && shift
[[ $# -gt 0 ]] || { echo "overton-gate: no command given" >&2; exit 64; }

# Fail closed. If `overton` is not installed the safe answer is "do not spend",
# not "carry on unmetered" — this script exists precisely because something must
# say no.
command -v overton >/dev/null 2>&1 || {
  echo "overton-gate: \`overton\` not on PATH — refusing to run unmetered" >&2
  exit 75
}

decision=$(overton ask "$PROJECT" "$ACCOUNT" --json 2>/dev/null)
verdict=$?

if [[ $verdict -ne 0 ]]; then
  summary=$(printf '%s' "$decision" | jq -r '.summary // "budget refused"' 2>/dev/null || echo "budget refused")
  printf 'overton: %s\n' "$summary" >&2
  # Captured, then printed. Writing jq's stdout straight to stderr alongside
  # `2>/dev/null` silently discards it: the redirections apply left to right,
  # so `>&2` duplicates an fd 2 that already points at /dev/null.
  remedies=$(printf '%s' "$decision" | jq -r '.remedies[]? | "  → " + .' 2>/dev/null)
  [[ -n "$remedies" ]] && printf '%s\n' "$remedies" >&2
  case $verdict in
    12) exit 78 ;;   # EX_CONFIG: never allowed; retrying will not help
    *)  exit 75 ;;   # EX_TEMPFAIL: try again on the next heartbeat
  esac
fi

# `overton run` holds a claim for the command's lifetime, heartbeats it, and
# releases in a trap — so a crashed agent gives its capacity back.
exec overton run "$PROJECT" "$ACCOUNT" -- "$@"
