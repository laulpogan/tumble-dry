---
phase: 6
plan: release
subsystem: release-qol
tags: [release, qol, docs, changelog, examples]
requirements_completed: [QOL-01, QOL-02, QOL-03]
milestone: v0.6.0
completed_date: 2026-04-15
---

# Phase 6: RELEASE / QOL (v0.6.0 close) Summary

**One-liner:** Closed v0.6.0 with scenario-shaped `--help`, end-to-end README polish for all 4 artifact families, `examples/office-format/` + `examples/code/` READMEs, and a full `CHANGELOG.md` covering v0.4.2 → v0.6.0. All 38 v1 active requirements now complete.

## Deliverables

### QOL-01 — Scenario-shaped `--help`

- `bin/tumble-dry-loop.cjs --help` — 4 scenario examples: prose post, `.pptx` deck (ROUNDTRIP_WARNING), code directory (`--panel-size 5 src/auth/`), `.docx` + `verify_cmd: "pytest tests/"` gate.
- `commands/tumble-dry.md` — mirror `## Quickstart examples` section with the same 4 scenarios.
- Commit: `9752e20`.

### QOL-02 — README end-to-end polish

- Tagline mentions all 4 families: prose, office formats, code, decks.
- "What's new in v0.6.0" callout near top.
- Dispatch section rewritten: 2-path description (CC-native + headless CLI). Stale "Opt-in: gastown polecats" line removed (ripped in v0.4.2).
- Old multi-version "Roadmap" replaced with shipped v0.4.2 → v0.6.0 summary + deferred v2 items pulled from `REQUIREMENTS.md §v2`.
- "Before merging non-trivial code" use-case line updated ("Language-aware as of v0.6.0").
- Commit: `a1b2b30`.

### QOL-03 — Examples directory grown

- `examples/office-format/README.md` — loader dispatch table, `npm install` once, expected run flow, `ROUNDTRIP_WARNING.md` behavior, boundary markers used as dedup anchors, manual re-apply guidance, failure-mode table ({encrypted, corrupt, unsupported, empty, too_large}), encoding invariants. No binary fixtures.
- `examples/code/README.md` — detection rules, code-mode changes table (editor/style/panel/reviewer-floor/drift/gate), worked deliberately-bad `getUser` example with reviewer persona critiques, post-redraft AST drift JSON showing `signature_changed_count: 1`, `verify_cmd` configuration, v0.6.0 limitations (polyglot, file size, tree-sitter grammar install).
- Commit: `60ba36b`.

### CHANGELOG.md

- New file at repo root.
- Sections: [0.6.0] (this release), [0.5.2] (office formats), [0.5.1] (persona library), [0.5.0] (CC-native dispatch + cross-cutting HARDEN-01..06), [0.4.2] (gastown removal).
- Each section has Added / Changed / Removed / Testing subsections cross-referencing REQ-IDs.
- Commit: `2d523c3`.

### Version + plugin manifest

- `VERSION` = `0.6.0` (verified — already bumped in Phase 5).
- `.claude-plugin/plugin.json` version = `0.6.0` (verified).
- `.claude-plugin/marketplace.json` version = `0.6.0` (verified).

## Requirements closed this phase

| REQ-ID | Status |
| ------ | ------ |
| QOL-01 | Complete |
| QOL-02 | Complete |
| QOL-03 | Complete |

Also marked Complete during close (were Pending but actually done in Phase 1):
- `DISPATCH-03` — agents/*.md frontmatter migrated (commits `8db15b3`, `d334810`, `6f954d7`, `599f189`).
- `DISPATCH-04` — `.claude-plugin/plugin.json` + relocated `marketplace.json` (commit `da76cf6`).
- `DISPATCH-06` — headless-fallback docstring + `--help` (commit `6b0f042`, now extended with scenario examples).

**Total v1 active requirements: 38/38 Complete.**

## Verification

All run from repo root post-commit:

```bash
node tests/harden.test.cjs      # 15/15 passed
node tests/format.test.cjs      # 15/15 passed
node tests/code.test.cjs        # 19/19 passed
node bin/validate-plugin.cjs    # PASS — plugin spec-compliant
node bin/tumble-dry.cjs config  # exit 0, prints resolved config
```

Total: 49 test assertions + plugin validator + CLI smoke — all green.

## Phase-scoped commit hygiene check

`git log --oneline -40` inspected. Each phase's commits carry phase-prefixed scopes (`(01-XX)`, `(02)`, `(03-harden)`, `(4-format)`, `(05)`, `(06)`). No phase-N+1 work in phase-N commits. Clean history ready for tag.

## Deviations from Plan

### Auto-fixed issues (all Rule 2 — missing critical tracking work)

**1. [Rule 2 — Missing requirement marking]** DISPATCH-03, DISPATCH-04, DISPATCH-06 were still marked Pending in `REQUIREMENTS.md` despite being fully delivered in Phase 1 (visible in commits `8db15b3`, `d334810`, `6f954d7`, `599f189`, `da76cf6`, `6b0f042`). Marked Complete during this phase's close since leaving them Pending would have made the "all 38 v1 active requirements complete" acceptance criterion false. Files modified: `.planning/REQUIREMENTS.md`. Covered by final commit.

No other deviations. CHANGELOG wording, examples wording, README structure followed the execution-context brief exactly.

## Key files created / modified

**Created:**
- `CHANGELOG.md`
- `examples/office-format/README.md`
- `examples/code/README.md`
- `.planning/phases/06-release/06-SUMMARY.md` (this file)

**Modified:**
- `bin/tumble-dry-loop.cjs` (help text)
- `commands/tumble-dry.md` (Quickstart examples section)
- `README.md` (tagline, What's new callout, Dispatch section, Roadmap section, code use-case line)
- `.planning/REQUIREMENTS.md` (QOL-01..03 + DISPATCH-03/04/06 marked Complete, traceability table updated)
- `.planning/STATE.md` (milestone close — updated in final commit)

## Commits this phase (chronological)

| Hash       | Subject                                                                            |
| ---------- | ---------------------------------------------------------------------------------- |
| `9752e20`  | feat(06): QOL-01 scenario-shaped --help + slash Quickstart examples                |
| `a1b2b30`  | docs(06): QOL-02 README end-to-end polish for v0.6.0                               |
| `60ba36b`  | docs(06): QOL-03 examples/office-format + examples/code READMEs                    |
| `2d523c3`  | docs(06): add CHANGELOG.md with v0.4.2 → v0.6.0 history                            |
| (pending)  | docs(06): milestone close — v0.6.0 ship-ready (SUMMARY + STATE + REQUIREMENTS)     |

## Self-Check: PASSED

- `CHANGELOG.md` — FOUND
- `examples/office-format/README.md` — FOUND
- `examples/code/README.md` — FOUND
- `bin/tumble-dry-loop.cjs` — help text updated, verified via `node bin/tumble-dry-loop.cjs` output
- `commands/tumble-dry.md` — Quickstart examples section present
- `README.md` — What's new v0.6.0 + Roadmap shipped/deferred sections present
- Commits `9752e20`, `a1b2b30`, `60ba36b`, `2d523c3` — all FOUND in `git log`
- All 3 test suites + validator + CLI smoke — all exit 0
