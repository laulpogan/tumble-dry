---
description: Polish content via simulated public contact — parallel reviewer personas, assumption audit, voice-preserving editor, converges on material findings.
argument-hint: <filepath> [--audience "..."] [--panel-size N] [--no-auto-redraft]
---

# /tumble-dry

Run the full tumble-dry convergence loop on a content artifact (markdown doc, blog post, copy, ad, markdown-based deck).

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

## Run the loop

Parse `$ARGUMENTS` into:
- `ARTIFACT` — first positional arg (or `--paste` to open $EDITOR on a tempfile)
- Flag passthroughs: `--audience`, `--panel-size`, `--no-auto-redraft`

Then:

```bash
node "$TD_HOME/bin/tumble-dry-loop.cjs" "$ARTIFACT" \
  ${PANEL_SIZE:+--panel-size "$PANEL_SIZE"} \
  ${NO_AUTO_REDRAFT:+--no-auto-redraft}
```

The loop driver handles: init, round 1 (audience + audit + reviewers), aggregate, convergence check, editor redraft on non-convergence, repeat until converged or `max_rounds` hit.

Pipe stderr of the loop to the user so progress logs are visible (`[tumble-dry-loop]` prefix).

On completion, show the user:
- `.tumble-dry/<slug>/FINAL.md` — the polished artifact
- `.tumble-dry/<slug>/polish-log.md` — round-by-round summary
- Exit status: 0 = converged, 1 = max_rounds hit, 2 = error

## Requirements

This slash command currently shells out to `bin/tumble-dry-loop.cjs`, which uses the Anthropic API directly. That requires `ANTHROPIC_API_KEY` (env var or `~/.anthropic/api_key`).

**v0.5.0 (in progress)** will rewrite this command to dispatch each agent via parallel `Task(subagent_type=...)` calls inside your active Claude Code session — no API key required, inherits your session auth. Until then, the API-key path is the only option for the loop driver. (You can still invoke individual subagents in this session manually using the `Task` tool with the agent files in `agents/`.)

If no artifact argument: read from stdin (useful for `pbpaste | /tumble-dry`).

## Notes

- All orchestration logic is in `bin/tumble-dry-loop.cjs`. This slash command is a thin invocation layer.
- For per-step control (run one round, inspect, manually edit, re-run), invoke the loop with `--no-auto-redraft` — it stops after the first aggregate that doesn't converge, leaving you free to edit the artifact and re-invoke to resume.
