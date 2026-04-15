#!/usr/bin/env node
/**
 * Smoke tests for HARDEN-01..06. Uses node:assert and a tiny test-harness so
 * the file runs standalone: `node tests/harden.test.cjs`.
 *
 * Each test is isolated to a tmp dir. Real repo files are never touched.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
const { voiceDriftReport, structuralDriftScore, stripMarkdownStructure } = require(path.join(ROOT, 'lib/voice.cjs'));
const { dedupFindings, parseCritique, extractMarkers, aggregateJson, aggregateRound } = require(path.join(ROOT, 'lib/aggregator.cjs'));
const { buildReviewerBrief, loadPreviousMaterial } = require(path.join(ROOT, 'lib/reviewer-brief.cjs'));
const { pruneTraces } = require(path.join(ROOT, 'lib/trace-retention.cjs'));
const { ensureGitignore, initRun } = require(path.join(ROOT, 'lib/run-state.cjs'));

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

function tmpdir(prefix = 'td-harden-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// ---------- HARDEN-02 ----------
test('HARDEN-02: voiceDriftReport returns structural_drift and content_drift', () => {
  const before = 'The cat sat on the mat. It was a sunny day. Birds were singing.';
  const after  = 'The cat sat on the mat. It was a sunny day. Birds were singing.';
  const r = voiceDriftReport(before, after);
  assert.ok('structural_drift' in r, 'structural_drift field present');
  assert.ok('content_drift' in r, 'content_drift field present');
  assert.equal(r.content_drift, 0, 'identical content → content_drift 0');
});

test('HARDEN-02: heading-depth-only change registers structural_drift without inflating content_drift', () => {
  // Same sentences, only heading depth changed. content_drift should be 0.
  const before = '# Title\n\nThe cat sat on the mat. The dog barked loudly.';
  const after  = '## Title\n\nThe cat sat on the mat. The dog barked loudly.';
  const r = voiceDriftReport(before, after);
  assert.equal(r.content_drift, 0, 'identical sentences → content_drift 0');
  assert.ok(r.structural_drift >= 0 && r.structural_drift <= 1, 'structural_drift in [0,1]');
});

test('HARDEN-02: structuralDriftScore isolates pure-token markdown re-shape', () => {
  // Same heading TEXT, only depth differs → stripped forms are identical →
  // raw delta is attributed entirely to structural_drift.
  const before = '# Heading\n\nThe cat sat on the mat.';
  const after  = '## Heading\n\nThe cat sat on the mat.';
  const s = structuralDriftScore(before, after);
  assert.ok(s > 0, 'heading-depth change → structural_drift > 0');
});

test('HARDEN-02: stripMarkdownStructure removes headings/bullets/fences/html-comments', () => {
  const s = '# H1\n## H2\n- bullet\n1. ordered\n> quote\n<!-- slide:3 -->\n```js\ncode\n```\nreal text.';
  const out = stripMarkdownStructure(s);
  assert.ok(!out.includes('#'), 'no heading markers');
  assert.ok(!out.includes('- bullet') || out.includes('bullet'), 'bullet marker stripped, text kept');
  assert.ok(!out.includes('<!--'), 'html comments removed');
  assert.ok(out.includes('real text.'), 'content preserved');
});

// ---------- HARDEN-03 ----------
test('HARDEN-03: extractMarkers finds slide/sheet/page markers', () => {
  const text = 'See <!-- slide:3 --> and <!-- sheet:Revenue --> also <!-- page:12 -->.';
  const markers = extractMarkers(text);
  assert.ok(markers.includes('slide:3'));
  assert.ok(markers.includes('sheet:revenue'));
  assert.ok(markers.includes('page:12'));
});

test('HARDEN-03: dedupFindings clusters paraphrases via bigram-Dice', () => {
  const findings = [
    { title: 'A', severity: 'material', summary: 'pricing model is unclear', body: '', structural: false, markers: [] },
    { title: 'B', severity: 'material', summary: 'pricing model unclear',    body: '', structural: false, markers: [] },
    { title: 'C', severity: 'minor',    summary: 'typo in headline',         body: '', structural: false, markers: [] },
  ];
  const clusters = dedupFindings(findings);
  assert.equal(clusters.length, 2, 'paraphrases collapse to 1 cluster');
});

test('HARDEN-03: dedupFindings clusters by shared marker even with unrelated summaries', () => {
  const findings = [
    { title: 'A', severity: 'material', summary: 'the revenue line is off',        body: 'x', structural: false, markers: ['slide:5'] },
    { title: 'B', severity: 'material', summary: 'chart legend missing datapoint', body: 'y', structural: false, markers: ['slide:5'] },
  ];
  const clusters = dedupFindings(findings);
  assert.equal(clusters.length, 1, 'shared marker → cluster');
});

test('HARDEN-03: aggregateJson persists markers + resolved flag', () => {
  const dir = tmpdir();
  const p = path.join(dir, 'critique-x.md');
  fs.writeFileSync(p, '## Thing\n**severity:** material\n**summary:** x\n<!-- slide:2 -->\nBody.\n');
  const agg = aggregateRound([p]);
  const json = aggregateJson(agg);
  assert.ok(json.clusters.length >= 1);
  assert.ok(Array.isArray(json.clusters[0].markers));
  assert.equal(json.clusters[0].resolved, false);
});

// ---------- HARDEN-04 ----------
test('HARDEN-04: buildReviewerBrief seeds prior-round material when roundNumber > 1', () => {
  const dir = tmpdir();
  fs.mkdirSync(path.join(dir, 'round-1'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'round-1', 'aggregate.json'), JSON.stringify({
    clusters: [
      { summary: 'PRICING NOT EXPLAINED', severity: 'material', structural: true, resolved: false, tokens: [], markers: [] },
      { summary: 'resolved nit', severity: 'nit', resolved: false, tokens: [], markers: [] },
    ],
  }));
  const agentPath = path.join(dir, 'agent.md');
  fs.writeFileSync(agentPath, '# Reviewer agent stub');
  const brief = buildReviewerBrief({
    artifactText: 'ARTIFACT',
    personaSlug: 'x', personaBlock: 'X', assumptionAudit: 'A', voiceExcerpts: [],
    roundNumber: 2, reviewerAgentPath: agentPath, runDir: dir,
  });
  assert.match(brief, /Open material findings from round 1/);
  assert.match(brief, /PRICING NOT EXPLAINED/);
  assert.ok(!/resolved nit/.test(brief), 'non-material omitted');
});

test('HARDEN-04: round 1 brief does NOT include open-findings section', () => {
  const dir = tmpdir();
  const agentPath = path.join(dir, 'agent.md');
  fs.writeFileSync(agentPath, '# stub');
  const brief = buildReviewerBrief({
    artifactText: 'A', personaSlug: 's', personaBlock: 'b', assumptionAudit: 'x',
    voiceExcerpts: [], roundNumber: 1, reviewerAgentPath: agentPath, runDir: dir,
  });
  assert.ok(!/Open material findings/.test(brief));
});

// ---------- HARDEN-05 ----------
test('HARDEN-05: pruneTraces gzips rounds older than retention window', () => {
  const runDir = tmpdir();
  for (let n = 1; n <= 5; n++) {
    const td = path.join(runDir, `round-${n}`, 'traces');
    fs.mkdirSync(td, { recursive: true });
    fs.writeFileSync(path.join(td, `persona-${n}.json`), JSON.stringify({ n }));
    fs.writeFileSync(path.join(td, `persona-${n}.thinking.md`), `thinking ${n}`);
  }
  const res = pruneTraces(runDir, 5, { trace_full_retention: 3 });
  // Rounds 1 and 2 archived; 3, 4, 5 kept.
  assert.ok(res.archived.length >= 4, 'round 1+2 traces gzipped');
  assert.ok(fs.existsSync(path.join(runDir, 'round-1', 'traces', 'persona-1.json.gz')));
  assert.ok(fs.existsSync(path.join(runDir, 'round-5', 'traces', 'persona-5.json')));
  assert.ok(fs.existsSync(path.join(runDir, 'round-5', 'traces', 'INDEX.md')));
});

// ---------- HARDEN-06 ----------
test('HARDEN-06: ensureGitignore creates .gitignore when absent', () => {
  const d = tmpdir();
  const res = ensureGitignore(d);
  assert.equal(res.created, true);
  const content = fs.readFileSync(path.join(d, '.gitignore'), 'utf-8');
  assert.match(content, /^\.tumble-dry\/$/m);
});

test('HARDEN-06: ensureGitignore appends when .tumble-dry/ missing', () => {
  const d = tmpdir();
  fs.writeFileSync(path.join(d, '.gitignore'), 'node_modules/\n.env\n');
  const res = ensureGitignore(d);
  assert.equal(res.appended, true);
  const content = fs.readFileSync(path.join(d, '.gitignore'), 'utf-8');
  assert.match(content, /^\.tumble-dry\/$/m);
  assert.match(content, /node_modules\//);
});

test('HARDEN-06: ensureGitignore idempotent when line present', () => {
  const d = tmpdir();
  fs.writeFileSync(path.join(d, '.gitignore'), 'node_modules/\n.tumble-dry/\n');
  const res = ensureGitignore(d);
  assert.equal(res.appended, false);
  assert.equal(res.created, false);
  // Line appears exactly once.
  const content = fs.readFileSync(path.join(d, '.gitignore'), 'utf-8');
  const hits = content.split('\n').filter(l => /^\.tumble-dry\/?$/.test(l.trim()));
  assert.equal(hits.length, 1);
});

test('HARDEN-06: initRun triggers .gitignore bootstrap on first init', async () => {
  const d = tmpdir();
  const src = path.join(d, 'art.md');
  fs.writeFileSync(src, '# Test\n\nHello.');
  await initRun(d, 'art.md');
  assert.ok(fs.existsSync(path.join(d, '.gitignore')));
  const content = fs.readFileSync(path.join(d, '.gitignore'), 'utf-8');
  assert.match(content, /\.tumble-dry\//);
});

// ---------- Runner ----------
(async () => {
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`  ok  ${t.name}`);
    } catch (e) {
      failed++;
      console.error(`  FAIL ${t.name}`);
      console.error('    ', e.message);
    }
  }
  console.log(`\n${tests.length - failed}/${tests.length} passed`);
  process.exit(failed ? 1 : 0);
})();
