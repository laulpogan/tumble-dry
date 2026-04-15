# Phase 8: UX REBUILD (v0.8.0) - Context

**Mode:** Auto-generated from PM feedback

<domain>
Single-phase milestone with 6 clusters: HEADLESS, BATCH, STATUS, DRYRUN, CANARY, SKILL + REVERSAL + RELEASE. Architectural pivot away from "slash IS the orchestrator" (Phase 1 decision).
</domain>

<decisions>
- New agent: `agents/orchestrator.md` (or `tumble-dry-orchestrator`). Frontmatter: `tools: [Read, Write, Bash, Task, Glob, Grep]`, `model: claude-opus-4-6` (orchestration is high-leverage), `maxTurns: 50` (enough for several rounds × multiple files).
- Slash command shrinks dramatically: parse args, dispatch orchestrator, poll status.json, render single line per round, cat REPORT.md when done. ~50 lines.
- Status surface: `.tumble-dry/<slug>/status.json` updated by orchestrator after each phase boundary (audience done, audit done, reviewers done, aggregate done, editor done). Slash command polls between rounds.
- Per-round REPORT.md: 1 paragraph + top-3 material + drift snapshot. Final REPORT.md rolls them up.
- Batch: glob expansion in slash command + bin/tumble-dry.cjs::init accepts directory or glob → creates batch run dir with per-file subdirs. Audience inferred ONCE from concatenated first-N-chars of each file; auditor + reviewers + editor per-file.
- Status: new `bin/tumble-dry.cjs status` subcommand walks .tumble-dry/, reads status.json + aggregate.json per run, prints table.
- Resume: new `bin/tumble-dry.cjs resume <slug>` reads last status.json, dispatches orchestrator with --resume-from-round N.
- Dry-run: `--dry-run` flag short-circuits after audit, prints estimate (token count × current model price from a built-in price table for opus/sonnet).
- Canary: when no .tumble-dry.yml, run `git log --author "$(git config user.name)" --pretty=format:%H -n 50 -- '*.md'` to find prose-authored files; sample N excerpts as voice_refs. If git/no commits, fall back to source-self-sampling (already implemented).
- Skill registration: marketplace.json `skills:` array with `{ name: tumble-dry, description, command: tumble-dry, argument-hint }`.
- Reversal: append addendum to .planning/research/ARCHITECTURE.md acknowledging the pivot.
</decisions>

<code_context>
- bin/tumble-dry.cjs is the data-plane CLI; extending it for status/resume/dry-run is natural.
- agents/ already has 4 agent specs + editor-code.md from v0.6. Add orchestrator.md + ensure plugin validator accepts it.
- .claude-plugin/marketplace.json declares agents + commands; needs skills entry.
- lib/run-state.cjs initRun handles per-file slug; need batchRun for directory/glob.
- All existing tests must still pass.
</code_context>
