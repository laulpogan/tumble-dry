#!/usr/bin/env node
/**
 * Phase 8 / BATCH-01..05: batch-run-state + glob expansion tests.
 *
 * Run: node --test tests/batch.test.cjs
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const { initBatch } = require(path.join(ROOT, 'lib/run-state.cjs'));
const { expandInputs, globToRegex } = require(path.join(ROOT, 'lib/glob-expand.cjs'));

function tmpdir(prefix = 'td-batch-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test('globToRegex matches simple star pattern', () => {
  const re = globToRegex('*.md');
  assert.ok(re.test('a.md'));
  assert.ok(re.test('readme.md'));
  assert.ok(!re.test('a.txt'));
  assert.ok(!re.test('docs/a.md'), 'single * does not cross /');
});

test('globToRegex handles double-star', () => {
  const re = globToRegex('**/*.md');
  assert.ok(re.test('a.md'));
  assert.ok(re.test('docs/a.md'));
  assert.ok(re.test('a/b/c.md'));
  assert.ok(!re.test('a.txt'));
});

test('globToRegex handles brace expansion', () => {
  const re = globToRegex('*.{md,txt}');
  assert.ok(re.test('a.md'));
  assert.ok(re.test('a.txt'));
  assert.ok(!re.test('a.js'));
});

test('expandInputs with directory returns all artifact files recursively', () => {
  const dir = tmpdir();
  fs.writeFileSync(path.join(dir, 'a.md'), '# a');
  fs.mkdirSync(path.join(dir, 'sub'));
  fs.writeFileSync(path.join(dir, 'sub', 'b.md'), '# b');
  fs.writeFileSync(path.join(dir, 'sub', 'c.txt'), 'c');
  fs.writeFileSync(path.join(dir, 'sub', 'ignore.log'), 'no');
  const files = expandInputs(dir, [dir]);
  assert.equal(files.length, 3, 'returns md+txt, skips .log');
  assert.ok(files.some(f => f.endsWith('a.md')));
  assert.ok(files.some(f => f.endsWith('b.md')));
  assert.ok(files.some(f => f.endsWith('c.txt')));
});

test('expandInputs with glob matches only markdown', () => {
  const dir = tmpdir();
  fs.writeFileSync(path.join(dir, 'a.md'), '# a');
  fs.writeFileSync(path.join(dir, 'b.txt'), 'b');
  const files = expandInputs(dir, ['*.md']);
  assert.equal(files.length, 1);
  assert.ok(files[0].endsWith('a.md'));
});

test('expandInputs dedupes when paths overlap', () => {
  const dir = tmpdir();
  fs.writeFileSync(path.join(dir, 'a.md'), '# a');
  const files = expandInputs(dir, ['*.md', 'a.md', dir]);
  assert.equal(files.length, 1);
});

test('expandInputs skips node_modules, .git, .tumble-dry', () => {
  const dir = tmpdir();
  for (const d of ['node_modules', '.git', '.tumble-dry']) {
    fs.mkdirSync(path.join(dir, d));
    fs.writeFileSync(path.join(dir, d, 'trash.md'), '# no');
  }
  fs.writeFileSync(path.join(dir, 'keep.md'), '# yes');
  const files = expandInputs(dir, [dir]);
  assert.equal(files.length, 1);
  assert.ok(files[0].endsWith('keep.md'));
});

test('initBatch creates per-file subdirs under a batch dir', async () => {
  const dir = tmpdir();
  fs.writeFileSync(path.join(dir, 'a.md'), '# hello\n\na paragraph.');
  fs.writeFileSync(path.join(dir, 'b.md'), '# world\n\nanother.');
  const batch = await initBatch(dir, [path.join(dir, 'a.md'), path.join(dir, 'b.md')]);
  assert.equal(batch.kind, 'batch');
  assert.equal(batch.fileRuns.length, 2);
  for (const fr of batch.fileRuns) {
    assert.ok(fs.existsSync(fr.runDir), 'run dir exists');
    assert.ok(fs.existsSync(fr.artifactAbs), 'working.md exists');
    assert.ok(fs.existsSync(path.join(fr.runDir, 'artifact.path')), 'artifact.path written');
    assert.ok(fs.existsSync(path.join(fr.runDir, 'source.path')), 'source.path written');
    assert.ok(fs.existsSync(path.join(fr.runDir, 'source-format.json')), 'source-format.json written');
    assert.ok(fs.existsSync(path.join(fr.runDir, 'history', 'round-0-original.md')), 'history snapshot');
  }
  assert.ok(fs.existsSync(path.join(batch.batchDir, 'batch.json')), 'batch manifest written');
  const manifest = JSON.parse(fs.readFileSync(path.join(batch.batchDir, 'batch.json'), 'utf-8'));
  assert.equal(manifest.files.length, 2);
});

test('initBatch derives batch slug from common parent directory name', async () => {
  const dir = tmpdir();
  const sub = path.join(dir, 'site-copy');
  fs.mkdirSync(sub);
  fs.writeFileSync(path.join(sub, 'home.md'), '# home');
  fs.writeFileSync(path.join(sub, 'about.md'), '# about');
  const batch = await initBatch(dir, [path.join(sub, 'home.md'), path.join(sub, 'about.md')]);
  assert.match(batch.batchSlug, /^site-copy-\d{8}-\d{4}$/);
});
