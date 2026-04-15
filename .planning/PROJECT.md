# tumble-dry

## What This Is

An open-source convergence-loop content polisher: it dispatches a panel of in-character reviewer personas at any written artifact (docs, copy, decks, financial models, code), aggregates their critique, redrafts in the author's own voice, and repeats until reviewers stop finding material problems. Ships as a Claude Code plugin (`/tumble-dry`) with an opt-in headless Node CLI for CI/scripting.

## Core Value

A solo author can simulate publishing-day pushback in 5–15 minutes per round and ship a piece that has already been stress-tested by the people they actually fear — without burning real users, real money, or real reputation.

## Requirements

### Validated

<!-- Shipped through v0.4.2 -->

- ✓ **CORE-01** Convergence loop: audience → audit → reviewer wave → aggregate → editor redraft → repeat — v0.1
- ✓ **CORE-02** Multi-round persistence detection (same finding 2+ rounds → STRUCTURAL) — v0.3
- ✓ **CORE-03** Source artifact never modified; per-round history snapshots in `.tumble-dry/<slug>/history/` — v0.4
- ✓ **CORE-04** Per-dispatch reasoning traces (request, response, extended thinking) in `round-N/traces/` — v0.4
- ✓ **CORE-05** Voice anchor self-defaults to source-self-sampling when `voice_refs` is empty — v0.4.2
- ✓ **CORE-06** Persona libraries by artifact type seeded into audience-inferrer (financial model, copy, pitch deck, blog, strategy doc) — v0.3
- ✓ **CORE-07** Headless Node CLI (`bin/tumble-dry-loop.cjs`) with API-key dispatch + prompt caching — v0.2

### Active

<!-- v0.5.0 → v0.6.0 milestone scope -->

- [ ] **DISPATCH-01** Claude Code-native dispatch: `/tumble-dry` slash command spawns each agent as parallel `Task` subagents in the user's active session — no API key required
- [ ] **DISPATCH-02** Agents adapted to Claude Code subagent spec (frontmatter `name` / `description` / `tools` correctly registered via `marketplace.json`)
- [ ] **DISPATCH-03** Loop logic moves from `bin/tumble-dry-loop.cjs` into the slash command's prose workflow; bin/ stays as headless/CI fallback
- [ ] **PERSONA-01** Comprehensive persona library covering business/finance, product/engineering, marketing/comms, domain-specific (healthcare, legal, government, academic, education) — derived from `research/*.md`
- [ ] **PERSONA-02** Runbook (PERSONAS.md + RUNBOOK.md) telling the audience-inferrer how to detect artifact type and pick the right panel
- [ ] **PERSONA-03** Tumble-dry config defaults per artifact type (panel size, convergence threshold, thinking budget, max rounds) — driven from research outputs
- [ ] **FORMAT-01** Office format ingestion: `.docx` (mammoth), `.pptx` (OOXML parse), `.xlsx` (SheetJS), `.pdf` (pdf-parse), `.md`/`.txt` direct, pandoc fallback for everything else
- [ ] **FORMAT-02** Loader produces structured markdown working copy preserving slide/sheet/page boundaries; source binary still preserved in `history/round-0-original.<ext>`
- [ ] **FORMAT-03** FINAL.md ships as markdown with explicit "manually re-apply to <source>" hint in `polish-log.md` (no automatic roundtrip in this milestone)
- [ ] **CODE-01** Code first-class: language detection (extension + shebang + tree-sitter) feeds reviewer briefs with language context
- [ ] **CODE-02** AST-aware drift report: line/symbol-level rather than sentence-level when artifact is code
- [ ] **CODE-03** Language-specific style anchors (PEP 8, Effective Go, Rust API guidelines) replace voice excerpts when artifact is code
- [ ] **CODE-04** Code-review persona library: staff eng, security, on-call SRE, new-hire-in-6-months, reviewer-from-hostile-fork

### Out of Scope

<!-- Explicit boundaries -->

- **Gastown / polecat backend** — Removed in v0.4.2. Slow, fragile, requires infra most users don't have. Claude Code-native dispatch covers the multi-context use case.
- **Automatic roundtrip back to office formats** — Generating valid `.pptx` / `.xlsx` / `.docx` from edited markdown is lossy and brittle (charts, layout, embedded media). Out of scope through v0.6; ships as v0.7+ research item.
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
