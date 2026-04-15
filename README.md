# tumble-dry

**Polish written work through simulated public contact.** Parallel reviewer personas critique in-character, an assumption auditor surfaces hidden premises, a voice-preserving editor redrafts, and the loop runs until reviewers converge.

Works on docs, copy, ads, blogs, markdown decks, financial models, pitch decks, strategy memos, and **code** (any text-based artifact). Office formats (.docx / .pptx / .xlsx / .pdf) coming in v0.5.2.

---

## Two control planes

Tumble-dry runs the same convergence loop two ways. Both share the same
data plane (`bin/tumble-dry.cjs` subcommands) and produce the same
`.tumble-dry/<slug>/` layout, `FINAL.md`, and `polish-log.md`.

### 1. Claude Code-native (preferred)

```
/tumble-dry <artifact>
```

- Inherits your active Claude Code session auth — **no `ANTHROPIC_API_KEY` required**.
- Each agent (audience-inferrer, assumption-auditor, reviewer × N, editor) is
  dispatched as a parallel `Task` subagent in a single assistant turn.
- **Trace-fidelity caveat:** subagent request/response payloads are isolated
  by Claude Code and NOT visible to the orchestrator. CC-path traces record
  brief path, critique path, wall-clock timing, and exit status only —
  not the per-dispatch extended-thinking transcript. If you need full
  reasoning traces (CORE-04), use the headless path below.

### 2. Headless CLI (fallback for CI / scripting)

```
node bin/tumble-dry-loop.cjs <artifact> [--panel-size N] [--no-auto-redraft]
```

- Requires `ANTHROPIC_API_KEY` (env var or `~/.anthropic/api_key`).
- Writes full per-dispatch traces (request + response + extended thinking)
  to `.tumble-dry/<slug>/round-N/traces/` per CORE-04.
- Use this for CI runs, scripted batch polishing, or any environment
  without an interactive Claude Code session.

See `bin/tumble-dry-loop.cjs --help` for the headless flag reference.

---

## Quickstart

```bash
export ANTHROPIC_API_KEY=sk-ant-...            # or write to ~/.anthropic/api_key

git clone https://github.com/laulpogan/tumble-dry.git ~/Source/tumble-dry
cd my-project

cat > .tumble-dry.yml <<'EOF'
voice_refs: [ ~/Source/my-past-writing ]
panel_size: 5
convergence_threshold: 2
max_rounds: 10
EOF

node ~/Source/tumble-dry/bin/tumble-dry-loop.cjs post.md
```

One command. Runs end-to-end: audience inference → assumption audit → reviewer wave → aggregate → editor redraft → repeat until convergence. Outputs `FINAL.md` + `polish-log.md` + per-round history + reasoning traces in `.tumble-dry/<slug>/`. Source file is **never modified**.

## Install

### As a Claude Code plugin

```bash
git clone https://github.com/laulpogan/tumble-dry.git ~/Source/tumble-dry
ln -s ~/Source/tumble-dry ~/.claude/plugins/tumble-dry
# /tumble-dry slash command is now available
```

### As a CLI tool (no plugin)

```bash
git clone https://github.com/laulpogan/tumble-dry.git
./tumble-dry/bin/tumble-dry-loop.cjs post.md
```

### As a git submodule in another repo

```bash
cd my-other-project
git submodule add https://github.com/laulpogan/tumble-dry.git tools/tumble-dry
node tools/tumble-dry/bin/tumble-dry-loop.cjs post.md
```

### Via the SlanchaAi marketplace

```bash
claude plugin marketplace add github:SlanchaAi/skills
claude plugin install tumble-dry@slanchaai
```

## How it works

1. **Audience Inferrer** reads the artifact, proposes 3–6 specific personas (not "a reader" — *"CFO at a mid-market SaaS, 10+ years in finance, skeptical of AI hype after a failed pilot last year"*). Persona library by artifact type seeded into prompt.
2. **Assumption Auditor** surfaces the piece's load-bearing premises — what it takes for granted about its reader, subject, and context.
3. **Reviewers** (N in parallel) critique through their persona's lens, stress-testing the top-3 load-bearing assumptions. Findings tagged `material | minor | nit`. Premise-level problems get a `STRUCTURAL:` flag.
4. **Aggregator** dedupes findings, counts unique material findings, detects persistence across rounds (same finding 2+ rounds → auto-promotes to structural).
5. If ≤ `convergence_threshold` material findings → stop. **Converged**.
6. Otherwise, **Editor** redrafts (extended thinking on by default), constrained by voice excerpts sampled from `voice_refs`. Drift report classifies each sentence as `unchanged | modified | inserted | deleted`.
7. Redraft updates the working copy (source untouched), loop to step 3.

## Dispatch

**Default: direct Anthropic API.** Parallel API calls with prompt caching on the static prefix (artifact + audit + voice excerpts). Fast, cheap, no infrastructure. Reviewers run on Sonnet; audience-inferrer and editor run on Opus.

**Opt-in: gastown polecats.** For GSD-Town users who want each agent in its own tmux session + Claude Code context. Set `dispatch_backend: gastown` in `.tumble-dry.yml`. Slower and more fragile; use only if you have a reason.

## Configuration

`.tumble-dry.yml` in the project root (or `~/.tumble-dry/config.yml` for a global default):

```yaml
voice_refs:                      # paths to your past writing — sampled into editor prompts
  - ~/Source/my-past-writing/

audience_override: null          # optional string; null = infer from artifact
panel_size: 5                    # 3–7 reviewers per round
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

Per-role thinking budget:

```bash
export TUMBLE_DRY_THINK_EDITOR=8000          # raise editor thinking budget
export TUMBLE_DRY_THINK_REVIEWER=2000        # enable reviewer thinking
export TUMBLE_DRY_THINK=0                    # disable thinking globally
```

## Output layout

```
.tumble-dry/<artifact-slug>/
  source.path                   # absolute path to original (read-only, never touched)
  working.md                    # the live working copy
  artifact.path
  history/
    round-0-original.md         # byte-for-byte copy of source at init time
    round-1-input.md            # working.md before editor pass
    round-1-output.md           # working.md after editor pass
    round-2-input.md            ...
  round-1/
    brief-audience.md           brief-auditor.md
    brief-reviewer-<persona>.md brief-editor.md
    audience.md                 assumption-audit.md
    critique-<persona>.md       aggregate.md   aggregate.json
    proposed-redraft.md         redraft-staged.md
    diff.md                     # drift report
    traces/
      <persona>.json            # full request + response per dispatch
      editor.json
      editor.thinking.md        # extended-thinking transcript
  round-2/
    ...
  FINAL.md                      # polished artifact
  polish-log.md                 # round-by-round summary, source path, cp hint
```

## Non-destructive history

Source is **never modified**. On `init`, tumble-dry copies it into `.tumble-dry/<slug>/working.md` and operates on that copy. The original location is recorded in `source.path` for provenance.

Each round produces two history snapshots — `round-N-input.md` (state going into the editor) and `round-N-output.md` (state coming out) — so any version can be reconstructed without re-running the loop. `polish-log.md` includes the source path and a `cp FINAL.md <source>` hint to apply the polished version.

## Reasoning traces

Every dispatch writes a full trace to `round-N/traces/<role>.json`:

- the exact request payload (model, system prompt, user blocks, thinking budget)
- the response broken into typed content blocks (`text`, `thinking`)
- token usage (input, output, cache read, cache creation)
- start/finish timestamps + duration

Extended thinking is enabled for the **editor** by default (4000-token budget — synthesis step, high leverage). Reviewers and audit/audience agents default to no thinking to control cost on parallel calls. Thinking transcripts also dumped as `traces/<role>.thinking.md`.

## Structural vs surface findings

Reviewers distinguish **surface** problems (rewriteable: weak headline, jargon, missing CTA) from **structural** problems (premise-level: the pricing model only works if buyers are irrational; the thesis assumes a market that doesn't exist).

Structural findings are prefixed with `STRUCTURAL:` in the body. The aggregator promotes them to a top-of-doc **⚠ Structural alert** in `aggregate.md`, and auto-promotes any material finding that persists across ≥2 prior rounds (same finding keeps coming back → premise problem, not paragraph problem).

If the loop never converges, the structural alert is the answer: editor rewrites can't fix premise. See [`docs/adversarial-review-process.md`](docs/adversarial-review-process.md) for the source methodology.

## CLI reference

Full autonomous convergence loop:

```bash
node bin/tumble-dry-loop.cjs <artifact> [--panel-size N] [--no-auto-redraft]
```

Data-plane subcommands (for custom orchestration):

```bash
node bin/tumble-dry.cjs init <artifact>
node bin/tumble-dry.cjs brief-audience <slug> <round>
node bin/tumble-dry.cjs brief-auditor <slug> <round>
node bin/tumble-dry.cjs brief-reviewers <slug> <round>         # batched
node bin/tumble-dry.cjs brief-editor <slug> <round>
node bin/tumble-dry.cjs aggregate <slug> <round>               # prints convergence JSON
node bin/tumble-dry.cjs drift <slug> <round> <before> <after>  # classifies sentence changes
node bin/tumble-dry.cjs extract-redraft <slug> <round>
node bin/tumble-dry.cjs finalize <slug>
node bin/tumble-dry.cjs config                                  # print resolved config
```

## Drift metric

The drift report classifies every sentence in the redraft:

- **unchanged** — matches an original sentence at ≥85% token overlap
- **modified** — matches an original at 60-85% (rewritten but recognizable)
- **inserted** — best match to original is <60% (net-new content)
- **deleted** — original sentence with no matching successor

**Drift score** = `modified / (unchanged + modified)` — fraction of _preserved_ sentences that were materially rewritten. Insertions don't inflate the score (filling an empty section is fine). High drift score = editor paraphrasing the author's existing sentences = voice danger.

## When to use this

- **Before publishing.** Substack post, blog essay, landing page, ad copy.
- **Before fundraising.** Pitch deck + financial model. Persona library covers VC / CFO / Layman / Series-A out of the box.
- **Before launch.** Website copy + pricing page against prospect / technical-buyer / non-technical-buyer.
- **Before major pivots.** Strategy doc against skip-level exec / engineer / cross-functional partner / devil's advocate.
- **Before merging non-trivial code.** Pre-PR self-review against staff-eng / security / on-call SRE / new-hire personas. Catches what tests and linters won't (architectural drift, premature abstraction, missing failure mode). Currently treats code as plaintext; v0.6.0 adds language-aware features.
- **After competitive research.** Re-run on positioning vs the new landscape.
- **Quarterly.** Investor update, board deck, OKR memo.

## When NOT to use this

- **Tests + types + linters.** Tumble-dry complements them; it does not replace them. Run them too.
- **Design / UX review.** Use real users.
- **Product decisions.** Use customer interviews.
- **Speed > rigor.** A polish loop is 5–15 minutes per round.

## Repo layout

```
agents/        ← audience-inferrer, assumption-auditor, reviewer, editor (system prompts)
bin/           ← tumble-dry-loop driver + tumble-dry data-plane CLI
commands/      ← /tumble-dry slash command
lib/           ← aggregator, voice sampler, dispatch backends, run-state
docs/          ← supporting docs (adversarial review methodology)
examples/      ← end-to-end runs on real artifacts
personas/      ← persona library + runbook (v0.4.1+)
research/      ← raw research outputs feeding the persona library
marketplace.json   VERSION   LICENSE
```

## Example

See [`examples/dogfood-2026-04-14/`](examples/dogfood-2026-04-14/) for a complete run on a real substack post — all round artifacts, drift reports, the round-1 editor redraft.

## Status

v0.4.0 — Non-destructive history + per-dispatch reasoning traces. Built on v0.3.0's persona libraries + structural-finding detection and v0.2.0's API-first convergence loop with prompt caching.

**Roadmap:**
- **v0.4.2** (this release) — Gastown backend removed; voice now self-defaults to the source's own voice when no `voice_refs` configured; code added as supported artifact type.
- **v0.5.0** — Claude Code-native dispatch: `/tumble-dry` slash command spawns each agent as a parallel `Task` subagent inside your active session. No `ANTHROPIC_API_KEY` required. Inherits your Claude Code session auth. The Node API path stays as the headless / CI fallback.
- **v0.5.1** — Comprehensive persona library + runbook by artifact type and industry, including code-review personas (research in flight).
- **v0.5.2** — Office format ingestion (.docx, .pptx, .xlsx, .pdf via mammoth, SheetJS, OOXML parsing, pdf-parse, pandoc fallback). Source-untouched still applies; FINAL.md ships as markdown.
- **v0.6.0** — Code-aware features: language detection, AST-aware drift, language-specific style anchors (PEP 8, Effective Go, Rust API guidelines), code-review persona library.

## License

MIT — see [LICENSE](LICENSE).
