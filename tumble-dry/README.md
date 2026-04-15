# tumble-dry

**Polish content through simulated public contact.** Parallel reviewer personas critique in-character, an assumption auditor surfaces hidden premises, a voice-preserving editor redrafts, and the loop runs until reviewers converge.

Works on docs, copy, ads, blogs, markdown decks.

## Quickstart

```bash
export ANTHROPIC_API_KEY=sk-ant-...            # or write to ~/.anthropic/api_key
cd my-project
cat > .tumble-dry.yml <<'EOF'
voice_refs: [ ~/Source/my-past-writing ]
panel_size: 5
convergence_threshold: 2
max_rounds: 10
EOF

node ~/.claude/plugins/tumble-dry/tumble-dry/bin/tumble-dry-loop.cjs post.md
```

One command. Runs end-to-end: audience inference → assumption audit → reviewer wave → aggregate → editor redraft → repeat until convergence. Outputs `FINAL.md` + `polish-log.md` in `.tumble-dry/<slug>/`.

## How it works

1. **Audience Inferrer** reads the artifact, proposes 3–6 specific personas (not "a reader" — *"CFO at a mid-market SaaS, 10+ years in finance, skeptical of AI hype after a failed pilot last year"*).
2. **Assumption Auditor** surfaces the piece's load-bearing premises — what it takes for granted about its reader, subject, and context.
3. **Reviewers** (N in parallel) critique through their persona's lens, stress-testing the top-3 load-bearing assumptions. Findings tagged `material | minor | nit`.
4. **Aggregator** dedupes findings, counts unique material findings across the panel.
5. If ≤ `convergence_threshold` material findings → stop. **Converged**.
6. Otherwise, **Editor** redrafts, constrained by voice excerpts sampled from `voice_refs`. Drift report classifies each sentence as `unchanged | modified | inserted | deleted`.
7. Redraft replaces the artifact, loop to step 3.

## Dispatch

**Default: direct Anthropic API.** Parallel API calls with prompt caching on the static prefix (artifact + audit + voice excerpts). Fast, cheap, no infrastructure. Reviewers run on Sonnet; audience-inferrer and editor run on Opus.

**Opt-in: gastown polecats.** For GSD-Town users who want each agent in its own tmux session + Claude Code context. Set `dispatch_backend: gastown` in `.tumble-dry.yml`. Slower and more fragile; use only if you have a reason.

## Configuration

`.tumble-dry.yml` in the project root (or `~/.tumble-dry/config.yml` for a global default):

```yaml
# Paths to your past writing. Excerpts sampled into Editor prompts.
voice_refs:
  - ~/Source/my-past-writing/

audience_override: null          # optional string; null = infer from artifact
panel_size: 5                    # 3–6 reviewers per round
convergence_threshold: 2         # ≤ N material findings → converged
max_rounds: 10                   # absolute safety cap
fine_tune_model_path: null       # v2 — swap in your fine-tuned voice model

dispatch_backend: api            # 'api' (default) | 'gastown' (opt-in)
```

Per-role model override via env:

```bash
export TUMBLE_DRY_MODEL=claude-opus-4-6                    # all roles
export TUMBLE_DRY_MODEL_REVIEWER=claude-sonnet-4-6         # just reviewers
export TUMBLE_DRY_MODEL_EDITOR=claude-opus-4-6             # just editor
```

## Output layout

```
.tumble-dry/<artifact-slug>/
  round-1/
    brief-audience.md           brief-auditor.md
    brief-reviewer-<persona>.md brief-editor.md
    audience.md                 assumption-audit.md
    critique-<persona>.md       aggregate.md
    proposed-redraft.md         redraft-staged.md
    diff.md                     # drift report
  round-2/
    ...
  FINAL.md                      # polished artifact
  polish-log.md                 # round-by-round summary
```

## CLI reference

Full autonomous convergence loop:

```bash
tumble-dry-loop <artifact> [--backend api|gastown] [--panel-size N] [--no-auto-redraft]
```

Data-plane subcommands (for custom orchestration):

```bash
tumble-dry init <artifact>
tumble-dry brief-audience <slug> <round>
tumble-dry brief-auditor <slug> <round>
tumble-dry brief-reviewers <slug> <round>         # batched — all personas in one call
tumble-dry brief-editor <slug> <round>
tumble-dry aggregate <slug> <round>               # prints convergence JSON
tumble-dry drift <slug> <round> <before> <after>  # classifies sentence changes
tumble-dry extract-redraft <slug> <round>
tumble-dry finalize <slug>
tumble-dry config                                  # print resolved config
```

## Drift metric

The drift report classifies every sentence in the redraft as:

- **unchanged** — matches an original sentence at ≥85% token overlap
- **modified** — matches an original at 60-85% (rewritten but recognizable)
- **inserted** — best match to original is <60% (net-new content)
- **deleted** — original sentence with no matching successor

**Drift score** = `modified / (unchanged + modified)` — fraction of _preserved_ sentences that were materially rewritten. Insertions (e.g., filling an empty section) don't inflate the score, which was a flaw in the v0.1 single-threshold metric.

A healthy polish run has low drift score (<0.25) + any number of insertions. High drift score means the editor is paraphrasing the author's existing sentences, which is voice danger.

## Installation

Clone + symlink into Claude Code's plugins dir:

```bash
git clone <this-repo> ~/Source/tumble-dry
ln -s ~/Source/tumble-dry ~/.claude/plugins/tumble-dry
```

Or invoke the CLI directly from the repo — no install needed.

## Example

See `examples/dogfood-2026-04-14/` for a complete run on a real substack post, including all round artifacts and the round-1 editor redraft.

## When to use this

- **Before publishing.** Substack post, blog essay, landing page, ad copy.
- **Before fundraising.** Pitch deck + financial model. Persona library covers VC / CFO / Layman / Series-A out of the box (see `audience-inferrer.md`).
- **Before launch.** Website copy + pricing page, against the prospect / technical-buyer / non-technical-buyer matrix.
- **Before major pivots.** Strategy doc against skip-level exec / engineer / cross-functional partner / devil's advocate.
- **After competitive research.** Re-run on positioning vs the new landscape.
- **Quarterly.** Investor update, board deck, OKR memo.

## When NOT to use this

- **Code review.** Use tests, types, linters. Personas can't read git diffs reliably.
- **Design / UX review.** Use real users. Personas guess; users behave.
- **Product decisions.** Use customer interviews. Adversarial fiction ≠ customer truth.
- **Speed > rigor.** A polish loop is 5–15 minutes per round. If you need to ship in an hour, just ship.

## Structural vs surface findings

The reviewer agent now distinguishes **surface** problems (rewriteable: weak headline, jargon, missing CTA) from **structural** problems (premise-level: the pricing model only works if buyers are irrational; the thesis assumes a market that doesn't exist).

When a finding is structural, the reviewer prefixes the body with `STRUCTURAL:`. The aggregator promotes those to a top-of-doc **⚠ Structural alert** in `aggregate.md`, and also auto-promotes any material finding that persists across ≥2 prior rounds (same finding keeps coming back → premise problem, not paragraph problem).

If the loop never converges, the structural alert is the answer: editor rewrites can't fix premise. Read [`docs/adversarial-review-process.md`](../docs/adversarial-review-process.md) for the source methodology this is based on, including the lessons-learned that drove these defaults.

## Status

v0.3.0 — Persona libraries by artifact type, structural-vs-surface finding tags, persistence detection across rounds, scope guardrails. Built on v0.2.0 API-first loop.
