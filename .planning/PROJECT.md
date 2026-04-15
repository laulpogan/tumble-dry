# tumble-dry

## What This Is

An open-source convergence-loop content polisher: it dispatches a panel of in-character reviewer personas at any written artifact (docs, copy, decks, financial models, code), aggregates their critique, redrafts in the author's own voice, and repeats until reviewers stop finding material problems. Ships as a Claude Code plugin (`/tumble-dry`) with an opt-in headless Node CLI for CI/scripting.

## Core Value

A solo author can simulate publishing-day pushback in 5–15 minutes per round and ship a piece that has already been stress-tested by the people they actually fear — without burning real users, real money, or real reputation.

## Requirements

### Validated

<!-- Shipped through v0.6.0 -->

- ✓ **CORE-01** Convergence loop: audience → audit → reviewer wave → aggregate → editor redraft → repeat — v0.1
- ✓ **CORE-02** Multi-round persistence detection (same finding 2+ rounds → STRUCTURAL) — v0.3
- ✓ **CORE-03** Source artifact never modified; per-round history snapshots in `.tumble-dry/<slug>/history/` — v0.4
- ✓ **CORE-04** Per-dispatch reasoning traces (request, response, extended thinking) in `round-N/traces/` — v0.4 (full on headless API path; reduced trace fidelity on CC slash-command path due to subagent context isolation)
- ✓ **CORE-05** Voice anchor self-defaults to source-self-sampling when `voice_refs` is empty — v0.4.2
- ✓ **CORE-06** Persona libraries by artifact type seeded into audience-inferrer (financial model, copy, pitch deck, blog, strategy doc) — v0.3
- ✓ **CORE-07** Headless Node CLI (`bin/tumble-dry-loop.cjs`) with API-key dispatch + prompt caching — v0.2
- ✓ **DISPATCH-01..08** Claude Code-native dispatch via parallel Task subagents (no API key) + plugin spec compliance (.claude-plugin/) + validator + partial-round policy — v0.5.0
- ✓ **PERSONA-01..06** 40 artifact-type panels with mixed-incentive defaults + runbook + configs.json + audience-inferrer routing — v0.5.1
- ✓ **HARDEN-01..06** Voice-drift gate blocks convergence (anti-reward-hack) + structural/content drift split + bigram-Dice dedup + round-N brief seeding + trace retention + .gitignore bootstrap — v0.5.1.5
- ✓ **FORMAT-01..07** Office format ingestion (.docx via mammoth+turndown, .pptx/.xlsx/.pdf via officeparser, unpdf fallback) + typed-result loader contract + structural boundary markers + ROUNDTRIP_WARNING surface + package.json with optionalDependencies — v0.5.2
- ✓ **CODE-01..07** Code as first-class artifact: linguist-js detection + web-tree-sitter (WASM) AST drift + signature_changed permanent structural flag + language style anchors + editor-code agent + reviewer code-mode branch + verify_cmd config gate — v0.6.0
- ✓ **QOL-01..03** Scenario-shaped --help, README polish, examples/{office-format,code} READMEs, CHANGELOG.md — v0.6.0

### Active

<!-- v0.7 milestone — ROUNDTRIP -->

- [ ] **ROUNDTRIP-01** Opt-in flag `--apply` (slash command) / `--write-final` (CLI). Default behavior unchanged: FINAL.md only + manual re-apply hint. With flag, write `FINAL.<ext>` alongside FINAL.md by re-rendering markdown into the source format.
- [ ] **ROUNDTRIP-02** `.docx` writer using `docx` npm lib. Preserve heading levels (H1-H6), paragraphs, lists (ordered + unordered), simple tables, inline emphasis (bold/italic/code). Lossy: complex layouts, images, embedded objects, comments, track-changes. Document losses in LOSSY_REPORT.md.
- [ ] **ROUNDTRIP-03** `.pptx` writer using `pptxgenjs`. Re-render each `<!-- slide:N -->` boundary as one slide; H2 → title, body → bullets/text. Lossy: original templates, animations, embedded media, slide masters, speaker notes (preserved if present in source markdown, else dropped).
- [ ] **ROUNDTRIP-04** `.xlsx` writer using `exceljs` (NOT SheetJS — same CVE rationale as ingestion). Re-render each `<!-- sheet:Name -->` markdown table as one sheet. Lossy: formulas (markdown table can't carry them), pivot tables, charts, conditional formatting, named ranges.
- [ ] **ROUNDTRIP-05** `LOSSY_REPORT.md` per run when `--apply` used: lists what survived, what was dropped, what was approximated. Surface to user before they ship the regenerated file.
- [ ] **ROUNDTRIP-06** PDF roundtrip: explicitly NOT supported. When source is `.pdf` and `--apply` set, error with actionable message: "PDF roundtrip is not supported. Use FINAL.md and re-typeset, or use a markdown→PDF tool of your choice (pandoc, weasyprint, etc.)."
- [ ] **ROUNDTRIP-07** Tests + per-format smoke fixtures. Round-trip a known docx, verify regenerated docx loads in mammoth and produces equivalent markdown (within preserved-structure tolerance).
- [ ] **ROUNDTRIP-08** README + CHANGELOG entries; v0.7.0 version bump; SlanchaAi marketplace sync.

### Out of Scope

<!-- Explicit boundaries -->

- **Gastown / polecat backend** — Removed in v0.4.2. Slow, fragile, requires infra most users don't have. Claude Code-native dispatch covers the multi-context use case.
- **PDF roundtrip** — Out of scope permanently. Markdown → PDF is a different rendering problem with multiple acceptable tools (pandoc, weasyprint, etc.) — ROUNDTRIP-06 errors with actionable guidance instead.
- **Lossless office roundtrip** — `.docx` / `.pptx` / `.xlsx` roundtrip in v0.7 is explicitly LOSSY (no formulas, charts, embedded media, layout templates, animations). LOSSY_REPORT.md surfaces what dropped per run.
- **Real customer interviews / UX testing** — Tumble-dry simulates fictional reviewers. It complements, never replaces, real user contact for product/UX decisions.
- **Replacing tests / linters / type checkers** — Code mode complements static analysis, doesn't replace it.
- **Bring-your-own-LLM beyond Anthropic** — Stays Anthropic-only through v0.6. OpenAI/Gemini/local-model dispatch is a v0.8+ research item.
- **Web UI / hosted SaaS** — CLI + Claude Code plugin only. No managed service in this scope.

## Context

**Already shipped:** v0.4.2 is live at https://github.com/laulpogan/tumble-dry, mirrored as `tumble-dry@slanchaai` in https://github.com/SlanchaAi/skills marketplace. Repo layout was just flattened (plugin contents at root, no nested `tumble-dry/tumble-dry/`). Persona research already complete: 4 markdown files in `research/` (business-finance, product-engineering, marketing-comms, domain-specific) totaling ~17,000 words and ~150 cited sources — these feed PERSONA-01/02/03 directly, no re-research needed.

**Architecture pivot just landed:** v0.4.2 ripped gastown and made voice self-default. The Active milestone hinges on DISPATCH-01: making the tool usable from Claude Code with zero API-key setup. This is the difference between "another CLI tool" and "a slash command anyone can run."

**User profile:** Solo writer/PM at NVIDIA, also building a personal voice-fine-tuning corpus (Qwen3-32B on DGX Spark). Tumble-dry is a tool for his own writing first; open-source distribution is a side-effect of dogfooding. Style strongly favors: shipping over architecting, surgical changes over refactors, terse documentation, no unsolicited features.

**Methodology source:** `docs/adversarial-review-process.md` — internal post documenting the multi-round adversarial-critique pattern that tumble-dry automates. Used by the author on real financial models and copy before the tool existed.

## Constraints

- **Tech stack**: Pure Node.js (no transpile, no bundler), no `package.json` (intentional — keeps install to a single `git clone`). Adding office-format loaders in v0.5.2 will require introducing `package.json` + `node_modules` for `mammoth`, `xlsx`, `pdf-parse`. Trade-off accepted.
- **Auth**: v0.5.0 must work with zero API-key setup (Claude Code session inheritance). Headless CLI keeps requiring `ANTHROPIC_API_KEY` — that's its raison d'être.
- **Non-destructive**: Source files are NEVER modified. Working copy + per-round history under `.tumble-dry/<slug>/`. This invariant predates the project and is non-negotiable.
- **Voice**: When `voice_refs` is empty (the common case), self-sample from the source. Editor brief explicitly told to preserve source voice, not impose generic editorial tone.
- **Plugin distribution**: Must work as a Claude Code plugin AND a standalone clone AND a git submodule AND via the SlanchaAi marketplace. Path resolution is hard; keep `commands/tumble-dry.md` flexible.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Rip gastown entirely (v0.4.2) | Slow, fragile, infra-heavy. Claude Code subagents cover the multi-context use case for free. | ✓ Good — cleanest backend story |
| Voice self-defaults to source-sampling | Most users polish a single doc with no past corpus. Forcing voice_refs configuration was friction. | — Pending (validate in v0.5.0+ runs) |
| Keep headless Node CLI as opt-in fallback | CI/scripting use cases need API-key dispatch. Pure plugin would lose them. | — Pending |
| Office format roundtrip is out of scope | Generating valid binary office formats from edited markdown is lossy. Manual re-apply is honest. | — Pending |
| Code is plaintext through v0.5.x, AST-aware in v0.6 | Ship code support fast at low fidelity, then improve. | — Pending |
| GSD-Town used as build framework, NOT shipped inside tumble-dry | GSD is methodology; tumble-dry stays standalone. | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-15 after initialization*
