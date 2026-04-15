# Roadmap — tumble-dry v0.5.x → v0.6.0

**Milestone:** v0.5.0 (Claude Code-native dispatch) → v0.5.1 (persona library) → v0.5.1.5 (core hardening) → v0.5.2 (office formats) → v0.6.0 (code-aware) → v0.6.0 release.
**Granularity:** coarse
**Parallelization:** true
**Mode:** yolo
**Coverage:** 38/38 Active requirements mapped (no orphans)

Phase ordering is fixed by research:
- DISPATCH first — critical path; everything dogfoods on Claude Code-native dispatch.
- PERSONA before CORE-HARDEN — fixes mode collapse before hardening payoff is measurable.
- CORE-HARDEN before FORMAT — drift/dedup bugs compound on larger artifacts.
- FORMAT before CODE — CODE depends on `package.json` introduced by FORMAT for `web-tree-sitter` WASM.
- RELEASE last — woven with QOL and milestone close.

---

## Phases

- [ ] **Phase 1: DISPATCH (v0.5.0)** — Claude Code-native zero-API-key dispatch + plugin spec compliance
- [ ] **Phase 2: PERSONA (v0.5.1)** — Artifact-typed persona library with mixed-incentive panels
- [ ] **Phase 3: CORE-HARDEN (cross-cutting)** — Voice-drift gate, drift split, dedup upgrade, brief-seeding, retention, gitignore bootstrap
- [ ] **Phase 4: FORMAT (v0.5.2)** — Office format ingestion (.docx, .pptx, .xlsx, .pdf) with boundary preservation
- [ ] **Phase 5: CODE (v0.6.0)** — Language-aware code mode with AST drift, style anchors, verify_cmd gate
- [ ] **Phase 6: RELEASE / QOL (v0.6.0 close)** — Help, README, examples; milestone publication

---

## Phase Details

### Phase 1: DISPATCH (v0.5.0)
**Goal**: User runs `/tumble-dry <artifact>` from inside Claude Code with zero setup and the full convergence loop completes via parallel subagent fanout.
**Depends on**: Nothing (first phase; v0.4.2 ships today)
**Requirements**: DISPATCH-01, DISPATCH-02, DISPATCH-03, DISPATCH-04, DISPATCH-05, DISPATCH-06, DISPATCH-07, DISPATCH-08
**Success Criteria** (what must be TRUE):
  1. User clones plugin, types `/tumble-dry path/to/doc.md`, run completes without `ANTHROPIC_API_KEY` set in env.
  2. `claude plugin validate .` (or equivalent) exits 0 — `.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json` present and conformant; agent frontmatter `name` fields drop the `tumble-dry-` prefix.
  3. A round with N=5 reviewers fans out in ONE assistant turn (verifiable by single Task batch in transcript), and `bin/validate-plugin.cjs` exits non-zero if any `agents/*.md` `name` mismatches `marketplace.json`.
  4. Per-round status (`round N starting`, `M/N reviewers returned`, `K material findings`, `converged|continuing`) is visible to the user during the run via the existing `[tumble-dry-loop]` log idiom.
  5. Subagent failure modes (timeout, malformed output, refusal, silent-text-instead-of-file) are logged to `.tumble-dry/<slug>/round-N/dispatch-errors.md`; partial-round policy (`M/N >= 0.6 + material > 0` → proceed with degradation; else retry-once → abort) is enforced.
  6. `bin/tumble-dry-loop.cjs` continues to work as the headless/CI fallback with `ANTHROPIC_API_KEY`; trace fidelity degradation on the CC path is documented in README and `polish-log.md`.
**Plans**: TBD
**UI hint**: no

### Phase 2: PERSONA (v0.5.1)
**Goal**: The audience-inferrer detects artifact type and selects a mixed-incentive panel + tuned config from a comprehensive library, with no user tuning required.
**Depends on**: Phase 1 (dogfoods on CC-native dispatch)
**Requirements**: PERSONA-01, PERSONA-02, PERSONA-03, PERSONA-04, PERSONA-05, PERSONA-06
**Success Criteria** (what must be TRUE):
  1. `personas/library.md` exists with ≥30 artifact types across 4 families (business/finance, product/engineering, marketing/comms, domain-specific); every persona has name, role, bio, hiring job, bounce trigger, and one load-bearing belief.
  2. `personas/runbook.md` instructs the audience-inferrer how to detect artifact type, pick a panel, mix across families, and decide when to add a layman or operator; includes the structural-vs-surface failure-mode index per artifact type.
  3. `personas/configs.json` declares per-artifact-type defaults (panel_size, convergence_threshold, editor_thinking_budget, max_rounds, drift_threshold) — all values traceable to a `research/*.md` source.
  4. `agents/audience-inferrer.md` references the library/runbook/configs (does NOT inline the full library).
  5. Default panels pair believers with skeptics — observable by reading any default panel definition; code-review section (PERSONA-06) includes staff eng, security, on-call SRE, new-hire-in-6-months, hostile-fork reviewer, each with a "no linter-catchable issues" exclusion clause.
**Plans**: TBD
**UI hint**: no

### Phase 3: CORE-HARDEN (cross-cutting hardening)
**Goal**: Convergence cannot be gamed by claim suppression, drift reports distinguish substance from formatting, persistence detection survives paraphrase, and on-disk state stays bounded and out of git.
**Depends on**: Phase 2 (HARDEN-03/04 most improve PERSONA payoff; runs before FORMAT widens artifact surface)
**Requirements**: HARDEN-01, HARDEN-02, HARDEN-03, HARDEN-04, HARDEN-05, HARDEN-06
**Success Criteria** (what must be TRUE):
  1. A round with cumulative `content_drift` from `round-0-original.md` above the configured threshold is marked `drift-blocked`, convergence is refused regardless of material count, and the block is visible in `polish-log.md`.
  2. `lib/voice.cjs` reports `structural_drift` and `content_drift` separately; only `content_drift` enters the convergence gate (verifiable by a cosmetic-only round NOT being drift-blocked).
  3. `lib/aggregator.cjs` uses bigram-Dice for cluster dedup (replacing token-Jaccard); paraphrased findings across rounds re-link into the same cluster on a fixture test.
  4. Round-N reviewer briefs include round-(N-1) unresolved material cluster summaries — verifiable by inspecting any round-2 brief.
  5. `.tumble-dry/<slug>/traces/INDEX.md` lists retained-vs-archived trace files; older rounds gzipped, last 3 rounds full.
  6. On first run in a fresh repo, `.gitignore` is appended with `.tumble-dry/` if not present (idempotent — second run does not add a duplicate line).
**Plans**: TBD
**UI hint**: no

### Phase 4: FORMAT (v0.5.2)
**Goal**: User runs `/tumble-dry deck.pptx` (or .docx / .xlsx / .pdf) and tumble-dry produces a structured markdown working copy with slide/sheet/page boundaries preserved, original binary intact, and an explicit no-roundtrip warning surfaced before round 1.
**Depends on**: Phase 3 (drift/dedup hardened before larger artifacts hit them)
**Requirements**: FORMAT-01, FORMAT-01a, FORMAT-02, FORMAT-03, FORMAT-04, FORMAT-05, FORMAT-06, FORMAT-07
**Success Criteria** (what must be TRUE):
  1. `lib/loader.cjs` dispatches `.docx` → `mammoth`+`turndown`, `.pptx`/`.xlsx`/`.pdf` → `officeparser` (with `unpdf` PDF fallback via dynamic `import()`), `.md`/`.txt` identity, pandoc fallback when on PATH; SheetJS and pdf-parse are NOT used.
  2. Every loader returns the typed-result contract `{ok:true, markdown, format, warnings[]} | {ok:false, reason, detail}`; every caller branches on `ok` (no throws); encrypted/oversized/unsupported/empty/corrupt files all return `ok:false` with actionable detail.
  3. Working markdown contains HTML-comment boundary markers verbatim — `<!-- slide:N -->`, `<!-- sheet:Name -->`, `<!-- page:N -->` — and editor preserves them across rounds (verifiable by marker count == slide/sheet/page count after FINAL.md).
  4. Source binary lives byte-for-byte at `.tumble-dry/<slug>/history/round-0-original.<ext>`; `.tumble-dry/<slug>/ROUNDTRIP_WARNING.md` is emitted before round 1 and the slash command surfaces it to the user.
  5. `package.json` exists; `mammoth`, `turndown`, `officeparser`, `unpdf` declared as `optionalDependencies`; markdown-only users do NOT need `npm install` for the headless `bin/` path.
  6. Files >5MB load in a forked child process (memory-bound); files >20MB return `{ok:false, reason:'too_large'}` unless explicit override.
  7. UTF-8 fixtures (CJK docx, RTL pdf, curly-quote xlsx, emoji md) round-trip through the loader with no mojibake — `tests/fixtures/format/` exists and CI loads each.
**Plans**: TBD
**UI hint**: no

### Phase 5: CODE (v0.6.0)
**Goal**: User runs `/tumble-dry src/server.ts` (or any code file/directory); language is detected, code-review panel runs with linter-exclusion clauses, AST-aware drift report uses symbol-level taxonomy, and editor redrafts that fail tree-sitter parse or `verify_cmd` block convergence.
**Depends on**: Phase 4 (`package.json` + npm install path required for `web-tree-sitter` + grammar WASM packages)
**Requirements**: CODE-01, CODE-02, CODE-03, CODE-04, CODE-05, CODE-06, CODE-07
**Success Criteria** (what must be TRUE):
  1. `linguist-js` + shebang + content heuristics produce a detector contract `{primary, regions[], confidence}`; polyglot fixtures (.ipynb, .html with embedded JS/CSS, shell+python heredoc) return populated `regions[]`.
  2. AST drift uses `web-tree-sitter` (WASM, no native bindings) + per-language grammar WASM; drift taxonomy reports `unchanged|renamed|moved|modified|signature_changed|added|removed|reformatted` at function/symbol granularity; signature changes on public API are a permanent structural flag and cannot silently auto-converge; missing-grammar languages fall back to sentence diff.
  3. Editor brief in code mode swaps voice excerpts for language-specific style anchors (PEP 8, Effective Go, Rust API guidelines, JS Standard, defaults table); `agents/editor-code.md` exists and is selected when `{ARTIFACT_KIND}=code`.
  4. Code-review panel pulls from PERSONA-06 by default; reviewer briefs include the explicit "do NOT flag issues a linter would catch — assume linter clean" instruction; layman is replaced with new-hire-in-6-months.
  5. Editor redraft that fails tree-sitter parseability OR fails the configured `verify_cmd` (default `npm test -- --run` when `package.json` has a `test` script) is rejected — drift report flags `proposed-redraft-invalid`, loop continues with prior state, convergence is blocked.
  6. Code-directory inputs produce a structured projection (file list with per-file fence blocks tagged with detected language) via `lib/loaders/code.cjs`.
**Plans**: TBD
**UI hint**: no

### Phase 6: RELEASE / QOL (v0.6.0 close)
**Goal**: v0.6.0 ships publicly with a usable `--help`, end-to-end README covering the new Claude Code-native invocation, and worked examples for the new artifact classes.
**Depends on**: Phase 5
**Requirements**: QOL-01, QOL-02, QOL-03
**Success Criteria** (what must be TRUE):
  1. `/tumble-dry --help` (and `bin/tumble-dry-loop.cjs --help`) prints scenario-shaped usage examples covering substack post, pitch deck, code refactor PR description, and docx polish.
  2. README documents the Claude Code-native invocation as the primary path, with v0.5.x screenshots / sample output and a clear "headless CLI fallback" section.
  3. `examples/` contains the existing `dogfood-2026-04-14/` (substack post) plus ≥1 office-format polish example and ≥1 code polish example, each with FINAL.md + polish-log.md committed.
**Plans**: TBD
**UI hint**: no

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. DISPATCH (v0.5.0) | 0/0 | Not started | - |
| 2. PERSONA (v0.5.1) | 0/0 | Not started | - |
| 3. CORE-HARDEN | 0/0 | Not started | - |
| 4. FORMAT (v0.5.2) | 0/0 | Not started | - |
| 5. CODE (v0.6.0) | 0/0 | Not started | - |
| 6. RELEASE / QOL | 0/0 | Not started | - |

---

*Created: 2026-04-15 by /gsd-roadmapper.*
