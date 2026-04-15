# Phase 2: PERSONA (v0.5.1) - Context

**Gathered:** 2026-04-15
**Mode:** Auto-generated

<domain>
## Phase Boundary
The audience-inferrer detects artifact type and selects a mixed-incentive panel + tuned config from a comprehensive library, with no user tuning required. Synthesizes the 4 existing research files (research/*.md) into operational artifacts.

**In-scope:**
- `personas/library.md` — ≥30 artifact types × 5-7 personas with mandatory fields (name, role, bio, hiring job, bounce trigger, load-bearing belief)
- `personas/runbook.md` — detection → panel selection → mix-and-match rules; structural-vs-surface failure-mode index
- `personas/configs.json` — per-artifact-type defaults (panel_size, convergence_threshold, editor_thinking_budget, max_rounds, drift_threshold)
- `agents/audience-inferrer.md` — references library + runbook + configs (does not duplicate)
- Code-review persona section (PERSONA-06) — staff eng, security, on-call SRE, new-hire-in-6-months, hostile-fork

**Source material (already on disk):**
- research/business-finance.md (~4200 words, 10 artifact types, ~50 sources)
- research/product-engineering.md (~3200 words, 10 artifact types, 35 sources)
- research/marketing-comms.md (~6200 words, 10 artifact types)
- research/domain-specific.md (~4200 words, 5 domains × 2 types = 10 types)
- research/SUMMARY.md, research/STACK.md, research/FEATURES.md, research/PITFALLS.md
</domain>

<decisions>
All implementation choices at Claude's discretion. Defaults pulled from research files where stated. Mandatory fields per persona (PERSONA-01 + SUMMARY.md deltas):
- name (invented OK), role, 1-2 sentence bio, hiring job, bounce trigger, ONE load-bearing belief
- Panels MUST mix believers + skeptics (anti-mode-collapse Pitfall 16)
</decisions>

<code_context>
- agents/audience-inferrer.md exists with persona-library tables inline (financial model, copy, pitch deck, blog, strategy doc) — must be replaced with reference to personas/ files
- personas/ directory already exists (created at GSD init) but empty
</code_context>

<specifics>
- File format: markdown for library + runbook (human-editable); JSON for configs (machine-consumed by lib/reviewer-brief.cjs)
- Code review personas (PERSONA-06): pull from research/product-engineering.md, exclude "linter-catchable issues" from each persona's bounce trigger
- Total artifact types in library: ≥30 (sum across 4 family research files = 40 raw; dedupe + curate to ≥30)
</specifics>

<deferred>
- Audience-inferrer behavioral changes beyond library reference: DEFER to v0.5.2 if simple reference works
- Persona library auto-generation tooling: out of scope; this is hand-curated from research
</deferred>
