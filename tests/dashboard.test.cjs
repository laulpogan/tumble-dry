#!/usr/bin/env node
/**
 * DASH-01..02: batch dashboard tests.
 *
 * Run: node --test tests/dashboard.test.cjs
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const CLI = path.join(ROOT, 'bin', 'tumble-dry.cjs');

function tmpProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'td-dash-'));
  const tdRoot = path.join(dir, '.tumble-dry');

  // Create a batch run with batch.json
  const batchDir = path.join(tdRoot, 'test-batch');
  fs.mkdirSync(batchDir, { recursive: true });

  // Three file runs under the batch
  const files = [];
  for (const name of ['file-a', 'file-b', 'file-c']) {
    const fileDir = path.join(batchDir, name);
    fs.mkdirSync(fileDir, { recursive: true });
    files.push({ slug: name, run_dir: fileDir });
  }

  // Write batch.json
  fs.writeFileSync(path.join(batchDir, 'batch.json'), JSON.stringify({ files }, null, 2));

  // Write status.json for each file
  // file-a: converged
  fs.writeFileSync(path.join(batchDir, 'file-a', 'status.json'), JSON.stringify({
    kind: 'single', slug: 'file-a', round: 2, phase: 'converged',
    converged: true, material_count: 0, last_updated: new Date().toISOString(),
  }, null, 2));

  // file-b: in-progress
  fs.writeFileSync(path.join(batchDir, 'file-b', 'status.json'), JSON.stringify({
    kind: 'single', slug: 'file-b', round: 1, phase: 'round-complete',
    converged: false, material_count: 3, last_updated: new Date().toISOString(),
  }, null, 2));

  // file-c: init (no status)

  return dir;
}

test('DASH-01: status command shows batch summary line', () => {
  const dir = tmpProject();
  // Run status from the project dir
  let output;
  try {
    output = execSync(`node "${CLI}" status`, { cwd: dir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (err) {
    // status exits 1 when unconverged — that's expected
    output = err.stdout || '';
  }
  // Should contain the batch summary
  assert.ok(output.includes('Batch Summary'), `Expected batch summary in output:\n${output}`);
  assert.ok(output.includes('test-batch'), `Expected batch slug in output:\n${output}`);
  // Check counts: 1 converged, 1 in-progress, 1 init
  assert.ok(output.includes('1/3 converged'), `Expected converged count:\n${output}`);
});

test('DASH-02: resume command handles batch slug', () => {
  const dir = tmpProject();
  const output = execSync(`node "${CLI}" resume test-batch`, { cwd: dir, encoding: 'utf-8' });
  const result = JSON.parse(output);
  assert.equal(result.kind, 'batch');
  assert.equal(result.total_files, 3);
  assert.equal(result.converged, 1);
  assert.ok(result.to_resume >= 1); // file-b and file-c need resume
});
