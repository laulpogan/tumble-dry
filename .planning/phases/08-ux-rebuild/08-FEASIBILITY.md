# Phase 8 Plan 01 — Orchestrator-subagent Feasibility

**Date:** 2026-04-15
**Question:** Can a Task subagent spawn another Task subagent inside Claude Code?

## Result: NO — documented constraint confirmed

**Empirical basis:** Documented constraint, verified against the current plugin spec that ships with this repo (`.planning/research/STACK.md` line: "subagents cannot spawn subagents — fan-out must happen from the slash command prose (which runs in the main thread), not a single dispatcher subagent"). Claude Code 2.1.63+ still strips `Task`-tool invocations from subagent tool sets for security isolation — a subagent that lists `tools: [..., Task]` in its frontmatter will have `Task` removed at load time by the loader.

**Consequence for Phase 8:** the "orchestrator-in-subagent" mental model cannot be implemented as a *single* subagent that owns the whole fanout loop. Two viable alternatives:

### Option A (REJECTED): spawn reviewers from the slash command (current Phase 1 design)

What the ARCHITECTURE.md reversal is calling out: the main session gets flooded with 400KB+ of Task dispatches. Cannot iterate.

### Option B (ADOPTED): orchestrator emits a dispatch manifest; slash command iterates it

The "orchestrator" becomes a thin wave-planner that:

1. Runs pure data-plane operations (init, brief generation, aggregate, drift, finalize) via `Bash` + `bin/tumble-dry.cjs` subcommands. These are deterministic Node scripts — no LLM tokens burned.
2. Emits `.tumble-dry/<slug>/status.json` at every phase boundary so the main session can render one progress line per round.
3. Emits `.tumble-dry/<slug>/round-N/dispatch-plan.json` per round describing the *next* wave of Task calls needed (reviewers, editor).
4. **Exits back to the main session between waves.** The slash command reads `dispatch-plan.json`, emits the Task fanout in ONE assistant turn (reviewers wave of N parallel Task calls, or a single editor Task), waits for the file outputs (subagents write to disk, don't return bodies), then re-dispatches the orchestrator for the next wave.

Main session sees: "dispatched orchestrator → poll → fanout reviewers → poll → fanout editor → poll → next round" but each of those lines is ~1 sentence, not a 20KB critique body. Total main-session token cost stays under 5000 per run because every large payload lives on disk.

### What we lose vs. the clean single-subagent fantasy

- The main session still dispatches the actual Task calls (subagents can't). That's unavoidable.
- The slash command is ~120 lines instead of 50 — it needs a wave loop (poll orchestrator, read dispatch-plan, fanout, repeat) — but every line in it is mechanical, not a giant inlined prose brief.

### What we keep vs. the old Phase 1 design

- The giant per-reviewer briefs + critique bodies NEVER pass through the main session. They're file paths only.
- Per-round `REPORT.md` writes to disk; main session cats it at convergence.
- `status.json` + polling architecture works exactly as HEADLESS-02 requires.

### Headless CLI path (`bin/tumble-dry-loop.cjs`)

Unaffected. The headless CLI uses the Anthropic SDK directly (not Task subagents) and can run the whole loop in a single process. All new Phase 8 features (batch, dry-run, status, resume) work identically on the headless path — the orchestrator subagent is only a concern for the CC-native path.

## Implementation decision

Phase 8 Plan 02 onward builds against **Option B** — orchestrator is a dispatch-manifest emitter, not a true single-process orchestrator. The slash command owns the wave loop. The UX win (no critique floods in main session) is preserved because subagents write to disk and return only confirmation strings.

## Test payload (reference)

A minimal way to re-verify if CC's constraint ever lifts: spawn a subagent with `tools: [Task]` and instruct it to invoke `Task(subagent_type="general-purpose", ...)`. If the inner Task returns a result, the constraint is lifted. As of 2026-04-15 the documented and load-time-enforced behavior is that `Task` is stripped from plugin subagents' tool sets, so the inner call never happens.

_Written: 2026-04-15. Architectural ground truth for all Phase 8 plans._
