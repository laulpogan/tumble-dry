# Requirements — Milestone v0.8 (UX Rebuild)

**Source:** PM dogfood feedback on real canary run of tumble-dry on tumble-dry's own work.
**Scope:** Headless orchestrator subagent + per-round reports (#1) + batch input (#2) + `tumble-dry status`/`resume` (#3) + `--dry-run` (#4) + zero-config canary (#5) + Skill registration (#6).
**Out-of-scope:** MULTI-LLM, VOICE-FT, WEB-UI, REAL-USER (still in v2 deferred per PROJECT.md).
**Prior milestones (v0.6.0, v0.7.0):** archived at `.planning/milestones/`.

---

## v1 Requirements (this milestone)

### Headless orchestrator + status surfacing (highest leverage)

- [x] **HEADLESS-01** `/tumble-dry` dispatches the entire convergence loop as a single headless orchestrator subagent (`tumble-dry-orchestrator` agent). Main session sees only: "starting → progress → done + report". The orchestrator does the round-by-round Task fanouts, aggregator calls, editor invocations, drift checks, history snapshots — all inside its own context. Filesystem IPC unchanged.
- [x] **HEADLESS-02** Orchestrator emits `.tumble-dry/<slug>/status.json` per round-phase with `{round, phase, reviewers_dispatched, reviewers_returned, material_count, structural_count, drift_score, converged, eta}`. Slash command in main session polls it once per round and renders a single-line progress update.
- [x] **HEADLESS-03** Per-round `REPORT.md` auto-emitted at `.tumble-dry/<slug>/round-N/REPORT.md`: 1-paragraph summary, top-3 material findings, drift snapshot, what the editor changed. Final `REPORT.md` at `.tumble-dry/<slug>/REPORT.md` rolls them up at convergence.

### Batch input native (eliminates 17× ceremony)

- [x] **BATCH-01** `/tumble-dry` accepts globs and directories. Detects N input files, treats them as a batch.
- [x] **BATCH-02** Shared audience inference: ONE `audience-inferrer` Task call seeded with concatenated artifact summaries → one panel applied to all N files. Override per-file via `--per-file-audience` flag.
- [x] **BATCH-03** Per-file auditor: each file gets its own `assumption-auditor` call (premises differ even when audience shared).
- [x] **BATCH-04** Per-file reviewer waves dispatched in parallel batches across files (panel × N files = panel*N Task calls per round, all in ONE assistant turn from the orchestrator).
- [x] **BATCH-05** Batch run dir: `.tumble-dry/<batch-slug>/` with per-file subdirs (`<batch-slug>/<file-slug>/...`); shared `voice-refs/` symlinks; one shared `polish-log.md` summarizing all files.

### Resume + index (rescue orphaned runs)

- [x] **STATUS-01** `tumble-dry status` lists all runs in `.tumble-dry/` with columns: `slug | round | converged | material | timestamp`. Exit 0 if all clean; 1 if any unconverged runs exist. Highlights orphans (no `status.json` updates in >1 hour).
- [x] **STATUS-02** `tumble-dry resume <slug>` picks up an interrupted run mid-round. Re-emits the orchestrator subagent with `--resume-from-round N`. Detects partial round (some critiques on disk but no aggregate) and finishes the round before deciding next.

### Pre-flight check

- [x] **DRYRUN-01** `/tumble-dry --dry-run <artifact>` and `bin/tumble-dry-loop.cjs --dry-run` run init + audience inference + assumption audit only, then exit. Prints inferred personas + load-bearing assumptions. Costs ~1 audience-inferrer + 1 auditor call per file. Lets users tweak before committing to N reviewer waves. Includes a `## Estimated cost` block (token estimate × current model price for the full run).

### Zero-config first run

- [x] **CANARY-01** When no `.tumble-dry.yml` exists, infer `voice_refs` from `git log --author "$(git config user.name)" --pretty=format:%H` recent commits in repo. Sample diffs for prose-rich files (README, docs/, blog/, *.md). Auto-detect artifact type via existing persona library detection. Default panel from `personas/configs.json`. Print a one-line "first run — using these defaults: voice_refs=git_history(N=K commits), panel=<size>" notice.
- [x] **CANARY-02** First-run setup is non-blocking: tumble-dry runs immediately with inferred defaults. User can later `tumble-dry config init` to dump the inferred config to `.tumble-dry.yml` for editing. No yaml cliff.

### Discoverability

- [x] **SKILL-01** Register `/tumble-dry` as a discoverable Skill in `.claude-plugin/marketplace.json` (currently only declared as command). Other agents can chain via `Skill(skill="tumble-dry", args="<artifact> --dry-run")` rather than hand-executing the slash-command body.
- [x] **SKILL-02** Add `description:` and `argument-hint:` to the Skill registration so it appears correctly in skill listings + AskUserQuestion menus.

### Architectural reversal (honest record-keeping)

- [x] **REVERSAL-01** Update Phase 1 `ARCHITECTURE.md` and v0.5.0 commits with an addendum: slash command is now a thin dispatch wrapper, not the orchestrator. Document why (real-dogfood evidence: 400KB+ of Task-dispatch noise floods main session). Keep historical record honest. Add CHANGELOG entry.

### Release

- [x] **RELEASE-01** README rewrite emphasizing the new entry-point UX (batch input, dry-run, status, resume). Rewrite Quickstart from scratch — current one assumes single-file polishing.
- [x] **RELEASE-02** Examples directory: add `examples/batch-polish/README.md` demonstrating polishing a directory + the per-round REPORT.md output.
- [x] **RELEASE-03** CHANGELOG v0.8.0 entry. VERSION + plugin.json + marketplace.json bumped. Tag pushed. SlanchaAi marketplace synced.
- [x] **RELEASE-04** Tag v0.7.0 retroactively (ROUNDTRIP code already shipped to main, just ungated). Push.

---

## v2 (deferred — not in this milestone)

- **MULTI-LLM-01** OpenAI / Gemini / local-model dispatch. Anthropic-only through v0.8. Targeting v0.9+.
- **VOICE-FT-01** Personal fine-tuned voice model. Awaiting external corpus project.
- **WEB-UI-01** / **REAL-USER-01** Anti-features per PROJECT.md.

## Out of Scope (this milestone)

- **Per-file audience inference as default** — Always shared by default. `--per-file-audience` is opt-in. Users polishing 17 files want one panel, not 17 different panels.
- **Cross-file finding dedup** — Each file's findings stay scoped to that file. Cross-file deduplication is interesting but not v0.8 (would change persona behavior).
- **Streaming progress to stdout** — Status comes via filesystem polling + slash-command renders. Stdout streaming from a subagent is a Claude Code limitation (subagent context is isolated); polling is the workaround.

---

## Traceability

| REQ-ID | Phase |
|--------|-------|
| HEADLESS-01..03 | Phase 8 |
| BATCH-01..05 | Phase 8 |
| STATUS-01..02 | Phase 8 |
| DRYRUN-01 | Phase 8 |
| CANARY-01..02 | Phase 8 |
| SKILL-01..02 | Phase 8 |
| REVERSAL-01 | Phase 8 |
| RELEASE-01..04 | Phase 8 |

---

*Defined: 2026-04-15 in response to PM dogfood feedback.*
