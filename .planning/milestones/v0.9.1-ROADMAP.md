# Roadmap — tumble-dry v0.8 (UX Rebuild)

**Milestone:** v0.8.0 — headless orchestrator subagent + batch input + dry-run + status/resume + zero-config canary + Skill registration
**Granularity:** coarse (single phase — items cluster tightly around the orchestrator subagent move)
**Parallelization:** true (batch dispatch + reviewer fanouts)
**Mode:** yolo
**Coverage:** 17/17 Active requirements mapped (Phase 8)

Single-phase milestone. Architectural pivot from real PM feedback after dogfooding tumble-dry on its own work. Phase 1 ARCHITECTURE.md decision (slash command IS the orchestrator) is reversed — main-session visibility was paid for in 400KB+ of Task-dispatch noise that nobody actually reads.

Prior milestone roadmaps archived at `.planning/milestones/`.

---

## Phases

- [x] **Phase 8: UX REBUILD (v0.8.0)** — headless orchestrator subagent, batch input, status/resume, dry-run, zero-config canary, Skill registration [SHIPPED 2026-04-15]

---

## Phase Details

### Phase 8: UX REBUILD (v0.8.0)
**Goal**: A user with no `.tumble-dry.yml` can run `/tumble-dry site/copy/` and see a single progress line per round + a final REPORT.md, while the orchestrator runs the entire convergence loop in its own subagent context. Per-round REPORT.md gets surfaced to the main session via filesystem. `tumble-dry status` lists all runs; `resume` rescues orphans; `--dry-run` previews the panel before the reviewer wave.

**Depends on**: v0.7.0 (no shipped tag yet, but code on main — none of v0.8's surface conflicts with v0.7's writers; both flow through `bin/tumble-dry.cjs::finalize`).

**Requirements**: HEADLESS-01..03, BATCH-01..05, STATUS-01..02, DRYRUN-01, CANARY-01..02, SKILL-01..02, REVERSAL-01, RELEASE-01..04.

**Success Criteria** (what must be TRUE):
  1. Main session running `/tumble-dry post.md` sees: `[tumble-dry] dispatched orchestrator → polling…` → per-round one-line updates → `[tumble-dry] converged at round N → REPORT.md`. No raw Task dispatches, no aggregator output, no critique floods. Total main-session token cost per run ≤ 5000 tokens.
  2. `/tumble-dry "site/copy/*.md"` polishes N files in ONE orchestrator dispatch. Shared audience inference visible in `.tumble-dry/<batch-slug>/audience.md`. Per-file critiques in subdirs. One shared `polish-log.md`.
  3. Killing `/tumble-dry` mid-round leaves recoverable state. `tumble-dry status` flags the run. `tumble-dry resume <slug>` finishes from where it stopped (verified by killing a test run after 2 of 5 reviewers returned, then resuming and confirming the missing 3 dispatch + round completes).
  4. `/tumble-dry --dry-run <artifact>` produces `audience.md` + `assumption-audit.md` + `## Estimated cost` printout, then exits without dispatching reviewers. Cost block accurately predicts ≥80% of the actual cost when the same artifact is later run without `--dry-run`.
  5. Fresh repo with no `.tumble-dry.yml` and `/tumble-dry README.md` runs to convergence using inferred git-author voice refs + auto-detected panel. One-line notice prints what was inferred.
  6. `Skill(skill="tumble-dry", args="post.md --dry-run")` works from another agent's session (verified manually by a sister agent).
  7. Phase 1 `ARCHITECTURE.md` has an addendum block documenting the reversal with the dogfood evidence. CHANGELOG entry calls it out.
  8. README's first 100 lines describe the new UX. Quickstart shows: install → `/tumble-dry site/copy/` → wait → read REPORT.md. No yaml ceremony.
  9. Existing test suites (harden, format, code, roundtrip) still pass. New `tests/headless.test.cjs` + `tests/batch.test.cjs` + `tests/canary.test.cjs` exit 0.
  10. VERSION = 0.8.0; v0.7.0 retroactively tagged (ROUNDTRIP code shipped to main during this milestone init); v0.8.0 tagged + pushed; SlanchaAi marketplace synced.

**Plans**: TBD (decomposed by `/gsd-plan-phase 8`)
**UI hint**: no
