---
gsd_state_version: 1.0
milestone: v0.10.0
milestone_name: polish_pipeline
status: complete
phases_total: 2
phases_complete: 2
last_activity: 2026-04-16
---

# STATE -- tumble-dry

## Project Reference

**Core value:** A solo author can simulate publishing-day pushback in 5-15 minutes per round.
**Current focus:** v0.10.0 complete. Structural register, drift gate, batch dashboard, component integration shipped.

## Milestone

**Active:** v0.10.0 -- POLISH PIPELINE
**Phases:** 2 (Phase 9 GIT+PLUMBING, Phase 10 CONVERGENCE+UX)
**Status:** COMPLETE -- both phases shipped, v0.10.0 tagged

## Recent

- Phase 10 complete: structural register, drift hard gate, batch dashboard, component integration, v0.10.0 release
- Phase 9 complete: git-integration module, --apply-to-source, --no-git, glob fix (fs.globSync), slash command wiring
- v0.9.1 bug fixes: BUG-2 (report/aggregator mismatch) + BUG-3 (panel cap enforcement)

## Decisions

- Used Node 22+ fs.globSync as primary glob engine with manual walkDir+regex fallback
- Git operations are best-effort: try/catch everywhere, log warning and continue on failure
- PR hint prints gh command; does not auto-create (user controls push)
- Jaccard token overlap >= 0.5 for structural register matching
- Safe redraft preserves sentences with overlap >= driftThreshold, reverts those below
- Batch dashboard reads batch.json to enumerate files, checks per-file status.json
- Patch uses system diff -u with fallback; JSX mode does targeted string replacement

## Next

- v0.10.0 shipped. Push + SlanchaAi sync pending user action.
