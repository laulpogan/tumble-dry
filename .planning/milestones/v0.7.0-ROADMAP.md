# Roadmap — tumble-dry v0.7 (ROUNDTRIP)

**Milestone:** v0.7.0 — opt-in office-format roundtrip
**Granularity:** coarse (single phase)
**Parallelization:** true (writers are independent)
**Mode:** yolo
**Coverage:** 8/8 Active requirements mapped (ROUNDTRIP-01..08)

Single-phase milestone. Three writers (docx/pptx/xlsx) are independent and run in parallel; the wiring (opt-in flag + LOSSY_REPORT + PDF guard rail + tests + release) is the integration phase.

Prior milestone roadmap (v0.5.x → v0.6.0, 6 phases) archived at `.planning/milestones/v0.6.0-ROADMAP.md`.

---

## Phases

- [ ] **Phase 7: ROUNDTRIP (v0.7.0)** — opt-in regeneration of source binary alongside FINAL.md, with explicit lossiness reporting

---

## Phase Details

### Phase 7: ROUNDTRIP (v0.7.0)
**Goal**: User can pass `--apply` (slash) / `--write-final` (CLI) and tumble-dry produces a regenerated `.docx` / `.pptx` / `.xlsx` next to FINAL.md, with a LOSSY_REPORT.md describing what survived, what was approximated, and what was dropped. PDF roundtrip explicitly errors with guidance. Default behavior (FINAL.md only) unchanged.
**Depends on**: v0.6.0 (FORMAT loaders + boundary markers + source-format.json metadata)
**Requirements**: ROUNDTRIP-01, ROUNDTRIP-02, ROUNDTRIP-03, ROUNDTRIP-04, ROUNDTRIP-05, ROUNDTRIP-06, ROUNDTRIP-07, ROUNDTRIP-08
**Success Criteria** (what must be TRUE):
  1. Without `--apply`/`--write-final`: pipeline unchanged — only FINAL.md produced, no new files, no LOSSY_REPORT, no behavior regression vs v0.6.0.
  2. With flag, source = `.docx`: `FINAL.docx` produced; loading it in `mammoth` yields markdown structurally equivalent to FINAL.md (same heading depths, same list counts, same table dimensions); LOSSY_REPORT.md lists known drops.
  3. With flag, source = `.pptx`: `FINAL.pptx` produced; opening with `officeparser` yields the same slide count as FINAL.md `<!-- slide:N -->` markers; per-slide title text from H2 lines.
  4. With flag, source = `.xlsx`: `FINAL.xlsx` produced; loading in `exceljs` yields the same sheet count as FINAL.md `<!-- sheet:Name -->` markers; per-sheet table dimensions match the markdown tables.
  5. With flag, source = `.pdf`: errors with the documented "PDF roundtrip is not supported" message; exits non-zero; FINAL.md still produced.
  6. `tests/roundtrip.test.cjs` exits 0; existing test suites (harden, format, code) still exit 0.
  7. README `## Roundtrip` section, CHANGELOG v0.7.0 entry, VERSION/plugin.json/marketplace.json all at 0.7.0; tag pushed; SlanchaAi marketplace synced.
**Plans**: TBD (decomposed by `/gsd-plan-phase 7`)
**UI hint**: no
