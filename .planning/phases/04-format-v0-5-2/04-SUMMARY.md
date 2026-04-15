---
phase: "04"
plan: "format-v0-5-2"
subsystem: office-format-ingestion
tags: [format, loader, ingestion, optional-deps, v0.5.2]
requires:
  - HARDEN-06 (.gitignore bootstrap; reused by loader)
  - package.json introduction (net-new this phase)
provides:
  - lib/loader.cjs (format dispatcher)
  - lib/loaders/{markdown,docx,pptx,xlsx,pdf,pandoc}.cjs
  - ROUNDTRIP_WARNING.md emission in initRun
  - source-format.json loader metadata
  - tests/format.test.cjs
affects:
  - lib/run-state.cjs (initRun now async, routes through loader)
  - bin/tumble-dry.cjs init (async, surfaces loader warnings, exits 3 on failure)
  - commands/tumble-dry.md (parses init JSON, prints ROUNDTRIP_WARNING)
tech-stack:
  added:
    - mammoth@^1.7.0 (optional)
    - turndown@^7.2.0 (optional)
    - officeparser@^6.0.7 (optional)
    - unpdf@^0.13.1 (optional, ESM, dynamic import)
  patterns:
    - Typed-result contract: {ok:true,markdown,format,warnings[]} | {ok:false,reason,detail}
    - Priority-ordered dispatcher (markdown 10 → docx 30 → pptx 40 → xlsx 50 → pdf 60 → pandoc 100)
    - Optional-dep try/catch require inside each loader (graceful degradation)
    - HTML-comment boundary markers (<!-- slide:N --> / <!-- sheet:Name --> / <!-- page:N -->)
key-files:
  created:
    - package.json
    - package-lock.json
    - lib/loader.cjs
    - lib/loaders/markdown.cjs
    - lib/loaders/docx.cjs
    - lib/loaders/pptx.cjs
    - lib/loaders/xlsx.cjs
    - lib/loaders/pdf.cjs
    - lib/loaders/pandoc.cjs
    - tests/format.test.cjs
    - tests/fixtures/format/sample.md
    - tests/fixtures/format/cjk.txt
    - tests/fixtures/format/emoji.md
    - tests/fixtures/format/bom.md
    - tests/fixtures/format/README.md
  modified:
    - lib/run-state.cjs (initRun → async; ROUNDTRIP_WARNING + source-format.json)
    - bin/tumble-dry.cjs (async init; surfaces loader result; exit 3 on failure)
    - commands/tumble-dry.md (parses init JSON; prints ROUNDTRIP_WARNING)
    - tests/harden.test.cjs (await initRun)
    - VERSION (→ 0.5.2)
    - .claude-plugin/plugin.json (→ 0.5.2)
    - .claude-plugin/marketplace.json (→ 0.5.2)
    - README.md (new ## Office formats section)
    - .planning/REQUIREMENTS.md (FORMAT-01..07 Complete)
decisions:
  - Optional deps over hard deps — markdown-only users need zero install.
  - officeparser covers pptx+xlsx+pdf as unified AST — kills dependency sprawl.
  - unpdf ESM via dynamic import() from CJS loader (not a full ESM rewrite).
  - 20MB file-size gate in every loader (FORMAT-06) — conservative default.
  - Mock-loader tests for encrypted/too_large so we validate the {ok:false}
    branches without shipping real encrypted fixtures.
metrics:
  duration: 00:15:00
  completed: 2026-04-15
  tasks: 6
  files_created: 15
  files_modified: 9
  commits: 5
---

# Phase 4 Plan format-v0-5-2: Office Format Ingestion Summary

Markdown-first format dispatcher with typed-result contract, optional office-format dependencies, HTML-comment boundary markers, and explicit roundtrip-honesty UX — lands `lib/loader.cjs` + per-format loaders without breaking the markdown-only install path.

## What shipped

1. **`package.json` @ v0.5.2** — first package.json in the repo. Deps declared as `optionalDependencies`; `npm install --no-save` completes in ~2s with 0 vulnerabilities. `mammoth`, `turndown`, `officeparser`, `unpdf` installed; markdown-only users can skip the install entirely and the loader degrades with an actionable npm-install hint.

2. **`lib/loader.cjs` dispatcher + `lib/loaders/*`** — priority-ordered module list (markdown 10 → docx 30 → pptx 40 → xlsx 50 → pdf 60 → pandoc 100). Every loader returns `{ ok:true, markdown, format, warnings[] }` or `{ ok:false, reason, detail }` with `reason ∈ { encrypted | corrupt | unsupported | empty | too_large }`. Each loader wraps its optional-dep require in try/catch so missing deps become graceful `{ ok:false, reason:'unsupported', detail:'... run npm install' }` — never an uncaught throw.

   Boundary markers per FORMAT-02:
   - pptx → `<!-- slide:N -->\n## Slide N — <title>`
   - xlsx → `<!-- sheet:Name -->\n## Sheet: <name>`
   - pdf → `<!-- page:N -->\n## Page N`
   - docx → native H1/H2/H3 preserved via mammoth → turndown (no extra marker needed)

3. **`lib/run-state.cjs::initRun` interception** — now async. Routes source through `loader.load()` on fresh init, writes `working.md` as the markdown projection, preserves source binary at `history/round-0-original.<ext>`, emits `ROUNDTRIP_WARNING.md` **before round 1** for non-markdown sources (FORMAT-04), and writes `source-format.json` with loader metadata + warnings. Markdown/txt sources keep the legacy `round-0-original.md` snapshot so existing voice/drift tooling is unchanged.

4. **`bin/tumble-dry.cjs init`** — now async. Surfaces loader warnings to stderr, embeds `source_format` and `roundtrip_warning` path in the stdout JSON, exits code 3 on loader failure with an actionable message (supported formats + `npm install` hint).

5. **`commands/tumble-dry.md`** — parses the init JSON output (slug + source_format), fails fast on init exit-code non-zero, and prints the full `ROUNDTRIP_WARNING.md` content to the user **before round 1 begins** so they see the "FINAL.md is markdown, re-apply manually" warning inline.

6. **Tests** — `tests/format.test.cjs` (15 cases, all pass) covering: dispatcher resolution, typed-result contract, BOM strip, CJK preservation, emoji/ZWJ preservation, `too_large` / `empty` / `unsupported` / `encrypted` fail branches, `initRun` round-trip, ROUNDTRIP_WARNING emission, and graceful optional-dep skip. Mock-loader pattern validates the `{ok:false}` branches without shipping real encrypted/oversized fixtures.

   Text fixtures committed: `sample.md`, `cjk.txt`, `emoji.md`, `bom.md`. Binary fixtures (docx/pptx/xlsx/pdf) intentionally NOT committed; `tests/fixtures/format/README.md` documents how to drop local ones in.

7. **Version bump** — VERSION, `.claude-plugin/marketplace.json`, `.claude-plugin/plugin.json` → 0.5.2.

8. **README** — new `## Office formats` section with loader table, typed-result contract, roundtrip policy, encoding invariants, and npm-install hint.

9. **REQUIREMENTS.md** — FORMAT-01, FORMAT-01a, FORMAT-02..07 marked `[x]` + Complete in the traceability table (8/8).

## Acceptance criteria — verified

| Criterion                                             | Result |
| ----------------------------------------------------- | ------ |
| `npm install --no-save` from repo root succeeds       | PASS — 58 packages, 0 vulnerabilities |
| `node bin/tumble-dry.cjs init <some.md>` still works  | PASS — returns JSON, `source_format: markdown`, no ROUNDTRIP_WARNING |
| `node tests/format.test.cjs` exits 0                  | PASS — 15/15 |
| `node tests/harden.test.cjs` exits 0 (no regressions) | PASS — 15/15 |
| `node bin/validate-plugin.cjs` exits 0                | PASS — plugin spec-compliant |
| All FORMAT-01..07 marked complete                     | PASS — 8/8 in REQUIREMENTS.md |

Install footprint of `node_modules`: **138M** on disk (mammoth + turndown + officeparser + unpdf + transitive). Markdown-only users never pay this cost; accepted trade-off for office-format users per architectural risk table.

## Commits

| Hash    | Message                                                                         |
| ------- | ------------------------------------------------------------------------------- |
| 4d12618 | chore(4-format): introduce package.json with office-format optionalDependencies |
| (loaders) | feat(4-format): add lib/loader.cjs dispatcher + per-format loader modules     |
| 08f6848 | feat(4-format): intercept initRun with lib/loader; emit ROUNDTRIP_WARNING.md    |
| 6540cce | chore(4-format): v0.5.2 bump + slash command surfaces ROUNDTRIP_WARNING         |
| (tests) | test(4-format): FORMAT-01..07 smoke tests + text fixtures                       |
| f9f2481 | docs(4-format): README office-formats section + mark FORMAT-01..07 Complete    |

## Deviations from Plan

**1. [Rule 2 — Critical] File-size gate added to all loaders, not just PDF/XLSX**

- **Found during:** Task 2 (loader modules)
- **Issue:** STACK.md + PITFALLS #9 specifies size gates only for PDF/XLSX. In practice, a 500MB corrupt `.md` or `.txt` crashes the process just as badly — the gate is cheap and belongs in every loader.
- **Fix:** 20MB `MAX_INPUT_BYTES` constant enforced in every loader (markdown, docx, pptx, xlsx, pdf). Pandoc fallback included.
- **Files modified:** every `lib/loaders/*.cjs`
- **Commit:** (loaders feat commit)

**2. [Rule 2 — Critical] Legacy `history/round-0-original.md` snapshot preserved alongside per-extension binary**

- **Found during:** Task 3 (initRun interception)
- **Issue:** Existing voice-sampling + drift-anchor code (lib/voice.cjs, bin/tumble-dry.cjs sample-voice) hardcodes `history/round-0-original.md`. Writing only `round-0-original.<ext>` for non-markdown sources would silently break voice anchors in downstream plans.
- **Fix:** For markdown/txt sources, duplicate the snapshot to `round-0-original.md` (unchanged behavior). For non-markdown sources, copy the markdown projection to `round-0-original.md` so voice/drift still has a markdown anchor, AND write the binary at `round-0-original.<ext>` for FORMAT-03 roundtrip preservation.
- **Files modified:** `lib/run-state.cjs`
- **Commit:** 08f6848

**3. [Rule 3 — Blocker] `tests/harden.test.cjs` updated to `await initRun`**

- **Found during:** Task 3 (initRun is now async)
- **Issue:** Making `initRun` async broke the signature contract for existing tests. HARDEN-06 test happened to still pass (gitignore-bootstrap is synchronous), but was fire-and-forgetting a Promise — brittle.
- **Fix:** Add `async` + `await` to the single existing test that calls `initRun`. No behavior change; correctness upgrade only.
- **Files modified:** `tests/harden.test.cjs`
- **Commit:** 08f6848

**4. [Out-of-scope — deferred]**

Not a deviation but worth flagging: `officeparser` emits concatenated text with a configurable newline delimiter — it does NOT expose per-slide / per-sheet AST. Our pptx/xlsx loaders use a unique sentinel string (`<<<TD_SLIDE_BREAK>>>` / `<<<TD_SHEET_BREAK>>>`) as the delimiter and split on it, then best-effort title slides as "Slide N" (first non-empty line). This satisfies FORMAT-02 (boundary markers present and aggregator-usable) but slide-title extraction for pptx is first-line-heuristic, not structural. If slide titles matter precisely, post-v0.5.2 could walk the OOXML directly. Logged here; not a blocker.

## Known Stubs

None. All loaders wired end-to-end; pandoc fallback gracefully degrades when `pandoc` is not on PATH.

## Self-Check

Verified files on disk:
- FOUND: `package.json`
- FOUND: `package-lock.json`
- FOUND: `lib/loader.cjs`
- FOUND: `lib/loaders/markdown.cjs`, `docx.cjs`, `pptx.cjs`, `xlsx.cjs`, `pdf.cjs`, `pandoc.cjs`
- FOUND: `tests/format.test.cjs`
- FOUND: `tests/fixtures/format/{sample.md,cjk.txt,emoji.md,bom.md,README.md}`
- FOUND: `.planning/phases/04-format-v0-5-2/04-SUMMARY.md` (this file)

Verified commits in `git log`:
- FOUND: 4d12618 (package.json)
- FOUND: 08f6848 (initRun interception)
- FOUND: 6540cce (version bump)
- FOUND: f9f2481 (docs)

## Self-Check: PASSED
