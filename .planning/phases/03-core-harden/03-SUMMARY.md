---
phase: 3
plan: core-harden
subsystem: core
tags: [drift-gate, dedup, brief-seeding, trace-retention, gitignore]
requirements: [HARDEN-01, HARDEN-02, HARDEN-03, HARDEN-04, HARDEN-05, HARDEN-06]
key-files:
  created:
    - lib/trace-retention.cjs
    - tests/harden.test.cjs
  modified:
    - lib/voice.cjs
    - lib/aggregator.cjs
    - lib/reviewer-brief.cjs
    - lib/run-state.cjs
    - bin/tumble-dry.cjs
    - bin/tumble-dry-loop.cjs
    - .planning/REQUIREMENTS.md
completed: 2026-04-15
---

# Phase 3 Plan 03: Core Hardening Summary

**One-liner:** Six cross-cutting hardening items (drift gate, dedup upgrade, round-N brief seeding, trace retention, gitignore bootstrap) that stop the editor from reward-hacking convergence, improve finding clustering on paraphrase, and keep disk + privacy sane across long runs.

## What landed

### HARDEN-01 — Drift gate BLOCKS convergence
- `bin/tumble-dry-loop.cjs::aggregateAndCheck` now computes `voiceDriftReport(round-0-original, working.md)` after aggregation.
- If `content_drift > config.drift_threshold` (default 0.40), `converged` is forced `false` regardless of material count.
- `aggregate.json` records `drift_blocked`, `content_drift`, `structural_drift`.
- `aggregate.md` appends `## ⚠ Drift block` section with threshold, current score, and a next-round seed instruction telling persona reviewers to preserve source phrasing.

### HARDEN-02 — Drift split: structural vs content
- `lib/voice.cjs` exports `stripMarkdownStructure()` (removes ATX headings, list markers, fences, blockquotes, HTML comments, table pipes) and `structuralDriftScore()`.
- `voiceDriftReport()` return object now has `structural_drift` + `content_drift`; `drift_score` kept for back-compat (= content_drift).
- Heading-depth, list-rewrap, and boundary-marker-only changes now show up on `structural_drift` without polluting the content gate.
- Raw-byte char-bigram Dice (new `rawBigramDice`) used so that `##` vs `#` registers a delta (the alphanumeric-normalized `bigramSimilarity` hides it).

### HARDEN-03 — Aggregator dedup upgrade
- `lib/aggregator.cjs::dedupFindings` replaced token-Jaccard with char-bigram Dice on cluster-key text. Dice ≥ 0.50 ≈ Jaccard ≈ 0.33 — paraphrase-robust.
- Added `extractMarkers()` pulling `<!-- slide:N -->` / `<!-- sheet:Name -->` / `<!-- page:N -->` anchors (emitted by FORMAT-02 loaders) from each finding.
- Findings sharing a marker cluster transitively even if summaries differ ("revenue line off" + "legend missing" both anchored to `slide:5` collapse).
- `aggregateJson` now persists `markers` + `resolved: false` per cluster.

### HARDEN-04 — Round-N reviewer brief seeding
- `lib/reviewer-brief.cjs::buildReviewerBrief` accepts `previousAggregateJson` or auto-loads from `runDir/round-(N-1)/aggregate.json`.
- When `roundNumber > 1`, injects `## Open material findings from round N-1` listing unresolved material summaries with STRUCTURAL tag preserved.
- Reviewer instruction: "explicitly check whether the editor addressed these. If still material, repeat the finding. If resolved, omit."
- `bin/tumble-dry.cjs brief-reviewers` passes `runDir` so auto-load works with no orchestrator change.

### HARDEN-05 — Trace retention
- New `lib/trace-retention.cjs::pruneTraces(runDir, currentRound, {trace_full_retention: 3})`.
- For rounds older than `currentRound - retention + 1`, gzips `traces/*.json` + `traces/*.thinking.md` in place (`.gz` suffix), unlinks originals.
- Writes `traces/INDEX.md` per round (archived or full) listing file states + sizes.
- Called from `bin/tumble-dry-loop.cjs` main loop after `aggregateAndCheck`.

### HARDEN-06 — `.gitignore` bootstrap
- `lib/run-state.cjs::initRun` detects "first init" via absence of `.tumble-dry/` dir.
- On first init, calls new `ensureGitignore(cwd)`:
  - If no `.gitignore`, creates it with `.tumble-dry/\n`.
  - If `.gitignore` exists without `.tumble-dry/`, appends `\n# tumble-dry working directories\n.tumble-dry/\n`.
  - Idempotent: regex matches `.tumble-dry` ± leading slash ± trailing slash; never duplicates.

## Tests

`tests/harden.test.cjs` — **15 assertions, all pass** (`node tests/harden.test.cjs`):

- HARDEN-02: drift fields present on report; heading-depth-only change yields `content_drift=0`; `stripMarkdownStructure` removes heading/bullet/fence/html markers; `structuralDriftScore > 0` when strip canonicalizes to same text.
- HARDEN-03: `extractMarkers` recognizes slide/sheet/page; paraphrase clusters collapse; marker-anchored findings cluster despite unrelated summaries; `aggregateJson` persists markers + resolved.
- HARDEN-04: round > 1 brief includes "Open material findings from round N-1" with material-only filter; round 1 brief does not include the section.
- HARDEN-05: `pruneTraces(runDir, 5, {retention:3})` gzips rounds 1+2 (≥4 files), keeps 3+4+5 full, writes INDEX.md.
- HARDEN-06: create / append / idempotent / init-triggers-bootstrap.

## Commits (per-task atomicity)

- `5e2c411` — feat(03-harden): split voice drift (HARDEN-02)
- `6b5fff2` — feat(03-harden): bigram-Dice + boundary markers (HARDEN-03)
- `8dab374` — feat(03-harden): round-N brief seeding (HARDEN-04)
- `091a0f6` — feat(03-harden): trace retention + gitignore bootstrap (HARDEN-05, HARDEN-06)
- `d468728` — feat(03-harden): drift gate + trace-retention wiring (HARDEN-01)
- `8c02eaf` — test(03-harden): 15-assertion smoke test suite

## Acceptance criteria — verified

- [x] `node bin/tumble-dry.cjs config` still works (JSON output unchanged)
- [x] `lib/voice.cjs::voiceDriftReport` returns `structural_drift` + `content_drift`
- [x] `lib/aggregator.cjs::dedupFindings` uses bigram-Dice (inspected + smoke-tested)
- [x] `lib/reviewer-brief.cjs::buildReviewerBrief` accepts `previousAggregateJson` + `runDir` for auto-load
- [x] `lib/run-state.cjs::initRun` writes/appends `.gitignore` on first init (tmp-dir tested)
- [x] `node tests/harden.test.cjs` exits 0 (15/15 pass)
- [x] HARDEN-01..06 checked off in REQUIREMENTS.md (both task-list + traceability table)
- [x] Atomic commits per HARDEN item

## Deviations from Plan

### [Rule 1 — Bug] Initial `structuralDriftScore` returned 0 for heading-depth-only changes

- **Found during:** HARDEN-02 smoke-test run.
- **Issue:** First implementation used `bigramSimilarity()` for raw delta. That helper normalizes `[^a-z0-9]+` to spaces BEFORE computing bigrams, so `# Heading` vs `## Heading` produced identical bigram sets → raw delta was 0 → structural_drift incorrectly reported 0.
- **Fix:** Added `rawCharBigrams` / `rawBigramDice` that operate on bytes without normalization. Content-level comparison keeps the original normalized metric.
- **Files modified:** `lib/voice.cjs`
- **Commit:** `8c02eaf`

### [Rule 2 — Missing critical functionality] `aggregateJson` did not persist marker anchors

- **Found during:** HARDEN-03 planning — markers needed to survive round-to-round clustering.
- **Issue:** `aggregateJson` serialized only `tokens`, losing markers before HARDEN-04 could use them.
- **Fix:** Added `markers` + `resolved: false` to per-cluster JSON payload.
- **Files modified:** `lib/aggregator.cjs`
- **Commit:** `6b5fff2`

No other deviations. No auth gates. No architectural changes. No deferred issues.

## Self-Check: PASSED

- FOUND: lib/voice.cjs
- FOUND: lib/aggregator.cjs
- FOUND: lib/reviewer-brief.cjs
- FOUND: lib/run-state.cjs
- FOUND: lib/trace-retention.cjs
- FOUND: bin/tumble-dry.cjs
- FOUND: bin/tumble-dry-loop.cjs
- FOUND: tests/harden.test.cjs
- FOUND commit: 5e2c411
- FOUND commit: 6b5fff2
- FOUND commit: 8dab374
- FOUND commit: 091a0f6
- FOUND commit: d468728
- FOUND commit: 8c02eaf
