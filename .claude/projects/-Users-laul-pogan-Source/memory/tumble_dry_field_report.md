---
name: tumble-dry field report
description: Critical dogfood failure — plugin discovery broken, API key path must be excised, all dispatch must run in CC harness
type: project
---

tumble-dry v0.5.0→v0.8.0 architecture built on wrong assumption: that CC auto-discovers plugin-shipped agents via .claude-plugin/marketplace.json. Real CC (v2.1.109+) does NOT. User ran 6 sessions, hit same wall every time — product bricked.

**Why:** CC plugins are not auto-discoverable from arbitrary dirs. Custom subagent_type names from plugin manifests don't register in CC's agent type system. The entire Agent(subagent_type="orchestrator") / Agent(subagent_type="reviewer") path was DOA.

**How to apply:** Never build tumble-dry dispatch on custom subagent_type. Use plain Agent(prompt=...) only — CC always supports it. Agent system prompts are read from disk at dispatch time and embedded inline. No plugin registry dependency. All Anthropic API key code paths excised per user directive — product is CC-harness-only.
