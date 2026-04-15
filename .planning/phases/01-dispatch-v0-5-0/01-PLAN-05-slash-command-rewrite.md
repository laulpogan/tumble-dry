---
phase: 01-dispatch-v0-5-0
plan: 05
type: execute
wave: 3
depends_on: ["01-PLAN-02-agent-frontmatter-migration", "01-PLAN-04-plugin-validator"]
files_modified:
  - commands/tumble-dry.md
autonomous: true
requirements: [DISPATCH-01, DISPATCH-02, DISPATCH-05, DISPATCH-07, DISPATCH-08]
must_haves:
  truths:
    - "User runs /tumble-dry <artifact> in Claude Code with no ANTHROPIC_API_KEY set and the full convergence loop completes via parallel subagent fanout"
    - "All N reviewers in a round are dispatched in ONE assistant turn (parallel Task calls in a single message), not serially across turns — Pitfall 1"
    - "Orchestrator reads aggregate.md only (5–10KB), NOT raw critique files — Pitfall 4 (context-bloat)"
    - "Pre-dispatch manifest written before each fanout; post-fanout glob reconciliation refuses to converge on partial sets — Pitfall 1"
    - "Failure-mode taxonomy logged to .tumble-dry/<slug>/round-N/dispatch-errors.md (timeout, malformed output, refusal, silent-text-instead-of-file) — Pitfall 5"
    - "Partial-round policy enforced: M/N >= 0.6 AND material > 0 → proceed with degradation warning; else retry-once with stricter brief; else abort with diagnostic — Pitfall 5"
    - "Per-round status surfaced to the user using the existing [tumble-dry-loop] log idiom (round N starting, M/N reviewers returned, K material findings, converged|continuing) — DISPATCH-07"
    - "Slash command body is prose orchestration (numbered steps with explicit Bash + Task fanout instructions), not a thin shell-out to bin/tumble-dry-loop.cjs — DISPATCH-05"
    - "Data plane unchanged: every state mutation goes through bin/tumble-dry.cjs subcommands (init, brief-*, aggregate, drift, extract-redraft, finalize) — control plane never writes files directly"
  artifacts:
    - path: "commands/tumble-dry.md"
      provides: "CC-native slash command — prose orchestrator that runs the convergence loop via parallel Task subagent fanout in the user's active session"
      min_lines: 200
      contains: "dispatch-errors.md"
  key_links:
    - from: "commands/tumble-dry.md (Bash steps)"
      to: "bin/tumble-dry.cjs (data-plane subcommands)"
      via: "shell-out for init, brief-*, aggregate, drift, extract-redraft, finalize"
      pattern: "node \\$TD_HOME/bin/tumble-dry\\.cjs"
    - from: "commands/tumble-dry.md (Task fanout block)"
      to: "agents/{audience-inferrer,assumption-auditor,reviewer,editor}.md"
      via: "Task(subagent_type=...) calls in single assistant message"
      pattern: "Task\\(.*subagent_type"
    - from: "commands/tumble-dry.md (aggregate read)"
      to: ".tumble-dry/<slug>/round-N/aggregate.md"
      via: "single Read of aggregate.md, NEVER raw critique-*.md files"
      pattern: "aggregate\\.md"
---

<objective>
Rewrite `commands/tumble-dry.md` from its current "thin shell-out to bin/tumble-dry-loop.cjs" form into a full prose orchestrator that runs the convergence loop using Claude Code's parallel Task subagent dispatch — no `ANTHROPIC_API_KEY` required. Closes DISPATCH-01 (zero-API-key dispatch), DISPATCH-05 (loop-logic-in-prose), DISPATCH-07 (per-round status), DISPATCH-08 (failure-mode taxonomy + partial-round policy + pre-dispatch manifest + glob reconciliation). DISPATCH-02 is partly closed by the validator (Plan 04); the slash command must invoke the validator at startup.

Purpose: This is the keystone artifact of v0.5.0 — without it, tumble-dry remains "another CLI tool with an API-key dep" instead of "a slash command anyone can run." Every downstream phase dogfoods on this orchestrator.
Output: A single rewritten `commands/tumble-dry.md` file (~250-400 lines) containing prose-orchestration instructions Claude Code's main thread executes turn-by-turn.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/REQUIREMENTS.md
@.planning/ROADMAP.md
@.planning/research/SUMMARY.md
@.planning/research/STACK.md
@.planning/research/ARCHITECTURE.md
@.planning/research/PITFALLS.md
@.planning/phases/01-dispatch-v0-5-0/01-CONTEXT.md
@.planning/phases/01-dispatch-v0-5-0/01-02-SUMMARY.md
@.planning/phases/01-dispatch-v0-5-0/01-04-SUMMARY.md
@bin/tumble-dry-loop.cjs
@commands/tumble-dry.md
@agents/audience-inferrer.md
@agents/assumption-auditor.md
@agents/reviewer.md
@agents/editor.md

<interfaces>
**Data-plane CLI surface (bin/tumble-dry.cjs subcommands — DO NOT modify; only invoke):**
The slash command must shell out to these for every state mutation. Subcommands present in the existing data plane (sourced from bin/tumble-dry-loop.cjs invocations):

- `init <artifact-path>` → emits `slug` + creates `.tumble-dry/<slug>/{working.md, history/round-0-original.<ext>}` and `artifact.path`
- `brief-audience <slug> <round> <panel_size> <audience_override-or-dash>` → writes `round-N/brief-audience.md`
- `brief-auditor <slug> <round>` → writes `round-N/brief-auditor.md`
- `brief-reviewers <slug> <round>` → emits JSON to stdout: `[{slug, brief_path}, ...]` and writes `round-N/brief-reviewer-<persona>.md` files
- `brief-editor <slug> <round>` → writes `round-N/brief-editor.md`
- `aggregate <slug> <round>` → reads `round-N/critique-*.md`, writes `round-N/{aggregate.md, aggregate.json}`, exits 0; aggregate.json contains convergence boolean + per-reviewer counts + material/structural counts
- `extract-redraft <slug> <round>` → emits staged-redraft path on stdout
- `drift <slug> <round> <artifact-abs-path> <staged-redraft-path>` → emits drift-report JSON
- `finalize <slug>` → writes `FINAL.md` + `polish-log.md`

(Loop driver bin/tumble-dry-loop.cjs already calls these — see lines 51-122 — slash command mirrors the same call pattern but replaces `dispatchWave` with parallel Task calls.)

**Subagent dispatch convention (per ARCHITECTURE.md §1 Q2 + agents/*.md):**
Each subagent's brief is a file path. The Task prompt is: "Read the brief at <brief-path>. Follow its instructions. Write your output to <target-file-path>. Reply only with confirmation '<wrote target-file-path>' — do NOT include the deliverable in your reply (it goes to disk)."

**Filesystem-IPC invariant (Pitfall 4):**
- After every Task fanout wave, run a Bash step that reads ONLY the aggregate (or runs the data-plane subcommand that reads files from disk). Never `Read` individual critique-*.md files into the main session context.
- Editor's redraft is extracted via `extract-redraft` Bash subcommand → main session sees only the path, not the redraft body.

**Pre-dispatch manifest format (Pitfall 1):**
Before each fanout wave, write `round-N/dispatch-manifest.json`:
```json
{
  "wave": "reviewers",
  "expected": ["reviewer-cfo", "reviewer-vc", "reviewer-eng", ...],
  "spawned_at": "<ISO timestamp>",
  "round": N
}
```
After fanout, glob `round-N/critique-*.md` and reconcile against `expected`. If any expected file is missing, that's a partial round → apply partial-round policy.

**Partial-round policy (DISPATCH-08, from CONTEXT.md `<specifics>`):**
- Let M = files-actually-written, N = expected count
- If M/N >= 0.6 AND parsed material findings > 0: proceed with `aggregate.md` annotated "panel degraded: M/N reviewers returned"
- Else retry-once with a stricter brief reminder appended to the brief: "CRITICAL: Your only output is the file at <path>. Do not return text in chat. Use exactly the H2-header + **severity:**/**summary:** schema or the aggregator will discard your critique."
- Else abort the round and write `dispatch-errors.md` listing each missing/failed persona with diagnosis.

**Failure-mode taxonomy for dispatch-errors.md (DISPATCH-08 + Pitfall 5):**
- `timeout` — Task harness reported timeout
- `malformed_output` — file written but contains zero parsed `## ` headers (aggregator parser would emit zero findings)
- `refusal` — file body contains "I can't" / "I'm not able to critique" / "I'm not comfortable" with zero findings
- `silent_text_return` — Task returned text in chat but no file at expected path
- Each entry: `{persona, mode, detail, retry_attempted: bool}`

**Status idiom (DISPATCH-07):**
Match the existing `[tumble-dry-loop]` log style from bin/tumble-dry-loop.cjs:44 — `console.error('[tumble-dry-loop]', ...)`. Slash-command prose surfaces these via plain prose lines (no need to literally use console.error from prose; the format is `[tumble-dry-loop] round N starting`, `[tumble-dry-loop] M/N reviewers returned`, `[tumble-dry-loop] K material / J minor / I structural`, `[tumble-dry-loop] converged|continuing|drift-blocked`).

**Validator gate (DISPATCH-02):**
First Bash step after `Resolve plugin home`: `node "$TD_HOME/bin/validate-plugin.cjs" --root "$TD_HOME"`. Exit non-zero → halt the slash command with a clear message: "Plugin spec validation failed — see stderr above. Run `node $TD_HOME/bin/validate-plugin.cjs --root $TD_HOME` to debug."

**Frontmatter for the slash command (preserve current shape, update description):**
```yaml
---
description: Polish content via simulated public contact — parallel reviewer personas, assumption audit, voice-preserving editor, converges on material findings. Runs in your active Claude Code session — no API key required.
argument-hint: <filepath> [--audience "..."] [--panel-size N] [--no-auto-redraft]
---
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rewrite commands/tumble-dry.md as full prose orchestrator</name>
  <files>commands/tumble-dry.md</files>
  <read_first>
    - commands/tumble-dry.md (current thin-shell-out version — replace entirely)
    - bin/tumble-dry-loop.cjs (lines 51-180 — exact data-plane call sequence to mirror in prose)
    - .planning/research/ARCHITECTURE.md §3 Data flow per round (CC-native path) — the canonical sequence
    - .planning/research/PITFALLS.md Pitfalls 1, 2, 3, 4, 5 (failure modes the orchestrator must defend against)
    - agents/reviewer.md (target output schema — H2 + **severity:** + **summary:** lines)
    - .planning/phases/01-dispatch-v0-5-0/01-CONTEXT.md `<specifics>` (partial-round threshold = 0.6)
  </read_first>
  <action>
    Replace the entire contents of `commands/tumble-dry.md` with a prose-orchestrator markdown document. Structure (use exactly these top-level H2 headings in this order):

    **Frontmatter** (use the YAML block from `<interfaces>` above verbatim).

    **# /tumble-dry** — one-paragraph description.

    **## Resolve plugin home** — keep the existing bash block (lines 12-20 of current file), unchanged.

    **## Validate plugin spec compliance** — new section. Bash:
    ```bash
    if ! node "$TD_HOME/bin/validate-plugin.cjs" --root "$TD_HOME" 2>&1; then
      echo "[tumble-dry-loop] FATAL: plugin spec validation failed (see above)"
      echo "[tumble-dry-loop] Fix the validation errors and re-run /tumble-dry"
      exit 2
    fi
    ```

    **## Parse arguments** — instructions to parse `$ARGUMENTS` into `ARTIFACT`, `AUDIENCE_OVERRIDE`, `PANEL_SIZE`, `NO_AUTO_REDRAFT`. If `--paste`, open `$EDITOR` on a tempfile. If no artifact, error with exit 2.

    **## Initialize the run** — Bash step calling `node "$TD_HOME/bin/tumble-dry.cjs" init "$ARTIFACT"`, capture `SLUG` from output. Echo: `[tumble-dry-loop] slug=$SLUG starting at round 1`.

    **## Round loop** — prose specifying: `for ROUND in 1..MAX_ROUNDS:` (where MAX_ROUNDS comes from config; default 5).

    Inside the loop, in this exact order with these exact subsection headings:

    **### Round N: Generate briefs** (Bash):
    - If ROUND == 1: `brief-audience` + `brief-auditor` (two parallel data-plane calls — they're independent file writes, can run as `... &` background jobs and `wait`).
    - Always: after Round 1 completes its audience+auditor wave, generate reviewer briefs via `brief-reviewers $SLUG $ROUND` and capture the JSON output. Parse the JSON to extract per-persona brief paths and target critique paths.

    **### Round N: Write pre-dispatch manifest** (Bash):
    Write `round-N/dispatch-manifest.json` with shape from `<interfaces>` — list of expected critique filenames + ISO timestamp + round number.

    **### Round N: Audience + Auditor fanout** (Round 1 only — Task block):
    Single assistant turn, two parallel Task calls:
    - `Task(subagent_type="audience-inferrer", description="Infer audience panel", prompt=<read brief-audience.md and instruction to write to round-1/audience.md>)`
    - `Task(subagent_type="assumption-auditor", description="Surface load-bearing assumptions", prompt=<read brief-auditor.md and instruction to write to round-1/assumption-audit.md>)`

    **### Round N: Verify Round-1 wave outputs** (Round 1 only — Bash):
    `test -f .tumble-dry/$SLUG/round-1/audience.md && test -f .tumble-dry/$SLUG/round-1/assumption-audit.md`. On miss, append entries to `dispatch-errors.md` with mode=`silent_text_return`, retry once with stricter brief, then abort if still missing.

    **### Round N: Reviewer fanout (PARALLEL — ONE ASSISTANT TURN)** — Task block. CRITICAL prose: "Spawn ALL N reviewer Task calls in a SINGLE assistant message (one turn). Do NOT spawn them one at a time across turns — that triggers serial execution and Pitfall 1 (false convergence on partial rounds)."

    For each reviewer brief in the JSON from `brief-reviewers`:
    `Task(subagent_type="reviewer", description="Critique through persona <persona>", prompt=<persona-specific brief contents + 'Write your critique to round-N/critique-<persona>.md. Reply only "wrote critique-<persona>.md" — do NOT include the critique body in your reply.'>)`

    **### Round N: Glob reconciliation + partial-round policy** (Bash):
    ```bash
    EXPECTED=$(jq -r '.expected[]' .tumble-dry/$SLUG/round-$ROUND/dispatch-manifest.json | sort)
    ACTUAL=$(ls .tumble-dry/$SLUG/round-$ROUND/critique-*.md 2>/dev/null | xargs -n1 basename | sed 's/^critique-//;s/\.md$//' | sort)
    MISSING=$(comm -23 <(echo "$EXPECTED") <(echo "$ACTUAL"))
    M=$(echo "$ACTUAL" | grep -c .); N=$(echo "$EXPECTED" | grep -c .)
    echo "[tumble-dry-loop] round $ROUND M/N reviewers returned: $M/$N"
    if [ -n "$MISSING" ]; then
      # Append to dispatch-errors.md with mode=silent_text_return for each missing persona
      ...
      RATIO=$(awk "BEGIN{print $M/$N}")
      if awk "BEGIN{exit !($RATIO >= 0.6)}"; then
        echo "[tumble-dry-loop] partial round (M/N=$RATIO >= 0.6) — proceeding with degradation"
        # annotate aggregate.md after aggregate step
      else
        echo "[tumble-dry-loop] partial round (M/N=$RATIO < 0.6) — retrying missing personas once"
        RETRY_NEEDED=1
      fi
    fi
    ```
    Spell out the retry-once flow: regenerate stricter brief for each missing persona (append "CRITICAL: ..." line per `<interfaces>`), spawn another Task wave (in ONE turn), re-reconcile. If still missing after retry, abort with diagnostic written to `dispatch-errors.md`.

    **### Round N: Aggregate** (Bash):
    `node "$TD_HOME/bin/tumble-dry.cjs" aggregate "$SLUG" "$ROUND"`. Then read aggregate.json (NOT the raw critique files) to extract `material_count`, `structural_count`, `converged` boolean. Echo `[tumble-dry-loop] round $ROUND aggregate — raw=... material=... structural=... converged=...`.

    Per Pitfall 4: explicitly DO NOT use the Read tool on individual `critique-*.md` files in this section. The aggregate step reads them via Bash; only `aggregate.md` (5-10KB) returns to main session context — and even that should be read via Bash `cat` head/tail snippets if needed for status, not pulled wholesale into context.

    **### Round N: Convergence check + finalize-or-redraft branch** (prose):
    - If `converged == true`: Bash `node "$TD_HOME/bin/tumble-dry.cjs" finalize "$SLUG"`. Echo `[tumble-dry-loop] ✓ converged at round $ROUND`. Show user the FINAL.md and polish-log.md paths. Exit loop.
    - If `ROUND >= MAX_ROUNDS`: Bash `finalize`. Echo `[tumble-dry-loop] ⚠ hit max_rounds without convergence`. Exit loop.
    - If `--no-auto-redraft` set: Echo and exit loop.
    - Else: continue to editor step.

    **### Round N: Editor brief + redraft** (Bash + Task):
    - Bash: `brief-editor $SLUG $ROUND`.
    - Task block (single Task call in its own turn):
      `Task(subagent_type="editor", description="Voice-preserving redraft", prompt=<editor brief contents + 'Write proposed-redraft.md to round-N/. Reply only with confirmation.'>)`
    - Bash: extract-redraft → drift report → snapshotHistory(input) → overwrite working.md → snapshotHistory(output). Mirror lines 110-121 of bin/tumble-dry-loop.cjs.
    - Echo `[tumble-dry-loop] round $ROUND drift score=...`.
    - Increment `ROUND` and continue loop.

    **## Failure-mode taxonomy** — appendix-style section explaining the four modes (timeout / malformed_output / refusal / silent_text_return) and their detection heuristics. Reference `dispatch-errors.md`.

    **## Notes** — keep concise: shared data plane with bin/tumble-dry-loop.cjs (CI/scripting fallback); plugin home resolution; `--paste` mode; trace-fidelity caveat (link to README).

    **Hard constraints to bake into the prose:**
    1. Every reviewer wave (and every retry wave) MUST be ONE assistant message containing N parallel Task calls — repeat this constraint inline next to every Task fanout block.
    2. After any Task fanout, the next step is ALWAYS a Bash glob/reconcile, never a Read of individual outputs.
    3. The aggregator (Bash) is the only place critique files are read. Main session context never sees a critique body.
    4. Editor's redraft body is also read only by data-plane Bash (`extract-redraft`); main session sees only the staged-redraft path.
    5. Every Bash status line uses the `[tumble-dry-loop]` prefix for consistency with the headless path's log idiom.
  </action>
  <verify>
    <automated>node -e "
    const fs=require('fs');
    const t=fs.readFileSync('commands/tumble-dry.md','utf-8');
    const checks=[
      ['frontmatter present',/^---\nname:|^---\ndescription:/m],
      ['validator invocation',/validate-plugin\.cjs/],
      ['parallel fanout warning',/ONE ASSISTANT TURN|one assistant message|single assistant message|in a single message/i],
      ['Task fanout block',/Task\(.*subagent_type/],
      ['reviewer subagent referenced',/subagent_type=\"?reviewer/],
      ['editor subagent referenced',/subagent_type=\"?editor/],
      ['audience-inferrer referenced',/subagent_type=\"?audience-inferrer/],
      ['assumption-auditor referenced',/subagent_type=\"?assumption-auditor/],
      ['dispatch-manifest mention',/dispatch-manifest\.json/],
      ['glob reconciliation',/critique-\\*\\.md|comm -23|MISSING=/],
      ['partial-round threshold 0.6',/0\\.6/],
      ['dispatch-errors.md mention',/dispatch-errors\\.md/],
      ['aggregate.md read mention',/aggregate\\.md/],
      ['no-raw-critique invariant',/aggregate|aggregator/i],
      ['status idiom preserved',/\\[tumble-dry-loop\\]/],
      ['data-plane shell-out',/bin\\/tumble-dry\\.cjs/],
      ['headless fallback link',/bin\\/tumble-dry-loop\\.cjs/],
      ['failure-mode taxonomy',/timeout|malformed|refusal|silent_text/i]
    ];
    let fail=0;
    for(const [name,rx] of checks){
      if(!rx.test(t)){console.error('MISSING:',name);fail++;}
    }
    if(t.split('\\n').length<150){console.error('FILE TOO SHORT — should be a full prose orchestrator');fail++;}
    process.exit(fail);
    "</automated>
  </verify>
  <acceptance_criteria>
    - Frontmatter preserves `description` + `argument-hint`; description mentions session-auth / no API key
    - File contains explicit invocation of `bin/validate-plugin.cjs` near top
    - File contains a `Task(subagent_type=...)` fanout block for reviewers with explicit "ONE assistant message" / "single assistant turn" warning
    - File references all four agent names by `subagent_type` (audience-inferrer, assumption-auditor, reviewer, editor)
    - File mentions `dispatch-manifest.json` and the glob-reconciliation pattern
    - File contains the partial-round threshold `0.6` with the proceed/retry/abort decision branches
    - File mentions `dispatch-errors.md` and the four failure modes (timeout, malformed_output, refusal, silent_text_return)
    - File contains explicit prose stating the orchestrator reads `aggregate.md` only, NOT raw `critique-*.md` files (Pitfall 4 invariant)
    - File preserves the `[tumble-dry-loop]` status log idiom (DISPATCH-07)
    - File shells out to `bin/tumble-dry.cjs` for every state mutation (init, brief-*, aggregate, drift, extract-redraft, finalize)
    - File length >= 150 lines (the current 56-line shell-out is being replaced with a full orchestrator)
    - File mentions `bin/tumble-dry-loop.cjs` as the headless fallback
  </acceptance_criteria>
  <done>commands/tumble-dry.md is now a full prose orchestrator implementing the CC-native convergence loop with parallel Task fanout, pre-dispatch manifest, glob reconciliation, partial-round policy, dispatch-errors taxonomy, and per-round status — closes DISPATCH-01/02/05/07/08.</done>
</task>

</tasks>

<verification>
- `wc -l commands/tumble-dry.md` reports >= 150 lines
- `grep -c "Task(" commands/tumble-dry.md` >= 4 (one per agent type at minimum)
- `grep -c "\[tumble-dry-loop\]" commands/tumble-dry.md` >= 5 (status surfaced at multiple points)
- `grep "validate-plugin" commands/tumble-dry.md` returns a hit
- `grep -E "0\.6|>= 0\.6|>=0\.6" commands/tumble-dry.md` returns a hit (partial-round threshold)
- `grep "dispatch-errors" commands/tumble-dry.md` returns a hit
- `grep "dispatch-manifest" commands/tumble-dry.md` returns a hit
- `grep -i "one assistant" commands/tumble-dry.md` returns a hit (parallel-fanout invariant)
</verification>

<success_criteria>
DISPATCH-01, DISPATCH-02 (validator-invocation portion), DISPATCH-05, DISPATCH-07, DISPATCH-08 satisfied. The slash command runs the full convergence loop in the user's active Claude Code session with no `ANTHROPIC_API_KEY`, fans out reviewers in one assistant turn, defends against the top 5 dispatch failure modes from PITFALLS.md, and surfaces per-round status using the existing log idiom. Phase 1 keystone artifact is in place; downstream phases (PERSONA, CORE-HARDEN, FORMAT, CODE) can dogfood on this orchestrator.
</success_criteria>

<output>
After completion, create `.planning/phases/01-dispatch-v0-5-0/01-05-SUMMARY.md`
</output>
