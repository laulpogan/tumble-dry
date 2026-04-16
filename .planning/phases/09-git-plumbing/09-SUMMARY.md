---
phase: 9
plan: git-plumbing
subsystem: git-integration, glob-expand, cli
tags: [git, apply-to-source, glob, plumbing]
dependency_graph:
  requires: [v0.9.1-harness]
  provides: [git-integration, apply-to-source, glob-fix]
  affects: [bin/tumble-dry.cjs, commands/tumble-dry.md, lib/glob-expand.cjs]
tech_stack:
  added: []
  patterns: [best-effort-git, fs.globSync-with-fallback]
key_files:
  created:
    - lib/git-integration.cjs
    - tests/git.test.cjs
  modified:
    - bin/tumble-dry.cjs
    - commands/tumble-dry.md
    - lib/glob-expand.cjs
    - tests/batch.test.cjs
decisions:
  - fs.globSync (Node 22+) as primary glob engine with manual walkDir+regex fallback
  - Git operations best-effort with try/catch -- log warning and continue on failure
  - PR hint prints gh command but does not auto-create (user controls push)
  - commit-round as explicit CLI subcommand for slash command to call
metrics:
  duration: 7m13s
  completed: 2026-04-16
  tasks: 6
  files_created: 2
  files_modified: 4
---

# Phase 9: GIT + PLUMBING Summary

Git branch per tumble-dry run with per-round convergence-metadata commits, --apply-to-source, --no-git flag, and glob expansion fix via fs.globSync.

## Completed Requirements

| REQ-ID | Description | Status |
|--------|-------------|--------|
| GIT-01 | Auto-create branch `tumble-dry/<slug>` at init | Done |
| GIT-02 | Per-round commit with machine-parseable metadata | Done |
| GIT-03 | FINAL.md committed on convergence; source committed on --apply-to-source | Done |
| GIT-04 | PR creation hint (prints gh command, detects gh availability) | Done |
| GIT-05 | Batch mode: one branch per batch with per-file commits | Done |
| GIT-06 | --no-git flag disables all git operations | Done |
| APPLY-01 | --apply-to-source copies FINAL.md back to source path | Done |
| APPLY-02 | Batch mode apply (via existing batch finalize path) | Done |
| GLOB-01 | fs.globSync (Node 22+) with manual fallback for older Node | Done |
| GLOB-02 | init accepts glob string, routes to batch when N>1 | Done |

## Implementation Details

### lib/git-integration.cjs (new)
Core module with 6 functions: `createRunBranch`, `commitRound`, `commitFinal`, `commitApply`, `returnToOriginalBranch`, `prHint`. All wrapped in try/catch -- if git fails (not a repo, dirty index, permissions), logs warning and continues without git. Module-level `_disabled` flag for `--no-git`.

### bin/tumble-dry.cjs (modified)
- `init` subcommand: glob detection routes to batch when pattern matches N>1 files
- `finalize` subcommand: commitFinal + --apply-to-source + commitApply + prHint + returnToOriginalBranch
- New `commit-round` subcommand for slash command to call after each editor round
- `--no-git` and `--apply-to-source` parsed from argv

### lib/glob-expand.cjs (modified)
New `expandGlobNative` function tries `fs.globSync` (Node 22+) first, filtering out SKIP_DIRS. Falls back to existing walkDir + regex matcher.

### commands/tumble-dry.md (modified)
`--apply-to-source` and `--no-git` flags added to argument-hint and parse section. `commit-round` wired after extract-redraft in the round loop.

## Commit Message Format

```
tumble-dry: round <N> redraft (<slug>) -- <M> material, <K> structural, drift=<X.XX>, converged=<yes|no>
```

Machine-parseable regex: `tumble-dry: round (\d+) redraft \(([^)]+)\) -- (\d+) material, (\d+) structural, drift=([\d.]+), converged=(yes|no)`

## Tests

- **tests/git.test.cjs**: 12 tests covering branch creation, checkout existing, round commits, commit message parsing, final commit, apply commit, return-to-original, disable flag, non-repo auto-disable, full round-trip
- **tests/batch.test.cjs**: 3 new tests for GLOB-01/02 (top-level *.md, nested **/*.md, brace expansion {md,txt})
- All existing test suites pass (harden, format, code, roundtrip, batch)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Inverted branch-exists check in createRunBranch**
- **Found during:** Task 5 (tests)
- **Issue:** `git show-ref --verify --quiet` returns empty string on success (branch exists) and null on ignoreError (branch missing). Logic was inverted.
- **Fix:** Flipped the null check: `if (exists === null)` means branch doesn't exist, create it.
- **Files modified:** lib/git-integration.cjs
- **Commit:** 99e54c5

## Self-Check: PASSED

All 6 files found. All 5 commits verified.
