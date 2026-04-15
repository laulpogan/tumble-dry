# Feature Research — tumble-dry v0.5.0 → v0.6.0

**Domain:** Content-polish-via-multi-agent-critique (Claude Code plugin + headless CLI)
**Researched:** 2026-04-15
**Confidence:** HIGH (product scope is tight, PROJECT.md Out-of-Scope already defines anti-features, competitive landscape is well-mapped)

## Scope of this doc

v0.4.2 has shipped: convergence loop, audience inference, assumption audit, parallel reviewers, voice-preserving editor, drift metric, structural-finding detection, persistence-across-rounds, history snapshots, reasoning traces.

This FEATURES.md answers: **what must v0.5.0 → v0.6.0 add to stay in the content-polish-via-multi-agent-critique category, what gives tumble-dry durable competitive advantage, and what must be refused.**

---

## Competitive landscape (compressed)

| Category | Example | What they do well | What tumble-dry should steal / avoid |
|---|---|---|---|
| Code-review loops | Cursor, Aider, Continue.dev, Cody | IDE-native invocation, language-aware diffs, apply/reject hunks, multi-file context | Steal: IDE-native invocation (= Claude Code slash command). AST-aware diffs. Apply/reject UX. |
| Voice-preserving writing | Lex.page, Sudowrite, Notion AI | Inline rewrite with voice lock, "show me three versions", canvas view | Steal: voice anchors, multi-variant presentation. Avoid: SaaS + proprietary stack. |
| Grammar/style writing coaches | Grammarly Business, Hemingway, Wordtune | Style-rule checks, readability scores, "what-if" rewrites | Steal: readability gates for domain artifacts (Flesch-Kincaid for consent forms, CCI for health). Avoid: single-voice "improve" button. |
| Multi-agent debate/critique | AutoGen, CrewAI, ChatDev | Persona frameworks, turn-taking, group chat transcripts | Avoid: heavyweight orchestration; tumble-dry is convergence-first, not debate-first. |
| Academic peer-review simulators | OpenReview GPT, Reviewer2 simulators | Venue-calibrated scoring rubrics, "reviewer 2" archetype | Steal: venue rubrics (CONSORT, PRISMA, NIH scoring) as a seed for domain-specific reviewers. |
| Claude Code internal prompt tooling | Anthropic's red-team / prompt-eval tools (not all public) | Structured eval runs, before/after comparison, persona libraries | Steal: structured eval output per round (already done). |

The punchline: tumble-dry sits in a unique cell — *convergence-driven critique* (not single-pass edits, not open-ended debate) *over arbitrary written artifacts* (not just code, not just prose) *run from inside Claude Code* (not a web app, not an IDE sidebar). The feature list below reinforces that cell, not every adjacent cell.

---

## Feature Landscape

### Table Stakes (must ship in v0.5.x or users bounce to Cursor / Lex / Sudowrite / Aider)

Features the user already expects because every adjacent product ships them.

| ID | Feature | Why Expected | Complexity | Milestone |
|---|---|---|---|---|
| TS-01 | **Zero-API-key install** — run from inside Claude Code with no `ANTHROPIC_API_KEY` setup | Cursor/Claude Code users expect "install plugin → works." Requiring an API key is 2025-era friction. | M | **v0.5.0 (DISPATCH-01)** |
| TS-02 | **Single-command invocation** — `/tumble-dry <path>` just works | Every competitor has a one-shot hotkey/command. Multi-step setup = bounce. | S | **v0.5.0 (DISPATCH-01)** |
| TS-03 | **Progress visible during run** — each reviewer's name, status, finish order shown live | Cursor/Aider show streaming output; 5–15 min of silence feels broken. | S | **v0.5.0 (DISPATCH-01)** |
| TS-04 | **Final artifact is diffable** — FINAL.md + clear "what changed vs. source" view | Every code-review tool shows a diff. Writers expect the same. | S | v0.5.0 (likely already partial via history/) |
| TS-05 | **Office format ingestion** — `.docx`, `.pptx`, `.xlsx`, `.pdf` in, markdown working-copy preserved | Business users live in Office. Refusing .pptx = refusing the deck-polish use case, which is the primary pitch. | L | **v0.5.2 (FORMAT-01/02/03)** |
| TS-06 | **Code-as-artifact with language awareness** — language detection + language-appropriate style anchors | Aider/Cursor define the category. Code mode must exist or "we polish code" is a lie. | M | **v0.6.0 (CODE-01/03)** |
| TS-07 | **Convergence or max-round stop** — run terminates with an obvious status (converged / hit max / error) | Nobody ships a loop without a clean stop condition. Already shipped v0.1; validate it holds under DISPATCH-01. | S | v0.5.0 (carry-forward) |
| TS-08 | **Non-destructive by default** — source file never mutated | Git-native users require this. Already shipped as CORE-03; must survive DISPATCH-01 refactor. | S | v0.5.0 (carry-forward invariant) |
| TS-09 | **Per-run artifact directory** — everything under `.tumble-dry/<slug>/` with rounds, traces, history | Post-hoc inspection is table stakes for anything that runs for 15 min. Already shipped. | S | v0.5.0 (carry-forward) |
| TS-10 | **Comprehensive persona library keyed by artifact type** | Domain-blind reviewers produce domain-blind critique. Health docs need CDC CCI checkers, not "a smart reviewer." Competitors ship domain packs; tumble-dry must too. | M | **v0.5.1 (PERSONA-01/02/03)** driven by the four completed `research/*.md` files |

### Differentiators (durable competitive advantage — tumble-dry's moat)

These are the reasons a user picks tumble-dry over Cursor/Lex/Sudowrite. They all derive directly from the convergence-loop architecture plus the persona library.

| ID | Feature | Value Proposition | Complexity | Milestone |
|---|---|---|---|---|
| DIFF-01 | **Multi-round persistence detection (STRUCTURAL findings)** | Catches findings that survive a rewrite — the ones that indicate a real architectural problem, not a cosmetic nit. No competitor does this. Already shipped v0.3; keep it. | — | Validated (v0.3) |
| DIFF-02 | **Per-artifact-type persona panels with mixed incentives** | Every panel includes a believer, an operator, an auditor, an outside skeptic, an end-reader proxy (rule from the business-finance research). Cursor's code review has one persona ("senior dev"); Lex's editor has one persona ("copyeditor"). Mixed-incentive panels are the competitive edge. | M | **v0.5.1 (PERSONA-01/02)** |
| DIFF-03 | **Voice self-sampling default** | User dumps a doc, tumble-dry infers voice from the source — no prior corpus required. Lex/Sudowrite require voice training. Already shipped v0.4.2. | — | Validated (v0.4.2) |
| DIFF-04 | **Config auto-tunes to artifact type** (panel size, convergence threshold, thinking budget, max rounds) | A 10-K needs 8 rounds + 8K thinking tokens; an investor update needs 3 rounds + 2.5K. Users don't want to tune; tumble-dry picks. Competitors force users to tune prompts themselves. | M | **v0.5.1 (PERSONA-03)** |
| DIFF-05 | **Runs as Claude Code subagents in-session** (no infra, no API key) | Cursor requires an account; Sudowrite requires SaaS; Aider requires local LLM setup; AutoGen requires Python orchestration. tumble-dry runs inside the session the user is already in. This is the distribution moat. | M | **v0.5.0 (DISPATCH-01/02/03)** |
| DIFF-06 | **Arbitrary artifact type** (doc, deck, spreadsheet, PDF, code, financial model) | Cursor is code-only. Lex is prose-only. Sudowrite is narrative-only. Grammarly is grammar-only. tumble-dry is format-agnostic by design. | L | v0.5.2 (FORMAT-01) + v0.6.0 (CODE-01) |
| DIFF-07 | **Reasoning traces persisted per dispatch** (request, response, extended thinking) | Audit trail for why a reviewer said what. Differentiator against SaaS tools that hide the prompt. Already shipped v0.4. | — | Validated (v0.4) |
| DIFF-08 | **AST-aware drift report for code** | Code reviews at the symbol level ("function X changed signature") not the sentence level. Aider does this partially; tumble-dry makes it first-class. | L | **v0.6.0 (CODE-02)** |
| DIFF-09 | **Language-specific style anchors** (PEP 8, Effective Go, Rust API guidelines) replace voice excerpts in code mode | Cursor/Aider lean on model priors; tumble-dry cites the actual style guide. Auditable, overrideable. | M | **v0.6.0 (CODE-03)** |
| DIFF-10 | **Domain checks as first-class panel members** (CDC Clear Communication Index, Flesch-Kincaid, CONSORT-A, NIH Simplified Review) | From `research/domain-specific.md`: regulated artifacts have measurable failure modes. A reviewer that computes the actual score and flags below-threshold is beyond what any general writing tool does. | M | **v0.5.1** (wire into PERSONA-01 panels where research specifies) |
| DIFF-11 | **Source artifact survives** (history/round-0-original preserved; FINAL.md separate) | Git-safe, rollback-safe, diffable. Already shipped as CORE-03. Competitors that inline-edit (Lex, Grammarly) can't offer this. | — | Validated (v0.4) |
| DIFF-12 | **Dual distribution: plugin + headless CLI** | Interactive polish (plugin) AND CI/scripting (CLI). Cursor is IDE-only; Aider is CLI-only. tumble-dry serves both. Already shipped via CORE-07 + DISPATCH-03. | S | v0.5.0 (keep both paths) |

### Anti-features (explicitly NOT building — per PROJECT.md Out of Scope + derived)

Features that adjacent tools have and that tumble-dry must refuse. Each is listed with the request trigger and the refusal rationale so the answer is ready when a user asks "why doesn't tumble-dry do X?"

| ID | Anti-feature | Why Requested | Why Refused | Alternative |
|---|---|---|---|---|
| ANTI-01 | **Automatic roundtrip to .docx/.pptx/.xlsx** | "I edited the markdown, now put it back in PowerPoint." | Binary office generation from edited markdown is lossy (charts, layout, embedded media, speaker notes). One bad roundtrip kills user trust. | FINAL.md ships with an explicit "manually re-apply to `<source>`" hint in `polish-log.md`. Revisit as v0.7+ research. (PROJECT.md) |
| ANTI-02 | **Replace real user/customer interviews** | "Can your personas replace user research?" | They can't. Synthetic personas catch *plausibility* failures, not *actual-human-behavior* failures. Claiming otherwise is product dishonesty. | Tumble-dry complements user research. Explicit disclaimer in README and `polish-log.md`. |
| ANTI-03 | **Replace tests / linters / type checkers for code** | "Can tumble-dry's code panel replace our CI?" | Static analysis and tests run on every commit; tumble-dry runs on demand at 5–15 min/round. Different tools for different cadences. | Code panel cites that tests/linters/types already caught X; reviewer focuses on structure, readability, security, API design. (PROJECT.md) |
| ANTI-04 | **Bring-your-own-LLM (OpenAI, Gemini, local models) through v0.6** | "I have GPT-5 credits, can I use them?" | Each LLM has different prompt-caching behavior, extended-thinking semantics, tool-call formats. Supporting three means supporting none well. | Anthropic-only through v0.6. Revisit as v0.8+ research. (PROJECT.md) |
| ANTI-05 | **Web UI / hosted SaaS** | "I don't want to install a CLI, just give me a URL." | SaaS introduces auth, billing, multi-tenancy, secrets handling, legal review of user content. None of that advances the core thesis. | CLI + Claude Code plugin. If a user wants a GUI, they use Claude Code. (PROJECT.md) |
| ANTI-06 | **Gastown / polecat backend** | "Can reviewers run on my own cluster?" | Already ripped in v0.4.2. Slow, fragile, infra-heavy. Claude Code subagents cover the multi-context use case for free. | DISPATCH-01 as the default. (PROJECT.md) |
| ANTI-07 | **Group-chat / debate between reviewers** (AutoGen/ChatDev style) | "Can the personas argue with each other?" | Debate frameworks are entertaining but don't produce more signal than parallel independent review + structural-finding detection. Adds latency, cost, complexity. | Parallel reviewers → aggregator → editor. The convergence loop IS the debate, across rounds. |
| ANTI-08 | **Inline diff-accept UX** (like Cursor "accept / reject hunk") | "Let me accept findings one by one in my editor." | Violates the non-destructive invariant and the convergence model (editor redrafts holistically, not hunk-by-hunk). Would require an IDE integration layer that doesn't exist yet. | User reviews FINAL.md and manually copy-pastes what they want. If demand is strong in v0.7+, revisit. |
| ANTI-09 | **Built-in grammar/spell rules engine** (Grammarly-style) | "Can tumble-dry replace Grammarly?" | Adding a rules engine duplicates the reviewer panel with worse signal. The copyeditor persona already catches grammar in context. | Use Grammarly/Hemingway before tumble-dry if desired; tumble-dry operates above that layer. |
| ANTI-10 | **Non-Anglophone language support** (first-class) | "Can tumble-dry polish Spanish docs?" | The model handles it in practice, but voice-anchor + readability metrics + persona libraries are English-tuned. Claiming multilingual support without testing it is dishonest. | Works in any language Claude handles; explicit note in README that the persona library + readability checks are English-calibrated. |
| ANTI-11 | **Persistent user accounts / cross-run memory** | "Remember my voice across projects." | Cross-run memory requires storage, auth, privacy review, data retention. The `.tumble-dry/<slug>/` directory is the memory; git is the versioning. | Users who want cross-run voice can point `voice_refs` at a stable folder. |
| ANTI-12 | **Auto-apply findings without an editor pass** | "Just fix everything the reviewers flagged." | Bypasses voice preservation. The editor pass is where voice is protected; skipping it turns tumble-dry into a generic rewriter. | Editor pass is non-optional. |

---

## Feature Dependencies

```
TS-01 (zero-API-key)
  └─ depends on ─> DISPATCH-01 (Claude Code-native dispatch)
       └─ depends on ─> DISPATCH-02 (agents adapted to subagent spec)
       └─ enables ────> DISPATCH-03 (loop moves to slash command prose)

TS-10 (persona library by artifact type)
  └─ depends on ─> PERSONA-01 (library seeded from research/*.md)
       └─ depends on ─> PERSONA-02 (RUNBOOK.md teaches audience-inferrer)
       └─ enables ────> PERSONA-03 (per-artifact config defaults)
                              └─ enables ──> DIFF-04 (config auto-tunes)
                              └─ enables ──> DIFF-10 (domain checks as reviewers)

TS-05 (office formats)
  └─ depends on ─> FORMAT-01 (ingestion: mammoth, xlsx, pdf-parse, pandoc)
       └─ depends on ─> package.json introduction (accepted trade-off per PROJECT.md Constraints)
       └─ enables ────> FORMAT-02 (structured markdown preserving slide/sheet boundaries)
       └─ enables ────> FORMAT-03 (FINAL.md + manual re-apply hint)
  └─ BLOCKS ─> TS-06 for binary-distributed code (e.g., notebooks embedded in .docx) —
               CODE-01 on .py/.js/.go files does NOT depend on FORMAT-01.

TS-06 (code-as-artifact)
  └─ depends on ─> CODE-01 (language detection via extension + shebang + tree-sitter)
       └─ enables ────> CODE-03 (language-specific style anchors, which replace voice excerpts)
       └─ enables ────> CODE-04 (code-review persona library)
  └─ enables ────> DIFF-08 / CODE-02 (AST-aware drift)

DIFF-05 (Claude Code-native dispatch)
  └─ conflicts with ─> ANTI-06 (gastown) — already resolved by ripping gastown in v0.4.2

DIFF-04 (config auto-tunes)
  └─ depends on ─> PERSONA-03 defaults tables existing per artifact type

DIFF-10 (domain checks as reviewers)
  └─ depends on ─> PERSONA-01 (healthcare, legal, government panels from research/domain-specific.md)

ANTI-01 (no office roundtrip)
  └─ is the reason FORMAT-03 exists as "manual re-apply hint" rather than "regenerate .pptx"
```

### Dependency notes

- **DISPATCH-01 is the critical path for v0.5.0.** Everything else in the milestone (FORMAT, CODE, PERSONA) sits on top of Claude Code-native dispatch. If DISPATCH slips, every subsequent phase slips.
- **PERSONA-01 unlocks DIFF-04 and DIFF-10.** The persona library is the differentiator — it's how tumble-dry stops being "another critique loop" and becomes "the tool that knows what a 10-K reviewer actually looks for." Ship persona coverage before shipping format coverage if forced to trade.
- **FORMAT-01 forces introducing `package.json`.** PROJECT.md accepts this. Once `package.json` lands, future features (e.g., tree-sitter for CODE-01) become cheap — CODE-01 should be scheduled to leverage the same dependency budget.
- **ANTI-01 (no office roundtrip) is explicitly downstream of FORMAT-03.** Every time a user asks "can it write back to PowerPoint?", the answer comes from `polish-log.md`'s re-apply hint, not from engineering work.

---

## Milestone Mapping

### v0.5.0 — Claude Code-native dispatch (table stakes: TS-01, TS-02, TS-03; differentiator: DIFF-05)

- [x] DISPATCH-01 — `/tumble-dry` spawns Task subagents in session (TS-01, TS-02, DIFF-05)
- [x] DISPATCH-02 — frontmatter/marketplace registration
- [x] DISPATCH-03 — loop logic in slash command, CLI kept as fallback (preserves DIFF-12)
- [x] Carry-forward invariants: TS-07 (convergence), TS-08 (non-destructive), TS-09 (per-run dir)
- [x] TS-03 — surface reviewer progress live (subagent status output)
- [x] TS-04 — ensure FINAL.md diffable (may already work; validate)

**Success criterion:** user clones plugin → types `/tumble-dry <path>` → run completes with no API-key setup.

### v0.5.1 — Persona library + config autotune (table stakes: TS-10; differentiators: DIFF-02, DIFF-04, DIFF-10)

- [x] PERSONA-01 — panels derived from the four `research/*.md` files: business/finance, product/engineering, marketing/comms, domain-specific
- [x] PERSONA-02 — RUNBOOK.md / PERSONAS.md teaching audience-inferrer how to detect artifact type
- [x] PERSONA-03 — per-artifact-type defaults table (panel size, convergence threshold, thinking budget, max rounds) — values come verbatim from research files' "Recommended config" sections
- [x] DIFF-10 wiring — where research specifies a measurable check (Flesch-Kincaid, CCI, CONSORT-A, NIH simplified review), that check ships as a panel member that computes and reports the score

**Success criterion:** user dumps a pitch deck, a consent form, or a 10-K — tumble-dry picks the right panel and the right config without user tuning.

### v0.5.2 — Office format ingestion (table stakes: TS-05; differentiator: DIFF-06 extends)

- [x] FORMAT-01 — `.docx` (mammoth), `.pptx` (OOXML), `.xlsx` (SheetJS), `.pdf` (pdf-parse), pandoc fallback
- [x] FORMAT-02 — structured markdown preserving slide/sheet/page boundaries; binary preserved in `history/round-0-original.<ext>`
- [x] FORMAT-03 — FINAL.md + `polish-log.md` with explicit "manually re-apply to `<source>`" hint (explicit refusal of ANTI-01)
- [x] Accept dependency cost: introduce `package.json` + `node_modules` (per PROJECT.md Constraints)

**Success criterion:** user runs `/tumble-dry deck.pptx` — tumble-dry loads slides, runs the seed-deck panel (from PERSONA-01), produces FINAL.md with clear re-apply instructions.

### v0.6.0 — Code as first-class artifact (table stakes: TS-06; differentiators: DIFF-08, DIFF-09)

- [x] CODE-01 — language detection (extension + shebang + tree-sitter); reviewer briefs seeded with language context
- [x] CODE-02 — AST-aware drift report: symbol/line-level rather than sentence-level (DIFF-08)
- [x] CODE-03 — language-specific style anchors (PEP 8, Effective Go, Rust API guidelines) replace voice excerpts (DIFF-09)
- [x] CODE-04 — code-review persona library: staff eng, security, on-call SRE, new-hire-in-6-months, reviewer-from-hostile-fork (derivable from `research/product-engineering.md` sections on RFCs, API design, postmortems)
- [x] Explicit refusal reinforcement: ANTI-03 (complements, does not replace, tests/linters/types) in README + generated `polish-log.md`

**Success criterion:** user runs `/tumble-dry src/server.ts` — tumble-dry detects TypeScript, loads code-review panel, produces FINAL.ts with symbol-level drift report.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Milestone |
|---|---|---|---|---|
| TS-01 Zero-API-key install | HIGH | MEDIUM | P1 | v0.5.0 |
| TS-02 Single-command invocation | HIGH | LOW | P1 | v0.5.0 |
| TS-03 Live progress | HIGH | LOW | P1 | v0.5.0 |
| TS-04 Diffable final artifact | MEDIUM | LOW | P1 | v0.5.0 |
| TS-05 Office format ingestion | HIGH | HIGH | P1 | v0.5.2 |
| TS-06 Code-as-artifact with language awareness | HIGH | MEDIUM | P1 | v0.6.0 |
| TS-10 Artifact-typed persona library | HIGH | MEDIUM | P1 | v0.5.1 |
| DIFF-02 Mixed-incentive panels | HIGH | MEDIUM | P1 | v0.5.1 |
| DIFF-04 Config auto-tunes | HIGH | MEDIUM | P1 | v0.5.1 |
| DIFF-05 In-session Claude Code dispatch | HIGH | MEDIUM | P1 | v0.5.0 |
| DIFF-06 Arbitrary artifact type | HIGH | HIGH | P1 | v0.5.2 + v0.6.0 |
| DIFF-08 AST-aware drift for code | MEDIUM | HIGH | P2 | v0.6.0 |
| DIFF-09 Language-specific style anchors | MEDIUM | MEDIUM | P2 | v0.6.0 |
| DIFF-10 Domain checks (CCI, Flesch, CONSORT) as reviewers | HIGH | MEDIUM | P2 | v0.5.1 |

**Priority key:** P1 = must ship in stated milestone; P2 = should ship, descope only if blocked; P3 = n/a — would be in ANTI-features or post-v0.6.

---

## Competitor Feature Analysis (focused comparison)

| Feature | Cursor | Aider | Lex.page / Sudowrite | Grammarly | AutoGen / CrewAI | tumble-dry (v0.6.0 target) |
|---|---|---|---|---|---|---|
| In-IDE / in-session invocation | ✓ (IDE) | ✓ (CLI) | ✗ (SaaS) | ✓ (browser ext) | ✗ | ✓ (Claude Code plugin) |
| Multi-round convergence | ✗ (single-pass) | ✗ | ✗ | ✗ | ✓ (but debate, not convergence) | ✓ (CORE-01) |
| Persistence detection → STRUCTURAL | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ (CORE-02, unique) |
| Mixed-incentive persona panels | ✗ (one "reviewer") | ✗ | ✗ (one "editor") | ✗ (rules engine) | ✓ (but user-configured) | ✓ (PERSONA-01) |
| Voice preservation | partial | ✗ | ✓ (proprietary) | ✗ | ✗ | ✓ (CORE-05, self-sampling default — unique) |
| Office format ingestion | ✗ | ✗ | ✗ (text only) | ✓ (.docx) | ✗ | ✓ (v0.5.2) |
| Code + prose + docs + sheets + decks | code only | code only | prose only | prose only | arbitrary (but needs orchestration) | ✓ (DIFF-06) |
| AST-aware drift | partial | partial | n/a | n/a | n/a | ✓ (v0.6.0) |
| Domain-specific readability checks (CCI, Flesch, CONSORT) | ✗ | ✗ | ✗ | partial (Flesch) | ✗ | ✓ (DIFF-10) |
| Non-destructive source preservation | partial | ✗ (edits in place) | ✗ (cloud) | n/a | n/a | ✓ (CORE-03) |
| Zero-setup auth | ✗ (account) | ✗ (API key) | ✗ (account) | ✗ (account) | ✗ | ✓ (DISPATCH-01) |
| Reasoning traces persisted | ✗ | ✗ | ✗ | ✗ | partial | ✓ (CORE-04) |

**Differentiator clusters that survive the comparison:**
1. **Convergence + STRUCTURAL detection** — nobody else does multi-round persistence.
2. **Mixed-incentive panels keyed by artifact type** — nobody else does domain-specific reviewer mixes.
3. **In-session Claude Code dispatch with zero setup** — Cursor-class distribution at CLI-class transparency.
4. **Format-agnostic** — one tool for deck + doc + code + model + 10-K.
5. **Voice self-sampling default** — no corpus required.

Tumble-dry does not try to out-grammar Grammarly or out-debate AutoGen. Those are ANTI-features by design.

---

## Sources

- PROJECT.md — scope, Out of Scope, Key Decisions (`/Users/laul_pogan/Source/tumble-dry/.planning/PROJECT.md`)
- `research/business-finance.md` — 10 artifact types × 5–7 personas × config recommendations; the recommended-config values are ingested verbatim into PERSONA-03
- `research/product-engineering.md` — PRD, RFC, API doc, postmortem, runbook, README, migration, threat model, model card, dev-docs panels + failure modes
- `research/marketing-comms.md` — press release, crisis comms, landing page, cold email, launch post, brand guidelines, case study, earnings IR, conference CFP, newsletter panels
- `research/domain-specific.md` — healthcare, legal, government, academic, education panels + regulated readability checks (CCI, Flesch-Kincaid, CONSORT-A, PRISMA-A, NIH Simplified Review, PEMAT, UbD)
- Competitive reference products (training-data awareness, confirmed as of 2026-04): Cursor (cursor.com), Aider (aider.chat), Continue.dev, Cody (Sourcegraph), Lex.page, Sudowrite (sudowrite.com), Notion AI, Grammarly Business, Hemingway, Wordtune, AutoGen (microsoft/autogen), CrewAI (crewai.com), ChatDev
- Anthropic Claude Code subagent + plugin docs (for DISPATCH-01/02 target spec)

---

*Feature research for: tumble-dry v0.5.0 → v0.6.0 content-polish-via-multi-agent-critique plugin*
*Researched: 2026-04-15*
