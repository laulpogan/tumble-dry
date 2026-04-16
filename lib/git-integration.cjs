/**
 * GIT-01..06: Git integration for tumble-dry runs.
 *
 * Creates a branch per run, commits per-round artifacts with convergence
 * metadata, and optionally applies FINAL back to source. All operations
 * are best-effort — if git fails (not a repo, dirty index, permissions),
 * we log a warning and continue without git.
 */

const { execSync } = require('child_process');
const path = require('path');

let _originalBranch = null;
let _disabled = false;

function git(args, opts = {}) {
  const cwd = opts.cwd || process.cwd();
  try {
    return execSync(`git ${args}`, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10000,
    }).trim();
  } catch (err) {
    if (opts.ignoreError) return null;
    throw err;
  }
}

/**
 * Check whether cwd is inside a git repository.
 */
function isGitRepo(cwd) {
  try {
    git('rev-parse --is-inside-work-tree', { cwd });
    return true;
  } catch {
    return false;
  }
}

/**
 * GIT-01: Create (or checkout) a branch `tumble-dry/<slug>`.
 * Saves original branch name for returnToOriginalBranch().
 */
function createRunBranch(slug, opts = {}) {
  const cwd = opts.cwd || process.cwd();
  if (_disabled) return { ok: false, reason: 'disabled' };
  if (!isGitRepo(cwd)) {
    _disabled = true;
    return { ok: false, reason: 'not_a_repo' };
  }

  try {
    // Save current branch for later return
    _originalBranch = git('rev-parse --abbrev-ref HEAD', { cwd });
    const branchName = `tumble-dry/${slug}`;

    // Check if branch exists
    const exists = git(`show-ref --verify --quiet refs/heads/${branchName}`, { cwd, ignoreError: true });
    if (exists !== null) {
      // Branch doesn't exist — create it
      git(`checkout -b ${branchName}`, { cwd });
    } else {
      // Branch exists — check it out
      git(`checkout ${branchName}`, { cwd });
    }
    return { ok: true, branch: branchName, previous: _originalBranch };
  } catch (err) {
    console.error(`[tumble-dry] git: branch creation failed: ${err.message}`);
    return { ok: false, reason: 'branch_failed', error: err.message };
  }
}

/**
 * GIT-02: Commit round artifacts with convergence metadata.
 * Stages .tumble-dry/<slug>/round-<N>/** + working.md.
 */
function commitRound(runDir, round, metadata, opts = {}) {
  const cwd = opts.cwd || process.cwd();
  if (_disabled) return { ok: false, reason: 'disabled' };

  try {
    const slug = path.basename(runDir);
    const relRunDir = path.relative(cwd, runDir);
    const roundDirRel = path.join(relRunDir, `round-${round}`);
    const workingRel = path.join(relRunDir, 'working.md');

    // Stage round dir + working.md
    git(`add "${roundDirRel}"`, { cwd, ignoreError: true });
    git(`add "${workingRel}"`, { cwd, ignoreError: true });
    // Also stage any new metadata files (source-format.json, source.path, etc.)
    git(`add "${relRunDir}/source-format.json" "${relRunDir}/source.path" "${relRunDir}/artifact.path"`, { cwd, ignoreError: true });
    // Stage history dir (round-0 snapshots)
    git(`add "${path.join(relRunDir, 'history')}"`, { cwd, ignoreError: true });

    const material = metadata.material || 0;
    const structural = metadata.structural || 0;
    const drift = metadata.drift != null ? metadata.drift.toFixed(2) : '0.00';
    const converged = metadata.converged ? 'yes' : 'no';

    const msg = `tumble-dry: round ${round} redraft (${slug}) -- ${material} material, ${structural} structural, drift=${drift}, converged=${converged}`;

    // Check if there's anything to commit
    const status = git('diff --cached --name-only', { cwd });
    if (!status) return { ok: false, reason: 'nothing_to_commit' };

    git(`commit -m "${msg}"`, { cwd });
    const hash = git('rev-parse --short HEAD', { cwd });
    return { ok: true, hash, message: msg };
  } catch (err) {
    console.error(`[tumble-dry] git: round commit failed: ${err.message}`);
    return { ok: false, reason: 'commit_failed', error: err.message };
  }
}

/**
 * GIT-03: Commit FINAL.md + polish-log.md + REPORT.md.
 */
function commitFinal(runDir, slug, opts = {}) {
  const cwd = opts.cwd || process.cwd();
  if (_disabled) return { ok: false, reason: 'disabled' };

  try {
    const relRunDir = path.relative(cwd, runDir);
    const files = ['FINAL.md', 'polish-log.md', 'REPORT.md']
      .map(f => path.join(relRunDir, f));

    for (const f of files) {
      git(`add "${f}"`, { cwd, ignoreError: true });
    }

    const msg = `tumble-dry: converged (${slug}) -- FINAL.md`;

    const status = git('diff --cached --name-only', { cwd });
    if (!status) return { ok: false, reason: 'nothing_to_commit' };

    git(`commit -m "${msg}"`, { cwd });
    const hash = git('rev-parse --short HEAD', { cwd });
    return { ok: true, hash, message: msg };
  } catch (err) {
    console.error(`[tumble-dry] git: final commit failed: ${err.message}`);
    return { ok: false, reason: 'commit_failed', error: err.message };
  }
}

/**
 * GIT-03 / APPLY-01: Commit the source file after --apply-to-source.
 */
function commitApply(sourcePath, slug, opts = {}) {
  const cwd = opts.cwd || process.cwd();
  if (_disabled) return { ok: false, reason: 'disabled' };

  try {
    const relSource = path.relative(cwd, sourcePath);
    git(`add "${relSource}"`, { cwd });

    const msg = `tumble-dry: apply to source (${slug})`;

    const status = git('diff --cached --name-only', { cwd });
    if (!status) return { ok: false, reason: 'nothing_to_commit' };

    git(`commit -m "${msg}"`, { cwd });
    const hash = git('rev-parse --short HEAD', { cwd });
    return { ok: true, hash, message: msg };
  } catch (err) {
    console.error(`[tumble-dry] git: apply commit failed: ${err.message}`);
    return { ok: false, reason: 'commit_failed', error: err.message };
  }
}

/**
 * Return to the branch we were on before createRunBranch().
 */
function returnToOriginalBranch(opts = {}) {
  const cwd = opts.cwd || process.cwd();
  if (_disabled || !_originalBranch) return { ok: false, reason: 'no_original_branch' };

  try {
    git(`checkout ${_originalBranch}`, { cwd });
    const branch = _originalBranch;
    _originalBranch = null;
    return { ok: true, branch };
  } catch (err) {
    console.error(`[tumble-dry] git: return to original branch failed: ${err.message}`);
    return { ok: false, reason: 'checkout_failed', error: err.message };
  }
}

/**
 * GIT-04: Print PR creation hint (and optionally create PR if gh is available).
 */
function prHint(slug, runDir) {
  const branchName = `tumble-dry/${slug}`;
  const reportPath = path.join(runDir, 'REPORT.md');

  const lines = [
    '',
    '--- PR hint ---',
    `git push origin ${branchName}`,
    `gh pr create --title "tumble-dry: polish ${slug}" --body "$(cat ${reportPath})"`,
    '--- end ---',
    '',
  ];

  console.log(lines.join('\n'));

  // Check if gh is available
  try {
    execSync('which gh', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return { gh_available: true, branch: branchName, report: reportPath };
  } catch {
    return { gh_available: false, branch: branchName, report: reportPath };
  }
}

/**
 * Reset module state (for testing).
 */
function _reset() {
  _originalBranch = null;
  _disabled = false;
}

/**
 * Disable git integration (--no-git flag or not a repo).
 */
function disable() {
  _disabled = true;
}

/**
 * Check if git integration is currently active.
 */
function isEnabled() {
  return !_disabled;
}

module.exports = {
  isGitRepo,
  createRunBranch,
  commitRound,
  commitFinal,
  commitApply,
  returnToOriginalBranch,
  prHint,
  disable,
  isEnabled,
  _reset,
};
