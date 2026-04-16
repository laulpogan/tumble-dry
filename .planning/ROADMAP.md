# Roadmap — tumble-dry v0.10 (Polish Pipeline)

**Milestone:** v0.10.0 — git history, apply-to-source, structural register, glob fix, drift gate, batch dashboard, component integration
**Granularity:** coarse (2 phases)
**Parallelization:** true
**Mode:** yolo
**Coverage:** 20/20 Active requirements mapped

---

## Phases

- [x] **Phase 9: GIT + PLUMBING** — git branch/commit per run, --apply-to-source, glob fix
- [x] **Phase 10: CONVERGENCE + UX** — structural register, drift hard gate, batch dashboard, component integration, release

---

## Phase Details

### Phase 9: GIT + PLUMBING
**Goal**: Every tumble-dry run produces a git branch with per-round commits. `--apply-to-source` copies FINAL back. Glob expansion works. Archaeologist can trace the full polish arc via `git log`.
**Depends on**: v0.9.1 (harness-only + validated personas)
**Requirements**: GIT-01..06, APPLY-01..02, GLOB-01..02
**Success Criteria**:
  1. `git branch -l 'tumble-dry/*'` shows branches created by tumble-dry runs.
  2. `git log tumble-dry/<slug> --oneline` shows per-round commits with convergence metadata.
  3. `--apply-to-source` copies FINAL.md back to source path; committed on the branch.
  4. `--no-git` flag suppresses all git operations.
  5. `/tumble-dry "site/copy/*.md"` expands glob and runs batch.
  6. Existing test suites still pass.
**Plans**: TBD

### Phase 10: CONVERGENCE + UX
**Goal**: Convergence oscillation solved via structural register. Drift gates per type. Batch dashboard shows progress. Component integration produces patches.
**Depends on**: Phase 9 (git integration for commit-per-change)
**Requirements**: REGISTER-01..04, DRIFT-01..02, DASH-01..02, COMP-01..02, REL-01..02
**Success Criteria**:
  1. BMC-style oscillation (4→5→3→3) converges by round 3 when structural findings auto-register.
  2. Financial model drift (0.44) triggers structural-change split; hero copy drift (0.20) does not.
  3. `tumble-dry status` shows batch summary line.
  4. `tumble-dry resume <batch-slug>` picks up mid-batch.
  5. `--patch` produces PATCH.diff; `tumble-dry apply-patch` applies it.
  6. v0.10.0 tagged, pushed, marketplace synced.
**Plans**: TBD
