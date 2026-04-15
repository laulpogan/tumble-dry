---
gsd_state_version: 1.0
milestone: v0.6.0
milestone_name: close)
status: Roadmap created; awaiting `/gsd-plan-phase 1`
last_updated: "2026-04-15T21:40:38.628Z"
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 0
  completed_plans: 4
  percent: 0
---

# STATE — tumble-dry v0.5.x → v0.6.0

## Project Reference

- **Core value:** Solo author simulates publishing-day pushback in 5–15 min/round and ships a piece already stress-tested by the people they actually fear — no real users, money, or reputation burned.
- **Current focus:** Milestone v0.5.0 → v0.6.0 — Claude Code-native dispatch + persona library + core hardening + office formats + code mode + release.
- **Repo:** https://github.com/laulpogan/tumble-dry (mirror: SlanchaAi/skills marketplace)
- **Baseline:** v0.4.2 ships today (gastown ripped, voice self-defaults, headless CLI working).

## Current Position

- **Milestone:** v0.5.x → v0.6.0
- **Phase:** Phase 1 — DISPATCH (v0.5.0) — not started
- **Plan:** none yet
- **Status:** Roadmap created; awaiting `/gsd-plan-phase 1`
- **Progress:** [░░░░░░░░░░] 0%

```
[          ] 0% (0/6)
```

## Performance Metrics

- Roadmap created: 2026-04-15
- Phases: 6 (5 main + 1 release)
- Active requirements: 38, all mapped
- Coverage: 100%

## Accumulated Context

### Key Decisions (carried from PROJECT.md)

- Slash-command-prose is the orchestrator (NOT a dispatcher subagent, NOT MCP). bin/ stays as headless fallback.
- All N reviewer Task calls fan out in ONE assistant turn (serial cross-turn dispatch is the #1 silent bug).
- Office stack: `mammoth`+`turndown` (docx), `officeparser` (pptx/xlsx/pdf), `unpdf` (PDF fallback). NOT SheetJS, NOT pdf-parse.
- `web-tree-sitter` (WASM), NOT native tree-sitter (breaks Windows + Linux ARM + fresh macOS).
- Filesystem is IPC — orchestrator reads `aggregate.md` only, not raw critique files.
- Voice-drift gate BLOCKS convergence (HARDEN-01) — cumulative from round-0.
- `package.json` lands in Phase 4 (FORMAT) as `optionalDependencies`; markdown-only users never `npm install`.

### Open Todos

- Smoke-test CC `Agent` parallel-fanout in Phase 1 planning (5-min test before committing orchestration pattern).
- Decide token-budget strategy for audience-inferrer on large artifacts (inline source vs. read-from-disk).
- Decide `verify_cmd` sandboxing UX in CC plugin context (Phase 5 planning).
- Decide persona library extraction mechanism (hand-curated vs. machine-assembled vs. copy-paste from research files) in Phase 2 planning.
- Create office-format test fixtures (CJK docx, RTL pdf, curly-quote xlsx, emoji md) in Phase 4.

### Blockers

- None.

### Risks Flagged

- CORE-04 trace fidelity partially degrades on CC path (subagent context isolation). Document in README + polish-log.md (Phase 1).
- `web-tree-sitter` ABI version pinning required across grammar WASM packages (Phase 5).

## Session Continuity

- **Last session:** 2026-04-15T21:40:38.624Z
- **Next action:** `/gsd-plan-phase 1` to decompose DISPATCH into executable plans.

---

*Initialized: 2026-04-15 by /gsd-roadmapper.*
