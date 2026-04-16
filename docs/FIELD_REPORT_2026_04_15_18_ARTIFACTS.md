# Field Report: 18-Artifact Batch Session

**Date:** 2026-04-15
**Reporter:** PM (Paul Logan), slancha-website polish session
**Version:** tumble-dry v0.9.1
**Artifacts polished:** 18 (15 site/copy/*.md + 3 business docs)
**Rounds per artifact:** 3+ average
**Total dispatches:** ~315 critiques (7 reviewers × 15 files × 3 rounds)

---

## What works well

- Persona library + runbook produce genuinely distinct reviewers. No two critiques read the same.
- Assumption auditor consistently finds load-bearing premises experts miss.
- `brief-*` subcommands as the data plane is clean — orchestration stays in the session, state stays on disk.
- Convergence signal (material count drop) is useful for deciding when to stop.
- Dry-run cost estimates were accurate within ~20%.

## Bugs found

### BUG-1: Glob expansion broken in init-batch
`init-batch` with glob patterns fails (`*.md` not expanded). Had to init each file individually, loop briefs manually, dispatch agents one-by-one. For 15 files: ~6 manual dispatch waves.

### BUG-2: Report says "did not converge" when aggregator returns `converged: true`
Report rendering doesn't match aggregation logic. `aggregate.json` shows `converged: true` but REPORT.md says "did not converge." Minor but confusing — erodes trust in the tool's output.

### BUG-3: Panel size inflation past cap
Some files got 7 reviewers despite `panel_size=5`. Runbook add-rules (layman, operator, mobile reader) push past the configured cap. At 7 reviewers × 15 files × 3 rounds = 315 critiques — expensive. Need either hard cap enforcement or opt-out flag for add-rules.

### BUG-4: Convergence oscillation on structural findings
BMC went 4→5→3→3 material across 4 rounds. Hero went 6→7→9. Structural findings multiply when the editor introduces new material addressing old structural findings, which then gets new structural critiques. No mechanism to mark a structural finding as "acknowledged but unfixable in this format" — it re-fires every round.

## Feature requests (ranked by 10× usefulness)

### 1. `--apply-to-source` flag
After convergence, automatically `cp FINAL.md` back to the source file. Currently manual cp for every artifact. Trivial to implement; saves 18 manual copies in a batch session.

### 2. Structural finding register
Let the editor (or the user at round boundary) mark a structural finding as "acknowledged — requires product decision, not copy edit." Once registered, the finding stops re-firing in subsequent rounds. Prevents convergence oscillation on findings that are real but out-of-scope for the editor.

### 3. Batch progress dashboard
`tumble-dry status` should show batch-level summary: `[15/15 init] [7/15 converged] [3/15 in-progress] [5/15 forced-final]` — not just per-slug rows.

### 4. Per-type drift threshold hard gate
0.25 default was too tight for financial models (0.44 drift on necessary NRR correction) but right for hero copy. `configs.json` has `drift_threshold` per type but it didn't gate the editor in practice. Make it a hard gate: if editor exceeds drift, split the redraft into "safe changes" and "structural changes" and surface for confirmation.

### 5. Component integration mode
For codebases where copy lives in JSX/TSX, tumble-dry should diff the FINAL against the component and produce a patch. This is the gap that stopped polished copy from going live — user had converged FINAL.md but couldn't apply it back to the React component without manual copy-paste.

### 6. Truth-pass integration
For marketing copy, automatically cross-reference against a truth-pass config (Category A claims to remove, Category B aspirational claims to keep). Logic exists in the user's process memory but tumble-dry doesn't know about it.

### 7. Parallel multi-artifact orchestration
Each artifact runs its own convergence loop sequentially. With 15 files at 3 rounds each = 45 cycles. An orchestrator that pipelines (R1 reviewers for files 1-5 while R1 editor runs for file 0) would cut wall-clock time.

### 8. Batch-level resume
If CC dies mid-batch, `tumble-dry status` shows orphans but `resume` only works per-slug. Need batch-level resume: "pick up where the batch left off."

---

## Priority for PM

**Fix now (bugs):** BUG-2 (report rendering mismatch), BUG-3 (panel cap enforcement).

**Fix next (high-value, low-cost):** Feature #1 (--apply-to-source), Feature #2 (structural finding register), BUG-1 (glob expansion).

**v0.10 milestone candidates:** Feature #3-8 (batch dashboard, drift hard gate, component integration, truth-pass, parallel orchestration, batch resume).

---

*This report is the ground truth for tumble-dry v0.10 prioritization. Written from an actual 18-artifact polish session, not hypothetical scenarios.*
