# Requirements — Milestone v0.7 (ROUNDTRIP)

**Source:** PROJECT.md Active section.
**Scope:** v0.7.0 — opt-in office-format roundtrip (FINAL.md → FINAL.docx/pptx/xlsx alongside).
**Out-of-scope:** PDF roundtrip (errors with guidance), lossless roundtrip (everything is explicitly lossy).
**Prior milestone (v0.6.0) requirements:** archived at `.planning/milestones/v0.6.0-REQUIREMENTS.md` and reflected in PROJECT.md Validated section.

---

## v1 Requirements (this milestone)

### Roundtrip — opt-in office-format regeneration

- [ ] **ROUNDTRIP-01** Opt-in flag: slash command accepts `--apply`; CLI accepts `--write-final`. Default behavior unchanged: only FINAL.md is produced + manual re-apply hint. With flag, also write `FINAL.<ext>` alongside FINAL.md by re-rendering markdown into the source format.
- [ ] **ROUNDTRIP-02** `.docx` writer at `lib/writers/docx.cjs` using `docx@^9` npm lib. Preserves: heading levels (H1-H6), paragraphs, ordered + unordered lists, simple markdown tables, inline emphasis (bold/italic/inline code), block quotes. Drops: complex layouts, images, embedded objects, comments, track-changes, custom styles, footnotes (markdown footnote syntax may be supported as endnotes if cheap).
- [ ] **ROUNDTRIP-03** `.pptx` writer at `lib/writers/pptx.cjs` using `pptxgenjs@^3` npm lib. Re-renders each `<!-- slide:N -->` boundary marker as one slide. Per-slide structure: H2 → title text box; subsequent paragraphs/bullets → body text box. Drops: original templates, animations, transitions, embedded media, slide masters, theme colors. Speaker notes preserved if present in source markdown (e.g., `<!-- notes: ... -->`), else dropped.
- [ ] **ROUNDTRIP-04** `.xlsx` writer at `lib/writers/xlsx.cjs` using `exceljs@^4` npm lib (NOT SheetJS — same CVE rationale as ingestion). Re-renders each `<!-- sheet:Name -->` markdown table as one sheet. Drops: formulas (markdown table cells become literal strings/numbers), pivot tables, charts, conditional formatting, data validation, named ranges, frozen panes.
- [ ] **ROUNDTRIP-05** `lib/writers/lossy-report.cjs` produces `LOSSY_REPORT.md` per run when `--apply`/`--write-final` is set. Sections: "Survived" (preserved from source), "Approximated" (lossy mapping noted), "Dropped" (entirely lost — formulas, animations, etc.). Surfaced to user before they ship the regenerated file (printed by slash command, listed in `polish-log.md`).
- [ ] **ROUNDTRIP-06** PDF roundtrip explicitly NOT supported. When source is `.pdf` and `--apply` flag is set, error with actionable message: `"PDF roundtrip is not supported. FINAL.md is your polished output — re-typeset with pandoc / weasyprint / your preferred markdown→PDF tool. See README §Roundtrip for rationale."` Without flag, behavior unchanged (FINAL.md emitted, no error).
- [ ] **ROUNDTRIP-07** Tests + per-format smoke fixtures at `tests/roundtrip.test.cjs`:
   - Round-trip a known docx through the full pipeline (load → tumble-dry mock convergence → write FINAL.docx). Verify regenerated docx loads in `mammoth` and produces equivalent markdown within preserved-structure tolerance (heading depths match, list counts match, table dimensions match).
   - Same for pptx (verify slide count + per-slide title text matches).
   - Same for xlsx (verify sheet count + per-sheet table dimensions match).
   - PDF: verify error path (loader-set source_format='pdf' + `--apply` → throws with the expected message).
- [ ] **ROUNDTRIP-08** Documentation + release:
   - README `## Roundtrip` section: how to use `--apply`, what's preserved/dropped per format, link to LOSSY_REPORT for runtime details, explicit PDF non-support callout.
   - CHANGELOG entry for v0.7.0.
   - VERSION → 0.7.0; `.claude-plugin/plugin.json` + `marketplace.json` bumped.
   - Sync to `SlanchaAi/skills/plugins/tumble-dry`.
   - Tag `v0.7.0` and push.

---

## v2 (deferred — not in this milestone)

- **MULTI-LLM-01** OpenAI / Gemini / local-model dispatch as alternatives to Anthropic. Anthropic-only through v0.7. Targeting v0.8+.
- **VOICE-FT-01** Personal fine-tuned voice model swap-in. Awaiting completion of the user's separate corpus project.
- **WEB-UI-01** / **REAL-USER-01** Anti-features per PROJECT.md philosophy.

## Out of Scope (explicit exclusions, this milestone)

- **PDF roundtrip** — Explicitly errors. Markdown→PDF is a different rendering problem with multiple acceptable third-party tools (pandoc, weasyprint, typst).
- **Lossless roundtrip** — Not achievable from a markdown projection. v0.7 is honestly lossy; LOSSY_REPORT.md tells the user what they're losing.
- **Roundtrip as default** — Manual re-apply remains default. `--apply` is opt-in.

---

## Traceability

| REQ-ID | Phase |
|--------|-------|
| ROUNDTRIP-01..08 | Phase 7 |

---

*Defined: 2026-04-15 during v0.7 milestone init.*
