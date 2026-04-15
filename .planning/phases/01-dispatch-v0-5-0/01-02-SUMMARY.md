---
phase: 01-dispatch-v0-5-0
plan: 02
subsystem: agents
tags: [agents, frontmatter, plugin-spec, migration]
requires:
  - "Plan 01: marketplace.json with stripped agent names"
provides:
  - "Plugin-spec-compliant agent frontmatter for all four subagents"
affects:
  - "agents/audience-inferrer.md"
  - "agents/assumption-auditor.md"
  - "agents/reviewer.md"
  - "agents/editor.md"
tech-stack:
  added: []
  patterns:
    - "Plugin-shipped subagent frontmatter (name/description/model/tools/maxTurns)"
key-files:
  created: []
  modified:
    - "agents/audience-inferrer.md"
    - "agents/assumption-auditor.md"
    - "agents/reviewer.md"
    - "agents/editor.md"
decisions:
  - "Adopted Write tool on all four agents (overrides STACK.md read-only suggestion) per ARCHITECTURE.md filesystem-IPC fan-in invariant"
  - "Model assignment matches dispatch-api.cjs convention: opus for audience-inferrer + editor; sonnet for reviewer + assumption-auditor"
  - "maxTurns: 3 for one-shot critique/audit roles; 5 for editor (multi-pass redraft + voice-conflict flagging)"
metrics:
  duration: "~2 min"
  completed: "2026-04-15"
  tasks_completed: 1
  files_modified: 4
---

# Phase 1 Plan 02: Agent Frontmatter Migration Summary

Migrated all four tumble-dry subagents (`audience-inferrer`, `assumption-auditor`, `reviewer`, `editor`) to the current Claude Code plugin-shipped subagent frontmatter spec — dropped wrong `tumble-dry-` namespace prefix, added `model`/`tools`/`maxTurns` fields per STACK.md, verified no forbidden fields (`hooks`/`mcpServers`/`permissionMode`) present.

## What Changed

Each agent's YAML frontmatter block was rewritten; markdown body content unchanged byte-for-byte.

| Agent | Old name | New name | model | tools | maxTurns |
|-------|----------|----------|-------|-------|----------|
| audience-inferrer | tumble-dry-audience-inferrer | audience-inferrer | opus | Read, Write | 3 |
| assumption-auditor | tumble-dry-assumption-auditor | assumption-auditor | sonnet | Read, Write | 3 |
| reviewer | tumble-dry-reviewer | reviewer | sonnet | Read, Write | 3 |
| editor | tumble-dry-editor | editor | opus | Read, Write | 5 |

## Why

Without dropping the prefix, plugin namespace auto-prefixing produces double-prefix subagent IDs (`tumble-dry:tumble-dry-audience-inferrer`), which causes slash-command Task fanout to silently invoke a generic helpful-LLM with no persona context — Pitfall 2 ("subagent spec drift" → false convergence on homogeneous panel).

## Commits

| Commit | File |
|--------|------|
| 599f189 | agents/audience-inferrer.md |
| 6f954d7 | agents/assumption-auditor.md |
| d334810 | agents/reviewer.md |
| 8db15b3 | agents/editor.md |

## Acceptance Criteria

- [x] All four agents have `name` without `tumble-dry-` prefix
- [x] All four agents declare `model:` matching dispatch-api.cjs convention
- [x] All four agents declare `tools: Read, Write`
- [x] All four agents declare `maxTurns:` (3 or 5)
- [x] No agent contains `hooks`, `mcpServers`, or `permissionMode` keys
- [x] Body content unchanged (git diff stat: 4 files, +16/-4 — frontmatter-only delta)
- [x] Plan automated verification script returned exit 0 (0 failures)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- agents/audience-inferrer.md: FOUND, commit 599f189 FOUND
- agents/assumption-auditor.md: FOUND, commit 6f954d7 FOUND
- agents/reviewer.md: FOUND, commit d334810 FOUND
- agents/editor.md: FOUND, commit 8db15b3 FOUND
