# tumble-dry

**Polish written work and code through simulated public contact.** Parallel reviewer personas critique in-character, an assumption auditor surfaces hidden premises, a voice- or style-anchored editor redrafts, and the loop runs until reviewers converge.

Works across four artifact families: **prose** (blog posts, essays, memos, ad copy, landing pages), **office formats** (.docx, .pptx, .xlsx, .pdf — projected to markdown for review), **code** (source files and directories — AST-aware drift, language-specific style anchors, `verify_cmd` gate), and **decks** (markdown decks natively; .pptx via the office-format loader).

> **v0.9.0 (2026-04-15):** HARNESS-ONLY release. All Anthropic API key logic removed. Product runs entirely through Claude Code session auth. Agent dispatch uses plain `Agent(prompt=...)` with no custom subagent_type. `install.sh` symlinks the command. `.claude-plugin/` removed (CC never discovered it). See [CHANGELOG.md](CHANGELOG.md).

## Install

```bash
git clone https://github.com/laulpogan/tumble-dry.git ~/Source/tumble-dry
~/Source/tumble-dry/install.sh
# Done. /tumble-dry is now available in Claude Code.
```

## Use

```
/tumble-dry post.md                    # single file
/tumble-dry "site/copy/*.md"           # glob — polishes every match as a batch
/tumble-dry docs/                      # directory — recursive walk
/tumble-dry --dry-run pitch-deck.pptx  # preview cost before committing
/tumble-dry status                     # list runs, flag orphans
/tumble-dry resume <slug>              # resume a killed run
/tumble-dry spec.docx --apply          # regenerate source binary after polish
```

On first run in a fresh repo with no `.tumble-dry.yml`, voice refs are inferred from your recent prose commits:

```
[tumble-dry] first run — using inferred defaults: voice_refs=git_history(N=5 commits, K=3 excerpts)
[tumble-dry] initialized (kind=single slug=post)
[tumble-dry] round 1 — reviewers 5/5 returned
[tumble-dry] round 1 — aggregate (material=2 minor=4 drift=0.12)
[tumble-dry] round 2 — reviewers 5/5 returned
[tumble-dry] round 2 — CONVERGED (material=0, drift=0.18)
=================== REPORT ===================
# tumble-dry Report — post
Converged at round 2 after 2 round(s).
...
```

Dump the inferred config for editing:

```bash
node ~/Source/tumble-dry/bin/tumble-dry.cjs config init
# writes .tumble-dry.yml with panel_size, convergence_threshold, drift_threshold, max_rounds
```

---

## How it works

1. **Audience Inferrer** reads the artifact, proposes 3-6 specific personas (not "a reader" — *"CFO at a mid-market SaaS, 10+ years in finance, skeptical of AI hype after a failed pilot last year"*). Persona library by artifact type seeded into prompt.
2. **Assumption Auditor** surfaces the piece's load-bearing premises — what it takes for granted about its reader, subject, and context.
3. **Reviewers** (N in parallel) critique through their persona's lens, stress-testing the top-3 load-bearing assumptions. Findings tagged `material | minor | nit`. Premise-level problems get a `STRUCTURAL:` flag.
4. **Aggregator** dedupes findings, counts unique material findings, detects persistence across rounds (same finding 2+ rounds -> auto-promotes to structural).
5. If <= `convergence_threshold` material findings -> stop. **Converged**.
6. Otherwise, **Editor** redrafts, constrained by voice excerpts sampled from `voice_refs`. Drift report classifies each sentence as `unchanged | modified | inserted | deleted`.
7. Redraft updates the working copy (source untouched), loop to step 3.

## Dispatch

The `/tumble-dry` slash command reads each agent's system prompt from `agents/*.md`, embeds it in the brief, and dispatches via `Agent(prompt=...)`. Multiple Agent calls in one assistant turn run concurrently — all N reviewers fan out in parallel. No plugin registry, no custom subagent types, no API key.

For CI/scripting without an interactive Claude Code session:

```bash
claude -p '/tumble-dry <artifact>'
```

## Configuration

`.tumble-dry.yml` in the project root (or `~/.tumble-dry/config.yml` for a global default):

```yaml
voice_refs:                      # paths to your past writing — sampled into editor prompts
  - ~/Source/my-past-writing/

audience_override: null          # optional string; null = infer from artifact
panel_size: 5                    # 3-7 reviewers per round
convergence_threshold: 2         # <= N material findings -> converged
max_rounds: 10                   # absolute safety cap
fine_tune_model_path: null       # v2 — swap in your fine-tuned voice model
```

## Office formats

Tumble-dry polishes `.md` / `.markdown` / `.txt` natively. Office formats (`.docx`, `.pptx`, `.xlsx`, `.pdf`) are supported via optional dependencies:

```bash
cd ~/Source/tumble-dry
npm install       # installs mammoth, turndown, officeparser, unpdf (optionalDependencies)
```

Markdown-only users can skip `npm install` entirely.

| Extension            | Loader                                        | Boundary markers      |
| -------------------- | --------------------------------------------- | --------------------- |
| `.md` `.markdown` `.txt` | identity (no deps)                        | none                  |
| `.docx`              | mammoth -> HTML -> turndown                   | headings preserved    |
| `.pptx`              | officeparser                                  | `<!-- slide:N -->`    |
| `.xlsx`              | officeparser                                  | `<!-- sheet:Name -->` |
| `.pdf`               | officeparser primary, unpdf fallback          | `<!-- page:N -->`     |
| anything else        | pandoc fallback (if on `$PATH`)               | pandoc-dependent      |

## Code mode

```bash
/tumble-dry path/to/module.js
/tumble-dry path/to/project
```

- **Reviewer briefs** carry a `language:` header, skip voice excerpts. Default panel swaps the layman for **Yuki Tanaka (new-hire-in-6-months)**.
- **Editor** uses `agents/editor-code.md` with language-specific style anchors (PEP 8, Effective Go, Rust API Guidelines, JS Standard).
- **Drift report** is AST-aware via `web-tree-sitter`. Signature changes on public API are permanent STRUCTURAL flags.
- **`verify_cmd` gate** runs `npm test -- --run` (or custom command from `.tumble-dry.yml`) before applying redrafts.

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
  round-1/
    brief-audience.md           brief-auditor.md
    brief-reviewer-<persona>.md brief-editor.md
    audience.md                 assumption-audit.md
    critique-<persona>.md       aggregate.md   aggregate.json
    proposed-redraft.md         redraft-staged.md
    diff.md                     # drift report
  round-2/
    ...
  FINAL.md                      # polished artifact
  polish-log.md                 # round-by-round summary
```

## Non-destructive history

Source is **never modified**. On `init`, tumble-dry copies it into `.tumble-dry/<slug>/working.md` and operates on that copy. Each round produces two history snapshots (`round-N-input.md`, `round-N-output.md`) so any version can be reconstructed without re-running.

## CLI reference (data-plane)

```bash
node bin/tumble-dry.cjs init <artifact>
node bin/tumble-dry.cjs brief-audience <slug> <round>
node bin/tumble-dry.cjs brief-auditor <slug> <round>
node bin/tumble-dry.cjs brief-reviewers <slug> <round>
node bin/tumble-dry.cjs brief-editor <slug> <round>
node bin/tumble-dry.cjs aggregate <slug> <round>
node bin/tumble-dry.cjs drift <slug> <round> <before> <after>
node bin/tumble-dry.cjs extract-redraft <slug> <round>
node bin/tumble-dry.cjs finalize <slug> [--apply]
node bin/tumble-dry.cjs config
node bin/tumble-dry.cjs status
node bin/tumble-dry.cjs resume <slug>
node bin/tumble-dry.cjs dry-run <artifact> [--panel-size N]
```

## Repo layout

```
agents/        <- audience-inferrer, assumption-auditor, reviewer, editor (system prompts, read at dispatch time)
bin/           <- tumble-dry data-plane CLI
commands/      <- /tumble-dry slash command
lib/           <- aggregator, voice sampler, run-state, pricing, status, report
docs/          <- supporting docs (adversarial review methodology)
personas/      <- persona library + runbook
install.sh     <- symlinks /tumble-dry into ~/.claude/commands/
marketplace.json   VERSION   LICENSE
```

## When to use this

- **Before publishing.** Substack post, blog essay, landing page, ad copy.
- **Before fundraising.** Pitch deck + financial model.
- **Before launch.** Website copy + pricing page.
- **Before merging non-trivial code.** Pre-PR self-review against staff-eng / security / SRE / new-hire personas.
- **After competitive research.** Re-run on positioning vs the new landscape.

## When NOT to use this

- **Tests + types + linters.** Tumble-dry complements them; it does not replace them.
- **Design / UX review.** Use real users.
- **Product decisions.** Use customer interviews.

## License

MIT — see [LICENSE](LICENSE).
