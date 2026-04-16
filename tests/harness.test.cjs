#!/usr/bin/env node
/**
 * Phase 9 / HARNESS-ONLY: verify all API dispatch code has been excised.
 *
 * Run: node --test tests/harness.test.cjs
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function scanDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.cjs') || f.endsWith('.js') || f.endsWith('.md'))
    .map(f => path.join(dir, f));
}

const LIB_FILES = scanDir(path.join(ROOT, 'lib'));
const BIN_FILES = scanDir(path.join(ROOT, 'bin'));
const CMD_FILES = scanDir(path.join(ROOT, 'commands'));
const ALL_FILES = [...LIB_FILES, ...BIN_FILES, ...CMD_FILES];

test('no file in lib/ or bin/ contains ANTHROPIC_API_KEY', () => {
  for (const f of [...LIB_FILES, ...BIN_FILES]) {
    const content = fs.readFileSync(f, 'utf-8');
    assert.ok(
      !content.includes('ANTHROPIC_API_KEY'),
      `${path.relative(ROOT, f)} still references ANTHROPIC_API_KEY`
    );
  }
});

test('no file in lib/ or bin/ requires dispatch-api', () => {
  for (const f of [...LIB_FILES, ...BIN_FILES]) {
    const content = fs.readFileSync(f, 'utf-8');
    assert.ok(
      !content.includes('dispatch-api'),
      `${path.relative(ROOT, f)} still references dispatch-api`
    );
  }
});

test('no file in lib/ or bin/ requires dispatch.cjs', () => {
  for (const f of [...LIB_FILES, ...BIN_FILES]) {
    const content = fs.readFileSync(f, 'utf-8');
    // Match require('...dispatch.cjs') but not substring like 'dispatch.cjs was removed'
    const hasRequire = /require\([^)]*dispatch\.cjs/.test(content);
    assert.ok(
      !hasRequire,
      `${path.relative(ROOT, f)} still requires dispatch.cjs`
    );
  }
});

test('lib/dispatch-api.cjs does not exist', () => {
  assert.ok(!fs.existsSync(path.join(ROOT, 'lib', 'dispatch-api.cjs')));
});

test('lib/dispatch.cjs does not exist', () => {
  assert.ok(!fs.existsSync(path.join(ROOT, 'lib', 'dispatch.cjs')));
});

test('.claude-plugin/ directory does not exist', () => {
  assert.ok(!fs.existsSync(path.join(ROOT, '.claude-plugin')));
});

test('commands/tumble-dry.md contains no subagent_type references', () => {
  const cmd = fs.readFileSync(path.join(ROOT, 'commands', 'tumble-dry.md'), 'utf-8');
  assert.ok(!cmd.includes('subagent_type'), 'slash command still references subagent_type');
});

test('commands/tumble-dry.md contains Agent(description= dispatch calls', () => {
  const cmd = fs.readFileSync(path.join(ROOT, 'commands', 'tumble-dry.md'), 'utf-8');
  assert.ok(cmd.includes('Agent(description='), 'slash command missing Agent(description=...) calls');
});

test('install.sh exists and is executable', () => {
  const p = path.join(ROOT, 'install.sh');
  assert.ok(fs.existsSync(p), 'install.sh missing');
  const stat = fs.statSync(p);
  assert.ok(stat.mode & 0o111, 'install.sh not executable');
});

test('VERSION is 0.9.0', () => {
  const v = fs.readFileSync(path.join(ROOT, 'VERSION'), 'utf-8').trim();
  assert.equal(v, '0.9.0');
});

test('README.md mentions no API keys', () => {
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf-8');
  assert.ok(!readme.includes('ANTHROPIC_API_KEY'), 'README still mentions ANTHROPIC_API_KEY');
  assert.ok(!readme.includes('sk-ant-'), 'README still contains example API key');
});
