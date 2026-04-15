# tumble-dry full convergence run — "The Tyranny Of The Real"

A real substack post, polished through 4 review/redraft rounds until reviewers converged.

## Artifact

`tyranny-of-the-real.md` — a 2168-char Substack post from the author's archive. An essay arguing that material reality, not reasoned argument, changes minds during culture wars. In its original form: one good anecdote, three empty section headings, an undeveloped Kulturkampf analogy, a "should" pivot that never lands, a thesis asserted without evidence.

## Setup

- Panel size: 3 (Mariana the policy staffer, Paul the historian, Sol the organizer)
- Voice refs: 20 rotating excerpts from other posts in the author's substack archive
- Convergence threshold: 2 material findings
- max_rounds: 4

## Convergence trajectory

| Round | Material | Minor | Nit | Drift (editor) | Converged |
|-------|----------|-------|-----|----------------|-----------|
| 1     | 9        | 12    | 6   | n/a (round 1 editor = from-scratch expansion) | no |
| 2     | 7        | 12    | 9   | 0.27 (20 modified / 20 inserted / 1 deleted) | no |
| 3     | 3        | 11    | 9   | 0.011 (1 modified / 24 inserted / 0 deleted) | no |
| 4     | **1**    | 15    | 8   | — (no editor needed) | **yes** |

**Monotonic descent:** 9 → 7 → 3 → 1. Every round of editing produced a piece that faced fewer material objections than the one before it.

## Editor discipline across rounds

- **Round 1** editor produced a structural expansion — filled three empty section headings + added evidence, mechanism, and historical detail. 2107 → 7214 chars. This round established the skeleton of a finished piece.
- **Round 2** editor (0.27 drift): surgical. 54 sentences preserved unchanged, 20 paraphrased, 20 new insertions. Addressed 5/7 remaining material findings; flagged the rest as voice conflicts.
- **Round 3** editor (0.011 drift): essentially pure addition. 93 sentences preserved unchanged, only 1 paraphrased, 24 inserted. A single new section ("What this means if you're not already a steward") addressed all remaining organizing-adjacent findings.
- **Round 4**: reviewers signed off without another editor pass. 1 material finding remaining = below threshold = converged.

The drift metric did its job. The v0.1 single-threshold metric would have screamed 63/73 on round 1, terrifying the author. The v0.2 classification showed that most of that was insertion, not rewriting — and drift actually dropped each round as the piece approached its final form.

## What the reviewers did

Each round, three persona-matched reviewers ran in parallel:

- **Mariana Kobayashi** — state-legislature policy staffer. In R1 she demanded mechanism (got economic-retrospective-voting citation in R2). By R4 she granted the full frame: "the piece lands with me."
- **Dr. Paul Henning** — 19th-century Central Europe historian. In R1 he flagged the May Laws flattening; in R2 he caught a factual error the R1 editor introduced (Centre Party founding date); in R3 he challenged the one-directionality of the analogy. By R4 the historical scaffolding held.
- **Sol Jiménez** — tenant organizer. In R1 she demanded concrete "action" naming. R2-R3 editors progressively added a canvass/union/meeting vocabulary. In R4 she raised the final material finding (action-mode disambiguation), but on its own it fell below the convergence threshold.

## Execution notes

Dispatched via Claude Code Task-tool subagents (not gastown, not direct API). Each reviewer ran as an isolated subagent with the brief as its full prompt. Parallel waves of 3 completed in ~75s each. Editor passes took 60-120s.

**Total wall-clock:** roughly 10 minutes for the full 4-round convergence. For comparison, the initial round-1 via gastown polecats alone took ~20 minutes.

## Artifacts

- `tyranny-of-the-real.md` — original (2168 chars)
- `run/FINAL.md` — converged output (12594 chars)
- `run/polish-log.md` — round summary table
- `run/round-N/` — per-round audience, audit, critiques, aggregate, redraft, drift report

## Lessons

1. **Convergence is real.** Three independent persona reviewers, each with specific hiring jobs and bounce triggers, signed off on the piece after 4 rounds. The piece wasn't gaslit into submission; reviewers kept finding new issues through round 3 and only dropped them when the piece genuinely addressed them.
2. **Editor discipline improves with rounds.** Round 1 was necessarily transformative (empty sections had to be written). Rounds 2 and 3 got progressively more surgical as the piece approached its final form.
3. **Drift metric is now legible.** Score 0.011 in round 3 = "editor barely touched existing sentences, just added new ones" = exactly what a polish pass should look like.
4. **Task-tool dispatch > gastown for this workload.** 10-min full convergence vs ~20 min for a single round of gastown. No cold boot, no session contention.
