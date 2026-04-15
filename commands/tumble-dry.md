---
description: Polish content via simulated public contact — parallel reviewer personas, assumption audit, voice-preserving editor, converges on material findings. Runs in your active Claude Code session — no API key required.
argument-hint: <filepath> [--audience "..."] [--panel-size N] [--no-auto-redraft] [--apply]
---

# /tumble-dry

Run the full tumble-dry convergence loop on a content artifact (markdown doc, blog post, copy, ad, markdown-based deck) inside your active Claude Code session. Reviewer personas, the assumption auditor, and the editor are all dispatched as parallel `Task` subagents — no `ANTHROPIC_API_KEY` is needed; the loop inherits your session auth. State mutations go through the shared data plane (`bin/tumble-dry.cjs` subcommands) so a CI-friendly headless variant (`bin/tumble-dry-loop.cjs`) stays in lock-step.

This command body IS the orchestrator. Follow the numbered steps below in order. Where a step says "ONE assistant turn", you MUST emit all enumerated `Task(subagent_type=...)` calls in a single message — never serialize them across turns. Inline shape reference: `Task(subagent_type="reviewer", description="...", prompt="...")`.

## Quickstart examples

Four scenarios mirror `bin/tumble-dry-loop.cjs --help`:

- **Polish a substack post (prose):** `/tumble-dry post.md`
- **Polish a pitch deck (.pptx projected to markdown):** `/tumble-dry deck.pptx` — loader emits `ROUNDTRIP_WARNING.md`; FINAL.md ships as markdown; original `.pptx` preserved byte-for-byte at `.tumble-dry/<slug>/history/round-0-original.pptx`.
- **Polish a code refactor PR (AST-aware drift, linter-clean assumption):** `/tumble-dry --panel-size 5 src/auth/` — detects code via `linguist-js`; editor swaps voice for PEP 8 / Effective Go / Rust API Guidelines / JS Standard; signature changes on public API are permanent `STRUCTURAL:` flags.
- **Polish a spec doc with a verify command (.docx + pytest gate):** set `verify_cmd: "pytest tests/"` in `.tumble-dry.yml`, then `/tumble-dry spec.docx`. Redraft is rejected if `verify_cmd` exits non-zero; loop continues with prior state.

## Roundtrip (opt-in, v0.7+)

By default tumble-dry ships only `FINAL.md` — you re-apply changes to your `.docx`/`.pptx`/`.xlsx` source manually. Pass `--apply` to also regenerate the source binary alongside `FINAL.md` plus a `LOSSY_REPORT.md` describing what survived/was approximated/was dropped.

- **Polish a docx and regenerate it:** `/tumble-dry spec.docx --apply` → produces `FINAL.md`, `FINAL.docx`, `LOSSY_REPORT.md`.
- **PDF is explicitly NOT supported** — `--apply` on a `.pdf` source errors with a pointer to pandoc / weasyprint. Use those for markdown→PDF re-typesetting.

The slash command surfaces `LOSSY_REPORT.md` to chat after finalize so you can read what was lost before shipping the regenerated file.

## Resolve plugin home

```bash
if [ -d "$HOME/.claude/plugins/tumble-dry" ]; then
  TD_HOME="$HOME/.claude/plugins/tumble-dry"
elif [ -d "$HOME/Source/tumble-dry" ]; then
  TD_HOME="$HOME/Source/tumble-dry"
else
  echo "ERROR: tumble-dry plugin not found"; exit 2
fi
```

## Validate plugin spec compliance

```bash
if ! node "$TD_HOME/bin/validate-plugin.cjs" --root "$TD_HOME" 2>&1; then
  echo "[tumble-dry-loop] FATAL: plugin spec validation failed (see above)"
  echo "[tumble-dry-loop] Fix the validation errors and re-run /tumble-dry"
  exit 2
fi
```

If the validator exits non-zero, halt the slash command. Re-run the validator manually for a debug trace: `node $TD_HOME/bin/validate-plugin.cjs --root $TD_HOME`.

## Parse arguments

Parse `$ARGUMENTS` into:

- `ARTIFACT` — first positional arg. If `--paste`, open `$EDITOR` on a tempfile and use that path. If empty and stdin is a tty, error: `echo "ERROR: missing artifact"; exit 2`.
- `AUDIENCE_OVERRIDE` — value passed to `--audience` (default empty → use config).
- `PANEL_SIZE` — value passed to `--panel-size` (default empty → config default).
- `NO_AUTO_REDRAFT` — boolean flag from `--no-auto-redraft`.
- `APPLY_ROUNDTRIP` — boolean flag from `--apply` (ROUNDTRIP-01). When set and the source format is `.docx`/`.pptx`/`.xlsx`, finalize regenerates the source binary alongside FINAL.md and writes `LOSSY_REPORT.md`. PDF errors with a pointer to pandoc/weasyprint.

## Initialize the run

```bash
INIT_OUT=$(node "$TD_HOME/bin/tumble-dry.cjs" init "$ARTIFACT")
INIT_STATUS=$?
if [ $INIT_STATUS -ne 0 ]; then
  echo "[tumble-dry-loop] FATAL: init failed (exit $INIT_STATUS) — see stderr above"
  exit $INIT_STATUS
fi
# init emits JSON on stdout. Parse fields we need.
SLUG=$(echo "$INIT_OUT" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);console.log(j.slug||"")}catch{console.log("")}}')
SOURCE_FORMAT=$(echo "$INIT_OUT" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);console.log(j.source_format||"")}catch{console.log("")}}')
echo "[tumble-dry-loop] slug=$SLUG source_format=${SOURCE_FORMAT:-markdown} starting at round 1"

# FORMAT-04: if non-markdown source, show ROUNDTRIP_WARNING.md before round 1
WARN_FILE=".tumble-dry/$SLUG/ROUNDTRIP_WARNING.md"
if [ -f "$WARN_FILE" ]; then
  echo ""
  echo "==================== ROUNDTRIP WARNING ===================="
  cat "$WARN_FILE"
  echo "==========================================================="
  echo ""
fi
```

## Round loop

Read `max_rounds` from `.tumble-dry/$SLUG/config.json` (or default to 5). Then iterate `for ROUND in 1..MAX_ROUNDS`. Inside the loop, execute the subsections below in the exact order listed. Do not skip ahead or re-order.

### Round N: Generate briefs

```bash
ROUND_DIR=".tumble-dry/$SLUG/round-$ROUND"
mkdir -p "$ROUND_DIR"

if [ "$ROUND" = "1" ]; then
  # Independent file writes — run in parallel
  node "$TD_HOME/bin/tumble-dry.cjs" brief-audience "$SLUG" 1 "${PANEL_SIZE:-7}" "${AUDIENCE_OVERRIDE:--}" &
  node "$TD_HOME/bin/tumble-dry.cjs" brief-auditor  "$SLUG" 1 &
  wait
fi

REVIEWER_BRIEFS_JSON=$(node "$TD_HOME/bin/tumble-dry.cjs" brief-reviewers "$SLUG" "$ROUND")
echo "$REVIEWER_BRIEFS_JSON" > "$ROUND_DIR/reviewer-briefs.json"
```

`reviewer-briefs.json` contains the array `[{slug, brief_path}, ...]` — one entry per reviewer persona.

### Round N: Write pre-dispatch manifest

Before any Task fanout, persist the expected critique filenames so the post-fanout reconciler can detect missing outputs (Pitfall 1).

```bash
node -e '
  const fs=require("fs"), path=require("path");
  const slug=process.env.SLUG, round=process.env.ROUND;
  const roundDir=`.tumble-dry/${slug}/round-${round}`;
  const briefs=JSON.parse(fs.readFileSync(path.join(roundDir,"reviewer-briefs.json"),"utf-8"));
  const expected=briefs.map(b=>`critique-${b.slug}.md`);
  const manifest={ wave:"reviewers", expected, spawned_at:new Date().toISOString(), round:Number(round) };
  fs.writeFileSync(path.join(roundDir,"dispatch-manifest.json"), JSON.stringify(manifest,null,2));
  console.error(`[tumble-dry-loop] manifest written: expecting ${expected.length} reviewers`);
' SLUG="$SLUG" ROUND="$ROUND"
```

### Round N: Audience + Auditor fanout (Round 1 only — ONE ASSISTANT TURN)

Round 1 only. Emit BOTH Task calls in a SINGLE assistant message — do not split across turns.

```
Task(
  subagent_type="audience-inferrer",
  description="Infer audience panel",
  prompt="Read the brief at .tumble-dry/<SLUG>/round-1/brief-audience.md. Follow its instructions. Write your output to .tumble-dry/<SLUG>/round-1/audience.md. Reply only with the confirmation 'wrote audience.md' — do NOT include the deliverable in your reply (it goes to disk)."
)
Task(
  subagent_type="assumption-auditor",
  description="Surface load-bearing assumptions",
  prompt="Read the brief at .tumble-dry/<SLUG>/round-1/brief-auditor.md. Follow its instructions. Write your output to .tumble-dry/<SLUG>/round-1/assumption-audit.md. Reply only with the confirmation 'wrote assumption-audit.md' — do NOT include the deliverable in your reply."
)
```

CRITICAL: Both Task calls must be in the SAME assistant message. Sequentially-fanned subagents trigger Pitfall 1 (false convergence on partial rounds).

### Round N: Verify Round-1 wave outputs (Round 1 only — Bash)

```bash
if [ "$ROUND" = "1" ]; then
  for f in audience.md assumption-audit.md; do
    if [ ! -f ".tumble-dry/$SLUG/round-1/$f" ]; then
      echo "[tumble-dry-loop] WARN: round-1 wave missing $f — logging and retrying once"
      mkdir -p ".tumble-dry/$SLUG/round-1"
      cat >> ".tumble-dry/$SLUG/round-1/dispatch-errors.md" <<EOF

## ${f%.md} — silent_text_return
- persona: ${f%.md}
- mode: silent_text_return
- detail: file at .tumble-dry/$SLUG/round-1/$f not present after Task call
- retry_attempted: true
EOF
      RETRY_R1_NEEDED=1
    fi
  done
fi
```

If `RETRY_R1_NEEDED=1`, re-emit the missing Task calls in ONE assistant turn with a stricter brief reminder (see partial-round policy below). If still missing after retry, abort: `echo "[tumble-dry-loop] FATAL: round-1 wave failed twice"; exit 2`.

### Round N: Reviewer fanout (PARALLEL — ONE ASSISTANT TURN)

Spawn ALL N reviewer Task calls in a SINGLE assistant message (one turn). Do NOT spawn them one at a time across turns — that triggers serial execution and Pitfall 1 (false convergence on partial rounds). This is the most important invariant in the entire orchestrator.

For each entry `{slug: <persona>, brief_path: <path>}` in `reviewer-briefs.json`, emit one Task call inside the same assistant message:

```
Task(
  subagent_type="reviewer",
  description="Critique through persona <persona>",
  prompt="Read the brief at <brief_path>. Follow its instructions. Write your critique to .tumble-dry/<SLUG>/round-<ROUND>/critique-<persona>.md using the schema: H2 headers per finding, then '**severity:** material|minor|nit|structural' and '**summary:** <one-line summary>' lines under each. Reply only 'wrote critique-<persona>.md' — do NOT include the critique body in your reply."
)
Task(
  subagent_type="reviewer",
  description="Critique through persona <next-persona>",
  prompt="..."
)
... (repeat for every persona in reviewer-briefs.json — ALL in this same message)
```

### Round N: Glob reconciliation + partial-round policy

```bash
EXPECTED=$(jq -r '.expected[]' ".tumble-dry/$SLUG/round-$ROUND/dispatch-manifest.json" | sed 's/^critique-//;s/\.md$//' | sort)
ACTUAL=$(ls ".tumble-dry/$SLUG/round-$ROUND/"critique-*.md 2>/dev/null | xargs -n1 basename | sed 's/^critique-//;s/\.md$//' | sort)
MISSING=$(comm -23 <(echo "$EXPECTED") <(echo "$ACTUAL"))
N=$(echo "$EXPECTED" | grep -c .)
M=$(echo "$ACTUAL" | grep -c .)
echo "[tumble-dry-loop] round $ROUND M/N reviewers returned: $M/$N"

RETRY_NEEDED=0
ABORT_ROUND=0
if [ -n "$MISSING" ]; then
  for persona in $MISSING; do
    cat >> ".tumble-dry/$SLUG/round-$ROUND/dispatch-errors.md" <<EOF

## $persona — silent_text_return
- persona: $persona
- mode: silent_text_return
- detail: critique-$persona.md not present after fanout
- retry_attempted: false
EOF
  done
  RATIO=$(awk "BEGIN{print $M/$N}")
  if awk "BEGIN{exit !($RATIO >= 0.6)}"; then
    echo "[tumble-dry-loop] partial round (M/N=$RATIO >= 0.6) — proceeding with degradation"
    echo "_panel degraded: $M/$N reviewers returned_" >> ".tumble-dry/$SLUG/round-$ROUND/aggregate-degradation.note"
  else
    echo "[tumble-dry-loop] partial round (M/N=$RATIO < 0.6) — retrying missing personas once"
    RETRY_NEEDED=1
  fi
fi
```

If `RETRY_NEEDED=1`: for each missing persona, append the following to its brief and re-emit Task calls in ONE assistant turn (all retries in a single message, again):

> CRITICAL: Your only output is the file at `.tumble-dry/<SLUG>/round-<ROUND>/critique-<persona>.md`. Do not return text in chat. Use exactly the H2-header + `**severity:**` / `**summary:**` schema or the aggregator will discard your critique.

After the retry wave, re-run the reconciliation block above. If reviewers are still missing AND `M/N < 0.6`, abort the round:

```bash
if [ "$RETRY_NEEDED" = "1" ] && [ "$ABORT_ROUND" = "1" ]; then
  echo "[tumble-dry-loop] FATAL: round $ROUND aborted — see .tumble-dry/$SLUG/round-$ROUND/dispatch-errors.md"
  exit 2
fi
```

For each retry attempt that succeeds, update the corresponding `dispatch-errors.md` entry's `retry_attempted: false` → `retry_attempted: true`.

### Round N: Aggregate

```bash
node "$TD_HOME/bin/tumble-dry.cjs" aggregate "$SLUG" "$ROUND"
AGG_JSON=$(cat ".tumble-dry/$SLUG/round-$ROUND/aggregate.json")
MATERIAL=$(echo "$AGG_JSON" | jq '.by_severity.material // 0')
MINOR=$(echo "$AGG_JSON" | jq '.by_severity.minor // 0')
STRUCTURAL=$(echo "$AGG_JSON" | jq '.structural_count // 0')
RAW=$(echo "$AGG_JSON" | jq '.total_raw // 0')
CONVERGED=$(echo "$AGG_JSON" | jq -r '.converged')
echo "[tumble-dry-loop] round $ROUND aggregate — raw=$RAW material=$MATERIAL minor=$MINOR structural=$STRUCTURAL converged=$CONVERGED"
```

CRITICAL (Pitfall 4 invariant): The orchestrator reads ONLY `aggregate.md` and `aggregate.json` — NEVER the raw `critique-*.md` files. The aggregator is the only consumer of raw critiques. Do not invoke the `Read` tool on individual `critique-*.md` files at any point in the loop; doing so burns the main session context (each critique can be 5–20KB; fanned across N reviewers and R rounds it pegs the context window). The aggregate is bounded at ~5–10KB; consume only that.

### Round N: Convergence check + finalize-or-redraft branch

```bash
if [ "$CONVERGED" = "true" ]; then
  FINALIZE_ARGS=("$SLUG")
  if [ "$APPLY_ROUNDTRIP" = "1" ]; then FINALIZE_ARGS+=("--apply"); fi
  node "$TD_HOME/bin/tumble-dry.cjs" finalize "${FINALIZE_ARGS[@]}"
  echo "[tumble-dry-loop] ✓ converged at round $ROUND"
  echo "FINAL artifact: .tumble-dry/$SLUG/FINAL.md"
  echo "Polish log:    .tumble-dry/$SLUG/polish-log.md"
  if [ "$APPLY_ROUNDTRIP" = "1" ] && [ -f ".tumble-dry/$SLUG/LOSSY_REPORT.md" ]; then
    echo ""
    echo "==================== LOSSY ROUNDTRIP REPORT ===================="
    cat ".tumble-dry/$SLUG/LOSSY_REPORT.md"
    echo "================================================================"
  fi
  exit 0
fi

if [ "$ROUND" -ge "$MAX_ROUNDS" ]; then
  FINALIZE_ARGS=("$SLUG")
  if [ "$APPLY_ROUNDTRIP" = "1" ]; then FINALIZE_ARGS+=("--apply"); fi
  node "$TD_HOME/bin/tumble-dry.cjs" finalize "${FINALIZE_ARGS[@]}"
  echo "[tumble-dry-loop] ⚠ hit max_rounds without convergence — finalized current state"
  exit 1
fi

if [ "$NO_AUTO_REDRAFT" = "1" ]; then
  echo "[tumble-dry-loop] not converged; --no-auto-redraft set, exiting without editor"
  exit 1
fi
```

If none of the above branches exit, fall through to the editor step.

### Round N: Editor brief + redraft

```bash
node "$TD_HOME/bin/tumble-dry.cjs" brief-editor "$SLUG" "$ROUND"
```

Then emit a SINGLE editor Task call in its own assistant turn (the editor is a single subagent — no fanout):

```
Task(
  subagent_type="editor",
  description="Voice-preserving redraft",
  prompt="Read the brief at .tumble-dry/<SLUG>/round-<ROUND>/brief-editor.md. Follow its instructions. Write your proposed redraft to .tumble-dry/<SLUG>/round-<ROUND>/proposed-redraft.md. Reply only with the confirmation 'wrote proposed-redraft.md' — do NOT include the redraft body in your reply."
)
```

After the editor returns:

```bash
STAGED=$(node "$TD_HOME/bin/tumble-dry.cjs" extract-redraft "$SLUG" "$ROUND" | tail -1)
ARTIFACT_ABS=$(cat ".tumble-dry/$SLUG/artifact.path")
DRIFT_JSON=$(node "$TD_HOME/bin/tumble-dry.cjs" drift "$SLUG" "$ROUND" "$ARTIFACT_ABS" "$STAGED")
DRIFT_SCORE=$(echo "$DRIFT_JSON" | jq '.drift_score')

# Non-destructive: snapshot input → overwrite working copy → snapshot output
node -e '
  const { snapshotHistory } = require(process.env.TD_HOME + "/lib/run-state.cjs");
  snapshotHistory(".tumble-dry/" + process.env.SLUG, Number(process.env.ROUND), "input", process.env.ARTIFACT_ABS);
' SLUG="$SLUG" ROUND="$ROUND" ARTIFACT_ABS="$ARTIFACT_ABS" TD_HOME="$TD_HOME"
cp "$STAGED" "$ARTIFACT_ABS"
node -e '
  const { snapshotHistory } = require(process.env.TD_HOME + "/lib/run-state.cjs");
  snapshotHistory(".tumble-dry/" + process.env.SLUG, Number(process.env.ROUND), "output", process.env.ARTIFACT_ABS);
' SLUG="$SLUG" ROUND="$ROUND" ARTIFACT_ABS="$ARTIFACT_ABS" TD_HOME="$TD_HOME"

echo "[tumble-dry-loop] round $ROUND drift score=$DRIFT_SCORE"
ROUND=$((ROUND + 1))
```

CRITICAL: The orchestrator NEVER reads `proposed-redraft.md` directly. The redraft body is read only by the data-plane (`extract-redraft`, `drift`, and the `cp` step that overwrites `working.md`). Main session sees only the staged-redraft path string and the drift score.

Then continue the loop at the next `ROUND`.

## Failure-mode taxonomy

All failures encountered during a round are logged to `.tumble-dry/<slug>/round-<N>/dispatch-errors.md`. Four canonical modes (per Pitfall 5):

- **`timeout`** — Task harness reported a timeout while waiting for the subagent. Detection: subagent never returned within the configured deadline. Action: log entry, retry once with stricter brief.
- **`malformed_output`** — file was written but the aggregator parsed zero `## ` headers (no findings). Detection: post-aggregate, the persona's parsed-finding count is 0 AND the file size is non-trivial (>200 bytes). Action: log entry, retry once.
- **`refusal`** — file body contains "I can't" / "I'm not able to critique" / "I'm not comfortable" with zero findings. Detection: regex scan of the critique body. Action: log entry, retry once with reframed brief; if still refused, accept the gap and proceed.
- **`silent_text_return`** — Task replied with text in chat but did not write the expected file at the expected path. Detection: post-fanout glob shows the expected filename missing. Action: log entry, retry once with stricter brief.

Each entry in `dispatch-errors.md` is an H2 block with `persona`, `mode`, `detail`, `retry_attempted` fields.

## Notes

- **Shared data plane.** Every state mutation (init, briefs, aggregate, drift, extract-redraft, finalize) runs through `bin/tumble-dry.cjs` subcommands. The slash command is the control plane only — it never writes run state directly.
- **Headless fallback.** For CI / scripting / no-Claude-Code environments, `bin/tumble-dry-loop.cjs` runs the same loop but dispatches via the Anthropic API (requires `ANTHROPIC_API_KEY`). It produces the same `.tumble-dry/<slug>/` layout and the same `[tumble-dry-loop]` log idiom — if you're debugging a CC-native run, you can re-play the same artifact through the headless path to compare.
- **Trace fidelity.** The CC-native path (this slash command) records brief-path, critique-path, timing, and exit status — but NOT the raw subagent request/response payload (Claude Code isolates subagent context). The headless path in `bin/tumble-dry-loop.cjs` records full per-dispatch traces under `round-N/traces/`. Use the headless path when you need byte-exact replay.
- **Plugin home resolution.** Resolved at the top: `$HOME/.claude/plugins/tumble-dry` (plugin install) preferred, falling back to `$HOME/Source/tumble-dry` (dev clone).
- **`--paste` mode.** If the user passes `--paste`, open `$EDITOR` on a tempfile, then treat the tempfile path as `ARTIFACT`.
- **Non-destructive invariant.** Source files are never touched. The editor step overwrites the working copy under `.tumble-dry/<slug>/working.md` only; per-round input/output snapshots land in `.tumble-dry/<slug>/history/`.
