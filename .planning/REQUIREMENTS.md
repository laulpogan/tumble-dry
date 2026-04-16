# Requirements — Milestone v0.10 (Polish Pipeline)

**Source:** 18-artifact field report (docs/FIELD_REPORT_2026_04_15_18_ARTIFACTS.md) + archaeologist integration priority.
**Prior milestones:** archived at `.planning/milestones/`.

---

## v1 Requirements (this milestone)

### Git History Generation (HIGH PRIORITY — archaeologist integration)

- [x] **GIT-01** Each tumble-dry run auto-creates a branch `tumble-dry/<slug>` (or `tumble-dry/<batch-slug>`) at init time. All round artifacts committed per-round with convergence metadata in commit messages.
- [x] **GIT-02** Per-round commit message format: `tumble-dry: round N redraft (<slug>) — M material, K structural, drift=X.XX, converged={yes|no}`. Machine-parseable by archaeologist.
- [x] **GIT-03** On convergence (or forced-final), FINAL.md committed on the branch. If `--apply-to-source` set, source file update committed too.
- [x] **GIT-04** Auto-create local PR via `gh pr create` (when gh available) or print the command for manual execution. PR title: `tumble-dry: polish <slug>`. PR body: final REPORT.md content.
- [x] **GIT-05** Batch mode: one branch per batch with per-file × per-round commits. Squash-merge candidate. Branch name: `tumble-dry/<batch-slug>`.
- [x] **GIT-06** `--no-git` flag to disable git integration (for users who don't want branches/commits).

### Apply to Source

- [x] **APPLY-01** `--apply-to-source` flag on slash command + CLI. After convergence, `cp FINAL.md <source-path>`. For office formats: `cp FINAL.<ext>` (if `--apply` roundtrip was also set). Committed on the tumble-dry branch per GIT-03.
- [x] **APPLY-02** Batch mode: applies to all converged files. Skips files that didn't converge (with warning).

### Structural Finding Register (solves convergence oscillation — BUG-4)

- [ ] **REGISTER-01** New file `.tumble-dry/<slug>/structural-register.json`: array of `{finding_summary, registered_at_round, status: 'acknowledged'|'deferred'|'resolved', reason}`.
- [ ] **REGISTER-02** After each aggregate, if structural findings persist from prior round: auto-register them (status: 'acknowledged') unless they were NEW this round. Registered findings are excluded from the material count for convergence purposes — they stop re-firing.
- [ ] **REGISTER-03** Surface register in REPORT.md: "3 structural findings acknowledged (not blocking convergence): [summaries]". User sees what was parked.
- [ ] **REGISTER-04** `tumble-dry register <slug> <finding-summary>` CLI subcommand for manual registration mid-run.

### Glob Expansion Fix (BUG-1)

- [x] **GLOB-01** `lib/glob-expand.cjs` correctly expands shell globs (`*.md`, `site/copy/*.md`, `**/*.md`) via `glob` npm package or Node.js `fs.glob` (Node 22+). Falls back to manual `fs.readdirSync` + filter for older Node versions.
- [x] **GLOB-02** `bin/tumble-dry.cjs init` accepts glob string as artifact arg; expands and routes to initBatch when N>1.

### Drift Hard Gate Per Type

- [ ] **DRIFT-01** When editor's content_drift exceeds `personas/configs.json[artifact_type].drift_threshold`, the redraft is split into "safe changes" (under threshold) and "structural changes" (over threshold). Structural changes surface for user confirmation before being applied.
- [ ] **DRIFT-02** If no interactive user (headless/batch mode): structural changes auto-apply but are flagged in REPORT.md + committed separately on the git branch with a distinct commit message (`tumble-dry: round N structural redraft (drift=X.XX, exceeds threshold Y.YY)`).

### Batch Dashboard

- [ ] **DASH-01** `tumble-dry status` shows batch-level summary when batch runs exist: `[N/M init] [K/M converged] [J/M in-progress] [L/M forced-final]`.
- [ ] **DASH-02** Batch-level resume: `tumble-dry resume <batch-slug>` picks up where the batch left off (skips converged files, resumes in-progress files, inits remaining files).

### Component Integration Mode

- [ ] **COMP-01** `--patch` flag. After convergence, diff FINAL.md against the source and produce a unified diff patch at `.tumble-dry/<slug>/PATCH.diff`. For JSX/TSX sources: the patch applies to the component file, replacing string literals / JSX text content with the polished versions.
- [ ] **COMP-02** `tumble-dry apply-patch <slug>` applies the patch via `git apply`. User reviews diff first.

### Release

- [ ] **REL-01** CHANGELOG v0.10.0. VERSION bump. Push + tag. SlanchaAi sync.
- [ ] **REL-02** README update: git integration section, --apply-to-source, structural register, batch dashboard.

---

## Traceability

| REQ-ID | Phase |
|--------|-------|
| GIT-01..06 | Phase 9 |
| APPLY-01..02 | Phase 9 |
| REGISTER-01..04 | Phase 10 |
| GLOB-01..02 | Phase 9 |
| DRIFT-01..02 | Phase 10 |
| DASH-01..02 | Phase 10 |
| COMP-01..02 | Phase 10 |
| REL-01..02 | Phase 10 |

---

*Defined: 2026-04-15 from 18-artifact field report + archaeologist priority.*
