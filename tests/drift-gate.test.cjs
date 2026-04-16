#!/usr/bin/env node
/**
 * DRIFT-01..02: drift hard gate tests.
 *
 * Run: node --test tests/drift-gate.test.cjs
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const { checkDriftGate, buildSafeRedraft } = require(path.join(ROOT, 'lib/drift-gate.cjs'));

function tmpRunDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'td-drift-'));
  fs.mkdirSync(path.join(dir, 'round-1'), { recursive: true });
  return dir;
}

const ORIGINAL = `The product helps teams collaborate better. Our pricing starts at ten dollars per month. Contact sales for enterprise pricing. We serve over five hundred customers globally.`;

const MINOR_EDIT = `The product helps teams collaborate better. Our pricing starts at ten dollars per month for individuals. Contact sales for enterprise pricing. We serve over five hundred customers globally.`;

const MAJOR_REWRITE = `A revolutionary platform transforms how organizations work together. Starting at just fifteen dollars monthly, we offer unmatched value. Reach out to our dedicated sales team for custom enterprise solutions. With a global footprint spanning thousands of satisfied clients across fifty countries, we lead the market.`;

test('checkDriftGate returns exceeded=false when drift is within threshold', () => {
  const runDir = tmpRunDir();
  const beforePath = path.join(runDir, 'working.md');
  const afterPath = path.join(runDir, 'round-1', 'proposed-redraft.md');
  fs.writeFileSync(beforePath, ORIGINAL);
  fs.writeFileSync(afterPath, MINOR_EDIT);

  const result = checkDriftGate(runDir, 1, beforePath, afterPath, 0.25);
  assert.equal(result.exceeded, false);
  assert.ok(result.content_drift <= 0.25);
});

test('checkDriftGate returns exceeded=true and splits when drift exceeds threshold', () => {
  const runDir = tmpRunDir();
  const beforePath = path.join(runDir, 'working.md');
  const afterPath = path.join(runDir, 'round-1', 'proposed-redraft.md');
  fs.writeFileSync(beforePath, ORIGINAL);
  fs.writeFileSync(afterPath, MAJOR_REWRITE);

  const result = checkDriftGate(runDir, 1, beforePath, afterPath, 0.15);
  assert.equal(result.exceeded, true);
  assert.ok(result.content_drift > 0.15);
  assert.ok(fs.existsSync(result.safe_path));
  assert.ok(fs.existsSync(result.structural_path));

  // structural-redraft should be the full rewrite
  const structural = fs.readFileSync(result.structural_path, 'utf-8');
  assert.ok(structural.includes('revolutionary platform'));

  // safe-redraft should be more conservative
  const safe = fs.readFileSync(result.safe_path, 'utf-8');
  assert.ok(safe.length > 0);
});

test('buildSafeRedraft preserves unchanged sentences', () => {
  const safe = buildSafeRedraft(ORIGINAL, MINOR_EDIT, 0.25);
  assert.ok(safe.includes('collaborate better'));
  assert.ok(safe.includes('five hundred customers'));
});

test('buildSafeRedraft reverts heavily modified sentences', () => {
  const safe = buildSafeRedraft(ORIGINAL, MAJOR_REWRITE, 0.25);
  // Safe version should NOT contain the radical rewrite phrases
  // (they get reverted to original or dropped)
  assert.ok(!safe.includes('revolutionary platform'));
});
