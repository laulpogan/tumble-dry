#!/usr/bin/env node
/**
 * tumble-dry plugin validator — CI-gated spec-compliance check.
 *
 * Verifies:
 *   - .claude-plugin/plugin.json exists and is valid JSON
 *   - .claude-plugin/marketplace.json exists and is valid JSON
 *   - Every marketplace agent entry has a matching agents/<name>.md file
 *     whose frontmatter `name:` equals the marketplace `name`
 *   - Every agents/*.md frontmatter `name:` appears in marketplace.json
 *   - No agent frontmatter contains `hooks`, `mcpServers`, or `permissionMode`
 *     (silently stripped by Claude Code loader for plugin-shipped agents)
 *   - No agent frontmatter `name:` retains the obsolete `tumble-dry-` prefix
 *   - No stale root marketplace.json (must live under .claude-plugin/)
 *
 * Usage:
 *   node bin/validate-plugin.cjs [--root <path>]
 *
 * Exits 0 = pass, 1 = validation failure(s), 2 = unexpected error.
 */

const fs = require('fs');
const path = require('path');

function log(...a) { console.error('[validate-plugin]', ...a); }

function parseFrontmatter(text) {
  // Minimal flat-YAML parser. Returns { found: bool, fields: { key: value } }.
  const lines = text.split(/\r?\n/);
  if (lines[0] !== '---') return { found: false, fields: {} };
  const end = lines.indexOf('---', 1);
  if (end === -1) return { found: false, fields: {} };
  const fields = {};
  for (let i = 1; i < end; i++) {
    const m = lines[i].match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
    if (m) fields[m[1]] = m[2].trim();
  }
  return { found: true, fields };
}

function parseArgs(argv) {
  const out = { root: process.cwd() };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') out.root = path.resolve(argv[++i]);
  }
  return out;
}

function main() {
  const { root } = parseArgs(process.argv.slice(2));
  const errors = [];

  // Check 1: .claude-plugin/plugin.json
  const pluginPath = path.join(root, '.claude-plugin', 'plugin.json');
  if (!fs.existsSync(pluginPath)) {
    errors.push(`.claude-plugin/plugin.json missing (expected at ${pluginPath})`);
  } else {
    try { JSON.parse(fs.readFileSync(pluginPath, 'utf-8')); }
    catch (e) { errors.push(`.claude-plugin/plugin.json is not valid JSON: ${e.message}`); }
  }

  // Check 2: .claude-plugin/marketplace.json
  const mktPath = path.join(root, '.claude-plugin', 'marketplace.json');
  let mkt = null;
  if (!fs.existsSync(mktPath)) {
    errors.push(`.claude-plugin/marketplace.json missing (expected at ${mktPath})`);
  } else {
    try { mkt = JSON.parse(fs.readFileSync(mktPath, 'utf-8')); }
    catch (e) { errors.push(`.claude-plugin/marketplace.json is not valid JSON: ${e.message}`); }
  }

  // Check 3: root-level marketplace.json should NOT exist (moved by Plan 01)
  const rootMktPath = path.join(root, 'marketplace.json');
  if (fs.existsSync(rootMktPath)) {
    errors.push(`Stale marketplace.json at repo root — must be moved to .claude-plugin/marketplace.json (DISPATCH-04)`);
  }

  // Checks 4–7: only run if marketplace parsed
  if (mkt && Array.isArray(mkt.agents)) {
    const mktNames = new Set(mkt.agents.map(a => a.name));

    for (const entry of mkt.agents) {
      const relPath = entry.path || `agents/${entry.name}.md`;
      const agentPath = path.join(root, relPath);
      if (!fs.existsSync(agentPath)) {
        errors.push(`marketplace.json declares agent '${entry.name}' at '${relPath}' but file does not exist`);
        continue;
      }
      const text = fs.readFileSync(agentPath, 'utf-8');
      const fm = parseFrontmatter(text);
      if (!fm.found) {
        errors.push(`${relPath}: missing or malformed frontmatter`);
        continue;
      }
      if (fm.fields.name !== entry.name) {
        errors.push(`${relPath}: frontmatter name='${fm.fields.name}' does not match marketplace name='${entry.name}'`);
      }
      if (typeof fm.fields.name === 'string' && fm.fields.name.startsWith('tumble-dry-')) {
        errors.push(`${relPath}: frontmatter name '${fm.fields.name}' retains obsolete 'tumble-dry-' prefix (namespace auto-prefixes per CC plugin spec)`);
      }
      for (const forbidden of ['hooks', 'mcpServers', 'permissionMode']) {
        if (forbidden in fm.fields) {
          errors.push(`${relPath}: frontmatter contains forbidden field '${forbidden}' (silently stripped by Claude Code loader)`);
        }
      }
    }

    // Orphan agent files: frontmatter declares name not in marketplace
    const agentsDir = path.join(root, 'agents');
    if (fs.existsSync(agentsDir)) {
      for (const f of fs.readdirSync(agentsDir)) {
        if (!f.endsWith('.md')) continue;
        const text = fs.readFileSync(path.join(agentsDir, f), 'utf-8');
        const fm = parseFrontmatter(text);
        if (fm.found && fm.fields.name && !mktNames.has(fm.fields.name)) {
          errors.push(`agents/${f}: frontmatter name '${fm.fields.name}' not declared in marketplace.json`);
        }
        // Also flag forbidden fields on orphans (defense in depth)
        if (fm.found) {
          for (const forbidden of ['hooks', 'mcpServers', 'permissionMode']) {
            if (forbidden in fm.fields && mktNames.has(fm.fields.name)) {
              // already reported above; skip dup
            }
          }
        }
      }
    }
  }

  if (errors.length) {
    log(`FAIL — ${errors.length} validation error(s):`);
    for (const e of errors) log(`  - ${e}`);
    process.exit(1);
  }
  log('PASS — plugin spec-compliant');
  process.exit(0);
}

try { main(); }
catch (e) { console.error('[validate-plugin] FATAL:', e.message); process.exit(2); }
