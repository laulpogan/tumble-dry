---
phase: 2
name: PERSONA (v0.5.1)
status: complete
completed: 2026-04-15
requirements: [PERSONA-01, PERSONA-02, PERSONA-03, PERSONA-04, PERSONA-05, PERSONA-06]
key-files:
  created:
    - personas/library.md
    - personas/runbook.md
    - personas/configs.json
  modified:
    - agents/audience-inferrer.md
    - .planning/REQUIREMENTS.md
---

# Phase 2 — PERSONA (v0.5.1) Summary

**One-liner:** Synthesized four research-file persona corpora into a 40-section library, a detection-and-selection runbook, and a per-type config JSON; refactored `agents/audience-inferrer.md` from inline tables to external references with explicit believer/skeptic enforcement and code-review layman swap.

## Files

### Created
- `personas/library.md` (1572 lines, 40 H2 sections) — artifact-type × persona index; every persona carries name + italic bio, hiring job, bounce trigger, one load-bearing belief; every section tags its believer/skeptic pairing (Pitfall 16 enforcement); dedicated `# Code review (any language)` section with 5 personas whose bounce triggers explicitly exclude linter-catchable issues.
- `personas/runbook.md` (207 lines, 4 sections) — §1 Detection rules (43 numbered extension + content heuristic rules), §2 Panel selection (library lookup, `panel_size` clamping, code-artifact layman→newhire swap), §3 Mix-and-match (primary + secondary pairing table, layman + operator add-rules, anti-mode-collapse check), §4 Structural-vs-surface failure-mode index (1–3 structural failures per type sourced from research files).
- `personas/configs.json` (322 lines, 44 top-level keys, valid JSON) — `default` + `code` + 41 artifact-type entries; `drift_threshold=0.15` for code vs. `0.25` default; domain-specific entries carry `required_checks` arrays; `_variant_public_co` subkey on `board-memo`.

### Modified
- `agents/audience-inferrer.md` — inline persona-library tables (financial model / copy / pitch deck / blog / strategy doc) removed; replaced with references to `personas/{library.md,runbook.md,configs.json}`; added panel-selection procedure (detect → library lookup → mix-and-match → believer/skeptic validate → code-swap); added believer/skeptic non-negotiable clause; added code-artifact layman-swap instruction; added `Detected artifact type` + `Believer/skeptic check` fields to `audience.md` output format.
- `.planning/REQUIREMENTS.md` — PERSONA-01..06 checkboxes ticked; traceability table Status = Complete for all six.

## Persona counts per family

| Family | H2 sections | ~personas |
|--------|-------------|-----------|
| Business & Finance | 10 | 58 |
| Product & Engineering | 10 (+ code-review) | 60 + 5 |
| Marketing & Communications | 10 | 63 |
| Domain-specific (Healthcare/Legal/Gov/Academic/Education) | 10 | 57 |
| **Total** | **40 + 1 code-review** | **~243** |

Total unique named personas across the library: ~243 (some personas intentionally recur across types, e.g., Elena Voss appears in Press Release, Crisis Comms, and Earnings IR — by source design).

## PERSONA-01..06 coverage

| Req | Deliverable | Where satisfied |
|-----|-------------|-----------------|
| PERSONA-01 | ≥30 types, 4 families, mandatory fields, believer/skeptic pairing | `personas/library.md` — 40 types, every persona has all 4 mandatory fields; every section has explicit `Believer/skeptic pairing:` line |
| PERSONA-02 | Detection rules, panel-selection, mix-and-match, structural failure index | `personas/runbook.md` §§1–4 |
| PERSONA-03 | Per-type configs incl. `drift_threshold`, code stricter | `personas/configs.json` — 41 types + code (0.15) + default (0.25) |
| PERSONA-04 | audience-inferrer references, does not duplicate | `agents/audience-inferrer.md` — inline tables removed (verified: 0 `VC Partner` / `CMO` table matches), references added |
| PERSONA-05 | Structural-vs-surface index per type, sourced from research | `personas/runbook.md` §4 — 1–3 structural failures per type, citations to research files |
| PERSONA-06 | Code-review persona section, bounce triggers exclude linter-catchable | `personas/library.md` `# Code review (any language)` — 5 personas (Priya Narayanan staff eng, Ramona Diaz security, Frances Idemudia on-call SRE, Yuki Tanaka new-hire-in-6-months, Linus-style Hostile-Fork Reviewer); each bounce trigger explicitly marked `(not linter-catchable.)` |

## Commits

| # | Hash | File | Message |
|---|------|------|---------|
| 1 | `1757995` | `personas/library.md` | `feat(02): persona library with 40 artifact-type panels (PERSONA-01, -05, -06)` |
| 2 | `123cf6e` | `personas/runbook.md` | `feat(02): persona runbook with detection + selection + structural index (PERSONA-02, -05)` |
| 3 | `9507671` | `personas/configs.json` | `feat(02): persona configs.json with per-type tuned defaults (PERSONA-03)` |
| 4 | `5610ad8` | `agents/audience-inferrer.md` | `feat(02): audience-inferrer references personas/ files (PERSONA-04)` |

A final metadata commit will capture SUMMARY.md + REQUIREMENTS.md updates.

## Acceptance-criteria verification

- [x] `wc -l personas/library.md` = **1572** (≥ 800 required)
- [x] `grep -c '^## ' personas/library.md` = **40** (≥ 30 required)
- [x] `personas/configs.json` parses as valid JSON (44 top-level keys)
- [x] `agents/audience-inferrer.md` no longer contains inline `| **VC Partner** |` / `| **CMO** |` table lines (grep returns 0 matches for the old inline-table signature)
- [x] `personas/runbook.md` has all 4 sections — §1 Detection rules, §2 Panel selection, §3 Mix-and-match rules, §4 Structural-vs-surface failure-mode index
- [x] PERSONA-01..06 marked Complete in `.planning/REQUIREMENTS.md` (both the checkbox block and the traceability table)

## Deviations from plan

None. Plan executed exactly as written. A few discretionary choices worth recording:

- **Total artifact types = 40 + code-review, not 30.** Research files supplied 40 distinct types and merging them down to exactly 30 would have lost research fidelity. Acceptance criterion was ≥30; delivered 40 with near-zero dedup need.
- **Marketing-comms `convergence_threshold` preserved as decimal ratios** (0.80, 0.83 etc.) rather than re-encoded as integer counts, because the source research file expresses them as ratios (e.g., "5 of 6"). `lib/reviewer-brief.cjs` will need to branch on type when interpreting this field; noted here for the Phase 3 HARDEN pass.
- **Code-review section kept at 5 personas** (not 5–7). The research (product-engineering.md cross-cutting notes + PERSONA-06 spec) lists exactly the five archetypes; padding would have been invention.

## Auth gates

None encountered.

## Self-Check: PASSED

- personas/library.md — FOUND
- personas/runbook.md — FOUND
- personas/configs.json — FOUND (valid JSON, 44 keys)
- agents/audience-inferrer.md — FOUND (old tables verified absent)
- commit 1757995 — FOUND
- commit 123cf6e — FOUND
- commit 9507671 — FOUND
- commit 5610ad8 — FOUND
