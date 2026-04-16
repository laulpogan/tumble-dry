#!/usr/bin/env node
/**
 * REGISTER-01..04: structural finding register tests.
 *
 * Run: node --test tests/register.test.cjs
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const {
  loadRegister,
  saveRegister,
  autoRegister,
  manualRegister,
  isRegistered,
  unregisteredMaterialCount,
  tokenize,
  jaccard,
} = require(path.join(ROOT, 'lib/structural-register.cjs'));

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'td-reg-'));
}

test('loadRegister returns empty array for missing file', () => {
  const dir = tmpDir();
  const reg = loadRegister(dir);
  assert.deepEqual(reg, []);
});

test('saveRegister + loadRegister roundtrips', () => {
  const dir = tmpDir();
  const entries = [
    { finding_summary: 'pricing unclear', registered_at_round: 2, status: 'acknowledged', reason: 'auto', tokens: ['pricing', 'unclear'] },
  ];
  saveRegister(dir, entries);
  const loaded = loadRegister(dir);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].finding_summary, 'pricing unclear');
});

test('isRegistered matches similar summaries via jaccard', () => {
  const register = [
    { finding_summary: 'pricing model is unclear and confusing', tokens: tokenize('pricing model is unclear and confusing') },
  ];
  assert.ok(isRegistered(register, 'pricing model unclear confusing'));
  assert.ok(!isRegistered(register, 'completely different topic about cats'));
});

test('manualRegister adds entry and prevents duplicates', () => {
  const dir = tmpDir();
  const r1 = manualRegister(dir, 'NRR calculation methodology questionable');
  assert.ok(r1.added);
  assert.equal(r1.register.length, 1);

  const r2 = manualRegister(dir, 'NRR calculation methodology questionable');
  assert.ok(!r2.added);
  assert.equal(r2.register.length, 1);
});

test('autoRegister registers findings that persist from prior round', () => {
  const dir = tmpDir();
  const prior = {
    clusters: [
      { summary: 'revenue assumptions lack evidence', severity: 'material', structural: true, tokens: tokenize('revenue assumptions lack evidence') },
      { summary: 'formatting nit', severity: 'minor', structural: false, tokens: tokenize('formatting nit') },
    ],
  };
  const current = {
    clusters: [
      { summary: 'revenue assumptions still lack evidence', severity: 'material', structural: true, tokens: tokenize('revenue assumptions still lack evidence') },
      { summary: 'brand new issue this round', severity: 'material', structural: true, tokens: tokenize('brand new issue this round') },
    ],
  };
  const reg = autoRegister(dir, 2, current, prior);
  // Only the persisted one should be registered, not the new one
  assert.equal(reg.length, 1);
  assert.ok(reg[0].finding_summary.includes('revenue assumptions'));
});

test('autoRegister skips round 1', () => {
  const dir = tmpDir();
  const reg = autoRegister(dir, 1, { clusters: [] }, null);
  assert.deepEqual(reg, []);
});

test('unregisteredMaterialCount excludes registered findings', () => {
  const register = [
    { finding_summary: 'pricing unclear', tokens: tokenize('pricing unclear') },
  ];
  const agg = {
    clusters: [
      { summary: 'pricing unclear and confusing', severity: 'material' },
      { summary: 'missing call to action', severity: 'material' },
      { summary: 'minor typo', severity: 'minor' },
    ],
  };
  const count = unregisteredMaterialCount(register, agg);
  assert.equal(count, 1); // only 'missing call to action' counts
});

test('jaccard returns 0 for empty inputs', () => {
  assert.equal(jaccard([], []), 0);
  assert.equal(jaccard(['a'], []), 0);
});

test('jaccard returns 1 for identical sets', () => {
  assert.equal(jaccard(['a', 'b', 'c'], ['a', 'b', 'c']), 1);
});
