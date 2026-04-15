# Requirements — Milestone v0.5.x → v0.6.0

**Source:** PROJECT.md Active section, expanded with acceptance criteria.
**Scope:** v0.5.0 (Claude Code-native dispatch) → v0.5.1 (persona library) → v0.5.2 (office formats) → v0.6.0 (code-aware).
**Out-of-scope items:** see PROJECT.md Out of Scope section.

---

## v1 Requirements (this milestone)

### Dispatch — Claude Code-native (v0.5.0)

- [ ] **DISPATCH-01** Slash command `/tumble-dry <artifact>` runs the full convergence loop using only the user's active Claude Code session — no `ANTHROPIC_API_KEY` required, no separate process.
- [ ] **DISPATCH-02** Each agent (audience-inferrer, assumption-auditor, reviewer × N personas, editor) is dispatched as a parallel `Task` (aliased to `Agent` in CC v2.1.63+) call. **All N reviewer Task calls in ONE assistant turn — serial cross-turn dispatch is the #1 silent bug** (false convergence on partial rounds). `bin/validate-plugin.cjs` cross-checks `agents/*.md` frontmatter `name` against `.claude-plugin/marketplace.json` and is CI-gated.
- [ ] **DISPATCH-03** `agents/*.md` frontmatter conforms to current Claude Code plugin-shipped subagent spec: `name` (no `tumble-dry-` prefix — that was wrong), `description`, `tools`, optional `model`/`disallowedTools`/`maxTurns`/`color`. **Plugin-shipped agents cannot use `hooks`, `mcpServers`, or `permissionMode`** — silently stripped by the loader.
- [ ] **DISPATCH-04** Plugin spec compliance: `marketplace.json` relocated to `.claude-plugin/marketplace.json`; new `.claude-plugin/plugin.json` manifest declares the plugin per current CC plugin docs. Verified via `claude plugin validate .` (or equivalent).
- [ ] **DISPATCH-05** Loop orchestration lives in `commands/tumble-dry.md` as prose + bash + Task calls. The bash steps shell out to `bin/tumble-dry.cjs` for data-plane work (init, brief generation, aggregate, drift, finalize) — no LLM calls in bin/. **Filesystem is IPC**: subagents write to known paths from the brief; orchestrator reads `aggregate.md` (5–10KB) only, NOT raw critique files (otherwise context burns).
- [ ] **DISPATCH-06** `bin/tumble-dry-loop.cjs` (the legacy autonomous Node driver) keeps working as the headless / CI fallback. Its docstring + `--help` direct users to `/tumble-dry` for session-auth path. Trace fidelity degradation on CC path (no per-dispatch request/response payload — subagent context is isolated) is documented in README and `polish-log.md`.
- [ ] **DISPATCH-07** Slash command surfaces per-round status to the user (round N starting, M reviewers dispatched, K material findings, converged/continuing) using the existing `[tumble-dry-loop]` log idiom.
- [ ] **DISPATCH-08** Failure-mode taxonomy in `dispatch-errors.md`: Task timeout, malformed agent output (no severity tag, parse fail), refusal, silent-text-return-instead-of-file-write. Pre-dispatch manifest of expected critique paths; post-fanout glob reconciliation. **Partial-round policy:** if `M/N >= 0.6` AND material > 0, proceed with degradation warning; else retry-once with stricter brief; then abort with diagnostic.

### Persona Library (v0.5.1)

- [ ] **PERSONA-01** `personas/library.md` ships covering ≥30 artifact types across 4 families (business/finance, product/engineering, marketing/comms, domain-specific). Each persona has **mandatory fields**: name, role, 1-2 sentence bio, **hiring job**, **bounce trigger**, **one load-bearing belief**. Default panels MUST pair believers with skeptics (anti-mode-collapse — Pitfall 16).
- [ ] **PERSONA-02** `personas/runbook.md` tells the audience-inferrer: how to detect artifact type, which panel to pick from the library, how to mix/match across families, when to add the layman + when to add the operator. Includes the structural-vs-surface failure-mode index per artifact type.
- [ ] **PERSONA-03** `personas/configs.json` declares per-artifact-type defaults (panel_size, convergence_threshold, editor_thinking_budget, max_rounds, **drift_threshold** — code mode stricter) — derived from the research files.
- [ ] **PERSONA-04** `agents/audience-inferrer.md` reads the library + runbook + configs at build-brief time (or has them inlined). Does NOT duplicate the full library — references it.
- [ ] **PERSONA-05** Library incorporates the structural-vs-surface design rule: every artifact type lists known structural failure modes (premise problems editor rewrites can't fix) sourced from the research markdown.
- [ ] **PERSONA-06** Code-review persona section in the library (staff eng, security, on-call SRE, new-hire-in-6-months, hostile-fork reviewer) — derived from research/product-engineering.md. Each persona's bounce trigger excludes "linter-catchable issues."

### Office Format Ingestion (v0.5.2)

- [ ] **FORMAT-01** `lib/loader.cjs` auto-detects file type by extension and dispatches to the appropriate converter. Supported on init: `.md`, `.markdown`, `.txt` (identity); `.docx` (`mammoth` → HTML → `turndown` → markdown); `.pptx` / `.xlsx` (`officeparser` unified AST); `.pdf` (`officeparser` primary, `unpdf` fallback — `unpdf` is ESM-only, loader uses dynamic `import()`). Pandoc fallback for everything else when present on PATH. **NOT used:** `xlsx` (SheetJS) — left npm 2023 with stale CVE; `pdf-parse` — abandoned. See `.planning/research/STACK.md` §What NOT to use.
- [ ] **FORMAT-01a** Every loader returns the typed-result contract `{ok:true, markdown, format, warnings[]} | {ok:false, reason:'encrypted'|'corrupt'|'unsupported'|'empty'|'too_large', detail}`. Loader callers branch on `ok`, never throw.
- [ ] **FORMAT-02** Loaders preserve structure in the markdown working copy with HTML-comment boundary markers the editor MUST preserve verbatim: slide N → `<!-- slide:N -->\n## Slide N — <title>`; sheet → `<!-- sheet:Name -->\n## Sheet: <name>` + markdown table; pdf page → `<!-- page:N -->\n## Page N`. Reviewers see structure; aggregator dedup uses markers as anchor.
- [ ] **FORMAT-03** Source binary is preserved at `.tumble-dry/<slug>/history/round-0-original.<ext>` (byte-for-byte). working.md is the markdown projection.
- [ ] **FORMAT-04** When source is non-markdown, `lib/loader.cjs` emits `.tumble-dry/<slug>/ROUNDTRIP_WARNING.md` BEFORE round 1 (not just at finalize) explaining "FINAL.md ships as markdown; manually re-apply to <source>". Slash command surfaces the warning to user.
- [ ] **FORMAT-05** `package.json` is introduced; `mammoth`, `turndown`, `officeparser`, `unpdf` declared as `optionalDependencies` so the headless `bin/` path still works without `npm install` for users only polishing markdown.
- [ ] **FORMAT-06** Loaders fail gracefully (return `{ok:false}`) with actionable messages on encrypted/password-protected files, oversized files (>20MB unless explicit override; loader forks to child process for >5MB to bound memory), unrecognized extensions.
- [ ] **FORMAT-07** Encoding correctness — UTF-8 default, BOM stripped, CJK + RTL preserved through the loader → markdown projection. Test fixtures in `tests/fixtures/format/` (CJK docx, RTL pdf, curly-quote xlsx, emoji md).

### Code Support (v0.6.0)

- [ ] **CODE-01** Source detected as code via `linguist-js` (extension + content heuristics) + shebang fallback. Detector contract: `{primary: lang, regions: [{lang, range}], confidence}` for polyglot artifacts (.ipynb cells, .html with embedded JS/CSS, shell-with-python-heredoc). Reviewer briefs include `language: <primary>` plus per-region annotations.
- [ ] **CODE-02** AST-aware drift report using **`web-tree-sitter` (WASM)** — NOT native `tree-sitter` bindings (break on Windows + Linux ARM + fresh macOS). Drift taxonomy: `unchanged | renamed | moved | modified | signature_changed | added | removed | reformatted` at function/symbol granularity. Signature changes on public API are permanent structural flag (cannot be silently auto-converged). Falls back to sentence diff if a language's WASM grammar isn't present.
- [ ] **CODE-03** `lib/loaders/code.cjs` produces a structured projection (file list with per-file fence blocks tagged with language) when source is a code directory rather than a single file.
- [ ] **CODE-04** Editor brief swaps voice excerpts for language-specific style anchors when artifact is code (PEP 8 for Python, Effective Go for Go, Rust API guidelines for Rust, JavaScript Standard for JS, language defaults table for others).
- [ ] **CODE-05** Code-review persona panel pulls from PERSONA-06 by default when artifact is code; layman gets replaced with new-hire-in-6-months. Reviewer briefs include "do NOT flag issues a linter would catch — assume linter clean."
- [ ] **CODE-06** Editor rewrite in code mode is constrained to NOT introduce undefined references / unimported modules / syntax errors. Failed parse on the redraft = drift report flags `proposed-redraft-invalid` and the loop continues without applying.
- [ ] **CODE-07** `verify_cmd` config hook: editor redraft must pass user-defined verify command (default `npm test -- --run` when `package.json` has a `test` script; otherwise none) AND tree-sitter parseability check before convergence is allowed. Failed verify_cmd = redraft rejected, loop continues with prior state. Sandboxing strategy documented in phase planning.

### Core Hardening (cross-cutting — derived from PITFALLS)

- [ ] **HARDEN-01** Voice-drift gate **BLOCKS** convergence (currently only reports). When cumulative content-drift from `round-0-original.md` exceeds threshold, mark round as `drift-blocked` and continue regardless of material count. Anti-reward-hack against editor convergence-by-claim-suppression (Pitfall 17).
- [ ] **HARDEN-02** Split `lib/voice.cjs` drift into `structural_drift` (markdown-only changes — heading reflow, list rewrap) and `content_drift` (substantive sentence rewrites). Only `content_drift` gates convergence. Structural drift is informational.
- [ ] **HARDEN-03** Aggregator dedup upgrade `lib/aggregator.cjs`: token-Jaccard → bigram-Dice for paraphrase robustness. Boundary markers from FORMAT-02 (`<!-- slide:N -->` etc.) used as additional anchors when present.
- [ ] **HARDEN-04** Round-N reviewer briefs are seeded with round-(N-1) **unresolved material clusters** so reviewers explicitly check "did the editor address X?" Stops findings from disappearing into nothing across rounds.
- [ ] **HARDEN-05** Trace retention default: last 3 rounds full, older rounds gzipped + summarized. `.tumble-dry/<slug>/traces/INDEX.md` lists what's retained vs. archived.
- [ ] **HARDEN-06** `.tumble-dry/` appended to project `.gitignore` automatically on first run (idempotent — checks for line presence). Prevents accidental commit of working copies + traces.

### Quality of Life — across the milestone

- [ ] **QOL-01** `/tumble-dry --help` prints scenario-shaped usage examples (polish a substack post, polish a pitch deck, polish a code refactor PR description, polish a docx).
- [ ] **QOL-02** README updated end-to-end with v0.5.x screenshots / sample output and the new Claude Code-native invocation as the primary path.
- [ ] **QOL-03** Examples directory grows: existing `examples/dogfood-2026-04-14/` (substack post) joined by ≥1 example for office-format polish + ≥1 example for code polish.

---

## v2 (deferred — not in this milestone)

- **ROUNDTRIP-01** Generate valid `.docx` / `.pptx` / `.xlsx` from edited markdown so source can be replaced in-place. Lossy and brittle; requires v0.7+ research.
- **MULTI-LLM-01** OpenAI / Gemini / local-model dispatch as alternatives to Anthropic. Anthropic-only through v0.6.
- **WEB-UI-01** Hosted SaaS or web-app frontend. CLI + plugin only through v0.6.
- **VOICE-FT-01** Personal fine-tuned voice model swap-in (the `fine_tune_model_path` config knob). Awaiting completion of the user's separate corpus project.
- **REAL-USER-01** Integration with real-user feedback channels (Posthog, Sentry, customer interview transcripts). Out of philosophy; tumble-dry simulates, doesn't substitute.

## Out of Scope (explicit exclusions)

- **Gastown / polecat backend** — Removed in v0.4.2. Slow, fragile, requires infra. Claude Code subagents replace it.
- **Automatic office-format roundtrip** — Lossy. Honest manual re-apply through v0.6.
- **Replacing tests / linters / type checkers** — Tumble-dry complements static analysis in code mode, never replaces it.
- **Real customer interviews / UX testing** — Tool simulates fictional reviewers; real users are a different category.

---

## Traceability

(Filled by `/gsd-roadmapper` after roadmap creation. Each requirement → exactly one phase.)

| REQ-ID | Phase |
|--------|-------|
| DISPATCH-01..08 | TBD |
| PERSONA-01..06 | TBD |
| FORMAT-01..07 | TBD |
| CODE-01..06 | TBD |
| QOL-01..03 | TBD |

---

*Defined: 2026-04-15 during v0.5.x milestone init.*
