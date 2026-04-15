# tumble-dry — Design Spec

**Date:** 2026-04-14
**Status:** Approved for implementation planning
**Author:** Paul Logan (w/ Claude)

## Purpose

tumble-dry is a GSD plugin that polishes content (docs, copy, ads, blogs, markdown decks) by simulating contact with the intended public. Parallel reviewer personas critique; an assumption auditor surfaces hidden premises; an optional editor agent redrafts between rounds, constrained by the author's voice samples. The loop runs until reviewers converge or a safety cap fires.

The core insight: simulated public contact is more valuable than generic critique. A deck for NVIDIA execs should not be reviewed by the same panel as a personal blog post. tumble-dry derives the panel from the artifact itself so every run feels specific.

## Scope

**In scope for v1:**
- Markdown and plain-text content: docs, blogs, copy, ads, markdown-based decks (reveal.js, marp)
- Filepath input mode and paste input mode (for short-form copy)
- Artifact-derived personas (with user override)
- Assumption auditor as a distinct pipeline stage
- Editor agent (on-demand, per-round user choice)
- Voice preservation via per-project voice-reference paths

**Out of scope for v1:**
- PPTX, Keynote, PDF visual decks (deferred — text extraction only gives reviewers half the artifact)
- Images, video, audio
- Code review (explicit v2)
- Publishing integration (no CMS, Twitter, etc. push)
- Multi-artifact campaign review (one piece per run)

## Architecture

### The round loop

Each round is a complete review cycle. Round 1 includes one-time setup steps (audience inference, assumption audit). Later rounds skip these unless the user passes `--reaudit`.

```
round N:
  1. [round 1 only] Audience Inferrer reads the artifact → proposes a panel of 3–6 personas
  2. [round 1 only] Assumption Auditor extracts load-bearing claims/premises → writes assumption-audit.md
  3. N Reviewer polecats run IN PARALLEL (one per persona), each receives:
       - the current draft
       - the assumption audit
       - their persona brief
       - voice refs (for context only — they review content, not style)
     Each produces a critique with findings tagged {material | minor | nit}.
  4. Aggregator dedupes findings across reviewers, counts unique material findings.
  5. Convergence check:
       - material_count ≤ convergence_threshold → stop, produce FINAL.md
       - else → prompt user: [auto-redraft | manual | stop]
  6. If auto-redraft: Editor polecat reads critiques + current draft + voice refs → produces proposed-redraft.md + diff.md. User confirms → becomes round N+1's input.
  7. If manual: user edits the file, re-runs /tumble-dry. Loop continues with round N+1.
```

### Components

Each component is a discrete agent with a single purpose. All long-running agents run as gastown polecats (separate tmux sessions, independent context windows, process-isolated parallelism).

| Component | Runs | Where | Purpose |
|-----------|------|-------|---------|
| **Audience Inferrer** | Round 1 only | 1 polecat | Read artifact → propose persona panel + audience description |
| **Assumption Auditor** | Round 1 only (or on `--reaudit`) | 1 polecat | Extract load-bearing claims and implicit premises |
| **Reviewer** | Every round | N polecats in parallel (3–6) | Critique through assigned persona's lens |
| **Aggregator** | Every round | Inline (main process) | Deduplicate findings, compute convergence |
| **Editor** | On-demand per round | 1 polecat | Redraft artifact, constrained by voice refs |

### Gastown dispatch

Each polecat gets a bead. Bead mapping recorded in `.tumble-dry/<slug>/round-N/beads.json` for post-hoc inspection (per GSD-Town convention).

Dispatch pattern per round:
- Round 1, phase 1: audience-inferrer + assumption-auditor (2 parallel)
- Every round, phase 2: reviewer-1 .. reviewer-N (N parallel, N from panel_size)
- Every round, phase 3: aggregator (inline)
- Optional phase 4: editor (1 polecat)

## Configuration

`.tumble-dry.yml` in the artifact's project root:

```yaml
# Paths to reference work that defines the author's voice.
# Sampled into Editor prompts at 3–5 excerpts per run.
voice_refs:
  - ~/Source/claude-workspace-laulpogan-finetuning-corpus/longform/

# Override the Audience Inferrer's panel with an explicit audience description.
# null = let the inferrer decide.
audience_override: null

# Number of reviewer personas per round. 3–6 allowed; 5 default.
panel_size: 5

# Convergence gate: if unique material findings across panel ≤ this, stop.
convergence_threshold: 2

# Safety cap on total rounds. Loop cannot exceed this.
max_rounds: 10

# Future: path or endpoint for fine-tuned voice model. null = use generic + voice_refs.
fine_tune_model_path: null
```

If no `.tumble-dry.yml` exists, tumble-dry falls back to `~/.tumble-dry/config.yml` (global default), then to built-in defaults.

## Output layout

All run artifacts land under `.tumble-dry/<artifact-slug>/`:

```
.tumble-dry/<artifact-slug>/
  round-1/
    audience.md             # persona panel + audience description
    assumption-audit.md     # round 1 only (unless --reaudit)
    critique-<persona>.md   # one per reviewer
    aggregate.md            # deduped findings + convergence state
    proposed-redraft.md     # if editor ran
    diff.md                 # if editor ran; flags sentences rewritten >40%
    beads.json              # gastown bead mapping for this round
  round-2/
    ...
  FINAL.md                  # converged draft
  polish-log.md             # round-by-round summary: findings resolved, voice-drift signals
```

`FINAL.md` is only written once convergence fires or the user explicitly stops the loop. It is the polished output plus a frontmatter block summarizing rounds, total findings resolved, and voice-drift indicators.

## Convergence logic

**Material finding** = a reviewer explicitly tags a critique item `severity: material`. Reviewers are prompted to reserve `material` for findings that would cause the piece to fail its purpose with the target audience. Everything else is `minor` or `nit`.

**Deduplication.** The Aggregator runs an LLM-judge pass that groups semantically similar findings across reviewers. "The opening buries the lede" from Reviewer-A and "The hook doesn't land until paragraph 3" from Reviewer-B collapse into one unique finding.

**Convergence gate.** After dedup, if the unique material finding count ≤ `convergence_threshold` (default 2), the loop stops and `FINAL.md` is written. Minor and nit findings never block convergence but are logged in `polish-log.md` for transparency.

## Voice guardrail

The Editor agent's prompt receives:
- Current draft
- Aggregated critiques (material + minor, nits excluded)
- 3–5 rotating excerpts sampled from `voice_refs`
- A hard instruction:
  > Address critiques surgically. Preserve sentence-level voice. If a critique demands a rewrite that would flatten voice, note it in your output but do not execute it — flag it for the user.

**`diff.md` voice-drift check.** The Editor's diff output flags every sentence where token-level overlap with the input sentence is below 60% (i.e., the sentence was rewritten by more than 40%). These flags are the human's signal to audit voice drift. If all rewrites are above 60% overlap, the voice guardrail held.

**v2 upgrade path.** Once the user's fine-tuned Qwen3-32B voice model (see `gsd_town_project.md`, `finetuning_corpus.md`) is production-ready, `fine_tune_model_path` swaps the Editor's base model. The voice-ref prompting becomes a belt-and-suspenders redundancy layer rather than the primary voice-preservation mechanism.

## Plugin structure

```
~/.claude/plugins/tumble-dry/
  tumble-dry/
    VERSION
    commands/
      tumble-dry.md              # /tumble-dry slash command + workflow doc
    agents/
      audience-inferrer.md       # agent definition
      assumption-auditor.md
      reviewer.md                # templated; persona injected at dispatch
      editor.md
    bin/
      tumble-dry.cjs             # entry: aggregator, convergence, gastown dispatch glue
    lib/
      dispatch.cjs               # wraps ~/.claude/get-shit-done/bin/lib/gastown.sh
      aggregator.cjs             # dedup + convergence logic
      config.cjs                 # .tumble-dry.yml loader + defaults
      voice.cjs                  # voice-ref sampling + drift check
    README.md
  marketplace.json               # plugin metadata
```

## Slash command surface

| Invocation | Behavior |
|-----------|----------|
| `/tumble-dry <filepath>` | Standard run on a file |
| `/tumble-dry --paste` | Opens $EDITOR for short-form content (copy, ads, headlines) |
| `/tumble-dry <filepath> --audience "SaaS CFOs"` | Override Audience Inferrer |
| `/tumble-dry <filepath> --auto-redraft` | Skip user-prompt between rounds; editor runs automatically |
| `/tumble-dry <filepath> --reaudit` | Force Assumption Auditor to re-run on new round |
| `/tumble-dry <filepath> --panel-size 6` | Override panel_size for this run |

## CLI wrapper (v2, deferred)

After the plugin proves out on the author's own content for 2+ weeks of dogfooding, a standalone CLI (`npx tumble-dry <file>`) wraps the same core agents. The CLI becomes the distribution vehicle for non-GSD users and aligns with LaunchFarm's "launch itself" dogfood principle once LaunchFarm ships.

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| **Voice drift** — editor flattens the author's style into generic LLM prose | `voice_refs` excerpts in prompt; diff.md flags >40% rewrites; future fine-tune swap |
| **Runaway token spend** | Hard cap `max_rounds: 10`; per-run token budget warning if a round exceeds 200K input tokens |
| **Shallow personas** — Audience Inferrer produces flat, generic panel | Round-1 audience.md shown to user immediately; `--audience` override + re-run cheap |
| **Nit-pile** — reviewers flood minor findings that aren't load-bearing | Severity tags; convergence gates on `material` only; nits logged but ignored for stop decision |
| **Gastown unavailable** — polecats can't dispatch | Fallback to sequential in-process reviewers (slower but functional); surface warning |

## Success criteria

v1 ships when:
1. `/tumble-dry <markdown-file>` runs end-to-end on a real blog post, producing a converged FINAL.md within 5 rounds.
2. Voice-drift flags correctly highlight the sentences where the Editor rewrote the author's voice.
3. Audience Inferrer produces a panel that feels specific to the artifact (not generic "writer / editor / reader").
4. Assumption Auditor surfaces at least one non-obvious load-bearing assumption on a test piece.
5. Convergence gate fires correctly — does not stop prematurely on material findings, does not run forever on nits.
6. Gastown polecats dispatch in parallel; bead mapping recorded per round.

## Next steps

1. User reviews this spec.
2. On approval, invoke `writing-plans` skill to decompose into an implementation plan.
3. Implementation plan executes phase-by-phase via GSD (`/gsd-plan-phase` + `/gsd-execute-phase`), leveraging gastown for polecat dispatch per the GSD-Town integration already wired.
