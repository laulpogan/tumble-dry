#!/usr/bin/env node
/**
 * Smoke tests for FORMAT-01..07 (v0.5.2 office-format ingestion).
 *
 * Runs standalone: `node tests/format.test.cjs`
 * Covers:
 *   - FORMAT-01: dispatcher resolves loader per extension
 *   - FORMAT-01a: typed-result contract ({ok:true,...} | {ok:false,reason,detail})
 *   - FORMAT-03: source preserved at history/round-0-original.<ext>
 *   - FORMAT-04: ROUNDTRIP_WARNING.md emitted before round 1 for non-md
 *   - FORMAT-05: optional deps — loader degrades gracefully when absent
 *   - FORMAT-06: encrypted / too_large / unsupported fail-mode branches
 *   - FORMAT-07: BOM stripped, CJK preserved, emoji preserved
 *
 * Binary-format fixtures (docx/pptx/xlsx/pdf) are not shipped; tests check
 * that loaders return typed errors when fixtures are absent, and touch the
 * real libraries only when fixtures exist (see tests/fixtures/format/README.md).
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
const FIXTURES = path.join(__dirname, 'fixtures', 'format');

const loader = require(path.join(ROOT, 'lib/loader.cjs'));
const { initRun } = require(path.join(ROOT, 'lib/run-state.cjs'));

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
function tmpdir(prefix = 'td-format-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// ---------- FORMAT-01: dispatcher ----------
test('FORMAT-01: dispatcher resolves markdown loader for .md', () => {
  const mod = loader.detect(path.join(FIXTURES, 'sample.md'));
  assert.ok(mod, 'detect() returned null');
  assert.ok(mod.extensions.includes('.md'));
});

test('FORMAT-01: dispatcher returns null for totally unknown extension (pandoc absent or declined)', () => {
  // .xyz ext — neither a primary loader nor likely pandoc-mapped
  const mod = loader.detect('/tmp/does-not-exist.xyz-bogus-ext');
  // If pandoc is installed it may still claim this — just assert no throw.
  assert.ok(mod === null || typeof mod.load === 'function');
});

// ---------- FORMAT-01a: typed-result contract ----------
test('FORMAT-01a: markdown loader returns {ok:true, markdown, format, warnings}', async () => {
  const r = await loader.loadAsync(path.join(FIXTURES, 'sample.md'));
  assert.equal(r.ok, true);
  assert.equal(r.format, 'markdown');
  assert.ok(Array.isArray(r.warnings));
  assert.match(r.markdown, /Sample markdown fixture/);
});

test('FORMAT-01a: missing file returns {ok:false, reason:"corrupt"}', async () => {
  const r = await loader.loadAsync('/tmp/absolutely-not-a-file-' + Date.now() + '.md');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'corrupt');
});

// ---------- FORMAT-07: encoding ----------
test('FORMAT-07: BOM stripped from markdown', async () => {
  const r = await loader.loadAsync(path.join(FIXTURES, 'bom.md'));
  assert.equal(r.ok, true);
  assert.notEqual(r.markdown.charCodeAt(0), 0xfeff, 'BOM was not stripped');
  assert.ok(r.warnings.some(w => /BOM/i.test(w)), 'no BOM warning emitted');
});

test('FORMAT-07: CJK bytes preserved in .txt', async () => {
  const r = await loader.loadAsync(path.join(FIXTURES, 'cjk.txt'));
  assert.equal(r.ok, true);
  assert.equal(r.format, 'txt');
  assert.match(r.markdown, /日本語/);
  assert.match(r.markdown, /中文/);
  assert.match(r.markdown, /한국어/);
});

test('FORMAT-07: emoji preserved including ZWJ sequences', async () => {
  const r = await loader.loadAsync(path.join(FIXTURES, 'emoji.md'));
  assert.equal(r.ok, true);
  assert.match(r.markdown, /🚀/);
  assert.match(r.markdown, /👨‍👩‍👧/); // ZWJ family
});

// ---------- FORMAT-06: fail-mode branches (synthetic) ----------
test('FORMAT-06: too_large branch via synthetic oversized file', async () => {
  const d = tmpdir();
  const p = path.join(d, 'big.md');
  // Write 21MB of plain text.
  const chunk = 'x'.repeat(1024 * 1024); // 1MB
  const fd = fs.openSync(p, 'w');
  for (let i = 0; i < 21; i++) fs.writeSync(fd, chunk);
  fs.closeSync(fd);
  const r = await loader.loadAsync(p);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'too_large');
});

test('FORMAT-06: empty branch on whitespace-only file', async () => {
  const d = tmpdir();
  const p = path.join(d, 'empty.md');
  fs.writeFileSync(p, '   \n\n   ');
  const r = await loader.loadAsync(p);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'empty');
});

test('FORMAT-06: unsupported branch via extension not owned by any loader', async () => {
  const d = tmpdir();
  const p = path.join(d, 'weird.zzznosuch');
  fs.writeFileSync(p, 'some bytes');
  const r = await loader.loadAsync(p);
  // Either "unsupported" (no loader) OR pandoc takes it and then fails with corrupt.
  assert.equal(r.ok, false);
  assert.ok(['unsupported', 'corrupt'].includes(r.reason), `unexpected reason: ${r.reason}`);
});

// ---------- FORMAT-06: mock encrypted/too_large via mock loader ----------
test('FORMAT-06: mock loader {ok:false, reason:"encrypted"} propagates verbatim', async () => {
  // The dispatcher just returns whatever the matched module's load() returns.
  const mockMod = {
    extensions: ['.mockenc'],
    detect: (p) => p.endsWith('.mockenc'),
    load: () => ({ ok: false, reason: 'encrypted', detail: 'fake password' }),
    priority: 5,
  };
  const baseline = loader.MODULES.slice();
  loader.MODULES.unshift(mockMod);
  try {
    const d = tmpdir();
    const p = path.join(d, 'doc.mockenc');
    fs.writeFileSync(p, 'stub');
    const r = await loader.loadAsync(p);
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'encrypted');
    assert.match(r.detail, /fake password/);
  } finally {
    loader.MODULES.length = 0;
    baseline.forEach(m => loader.MODULES.push(m));
  }
});

// ---------- FORMAT-03/04: initRun round-trip ----------
test('FORMAT-03: markdown initRun preserves source at history/round-0-original.md', async () => {
  const d = tmpdir();
  fs.copyFileSync(path.join(FIXTURES, 'sample.md'), path.join(d, 'sample.md'));
  const { runDir } = await initRun(d, 'sample.md');
  assert.ok(fs.existsSync(path.join(runDir, 'history', 'round-0-original.md')));
  assert.ok(fs.existsSync(path.join(runDir, 'working.md')));
  assert.ok(!fs.existsSync(path.join(runDir, 'ROUNDTRIP_WARNING.md')),
    'markdown source should NOT emit ROUNDTRIP_WARNING');
});

test('FORMAT-03: source-format.json records loader metadata', async () => {
  const d = tmpdir();
  fs.copyFileSync(path.join(FIXTURES, 'sample.md'), path.join(d, 'sample.md'));
  const { runDir } = await initRun(d, 'sample.md');
  const meta = JSON.parse(fs.readFileSync(path.join(runDir, 'source-format.json'), 'utf-8'));
  assert.equal(meta.format, 'markdown');
  assert.equal(meta.source_ext, '.md');
});

test('FORMAT-04: non-markdown source triggers ROUNDTRIP_WARNING.md via mock loader', async () => {
  const mockMod = {
    extensions: ['.mockdoc'],
    detect: (p) => p.endsWith('.mockdoc'),
    load: () => ({
      ok: true,
      markdown: '<!-- slide:1 -->\n## Slide 1 — Hello\n\nBody.\n',
      format: 'mockdoc',
      warnings: ['mock loader active'],
    }),
    priority: 5,
  };
  const baseline = loader.MODULES.slice();
  loader.MODULES.unshift(mockMod);
  try {
    const d = tmpdir();
    const p = path.join(d, 'deck.mockdoc');
    fs.writeFileSync(p, 'fake binary');
    const { runDir } = await initRun(d, 'deck.mockdoc');
    assert.ok(fs.existsSync(path.join(runDir, 'ROUNDTRIP_WARNING.md')),
      'ROUNDTRIP_WARNING.md not created for non-md source');
    const working = fs.readFileSync(path.join(runDir, 'working.md'), 'utf-8');
    assert.match(working, /<!-- slide:1 -->/);
    // FORMAT-03: binary preserved under original ext
    assert.ok(fs.existsSync(path.join(runDir, 'history', 'round-0-original.mockdoc')));
  } finally {
    loader.MODULES.length = 0;
    baseline.forEach(m => loader.MODULES.push(m));
  }
});

// ---------- FORMAT-05: graceful skip when optional dep missing ----------
test('FORMAT-05: docx loader returns {ok:false, reason:"unsupported"} when deps absent or fails gracefully', async () => {
  // We can't truly uninstall mammoth mid-test, but we can verify the loader
  // returns a typed result on a bogus .docx file (either unsupported if deps
  // missing, OR corrupt/empty from mammoth rejecting garbage — both are
  // acceptable typed outcomes).
  const d = tmpdir();
  const p = path.join(d, 'fake.docx');
  fs.writeFileSync(p, 'not a real docx');
  const r = await loader.loadAsync(p);
  assert.equal(r.ok, false);
  assert.ok(
    ['unsupported', 'corrupt', 'empty'].includes(r.reason),
    `unexpected reason: ${r.reason}`
  );
  assert.ok(typeof r.detail === 'string' && r.detail.length > 0);
});

// ---------- Runner ----------
(async () => {
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`  ok  ${t.name}`);
    } catch (err) {
      failed++;
      console.error(`FAIL  ${t.name}`);
      console.error(err.stack || err.message);
    }
  }
  console.log(`\n${tests.length - failed}/${tests.length} passed`);
  process.exit(failed ? 1 : 0);
})();
