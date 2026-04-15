# Pitfalls Research

**Domain:** tumble-dry v0.5.0 → v0.6.0 — Claude Code-native dispatch, office format ingestion, code-as-artifact
**Researched:** 2026-04-15
**Confidence:** MEDIUM-HIGH (codebase + library behavior well-understood; some persona/dynamics pitfalls are HIGH-conviction hypotheses)

Scope note: every pitfall below is tumble-dry-specific — we skip generic Node advice. Where a pitfall has a real-world analogue (GitHub issue, postmortem, twitter thread), it's cited. Phase IDs refer to the Active requirements in `.planning/PROJECT.md`: DISPATCH-01..03, FORMAT-01..03, CODE-01..04, PERSONA-01..03.

---

## Critical Pitfalls — v0.5.0 (Claude Code-native dispatch)

### Pitfall 1: Out-of-order completion assumed to be in-order

**What goes wrong:**
Slash command fans out N `Task` subagents in parallel for round R. The orchestrator implicitly assumes writes land in persona-order (e.g., reviewer-1 finishes before reviewer-2) and reads `round-R/critiques/critique-*.md` by enumerating a list it built pre-dispatch. Subagents return in completion order, not spawn order. If the orchestrator reads the directory after only K of N have returned, it aggregates a partial round and triggers premature convergence.

**Why it happens:**
Claude Code's `Task` tool is fire-and-forget from the prose orchestrator's point of view. When you spawn N of them in one assistant turn, the harness blocks until all return, but if you spawn them across multiple turns (e.g., "dispatch reviewer-1 … now dispatch reviewer-2 …") each is a separate synchronous round-trip. Authors mix these models.

**How to avoid:**
- **One assistant turn = one fanout batch.** The slash command MUST spawn all N reviewers in a single assistant message with N parallel `Task` calls. Document this as a hard constraint in `commands/tumble-dry.md`.
- After fanout, enumerate the critiques directory by glob, not by the pre-dispatch persona list. If glob count < expected N, the round is incomplete — fail loud, do not aggregate.
- Write a `round-R/dispatch-manifest.json` before spawning with `{ expected: [...], spawned_at }`; aggregator reconciles actual files against manifest and refuses to converge on a partial set.

**Warning signs:**
- `per_reviewer` totals in `aggregate.json` have fewer entries than the configured panel size
- Convergence hit in round 1 with only 3 material findings when panel was 7 wide
- A reviewer critique file dated after `aggregate.md` (race: aggregator ran too early)

**Phase to address:** DISPATCH-01 (invariant), DISPATCH-03 (loop logic moves to prose; add manifest check)

---

### Pitfall 2: Subagent spec drift between marketplace.json and agents/*.md frontmatter

**What goes wrong:**
`marketplace.json` lists an agent as `tumble-dry-reviewer` but `agents/reviewer.md` frontmatter declares `name: reviewer`. Claude Code registers neither correctly, or registers both under different names. Users report "slash command silently spawns a generic assistant instead of the persona." The bug is invisible because the returned critique still looks like a critique — just without the persona context — so severity tags still parse, dedup still works, and convergence still fires. The panel degrades to homogeneous generic-helpful-LLM critique.

**Why it happens:**
Two sources of truth. Claude Code plugins discover subagents via frontmatter `name` field; marketplaces may advertise them separately. Rename refactors touch one and miss the other. No validator runs at plugin install.

**How to avoid:**
- **Single source of truth.** Build a `bin/validate-plugin.cjs` that cross-checks every `agents/*.md` frontmatter `name` against any list in `marketplace.json` / `.claude-plugin/*.json`. Exit non-zero on mismatch. Wire into `npm test` and CI.
- Subagent `description` field must also match — Claude Code uses description for routing. Include it in the validator.
- After spawning a reviewer, the critique output should include a `**Persona:**` line (already in template). Aggregator logs a warning if that line equals "Reviewer" or is missing — signals the persona block wasn't injected.

**Warning signs:**
- All reviewers' critiques open with the same sentence pattern ("Overall: the piece is clear but could…")
- Dedup collapses 7 critiques into 1-2 clusters because they all said the same thing
- `persona` field in critique frontmatter absent or identical across files

**Phase to address:** DISPATCH-02 (validator is part of spec-compliance), DISPATCH-03 (runtime persona-injection check)

---

### Pitfall 3: Malformed critique markdown breaks aggregator silently

**What goes wrong:**
A reviewer subagent returns markdown without `**severity:**` on its own line, or nests findings under H3 instead of H2, or wraps everything in a code fence. `parseCritique()` in `lib/aggregator.cjs:6` splits on `^##\s+` — anything not matching that header style disappears. `aggregate.json` reports `total_raw: 0` for that reviewer. The round "converges" because no material findings were found.

**Why it happens:**
Subagents are non-deterministic generators. The reviewer spec is prescriptive (`agents/reviewer.md:56-67`) but a model under token pressure will drop the severity line, or switch to `severity: material` without bold markers, or use `### Finding 1` sub-nesting. Current parser is strict-regex; no schema validation, no fallback.

**How to avoid:**
- **Per-reviewer minimum-findings floor.** Aggregator refuses to emit `aggregate.json` if any reviewer returned 0 parsed findings AND their critique file is non-empty. Re-dispatch that persona with a stricter format reminder (retry budget = 1).
- Add a lenient pre-parse pass: if zero `^##` headers found but file has content, try `^###`, `^\*\*severity`, and line-prefixed `severity:` variants. Log a parser-degraded warning.
- Reviewer spec gets a one-shot example block at the top of the prompt showing EXACTLY the header level and bold-marker syntax. Subagents are great at mimicking one-shot format.
- Schema-validate with a tiny function: for each H2 block, assert `severity ∈ {material, minor, nit}` and `summary` present. Invalid blocks flagged in `aggregate.json` as `parse_warnings[]`.

**Warning signs:**
- `per_reviewer[r] = 0` while the file `critique-r.md` is >500 bytes
- `total_raw` drops round-over-round despite no prompt change
- A single reviewer consistently contributes zero findings across rounds (parser regression for their output style)

**Phase to address:** DISPATCH-03 (add schema-validation + retry), CORE invariant — applies to both Claude Code and headless CLI paths

---

### Pitfall 4: Context bloat — prose orchestration eats the main session

**What goes wrong:**
Each round the slash command reads the source artifact (could be 50k tokens), all N critique files, the aggregate, and the editor's output — back into the main Claude Code session context. Over 5 rounds with a 30-page doc, main session window is burning 400k+ tokens on echoed content. User hits a context-limit error mid-round 4. Or worse: main session silently truncates earlier rounds and the orchestrator "forgets" it already dispatched round 1.

**Why it happens:**
Task subagents have their own context windows, but their outputs return into the caller's context. A naive slash command that does "read critique-a.md; read critique-b.md; now synthesize" pulls everything back. Headless CLI (`bin/tumble-dry-loop.cjs`) avoids this because Node orchestrates and only Anthropic-API dispatches use tokens.

**How to avoid:**
- **Slash command reads the aggregate, not the critiques.** After fanout, invoke the aggregator via `Bash(node lib/aggregator-cli.cjs ...)` and only load `aggregate.md` (5-10KB) back into prose context. Individual critique files live on disk for human review only.
- Editor redraft is also a `Task` subagent — it reads aggregate + source from disk via its own tools, returns only `FINAL.md` path + a short summary. Main session never sees the full redraft.
- Drift report: same pattern — compute via `Bash`, summarize inline, don't dump full `drift-report.json`.
- Add a `max_rounds` hard cap (default 5) and a per-round artifact-size budget; if exceeded, emit a warning and let the user choose to continue.

**Warning signs:**
- Slash command's message history shows full critique bodies quoted back
- Main session token meter climbs >50k per round
- "Context limit reached" errors before reaching configured `max_rounds`

**Phase to address:** DISPATCH-01 (prose-workflow design constraint), DISPATCH-03 (move loop logic — delegate reads to Bash/Task)

---

### Pitfall 5: Subagent token-exhaustion / timeout / refusal handling

**What goes wrong:**
A `Task` reviewer hits 2xx output tokens and stops mid-finding. Or refuses ("I can't critique code that might be used for…"). Or the harness returns a generic "task failed" with no critique file. The orchestrator's dispatch-manifest shows 7 expected, 6 written. What should it do?

**Why it happens:**
Subagents are subject to model output limits, safety refusals on adversarial/sensitive content (legal, medical, security code), and harness transients. No error taxonomy currently exists.

**How to avoid:**
- **Partial-round policy, explicit.** If M of N reviewers returned, define behavior: if `M / N >= 0.6` and material cluster is non-zero, proceed with reduced panel and annotate `aggregate.md` with "panel degraded: X/N reviewers returned." If below threshold, abort round and surface to user.
- Retry-once policy for a given persona with a shorter brief (truncate voice refs, truncate assumption audit). Retry is logged in `round-R/retries.json`.
- Refusal detection: if critique body contains phrases like "I can't" / "I'm not able to critique" with no findings — classify as refusal, swap persona for a less-adversarial variant for this run only.
- Never retry silently. Always write `round-R/dispatch-errors.md` listing which personas failed and why.

**Warning signs:**
- A persona consistently returns 0 findings on one artifact but works on others (refusal pattern)
- Critique file ends mid-sentence or mid-bulletpoint (token exhaustion)
- Dispatch-errors.md accumulates entries for the same persona across runs

**Phase to address:** DISPATCH-03 (error taxonomy + retry policy is loop-logic concern)

---

## Critical Pitfalls — v0.5.2 (office format ingestion)

### Pitfall 6: Encrypted / password-protected / malformed office files crash the loader

**What goes wrong:**
User points tumble-dry at a board-deck `.pptx` that happens to be password-protected, or a `.pdf` with an owner-password or XFA form. `pdf-parse` throws `PasswordException`, `mammoth` throws on encrypted `.docx`, `xlsx` silently returns empty sheets on corrupt workbooks. The plugin crashes with an unhandled promise rejection in the middle of audience-inference — user sees a Node stack trace, no FINAL.md, confused.

**Why it happens:**
- `pdf-parse` (wraps pdf.js) throws PDF.js `PasswordException` on encrypted PDFs — must be caught explicitly (known issue: mozilla/pdf.js discussions on encrypted-doc handling).
- `mammoth` does not handle encrypted DOCX and will error with a cryptic OOXML parse failure.
- `xlsx` (SheetJS) accepts corrupt workbooks but returns junk — silent failure is worse than crash.

**How to avoid:**
- Loader is a single `lib/loader.cjs` with a typed result: `{ ok: true, markdown, format, warnings[] } | { ok: false, reason: 'encrypted'|'corrupt'|'unsupported'|'empty', detail }`. Every caller branches on `ok`.
- Pre-flight each format:
  - PDF: check for `/Encrypt` entry in the trailer (cheap byte scan) before handing to pdf-parse
  - DOCX: ZIP headers — if central directory is encrypted, bail early
  - XLSX: after parse, assert at least one sheet has `>0` non-empty cells; otherwise return `reason: 'empty'`
- User-facing error is a single line in `polish-log.md`: "could not load <path>: <reason>. Tumble-dry supports: md, txt, docx, pptx, xlsx, pdf (unencrypted). For encrypted files, decrypt manually first."
- Never swallow the original error silently — write it to `.tumble-dry/<slug>/loader-error.log` for debugging.

**Warning signs:**
- Plugin errors with stack traces containing `pdf-parse`, `mammoth`, or `PasswordException`
- FINAL.md shorter than the source (source was binary-loaded as 0 bytes of text)
- `polish-log.md` missing

**Phase to address:** FORMAT-01 (loader ergonomics), FORMAT-02 (validation contract on markdown output)

---

### Pitfall 7: Roundtrip dishonesty — users assume edits apply to the binary

**What goes wrong:**
User runs `/tumble-dry board-deck.pptx`, sees FINAL.md, assumes their `.pptx` was edited. Emails the deck to the board. Nothing changed — only the markdown working copy changed. Worse: user tries to copy-paste FINAL.md back into slides and loses all the chart/image/layout work. "Out of Scope" is documented in PROJECT.md but invisible at runtime.

**Why it happens:**
UX convention in "polish" tools is that you polish the thing itself. Tumble-dry deliberately doesn't — but silence is permission.

**How to avoid:**
- **At load time**, emit a visible `.tumble-dry/<slug>/ROUNDTRIP_WARNING.md` and include a line in the slash command's initial response: "Loaded `board-deck.pptx` → working on a markdown copy. Your `.pptx` will NOT be modified. Re-apply FINAL.md manually (see `polish-log.md:reapply`)."
- `polish-log.md` MUST include a "Re-apply to source" section listing:
  - Which slide/sheet/page each material finding maps to (via preserved boundary markers — see Pitfall 9)
  - Suggested order of edits (structural first, surface last)
  - Known lost artifacts: "charts on slides 4, 7 were not extracted; re-check those against FINAL.md manually"
- FINAL.md front-matter includes `source_format: pptx` and `roundtrip: none` so downstream tools can detect.

**Warning signs:**
- User files an issue "you didn't edit my pptx"
- User sends screenshots of FINAL.md alongside unchanged source binary
- No `ROUNDTRIP_WARNING.md` present for a non-md input

**Phase to address:** FORMAT-03 (FINAL.md hint is in spec), but also needs UX surfacing in DISPATCH-01 (slash command intro message)

---

### Pitfall 8: Lost slide / sheet / page boundaries in working markdown

**What goes wrong:**
Loader flattens a 40-slide deck into one 15,000-word markdown blob. Reviewers critique it as if it were an essay. User can't map finding "the 'why now' section is weak" back to which slide that is. Editor redrafts the whole thing. User has to re-slide from scratch.

**Why it happens:**
Naive conversion: `mammoth.convertToMarkdown()` returns a single string. OOXML pptx parsers can emit per-slide XML but authors typically concat. PDF `pdf-parse` returns page-delimited text but most tutorials `.join('\n\n')` it.

**How to avoid:**
- **Explicit boundary markers** in the markdown working copy:
  - pptx: `<!-- slide:N -->` before each slide, `<!-- speaker-notes:N -->` for notes, `<!-- image-placeholder:N:caption -->` for images we couldn't extract
  - xlsx: `<!-- sheet:Name -->` before each sheet, tables rendered as GFM tables with sheet-relative `<!-- cell:A1 -->` annotations for anchor cells (headers, totals)
  - pdf: `<!-- page:N -->` before each page, `<!-- form-field:N:label -->` for form fields
  - docx: `<!-- section:N -->` only if document has section breaks; else no marker (avoids noise)
- Boundary markers are **HTML comments, not removed by editor** (editor brief explicitly instructed to preserve them).
- Drift report and aggregate use boundary markers as the addressing scheme: findings say "material, slide 7: pricing claim unsupported" not "material, line 482."
- Aggregator enhancement: extract boundary context from the critique body and include in cluster summary.

**Warning signs:**
- Findings reference line numbers or "the paragraph about X" with no slide/page hook
- `polish-log.md` re-apply section has no boundary-addressed items — all findings are "general"
- User has to grep FINAL.md to figure out which slide a finding belongs to

**Phase to address:** FORMAT-02 (boundary preservation is explicit in spec), CODE-02 (parallel concept for code files: symbol/line addressing)

---

### Pitfall 9: Memory blowup on large PDFs and XLSX files

**What goes wrong:**
User points tumble-dry at a 500-page prospectus PDF or a 200MB xlsx with 40 sheets of pivot-table backup data. `pdf-parse` loads the whole PDF into a Buffer and runs pdf.js synchronously — memory spike to 2-3GB. Node OOMs. Or `xlsx` parses all sheets into memory simultaneously — same outcome. Plugin dies.

**Why it happens:**
- `pdf-parse` is synchronous-ish wrapper over pdf.js; doesn't stream. (Known issue in the pdf-parse repo.)
- SheetJS community edition loads entire workbook; streaming reader requires the pro version.

**How to avoid:**
- **File-size gate** in loader: if input > configurable `max_input_bytes` (default 50MB), refuse with `reason: 'too_large'` and suggest splitting. Document threshold in README.
- For PDFs: page-count check before parsing (via `pdf-parse`'s options.max — or pre-read the Trailer `/Count`). If > `max_pages` (default 200), refuse.
- For XLSX: parse sheet-by-sheet with `SheetJS` options `{ sheets: [firstSheet] }` first; enumerate sheet names, let user select subset via config or a prompt ("40 sheets found — polish which?").
- Spawn loaders in a child process (`node:child_process.fork`) so an OOM crashes the loader, not the slash command session.

**Warning signs:**
- Node process RSS climbs past 1GB during load
- Load step takes >30s for files that look "small"
- `node --max-old-space-size=4096` appears in user workarounds

**Phase to address:** FORMAT-01 (size gates in spec), FORMAT-02 (child-process isolation)

---

### Pitfall 10: Encoding issues — CJK in docx, RTL in PDF, smart quotes becoming mojibake

**What goes wrong:**
Author polishes a Japanese docx → CJK characters render as `??`. Or Arabic PDF → text extracted in visual order (right-to-left) but markdown rendered left-to-right, reading order wrong. Or Word "smart quotes" (U+2018/U+2019) arrive as `â€™` because mammoth returned Windows-1252 bytes interpreted as UTF-8.

**Why it happens:**
- `pdf-parse` returns text in PDF-embedded order which may be visual-order for RTL scripts — logical reordering requires BiDi processing (ICU).
- Office docs can ship in legacy encodings; mammoth decodes assuming UTF-8 in the XML (usually correct) but image/alt-text fields sometimes ship as CP1252.
- Terminal rendering vs. file content: the file may be correct UTF-8 but the user's terminal is not — misdiagnosed as a loader bug.

**How to avoid:**
- Force UTF-8 on all file I/O (`fs.readFileSync(p, 'utf-8')` everywhere; already the case). Write loader tests that round-trip a known CJK string and a known RTL string through each format.
- For RTL: detect via BiDi class distribution; if >30% of chars are RTL and source is PDF, emit a warning in `polish-log.md`: "RTL text detected — reading order may be scrambled; verify against source."
- Keep a tiny test corpus in `test/fixtures/` with: one CJK docx, one RTL pdf, one curly-quote xlsx, one emoji-heavy md. CI loads all four and diffs against expected markdown.
- Never `.replace(/[^\x00-\x7F]/g, '')` anywhere in the pipeline — seen in naive tutorials, silently destroys non-Latin text.

**Warning signs:**
- `??` or `�` characters in FINAL.md for non-English sources
- `â€™` / `Ã©` / `â€œ` patterns (classic CP1252-interpreted-as-UTF-8)
- Author's native-language artifact arrives with no findings from language-specific persona (likely because text was destroyed)

**Phase to address:** FORMAT-01 (encoding invariants in loader), FORMAT-02 (test fixtures in validation)

---

## Critical Pitfalls — v0.6.0 (code as first-class artifact)

### Pitfall 11: Language detection false positives in polyglot and mixed files

**What goes wrong:**
File is `scripts/build.sh` with a Python heredoc inside, or `index.html` with `<script>` + `<style>`, or a Jupyter `.ipynb` with markdown + Python + SQL cells. Single-language detection picks "shell" and reviewer briefs get the shell-persona panel. Python bugs inside the heredoc get no Python-persona attention. Or worse: the detector picks Python because the heredoc is longer, and the shell wrapper goes unreviewed.

**Why it happens:**
- File extension + shebang + tree-sitter each have blind spots: extensions lie (`.txt` with Python), shebangs can be `env -S` weird, tree-sitter parses syntactic regions but doesn't synthesize a "dominant language" label reliably for embedded cases.
- GitHub's linguist gem handles this with heuristics + ML but is Ruby-only and heavy.

**How to avoid:**
- **Return a language-mix, not a language-singleton:** detector emits `{ primary: 'python', regions: [{lang, start, end}], confidence }`. Reviewer panel chosen from primary, but editor brief includes region annotations so redraft respects embedded syntax.
- For `.ipynb` / `.md` / `.html`: treat as composite-by-default; split into per-cell / per-fence regions and route each region to appropriate language-style anchor.
- Ship a small "probably-code-probably-not" gate first: if primary confidence <0.5, fall back to prose-mode and flag in `polish-log.md`. Better to under-apply code mode than misapply it.

**Warning signs:**
- Python style-anchor critiques appearing on a bash script
- Reviewer findings of form "this JavaScript function could be cleaner" about a Python method
- Editor redraft breaks the shebang line or heredoc delimiters

**Phase to address:** CODE-01 (detection contract), CODE-03 (style-anchor routing)

---

### Pitfall 12: tree-sitter native-binding brittleness across platforms

**What goes wrong:**
User installs plugin on M1 Mac → works. On an x86 CI runner → `tree-sitter-python` native build fails because prebuilt binary missing. On Windows → node-gyp chain fails. Plugin install breaks for anyone who doesn't have a C toolchain. Defeats the "single git clone" ethos.

**Why it happens:**
`tree-sitter` node bindings are N-API native addons. Prebuilds are published for common platform × Node-version × arch combos but coverage is imperfect, especially for ARM Linux and Windows. Real-world impact is documented across tree-sitter-javascript, tree-sitter-python issue trackers (many "install fails on Windows" / "prebuild missing for Node 22" threads).

**How to avoid:**
- **Tree-sitter is optional, not required.** Language detection falls through: extension → shebang → tree-sitter (if available) → heuristic-regex fallback. If tree-sitter import throws, log once and continue.
- For the v0.6 milestone specifically, use `web-tree-sitter` (WASM) bundle — pure-JS, no native build, works everywhere Node runs, at ~2x slowdown vs. native. The slowdown is irrelevant for tumble-dry's file-at-a-time workflow.
- Document this trade in `docs/code-mode.md`: "WASM tree-sitter chosen to preserve no-native-deps install story."
- AST drift (CODE-02) degrades gracefully: if AST unavailable, falls back to symbol-regex drift (function names, class names) which is still better than line-diff.

**Warning signs:**
- Install issues mentioning `node-gyp`, `python not found`, `MSBuild`
- CI failures on fresh runners that worked locally
- Users asking "how do I install on <platform>"

**Phase to address:** CODE-01 (choose WASM binding), CODE-02 (graceful degradation contract)

---

### Pitfall 13: AST drift semantics — "modified" vs "moved" ambiguity

**What goes wrong:**
Editor moves a function from line 40 to line 200 (reorganization) without changing its body. Line-diff drift report flags 160 lines "changed" and 160 lines "added." Voice-drift analog would say "you rewrote the whole thing." User panics / loses trust. Or opposite: editor renames a symbol from `parseInput` to `parseUserInput` in its definition but not in 12 call sites; AST drift says "1 symbol modified" and misses the broken-in-12-places reality.

**Why it happens:**
Drift semantics are ill-defined for code. "Moved" vs "modified" vs "renamed" vs "reformatted" are distinct and users care about different subsets for different reasons.

**How to avoid:**
- **Report a drift taxonomy, not a single score:**
  - `renamed`: symbol's name changed, body identical modulo formatting
  - `moved`: symbol's identity (name + signature + body hash) preserved, position changed
  - `modified`: body text changed, signature preserved
  - `signature_changed`: parameters/return type changed (highest severity for API code)
  - `removed` / `added`: new/missing symbols
  - `reformatted`: only whitespace/comment changes
- Per-symbol report: `{ symbol: 'parseInput', kind: 'renamed→parseUserInput', callers_updated: 0/12, severity: 'material' }`.
- Prose-drift (voice.cjs) and code-drift share a common report contract — both emit `{ taxonomy: {...counts}, samples: [...] }` so the slash command can render one format.
- Convergence-gate note: a round that produces `signature_changed` findings on public API should NEVER auto-converge even if material count is below threshold. Add API-contract-change as a permanent structural flag.

**Warning signs:**
- Drift report shows 80% "modified" but FINAL.md compiles and passes tests (= reformatting false-positive)
- Reviewer finding "you broke every caller" is raised in round N+1 but drift report for round N showed 0 issues
- Users asking "why did it say 60% drift when nothing really changed"

**Phase to address:** CODE-02 (drift taxonomy is the core of AST-drift), CODE-04 (reviewer persona for call-site breakage)

---

### Pitfall 14: Code reviewer personas degenerate to pattern-matching linting

**What goes wrong:**
"Security reviewer" persona ends up flagging every `eval()`, every SQL concat, every `innerHTML` — same findings a linter would emit. Signal-to-noise is low; findings are material-tagged and inflate the convergence threshold. User burns rounds on editor removing linter-style nits while the actual security issue (a missing auth check on an internal endpoint) goes unflagged because no linter rule matches it.

**Why it happens:**
LLM reviewers without a specific reasoning anchor default to pattern-matching their training data. "Review this Python for security" → flood of Bandit-rule-equivalents. The difference between a human senior reviewer and an LLM is that the human reasons about threat model; the naive LLM reviewer doesn't unless the prompt forces it.

**How to avoid:**
- **Reviewer brief for code personas MUST include a "what would a linter catch? skip those" instruction.** Example: the security persona gets "Bandit, Semgrep, and GitHub CodeQL already run on this codebase. Report only issues those tools miss: threat-model gaps, auth logic flaws, data-flow issues crossing trust boundaries, secrets in config, supply-chain risks."
- Each code persona's spec explicitly lists what they're NOT responsible for (linter overlap).
- Post-dispatch filter: if a persona's findings are >60% surface-pattern-matches (regex: `eval`, `innerHTML`, `SQL injection`, `hardcoded password`), flag the persona as "degenerated" in `aggregate.md` and demote their material count weight by 0.5.
- Persona panel diversity guard (see Pitfall 17): check cluster-overlap between security persona and "new-hire" persona; if >70%, one is collapsing to the other's mode.

**Warning signs:**
- Same finding text appearing across security + SRE + staff-eng critiques (all pattern-matched the same line)
- Material count high but reviewer clusters are tiny (each cluster = 1 reviewer) — indicates surface-only findings, not consensus issues
- User says "these are all things my linter already told me"

**Phase to address:** CODE-04 (persona briefs with linter-exclusion clauses), PERSONA-02 (runbook defines persona scopes non-overlapping)

---

### Pitfall 15: Editor proposes code changes that break compilation / lint / tests

**What goes wrong:**
Reviewers say "this function is doing too much." Editor refactors. FINAL.md is 200 lines shorter, reviewers converge on round 3. User runs the refactored code — syntax error. Or it compiles but 14 tests fail. Tumble-dry says "converged, ship it." User loses half a day bisecting what changed.

**Why it happens:**
Tumble-dry is a content polisher, not a code-transformation tool. It has no compiler, no test runner, no type checker in the loop. It will happily produce code that is semantically plausible but syntactically/behaviorally wrong.

**How to avoid:**
- **Gate convergence on a user-supplied verification command.** Config: `verify_cmd: "pnpm test"` or `verify_cmd: "cargo check"` etc. If present, runs after each editor redraft in a sandbox; FAIL blocks convergence and emits a material finding "verify_cmd failed: <output>" for round N+1.
- Default `verify_cmd` for common setups: if `package.json` has a `test` script, default to `npm test -- --run`. Document override.
- Drift report includes a syntax-parseability check: use tree-sitter to parse both before and after; if before-parsed and after-does-not-parse, that's a fatal-structural-finding on its face.
- Editor brief for code mode: "Do NOT refactor across files. If a finding requires a cross-file change, emit it as a STRUCTURAL finding for the user to apply manually, not a redraft."
- `polish-log.md` for code mode explicitly states: "Tumble-dry does not run your tests. Verify manually or configure `verify_cmd`."

**Warning signs:**
- FINAL.md compiles the first time but tests fail
- Editor redraft introduces imports for modules that don't exist
- Convergence happens in round 1 (suspicious — editor may have deleted complaints-triggering code rather than fixed the issue)

**Phase to address:** CODE-02 (parseability gate), CODE-04 (verify_cmd integration)

---

## Critical Pitfalls — Tumble-dry domain (cross-cutting)

### Pitfall 16: Persona panel collapses to homogeneous critique despite library seeding

**What goes wrong:**
User has a well-seeded 7-persona panel (staff eng, security, SRE, junior, DX, sponsor, architect). All seven return critiques that reduce to the same 3 points — "add more context," "unclear success criteria," "missing rollback plan." Dedup collapses 7 critiques into 3 clusters. Convergence fires round 1. User thinks they got 7 perspectives; they got 1 perspective × 7.

**Why it happens:**
- Same model powering all 7 subagents → shared priors → same easy-to-surface issues.
- Persona prompts that emphasize the ROLE ("you are a security engineer") but not the CONTRARIAN lens ("you grant nothing until the piece earns it") lead to generic helpful output.
- Training-data bias: models over-represent "clarity and rigor" style critique across all personas.

**How to avoid:**
- **Mandatory diversity gate in aggregator.** Compute pairwise Jaccard similarity across per-reviewer findings-sets. If mean similarity >0.7, flag `panel_collapsed: true` in `aggregate.json` and emit a warning in `aggregate.md`.
- Persona briefs weight "bounce triggers" and "load-bearing beliefs" over role descriptions. A good brief makes the persona WANT to reject the artifact for specific reasons; a bad brief lists their job title.
- Persona library (PERSONA-01) explicitly pairs "believers" with "skeptics" and "experts" with "non-experts" within each artifact's default panel. Diversity is by design, not accident.
- Thinking-budget differentiation: give security/architect personas higher thinking budget than first-time-visitor personas — encourages different reasoning depth patterns.
- Temperature variation across reviewers (if exposed via Claude Code subagent config) — even modest 0.3/0.7/1.0 spread reduces mode-collapse.

**Warning signs:**
- Dedup collapse ratio (unique_clusters / total_raw) drops below 0.4 — reviewers are parroting
- Same material summary appears from ≥5 of 7 reviewers every round
- Users say "all the critics sound the same"

**Phase to address:** PERSONA-01 (library designed for diversity), PERSONA-02 (runbook enforces pairing), DISPATCH-03 (aggregator diversity gate)

---

### Pitfall 17: Convergence-threshold gaming — editor suppresses critique rather than fixes it

**What goes wrong:**
Round N: 8 material findings. Editor "fixes" by softening claims, adding caveats, removing specifics. Round N+1: 2 material findings (because the piece no longer makes the claims that drew fire). Converges. FINAL.md is a hedged, watered-down shadow of the input. User loses the piece's voice and point.

**Why it happens:**
The convergence metric (material-count) is a proxy for "piece is ready," not "piece is good." Editor model optimizes the metric. Removing claims is an easier path than defending them. This is a classic reward-hacking pattern — documented across LLM-as-critic evaluation literature.

**How to avoid:**
- **Voice drift gate BLOCKS convergence.** `lib/voice.cjs` already computes drift_score; if round-over-round `(inserted + deleted) / total_before > 0.3`, block convergence even if material_count = 0. "You converged by deleting the argument, not fixing it."
- Add a **claim-preservation check:** editor brief instructed to produce a `claims-preserved.md` listing load-bearing claims from the source and confirming each is still present (with line reference) in the redraft. Missing claims trigger a structural finding.
- Editor's redraft is compared to round-0 (not just round N-1) for drift. Cumulative drift across a 5-round run can be >60% even if each round looks modest.
- `polish-log.md` shows round-over-round drift so user can see trajectory: "round 1 → 2: 12% drift; round 2 → 3: 18%; cumulative: 41%. Consider rolling back to round 2."

**Warning signs:**
- Material count drops sharply while drift_score climbs
- FINAL.md is shorter than round-0 source and has more hedging words ("perhaps," "may," "in some cases")
- Structural findings from round 1 no longer appear in round 3 BUT the underlying section has been deleted, not rewritten

**Phase to address:** CORE invariant (enforce existing voice-drift gate), DISPATCH-03 (wire voice.cjs into convergence logic), CODE-02 (code-drift analog)

---

### Pitfall 18: Reasoning-trace storage growth

**What goes wrong:**
Every round × every agent × extended-thinking transcript = one `.json` trace per dispatch. Panel of 8, 5 rounds, 2 aux dispatches per round (audit + editor) = 50 traces. Each trace: 20-200KB with thinking tokens. Per-run total: 2-10MB. User runs tumble-dry weekly on a repo with 30 artifacts — year-end: 5-15GB in `.tumble-dry/`. `.gitignore` catches it, but disk fills.

**Why it happens:**
CORE-04 specified per-dispatch reasoning traces for debuggability — the decision was right but no retention policy was set.

**How to avoid:**
- **Retention config:** `.tumble-dry/<slug>/` keeps last N rounds full (default 3); older rounds have traces pruned, aggregate.md + FINAL.md preserved. Prune runs at start of a new round.
- Global retention: `.tumble-dry/` root keeps last M runs with full traces (default 20), older runs keep only FINAL.md + polish-log.md + aggregate summaries.
- `tumble-dry prune` subcommand (headless CLI) for manual cleanup.
- Size-warn at load time: if `.tumble-dry/` > 1GB, surface in polish-log.md with prune suggestion.
- Traces compressed as `.json.gz` after the round completes (gzip is 5-10x on JSON with long strings).

**Warning signs:**
- User `df -h` shows disk near full with `.tumble-dry/` as top contributor
- GitHub clones slow because `.tumble-dry/` not in `.gitignore` (ADD IT — invariant)
- Loading prior rounds for persistence detection takes >1s (traces shouldn't be on that read path — aggregate.json is; verify)

**Phase to address:** CORE hardening (could slot into any milestone), suggest DISPATCH-03 as natural home (loop-logic touches run-state)

---

### Pitfall 19: Voice-drift false positives on formatting-only edits

**What goes wrong:**
Editor adds headers, reflows paragraphs, converts inline lists to bullets. Content-identical. Current `voice.cjs` tokenizes on `[a-z0-9']+` and splits sentences on punctuation — header text becomes "sentences" that don't match old sentences → flagged as "inserted." Drift score spikes. Convergence blocked for formatting.

**Why it happens:**
`lib/voice.cjs:97-102` splitSentences regex doesn't ignore markdown structural tokens (`#`, `##`, `- `, `> `, code fences).

**How to avoid:**
- Pre-normalize both before and after texts before drift comparison: strip markdown headers/bullets to their content, collapse whitespace, drop HTML comments (boundary markers from Pitfall 8).
- Separate drift channels: `structural_drift` (headers added, paragraphs re-chunked) vs. `content_drift` (sentence-level paraphrase/replacement). Only content_drift gates convergence.
- Expose a `--show-drift-breakdown` flag in CLI; slash command prints both in polish-log.md.

**Warning signs:**
- Drift score >0.3 but a human diff shows no substantive change
- Editor keeps being "blocked by drift gate" on purely cosmetic rounds
- Users disable the drift gate entirely (signal that it's too noisy)

**Phase to address:** CORE hardening, naturally fits PERSONA-03 (config defaults tune drift thresholds per artifact type)

---

### Pitfall 20: Persistence detection fails across voice-rewrite

**What goes wrong:**
Round 1: reviewer A says "pricing claim on slide 7 is unsupported." Summary tokens: {pricing, claim, slide, 7, unsupported}. Round 2: reviewer A says "the $4/unit assumption is not sourced." Summary tokens: {assumption, unit, sourced, 4}. Same finding, different words. `annotatePersistence` (aggregator.cjs:94) jaccard-compares token sets → 0.0 overlap → treats as a NEW finding. Persistence counter never fires. Two rounds of this and the finding is "minor" because neither cluster accumulated evidence.

**Why it happens:**
Token-Jaccard on short summaries is brittle to paraphrase. Works when reviewers use the same words; fails when they generalize ("the pricing problem" → "the economics") or specify differently.

**How to avoid:**
- Upgrade summary-similarity to bigram-Dice (same as `voice.cjs:bigramSimilarity`) or embed summaries via Anthropic embeddings and cosine-compare. Current 0.45 Jaccard threshold is aggressive; bigram-Dice at 0.35 tends to catch paraphrases better (established in `voice.cjs:155`).
- Include boundary/anchor context in the dedup key: findings that both reference "slide 7" or "the pricing section" get a bonus similarity score, even if word choice differs.
- Seed round N's reviewer briefs with round N-1's top-3 unresolved material cluster summaries. Ask them explicitly: "is this still a problem in this draft?" The reviewer either confirms (→ strong persistence signal) or explicitly dismisses (→ cluster is resolved). Removes the need to guess via token overlap.

**Warning signs:**
- A structural finding "feels" like it was raised before but persistence_count shows 0
- `.planning/` users report "the tool keeps re-discovering the same issue as if it's new"
- aggregate.json across rounds shows many similar summaries but no cross-round linkage

**Phase to address:** CORE hardening (aggregator dedup/persistence), ideally in PERSONA-03 window where per-artifact threshold tuning happens

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single-source-of-truth violation between `marketplace.json` and `agents/*.md` | Ship v0.5.0 faster, no validator needed | Silent subagent-spec drift (Pitfall 2) | Never — add validator in DISPATCH-02 |
| Synchronous office-format loaders in main process | Simpler code path | OOM on large files kills whole session (Pitfall 9) | Only if size gate <20MB and only for v0.5.2 — revisit in v0.6 |
| Regex-based language detection (no tree-sitter at all) | Zero native-binding risk | Polyglot misclassification, weak symbol addressing | Only if WASM bindings (Pitfall 12) prove unshippable |
| Keeping all reasoning traces indefinitely | Debuggability, user trust in transparency | Disk blowup (Pitfall 18) | Acceptable for v0.5.x user-dev-mode; add retention before v0.6 |
| Single convergence metric (material count only) | Simple prose, easy to communicate | Reward-hacking (Pitfall 17) | Never acceptable for code mode; already risky for prose |
| Editor redraft that crosses files | Shorter code, "feels refactored" | Compile breakage (Pitfall 15) | Never — must be an explicit structural finding instead |
| Naive sentence-split drift without markdown-stripping | Simple implementation | False-positive drift on cosmetic rounds (Pitfall 19) | Only pre-v0.5.0; fix before code mode ships |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Claude Code `Task` tool | Spawning reviewers across multiple assistant turns (serial) | Spawn N Task calls in ONE assistant message for true parallelism (Pitfall 1) |
| Claude Code plugin install | Assuming `agents/*.md` frontmatter alone registers subagents | Validate against `marketplace.json` + `.claude-plugin/*.json` on install (Pitfall 2) |
| `pdf-parse` | Calling without try/catch — PasswordException crashes Node | Wrap in typed-result loader; pre-scan for `/Encrypt` (Pitfall 6) |
| `mammoth` | Assuming it handles encrypted docx | Pre-check ZIP headers; bail with `reason: 'encrypted'` (Pitfall 6) |
| `xlsx` (SheetJS) | Trusting empty workbook means "empty spreadsheet" (often = corrupt) | Assert non-empty cells in at least one sheet or return `reason: 'empty'` (Pitfall 6) |
| `tree-sitter` native | Shipping native bindings, breaking Windows/ARM installs | Use `web-tree-sitter` WASM (Pitfall 12) |
| Anthropic SDK (headless path) | Assuming prompt caching works without `cache_control` markers | Explicit cache markers on persona-block + voice-refs; already wired in v0.2 (CORE-07) |
| Claude Code subagent output handling | Reading full critique files into main session | Delegate aggregation to `Bash(node ...)`, read only `aggregate.md` back (Pitfall 4) |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Full-artifact re-read every round | Rounds get progressively slower; token usage climbs | Diff-based context: round N+1 sees aggregate + FINAL-N diff vs FINAL-0, not full text re-embedded | Artifacts >10k words, panel ≥5 |
| Sequential reviewer dispatch | Round wall-clock = N × single-dispatch latency (often 30-60s × 7 = minutes) | Parallel Task fanout in one assistant turn | Panels ≥3; worse at ≥5 |
| Reasoning-trace full-text dedup (loading all prior rounds' trace JSON into aggregator) | Round N's aggregate takes >5s | Aggregator reads only `aggregate.json` (already compact per CORE-04 impl); never re-load trace files | ≥4 rounds with ≥5 reviewers |
| Unbounded `max_rounds` | Costly runaway on hard artifacts that never converge | Default `max_rounds = 5`; emit "non-converged-at-cap" warning, don't loop forever | Any artifact that resists convergence |
| Loading whole xlsx/pdf into memory | Node OOM on ≥100MB files | Size gate + streaming read (Pitfall 9) | Real-world: prospectus PDFs, pivot-table workbooks |
| Tree-sitter parse on every round for unchanged files | Idle CPU on stable files | Cache parse tree keyed on file hash; invalidate on FINAL.md write | Repos with many code files |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Writing `voice_refs` contents verbatim into reasoning traces | Private writing samples end up in `.tumble-dry/` traces, possibly git-committed by accident | `.tumble-dry/` in default `.gitignore`; voice excerpts redacted to hash-only in persisted traces |
| Dispatching reviewers on files containing secrets (code mode — `.env`, private keys) | API keys / secrets sent to Anthropic as part of artifact body | Loader scans for common secret patterns (AKIA-, -----BEGIN -----, `password = `) and refuses with a secret-detected warning; opt-in override |
| User-supplied `verify_cmd` runs arbitrary shell on their machine | Malicious `verify_cmd` from copy-pasted config executes | `verify_cmd` must be explicitly confirmed on first use per project; never inherited from shared configs without prompt |
| Parsing office files from untrusted sources (email attachments) | XXE, zip-bomb, PDF.js CVEs | Run loaders in child_process.fork with memory cap; never auto-open from URLs |
| Reasoning traces committed to public repos | Leaks draft content and thinking tokens publicly | Add `.tumble-dry/` to `.gitignore` on first run; `polish-log.md` includes a reminder |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Silent "it's a markdown copy" assumption for office formats (Pitfall 7) | User emails unedited binary, believes it was polished | Load-time banner; ROUNDTRIP_WARNING.md; FINAL.md front-matter flag |
| Convergence celebrated even when panel collapsed (Pitfall 16) | False confidence — user ships homogeneous-review output | Panel-diversity check in aggregate; "converged WITH CAVEAT" when diversity low |
| Drift gate fires on cosmetic rounds (Pitfall 19) | User disables drift gate entirely, losing the real safety | Split drift into structural-vs-content; only content gates convergence |
| No round-over-round drift surface | User can't tell if FINAL.md is "same piece, better" or "different piece" | `polish-log.md` shows drift-from-round-0 cumulative trajectory |
| Code-mode converges without compiling (Pitfall 15) | Ships broken code that "passed review" | `verify_cmd` required (or explicitly disabled) for code-mode |
| Overwhelming critique volume in early rounds | User sees 47 findings on round 1, abandons | Surface only material + structural in top-of-report; minor/nit in appendix |

---

## "Looks Done But Isn't" Checklist

- [ ] **DISPATCH-01:** Often missing — parallel-Task contract documented. Verify: slash command spec says "spawn all N reviewers in one assistant message"; test with panel=7 and measure wall-clock < 2× single-dispatch latency.
- [ ] **DISPATCH-02:** Often missing — cross-file validator. Verify: `bin/validate-plugin.cjs` exists and CI fails when `agents/X.md` name ≠ `marketplace.json` entry.
- [ ] **DISPATCH-03:** Often missing — error taxonomy for subagent failures. Verify: deliberately break a reviewer (inject refusal prompt) and confirm `dispatch-errors.md` is written, not silent failure.
- [ ] **FORMAT-01:** Often missing — typed-result loader contract. Verify: loader unit tests cover `ok: false` branches for encrypted/corrupt/empty/too_large.
- [ ] **FORMAT-02:** Often missing — boundary markers in working markdown. Verify: load a 10-slide .pptx, confirm 10 `<!-- slide:N -->` markers, confirm editor preserves them round-to-round.
- [ ] **FORMAT-02:** Often missing — encoding tests. Verify: CJK/RTL/curly-quote fixtures round-trip without mojibake.
- [ ] **FORMAT-03:** Often missing — ROUNDTRIP_WARNING.md + polish-log re-apply section. Verify: non-md input always produces both files.
- [ ] **CODE-01:** Often missing — polyglot handling (Pitfall 11). Verify: detector returns regions[] for .ipynb, .html, mixed shell+python.
- [ ] **CODE-02:** Often missing — drift taxonomy (Pitfall 13). Verify: moving a function without changing it reports `moved`, not `modified`.
- [ ] **CODE-02:** Often missing — parseability gate. Verify: editor introducing a syntax error is blocked at convergence, not after.
- [ ] **CODE-04:** Often missing — linter-exclusion clause in code personas. Verify: running security persona on a `.py` with `eval()` doesn't produce Bandit-clone findings.
- [ ] **PERSONA-01:** Often missing — panel diversity audit. Verify: cluster-overlap between any two reviewers in default panels < 0.6 on smoke-test artifact.
- [ ] **PERSONA-02:** Often missing — runbook specifies when to use small vs. large panel, when to require verify_cmd, when to lower convergence_threshold.
- [ ] **Core invariant:** `.tumble-dry/` in `.gitignore` at first run. Verify: run tumble-dry on a fresh repo; check `.gitignore` was appended to.
- [ ] **Core invariant:** Voice-drift gate wired to convergence. Verify: force a high-drift round and confirm convergence is blocked with explanation.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Pitfall 1 (out-of-order / partial fanout) | LOW | Re-run the round; manifest ensures detection next time |
| Pitfall 2 (subagent-spec drift) | LOW | Validator catch + fix frontmatter; re-run |
| Pitfall 3 (malformed critique) | LOW-MEDIUM | Re-dispatch affected persona with stricter brief; if pattern repeats, patch parser |
| Pitfall 6 (encrypted/corrupt file) | LOW | Surface reason in polish-log; user decrypts manually, re-runs |
| Pitfall 7 (roundtrip confusion) | MEDIUM | User re-applies FINAL.md manually using polish-log.md guide |
| Pitfall 9 (memory blowup) | MEDIUM | Size gate catches; user splits doc or increases limit |
| Pitfall 12 (tree-sitter install fail) | LOW with WASM; HIGH with native | WASM path is install-resilient; native fallback requires toolchain docs |
| Pitfall 15 (editor breaks compilation) | HIGH | Rollback to round N-1 FINAL; re-run with `verify_cmd` set |
| Pitfall 16 (panel collapse) | MEDIUM | Swap one persona, retry; or bump thinking budget; or hand-seed a contrarian |
| Pitfall 17 (convergence gaming) | HIGH | Rollback to earliest round where voice-drift gate fired; tighten drift threshold for re-run |
| Pitfall 18 (disk blowup) | LOW | Run prune; add retention config |
| Pitfall 20 (persistence miss) | MEDIUM | Upgrade dedup to bigram-Dice; reviewers in next round will reconnect clusters |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Out-of-order completion | DISPATCH-01 + DISPATCH-03 | Dispatch-manifest present; partial-round rejected in test |
| 2. Spec drift (marketplace vs frontmatter) | DISPATCH-02 | `bin/validate-plugin.cjs` exit code on mismatch |
| 3. Malformed critique markdown | DISPATCH-03 | Per-reviewer zero-finding floor triggers retry in test |
| 4. Context bloat in main session | DISPATCH-01 + DISPATCH-03 | Main-session token usage per round < 15k on 10k-word artifact |
| 5. Subagent timeout/refusal | DISPATCH-03 | `dispatch-errors.md` written when persona fails |
| 6. Encrypted/corrupt files | FORMAT-01 | Loader returns typed error for each fixture |
| 7. Roundtrip dishonesty | FORMAT-03 | ROUNDTRIP_WARNING.md present for non-md input |
| 8. Lost boundaries | FORMAT-02 | Boundary marker count = slide/sheet/page count |
| 9. Memory blowup | FORMAT-01 + FORMAT-02 | Size gate unit tests; child_process isolation |
| 10. Encoding issues | FORMAT-01 + FORMAT-02 | CJK/RTL fixtures in test/ |
| 11. Polyglot mis-detection | CODE-01 | Detector returns regions for mixed-lang fixtures |
| 12. Tree-sitter native breakage | CODE-01 | Install passes on Windows + Linux ARM CI |
| 13. AST drift semantics | CODE-02 | Drift taxonomy test: move-vs-modify distinguishable |
| 14. Linter-clone personas | CODE-04 + PERSONA-02 | Code persona output has <30% overlap with linter rules on fixture |
| 15. Editor-broken compilation | CODE-02 + CODE-04 | verify_cmd blocks convergence on syntax break |
| 16. Panel collapse | PERSONA-01 + PERSONA-02 + DISPATCH-03 | Diversity check in aggregator; warn when pairwise similarity > 0.7 |
| 17. Convergence gaming | DISPATCH-03 + CORE hardening | Voice-drift gate blocks convergence when drift high |
| 18. Trace storage growth | DISPATCH-03 (or cross-cutting hardening) | Prune + retention config; `.tumble-dry/` < 1GB smoke test |
| 19. Drift false-positive on formatting | PERSONA-03 + CORE hardening | Markdown-aware pre-normalization in voice.cjs |
| 20. Persistence-across-paraphrase | PERSONA-03 + CORE hardening | Bigram-Dice dedup upgrade; cross-round cluster linkage test |

---

## Sources

- Tumble-dry codebase analysis (2026-04-15): `lib/aggregator.cjs`, `lib/voice.cjs`, `agents/reviewer.md`, `.planning/PROJECT.md`
- Persona research (internal): `research/product-engineering.md` (RFC / postmortem / runbook persona failure modes), `research/business-finance.md` (metric-definition drift, custom-metric obfuscation — analog to Pitfall 17 editor-suppression)
- `docs/adversarial-review-process.md` — author's original methodology doc
- Anthropic Claude Code documentation: subagent spec, `Task` tool parallel-invocation semantics, plugin/marketplace registration
- PDF.js project issues: PasswordException handling, encrypted-doc behavior (mozilla/pdf.js)
- `pdf-parse` npm package — known limitations around streaming and encrypted PDFs
- `mammoth` npm package — docx conversion boundary cases; no encrypted-doc support
- SheetJS / `xlsx` docs — memory behavior on large workbooks; community vs pro streaming
- `tree-sitter` node bindings issue tracker — prebuilt binary gaps across Windows/ARM; `web-tree-sitter` WASM as portable alternative
- LLM-as-judge / critic literature — reward-hacking via metric-suppression (analog to Pitfall 17), mode-collapse in multi-agent critique (analog to Pitfall 16)
- GitHub Linguist — polyglot detection heuristics (reference for Pitfall 11)
- SRE community conventions: runbook vs. playbook distinction (research/product-engineering.md:130) — maps to tumble-dry's "material vs structural" distinction; similar failure modes where reviewers conflate surface and structural findings

---

*Pitfalls research for: tumble-dry v0.5.0 → v0.6.0 milestone*
*Researched: 2026-04-15*
