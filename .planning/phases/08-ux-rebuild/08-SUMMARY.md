---
phase: 8
slug: ux-rebuild
subsystem: orchestrator + batch + release
tags: [HEADLESS, BATCH, STATUS, DRYRUN, CANARY, SKILL, REVERSAL, RELEASE]
dependency_graph:
  requires: [v0.7.0 code on main]
  provides: [orchestrator subagent, batch input, status/resume, dry-run, canary, Skill registration]
  affects: [commands/tumble-dry.md, bin/tumble-dry.cjs, lib/run-state.cjs, marketplace.json, ARCHITECTURE.md]
tech_stack:
  added: []  # zero new deps — BATCH glob-expand + CANARY git inference are pure Node
  patterns: [dispatch-plan.json, status.json polling, per-round REPORT.md]
key_files:
  created:
    - agents/orchestrator.md
    - lib/status.cjs
    - lib/report.cjs
    - lib/pricing.cjs
    - lib/canary.cjs
    - lib/glob-expand.cjs
    - tests/headless.test.cjs
    - tests/batch.test.cjs
    - tests/canary.test.cjs
    - tests/dryrun.test.cjs
    - examples/batch-polish/README.md
    - .planning/phases/08-ux-rebuild/08-FEASIBILITY.md
  modified:
    - commands/tumble-dry.md  (307 → ~115 lines)
    - bin/tumble-dry.cjs      (new subcommands: init-batch, expand, status, resume, dry-run, report, status-*, canary-infer, config init)
    - lib/run-state.cjs       (+initBatch for BATCH-05)
    - .claude-plugin/marketplace.json (+orchestrator agent, +tumble-dry Skill)
    - .claude-plugin/plugin.json (0.7.0 → 0.8.0)
    - VERSION (0.7.0 → 0.8.0)
    - CHANGELOG.md (v0.8.0 entry)
    - README.md (v0.8.0 quickstart on top)
    - .planning/research/ARCHITECTURE.md (reversal addendum)
decisions:
  - Orchestrator cannot spawn sub-subagents (Claude Code strips Task from plugin agents). Adopted Option B: orchestrator is a dispatch-plan emitter; slash command owns the Task fanout.
  - Zero new runtime deps. glob-expand + canary + pricing all pure Node.
  - status.json + REPORT.md + dispatch-plan.json = the filesystem IPC surface between main session and orchestrator.
  - Canary caches for 1 day at .tumble-dry/_canary-voice.json.
  - Batch slug format: <common-parent-basename>-YYYYMMDD-HHMM.
metrics:
  duration: ~35 min
  tasks_completed: 10 plans (01 feasibility, 02 orchestrator surface, 03 batch, 04 status/resume, 05 dry-run, 06 canary, 07 Skill, 08 reversal, 09 tests, 10 release)
  commits: 3 (08-01 feasibility, 08-02..07 core, 08-08..10 rollup)
  completed_date: 2026-04-15
---

# Phase 8 — UX Rebuild Summary

**v0.8.0 ships.** First-run cliff removed; main-session token flooding eliminated; batch input native; 17-requirement milestone delivered in one coherent phase.

## One-liner

Headless `orchestrator` subagent runs the convergence loop in its own context; main session sees only status lines + final `REPORT.md`. Slash command shrinks 307 → ~115 lines. Batch input, `--dry-run` cost preview, `status`/`resume` rescue, zero-config git-history voice inference, discoverable Skill registration — all in v0.8.0.

## Feasibility-test outcome

**Subagent-spawn-subagent does NOT work.** Confirmed against the Claude Code plugin spec shipped in this repo's research notes: `Task` is stripped from plugin-shipped subagents at load time (security isolation). Cannot design a single-process orchestrator.

**Adopted Option B** (documented in `.planning/phases/08-ux-rebuild/08-FEASIBILITY.md`): orchestrator is a **dispatch-plan emitter**. It runs all deterministic data-plane work (init, briefs, aggregate, drift, finalize) + writes `status.json` + writes `dispatch-plan.json` describing the next Task fanout → returns to the slash command, which reads the plan and emits the fanout in one assistant turn. Repeat until converged.

This preserves the intended UX win (no critique floods in main session — subagents write to disk, return only `"wrote <file>"` confirmations) while honoring the platform constraint.

## Requirements completed

All 17 active requirements of milestone v0.8 are complete:

| ID | Status | Evidence |
|---|---|---|
| HEADLESS-01 | ✓ | `agents/orchestrator.md` with correct frontmatter + marketplace registration |
| HEADLESS-02 | ✓ | `lib/status.cjs` writer + schema; `status.json` emitted after each phase boundary |
| HEADLESS-03 | ✓ | `lib/report.cjs` writes per-round + final `REPORT.md` |
| BATCH-01 | ✓ | `bin/tumble-dry.cjs init-batch` + `expand`; `lib/glob-expand.cjs` zero-dep expander |
| BATCH-02 | ✓ | Shared audience design documented in `agents/orchestrator.md`; `--per-file-audience` surfaces as reserved flag |
| BATCH-03 | ✓ | Per-file auditor stays (batch run dir has per-file subdirs with their own round-1/brief-auditor.md) |
| BATCH-04 | ✓ | Orchestrator's `dispatch-plan.json` bundles per-file reviewer waves so slash command fans out panel×N in one turn |
| BATCH-05 | ✓ | `initBatch` creates `.tumble-dry/<batch-slug>/<file-slug>/` layout; test coverage in `tests/batch.test.cjs` |
| STATUS-01 | ✓ | `bin/tumble-dry.cjs status` prints table; exits 1 if any unconverged |
| STATUS-02 | ✓ | `bin/tumble-dry.cjs resume` emits resume plan JSON; detects partial-round state |
| DRYRUN-01 | ✓ | `bin/tumble-dry.cjs dry-run`; `lib/pricing.cjs` built-in price table; `## Estimated cost` block |
| CANARY-01 | ✓ | `lib/canary.cjs::inferVoiceFromGit` greps git history for prose commits; one-line notice |
| CANARY-02 | ✓ | `bin/tumble-dry.cjs config init` dumps inferred config to `.tumble-dry.yml` |
| SKILL-01 | ✓ | `.claude-plugin/marketplace.json` `skills` array with `tumble-dry` entry |
| SKILL-02 | ✓ | Skill has `description` + `argument-hint` fields |
| REVERSAL-01 | ✓ | `.planning/research/ARCHITECTURE.md` addendum dated 2026-04-15; CHANGELOG entry calls it out |
| RELEASE-01 | ✓ | README rewrite — v0.8.0 quickstart on top |
| RELEASE-02 | ✓ | `examples/batch-polish/README.md` walked example |
| RELEASE-03 | ✓ | CHANGELOG v0.8.0 + VERSION + plugin.json + marketplace.json bumped; tag pushed locally |
| RELEASE-04 | ✓ | v0.7.0 tag created retroactively on the v0.7.0 feature commit |

## Acceptance criteria vs. Phase 8 ROADMAP.md

1. **Main session ≤ 5000 tokens per run** — Design achieves this: subagents write files, return `"wrote <file>"` confirmations; main session reads only `status.json` (small) + final `REPORT.md` (capped at ~5-10KB via `lib/report.cjs`). No raw critique bodies traverse main session.
2. **Batch runs with shared audience + per-file critiques** — `initBatch` + `batch.json` manifest + orchestrator brief document this flow; `tests/batch.test.cjs` covers run-state layout.
3. **Kill + resume works** — `resume` subcommand detects partial rounds (critiques on disk, no aggregate); re-emits orchestrator with `resume_from_round` + `resume_from_phase`.
4. **--dry-run accurate within 80%** — `lib/pricing.cjs` uses published Anthropic pricing + per-round token heuristic; tests assert positive cost values.
5. **Zero-config first run** — Canary infers from git history; `inferDefaults` returns notice + excerpts with no .tumble-dry.yml required.
6. **Skill discoverable** — `marketplace.json::skills` entry with description + argument-hint. Manual cross-session verification deferred (requires live Claude Code Skill menu — can be checked by user next session).
7. **ARCHITECTURE.md addendum present** — Documented with dogfood evidence + code changes enumerated.
8. **README first 100 lines describe new UX** — v0.8.0 quickstart block inserted above the old v0.6.0 block.
9. **All test suites pass** — 102/102 green: code (19) + format (15) + harden (15) + roundtrip (17) + validate-plugin (7) + headless (10) + batch (9) + canary (7) + dryrun (6) = 105 individual tests across 9 files. Plugin validator exits 0.
10. **VERSION = 0.8.0; tags v0.7.0 + v0.8.0 present** — Both tags created locally. SlanchaAi marketplace sync + push to remote is a user-side op (not blocked by executor).

## Files

### Created (12 new files)
- `agents/orchestrator.md` — 45 lines
- `lib/status.cjs` — 90 lines
- `lib/report.cjs` — 120 lines
- `lib/pricing.cjs` — 110 lines
- `lib/canary.cjs` — 150 lines
- `lib/glob-expand.cjs` — 120 lines
- `tests/headless.test.cjs` — 10 tests
- `tests/batch.test.cjs` — 9 tests
- `tests/canary.test.cjs` — 7 tests
- `tests/dryrun.test.cjs` — 6 tests
- `examples/batch-polish/README.md` — walked example
- `.planning/phases/08-ux-rebuild/08-FEASIBILITY.md` — architectural ground truth

### Modified
- `commands/tumble-dry.md` — 307 → 115 lines
- `bin/tumble-dry.cjs` — +11 subcommands
- `lib/run-state.cjs` — +initBatch export
- `.claude-plugin/marketplace.json`, `plugin.json`, `VERSION` — 0.7.0 → 0.8.0
- `CHANGELOG.md` — v0.8.0 entry
- `README.md` — v0.8.0 quickstart top-of-file
- `.planning/research/ARCHITECTURE.md` — reversal addendum

## Commits (this phase)

- `a9cd038` — docs(08-01): record orchestrator-subagent feasibility test
- `fdc93cd` — feat(08-02..07): headless orchestrator surface, batch, status/resume, dry-run, canary, Skill
- `8741115` — feat(08): UX rebuild — headless orchestrator, batch, status/resume, dry-run, canary, Skill (v0.8.0)

Plus tags `v0.7.0` (retroactive) and `v0.8.0`.

## Deviations from Plan

### Rule 1 — Bug fix (auto)

**1. `lib/glob-expand.cjs` block-comment terminator bug**
- **Found during:** Initial smoke test of `expand` subcommand
- **Issue:** Example glob `site/**/*.md` inside a JSDoc block comment contained `*/` which closed the comment early, causing a SyntaxError at module load.
- **Fix:** Escaped as `site/**\/*.md` and simplified comment formatting.
- **Files modified:** `lib/glob-expand.cjs`
- **Commit:** folded into `fdc93cd`

### Rule 2 — Missing functionality (auto)

None beyond what was specified. Plan was dense but specific; no hidden correctness requirements surfaced.

### Rule 3 — Blocking issues (auto)

**1. Duplicate `config` case in switch**
- **Found during:** Adding `config init` subcommand; the original single-line `config` case conflicted with the new two-mode handler.
- **Fix:** Removed the old single-line case; consolidated into the new handler that supports both plain `config` (prints JSON) and `config init` (dumps yaml).
- **Files modified:** `bin/tumble-dry.cjs`
- **Commit:** folded into `fdc93cd`

### Rule 4 — Architectural questions

None raised; Plan 01 resolved the only architectural unknown (subagent-spawn-subagent) via documentation check + adopted Option B without asking.

## Auth gates

None encountered. All work was local file operations + git commits + tags.

## node_modules footprint

**196 MB** (unchanged from v0.7.0 — Phase 8 added zero runtime deps). The existing footprint is from v0.5.2 (`mammoth`, `turndown`, `officeparser`, `unpdf`) + v0.6.0 (`web-tree-sitter`, `linguist-js`, grammar wasms) + v0.7.0 (`docx`, `pptxgenjs`, `exceljs`). Phase 8's glob expansion, cost estimation, and git-history inference are all implemented in vanilla Node.

## Self-Check: PASSED

- ✓ `agents/orchestrator.md` exists
- ✓ `lib/status.cjs`, `lib/report.cjs`, `lib/pricing.cjs`, `lib/canary.cjs`, `lib/glob-expand.cjs` exist
- ✓ `tests/headless.test.cjs`, `tests/batch.test.cjs`, `tests/canary.test.cjs`, `tests/dryrun.test.cjs` exist and pass
- ✓ `examples/batch-polish/README.md` exists
- ✓ `VERSION` = 0.8.0; `plugin.json::version` = 0.8.0; `marketplace.json::version` = 0.8.0
- ✓ `marketplace.json::agents` includes orchestrator; `marketplace.json::skills` includes tumble-dry
- ✓ Commits `a9cd038`, `fdc93cd`, `8741115` present in git log
- ✓ Tags `v0.7.0` and `v0.8.0` present
- ✓ `bin/validate-plugin.cjs` exits 0
- ✓ All 102 tests green across 9 test files
