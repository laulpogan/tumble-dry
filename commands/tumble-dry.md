---
description: Polish content via simulated public contact — parallel reviewer personas, assumption audit, voice-preserving editor, converges on material findings. Dispatches agents with embedded prompts read from disk.
argument-hint: <artifact|glob|dir|status|resume <slug>> [--dry-run] [--per-file-audience] [--apply] [--panel-size N] [--no-auto-redraft]
---

# /tumble-dry

Polish a written artifact (or a batch, or a directory) end-to-end. Dispatches each agent via `Agent(prompt=...)` with the agent system prompt and brief embedded inline. Reviewers fan out in parallel (multiple Agent calls in ONE assistant turn). Main session drives the loop round by round.

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
if [ -d "$HOME/Source/tumble-dry" ]; then
  TD_HOME="$HOME/Source/tumble-dry"
elif [ -d "$HOME/.claude/plugins/tumble-dry" ]; then
  TD_HOME="$HOME/.claude/plugins/tumble-dry"
else
  echo "ERROR: tumble-dry not found. Clone to ~/Source/tumble-dry and run install.sh"; exit 2
fi
```

## Validate + parse args

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

Parse the returned JSON for `resume_from_round` + `resume_from_phase`, then re-enter the loop below at the appropriate phase.

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
if [[ "$ARTIFACT" == *"*"* ]] || [ -d "$ARTIFACT" ]; then
  INIT_OUT=$(node "$TD_HOME/bin/tumble-dry.cjs" init-batch "$ARTIFACT")
  KIND=batch
else
  INIT_OUT=$(node "$TD_HOME/bin/tumble-dry.cjs" init "$ARTIFACT")
  KIND=single
fi
SLUG=$(echo "$INIT_OUT" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);console.log(j.batch_slug||j.slug||"")}catch{console.log("")}}')
echo "[tumble-dry] initialized (kind=$KIND slug=$SLUG)"
```

## Round 1: Audience + Auditor (ONE turn, 2 parallel Agents)

Generate briefs, then read agent prompts and briefs from disk, dispatch both agents in ONE assistant turn.

```bash
AUDIENCE_BRIEF=$(node "$TD_HOME/bin/tumble-dry.cjs" brief-audience "$SLUG" 1 "${PANEL_SIZE:-5}")
AUDITOR_BRIEF=$(node "$TD_HOME/bin/tumble-dry.cjs" brief-auditor "$SLUG" 1)
```

Read the brief files:

```bash
AUDIENCE_BRIEF_CONTENT=$(cat "$AUDIENCE_BRIEF")
AUDITOR_BRIEF_CONTENT=$(cat "$AUDITOR_BRIEF")
```

Now dispatch BOTH agents in this single assistant turn — they run in parallel:

Agent(description="Infer audience panel", prompt="You are a tumble-dry agent. Follow the brief exactly. Output only the requested deliverable — no preamble, no meta-commentary.

$AUDIENCE_BRIEF_CONTENT

Write your output to .tumble-dry/$SLUG/round-1/audience.md. Reply only with 'wrote audience.md' — do NOT include the deliverable in your reply.")

Agent(description="Surface assumptions", prompt="You are a tumble-dry agent. Follow the brief exactly. Output only the requested deliverable — no preamble, no meta-commentary.

$AUDITOR_BRIEF_CONTENT

Write your output to .tumble-dry/$SLUG/round-1/assumption-audit.md. Reply only with 'wrote assumption-audit.md' — do NOT include the deliverable in your reply.")

## Loop: Reviewer waves until convergence

Set ROUND=1. For each round:

### Generate reviewer briefs

```bash
BRIEFS_JSON=$(node "$TD_HOME/bin/tumble-dry.cjs" brief-reviewers "$SLUG" "$ROUND")
```

### Dispatch ALL reviewers in ONE assistant turn

For each entry in BRIEFS_JSON (which is a JSON array of `{slug, name, brief_path}`):

Read each brief file, then emit ALL Agent calls in a single turn. Example for 5 reviewers:

```bash
BRIEF_1=$(cat "<brief_path_1>")
BRIEF_2=$(cat "<brief_path_2>")
# ... etc for each reviewer
```

Agent(description="Critique: <persona-1>", prompt="You are a tumble-dry agent. Follow the brief exactly. Output only the requested deliverable — no preamble, no meta-commentary.

$BRIEF_1

Write your critique to .tumble-dry/$SLUG/round-$ROUND/critique-<persona-1-slug>.md. Reply only with 'wrote critique-<persona-1-slug>.md' — do NOT include the critique in your reply.")

Agent(description="Critique: <persona-2>", prompt="...$BRIEF_2...")

... (ALL N reviewers in this ONE turn — they run in parallel)

### Aggregate

```bash
AGG_JSON=$(node "$TD_HOME/bin/tumble-dry.cjs" aggregate "$SLUG" "$ROUND")
CONVERGED=$(echo "$AGG_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).converged?"1":"0")}catch{console.log("0")}}')
```

Render progress:

```bash
node "$TD_HOME/bin/tumble-dry.cjs" status-render "$SLUG"
```

If CONVERGED=1 or ROUND >= max_rounds, proceed to finalize. Otherwise, dispatch the editor.

### Editor (ONE turn, 1 Agent)

```bash
EDITOR_BRIEF_PATH=$(node "$TD_HOME/bin/tumble-dry.cjs" brief-editor "$SLUG" "$ROUND")
EDITOR_BRIEF_CONTENT=$(cat "$EDITOR_BRIEF_PATH")
```

Agent(description="Redraft artifact", prompt="You are a tumble-dry agent. Follow the brief exactly. Output only the requested deliverable — no preamble, no meta-commentary.

$EDITOR_BRIEF_CONTENT

Write your redraft to .tumble-dry/$SLUG/round-$ROUND/proposed-redraft.md. Reply only with 'wrote proposed-redraft.md' — do NOT include the redraft in your reply.")

### Extract redraft + drift + advance round

```bash
STAGED=$(node "$TD_HOME/bin/tumble-dry.cjs" extract-redraft "$SLUG" "$ROUND")
ARTIFACT_PATH=$(cat ".tumble-dry/$SLUG/artifact.path")
node "$TD_HOME/bin/tumble-dry.cjs" drift "$SLUG" "$ROUND" "$ARTIFACT_PATH" "$STAGED"
# Apply redraft to working copy
cp "$STAGED" "$ARTIFACT_PATH"
```

Increment ROUND, create next round dir, loop back to "Generate reviewer briefs."

```bash
ROUND=$((ROUND + 1))
node "$TD_HOME/bin/tumble-dry.cjs" new-round "$SLUG"
```

## Finalize

```bash
APPLY_FLAG=""
if [ "$APPLY" = "true" ]; then APPLY_FLAG="--apply"; fi
node "$TD_HOME/bin/tumble-dry.cjs" finalize "$SLUG" $APPLY_FLAG
node "$TD_HOME/bin/tumble-dry.cjs" report "$SLUG" final
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

- **Shared data plane.** Every state mutation runs through `bin/tumble-dry.cjs` subcommands (`init`, `brief-*`, `aggregate`, `drift`, `extract-redraft`, `finalize`, `report`, `status-*`). The slash command is control-plane only — it never writes run state directly.
- **Agent dispatch.** Each agent's system prompt (from `agents/*.md`) is embedded in the brief by the `brief-*` subcommands. The slash command reads the brief from disk and passes it as the Agent `prompt` parameter. No custom subagent_type, no plugin registry.
- **Parallel fanout.** Multiple Agent() calls in ONE assistant turn dispatch concurrently. All N reviewers in a single turn is critical for correct convergence.
- **Non-destructive invariant.** Source files are never touched. Working copy + per-round history under `.tumble-dry/<slug>/`.
