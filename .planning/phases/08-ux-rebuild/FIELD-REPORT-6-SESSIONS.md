# Field Report: 6 Failed Sessions

**Date:** 2026-04-15
**Reporter:** PM dogfood on slancha-website (17 marketing + business docs)
**Version:** tumble-dry v0.8.0, Claude Code v2.1.109→v2.1.110

## Ship-blockers found

1. **Plugin discovery broken.** Plugin installed at ~/.claude/plugins/tumble-dry/, validate-plugin.cjs passes, but CC doesn't load it. /tumble-dry not in skill list. Agents not in subagent registry. Silent failure. Zero diagnostics.

2. **No fallback when plugin dispatch fails.** Orchestrator assumes Agent(subagent_type="orchestrator") works. When it doesn't, product is bricked.

3. **Headless CLI needs ANTHROPIC_API_KEY.** Both paths broken simultaneously for CC Max subscribers.

## Root cause

The entire v0.5.0→v0.8.0 architecture was built on an assumption that never held: that Claude Code would auto-discover plugin-shipped agents via `.claude-plugin/marketplace.json`. Real Claude Code (v2.1.109+) does NOT auto-discover plugins from arbitrary directories. The `subagent_type="orchestrator"` dispatch fails silently because CC's agent registry doesn't contain it.

## Fix: excise API key, run in-harness only

Per user directive: remove all Anthropic API dispatch code. Product runs entirely through Claude Code session auth. Agent dispatch uses plain `Agent(prompt="<embedded system prompt + brief>")` with no custom subagent_type — CC always supports general-purpose Agent() calls.

Slash command needs to be installed where CC actually discovers commands — either project-local `.claude/commands/tumble-dry.md` or user-global `~/.claude/commands/tumble-dry.md`. Not in a plugin directory that CC ignores.
