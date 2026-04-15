#!/usr/bin/env bash
# tumble-dry ↔ gastown bridge
#
# Wraps ~/.claude/get-shit-done/bin/lib/gastown.sh to dispatch a wave of
# reviewer polecats for one tumble-dry round. Each reviewer = one bead.
# Polecat reads persona + artifact + audit from bead notes, writes its
# critique back to the bead's notes field; orchestrator reconstructs to
# critique-<persona-slug>.md in the round dir.

set -euo pipefail

GSD_LIB="${HOME}/.claude/get-shit-done/bin/lib/gastown.sh"

if [ ! -f "$GSD_LIB" ]; then
  echo "ERROR: gastown.sh not found at $GSD_LIB" >&2
  exit 2
fi

# shellcheck disable=SC1090
source "$GSD_LIB"

# td_gastown_available()
# Returns "true" if gastown is usable for this tumble-dry run.
td_gastown_available() {
  detect_gastown
}

# td_dispatch_reviewer()
# Create a bead for one reviewer and dispatch it to a polecat.
#
# Args:
#   $1 — slug (tumble-dry artifact slug, e.g., "my-blog-post")
#   $2 — round number
#   $3 — persona-slug (filesystem-safe, e.g., "skeptical-cfo")
#   $4 — path to reviewer bead-notes file (the polecat reads this at prime time)
#   $5 — convoy_id (pass empty string "" if no convoy; bridge creates one on first call)
#
# Outputs (stdout): `BEAD:<bead_id>\nCONVOY:<convoy_id>`
# Returns: 0 on success, non-zero on failure.
td_dispatch_reviewer() {
  local slug="${1:?slug required}"
  local round="${2:?round required}"
  local persona_slug="${3:?persona_slug required}"
  local notes_file="${4:?notes_file required}"
  local convoy_id="${5:-}"

  if [ ! -f "$notes_file" ]; then
    echo "ERROR: notes file not found: $notes_file" >&2
    return 1
  fi

  local notes_content
  notes_content=$(cat "$notes_file")

  local bead_id
  bead_id=$(create_plan_bead "td-${slug:0:10}" "r${round}-${persona_slug:0:8}" \
    "tumble-dry R${round} ${persona_slug}" "$notes_content") || {
    echo "ERROR: bead creation failed for $persona_slug" >&2
    return 1
  }

  if [ -z "$convoy_id" ]; then
    convoy_id=$(create_phase_convoy "td-${slug:0:10}" "tumble-dry-r${round}" "$bead_id") || {
      echo "ERROR: convoy creation failed" >&2
      return 1
    }
  fi

  dispatch_plan_to_polecat "$bead_id" "$convoy_id" >&2 || {
    echo "ERROR: polecat dispatch failed for $bead_id" >&2
    return 1
  }

  echo "BEAD:${bead_id}"
  echo "CONVOY:${convoy_id}"
}

# td_wait_reviewers()
# Block until all supplied beads reach terminal state or timeout.
#
# Args:
#   $1 — space-separated bead IDs
#   $2 — poll interval seconds (default 20)
#   $3 — timeout seconds (default 1200)
td_wait_reviewers() {
  local bead_ids_str="${1:?bead_ids required}"
  local poll="${2:-20}"
  local timeout="${3:-1200}"

  # bash 3.2 compatible — no declare -A. Delegates to python3 for state tracking.
  # Polls `gt polecat list` + falls back to `bd show` (bead notes) for torn-down polecats.
  python3 - "$bead_ids_str" "$poll" "$timeout" "$GT_TOWN_DIR" "$GT_RIG_DIR" "$BD_BIN" "$(gt_cmd)" <<'PYEOF' || return $?
import json, os, subprocess, sys, time

bead_ids_str, poll_s, timeout_s, town_dir, rig_dir, bd_bin, gt_bin = sys.argv[1:]
poll_s = int(poll_s); timeout_s = int(timeout_s)
beads = [b for b in bead_ids_str.split() if b]
start = time.time()
final = {}
env = dict(os.environ)
env["PATH"] = f'{env.get("PATH","")}:{os.path.expanduser("~/go/bin")}:/opt/homebrew/bin'

def polecat_states():
    try:
        out = subprocess.check_output([gt_bin, "polecat", "list", "gastown", "--json"],
                                      cwd=town_dir, env=env, stderr=subprocess.DEVNULL, timeout=10)
        items = json.loads(out)
        return {i.get("issue"): i.get("state") for i in items if i.get("issue")}
    except Exception:
        return {}

def bead_has_notes(bead):
    try:
        out = subprocess.check_output([bd_bin, "show", bead, "--json"],
                                      cwd=rig_dir, env=env, stderr=subprocess.DEVNULL, timeout=10)
        d = json.loads(out)
        if isinstance(d, list): d = d[0] if d else {}
        notes = d.get("notes", "").strip()
        if not notes: return False
        # Still holds brief => not done from our perspective.
        first = notes.splitlines()[0] if notes else ""
        if first.startswith("# ") and "Brief" in first: return False
        return True
    except Exception:
        return False

pending = list(beads)
while pending:
    elapsed = int(time.time() - start)
    if elapsed >= timeout_s:
        sys.stderr.write(f"TIMEOUT after {elapsed}s — {len(pending)} pending\n")
        for b in pending:
            final[b] = "timeout"
            print(f"RESULT:{b}:timeout")
        break
    states = polecat_states()
    still = []
    for b in pending:
        st = states.get(b, "unknown")
        print(f"POLLING: {b} state={st} (elapsed {elapsed}s)", flush=True)
        if st == "done":
            final[b] = "done"; print(f"RESULT:{b}:done", flush=True)
        elif st in ("stuck", "stalled"):
            final[b] = st; print(f"RESULT:{b}:{st}", flush=True)
            sys.stderr.write(f"ERROR: {b} entered {st}\n")
        elif st == "unknown":
            # Polecat gone from list — check if notes landed (done + torn down).
            if bead_has_notes(b):
                final[b] = "done"; print(f"RESULT:{b}:done", flush=True)
                print(f"NOTE: {b} not listed but has notes — treating as done", flush=True)
            else:
                still.append(b)
        else:
            still.append(b)
    pending = still
    if pending:
        time.sleep(poll_s)

sys.exit(0 if all(v == "done" for v in final.values()) else 1)
PYEOF
}

# td_dispatch_batch()
# Parallel-dispatch a wave of beads. Reads newline-separated records from stdin:
#   <persona-slug>\t<notes-file>
# All beads share one convoy (created from the first dispatch).
# Writes two lines to stdout per successful bead: `BEAD:<persona>:<id>` and one `CONVOY:<id>`.
# Errors go to stderr; exit status non-zero if any dispatch failed.
#
# Args:
#   $1 — slug
#   $2 — round number
#   $3 — existing convoy_id (or empty string to create one)
td_dispatch_batch() {
  local slug="${1:?slug required}"
  local round="${2:?round required}"
  local convoy_id="${3:-}"

  local tmp_dir
  tmp_dir=$(mktemp -d)
  trap 'rm -rf "$tmp_dir"' RETURN

  # Collect input into array (one record per dispatch)
  local records=()
  while IFS=$'\t' read -r persona notes_file; do
    [ -z "$persona" ] && continue
    records+=("$persona"$'\t'"$notes_file")
  done

  [ "${#records[@]}" -eq 0 ] && { echo "ERROR: no records on stdin" >&2; return 1; }

  # First dispatch runs serially to establish/reuse a convoy.
  local first_record="${records[0]}"
  local first_persona first_notes
  IFS=$'\t' read -r first_persona first_notes <<< "$first_record"
  local first_out
  first_out=$(td_dispatch_reviewer "$slug" "$round" "$first_persona" "$first_notes" "$convoy_id") || {
    echo "ERROR: primary dispatch failed for $first_persona" >&2
    return 1
  }
  convoy_id=$(echo "$first_out" | grep "^CONVOY:" | cut -d: -f2-)
  local first_bead
  first_bead=$(echo "$first_out" | grep "^BEAD:" | cut -d: -f2-)
  echo "BEAD:${first_persona}:${first_bead}"
  echo "CONVOY:${convoy_id}"

  # Remaining dispatches run in parallel (backgrounded).
  local pids=()
  local i=1
  while [ "$i" -lt "${#records[@]}" ]; do
    local rec="${records[$i]}"
    local persona notes
    IFS=$'\t' read -r persona notes <<< "$rec"
    (
      out=$(td_dispatch_reviewer "$slug" "$round" "$persona" "$notes" "$convoy_id") && \
        bead=$(echo "$out" | grep "^BEAD:" | cut -d: -f2-) && \
        echo "BEAD:${persona}:${bead}" > "$tmp_dir/${persona}.out" || \
        echo "ERR:${persona}" > "$tmp_dir/${persona}.out"
    ) &
    pids+=($!)
    i=$((i + 1))
  done

  local fail=0
  # set -u tripwire — if pids is empty (single-record batch), skip the iteration
  [ "${#pids[@]}" -eq 0 ] && return 0
  for pid in "${pids[@]}"; do
    wait "$pid" || fail=1
  done

  for f in "$tmp_dir"/*.out; do
    [ -f "$f" ] || continue
    local line
    line=$(cat "$f")
    if [[ "$line" == ERR:* ]]; then
      echo "ERROR: dispatch failed for ${line#ERR:}" >&2
      fail=1
    else
      echo "$line"
    fi
  done

  return "$fail"
}

# td_reconstruct_critique()
# Read a polecat's output from bead notes and write it to disk.
#
# Args:
#   $1 — bead ID
#   $2 — round dir (absolute path)
#   $3 — persona slug (or agent name for non-reviewer beads)
#   $4 — target filename (optional; defaults to "critique-<persona_slug>.md")
#
# Returns: 0 if file written with content, 1 if notes empty.
td_reconstruct_critique() {
  local bead_id="${1:?bead_id required}"
  local round_dir="${2:?round_dir required}"
  local persona_slug="${3:?persona_slug required}"
  local target_name="${4:-critique-${persona_slug}.md}"

  local target="${round_dir}/${target_name}"

  local bead_json notes
  bead_json=$(cd "$GT_RIG_DIR" && "$BD_BIN" show "$bead_id" --json 2>&1) || {
    echo "ERROR: bd show failed for $bead_id" >&2
    return 1
  }

  notes=$(echo "$bead_json" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    if isinstance(d, list): d = d[0] if d else {}
    print(d.get('notes', ''))
except Exception as e:
    sys.stderr.write(f'parse fail: {e}\n')
    sys.exit(1)
" 2>/dev/null || echo "")

  if [ -z "$notes" ]; then
    echo "ERROR: bead $bead_id has empty notes — polecat did not write output back" >&2
    return 1
  fi

  # Detect case where bead notes still hold the original brief.
  if echo "$notes" | head -5 | grep -qE "^# (Reviewer|Audience Inferrer|Assumption Auditor|Editor) Brief"; then
    echo "ERROR: bead $bead_id notes still hold the brief — polecat never called write_results_to_bead" >&2
    return 1
  fi

  echo "$notes" > "$target"
  echo "wrote $target"
}

# td_bead_store()
# Append a slug/persona→bead mapping into the round's beads.json.
td_bead_store() {
  local round_dir="${1:?round_dir required}"
  local persona_slug="${2:?persona_slug required}"
  local bead_id="${3:?bead_id required}"
  local convoy_id="${4:-}"

  local target="${round_dir}/beads.json"
  python3 - "$target" "$persona_slug" "$bead_id" "$convoy_id" <<'PYEOF'
import sys, json, os, datetime
path, persona, bead, convoy = sys.argv[1:]
if os.path.exists(path):
    with open(path) as f: data = json.load(f)
else:
    data = {"version": 1, "reviewers": {}, "convoy_id": convoy or ""}
if convoy and not data.get("convoy_id"): data["convoy_id"] = convoy
data["reviewers"][persona] = {
    "bead_id": bead,
    "dispatched_at": datetime.datetime.utcnow().isoformat() + "Z",
}
with open(path, "w") as f: json.dump(data, f, indent=2); f.write("\n")
print(f"stored {persona} -> {bead}")
PYEOF
}

# Dispatcher for CLI usage:
#   lib/gastown-bridge.sh available
#   lib/gastown-bridge.sh dispatch <slug> <round> <persona-slug> <notes-file> <convoy-id-or-empty>
#   lib/gastown-bridge.sh dispatch-batch <slug> <round> <convoy-or-empty>  (reads persona\tnotes lines from stdin)
#   lib/gastown-bridge.sh wait <bead-ids-space-separated> [poll] [timeout]
#   lib/gastown-bridge.sh reconstruct <bead-id> <round-dir> <persona-slug> [target-filename]
#   lib/gastown-bridge.sh store <round-dir> <persona-slug> <bead-id> <convoy-id>
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  cmd="${1:-}"
  shift || true
  case "$cmd" in
    available) td_gastown_available ;;
    dispatch) td_dispatch_reviewer "$@" ;;
    dispatch-batch) td_dispatch_batch "$@" ;;
    wait) td_wait_reviewers "$@" ;;
    reconstruct) td_reconstruct_critique "$@" ;;
    store) td_bead_store "$@" ;;
    *)
      echo "usage: $0 {available|dispatch|dispatch-batch|wait|reconstruct|store} ..." >&2
      exit 2
      ;;
  esac
fi
