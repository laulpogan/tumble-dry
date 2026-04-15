#!/usr/bin/env node
/**
 * Phase 8 / HEADLESS-01..03: orchestrator agent + status.json + REPORT.md surface tests.
 *
 * Run: node --test tests/headless.test.cjs
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const { writeStatus, readStatus, initStatus, isOrphan, renderProgressLine } = require(path.join(ROOT, 'lib/status.cjs'));
const { writeRoundReport, writeFinalReport } = require(path.join(ROOT, 'lib/report.cjs'));

function tmpdir(prefix = 'td-headless-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test('orchestrator.md frontmatter parses with required fields', () => {
  const agentPath = path.join(ROOT, 'agents', 'orchestrator.md');
  assert.ok(fs.existsSync(agentPath), 'orchestrator.md exists');
  const text = fs.readFileSync(agentPath, 'utf-8');
  assert.match(text, /^---\n/, 'has frontmatter');
  assert.match(text, /^name: orchestrator$/m, 'name: orchestrator');
  assert.match(text, /^model:/m, 'model field present');
  assert.match(text, /^tools:/m, 'tools field present');
  assert.match(text, /^maxTurns:/m, 'maxTurns field present');
  // Forbidden fields must NOT be present
  assert.doesNotMatch(text, /^hooks:/m);
  assert.doesNotMatch(text, /^mcpServers:/m);
  assert.doesNotMatch(text, /^permissionMode:/m);
});

test('orchestrator.md is declared in marketplace.json', () => {
  const mkt = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude-plugin', 'marketplace.json'), 'utf-8'));
  const agents = (mkt.agents || []).map(a => a.name);
  assert.ok(agents.includes('orchestrator'), 'orchestrator in marketplace.agents');
});

test('tumble-dry Skill is declared in marketplace.json', () => {
  const mkt = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude-plugin', 'marketplace.json'), 'utf-8'));
  assert.ok(Array.isArray(mkt.skills) && mkt.skills.length > 0, 'skills array present');
  const skill = mkt.skills.find(s => s.name === 'tumble-dry');
  assert.ok(skill, 'tumble-dry Skill registered');
  assert.ok(skill.description && skill.description.length > 20, 'description present');
  assert.ok(skill['argument-hint'] || skill.argument_hint, 'argument hint present');
});

test('initStatus creates status.json with required fields', () => {
  const dir = tmpdir();
  const st = initStatus(dir, { kind: 'single', slug: 'my-run' });
  assert.equal(st.kind, 'single');
  assert.equal(st.slug, 'my-run');
  assert.equal(st.round, 0);
  assert.equal(st.phase, 'init');
  assert.equal(st.converged, false);
  assert.ok(st.started_at, 'started_at set');
  assert.ok(st.last_updated, 'last_updated set');
  // Persisted
  const onDisk = readStatus(dir);
  assert.equal(onDisk.slug, 'my-run');
});

test('writeStatus merges patch and bumps last_updated', async () => {
  const dir = tmpdir();
  initStatus(dir, { kind: 'single', slug: 's' });
  await new Promise(r => setTimeout(r, 20)); // force timestamp delta
  const next = writeStatus(dir, { round: 2, phase: 'reviewers-dispatched', reviewers_dispatched: 5 });
  assert.equal(next.round, 2);
  assert.equal(next.phase, 'reviewers-dispatched');
  assert.equal(next.reviewers_dispatched, 5);
  assert.equal(next.slug, 's');
});

test('isOrphan flags runs with stale last_updated', () => {
  const stale = { phase: 'reviewers-dispatched', converged: false, last_updated: new Date(Date.now() - 2 * 3600 * 1000).toISOString() };
  const fresh = { phase: 'reviewers-dispatched', converged: false, last_updated: new Date().toISOString() };
  assert.equal(isOrphan(stale), true);
  assert.equal(isOrphan(fresh), false);
});

test('isOrphan returns false for converged runs regardless of age', () => {
  const ancient = { phase: 'converged', converged: true, last_updated: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString() };
  assert.equal(isOrphan(ancient), false);
});

test('renderProgressLine formats converged/failed/active correctly', () => {
  assert.match(renderProgressLine({ round: 3, converged: true, material_count: 1, drift_score: 0.2 }), /CONVERGED/);
  assert.match(renderProgressLine({ round: 2, phase: 'failed', error: 'x' }), /FAILED/);
  assert.match(renderProgressLine({ round: 1, phase: 'reviewers-dispatched', reviewers_dispatched: 5, reviewers_returned: 3 }), /3\/5/);
});

test('writeRoundReport produces non-empty report with all 3 sections', () => {
  const dir = tmpdir();
  const roundDir = path.join(dir, 'round-1');
  fs.mkdirSync(roundDir, { recursive: true });
  fs.writeFileSync(path.join(roundDir, 'aggregate.json'), JSON.stringify({
    by_severity: { material: 2, minor: 4 },
    structural_count: 0,
    content_drift: 0.15,
    structural_drift: 0.02,
    critique_count: 5,
    converged: false,
  }));
  fs.writeFileSync(path.join(roundDir, 'aggregate.md'), [
    '# Round 1 Aggregate', '',
    '# Material', '',
    '## First material finding', 'body.',
    '## Second material finding', 'body.',
    '# Minor', '',
    '## Minor thing',
  ].join('\n'));
  const p = writeRoundReport(dir, 1);
  assert.ok(p && fs.existsSync(p));
  const body = fs.readFileSync(p, 'utf-8');
  assert.match(body, /# Round 1 Report/);
  assert.match(body, /Top material findings/);
  assert.match(body, /First material finding/);
  assert.match(body, /Drift/);
  assert.match(body, /Content drift: 0.15/);
});

test('writeFinalReport rolls per-round into a summary table', () => {
  const dir = tmpdir();
  for (const r of [1, 2]) {
    const rd = path.join(dir, `round-${r}`);
    fs.mkdirSync(rd, { recursive: true });
    fs.writeFileSync(path.join(rd, 'aggregate.json'), JSON.stringify({
      by_severity: { material: r === 1 ? 3 : 0, minor: 2 },
      structural_count: 0,
      content_drift: 0.1 * r,
      converged: r === 2,
    }));
    fs.writeFileSync(path.join(rd, 'aggregate.md'), '# Material\n\n## thing\n');
  }
  const p = writeFinalReport(dir);
  assert.ok(p && fs.existsSync(p));
  const body = fs.readFileSync(p, 'utf-8');
  assert.match(body, /# tumble-dry Report/);
  assert.match(body, /Per-round summary/);
  assert.match(body, /\| 1 \|/);
  assert.match(body, /\| 2 \|/);
  assert.match(body, /Converged at round 2/);
});
