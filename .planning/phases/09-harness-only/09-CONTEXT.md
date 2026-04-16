# Phase 9: HARNESS-ONLY — Context

**Mode:** Ship-blocker fix from 6-session field report

<domain>
## Phase Boundary

Excise all Anthropic API key logic. Product runs ONLY through Claude Code session harness. Agent dispatch uses plain `Agent(prompt=...)` with no custom subagent_type registration.

Kill: lib/dispatch-api.cjs, lib/dispatch.cjs, bin/tumble-dry-loop.cjs (API dispatch path).
Keep: bin/tumble-dry.cjs (data-plane CLI — init, brief-*, aggregate, drift, finalize).
Rewrite: commands/tumble-dry.md to dispatch agents via plain Agent() calls embedding the agent system prompt inline.
Install: provide `install.sh` that symlinks commands/tumble-dry.md → ~/.claude/commands/tumble-dry.md (where CC discovers it).
</domain>

<decisions>
- NO custom subagent_type. Agent(prompt=...) is the only dispatch primitive. CC always supports it.
- Agent system prompts (reviewer.md, editor.md, etc.) are READ at dispatch time and embedded in the Agent() prompt parameter. No plugin registry dependency.
- Slash command becomes the ONLY entry point. Headless CLI becomes a thin wrapper that says "use /tumble-dry in Claude Code."
- install.sh handles: symlink commands/ → ~/.claude/commands/, symlink agents/ → ~/.claude/agents/ (if CC agents dir discovery works), or just document manual setup.
</decisions>
