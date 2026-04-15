#!/usr/bin/env node
/**
 * Smoke tests for CODE-01..07 (v0.6.0 code-aware features).
 *
 * Runs standalone: `node tests/code.test.cjs`
 * Covers:
 *   - CODE-01: language detection (JS file, shebang fallback, polyglot)
 *   - CODE-02: AST drift report on small JS snippets (rename, signature change, added)
 *   - CODE-03: code loader detects single files + directories
 *   - CODE-04: style anchors — returns markdown for known lang, falls to default
 *   - CODE-05: reviewer brief swaps voice block for code-mode block when artifact_kind='code'
 *   - CODE-06: editor-code.md frontmatter parses + name === 'editor-code'
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
const detectLang = require(path.join(ROOT, 'lib/code/detect-language.cjs'));
const codeLoader = require(path.join(ROOT, 'lib/loaders/code.cjs'));
const styleAnchors = require(path.join(ROOT, 'lib/code/style-anchors/index.cjs'));
const { astDriftReport } = require(path.join(ROOT, 'lib/code/ast-drift.cjs'));
const { buildReviewerBrief, buildEditorBrief } = require(path.join(ROOT, 'lib/reviewer-brief.cjs'));

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
function tmpdir(prefix = 'td-code-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// ---------- CODE-01: language detection ----------
test('CODE-01: detects JavaScript from .js extension', () => {
  const d = tmpdir();
  const p = path.join(d, 'hello.js');
  fs.writeFileSync(p, 'function hello() { return 42; }\n');
  const r = detectLang.detect(p);
  assert.equal(r.primary, 'JavaScript');
  assert.ok(r.confidence > 0);
  assert.equal(r.programming, true);
});

test('CODE-01: shebang fallback for extension-less python script', () => {
  const d = tmpdir();
  const p = path.join(d, 'myscript');
  fs.writeFileSync(p, '#!/usr/bin/env python3\nprint("hi")\n');
  const r = detectLang.detect(p);
  assert.equal(r.primary, 'Python');
});

test('CODE-01: polyglot — HTML with <script> yields JS region', () => {
  const content = '<!doctype html>\n<html><script>const x = 1;</script></html>\n';
  const r = detectLang.detect('/tmp/fake.html', { content });
  assert.equal(r.primary, 'HTML');
  assert.ok(r.regions.length >= 1, 'expected at least one polyglot region');
  assert.equal(r.regions[0].lang, 'JavaScript');
});

test('CODE-01: markdown files are NOT classified as programming', () => {
  const d = tmpdir();
  const p = path.join(d, 'doc.md');
  fs.writeFileSync(p, '# Hello\n\nProse.\n');
  const r = detectLang.detect(p);
  // Markdown is in EXT_TABLE as 'Markdown' but isProgrammingLanguage returns false.
  assert.equal(r.primary, 'Markdown');
  assert.equal(r.programming, false);
});

// ---------- CODE-03: code loader ----------
test('CODE-03: code loader detects single .js file', () => {
  const d = tmpdir();
  const p = path.join(d, 'a.js');
  fs.writeFileSync(p, 'module.exports = 1;\n');
  assert.equal(codeLoader.detect(p), true);
  const r = codeLoader.load(p);
  assert.equal(r.ok, true);
  assert.equal(r.format, 'code');
  assert.equal(r.meta.artifact_kind, 'code');
  assert.equal(r.meta.language, 'JavaScript');
  assert.match(r.markdown, /```javascript/);
});

test('CODE-03: code loader detects code directory via package.json + walks files', () => {
  const d = tmpdir();
  fs.writeFileSync(path.join(d, 'package.json'), '{"name":"x"}');
  fs.writeFileSync(path.join(d, 'index.js'), 'console.log(1);\n');
  fs.writeFileSync(path.join(d, 'util.js'), 'export const u = 2;\n');
  assert.equal(codeLoader.detect(d), true);
  const r = codeLoader.load(d);
  assert.equal(r.ok, true);
  assert.equal(r.format, 'code-dir');
  assert.equal(r.meta.artifact_kind, 'code');
  assert.match(r.markdown, /index\.js/);
  assert.match(r.markdown, /util\.js/);
  assert.match(r.markdown, /<!-- code-file:/);
});

test('CODE-03: prose markdown file is NOT claimed by code loader', () => {
  const d = tmpdir();
  const p = path.join(d, 'doc.md');
  fs.writeFileSync(p, '# hello\n');
  assert.equal(codeLoader.detect(p), false);
});

// ---------- CODE-04: style anchors ----------
test('CODE-04: style anchor returns markdown for known language (Python)', () => {
  const md = styleAnchors.markdownFor('Python');
  assert.match(md, /PEP 8/);
  assert.match(md, /Do:/);
  assert.match(md, /Do NOT:/);
});

test('CODE-04: style anchor falls back to default for unknown language', () => {
  const md = styleAnchors.markdownFor('BrainfuckPlusPlus');
  assert.match(md, /Generic/);
});

test('CODE-04: style anchors for all four main languages render non-empty markdown', () => {
  for (const lang of ['Python', 'Go', 'Rust', 'JavaScript']) {
    const md = styleAnchors.markdownFor(lang);
    assert.ok(md.length > 100, `${lang} anchor too short`);
  }
});

// ---------- CODE-02: AST drift ----------
test('CODE-02: astDriftReport detects signature_changed on JS function', async () => {
  const before = 'function add(a, b) { return a + b; }\n';
  const after  = 'function add(a, b, c) { return a + b + c; }\n';
  const r = await astDriftReport(before, after, 'JavaScript');
  if (r.backend !== 'tree-sitter') {
    // grammar not available — test degrades to asserting fallback
    assert.equal(r.backend, 'sentence-fallback');
    return;
  }
  assert.ok(r.signature_changed_count >= 1, 'expected signature_changed on param-count diff');
  assert.ok(r.structural, 'expected structural=true when signature changed');
});

test('CODE-02: astDriftReport detects added function', async () => {
  const before = 'function a() { return 1; }\n';
  const after  = 'function a() { return 1; }\nfunction b() { return 2; }\n';
  const r = await astDriftReport(before, after, 'JavaScript');
  if (r.backend !== 'tree-sitter') return; // skip on fallback
  assert.ok(r.counts.added >= 1, 'expected added count >= 1');
  assert.ok(r.counts.unchanged >= 1, 'expected unchanged count >= 1');
});

test('CODE-02: astDriftReport detects rename (same body, new name)', async () => {
  const before = 'function oldName() { const x = 1; return x + 2; }\n';
  const after  = 'function newName() { const x = 1; return x + 2; }\n';
  const r = await astDriftReport(before, after, 'JavaScript');
  if (r.backend !== 'tree-sitter') return;
  // Either classified as rename (body matches) or removed+added.
  const hasRename = r.counts.renamed >= 1 ||
    (r.counts.added >= 1 && r.counts.removed >= 1);
  assert.ok(hasRename, `expected rename-like classification; got ${JSON.stringify(r.counts)}`);
});

test('CODE-02: astDriftReport falls back for unknown language', async () => {
  const r = await astDriftReport('a b c.', 'a b c d.', 'SomeUnknownLang');
  assert.equal(r.backend, 'sentence-fallback');
  assert.ok(typeof r.drift_score === 'number');
});

// ---------- CODE-05: reviewer brief ----------
test('CODE-05: buildReviewerBrief with artifactKind=code injects code-mode header + suppresses voice block', () => {
  const reviewerAgentPath = path.join(ROOT, 'agents/reviewer.md');
  const brief = buildReviewerBrief({
    artifactText: '```javascript\nfunction x() {}\n```',
    personaSlug: 'staff-eng',
    personaBlock: '### Staff Eng\n',
    assumptionAudit: '_none_',
    voiceExcerpts: [],
    roundNumber: 1,
    reviewerAgentPath,
    artifactKind: 'code',
    language: 'JavaScript',
  });
  assert.match(brief, /artifact_kind:\*\*\s*code/);
  assert.match(brief, /language:\*\*\s*JavaScript/);
  assert.match(brief, /linter-catchable/i);
  // Should NOT contain "voice excerpt"/"voice references configured" block
  assert.doesNotMatch(brief, /No voice references configured/);
});

test('CODE-05: buildReviewerBrief default (prose) still gets voice block', () => {
  const reviewerAgentPath = path.join(ROOT, 'agents/reviewer.md');
  const brief = buildReviewerBrief({
    artifactText: 'prose content',
    personaSlug: 'reader',
    personaBlock: '### Reader\n',
    assumptionAudit: '_none_',
    voiceExcerpts: [],
    roundNumber: 1,
    reviewerAgentPath,
  });
  assert.match(brief, /Voice excerpts|No voice references configured/);
});

// ---------- CODE-04: editor brief swap ----------
test('CODE-04: buildEditorBrief with artifactKind=code injects style anchor, not voice', () => {
  const editorAgentPath = path.join(ROOT, 'agents/editor-code.md');
  const brief = buildEditorBrief({
    artifactText: '```python\ndef f(): pass\n```',
    aggregateMarkdown: '_none_',
    voiceExcerpts: [],
    voiceSource: null,
    agentPath: editorAgentPath,
    roundNumber: 1,
    artifactKind: 'code',
    language: 'Python',
  });
  assert.match(brief, /Style anchor/);
  assert.match(brief, /PEP 8/);
  assert.doesNotMatch(brief, /Voice anchor \(binding\)/);
});

// ---------- CODE-06: editor-code agent ----------
test('CODE-06: editor-code.md frontmatter parses with name=editor-code', () => {
  const p = path.join(ROOT, 'agents/editor-code.md');
  assert.ok(fs.existsSync(p), 'editor-code.md missing');
  const text = fs.readFileSync(p, 'utf-8');
  const lines = text.split('\n');
  assert.equal(lines[0], '---');
  const end = lines.indexOf('---', 1);
  assert.ok(end > 1, 'frontmatter not closed');
  const fm = {};
  for (let i = 1; i < end; i++) {
    const m = lines[i].match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)$/);
    if (m) fm[m[1]] = m[2].trim();
  }
  assert.equal(fm.name, 'editor-code');
  assert.ok(fm.description && fm.description.length > 0);
  assert.ok(fm.tools && /Read/.test(fm.tools) && /Write/.test(fm.tools));
});

// ---------- CODE-06: editor-code is registered in marketplace ----------
test('CODE-06: marketplace.json registers editor-code agent', () => {
  const p = path.join(ROOT, '.claude-plugin/marketplace.json');
  const mkt = JSON.parse(fs.readFileSync(p, 'utf-8'));
  const found = mkt.agents.find(a => a.name === 'editor-code');
  assert.ok(found, 'editor-code not found in marketplace.json');
  assert.equal(found.path, 'agents/editor-code.md');
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
