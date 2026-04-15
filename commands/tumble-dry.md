---
description: Polish content via simulated public contact — parallel reviewer personas, assumption audit, voice-preserving editor, converges on material findings. Runs headless in an orchestrator subagent — main session sees only progress + REPORT.md.
argument-hint: <artifact|glob|dir|status|resume <slug>> [--dry-run] [--per-file-audience] [--apply] [--panel-size N] [--no-auto-redraft]
---

# /tumble-dry

Polish a written artifact (or a batch, or a directory) end-to-end. Dispatches a headless `orchestrator` subagent that runs the full convergence loop, emits `status.json` + per-round `REPORT.md`, and hands reviewer/editor fanouts back to this session one wave at a time.

Main session sees: one line per round + final `REPORT.md`. No raw critique floods, no aggregate dumps.

## Quickstart examples

- **Polish a single markdown post:** `/tumble-dry post.md`
- **Polish a site's copy:** `/tumble-dry "site/copy/*.md"`
- **Polish a whole docs directory:** `/tumble-dry docs/`
- **Preview cost before committing:** `/tumble-dry post.md --dry-run`
- **List interrupted runs:** `/tumble-dry status`
- **Resume a killed run:** `/tumble-dry resume site-copy-20260415-1430`
- **Regenerate source binary after convergence (.docx/.pptx/.xlsx):** `/tumble-dry spec.docx --apply`

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

## Validate + parse args

```bash
node "$TD_HOME/bin/validate-plugin.cjs" --root "$TD_HOME" 2>&1 || { echo "[tumble-dry] plugin spec validation failed"; exit 2; }
```

Parse `$ARGUMENTS` into positional args (artifact, subcommand) + flags (`--dry-run`, `--apply`, `--per-file-audience`, `--panel-size`, `--no-auto-redraft`). The first positional may be a subcommand: `status` or `resume <slug>`.

## Subcommand: status

```bash
node "$TD_HOME/bin/tumble-dry.cjs" status
```

Exits 0 if all runs converged; 1 if any are pending or orphaned.

## Subcommand: resume

```bash
RESUME_JSON=$(node "$TD_HOME/bin/tumble-dry.cjs" resume "$SLUG")
echo "$RESUME_JSON"
```

Parse the returned JSON for `resume_from_round` + `resume_from_phase`, then re-dispatch the orchestrator with those args (see "Dispatch orchestrator" below).

## Dry-run mode

```bash
node "$TD_HOME/bin/tumble-dry.cjs" dry-run "$ARTIFACT" --panel-size "${PANEL_SIZE:-5}"
# Prints cost estimate block. Exits without dispatching reviewers.
exit 0
```

## Canary notice (zero-config first run)

If no `.tumble-dry.yml` is present, emit a one-line notice:

```bash
if [ ! -f .tumble-dry.yml ]; then
  NOTICE=$(node "$TD_HOME/bin/tumble-dry.cjs" canary-infer | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).notice||"")}catch{}}')
  echo "[tumble-dry] $NOTICE"
fi
```

## Initialize (single or batch)

```bash
# Detect batch by checking for glob/dir
if [[ "$ARTIFACT" == *"*"* ]] || [ -d "$ARTIFACT" ]; then
  INIT_OUT=$(node "$TD_HOME/bin/tumble-dry.cjs" init-batch "$ARTIFACT")
  KIND=batch
else
  INIT_OUT=$(node "$TD_HOME/bin/tumble-dry.cjs" init "$ARTIFACT")
  KIND=single
fi
SLUG=$(echo "$INIT_OUT" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);console.log(j.batch_slug||j.slug||"")}catch{console.log("")}}')
echo "[tumble-dry] dispatched orchestrator (kind=$KIND slug=$SLUG) → polling…"
```

## Dispatch orchestrator (wave loop)

Invoke the headless orchestrator subagent with the run context. The orchestrator writes `.tumble-dry/<slug>/dispatch-plan.json` describing the next Task fanout it needs. This session reads the plan, emits the fanout in ONE assistant turn, then re-invokes the orchestrator.

```
Task(
  subagent_type="orchestrator",
  description="Advance tumble-dry loop",
  prompt="Run the tumble-dry orchestrator for slug=<SLUG>, kind=<KIND>, mode=<MODE>, cwd=$PWD. Read .tumble-dry/<SLUG>/status.json for current state. Perform the current phase, write status.json + dispatch-plan.json, return one-line confirmation."
)
```

After the orchestrator returns, read the dispatch plan:

```bash
PLAN=$(cat ".tumble-dry/$SLUG/dispatch-plan.json")
DONE=$(echo "$PLAN" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).done?"1":"0")}catch{console.log("0")}}')
```

If `DONE=1`, cat `REPORT.md` and exit. Otherwise, emit the Task fanout described in the plan (one Task call per `dispatch_plan.tasks[]` entry, all in the same assistant turn). Then re-invoke the orchestrator for the next wave.

Render progress after each wave:

```bash
node "$TD_HOME/bin/tumble-dry.cjs" status-render "$SLUG"
```

## Final output

```bash
if [ -f ".tumble-dry/$SLUG/REPORT.md" ]; then
  echo "=================== REPORT ==================="
  cat ".tumble-dry/$SLUG/REPORT.md"
  echo "=============================================="
fi
echo "FINAL artifact: .tumble-dry/$SLUG/FINAL.md"
echo "Polish log:     .tumble-dry/$SLUG/polish-log.md"
```

## Notes

- **Shared data plane.** Every state mutation runs through `bin/tumble-dry.cjs` subcommands (`init`, `init-batch`, `brief-*`, `aggregate`, `drift`, `extract-redraft`, `finalize`, `report`, `status-*`). The slash command is control-plane only — it never writes run state directly.
- **Headless fallback.** For CI / no-Claude-Code: `bin/tumble-dry-loop.cjs` runs the same loop via the Anthropic API (requires `ANTHROPIC_API_KEY`).
- **Non-destructive invariant.** Source files are never touched. Working copy + per-round history under `.tumble-dry/<slug>/`.
- **Subagent-dispatch constraint.** Plugin-shipped subagents cannot spawn other subagents (Task tool is stripped at load time). The orchestrator is therefore a dispatch-plan *emitter*; this session owns the Task fanout. See `.planning/phases/08-ux-rebuild/08-FEASIBILITY.md`.
