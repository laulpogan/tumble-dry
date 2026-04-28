---
description: Talk to a real person about something you're about to ship — anchored on their public writings. Separate from /tumble-dry: this is a 1:1 dialogue tool, not a polishing pipeline.
argument-hint: <persona-slug> [--review <target>] | anonymize <slug> [--panel <name>] [--output <path>] | --list | --resume <session-slug> | --dry-run | --model <id>
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
- **Anonymize for `/tumble-dry` library:** `/mask anonymize <slug> [--panel <name>]` — converts a real-people brief into a `personas/library.md`-shaped panel entry with identity stripped. Emits the entry plus an "Anonymization notes" block listing every fingerprint scrubbed, so the maintainer can audit before pasting.
- **List personas:** `/mask --list`
- **Dry-run:** `/mask <slug> --review <target> --dry-run` — prints prompt sizes, doesn't call the model.

## Examples

```
/mask template                                  # REPL with the fictional template persona
/mask template --review ./pitch-deck.pptx       # one-shot file
/mask <your-local-slug> --review https://my-landing.com/   # one-shot URL with a local brief
/mask <your-local-slug> --review ./brief.md --output ./reviews/
/mask anonymize <your-local-slug> --panel "Series A pitch deck"  # strip identity → library entry
/mask --list
```

## Personas

Real-people briefs live at `personas/real-people/<slug>.md`. **Briefs of named real persons are local-only by convention** (enforced by `.gitignore`) — see `personas/real-people/README.md` for the privacy posture. The repo ships only `TEMPLATE.md` (slug `template`, fictional). Copy it to `<your-slug>.md` to build a real brief locally.

## Output

- One-shot reviews: `~/.tumble-dry/mask-reviews/<slug>-<target>-<date>.md`
- REPL transcripts: `~/.tumble-dry/mask-sessions/mask-<persona>-<date>-<time>.md` (auto-saves every turn)

## Ethics

- Internal-use only. Never publish or attribute output as if the named person said it.
- Briefs are stress tests, not verdicts (per arXiv 2509.14543 — surface style mimics well, deep opinions less so).
- Honor opt-outs in `personas/real-people/opt-outs.md`.
