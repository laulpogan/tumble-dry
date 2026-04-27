---
description: Talk to a real person about something you're about to ship — anchored on their public writings. Separate from /tumble-dry: this is a 1:1 dialogue tool, not a polishing pipeline.
argument-hint: <persona-slug> [--review <target>] [--output <path>] [--model <id>] [--dry-run] | --list | --resume <session-slug>
---

# /mask

Live conversation (or one-shot critique) with a real, named, public person about an artifact (deck, page, plan, code).

This is **not** a stage in `/tumble-dry`'s polish loop. Mask is people-facing dialogue; tumble-dry is batch convergence. They share a persona library and otherwise diverge.

Spec: [`docs/superpowers/specs/2026-04-27-the-mask-game.md`](../docs/superpowers/specs/2026-04-27-the-mask-game.md)

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

## Dispatch

`/mask` is a thin shell over `bin/mask`. Pass `$ARGUMENTS` straight through.

```bash
node "$TD_HOME/bin/mask" $ARGUMENTS
```

## Modes

- **REPL (default):** `/mask <slug>` — opens an interactive conversation with the persona. Supports `:paste <path>`, `:read <url>`, `:context`, `:save [path]`, `:exit`. (`:switch`, `:challenge`, `:reset`, `--resume` deferred to a follow-up.)
- **One-shot critique:** `/mask <slug> --review <target>` — single-pass structured critique. `<target>` can be a file path, directory, or URL.
- **List personas:** `/mask --list`
- **Dry-run:** `/mask <slug> --review <target> --dry-run` — prints prompt sizes, doesn't call the model.

## Examples

```
/mask casado                                    # REPL
/mask casado --review ./pitch-deck.pptx         # one-shot file
/mask willison --review https://my-landing.com/ # one-shot URL
/mask casado --review ./brief.md --output ./reviews/
/mask --list
```

## Personas

Real-person briefs live at `personas/real-people/<slug>.md`. Two ship in v1: `casado` (Martin Casado, AI infra), `willison` (Simon Willison, LLM dev tools). Add more by following the schema in `personas/real-people/README.md`.

## Output

- One-shot reviews: `~/.tumble-dry/mask-reviews/<slug>-<target>-<date>.md`
- REPL transcripts: `~/.tumble-dry/mask-sessions/mask-<persona>-<date>-<time>.md` (auto-saves every turn)

## Ethics

- Internal-use only. Never publish or attribute output as if the named person said it.
- Briefs are stress tests, not verdicts (per arXiv 2509.14543 — surface style mimics well, deep opinions less so).
- Honor opt-outs in `personas/real-people/opt-outs.md`.
