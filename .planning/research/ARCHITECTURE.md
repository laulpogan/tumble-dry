# ARCHITECTURE — tumble-dry v0.5.x

**Domain:** Claude Code plugin + headless Node CLI for adversarial-review convergence loop
**Confidence:** HIGH (current codebase read end-to-end; CC subagent idiom verified against official docs)

---

## 1. Decision answers (direct)

### Q1: Where does loop logic live for the CC-native path?

**Recommendation: Slash command markdown as prose orchestrator. NOT a separate orchestrator agent. NOT an MCP server.**

Rationale:
- **Slash command is already the entry point** and inherits the user's session auth for free — exactly the auth-free target of DISPATCH-01.
- **Separate orchestrator subagent loses visibility**: per CC subagent semantics, intermediate tool calls stay inside the subagent; only the final message returns. If the orchestrator is itself a subagent, the user loses the per-round progress stream (`[tumble-dry-loop]` style logs) that the current bin provides. Slash-command-as-orchestrator keeps all fan-out/fan-in in the main session where traces, file writes, and progress are user-visible.
- **MCP server is wrong tool**: MCP exposes stateless tools/resources, not long-running multi-round loops with filesystem state and iterative convergence checks. Would force re-implementing state machine outside the file system truth source.
- **Bin stays as headless fallback** (CORE-07 validated, retain). Same data-plane CLI (`bin/tumble-dry.cjs`) feeds both paths — the only divergence is dispatch.

Loop is expressed in `commands/tumble-dry.md` as numbered prose steps, each delegated via Bash (data-plane CLI) or Task (subagent dispatch). The slash command's markdown IS the program.

### Q2: Fan-out / fan-in idiom

Claude Code supports parallel `Task` invocations in a single assistant message. All tool calls in one message dispatch concurrently. Each subagent runs in an isolated context; **only its final message returns**.

**Invariant this forces:** subagents must **write their output to a known file path** (passed in the brief) rather than returning it in the final message. The orchestrator then reads files back via Bash/Read. This matches the current `targetFilename` convention in `lib/dispatch.cjs` — keep it.

**Fan-out pattern for a reviewer wave:**

```
Assistant message from slash command (single message, N parallel Task calls):
  Task(subagent_type="tumble-dry-reviewer", prompt=<brief-reviewer-cfo.md contents + "write critique to <path>">)
  Task(subagent_type="tumble-dry-reviewer", prompt=<brief-reviewer-vc.md contents  + "write critique to <path>">)
  Task(subagent_type="tumble-dry-reviewer", prompt=<brief-reviewer-eng.md contents + "write critique to <path>">)
  ...
```

Each reviewer has `Write` in its `tools:` frontmatter. All N tasks execute concurrently.

**Fan-in:** after the parallel message completes, next assistant message runs `Bash(node bin/tumble-dry.cjs aggregate <slug> <N>)` which reads the critique files from disk and emits `aggregate.md` + convergence JSON. Fan-in is filesystem-mediated, not message-mediated.

**Risk surfaced:** if a subagent silently fails to write its file (model decides to return text instead), the aggregator sees fewer critiques. Mitigations: (a) reviewer brief is categorical — "Your ONLY output is a file at <path>. Do not reply with the critique in the chat."; (b) orchestrator checks file existence per record after the wave and re-dispatches missing ones; (c) bin fallback already has this property — the API-mode writes are deterministic.

**Trace-file risk:** the API path writes `traces/<persona>.json` with full request+response per dispatch. CC Task subagents do NOT expose their request/response payload back to the orchestrator — that data stays inside the subagent's isolated context. v0.5.0 traces will necessarily be thinner (brief-in, critique-out, timing only). Document this as an accepted degradation. CORE-04 stays intact for the bin path; CC path gets a reduced trace.

### Q3: Loader structure (FORMAT-01)

**Recommendation: `lib/loaders/` directory with per-format modules + dispatcher in `lib/loader.cjs`.**

```
lib/
  loader.cjs            # detect(filepath) → { kind, load }; load() → { markdown, meta }
  loaders/
    markdown.cjs        # .md, .txt — identity
    docx.cjs            # mammoth
    xlsx.cjs            # SheetJS, preserves sheet boundaries via ## headings
    pptx.cjs            # OOXML parse, one ## heading per slide
    pdf.cjs             # pdf-parse, one ## heading per page
    pandoc.cjs          # fallback via shelled-out pandoc if installed
```

Each module exports `{ extensions: [...], detect(filepath, buf): bool, load(filepath): { markdown, meta } }`. `loader.cjs` iterates modules by priority (markdown first, pandoc last) and returns the first hit. New formats = one file in `loaders/`, no core change.

**Preserve structural boundaries** in the generated markdown (FORMAT-02):
- pptx → `## Slide {n}: {title}\n\n{body}`
- xlsx → `## Sheet: {name}\n\n{table}`
- pdf → `## Page {n}\n\n{text}`

Reviewers and drift reporter can then reason about slide/sheet/page identity without needing the binary. `history/round-0-original.<ext>` keeps the source intact per CORE-03.

**Dependency isolation:** each loader `require()`s its npm dep at module load. `loader.cjs` wraps each require in try/catch and skips loaders whose deps aren't installed. Users who only polish markdown never hit the `mammoth` require. This keeps the bin path working format-by-format without forcing a full `npm install`.

### Q4: Code-mode logic

**Recommendation: Branch inside `reviewer.md` based on detected mode. Do NOT split into `reviewer-code.md`.**

Reasoning:
- Reviewer persona system is persona-first, not artifact-first. A staff engineer reviewing a strategy doc and a staff engineer reviewing Go code share ~80% of the prompt scaffolding (stay in persona, tag severity, structural vs surface). Splitting duplicates that scaffolding.
- The **editor** is the opposite — code redrafting is a fundamentally different task (AST-aware, preserve semantics, respect language style guide). Split editor: `editor.md` + `editor-code.md`. CODE-02 and CODE-03 live in `editor-code.md` exclusively.
- Code-review **personas** (CODE-04: staff eng, security, on-call SRE, new-hire-in-6-months, hostile-fork) live in `personas/code.md` — picked by the audience-inferrer when it detects code. Same persona pipeline, same reviewer template.

Split rule: "different task → different agent; different persona → different persona library entry."

So:
- `agents/reviewer.md` — one file, branches on `{ARTIFACT_KIND}` block (prose | code). Code branch adds: language context, style anchor ref, "don't flag linter-catchable issues."
- `agents/editor.md` — prose editor (current).
- `agents/editor-code.md` — NEW in v0.6. AST-aware, style-guide-driven.
- `agents/audience-inferrer.md` — already picks persona library by artifact type; extend to pick `personas/code.md` when `{ARTIFACT_KIND}=code`.

### Q5: `package.json` introduction

**Recommendation: Introduce `package.json` in v0.5.2 (the FORMAT milestone), not sooner. Keep bin path format-agnostic optional.**

- v0.5.0 (DISPATCH): no new deps. No `package.json` needed.
- v0.5.1 (PERSONA): no new deps.
- v0.5.2 (FORMAT): `package.json` introduced with `mammoth`, `xlsx`, `pdf-parse` as **optional dependencies** (`optionalDependencies`), not `dependencies`.

Users running tumble-dry on markdown-only never need `npm install`. The loader's per-module try/catch `require` pattern (Q3) makes missing optional deps a graceful degradation: "this format requires `npm install mammoth` — run in the tumble-dry repo root."

Install hint in the slash command: detect unsupported extension → print `cd $TD_HOME && npm install` one-liner and exit. Keeps the "single git clone" invariant for the common case (Constraints line 66 in PROJECT.md).

Add to `.gitignore`: `node_modules/`, `package-lock.json` optional (commit it for reproducibility; it's the shipped-plugin contract).

---

## 2. Component boundaries

```
┌────────────────────────────── Control plane ──────────────────────────────┐
│                                                                            │
│   commands/tumble-dry.md          bin/tumble-dry-loop.cjs                  │
│   (CC slash — prose orchestrator)  (headless Node — same loop)             │
│            │                                    │                          │
│            │  Task(subagent) fan-out            │  dispatch-api.cjs        │
│            │                                    │                          │
└────────────┼────────────────────────────────────┼──────────────────────────┘
             │                                    │
┌────────────▼────────────────────────────────────▼──────────────────────────┐
│                           Data plane (bin/tumble-dry.cjs)                  │
│                                                                            │
│   init  brief-*  aggregate  drift  extract-redraft  finalize  config       │
│            │           │        │          │              │                │
│            ▼           ▼        ▼          ▼              ▼                │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │ lib/loader.cjs  → lib/loaders/{md,docx,pptx,xlsx,pdf,pandoc}    │      │
│   │ lib/run-state.cjs (slug, runDir, working.md, history/)          │      │
│   │ lib/reviewer-brief.cjs (brief assembly + persona extraction)    │      │
│   │ lib/aggregator.cjs (dedup, persistence, structural promotion)   │      │
│   │ lib/voice.cjs (self-sampling + drift classifier)                │      │
│   │ lib/config.cjs (.tumble-dry.yml)                                │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────── Agent plane (subagents) ────────────────────────┐
│  agents/audience-inferrer.md   agents/assumption-auditor.md                │
│  agents/reviewer.md  (branches prose|code)                                 │
│  agents/editor.md    agents/editor-code.md (v0.6)                          │
│  personas/{business,code,domain,marketing,product}.md   personas/RUNBOOK.md│
└────────────────────────────────────────────────────────────────────────────┘
```

**Invariant boundaries:**
1. **Control plane never writes files directly** — only the data plane writes into `.tumble-dry/<slug>/`. Slash command and bin both shell out to `bin/tumble-dry.cjs` for state mutations.
2. **Loader is called only during `init` and on resume** — not on every round. Once binary is normalized to `working.md`, rounds are format-agnostic.
3. **Aggregator reads critique files, not subagent return values** — fan-in is filesystem-mediated on both paths.
4. **Source file is NEVER touched.** Non-negotiable. The copy in `history/round-0-original.<ext>` is the binary-of-record; `working.md` is the markdown projection.

---

## 3. Data flow per round (CC-native path)

```
slash /tumble-dry <artifact>
   │
   ├─► Bash: node bin/tumble-dry.cjs init <artifact>
   │     └─► lib/loader.cjs routes by extension → working.md, history/round-0-original.<ext>
   │
   ├─► Bash: brief-audience + brief-auditor
   │
   ├─► ASSISTANT MESSAGE (parallel Task fan-out, 2 subagents):
   │     Task(audience-inferrer)  → writes round-1/audience.md
   │     Task(assumption-auditor) → writes round-1/assumption-audit.md
   │
   ├─► Bash: brief-reviewers (reads audience.md → generates per-persona briefs)
   │
   ├─► ASSISTANT MESSAGE (parallel Task fan-out, N=panel_size subagents):
   │     Task(reviewer, persona=A) → writes round-1/critique-A.md
   │     Task(reviewer, persona=B) → writes round-1/critique-B.md
   │     ... (N parallel)
   │
   ├─► Bash: aggregate <slug> 1 → aggregate.md + aggregate.json (convergence check)
   │
   ├─► If converged: Bash: finalize → FINAL.md + polish-log.md. STOP.
   │
   ├─► Else: Bash: brief-editor
   │
   ├─► ASSISTANT MESSAGE (single Task, editor):
   │     Task(editor) → writes round-1/proposed-redraft.md
   │
   ├─► Bash: extract-redraft + drift + snapshotHistory(input) + overwrite working.md + snapshotHistory(output)
   │
   └─► Loop: round 2, same pattern on updated working.md. Cap at max_rounds.
```

**Symmetry note:** bin/tumble-dry-loop.cjs executes the exact same sequence, with `dispatchWave` replacing each "ASSISTANT MESSAGE Task fan-out" block. The two control planes differ only in their dispatch primitive.

---

## 4. Project structure (target v0.6.0)

```
agents/
  audience-inferrer.md
  assumption-auditor.md
  reviewer.md                  # prose|code branch inside
  editor.md                    # prose
  editor-code.md               # v0.6 — AST-aware
bin/
  tumble-dry.cjs               # data-plane CLI (unchanged surface)
  tumble-dry-loop.cjs          # headless fallback (unchanged)
commands/
  tumble-dry.md                # CC-native orchestrator (expanded in v0.5.0)
lib/
  aggregator.cjs
  config.cjs
  dispatch.cjs
  dispatch-api.cjs
  loader.cjs                   # NEW v0.5.2
  loaders/
    markdown.cjs
    docx.cjs
    pptx.cjs
    xlsx.cjs
    pdf.cjs
    pandoc.cjs
  reviewer-brief.cjs
  run-state.cjs
  voice.cjs
  code/                        # NEW v0.6
    detect-language.cjs        # ext + shebang + tree-sitter
    ast-drift.cjs              # symbol-level drift
    style-anchors/
      python.cjs               # PEP 8 refs
      go.cjs                   # Effective Go
      rust.cjs                 # API guidelines
personas/
  RUNBOOK.md                   # artifact→panel mapping
  PERSONAS.md                  # index
  business.md  code.md  domain.md  marketing.md  product.md
research/                      # existing, unchanged
docs/
marketplace.json  VERSION  LICENSE  README.md
package.json                   # NEW v0.5.2, optionalDependencies
```

---

## 5. Build order (feeds roadmap phase ordering)

Dependency graph:

```
DISPATCH-01,02,03 ──► (unblocks CC-native use)
        │
        └──► PERSONA-01,02,03 (uses CC-native dispatch in its dogfood)
                │
                └──► FORMAT-01,02,03 (loader is orthogonal to dispatch)
                        │
                        └──► CODE-01,02,03,04 (requires package.json from FORMAT
                                               for tree-sitter dep)
```

**Recommended phase order:**

1. **Phase: DISPATCH** (v0.5.0) — Highest leverage. Turns tumble-dry into a zero-setup CC plugin. Unblocks all downstream dogfooding. Risk: subagent-returns-text-instead-of-file failure mode (mitigate in reviewer brief).
2. **Phase: PERSONA** (v0.5.1) — Research is already done (4 files in `research/`). This is extraction + runbook writing, not new research. Low risk.
3. **Phase: FORMAT** (v0.5.2) — Introduces `package.json`. Independent of dispatch. Could ship before PERSONA if office-format users appear, but PERSONA has lower risk so do it first.
4. **Phase: CODE** (v0.6.0) — Needs tree-sitter (npm dep → requires `package.json` from Phase 3). Biggest net-new feature. Largest risk surface.

**Phases 3 and 4 are nearly independent of DISPATCH** — they ship working on both control planes because the data plane is the same. This means partial-completion of DISPATCH does not block FORMAT or CODE development.

---

## 6. Patterns / invariants

### Pattern: Filesystem as IPC
Parallel subagents coordinate via `.tumble-dry/<slug>/round-N/` file writes, not message passing. This is the single most important architectural decision — it makes CC-native and bin paths isomorphic and lets the aggregator be a pure data-plane function.

### Pattern: Brief-as-prompt
Every subagent receives its entire task context via a generated brief file. Briefs are written by `bin/tumble-dry.cjs brief-*` subcommands. No subagent reads from a database, a cache, or another subagent's memory. This keeps subagents stateless and re-dispatchable.

### Pattern: Per-round immutable directory
`round-N/` is written once and never mutated after the round ends. History snapshots in `history/` are append-only. Any round can be resumed by re-entering the slash command with the same artifact path — `initRun` detects existing `working.md` and continues.

### Anti-pattern: Hiding orchestration in a subagent
Don't create a "tumble-dry-orchestrator" subagent that runs the full loop. Parent loses visibility, progress stream, and recoverability. Keep orchestration in the slash command markdown (visible) or bin (scriptable).

### Anti-pattern: Returning critiques as chat text
Every subagent's final message should be a short confirmation ("wrote critique to <path>"), not the critique body. The aggregator reads files. Enforce this in every agent's frontmatter + prose.

### Anti-pattern: Lazy loader
Don't defer format detection to read-time. Normalize to markdown at `init` time exactly once. All downstream code assumes `working.md` is markdown.

---

## 7. Architectural risks flagged

| Risk | Impact | Mitigation |
|---|---|---|
| Subagent returns text instead of file write | Aggregator undercounts reviewers → false convergence | Categorical brief + orchestrator file-existence check + re-dispatch |
| CC Task trace fidelity < API dispatch trace | CORE-04 partially degraded on slash-command path | Document explicitly; bin path keeps full traces; consider session transcript as trace proxy |
| `package.json` introduction breaks "single git clone" invariant | Install friction for markdown-only users | `optionalDependencies` + graceful degradation in loader; install hint only on demand |
| Multiple optional deps = large `node_modules` for office users | ~100MB `node_modules` from mammoth+xlsx+pdf-parse+pptx | Accepted — users who opt in have the deps; provide `--no-optional` guidance in README |
| Editor redraft of large pptx loses slide fidelity | FINAL.md ships as markdown but user needs pptx back | Explicit "manually re-apply to <source>" in polish-log; roundtrip out of scope per PROJECT.md |
| tree-sitter native bindings on Windows | v0.6 CODE users on Windows may fail `npm install` | Gate CODE features behind detection; fall back to ext+shebang only language detection |
| Slash command token budget | Large artifact + N parallel reviewer briefs in one message may hit limits | Briefs live in files; Task prompt references file path, not inline content |

---

## 8. Scaling considerations

| Scale | Architecture notes |
|---|---|
| 1 artifact / session (common) | Current architecture is right-sized. No changes needed. |
| 10+ artifacts / session (CI batch) | Use bin path with parallel shell invocation per artifact; each gets its own `.tumble-dry/<slug>/`. No shared state between runs. |
| Panel size > 10 | CC Task fan-out still works, but main-session context pressure grows. Bin path has no such limit. Document 3–7 as recommended range. |
| Rounds > max_rounds | By design, cap and finalize. Surfaces structural findings (the answer to non-convergence is usually "your premise is wrong," not "run more rounds"). |

---

## Sources

- [Create custom subagents — Claude Code Docs](https://code.claude.com/docs/en/sub-agents)
- [Subagents in the SDK — Claude API Docs](https://platform.claude.com/docs/en/agent-sdk/subagents)
- [The Task Tool: Claude Code's Agent Orchestration System](https://dev.to/bhaidar/the-task-tool-claude-codes-agent-orchestration-system-4bf2)
- [Claude Code Sub-Agents: Parallel vs Sequential Patterns](https://claudefa.st/blog/guide/agents/sub-agent-best-practices)
- [fan-out-audit reference implementation](https://github.com/lachiejames/fan-out-audit)
- Internal: PROJECT.md, bin/tumble-dry-loop.cjs, commands/tumble-dry.md, lib/dispatch.cjs, lib/run-state.cjs, agents/reviewer.md, README.md

---

## Addendum 2026-04-15: orchestrator-in-subagent reversal (Phase 8 / v0.8.0)

### Original decision (Section 1, Q1)

Phase 1 concluded: "slash command IS the orchestrator (NOT a subagent)." Rationale was main-session visibility — every Task dispatch observable, every critique ingestible, every decision traceable in one place. Pitfall-1 (false convergence on partial rounds) was argued to be mitigable with filesystem IPC + reconciliation.

### What the dogfood proved

Running tumble-dry on its own README + planning docs showed a different failure mode: **main-session token flooding**. A typical 5-reviewer round at 2-3KB of critique body per reviewer drags 12-15KB into the orchestrator's context. After 3 rounds that's ~50KB of raw critique prose plus aggregates plus redrafts plus briefs. For a 17-file batch at the PM's asking cadence, the main session would burn 400KB+ of context per run — context the user doesn't read and that evicts the actual conversation they care about.

The Pitfall-1 mitigation that made the slash-command-as-orchestrator design work also made it expensive: because the orchestrator is the only consumer of `aggregate.md` (never raw critiques), it still has to pull those aggregates + diffs + redraft excerpts into main-session memory. At N reviewers × R rounds × F files, cost compounds multiplicatively.

### New decision

The orchestration **loop** lives in its own subagent context (`agents/orchestrator.md`). The slash command becomes a dispatch-and-poll wrapper. Main session sees:

```
[tumble-dry] dispatched orchestrator → polling…
[tumble-dry] round 1 — reviewers 5/5 returned
[tumble-dry] round 1 — material=3 minor=7 drift=0.12
[tumble-dry] round 2 — reviewers 5/5 returned
[tumble-dry] round 2 — CONVERGED (material=1, drift=0.18)
[tumble-dry] wrote REPORT.md
```

Plus, on convergence, the final `REPORT.md` cat'd into chat — a capped ~5KB document.

### What limited the ideal design

Plan 01 confirmed empirically: Claude Code plugin-shipped subagents have `Task` stripped from their tool set at load time (documented in STACK.md and verified by the loader). The orchestrator **cannot fan out reviewer Task calls itself** — that would require sub-subagent dispatch, which the loader explicitly forbids.

**Pragmatic compromise:** the orchestrator is a "dispatch-plan emitter" rather than a true single-process orchestrator. It:

1. Runs all deterministic data-plane work (init, briefs, aggregate, drift, finalize) via `Bash` + `bin/tumble-dry.cjs`
2. Writes `status.json` + per-round `REPORT.md` to disk at every phase boundary
3. Writes `dispatch-plan.json` describing the next wave of Task calls the caller needs to make
4. Returns control to the slash command, which reads `dispatch-plan.json` and emits the Task fanout in ONE assistant turn (so reviewers still parallelize)

The slash command becomes a mechanical loop: poll orchestrator → read dispatch-plan → fanout → loop. Every line is mechanical, not a prose brief.

### What this preserves

- **Non-destructive invariant** — unchanged.
- **Filesystem IPC** — unchanged and strengthened (now includes `status.json`, `REPORT.md`, `dispatch-plan.json`).
- **Parallel reviewer dispatch** — unchanged (still fanned out in one assistant turn from main session).
- **Headless CLI path** — unaffected; `bin/tumble-dry-loop.cjs` uses the Anthropic SDK directly and can run the whole loop in one process.
- **Pitfall-1 mitigation** — unchanged (glob reconciliation still applies).

### What this changes in code (v0.8.0)

- `commands/tumble-dry.md` shrinks from 307 → ~120 lines. Body is: parse args → init → invoke orchestrator → poll → when orchestrator emits a reviewer/editor dispatch plan, fan out → repeat → cat REPORT.md.
- `agents/orchestrator.md` added (new) — runs the convergence loop as a long-lived subagent (maxTurns: 50), emits status + dispatch plans.
- `lib/status.cjs`, `lib/report.cjs` added — filesystem-IPC plumbing.
- `lib/run-state.cjs::initBatch` added — batch directory layout.
- `bin/tumble-dry.cjs` new subcommands: `init-batch`, `expand`, `status`, `resume`, `dry-run`, `report`, `status-write`, `status-render`, `canary-infer`, `config init`.
- `lib/pricing.cjs`, `lib/canary.cjs`, `lib/glob-expand.cjs` added for DRYRUN/CANARY/BATCH.

### Honest record

Phase 1's decision wasn't wrong on first principles — just wrong for this workload at real scale. Main-session visibility is a virtue when you're shipping one artifact at a time and reading every finding. It's a cost center when you're shipping a 17-file batch and want a single REPORT.md at the end. Both designs exist in git; v0.8.0's CHANGELOG explicitly labels the pivot so future maintainers don't re-litigate it.
