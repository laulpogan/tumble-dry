---
phase: 01-dispatch-v0-5-0
plan: 04
subsystem: tooling/ci
tags: [validator, ci, plugin-spec, frontmatter, dispatch]
requirements: [DISPATCH-02]
provides:
  - "CI-gated plugin-spec validator (bin/validate-plugin.cjs)"
  - "Smoke-test suite proving validator catches each Pitfall-2 failure mode"
key-files:
  created:
    - bin/validate-plugin.cjs
    - tests/validate-plugin.test.cjs
decisions:
  - "Implemented minimal flat-YAML frontmatter parser inline rather than adding a YAML dep — tumble-dry frontmatter is flat and zero-dep is a project rule"
  - "Validator runs both directions of the marketplace<->frontmatter parity check (catches orphan agent files in addition to missing files)"
  - "Tests use os.tmpdir() fixture copies so suite never mutates real .claude-plugin/ or agents/"
  - "Exit-code convention: 0 pass, 1 validation failures, 2 unexpected error (matches bin/tumble-dry-loop.cjs)"
metrics:
  duration: ~5min
  tasks_completed: 2
  files_touched: 2
  completed: 2026-04-15
---

# Phase 01 Plan 04: Plugin validator Summary

DISPATCH-02 satisfied: `bin/validate-plugin.cjs` is now a runnable, executable, zero-dep Node CLI that gates plugin spec compliance — catches missing manifests, marketplace<->frontmatter name drift, obsolete `tumble-dry-` prefix, and silently-stripped frontmatter fields (`hooks`, `mcpServers`, `permissionMode`). Validator exits 0 on the post-Plan-01/02 repo state. 7-test smoke suite codifies every failure mode against tmp-dir fixtures.

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Implement `bin/validate-plugin.cjs` | `df20691` | bin/validate-plugin.cjs |
| 2 | Smoke tests for validator failure modes | `6ce68a5` | tests/validate-plugin.test.cjs |

## Acceptance criteria

- [x] `bin/validate-plugin.cjs` exists with `#!/usr/bin/env node` shebang, mode 0755
- [x] `node bin/validate-plugin.cjs` exits 0 on current repo state (verified — `EXIT=0`, `PASS — plugin spec-compliant`)
- [x] All required checks present: plugin.json existence, marketplace.json existence, root marketplace.json absence, name parity (both directions), `tumble-dry-` prefix rejection, forbidden-field rejection
- [x] No third-party deps (only `fs`, `path` from Node core)
- [x] `tests/validate-plugin.test.cjs` exists; `node --test` exits 0 with 7/7 passing
- [x] Tests use isolated tmp-dir fixtures — real `.claude-plugin/` and `agents/` untouched

## Verification

```text
$ node bin/validate-plugin.cjs
[validate-plugin] PASS — plugin spec-compliant
EXIT=0

$ node --test tests/validate-plugin.test.cjs
✔ passes on real repo state (77.1ms)
✔ fails when plugin.json missing (79.2ms)
✔ fails when marketplace.json missing (75.6ms)
✔ fails when root marketplace.json present (stale) (78.2ms)
✔ fails when agent name uses obsolete tumble-dry- prefix (77.3ms)
✔ fails on forbidden frontmatter field (hooks) (77.4ms)
✔ fails on agent name mismatch between marketplace and frontmatter (75.5ms)
ℹ tests 7  ℹ pass 7  ℹ fail 0
```

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: bin/validate-plugin.cjs (140 lines, executable)
- FOUND: tests/validate-plugin.test.cjs (112 lines)
- FOUND commit: df20691 (feat 01-04)
- FOUND commit: 6ce68a5 (test 01-04)
