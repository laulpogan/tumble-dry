---
phase: 01-dispatch-v0-5-0
plan: 05
subsystem: control-plane/slash-command
tags: [slash-command, orchestrator, parallel-fanout, dispatch, claude-code-native, keystone]
requirements: [DISPATCH-01, DISPATCH-02, DISPATCH-05, DISPATCH-07, DISPATCH-08]
provides:
  - "CC-native /tumble-dry slash command — prose orchestrator running the convergence loop via parallel Task subagent fanout in the user's active session (no ANTHROPIC_API_KEY)"
  - "Pre-dispatch manifest + post-fanout glob reconciliation pattern (Pitfall 1 defense)"
  - "Partial-round policy (M/N >= 0.6 proceed-with-degradation, else retry-once, else abort) (DISPATCH-08)"
  - "Failure-mode taxonomy (timeout, malformed_output, refusal, silent_text_return) logged to dispatch-errors.md"
  - "Aggregate-only read invariant for main-session context preservation (Pitfall 4)"
requires:
  - "bin/validate-plugin.cjs (Plan 04) — invoked at startup"
  - "bin/tumble-dry.cjs subcommands (init, brief-*, aggregate, drift, extract-redraft, finalize) — data plane"
  - "agents/{audience-inferrer,assumption-auditor,reviewer,editor}.md — restricted plugin frontmatter (Plan 02)"
affects:
  - "downstream phases (PERSONA, CORE-HARDEN, FORMAT, CODE) dogfood on this orchestrator"
  - "bin/tumble-dry-loop.cjs remains as headless CI/scripting fallback — same data plane, full traces"
key-files:
  created: []
  modified:
    - commands/tumble-dry.md
decisions:
  - "Slash command body IS the orchestrator (prose with numbered steps + inline Bash + Task fanout blocks) — not a thin shell-out. DISPATCH-05 explicitly requires loop logic in prose so no API-key/separate-process path is taken in the CC-native flow."
  - "Every Task fanout (audience+auditor wave, reviewer wave, retry waves) is annotated 'ONE ASSISTANT TURN' with explicit Pitfall-1 reasoning inline — repeated next to each block to make serial-dispatch the actively-discouraged path."
  - "Aggregator is the only consumer of raw critique-*.md files. Slash command prose explicitly forbids the orchestrator from invoking Read on individual critiques (Pitfall 4 context-bloat defense). Same rule applies to proposed-redraft.md (read only by extract-redraft)."
  - "Pre-dispatch manifest is JSON written before each fanout; reconciliation uses jq + comm to compute MISSING set. Threshold 0.6 from CONTEXT.md."
  - "Status logging uses [tumble-dry-loop] prefix to match bin/tumble-dry-loop.cjs idiom — debugging a CC-native run vs headless run produces visually-identical log streams."
  - "Editor step still emits a SINGLE Task call (editor is unitary, not a fanout) but kept the explicit 'in its own assistant turn' instruction for clarity."
metrics:
  duration: ~6min
  tasks_completed: 1
  files_touched: 1
  lines_written: 307
  completed: 2026-04-15
---

# Phase 01 Plan 05: Slash command rewrite Summary

DISPATCH-01/02/05/07/08 satisfied: `commands/tumble-dry.md` is now a 307-line CC-native prose orchestrator. Users running `/tumble-dry <artifact>` in Claude Code with no `ANTHROPIC_API_KEY` set get the full convergence loop — audience inference, assumption audit, parallel reviewer fanout, aggregation, and editor redraft — entirely inside their active session via parallel `Task(subagent_type=...)` calls. State mutations route through `bin/tumble-dry.cjs` subcommands (data plane), preserving the shared layout with the headless `bin/tumble-dry-loop.cjs` CI fallback.

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Rewrite commands/tumble-dry.md as full prose orchestrator | `0ce7d54` | commands/tumble-dry.md |

## Acceptance criteria

- [x] Frontmatter preserves `description` + `argument-hint`; description mentions session-auth / no API key required
- [x] `bin/validate-plugin.cjs` invoked at startup with halt-on-fail
- [x] Reviewer Task fanout block carries explicit "ONE ASSISTANT TURN" / "single assistant message" warning
- [x] All four agent names referenced via `subagent_type=...`: audience-inferrer, assumption-auditor, reviewer, editor
- [x] `dispatch-manifest.json` written before fanout; glob-reconciliation block (jq + comm + MISSING set) in place
- [x] Partial-round threshold `0.6` with proceed-with-degradation / retry-once / abort branches
- [x] `dispatch-errors.md` referenced; four failure modes (timeout, malformed_output, refusal, silent_text_return) defined in dedicated taxonomy section
- [x] Pitfall-4 invariant explicit: orchestrator reads `aggregate.md` only, NEVER `critique-*.md` raw files
- [x] `[tumble-dry-loop]` status idiom preserved (16 occurrences, surfaced at every state-transition point)
- [x] Every state mutation shells out to `bin/tumble-dry.cjs` (init, brief-audience, brief-auditor, brief-reviewers, brief-editor, aggregate, drift, extract-redraft, finalize)
- [x] File length 307 lines (>= 150 minimum)
- [x] `bin/tumble-dry-loop.cjs` referenced as headless CI/scripting fallback

## Verification commands

```
$ wc -l commands/tumble-dry.md       → 306 (307 with final newline)
$ grep -c "Task(" commands/...        → 6
$ grep -c "\[tumble-dry-loop\]" ...   → 16
$ grep "validate-plugin" ...          → 1 hit
$ grep -E "0\.6" ...                  → 1 hit (partial-round threshold)
$ grep "dispatch-errors" ...          → multiple hits
$ grep "dispatch-manifest" ...        → multiple hits
$ grep -i "one assistant" ...         → multiple hits
```

All 18 automated checks in plan `<verify>` block pass; 0 failures.

## Per-round flow implemented

```
/tumble-dry <artifact>
  ├─ Bash: validate-plugin.cjs (gate)
  ├─ Bash: parse args, init, capture SLUG
  └─ for ROUND in 1..MAX_ROUNDS:
       ├─ Bash: brief-audience + brief-auditor (round 1, parallel via &/wait)
       ├─ Bash: brief-reviewers → reviewer-briefs.json
       ├─ Bash: write dispatch-manifest.json
       ├─ [ONE assistant turn] Task: audience-inferrer + assumption-auditor (round 1)
       ├─ Bash: verify round-1 outputs (retry-once on miss)
       ├─ [ONE assistant turn] Task: N reviewers in parallel
       ├─ Bash: glob reconciliation + partial-round policy (0.6 threshold)
       │   ├─ M/N >= 0.6 → proceed-with-degradation note
       │   ├─ M/N <  0.6 → retry-once with stricter brief in ONE turn
       │   └─ still missing → abort with dispatch-errors.md
       ├─ Bash: aggregate → read aggregate.json ONLY (no raw critiques)
       ├─ Bash: convergence branch:
       │   ├─ converged → finalize → exit 0
       │   ├─ ROUND >= MAX_ROUNDS → finalize → exit 1
       │   ├─ --no-auto-redraft → exit 1
       │   └─ else → editor step
       ├─ Bash: brief-editor
       ├─ [single Task turn] editor → proposed-redraft.md
       └─ Bash: extract-redraft → drift → snapshot → cp working.md → snapshot → ROUND++
```

## Hard architectural invariants baked in

1. **Parallel fanout, single turn.** Reviewer wave (and retry wave, and round-1 audience+auditor wave) are explicitly instructed to be ONE assistant message containing all N Task calls. Annotation repeated inline next to every fanout block. Defense against Pitfall 1 (false convergence on partial rounds).
2. **Filesystem IPC, aggregate-only reads.** Subagents write deliverables to known paths from the brief. Orchestrator never invokes `Read` on `critique-*.md` or `proposed-redraft.md` — the aggregator (Bash) and `extract-redraft` (Bash) are the sole consumers. Defense against Pitfall 4 (context bloat).
3. **Pre-dispatch manifest + post-fanout reconciliation.** Manifest written before fanout; glob + comm computes MISSING set after; partial-round policy decides proceed/retry/abort. Defense against silent partial rounds.
4. **Failure-mode taxonomy with retry budget.** Four canonical modes logged to `dispatch-errors.md`; one retry per missing persona; abort if still failing AND below threshold.
5. **Data-plane separation.** Slash command (control plane) NEVER writes run state directly. All file mutations go through `bin/tumble-dry.cjs` subcommands. This keeps `bin/tumble-dry-loop.cjs` (headless CI fallback) byte-compatible.
6. **Subagents cannot spawn subagents.** Reviewer/audience/auditor/editor subagents are pure workers — they receive a brief and write a file. No nested dispatch. (Enforced architecturally — the slash command is the only fanout site.)

## Deviations from Plan

None — plan executed exactly as written. The action block in Task 1 was prescriptive enough that the rewrite is a near-direct transcription of the spec into orchestrator prose.

## Self-Check: PASSED

- FOUND: commands/tumble-dry.md (307 lines)
- FOUND: commit 0ce7d54
- FOUND: all 18 automated verify-block checks pass (0 failures)
- FOUND: all 8 plan-level `<verification>` grep checks return hits

## Threat Flags

None. This plan modifies a slash command body only — no new network endpoints, auth paths, or schema surfaces. The validator gate at startup actually *reduces* surface (forces plugin-spec compliance before any dispatch).
