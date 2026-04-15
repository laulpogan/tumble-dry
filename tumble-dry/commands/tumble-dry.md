---
description: Polish content via simulated public contact — parallel reviewer personas, assumption audit, voice-preserving editor, converges on material findings.
argument-hint: <filepath> [--audience "..."] [--panel-size N] [--no-auto-redraft] [--backend api|gastown]
---

# /tumble-dry

Run the full tumble-dry convergence loop on a content artifact (markdown doc, blog post, copy, ad, markdown-based deck).

## Resolve plugin home

```bash
if [ -d "$HOME/.claude/plugins/tumble-dry/tumble-dry" ]; then
  TD_HOME="$HOME/.claude/plugins/tumble-dry/tumble-dry"
elif [ -d "$HOME/Source/tumble-dry/tumble-dry" ]; then
  TD_HOME="$HOME/Source/tumble-dry/tumble-dry"
else
  echo "ERROR: tumble-dry plugin not found"; exit 2
fi
```

## Run the loop

Parse `$ARGUMENTS` into:
- `ARTIFACT` — first positional arg (or `--paste` to open $EDITOR on a tempfile)
- Flag passthroughs: `--audience`, `--panel-size`, `--no-auto-redraft`, `--backend`

Then:

```bash
node "$TD_HOME/bin/tumble-dry-loop.cjs" "$ARTIFACT" \
  ${PANEL_SIZE:+--panel-size "$PANEL_SIZE"} \
  ${BACKEND:+--backend "$BACKEND"} \
  ${NO_AUTO_REDRAFT:+--no-auto-redraft}
```

The loop driver handles: init, round 1 (audience + audit + reviewers), aggregate, convergence check, editor redraft on non-convergence, repeat until converged or `max_rounds` hit.

Pipe stderr of the loop to the user so progress logs are visible (`[tumble-dry-loop]` prefix).

On completion, show the user:
- `.tumble-dry/<slug>/FINAL.md` — the polished artifact
- `.tumble-dry/<slug>/polish-log.md` — round-by-round summary
- Exit status: 0 = converged, 1 = max_rounds hit, 2 = error

## Requirements

`ANTHROPIC_API_KEY` must be set (or written to `~/.anthropic/api_key`). Tumble-dry dispatches directly to the Anthropic API by default; gastown is opt-in via `dispatch_backend: gastown` in `.tumble-dry.yml`.

If no artifact argument: read from stdin (useful for `pbpaste | /tumble-dry`).

## Notes

- All orchestration logic is in `bin/tumble-dry-loop.cjs`. This slash command is a thin invocation layer.
- For per-step control (run one round, inspect, manually edit, re-run), invoke the loop with `--no-auto-redraft` — it stops after the first aggregate that doesn't converge, leaving you free to edit the artifact and re-invoke to resume.
