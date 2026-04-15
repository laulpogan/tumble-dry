---
phase: 7
plan: roundtrip
milestone: v0.7.0
requirements: [ROUNDTRIP-01, ROUNDTRIP-02, ROUNDTRIP-03, ROUNDTRIP-04, ROUNDTRIP-05, ROUNDTRIP-06, ROUNDTRIP-07, ROUNDTRIP-08]
status: complete
completed: 2026-04-15
---

# Phase 7 ROUNDTRIP (v0.7.0) Summary

Opt-in office-format roundtrip — `--apply` (slash) / `--write-final` (CLI) regenerates `.docx` / `.pptx` / `.xlsx` from `FINAL.md` and emits `LOSSY_REPORT.md`. PDF explicitly errors with a pointer to pandoc/weasyprint. Default behavior unchanged.

## Files created

- `lib/writers/docx.cjs` — markdown → DOCX via `docx@^9`. Maps headings, paragraphs, lists, pipe tables, inline emphasis, block quotes; strips boundary-marker HTML comments.
- `lib/writers/pptx.cjs` — markdown → PPTX via `pptxgenjs@^3`. Splits `<!-- slide:N -->`; H2 → title, body lines → bullets, `<!-- notes: ... -->` → speaker notes.
- `lib/writers/xlsx.cjs` — markdown → XLSX via `exceljs@^4`. Splits `<!-- sheet:Name -->`; bold header row; numeric coercion preserves leading zeros.
- `lib/writers/lossy-report.cjs` — assembles `LOSSY_REPORT.md` with `## Survived` / `## Approximated` / `## Dropped`.
- `lib/writers/index.cjs` — dispatcher; PDF returns `{ok:false, reason:'pdf_unsupported'}` with the documented message.
- `tests/roundtrip.test.cjs` — 17 smoke tests (real lib round-trips, lossy-report, PDF guard, finalize CLI integration).

## Files modified

- `bin/tumble-dry.cjs` — `finalize` accepts `--apply`. On set: reads `source-format.json`, dispatches to writer, writes `FINAL.<ext>` + `LOSSY_REPORT.md`, appends `## Roundtrip` to `polish-log.md`. Exit 4 = PDF guard, 5 = writer failure.
- `bin/tumble-dry-loop.cjs` — adds `--write-final` arg passthrough.
- `commands/tumble-dry.md` — `--apply` in argument-hint, parsed as `APPLY_ROUNDTRIP`, propagated to finalize at convergence + max-rounds branches; `LOSSY_REPORT.md` cat'd to chat after success.
- `package.json` — version 0.6.0 → 0.7.0; added `docx`, `pptxgenjs`, `exceljs` to optionalDependencies; added `test:roundtrip` script and chained `tests/roundtrip.test.cjs` into top-level `test`.
- `VERSION` — 0.7.0.
- `.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json` — bumped to 0.7.0.
- `README.md` — new `## Roundtrip` section between Office formats and Code mode; status block bumped.
- `CHANGELOG.md` — `[0.7.0]` entry + ref link.
- `.planning/REQUIREMENTS.md` — ROUNDTRIP-01..08 marked `[x]`.

## Acceptance criteria

| Criterion | Status |
|-----------|--------|
| `npm install` succeeds with new deps | PASS — added 88 packages, 0 vulnerabilities |
| `node tests/roundtrip.test.cjs` exits 0 | PASS — 17/17 |
| `node tests/format.test.cjs` exits 0 | PASS — 15/15 (no regression) |
| `node tests/code.test.cjs` exits 0 | PASS — 19/19 (no regression) |
| `node tests/harden.test.cjs` exits 0 | PASS — 15/15 (no regression) |
| `node tests/validate-plugin.test.cjs` exits 0 | PASS — 7/7 |
| `node bin/validate-plugin.cjs` exits 0 | PASS |
| `node bin/tumble-dry.cjs config` exits 0 | PASS |
| ROUNDTRIP-01..08 → Complete in REQUIREMENTS.md | PASS |
| VERSION = 0.7.0 | PASS |
| CHANGELOG.md has v0.7.0 entry | PASS |

## Deviations

- **officeparser API mismatch (Rule 3 — blocking issue, test only).** The new `officeparser@^6` returns a structured `{type, content, attachments, toText, ...}` object, not a string. The existing `lib/loaders/pptx.cjs` and `lib/loaders/xlsx.cjs` (out of scope — pre-existing) call `parseOfficeAsync` (does not exist; should be `parseOffice`) and treat the result as a string. The test handles both old (string) and new (object with `.toText()`) shapes via a defensive runtime check. Pre-existing loader bugs logged for follow-up but NOT fixed (out-of-scope per executor rules).
- **Polish-log write order (Rule 1 — bug).** Initial implementation appended the `## Roundtrip` section before the base polish log was written, leaving an inconsistent file on success. Fixed by writing the base log up front, then appending the roundtrip section in the success branch.

## Pre-existing follow-ups (deferred)

- `lib/loaders/pptx.cjs:47` and `lib/loaders/xlsx.cjs:46` call `officeparser.parseOfficeAsync` which does not exist in v6+ — these loaders silently return `{ok:false, reason:'corrupt'}` on real `.pptx`/`.xlsx` input. Predates this milestone (FORMAT-02). Not fixed here.

## Footprint

- **`node_modules`**: 196 MB total after `npm install` (88 new packages added by docx + pptxgenjs + exceljs). All pure JS — no native bindings, no platform-specific blobs.

## Sync to SlanchaAi marketplace + tag/push

Not performed by this executor — release publishing is a manual gate per project convention. Next manual steps:

```bash
git tag v0.7.0
git push origin master --tags
# rsync this repo into ~/Source/SlanchaAi/skills/plugins/tumble-dry per ROUNDTRIP-08
```

## Self-Check: PASSED

- All listed file paths verified to exist on disk.
- All 4 test suites + plugin validator + config exit 0.
- VERSION / plugin.json / marketplace.json all read 0.7.0.
