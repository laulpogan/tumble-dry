/**
 * Dispatch backend — direct Anthropic API only.
 *
 * Historical note: this used to support a `gastown` polecat backend (each
 * agent in its own tmux + Claude Code context). That path was removed in
 * v0.4.2 — gastown was slow, fragile, and required infrastructure most users
 * don't have. The Claude Code-native dispatch (Task subagents in your active
 * session) is now driven by the /tumble-dry slash command, NOT this file.
 *
 * This file remains as the headless / CI / scripting path. It requires
 * ANTHROPIC_API_KEY. If you don't have one, use the /tumble-dry slash command
 * inside Claude Code instead — it inherits your session auth.
 */

const api = require('./dispatch-api.cjs');

function selectBackend(/* config */) {
  // Only one backend now. Kept as a function for API stability.
  return 'api';
}

/**
 * Generic wave dispatch. Records: [{ name, briefFile, targetFilename }].
 * Returns [{ name, target, error? }].
 */
async function dispatchWave({ records, roundDir /*, config */ }) {
  const out = await api.dispatchBatch({ records, roundDir });
  return out.map(r => ({
    name: r.record.name,
    target: r.target,
    error: r.error,
    usage: r.usage,
  }));
}

module.exports = { selectBackend, dispatchWave };
