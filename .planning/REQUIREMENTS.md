# Requirements — Milestone v0.5.x → v0.6.0

**Source:** PROJECT.md Active section, expanded with acceptance criteria.
**Scope:** v0.5.0 (Claude Code-native dispatch) → v0.5.1 (persona library) → v0.5.2 (office formats) → v0.6.0 (code-aware).
**Out-of-scope items:** see PROJECT.md Out of Scope section.

---

## v1 Requirements (this milestone)

### Dispatch — Claude Code-native (v0.5.0)

- [ ] **DISPATCH-01** Slash command `/tumble-dry <artifact>` runs the full convergence loop using only the user's active Claude Code session — no `ANTHROPIC_API_KEY` required, no separate process.
- [ ] **DISPATCH-02** Each agent (audience-inferrer, assumption-auditor, reviewer × N personas, editor) is dispatched as a parallel `Task(subagent_type=...)` call. Reviewers fan out in one parallel batch per round, reads fan back in via per-agent output files.
- [ ] **DISPATCH-03** `agents/*.md` frontmatter conforms to current Claude Code subagent spec (verified `name`, `description`, `tools` fields; agent name routes correctly when `Task` is invoked with `subagent_type` matching the frontmatter `name`).
- [ ] **DISPATCH-04** `marketplace.json` declares each agent so installing the plugin makes the subagent_types available without manual registration.
- [ ] **DISPATCH-05** Loop orchestration lives in `commands/tumble-dry.md` as prose + bash + Task calls. The bash steps shell out to `bin/tumble-dry.cjs` for data-plane work (init, brief generation, aggregate, drift, finalize) — no LLM calls in bin/.
- [ ] **DISPATCH-06** `bin/tumble-dry-loop.cjs` (the legacy autonomous Node driver) keeps working as the headless / CI fallback. Its docstring + `--help` direct users to `/tumble-dry` for session-auth path.
- [ ] **DISPATCH-07** Slash command surfaces per-round status to the user (round N starting, M reviewers dispatched, K material findings, converged/continuing) using the existing `[tumble-dry-loop]` log idiom.
- [ ] **DISPATCH-08** Failure modes — Task timeout, malformed agent output, refusal — are caught and reported per-agent with continue/abort prompts (not a silent loop crash).

### Persona Library (v0.5.1)

- [ ] **PERSONA-01** `personas/library.md` ships covering ≥30 artifact types across 4 families (business/finance, product/engineering, marketing/comms, domain-specific). Each persona has: name, role, 1-2 sentence bio, hiring job, bounce trigger, one load-bearing belief.
- [ ] **PERSONA-02** `personas/runbook.md` tells the audience-inferrer: how to detect artifact type, which panel to pick from the library, how to mix/match across families, when to add the layman + when to add the operator.
- [ ] **PERSONA-03** `personas/configs.json` declares per-artifact-type defaults (panel_size, convergence_threshold, editor_thinking_budget, max_rounds) — derived from the research files.
- [ ] **PERSONA-04** `agents/audience-inferrer.md` reads the library + runbook + configs at build-brief time (or has them inlined). Does NOT duplicate the full library — references it.
- [ ] **PERSONA-05** Library incorporates the structural-vs-surface design rule: every artifact type lists known structural failure modes (premise problems editor rewrites can't fix) sourced from the research markdown.
- [ ] **PERSONA-06** Code-review persona section in the library (staff eng, security, on-call SRE, new-hire-in-6-months, hostile-fork reviewer) — derived from research/product-engineering.md.

### Office Format Ingestion (v0.5.2)

- [ ] **FORMAT-01** `lib/loader.cjs` auto-detects file type by extension and dispatches to the appropriate converter. Supported on init: `.md`, `.markdown`, `.txt`, `.docx` (mammoth), `.pptx` (OOXML or library), `.xlsx` (SheetJS), `.pdf` (pdf-parse). Pandoc fallback for everything else when present on PATH.
- [ ] **FORMAT-02** Loaders preserve structure in the markdown working copy: slide N → `## Slide N — <title>` headings; sheet N → `## Sheet: <name>` + markdown table; pdf page N → `## Page N` markers. Reviewers see structure, not just flattened text.
- [ ] **FORMAT-03** Source binary is preserved at `.tumble-dry/<slug>/history/round-0-original.<ext>` (byte-for-byte). working.md is the markdown projection.
- [ ] **FORMAT-04** `polish-log.md` includes a "this artifact was a `.<ext>`; FINAL.md is markdown — re-apply manually to <source>" notice when source is non-markdown. No automatic roundtrip in this milestone.
- [ ] **FORMAT-05** `package.json` is introduced; office-format deps are declared `optionalDependencies` so the headless `bin/` path still works without npm install for users only polishing markdown.
- [ ] **FORMAT-06** Loaders fail gracefully with actionable messages on encrypted/password-protected files, oversized files (>20MB unless explicit override), unrecognized extensions.
- [ ] **FORMAT-07** Encoding correctness — UTF-8 default, BOM stripped, CJK + RTL preserved through the loader → markdown projection.

### Code Support (v0.6.0)

- [ ] **CODE-01** Source detected as code (extension match against a language table; shebang fallback) feeds reviewer briefs with `language: <lang>` context. Reviewers know they're reading code.
- [ ] **CODE-02** AST-aware drift report when artifact is code: classify changes as `unchanged | renamed | moved | logic-changed | added | removed` at function/symbol granularity rather than sentence overlap. Falls back to sentence diff if tree-sitter binding unavailable.
- [ ] **CODE-03** `lib/loaders/code.cjs` produces a structured projection (file list with per-file fence blocks tagged with language) when source is a code directory rather than a single file.
- [ ] **CODE-04** Editor brief swaps voice excerpts for language-specific style anchors when artifact is code (PEP 8 for Python, Effective Go for Go, Rust API guidelines for Rust, language defaults table for others).
- [ ] **CODE-05** Code-review persona panel pulls from PERSONA-06 by default when artifact is code; layman gets replaced with new-hire-in-6-months.
- [ ] **CODE-06** Editor rewrite in code mode is constrained to NOT introduce undefined references / unimported modules / syntax errors. Failed parse on the redraft = drift report flags `proposed-redraft-invalid` and the loop continues without applying.

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
