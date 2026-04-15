# Phase 7: ROUNDTRIP (v0.7.0) - Context

**Mode:** Auto-generated

<domain>
Opt-in office-format roundtrip: regenerate `.docx`/`.pptx`/`.xlsx` from FINAL.md alongside the markdown. PDF explicitly errors. Lossy by design — LOSSY_REPORT.md surfaces what was dropped.

ROUNDTRIP-01..08 in REQUIREMENTS.md.
</domain>

<decisions>
- Stack: `docx@^9` (.docx), `pptxgenjs@^3` (.pptx), `exceljs@^4` (.xlsx). All pure JS, no native deps.
- NOT SheetJS (CVE rationale, same as ingestion).
- Opt-in flag: `--apply` (slash) / `--write-final` (CLI). Default behavior unchanged.
- PDF roundtrip explicitly errors with actionable message — no half-baked PDF generation.
- LOSSY_REPORT.md per run: Survived / Approximated / Dropped sections.
- Boundary markers from v0.5.2 (`<!-- slide:N -->`, `<!-- sheet:Name -->`, `<!-- page:N -->`) drive per-format re-rendering.
- New files: `lib/writers/{docx,pptx,xlsx,lossy-report}.cjs`. Pattern mirrors `lib/loaders/*.cjs`.
</decisions>

<code_context>
- `lib/loader.cjs` already detects format at init, persists to `source-format.json`. Writer dispatch reads same metadata.
- `bin/tumble-dry.cjs::finalize` produces FINAL.md from working.md. Hook in after for `--write-final`.
- `commands/tumble-dry.md` slash command's finalize step needs `--apply` parsing + writer dispatch + LOSSY_REPORT surface.
- `lib/run-state.cjs` has source path + format metadata.
- All 3 writer formats are independent — parallelize plans.
</code_context>
