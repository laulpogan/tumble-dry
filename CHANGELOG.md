# Changelog

All notable changes to tumble-dry. Format inspired by [Keep a Changelog](https://keepachangelog.com/); versioning roughly semver (minor bumps for new capability, patch bumps for bug-fix / hardening waves).

## [0.7.0] — 2026-04-15 — Opt-in office-format roundtrip

**Theme:** Regenerate `.docx` / `.pptx` / `.xlsx` from `FINAL.md` alongside the markdown when you opt in with `--apply` (slash) / `--write-final` (CLI). PDF explicitly errors with a pointer to pandoc/weasyprint. Roundtrip is honestly lossy — `LOSSY_REPORT.md` per run tells you what survived, what was approximated, and what was dropped. Default behavior unchanged.

### Added

- **`lib/writers/docx.cjs` (ROUNDTRIP-02)** — markdown → DOCX via `docx@^9`. Preserves H1-H6, paragraphs, ordered/unordered lists, GFM-ish pipe tables, inline emphasis (bold/italic/inline code as Courier New), block quotes (indented). Strips boundary-marker HTML comments silently.
- **`lib/writers/pptx.cjs` (ROUNDTRIP-03)** — markdown → PPTX via `pptxgenjs@^3`. Splits on `<!-- slide:N -->` markers. H2 per slide → title box; remaining lines → bulleted body. Speaker notes preserved from `<!-- notes: ... -->` markers.
- **`lib/writers/xlsx.cjs` (ROUNDTRIP-04)** — markdown → XLSX via `exceljs@^4` (NOT SheetJS — CVE rationale matches ingestion). Splits on `<!-- sheet:Name -->` markers. Bold header row; numeric coercion that preserves leading zeros. Sheet names truncated to Excel's 31-char cap.
- **`lib/writers/lossy-report.cjs` (ROUNDTRIP-05)** — assembles `LOSSY_REPORT.md` with `## Survived`, `## Approximated`, `## Dropped` sections from per-writer `lossy_notes`.
- **`lib/writers/index.cjs` (ROUNDTRIP-06)** — dispatcher routing by source format. PDF returns `{ok:false, reason:'pdf_unsupported'}` with the documented actionable message.
- **`bin/tumble-dry.cjs::finalize --apply`** — when set, reads `source-format.json`, dispatches to the writer, writes `FINAL.<ext>` next to `FINAL.md`, writes `LOSSY_REPORT.md`, and appends a `## Roundtrip` section to `polish-log.md`. Exit 4 on PDF guard rail; exit 5 on writer failure; exit 0 on success or when source is markdown (no-op skip).
- **`bin/tumble-dry-loop.cjs --write-final`** — passthrough flag to finalize.
- **`commands/tumble-dry.md --apply`** — slash command parses the flag, propagates to finalize, surfaces `LOSSY_REPORT.md` to chat after success.
- **`tests/roundtrip.test.cjs`** — 17 smoke tests covering docx/pptx/xlsx round-trip via real libs (mammoth, officeparser, exceljs), the lossy-report assembler, the PDF guard rail (unit + integration through finalize), and dispatcher routing.

### Dependencies

- New `optionalDependencies`: `docx@^9`, `pptxgenjs@^3`, `exceljs@^4`. Markdown-only users still skip `npm install`.

### Out of scope

- PDF roundtrip — markdown→PDF is a different rendering problem with multiple acceptable tools (pandoc, weasyprint, typst).
- Lossless roundtrip — not achievable from a markdown projection.
- Roundtrip as default — `--apply` is opt-in.

## [0.6.0] — 2026-04-15 — Code-aware mode + release close

**Theme:** Ship v0.6.0. Code polish becomes a first-class artifact family alongside prose, office formats, and decks.

### Added

- **Language detection (CODE-01)** — `linguist-js` (extension + content heuristics) + shebang fallback for extension-less scripts. Detector contract `{primary, regions, confidence}` for polyglot artifacts.
- **AST-aware drift (CODE-02)** — `lib/code/ast-drift.cjs` using `web-tree-sitter` (WASM — Windows + Linux ARM + fresh macOS safe, unlike native bindings). Per-symbol taxonomy: `unchanged | renamed | moved | modified | signature_changed | added | removed | reformatted`. Signature changes on public API are permanent `STRUCTURAL:` flags — cannot silently converge.
- **Code-directory projection (CODE-03)** — `lib/loaders/code.cjs` produces structured markdown projection with per-file fenced blocks tagged by language.
- **Style-anchored editor (CODE-04, CODE-06)** — `agents/editor-code.md` swaps voice excerpts for language-specific style anchors (PEP 8, Effective Go, Rust API Guidelines, JS Standard, generic default). Redraft is parsed with the same tree-sitter grammar; `hasError` trees mark `proposed-redraft-invalid` and the loop discards the redraft.
- **Code-review persona panel (CODE-05)** — PERSONA-06 panel (staff eng, security, on-call SRE, new-hire-in-6-months, hostile-fork) pulled by default when artifact is code. Layman replaced by new-hire-in-6-months. Reviewer briefs include "do NOT flag issues a linter would catch — assume linter-clean input."
- **`verify_cmd` gate (CODE-07)** — Editor redraft must pass user-defined verify command before convergence. Default `npm test -- --run` when `package.json` has a `test` script. Override in `.tumble-dry.yml`. Failed verify = redraft rejected, loop continues with prior state.

### Quality of life (QOL-01..03)

- `bin/tumble-dry-loop.cjs --help` — 4 scenario-shaped usage examples (prose / deck / code / docx + verify_cmd).
- `commands/tumble-dry.md` — mirror Quickstart examples section for the slash command.
- README end-to-end polish: tagline mentions all 4 artifact families; "What's new in v0.6.0" callout; Dispatch section rewritten (gastown opt-in line removed — ripped in v0.4.2); Roadmap section lists shipped v0.4.2 → v0.6.0 + deferred v2 items.
- `examples/office-format/README.md` + `examples/code/README.md` added alongside the existing `examples/dogfood-2026-04-14/`.
- `CHANGELOG.md` (this file) created.

### Testing

- `tests/code.test.cjs` — 19 smoke tests (detection, AST drift, editor-code brief, verify_cmd, parseability gate).

## [0.5.2] — 2026-04-15 — Office-format ingestion

**Theme:** Support `.docx`, `.pptx`, `.xlsx`, `.pdf` via markdown projection. Source binaries never modified; FINAL.md ships as markdown; manual re-apply documented.

### Added

- **`lib/loader.cjs` dispatcher (FORMAT-01)** — Extension-based routing. Identity for `.md / .markdown / .txt`. `mammoth` → `turndown` for `.docx`. `officeparser` (unified AST) for `.pptx / .xlsx / .pdf` primary. `unpdf` (ESM — dynamic `import()`) as `.pdf` fallback. Pandoc fallback for everything else when `pandoc` is on `$PATH`.
- **Typed-result contract (FORMAT-01a)** — Every loader returns `{ok:true, markdown, format, warnings[]}` or `{ok:false, reason, detail}` with `reason ∈ {encrypted, corrupt, unsupported, empty, too_large}`. Callers branch on `ok`, never throw.
- **Boundary markers (FORMAT-02)** — `<!-- slide:N -->`, `<!-- sheet:Name -->`, `<!-- page:N -->` preserved verbatim by the editor. Aggregator uses markers as dedup anchors (paired with HARDEN-03).
- **Round-0 source snapshot (FORMAT-03)** — Original binary preserved byte-for-byte at `.tumble-dry/<slug>/history/round-0-original.<ext>`.
- **`ROUNDTRIP_WARNING.md` (FORMAT-04)** — Emitted **before round 1**, not at finalize. Slash command surfaces it to the user in chat.
- **`package.json` with `optionalDependencies` (FORMAT-05)** — `mammoth`, `turndown`, `officeparser`, `unpdf` declared as optional. Markdown-only users skip `npm install`; loader returns `{ok:false, reason:"unsupported"}` with actionable hint if deps missing.
- **Graceful degradation (FORMAT-06)** — Encrypted / oversized (>20MB; forks to child process for >5MB) / unrecognized extensions return typed `{ok:false, ...}`. No throws.
- **Encoding invariants (FORMAT-07)** — UTF-8 default, BOM stripped, CJK / RTL / curly-quote / emoji preserved through the projection. Test fixtures in `tests/fixtures/format/`.

### What NOT used (documented in `.planning/research/STACK.md`)

- `xlsx` (SheetJS) — left npm 2023 with stale CVE.
- `pdf-parse` — abandoned.

### Testing

- `tests/format.test.cjs` — 15 smoke tests.

## [0.5.1] — 2026-04-15 — Persona library

**Theme:** Replace ad-hoc audience inference with a curated persona library covering 30+ artifact types across 4 families. Anti-mode-collapse pairing (believers + skeptics).

### Added

- **`personas/library.md` (PERSONA-01)** — ≥30 artifact types across business/finance, product/engineering, marketing/comms, domain-specific. Each persona has mandatory fields: name, role, 1–2 sentence bio, **hiring job**, **bounce trigger**, **one load-bearing belief**. Default panels pair believers with skeptics.
- **`personas/runbook.md` (PERSONA-02, PERSONA-05)** — Detection rules (type → panel), mix/match guidance, layman vs operator add rules. Structural-vs-surface failure-mode index per artifact type.
- **`personas/configs.json` (PERSONA-03)** — Per-type tuned defaults: `panel_size`, `convergence_threshold`, `editor_thinking_budget`, `max_rounds`, `drift_threshold` (code mode stricter).
- **`agents/audience-inferrer.md` references the library (PERSONA-04)** — Reads library + runbook + configs at build-brief time. Does not duplicate.
- **Code-review persona section (PERSONA-06)** — Staff eng, security, on-call SRE, new-hire-in-6-months, hostile-fork reviewer. Each bounce trigger excludes linter-catchable issues.

## [0.5.0] — 2026-04-15 — Claude Code-native dispatch

**Theme:** `/tumble-dry` slash command as the primary control plane. No `ANTHROPIC_API_KEY` required; session auth inherited. Headless CLI (`bin/tumble-dry-loop.cjs`) stays as CI / scripting fallback.

### Added

- **`/tumble-dry <artifact>` slash command (DISPATCH-01)** — Runs full convergence loop using only the user's active Claude Code session.
- **Parallel Task fanout in ONE assistant turn (DISPATCH-02)** — All N reviewer `Task` calls emitted in a single message. Serial cross-turn dispatch was the #1 silent bug (false convergence on partial rounds). CI plugin-spec validator (`bin/validate-plugin.cjs`) cross-checks `agents/*.md` frontmatter `name` against `.claude-plugin/marketplace.json`.
- **Plugin spec compliance (DISPATCH-03, DISPATCH-04)** — `agents/*.md` frontmatter conforms to current CC plugin-shipped subagent spec (no `tumble-dry-` prefix; no `hooks`/`mcpServers`/`permissionMode` — silently stripped). `.claude-plugin/marketplace.json` + `.claude-plugin/plugin.json` manifest. Verified via validator.
- **Filesystem as IPC (DISPATCH-05)** — Subagents write to known paths from the brief. Orchestrator reads only `aggregate.md` (5–10KB), **never** raw critique files (otherwise context burns).
- **Headless fallback with trace caveat (DISPATCH-06)** — `bin/tumble-dry-loop.cjs` docstring + `--help` direct users to `/tumble-dry`. Trace-fidelity degradation on CC path documented in README + `polish-log.md`.
- **Per-round status surfacing (DISPATCH-07)** — Slash command emits `[tumble-dry-loop]` log idiom (round N starting, M reviewers dispatched, K material findings, converged/continuing).
- **Failure-mode taxonomy (DISPATCH-08)** — `dispatch-errors.md` with `timeout | malformed_output | refusal | silent_text_return`. Pre-dispatch manifest of expected critique paths + post-fanout glob reconciliation. Partial-round policy: `M/N >= 0.6` AND `material > 0` → proceed with degradation warning; else retry-once with stricter brief; then abort.

### Cross-cutting — Core Hardening (HARDEN-01..06)

- **HARDEN-01** — Voice-drift gate **BLOCKS** convergence (was informational). Cumulative `content_drift` from `round-0-original.md` exceeding threshold → round marked `drift-blocked`, continues regardless of material count. Anti-reward-hack against editor convergence-by-claim-suppression.
- **HARDEN-02** — Split `lib/voice.cjs` drift into `structural_drift` (markdown-only — heading reflow, list rewrap) and `content_drift` (substantive rewrites). Only `content_drift` gates.
- **HARDEN-03** — Aggregator dedup upgraded: token-Jaccard → bigram-Dice for paraphrase robustness. Boundary markers from FORMAT-02 used as additional anchors when present.
- **HARDEN-04** — Round-N reviewer briefs seeded with round-(N-1) unresolved material clusters. Reviewers explicitly check "did the editor address X?" Stops findings from disappearing silently.
- **HARDEN-05** — Trace retention: last 3 rounds full, older rounds gzipped + summarized. `.tumble-dry/<slug>/traces/INDEX.md` lists retained vs. archived.
- **HARDEN-06** — `.tumble-dry/` auto-appended to project `.gitignore` on first run (idempotent). Prevents accidental commit of working copies + traces.

### Testing

- `tests/harden.test.cjs` — 15 smoke tests.
- `tests/validate-plugin.test.cjs` — plugin spec validator failure modes.

## [0.4.2] — 2026-04-14 — Gastown removal + code-as-plaintext

**Theme:** Rip the gastown polecat dispatch backend (slow, fragile, infra-dependent). Voice self-defaults when no `voice_refs` configured. Code accepted as plaintext (language-aware comes in v0.6.0).

### Removed

- Gastown polecat dispatch backend. `dispatch_backend: gastown` no longer supported. `dispatch_backend: api` is the only option until v0.5.0 adds the CC-native path.

### Changed

- Voice sampler now falls back to the source's own voice (first ~N sentences) when `voice_refs` is empty or not configured. Previously errored.
- Code artifacts (`.js`, `.py`, etc.) accepted as plaintext. Reviewers see the raw code; editor treats it as text. No AST drift, no language-specific style anchors, no `verify_cmd` — those arrive in v0.6.0.

---

[0.7.0]: https://github.com/laulpogan/tumble-dry/releases/tag/v0.7.0
[0.6.0]: https://github.com/laulpogan/tumble-dry/releases/tag/v0.6.0
[0.5.2]: https://github.com/laulpogan/tumble-dry/releases/tag/v0.5.2
[0.5.1]: https://github.com/laulpogan/tumble-dry/releases/tag/v0.5.1
[0.5.0]: https://github.com/laulpogan/tumble-dry/releases/tag/v0.5.0
[0.4.2]: https://github.com/laulpogan/tumble-dry/releases/tag/v0.4.2
