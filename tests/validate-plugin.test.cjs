/**
 * Smoke tests for bin/validate-plugin.cjs.
 *
 * Each test copies the real .claude-plugin/ + agents/ into a tmp-dir fixture,
 * mutates one thing, and asserts the validator catches it. Real repo files
 * are never touched.
 *
 * Run: node --test tests/validate-plugin.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const VALIDATOR = path.resolve(__dirname, '..', 'bin', 'validate-plugin.cjs');
const REAL_ROOT = path.resolve(__dirname, '..');

function makeFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'td-validate-'));
  fs.mkdirSync(path.join(dir, '.claude-plugin'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'agents'), { recursive: true });
  fs.copyFileSync(
    path.join(REAL_ROOT, '.claude-plugin', 'plugin.json'),
    path.join(dir, '.claude-plugin', 'plugin.json')
  );
  fs.copyFileSync(
    path.join(REAL_ROOT, '.claude-plugin', 'marketplace.json'),
    path.join(dir, '.claude-plugin', 'marketplace.json')
  );
  for (const f of fs.readdirSync(path.join(REAL_ROOT, 'agents'))) {
    if (f.endsWith('.md')) {
      fs.copyFileSync(
        path.join(REAL_ROOT, 'agents', f),
        path.join(dir, 'agents', f)
      );
    }
  }
  return dir;
}

function runValidator(root) {
  const r = spawnSync('node', [VALIDATOR, '--root', root], { encoding: 'utf-8' });
  return { code: r.status, stderr: r.stderr, stdout: r.stdout };
}

test('passes on real repo state', () => {
  const r = runValidator(REAL_ROOT);
  assert.strictEqual(r.code, 0, `expected exit 0, got ${r.code}\n${r.stderr}`);
});

test('fails when plugin.json missing', () => {
  const dir = makeFixture();
  fs.unlinkSync(path.join(dir, '.claude-plugin', 'plugin.json'));
  const r = runValidator(dir);
  assert.strictEqual(r.code, 1);
  assert.match(r.stderr, /plugin\.json missing/);
});

test('fails when marketplace.json missing', () => {
  const dir = makeFixture();
  fs.unlinkSync(path.join(dir, '.claude-plugin', 'marketplace.json'));
  const r = runValidator(dir);
  assert.strictEqual(r.code, 1);
  assert.match(r.stderr, /marketplace\.json missing/);
});

test('fails when root marketplace.json present (stale)', () => {
  const dir = makeFixture();
  fs.writeFileSync(path.join(dir, 'marketplace.json'), '{}');
  const r = runValidator(dir);
  assert.strictEqual(r.code, 1);
  assert.match(r.stderr, /Stale marketplace\.json at repo root/);
});

test('fails when agent name uses obsolete tumble-dry- prefix', () => {
  const dir = makeFixture();
  const p = path.join(dir, 'agents', 'reviewer.md');
  const text = fs.readFileSync(p, 'utf-8');
  fs.writeFileSync(p, text.replace(/^name: reviewer$/m, 'name: tumble-dry-reviewer'));
  // Update marketplace too so name-parity passes and we hit the prefix check.
  const mktPath = path.join(dir, '.claude-plugin', 'marketplace.json');
  const mkt = JSON.parse(fs.readFileSync(mktPath, 'utf-8'));
  for (const a of mkt.agents) if (a.name === 'reviewer') a.name = 'tumble-dry-reviewer';
  fs.writeFileSync(mktPath, JSON.stringify(mkt, null, 2));
  const r = runValidator(dir);
  assert.strictEqual(r.code, 1);
  assert.match(r.stderr, /tumble-dry-/);
});

test('fails on forbidden frontmatter field (hooks)', () => {
  const dir = makeFixture();
  const p = path.join(dir, 'agents', 'editor.md');
  const text = fs.readFileSync(p, 'utf-8');
  fs.writeFileSync(p, text.replace(/^---\n/, '---\nhooks: PostToolUse\n'));
  const r = runValidator(dir);
  assert.strictEqual(r.code, 1);
  assert.match(r.stderr, /forbidden field 'hooks'/);
});

test('fails on agent name mismatch between marketplace and frontmatter', () => {
  const dir = makeFixture();
  const mktPath = path.join(dir, '.claude-plugin', 'marketplace.json');
  const mkt = JSON.parse(fs.readFileSync(mktPath, 'utf-8'));
  for (const a of mkt.agents) if (a.name === 'reviewer') a.name = 'critic';
  fs.writeFileSync(mktPath, JSON.stringify(mkt, null, 2));
  const r = runValidator(dir);
  assert.strictEqual(r.code, 1);
  assert.match(r.stderr, /does not match marketplace name='critic'|not declared in marketplace/);
});
