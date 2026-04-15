---
gsd_state_version: 1.0
milestone: v0.8.0
milestone_name: ux_rebuild
status: ready_to_plan
phases_total: 1
phases_complete: 0
last_activity: 2026-04-15
---

# STATE — tumble-dry

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-15)

**Core value:** A solo author can simulate publishing-day pushback in 5–15 minutes per round and ship a piece that has already been stress-tested by the people they actually fear.
**Current focus:** v0.8 UX REBUILD — headless orchestrator subagent + batch input + status/resume + dry-run + zero-config canary

## Milestone

**Active:** v0.8.0 — UX REBUILD
**Phases:** 1 (Phase 8)
**Status:** Ready to plan
**Last activity:** 2026-04-15 milestone init from PM dogfood feedback

## Recent

- v0.7.0 ROUNDTRIP code committed to main (writers + tests + LOSSY_REPORT). Not tagged yet — superseded as next-shippable by v0.8 UX rebuild.
- PM canary on tumble-dry's own work surfaced 7 UX cliffs: no batch input, main-context flooding, no resume, no dry-run, yaml cliff, not Skill-discoverable, no status surface. v0.8 = all of them.
- Architectural reversal: Phase 1 ARCHITECTURE.md "slash IS orchestrator (NOT subagent)" decision wrong in practice. v0.8 moves loop into a headless subagent.

## Next

- `/gsd-plan-phase 8` — decompose v0.8 UX rebuild into executable plans
