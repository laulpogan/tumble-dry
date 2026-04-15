#!/usr/bin/env node
/**
 * Phase 8 / CANARY-01..02: zero-config first-run voice inference.
 *
 * Run: node --test tests/canary.test.cjs
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const { inferDefaults, inferVoiceFromGit, dumpConfigYaml } = require(path.join(ROOT, 'lib/canary.cjs'));

function tmpGitRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'td-canary-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'tester@test.local'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Tester'], { cwd: dir });
  return dir;
}

function commit(dir, files, msg) {
  for (const [p, content] of Object.entries(files)) {
    const full = path.join(dir, p);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  execFileSync('git', ['add', '-A'], { cwd: dir });
  execFileSync('git', ['commit', '-qm', msg], { cwd: dir });
}

test('inferVoiceFromGit returns excerpts from prose commits', () => {
  const dir = tmpGitRepo();
  commit(dir, { 'README.md': '# Project\n\nThis is a meaningful paragraph of prose that describes the project in some length.' }, 'initial');
  commit(dir, { 'docs/intro.md': '# Intro\n\nHere is another paragraph with enough length to pass the filter threshold for prose sampling.' }, 'add intro');
  const r = inferVoiceFromGit(dir, 5);
  assert.equal(r.source, 'git_history');
  assert.ok(r.excerpts.length > 0);
  assert.ok(r.excerpts[0].text.length > 0);
  assert.ok(r.excerpts[0].file.startsWith('git:'));
});

test('inferVoiceFromGit falls back to none in a repo with no prose commits', () => {
  const dir = tmpGitRepo();
  commit(dir, { 'code.js': 'function x() { return 1; }' }, 'code only');
  const r = inferVoiceFromGit(dir);
  assert.equal(r.source, 'none');
  assert.equal(r.excerpts.length, 0);
});

test('inferDefaults returns notice string and voice_refs:[] for zero-config', () => {
  const dir = tmpGitRepo();
  commit(dir, { 'a.md': '# a\n\nA paragraph with lots of prose content that should be sampled by the canary.' }, 'init');
  const d = inferDefaults(dir, { cache: false });
  assert.deepEqual(d.voice_refs, []);
  assert.ok(d.notice.includes('first run'));
  assert.ok(Array.isArray(d.voice_excerpts));
});

test('inferDefaults in non-git dir reports source=none and non-blocking notice', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'td-nogit-'));
  const d = inferDefaults(dir, { cache: false });
  assert.equal(d.source, 'none');
  assert.ok(d.notice, 'still has notice for downstream');
});

test('inferDefaults caches to .tumble-dry/_canary-voice.json', () => {
  const dir = tmpGitRepo();
  commit(dir, { 'a.md': '# a\n\nAnother meaningful chunk of prose to sample for voice excerpts.' }, 'init');
  const d1 = inferDefaults(dir, { cache: true });
  const cached = JSON.parse(fs.readFileSync(path.join(dir, '.tumble-dry', '_canary-voice.json'), 'utf-8'));
  assert.equal(cached.source, d1.source);
});

test('dumpConfigYaml writes .tumble-dry.yml with inferred notice', () => {
  const dir = tmpGitRepo();
  commit(dir, { 'a.md': '# a\n\nSome prose long enough to be sampled for the voice inference canary.' }, 'init');
  const r = dumpConfigYaml(dir);
  assert.equal(r.written, true);
  const body = fs.readFileSync(r.path, 'utf-8');
  assert.match(body, /voice_refs: \[\]/);
  assert.match(body, /panel_size:/);
  assert.match(body, /# Inferred:/);
});

test('dumpConfigYaml refuses to overwrite without --force', () => {
  const dir = tmpGitRepo();
  fs.writeFileSync(path.join(dir, '.tumble-dry.yml'), 'panel_size: 99\n');
  const r = dumpConfigYaml(dir);
  assert.equal(r.written, false);
  assert.equal(r.reason, 'exists');
});
