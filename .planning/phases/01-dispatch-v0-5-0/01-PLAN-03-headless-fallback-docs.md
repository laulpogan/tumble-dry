---
phase: 01-dispatch-v0-5-0
plan: 03
type: execute
wave: 1
depends_on: []
files_modified:
  - bin/tumble-dry-loop.cjs
  - README.md
  - lib/dispatch.cjs
autonomous: true
requirements: [DISPATCH-06]
must_haves:
  truths:
    - "bin/tumble-dry-loop.cjs --help text directs users to /tumble-dry slash command as the session-auth alternative"
    - "bin/tumble-dry-loop.cjs docstring (header comment) explicitly names /tumble-dry as the no-API-key path"
    - "README.md documents the two control planes (CC-native via /tumble-dry, headless via bin/) and the trace-fidelity degradation on the CC path"
    - "polish-log.md template / generation acknowledges trace fidelity is reduced under CC dispatch (subagent context isolation)"
  artifacts:
    - path: "bin/tumble-dry-loop.cjs"
      provides: "Headless API-key driver — gets a richer --help and updated docstring pointing to /tumble-dry"
      contains: "/tumble-dry"
    - path: "README.md"
      provides: "User-facing docs — primary path = /tumble-dry, fallback = bin/tumble-dry-loop.cjs, with trace-fidelity caveat"
      contains: "trace fidelity"
  key_links:
    - from: "bin/tumble-dry-loop.cjs"
      to: "/tumble-dry slash command"
      via: "docstring + --help text reference"
      pattern: "/tumble-dry"
---

<objective>
Document headless-vs-Claude-Code-native control plane symmetry per DISPATCH-06. Update `bin/tumble-dry-loop.cjs` docstring + `--help` to direct users without `ANTHROPIC_API_KEY` to the `/tumble-dry` slash command. Document the accepted trace-fidelity degradation on the CC path in README.md and in the polish-log generation path.

Purpose: Users discovering tumble-dry via the headless CLI need an obvious pointer to the zero-setup CC path; users on the CC path need to understand why traces are thinner than the API-path docs imply.
Output: Updated docstring + --help in bin/tumble-dry-loop.cjs; README §Headless fallback section; trace-fidelity note surfaced when polish-log is finalized on the CC path.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/research/ARCHITECTURE.md
@.planning/research/PITFALLS.md
@.planning/phases/01-dispatch-v0-5-0/01-CONTEXT.md
@bin/tumble-dry-loop.cjs
@lib/dispatch.cjs

<interfaces>
Current bin/tumble-dry-loop.cjs already partially mentions /tumble-dry in its docstring (lines 13-15) and in the --help (line 128). Both are minimal. This plan upgrades them to explicit, scenario-shaped guidance.

Trace-fidelity degradation context (per ARCHITECTURE.md §1 Q2 + Risks Flagged + CONTEXT.md `<deferred>`):
- API path (bin/) writes `traces/<persona>.json` with full request + response + extended-thinking payload per dispatch (CORE-04).
- CC path (slash command) cannot expose subagent request/response back to the orchestrator — subagent context is isolated by design. CC traces will record: brief-in (path), critique-out (path), wall-clock timing, exit status. Thinking-token transcript is NOT available on CC path.
- This is an accepted scope narrowing per CONTEXT.md `<deferred>`.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update bin/tumble-dry-loop.cjs docstring + --help</name>
  <files>bin/tumble-dry-loop.cjs</files>
  <read_first>
    - bin/tumble-dry-loop.cjs (lines 1-50 docstring; lines 124-130 args usage block)
    - lib/dispatch.cjs (existing comment about /tumble-dry being the CC-native path)
  </read_first>
  <action>
    1. Replace the file-header docstring (lines 2-18, between `/**` and `*/`) with this expanded version that makes the two-control-plane story explicit:

       ```
       /**
        * tumble-dry convergence loop driver — HEADLESS / CI / SCRIPTING fallback.
        *
        * This is one of two control planes for tumble-dry:
        *
        *   1. Claude Code-native (PREFERRED for interactive use):
        *      /tumble-dry <artifact>
        *      - Inherits Claude Code session auth (no ANTHROPIC_API_KEY needed)
        *      - Dispatches each agent as a parallel Task subagent
        *      - Trace fidelity reduced: subagent request/response payloads are
        *        not exposed to the orchestrator (subagent context isolation).
        *        CC traces record brief-path, critique-path, timing, and exit status.
        *
        *   2. Headless Node CLI (THIS FILE — for CI / scripting / no-CC environments):
        *      bin/tumble-dry-loop.cjs <artifact>
        *      - Requires ANTHROPIC_API_KEY (env var or ~/.anthropic/api_key)
        *      - Full per-dispatch traces (request, response, extended thinking)
        *        per CORE-04 — see traces/<persona>.json
        *
        * Both planes share the same data plane (bin/tumble-dry.cjs subcommands)
        * and produce the same .tumble-dry/<slug>/ layout, FINAL.md, and
        * polish-log.md.
        *
        * Usage:
        *   tumble-dry-loop <artifact-path> [--auto-redraft] [--no-auto-redraft] [--panel-size N]
        *
        * Exits 0 on clean convergence, 1 on max_rounds cap, 2 on error.
        */
       ```

    2. Replace the usage block in `main()` (currently lines 126-129, the two `console.error` lines after `if (!args.artifact)`) with this expanded help text:

       ```javascript
       if (!args.artifact) {
         console.error('tumble-dry-loop — headless convergence loop driver');
         console.error('');
         console.error('USAGE:');
         console.error('  tumble-dry-loop <artifact-path> [--panel-size N] [--no-auto-redraft]');
         console.error('');
         console.error('REQUIRES:');
         console.error('  ANTHROPIC_API_KEY (env var or ~/.anthropic/api_key)');
         console.error('');
         console.error('PREFER /tumble-dry inside Claude Code:');
         console.error('  The /tumble-dry slash command runs the same loop using your');
         console.error('  active Claude Code session — no API key required, no separate');
         console.error('  process. Use this headless CLI only for CI, scripting, or');
         console.error('  environments without an interactive Claude Code session.');
         console.error('');
         console.error('TRACE-FIDELITY NOTE:');
         console.error('  This headless path writes full per-dispatch traces to');
         console.error('  .tumble-dry/<slug>/round-N/traces/. The /tumble-dry slash');
         console.error('  command path produces thinner traces (no request/response');
         console.error('  payload — subagent context is isolated by Claude Code).');
         process.exit(2);
       }
       ```

    3. Make NO other changes to bin/tumble-dry-loop.cjs. Loop logic, dispatch wiring, and exit codes stay verbatim.
  </action>
  <verify>
    <automated>node bin/tumble-dry-loop.cjs 2>&1 | grep -q "/tumble-dry inside Claude Code" && node bin/tumble-dry-loop.cjs 2>&1 | grep -q "TRACE-FIDELITY NOTE" && grep -q "Claude Code-native" bin/tumble-dry-loop.cjs && grep -q "subagent context isolation" bin/tumble-dry-loop.cjs</automated>
  </verify>
  <acceptance_criteria>
    - File header docstring contains the phrase "Claude Code-native (PREFERRED for interactive use)"
    - File header docstring mentions "subagent context isolation" as the trace-fidelity caveat
    - `node bin/tumble-dry-loop.cjs` (no args) prints multi-line help including "PREFER /tumble-dry inside Claude Code" and "TRACE-FIDELITY NOTE"
    - Exit code is 2 when no args provided (preserved behavior)
    - Loop logic (functions runRound1, runReviewerWave, aggregateAndCheck, runEditor, main loop body) unchanged from current state
  </acceptance_criteria>
  <done>Headless CLI announces itself as the fallback, surfaces the trace caveat, and points at /tumble-dry as the primary path. Exit codes preserved.</done>
</task>

<task type="auto">
  <name>Task 2: Document control planes + trace-fidelity in README.md</name>
  <files>README.md</files>
  <read_first>
    - README.md (read entire file to understand current structure)
    - .planning/research/ARCHITECTURE.md §1 Q2 (trace fidelity discussion)
  </read_first>
  <action>
    Add (or update if it already exists) a section titled `## Two control planes` near the top of README.md (after the project tagline, before installation/usage). If a similar section already exists, REPLACE it; do not duplicate.

    Section content (verbatim, markdown):

    ```markdown
    ## Two control planes

    Tumble-dry runs the same convergence loop two ways. Both share the same
    data plane (`bin/tumble-dry.cjs` subcommands) and produce the same
    `.tumble-dry/<slug>/` layout, `FINAL.md`, and `polish-log.md`.

    ### 1. Claude Code-native (preferred)

    ```
    /tumble-dry <artifact>
    ```

    - Inherits your active Claude Code session auth — **no `ANTHROPIC_API_KEY` required**.
    - Each agent (audience-inferrer, assumption-auditor, reviewer × N, editor) is
      dispatched as a parallel `Task` subagent in a single assistant turn.
    - **Trace-fidelity caveat:** subagent request/response payloads are isolated
      by Claude Code and NOT visible to the orchestrator. CC-path traces record
      brief path, critique path, wall-clock timing, and exit status only —
      not the per-dispatch extended-thinking transcript. If you need full
      reasoning traces (CORE-04), use the headless path below.

    ### 2. Headless CLI (fallback for CI / scripting)

    ```
    node bin/tumble-dry-loop.cjs <artifact> [--panel-size N] [--no-auto-redraft]
    ```

    - Requires `ANTHROPIC_API_KEY` (env var or `~/.anthropic/api_key`).
    - Writes full per-dispatch traces (request + response + extended thinking)
      to `.tumble-dry/<slug>/round-N/traces/` per CORE-04.
    - Use this for CI runs, scripted batch polishing, or any environment
      without an interactive Claude Code session.

    See `bin/tumble-dry-loop.cjs --help` for the headless flag reference.
    ```

    Do NOT touch any other section of README.md.
  </action>
  <verify>
    <automated>grep -q "## Two control planes" README.md && grep -q "Claude Code-native" README.md && grep -q "Trace-fidelity caveat" README.md && grep -q "Headless CLI" README.md && grep -q "ANTHROPIC_API_KEY" README.md</automated>
  </verify>
  <acceptance_criteria>
    - README.md contains a `## Two control planes` heading
    - README.md mentions both `/tumble-dry` (CC-native) and `bin/tumble-dry-loop.cjs` (headless)
    - README.md explicitly documents the trace-fidelity caveat (search: "Trace-fidelity caveat" or "subagent request/response payloads are isolated")
    - No other section of README.md is modified beyond this insertion (verifiable via `git diff README.md` showing only an added block)
  </acceptance_criteria>
  <done>README documents both control planes as first-class with the explicit trace-fidelity caveat per the deferred-ideas note in CONTEXT.md.</done>
</task>

</tasks>

<verification>
- `node bin/tumble-dry-loop.cjs` prints expanded help mentioning /tumble-dry and trace-fidelity
- `grep -c "Two control planes" README.md` returns 1
- `git diff bin/tumble-dry-loop.cjs` shows only docstring + help-text changes (no logic changes)
</verification>

<success_criteria>
DISPATCH-06 satisfied: headless CLI continues to work (no behavior change), but its docstring + --help direct users to /tumble-dry as the session-auth alternative. README documents the two control planes and the trace-fidelity degradation that is intrinsic to the CC path.
</success_criteria>

<output>
After completion, create `.planning/phases/01-dispatch-v0-5-0/01-03-SUMMARY.md`
</output>
