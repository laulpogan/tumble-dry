#!/usr/bin/env node
/**
 * Phase 9 / GIT-01..06: git integration tests.
 *
 * Creates a temporary git repo, runs git-integration functions,
 * verifies branches, commits, and metadata in commit messages.
 *
 * Run: node --test tests/git.test.cjs
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const gitInt = require(path.join(ROOT, 'lib/git-integration.cjs'));

function tmpGitRepo(prefix = 'td-git-') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  execSync('git init', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' });
  // Need at least one commit for branch operations
  fs.writeFileSync(path.join(dir, 'README.md'), '# test\n');
  execSync('git add . && git commit -m "initial"', { cwd: dir, stdio: 'pipe' });
  return dir;
}

function gitLog(cwd, args = '') {
  return execSync(`git log --oneline ${args}`, { cwd, encoding: 'utf-8' }).trim();
}

function gitBranch(cwd) {
  return execSync('git branch --list', { cwd, encoding: 'utf-8' }).trim();
}

function currentBranch(cwd) {
  return execSync('git rev-parse --abbrev-ref HEAD', { cwd, encoding: 'utf-8' }).trim();
}

test('isGitRepo returns true for git repo', () => {
  const dir = tmpGitRepo();
  assert.ok(gitInt.isGitRepo(dir));
});

test('isGitRepo returns false for non-repo', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'td-nogit-'));
  assert.ok(!gitInt.isGitRepo(dir));
});

test('GIT-01: createRunBranch creates branch and saves original', () => {
  gitInt._reset();
  const dir = tmpGitRepo();
  const result = gitInt.createRunBranch('test-slug', { cwd: dir });
  assert.ok(result.ok);
  assert.equal(result.branch, 'tumble-dry/test-slug');
  assert.equal(result.previous, 'master');
  assert.equal(currentBranch(dir), 'tumble-dry/test-slug');
  assert.ok(gitBranch(dir).includes('tumble-dry/test-slug'));
});

test('GIT-01: createRunBranch checks out existing branch', () => {
  gitInt._reset();
  const dir = tmpGitRepo();
  // Create branch first time
  gitInt.createRunBranch('existing', { cwd: dir });
  // Go back to master
  execSync('git checkout master', { cwd: dir, stdio: 'pipe' });
  // Re-create should just checkout
  gitInt._reset();
  const result = gitInt.createRunBranch('existing', { cwd: dir });
  assert.ok(result.ok);
  assert.equal(currentBranch(dir), 'tumble-dry/existing');
});

test('GIT-02: commitRound creates commit with metadata in message', () => {
  gitInt._reset();
  const dir = tmpGitRepo();
  gitInt.createRunBranch('round-test', { cwd: dir });

  // Create run dir structure
  const runDir = path.join(dir, '.tumble-dry', 'round-test');
  const roundDirPath = path.join(runDir, 'round-1');
  fs.mkdirSync(roundDirPath, { recursive: true });
  fs.writeFileSync(path.join(roundDirPath, 'aggregate.md'), '# agg\n');
  fs.writeFileSync(path.join(runDir, 'working.md'), '# working\n');
  fs.writeFileSync(path.join(runDir, 'source.path'), '/tmp/fake.md');
  fs.writeFileSync(path.join(runDir, 'artifact.path'), path.join(runDir, 'working.md'));
  fs.writeFileSync(path.join(runDir, 'source-format.json'), '{}');

  const result = gitInt.commitRound(runDir, 1, {
    material: 3,
    structural: 1,
    drift: 0.15,
    converged: false,
  }, { cwd: dir });

  assert.ok(result.ok, `commitRound failed: ${JSON.stringify(result)}`);
  assert.ok(result.hash);

  // Verify commit message contains metadata
  const log = gitLog(dir);
  assert.ok(log.includes('round 1 redraft'));
  assert.ok(log.includes('3 material'));
  assert.ok(log.includes('1 structural'));
  assert.ok(log.includes('drift=0.15'));
  assert.ok(log.includes('converged=no'));
});

test('GIT-02: commit message format is machine-parseable', () => {
  gitInt._reset();
  const dir = tmpGitRepo();
  gitInt.createRunBranch('parse-test', { cwd: dir });

  const runDir = path.join(dir, '.tumble-dry', 'parse-test');
  const roundDirPath = path.join(runDir, 'round-2');
  fs.mkdirSync(roundDirPath, { recursive: true });
  fs.writeFileSync(path.join(roundDirPath, 'aggregate.md'), '# agg\n');
  fs.writeFileSync(path.join(runDir, 'working.md'), '# working\n');

  gitInt.commitRound(runDir, 2, {
    material: 0,
    structural: 0,
    drift: 0.05,
    converged: true,
  }, { cwd: dir });

  const log = execSync('git log -1 --format=%s', { cwd: dir, encoding: 'utf-8' }).trim();
  // Parse the commit message
  const match = log.match(/tumble-dry: round (\d+) redraft \(([^)]+)\) -- (\d+) material, (\d+) structural, drift=([\d.]+), converged=(yes|no)/);
  assert.ok(match, `Commit message not parseable: ${log}`);
  assert.equal(match[1], '2');
  assert.equal(match[2], 'parse-test');
  assert.equal(match[3], '0');
  assert.equal(match[4], '0');
  assert.equal(match[5], '0.05');
  assert.equal(match[6], 'yes');
});

test('GIT-03: commitFinal stages FINAL.md + polish-log.md', () => {
  gitInt._reset();
  const dir = tmpGitRepo();
  gitInt.createRunBranch('final-test', { cwd: dir });

  const runDir = path.join(dir, '.tumble-dry', 'final-test');
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(path.join(runDir, 'FINAL.md'), '# Final\n');
  fs.writeFileSync(path.join(runDir, 'polish-log.md'), '# Log\n');

  const result = gitInt.commitFinal(runDir, 'final-test', { cwd: dir });
  assert.ok(result.ok);

  const log = gitLog(dir);
  assert.ok(log.includes('converged (final-test)'));
  assert.ok(log.includes('FINAL.md'));
});

test('GIT-03: commitApply stages source file', () => {
  gitInt._reset();
  const dir = tmpGitRepo();
  gitInt.createRunBranch('apply-test', { cwd: dir });

  const sourcePath = path.join(dir, 'source.md');
  fs.writeFileSync(sourcePath, '# Applied final\n');

  const result = gitInt.commitApply(sourcePath, 'apply-test', { cwd: dir });
  assert.ok(result.ok);

  const log = gitLog(dir);
  assert.ok(log.includes('apply to source'));
});

test('returnToOriginalBranch goes back', () => {
  gitInt._reset();
  const dir = tmpGitRepo();
  gitInt.createRunBranch('return-test', { cwd: dir });
  assert.equal(currentBranch(dir), 'tumble-dry/return-test');

  const result = gitInt.returnToOriginalBranch({ cwd: dir });
  assert.ok(result.ok);
  assert.equal(currentBranch(dir), 'master');
});

test('GIT-06: disable() prevents all git operations', () => {
  gitInt._reset();
  gitInt.disable();
  const dir = tmpGitRepo();

  const r1 = gitInt.createRunBranch('disabled-test', { cwd: dir });
  assert.equal(r1.ok, false);
  assert.equal(r1.reason, 'disabled');

  const r2 = gitInt.commitRound('/fake', 1, {}, { cwd: dir });
  assert.equal(r2.ok, false);

  const r3 = gitInt.commitFinal('/fake', 'x', { cwd: dir });
  assert.equal(r3.ok, false);

  gitInt._reset(); // clean up for other tests
});

test('GIT-06: non-repo auto-disables', () => {
  gitInt._reset();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'td-norepo-'));
  const result = gitInt.createRunBranch('no-repo', { cwd: dir });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'not_a_repo');
  assert.ok(!gitInt.isEnabled());
  gitInt._reset();
});

test('full round-trip: branch, round commits, final, apply, return', () => {
  gitInt._reset();
  const dir = tmpGitRepo();

  // Create branch
  const br = gitInt.createRunBranch('full-test', { cwd: dir });
  assert.ok(br.ok);

  // Set up run dir
  const runDir = path.join(dir, '.tumble-dry', 'full-test');

  // Round 1
  const r1Dir = path.join(runDir, 'round-1');
  fs.mkdirSync(r1Dir, { recursive: true });
  fs.writeFileSync(path.join(r1Dir, 'aggregate.md'), '# round 1\n');
  fs.writeFileSync(path.join(runDir, 'working.md'), '# v1\n');
  const c1 = gitInt.commitRound(runDir, 1, { material: 5, structural: 2, drift: 0.22, converged: false }, { cwd: dir });
  assert.ok(c1.ok);

  // Round 2
  const r2Dir = path.join(runDir, 'round-2');
  fs.mkdirSync(r2Dir, { recursive: true });
  fs.writeFileSync(path.join(r2Dir, 'aggregate.md'), '# round 2\n');
  fs.writeFileSync(path.join(runDir, 'working.md'), '# v2\n');
  const c2 = gitInt.commitRound(runDir, 2, { material: 0, structural: 0, drift: 0.08, converged: true }, { cwd: dir });
  assert.ok(c2.ok);

  // Finalize
  fs.writeFileSync(path.join(runDir, 'FINAL.md'), '# final\n');
  fs.writeFileSync(path.join(runDir, 'polish-log.md'), '# log\n');
  const cf = gitInt.commitFinal(runDir, 'full-test', { cwd: dir });
  assert.ok(cf.ok);

  // Apply to source
  const sourcePath = path.join(dir, 'article.md');
  fs.writeFileSync(sourcePath, '# final applied\n');
  const ca = gitInt.commitApply(sourcePath, 'full-test', { cwd: dir });
  assert.ok(ca.ok);

  // Return
  const ret = gitInt.returnToOriginalBranch({ cwd: dir });
  assert.ok(ret.ok);
  assert.equal(currentBranch(dir), 'master');

  // Verify 4 commits on branch (+ initial)
  const log = execSync('git log tumble-dry/full-test --oneline', { cwd: dir, encoding: 'utf-8' }).trim();
  const lines = log.split('\n');
  assert.equal(lines.length, 5, `Expected 5 commits (initial + 4), got ${lines.length}: ${log}`);
});
