#!/usr/bin/env node
/**
 * tumble-dry headless loop — REMOVED in v0.9.0.
 *
 * The Anthropic API dispatch path has been excised. tumble-dry now runs
 * entirely through the Claude Code session harness via /tumble-dry.
 *
 * For CI/scripting, invoke Claude Code in prompt mode:
 *   claude -p '/tumble-dry <artifact>'
 */

console.error('tumble-dry headless loop has been removed (v0.9.0).');
console.error('Use /tumble-dry inside Claude Code.');
console.error('');
console.error('For CI/scripting, invoke: claude -p \'/tumble-dry <artifact>\'');
process.exit(1);
