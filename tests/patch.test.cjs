#!/usr/bin/env node
/**
 * COMP-01..02: patch generation tests.
 *
 * Run: node --test tests/patch.test.cjs
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const { generatePatch, writePatch, findBestMatch } = require(path.join(ROOT, 'lib/patch.cjs'));

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'td-patch-'));
}

test('generatePatch produces unified diff for different markdown files', () => {
  const dir = tmpDir();
  const source = path.join(dir, 'source.md');
  const final = path.join(dir, 'final.md');

  fs.writeFileSync(source, '# Hello World\n\nThis is the original text.\n');
  fs.writeFileSync(final, '# Hello World\n\nThis is the polished text with improvements.\n');

  const diff = generatePatch(source, final);
  assert.ok(diff.includes('---'), 'Should have --- header');
  assert.ok(diff.includes('+++'), 'Should have +++ header');
  assert.ok(diff.includes('original text'), 'Should show removed text');
  assert.ok(diff.includes('polished text'), 'Should show added text');
});

test('generatePatch returns empty for identical files', () => {
  const dir = tmpDir();
  const source = path.join(dir, 'source.md');
  const final = path.join(dir, 'final.md');
  const content = '# Same\n\nIdentical content.\n';

  fs.writeFileSync(source, content);
  fs.writeFileSync(final, content);

  const diff = generatePatch(source, final);
  assert.equal(diff.trim(), '');
});

test('writePatch creates PATCH.diff in run directory', () => {
  const dir = tmpDir();
  const source = path.join(dir, 'source.md');
  const final = path.join(dir, 'FINAL.md');

  fs.writeFileSync(source, '# Before\n\nOld text here.\n');
  fs.writeFileSync(final, '# After\n\nNew text here.\n');

  const patchPath = writePatch(dir, source, final);
  assert.ok(fs.existsSync(patchPath));
  assert.equal(path.basename(patchPath), 'PATCH.diff');

  const content = fs.readFileSync(patchPath, 'utf-8');
  assert.ok(content.length > 0);
});

test('findBestMatch returns null for no match', () => {
  const result = findBestMatch('completely unique text', ['unrelated line one', 'another unrelated line']);
  assert.equal(result, null);
});

test('findBestMatch finds similar line', () => {
  const result = findBestMatch(
    'our product helps teams collaborate better',
    ['Our product helps teams collaborate effectively and efficiently.', 'Something else entirely.']
  );
  assert.ok(result != null);
  assert.ok(result.includes('collaborate'));
});
