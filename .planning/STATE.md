---
gsd_state_version: 1.0
milestone: v0.8.0
milestone_name: ux_rebuild
status: shipped
phases_total: 1
phases_complete: 1
last_activity: 2026-04-15
---

# STATE — tumble-dry

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-15)

**Core value:** A solo author can simulate publishing-day pushback in 5–15 minutes per round and ship a piece that has already been stress-tested by the people they actually fear.
**Current focus:** v0.8.0 shipped. Next milestone TBD.

## Milestone

**Active:** v0.8.0 — UX REBUILD — SHIPPED
**Phases:** 1/1 complete
**Tags:** v0.7.0 (retroactive), v0.8.0
**Last activity:** 2026-04-15 phase 8 executed end-to-end

## Recent

- **v0.8.0 shipped** (2026-04-15) — headless orchestrator subagent, batch input, status/resume, --dry-run, zero-config canary, Skill registration, architectural reversal recorded in ARCHITECTURE.md. 102/102 tests green.
- v0.7.0 tagged retroactively (ROUNDTRIP code on main since milestone-init).
- Empirical confirmation: Claude Code plugin-shipped subagents cannot spawn sub-subagents (Task is stripped at load). Orchestrator became a dispatch-plan emitter; slash command owns Task fanout.

## Decisions

- Adopted Option B for headless orchestration (orchestrator emits dispatch-plan.json; slash command iterates). Option A (single-process orchestrator) ruled out by platform constraint.
- Zero new runtime deps in v0.8.0. glob-expand + canary + pricing all pure Node.
- Batch slug format: `<common-parent-basename>-YYYYMMDD-HHMM`.
- Canary cache TTL: 1 day at `.tumble-dry/_canary-voice.json`.

## Next

- Ship to remote (user push required: `git push origin main --tags`).
- Sync SlanchaAi marketplace copy (user-side).
- v0.9 candidates: MULTI-LLM (OpenAI/Gemini/local), `--per-file-audience` batch flag full implementation, live Skill-menu verification.
