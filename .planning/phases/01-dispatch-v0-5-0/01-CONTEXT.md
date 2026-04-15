# Phase 1: DISPATCH (v0.5.0) - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning
**Mode:** Auto-generated (workflow.skip_discuss=true)

<domain>
## Phase Boundary

User runs `/tumble-dry <artifact>` from inside Claude Code with zero setup and the full convergence loop completes via parallel subagent fanout.

**In-scope:**
- Claude Code-native dispatch via parallel `Task`/`Agent` subagent calls — no API key required.
- `.claude-plugin/marketplace.json` + `.claude-plugin/plugin.json` plugin spec compliance.
- `agents/*.md` frontmatter migration (drop `tumble-dry-` prefix; conform to current spec).
- `commands/tumble-dry.md` rewritten as prose orchestrator that fans out reviewers in ONE assistant turn and reads `aggregate.md` only (filesystem IPC).
- `bin/validate-plugin.cjs` — CI-gated cross-check of agent names against marketplace manifest.
- Failure-mode taxonomy (`dispatch-errors.md`); pre-dispatch manifest + glob reconciliation; partial-round policy.
- `bin/tumble-dry-loop.cjs` headless API path retained as CI/scripting fallback.

**Out-of-scope (deferred to later phases):**
- Persona library (Phase 2 PERSONA).
- Voice-drift gate, drift split, dedup upgrade (Phase 3 CORE-HARDEN).
- Office format ingestion (Phase 4 FORMAT).
- Code-aware features (Phase 5 CODE).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — discuss phase was skipped per user setting. Use ROADMAP phase goal, success criteria from `.planning/ROADMAP.md`, and the load-bearing decisions in `.planning/research/SUMMARY.md` to guide decisions.

Specifically grounded by research:
- Slash-command-prose IS the orchestrator (NOT a dispatcher subagent, NOT MCP) — see ARCHITECTURE.md §1 Q1.
- Parallel Task fanout is a hard syntactic constraint — all N reviewer Task calls in ONE assistant turn.
- Filesystem is IPC — orchestrator reads `aggregate.md` (5–10KB) only; subagents write to per-round paths from brief.
- Subagents cannot spawn subagents — confirmed by STACK.md.
- Plugin-shipped agents cannot use `hooks`, `mcpServers`, `permissionMode` frontmatter (silently stripped).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bin/tumble-dry.cjs` — full data-plane CLI (init, brief-*, aggregate, drift, extract-redraft, finalize). Reuse unchanged for both control planes.
- `bin/tumble-dry-loop.cjs` — current loop driver (API path). Keep as headless fallback; do NOT rewrite, only update docstring.
- `agents/audience-inferrer.md`, `agents/assumption-auditor.md`, `agents/reviewer.md`, `agents/editor.md` — existing subagent specs. Frontmatter needs `tumble-dry-` prefix removed and spec compliance.
- `lib/dispatch.cjs` + `lib/dispatch-api.cjs` — API dispatch (kept for headless path).

### Established Patterns
- Brief assembly via `lib/reviewer-brief.cjs` produces self-contained briefs that can be passed to either dispatch path.
- `lib/run-state.cjs` manages slug/runDir/working.md/history snapshots — same on both paths.
- `lib/aggregator.cjs` reads critique files from disk and produces `aggregate.md` + `aggregate.json` + convergence boolean — pure data-plane function.
- All file IO goes through `bin/tumble-dry.cjs` data-plane subcommands. Slash command must shell out, not write files directly.

### Integration Points
- `commands/tumble-dry.md` — currently shells out to `bin/tumble-dry-loop.cjs`. Will be rewritten to orchestrate via Bash + parallel Task calls. THIS is the phase's main artifact.
- `marketplace.json` — currently at repo root. Move to `.claude-plugin/marketplace.json`.
- New: `.claude-plugin/plugin.json` — plugin manifest required by current CC plugin spec.

</code_context>

<specifics>
## Specific Ideas

- Validation: `bin/validate-plugin.cjs` should fail loudly on missing `.claude-plugin/plugin.json`, missing `.claude-plugin/marketplace.json`, agent name mismatch, or use of forbidden frontmatter fields.
- Partial-round policy threshold: `M/N >= 0.6` AND material > 0 → proceed with degradation warning. Else retry-once with stricter brief. Else abort with diagnostic.
- Slash-command status output should match existing `[tumble-dry-loop]` log idiom for consistency.

</specifics>

<deferred>
## Deferred Ideas

- Empirical wall-clock benchmark for parallel Task fanout (N=7) — recommended to time during early plan execution, but not blocking phase 1 completion.
- Trace-fidelity degradation messaging — accepted scope narrowing; documented in README + polish-log.md per CORE-04 footnote.

</deferred>
