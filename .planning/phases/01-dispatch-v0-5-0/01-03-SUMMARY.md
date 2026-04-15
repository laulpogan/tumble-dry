---
phase: 01-dispatch-v0-5-0
plan: 03
subsystem: docs
tags: [docs, dispatch, headless, claude-code]
requirements: [DISPATCH-06]
provides:
  - "Headless CLI self-documents as fallback control plane"
  - "README.md publishes two-control-plane symmetry + trace-fidelity caveat"
key-files:
  modified:
    - bin/tumble-dry-loop.cjs
    - README.md
decisions:
  - "Headless CLI reframed as CI/scripting fallback; /tumble-dry slash command is the preferred interactive path"
  - "Trace-fidelity degradation on CC path documented in three places (bin docstring, --help output, README) per ARCHITECTURE.md §1 Q2 deferred-scope acceptance"
metrics:
  duration: ~3min
  tasks_completed: 2
  files_touched: 2
  completed: 2026-04-15
---

# Phase 01 Plan 03: Headless fallback documentation Summary

DISPATCH-06 satisfied: `bin/tumble-dry-loop.cjs` now announces itself as the headless CI/scripting fallback and points discovering users at `/tumble-dry` for zero-setup interactive use; README.md documents both control planes as first-class siblings with the explicit subagent-context-isolation trace caveat.

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Update `bin/tumble-dry-loop.cjs` docstring + `--help` | `6b0f042` | bin/tumble-dry-loop.cjs |
| 2 | Add `## Two control planes` section to README.md | `3c8c4ad` | README.md |

## Acceptance criteria

- [x] Header docstring contains "Claude Code-native (PREFERRED for interactive use)"
- [x] Header docstring mentions "subagent context isolation"
- [x] `node bin/tumble-dry-loop.cjs` (no args) prints multi-line help including "PREFER /tumble-dry inside Claude Code" and "TRACE-FIDELITY NOTE"
- [x] Exit code 2 preserved on missing args (verified — `EXIT:2`)
- [x] Loop logic untouched (only docstring + usage block changed; verified via diff stat)
- [x] README contains `## Two control planes` heading (grep returns 1)
- [x] README mentions both `/tumble-dry` and `bin/tumble-dry-loop.cjs`
- [x] README documents trace-fidelity caveat ("Trace-fidelity caveat" string present)
- [x] README diff is purely additive (37 insertions, 0 deletions)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- bin/tumble-dry-loop.cjs: FOUND, verified via runtime --help output
- README.md: FOUND, verified via grep checks
- Commit 6b0f042: FOUND
- Commit 3c8c4ad: FOUND
