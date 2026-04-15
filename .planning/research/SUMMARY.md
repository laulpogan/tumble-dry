# Project Research Summary

**Project:** tumble-dry v0.5.x → v0.6.0
**Domain:** Claude Code plugin + headless Node CLI — adversarial-review convergence loop over arbitrary written artifacts
**Researched:** 2026-04-15
**Confidence:** HIGH on stack/architecture/features; MEDIUM-HIGH on pitfalls

## Executive Summary

Four sibling research passes converged on a tight picture. tumble-dry occupies a unique product cell (convergence-driven critique × arbitrary artifact × in-Claude-Code dispatch). v0.5.x → v0.6.0 is plugin-spec-compliance + loader + code-mode expansion on top of an already-working v0.4.2 core — no architectural rewrite needed. Critical-path gate is DISPATCH-01 (Claude Code-native, zero-API-key fanout); every downstream phase dogfoods on it. Architecture recommendation is unambiguous: loop orchestration lives in `commands/tumble-dry.md` prose (not a dispatcher subagent, not MCP), fan-in is filesystem-mediated via per-round directories, bin/ stays as symmetric headless/CI fallback.

Stack is near-final but the pre-research plan is partially obsolete. SheetJS left npm in 2023 with a stale CVE'd artifact; pdf-parse is effectively unmaintained; native tree-sitter kills the "single git clone" ethos on Windows/ARM. Replacement: `mammoth` + `turndown` for .docx; `officeparser` unified for .pptx/.xlsx/.pdf; `unpdf` as PDF fallback; `web-tree-sitter` (WASM) + `linguist-js` for code mode. Collapses v0.5.2 + v0.6.0 to 7 direct deps total, all pure-JS or WASM, no C toolchain. `package.json` lands in v0.5.2 with deps as `optionalDependencies` so markdown-only users never `npm install`.

Risk profile is mode-collapse and reward-hacking, not infrastructure. The twenty pitfalls cluster around three themes: (1) subagent invisibility (partial fanout, spec drift, malformed critique, context bloat) in DISPATCH; (2) silent-failure loaders (encrypted PDFs, lost slide boundaries, memory blowup) in FORMAT; (3) LLM-as-critic pathologies (panel collapse, convergence gaming by claim-suppression, persistence-detection brittleness across paraphrase) that already partially affect v0.4.2 and will compound in code mode. Several pitfalls are CORE-hardening work that doesn't belong to any single new phase — they need their own slot.

## Load-Bearing Decisions (5–7 that change the roadmap)

1. **Slash-command-prose is the orchestrator.** Not a dispatcher subagent, not MCP. Subagents can't spawn subagents; orchestrator-as-subagent kills progress visibility and trace fidelity. Keep bin/ as symmetric headless fallback.
2. **Parallel fanout is a hard syntactic constraint.** All N reviewer `Agent` calls MUST emit in ONE assistant turn. Serial dispatch across turns is the #1 silent bug (false convergence on partial rounds). Requires pre-dispatch manifest + glob-reconciliation in aggregator.
3. **Office stack swap is mandatory.** Drop xlsx (SheetJS, off npm + CVE), drop pdf-parse (unmaintained), drop DIY OOXML for pptx. Adopt `officeparser` (pptx/xlsx/pdf unified AST) + `mammoth→turndown` (docx) + `unpdf` (PDF fallback, ESM-only).
4. **tree-sitter is WASM, not native.** `web-tree-sitter` + per-language grammar WASM. Native bindings fail on Windows + Linux ARM + fresh macOS. 2x slowdown is irrelevant at file-at-a-time cadence.
5. **Filesystem is IPC.** Subagents write to known paths passed in brief; orchestrator reads aggregate.md (5-10KB) not raw critiques. Otherwise main-session context burns 400k+ tokens on 30-page doc × 5 rounds.
6. **Voice-drift gate BLOCKS convergence (CORE hardening).** Currently reports but doesn't block. Convergence by claim-suppression (Pitfall 17) is the single most dangerous reward-hack. Cumulative drift from round-0, not round-to-round.
7. **Plugin spec is currently non-compliant.** `marketplace.json` wrongly at repo root (must be `.claude-plugin/marketplace.json`); `.claude-plugin/plugin.json` missing entirely; agent frontmatter `name` wrongly prefixed with `tumble-dry-`. Blocks direct `--plugin-dir` install today.

## Conflicts Between Sibling Research

1. **FORMAT library mismatch.** REQUIREMENTS FORMAT-01 + FEATURES TS-05 name `xlsx` (SheetJS) and `pdf-parse`. STACK explicitly rejects both. → REQUIREMENTS edit.
2. **pptx parsing.** REQUIREMENTS says "OOXML parse" (DIY). STACK says DIY OOXML is a rabbit hole; use `officeparser` AST. → REQUIREMENTS edit.
3. **tree-sitter binding.** REQUIREMENTS CODE-01 unspecified. STACK + PITFALLS converge on `web-tree-sitter` WASM. → REQUIREMENTS edit.
4. **Trace fidelity on CC path.** CORE-04 (validated) promises per-dispatch request+response+thinking traces. ARCHITECTURE flags CC `Agent` doesn't expose request/response back to orchestrator. Degradation needs explicit acknowledgment.
5. **package.json timing.** PROJECT + FEATURES + ARCHITECTURE agree package.json lands with FORMAT (v0.5.2). REQUIREMENTS CODE-01 doesn't acknowledge tree-sitter deps REQUIRE the package.json FORMAT introduces — CODE phase cannot precede FORMAT.
6. **CORE-hardening items have no REQUIREMENTS phase.** Pitfalls 17/18/19/20 (voice-drift gate wiring, trace retention, structural-vs-content drift split, bigram-Dice dedup upgrade) are cross-cutting. REQUIREMENTS has no slot. → add CORE-HARDEN section or absorb into DISPATCH-03.

## Required REQUIREMENTS.md Deltas (stage before roadmap)

- **FORMAT-01:** swap `.xlsx (SheetJS)` → `.xlsx (officeparser)`; `.pdf (pdf-parse)` → `.pdf (officeparser primary, unpdf fallback)`; `.pptx (OOXML)` → `.pptx (officeparser)`. Add note: "SheetJS and pdf-parse NOT used — see STACK.md §What NOT to use."
- **FORMAT-01:** add typed-result contract `{ok:true, markdown, format, warnings[]} | {ok:false, reason:'encrypted'|'corrupt'|'unsupported'|'empty'|'too_large', detail}`.
- **FORMAT-02:** specify HTML-comment boundary markers (`<!-- slide:N -->`, `<!-- sheet:Name -->`, `<!-- page:N -->`); editor brief must preserve.
- **FORMAT-03:** add ROUNDTRIP_WARNING.md emitted at load time (not just in polish-log.md — must fire before round 1).
- **FORMAT-05:** note `unpdf` is ESM-only; loader modules use dynamic `import()` or `.mjs`.
- **CODE-01:** pin `web-tree-sitter` (WASM), NOT native. Add `linguist-js`. Change detector contract to `{primary, regions[], confidence}` for polyglot (.ipynb, .html, shell+python heredoc).
- **CODE-02:** specify drift taxonomy — `unchanged | renamed | moved | modified | signature_changed | added | removed | reformatted`. Signature changes on public API are permanent structural flag.
- **CODE-06 (new):** `verify_cmd` config hook. Editor redraft that fails verify_cmd OR tree-sitter parseability check blocks convergence. Default `npm test -- --run` when package.json has `test`.
- **DISPATCH-02:** add `bin/validate-plugin.cjs` cross-checking `agents/*.md` frontmatter `name` against `.claude-plugin/marketplace.json`. CI-gated.
- **DISPATCH-03:** partial-round policy (`M/N >= 0.6 + material>0` → proceed with degradation warning; else abort). Pre-dispatch manifest. Error taxonomy: `dispatch-errors.md`; retry-once with stricter brief.
- **DISPATCH-07:** slash command reads `aggregate.md` ONLY, not raw critiques.
- **New CORE-HARDEN section (or absorb into DISPATCH-03):**
  - HARDEN-01: voice-drift gate BLOCKS convergence when content-drift > threshold. Cumulative from round-0.
  - HARDEN-02: split `voice.cjs` drift into `structural_drift` (markdown-only) vs. `content_drift`; only content gates convergence.
  - HARDEN-03: aggregator dedup upgrade token-Jaccard → bigram-Dice; boundary-marker anchor as dedup signal.
  - HARDEN-04: round-N reviewer briefs seeded with round-(N-1) unresolved material clusters.
  - HARDEN-05: trace retention (default: last 3 rounds full, older pruned); gzip traces post-round.
  - HARDEN-06: `.tumble-dry/` appended to `.gitignore` on first run.
- **PERSONA-01:** add mandatory "bounce trigger" + "load-bearing belief" fields. Pair believers with skeptics within default panels.
- **PERSONA-03:** per-artifact defaults include drift threshold (code mode stricter).
- **Traceability:** mark CORE-HARDEN cross-cutting; mark CODE blocked-on FORMAT.

## Open Questions (for roadmapper / per-phase planning)

1. **CC `Agent` parallel-fanout empirical confirmation.** Needs 5-min smoke test in DISPATCH phase planning before committing orchestration pattern.
2. **CORE-HARDEN its own phase or inside DISPATCH-03?** Recommendation: standalone phase between PERSONA and FORMAT (HARDEN-03/04 most improve PERSONA payoff).
3. **Token-budget reality for audience-inferrer on large artifacts.** Does it need full source inline, or read from disk via its own `Read` tool? Measure in DISPATCH smoke test.
4. **`verify_cmd` sandboxing UX in CC plugin context.** Is there a first-use confirmation primitive? Research in CODE phase planning.
5. **Persona library extraction mechanism.** Hand-curated, machine-assembled, or copy-paste from research files? Affects PERSONA phase sizing.
6. **Office-format test fixtures absent from repo.** Decide in FORMAT phase whether to create fixtures (CJK docx, RTL pdf, curly-quote xlsx, emoji md) or defer tests.
7. **Trace-fidelity degradation on CC path.** Accepted scope narrowing vs. CORE-04? Confirm user-facing messaging.

## Recommended Phase Ordering

1. **DISPATCH (v0.5.0)** — highest leverage, critical path. Zero-API-key dispatch + plugin spec compliance + fanout contract + validator + error taxonomy. Research flag: light.
2. **PERSONA (v0.5.1)** — extraction + runbook from existing 4 research files. Fixes mode-collapse (Pitfall 16) before widening inputs. Research flag: skip.
3. **CORE-HARDEN (cross-cutting)** — voice-drift gate, structural/content drift split, bigram-Dice dedup, reviewer-brief seeding, trace retention, `.gitignore` bootstrap. Cheap to do before format/code adds surface area. Research flag: skip.
4. **FORMAT (v0.5.2)** — introduces `package.json` + optionalDeps. officeparser/mammoth/turndown/unpdf. Boundary markers, size gates + child-process fork, ROUNDTRIP_WARNING UX, encoding fixtures. Research flag: medium (empirical fixture creation).
5. **CODE (v0.6.0)** — web-tree-sitter + linguist-js; polyglot region detection; `editor-code.md`; AST drift taxonomy; verify_cmd gate; code persona with linter-exclusion clauses; per-language style anchors. Research flag: **HIGH — recommend `/gsd-research-phase`** (AST-drift semantics, polyglot routing, verify_cmd sandboxing all warrant deeper research).
6. **QOL + Release** — README, examples, `--help` rewrite. Woven into milestone close of 4 and 5. Research flag: skip.

**Ordering rationale:** DISPATCH first (everything dogfoods on it). PERSONA before FORMAT (Pitfall 16 would obscure FORMAT output quality). CORE-HARDEN before FORMAT (drift/dedup bugs compound on larger artifacts). FORMAT before CODE (package.json dependency). CODE last (largest research surface + largest blast radius).

## Confidence

| Area | Confidence | Notes |
|---|---|---|
| Stack | HIGH | CC plugin spec from official docs 2026-04; SheetJS/pdf-parse rejection has primary sources |
| Features | HIGH | Tight scope, Out-of-Scope defined, competitive landscape mapped |
| Architecture | HIGH | Codebase read end-to-end; CC subagent idiom verified |
| Pitfalls | MEDIUM-HIGH | ~12 codebase-grounded (HIGH); ~8 from LLM-as-critic lit + lib issue trackers (MEDIUM). Pitfalls 1, 2, 4, 6, 17 most certain; 11, 13, 16 need empirical confirmation |

**Overall:** HIGH for phase structure + stack decisions; MEDIUM for some mitigations (esp. parallel-fanout guarantees — smoke test required).

## Relevant Files

- `.planning/research/STACK.md`
- `.planning/research/FEATURES.md`
- `.planning/research/ARCHITECTURE.md`
- `.planning/research/PITFALLS.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
