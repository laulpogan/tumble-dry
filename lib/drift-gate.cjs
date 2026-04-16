/**
 * DRIFT-01..02: Drift hard gate per artifact type.
 *
 * When editor's content_drift exceeds the type's drift_threshold from
 * personas/configs.json, the redraft is split into:
 *   - safe-redraft.md   — only unchanged + modified sentences where overlap > threshold
 *   - structural-redraft.md — the full proposed redraft (all changes)
 *
 * In interactive mode: both surfaced for user choice.
 * In headless/batch mode: full redraft applied, flagged in REPORT.md,
 * committed separately with distinct message.
 */

const fs = require('fs');
const path = require('path');
const { voiceDriftReport, splitSentences, sentenceOverlap } = require('./voice.cjs');

/**
 * Build a "safe" redraft that keeps only sentences from the proposed redraft
 * whose overlap with the original exceeds driftThreshold. Sentences that are
 * too different are replaced with the original sentence they best match, or
 * dropped if they are net-new insertions.
 */
function buildSafeRedraft(beforeText, afterText, driftThreshold = 0.25) {
  const beforeSentences = splitSentences(beforeText);
  const afterSentences = splitSentences(afterText);
  const safe = [];

  for (const aSent of afterSentences) {
    let bestOverlap = 0;
    let bestBefore = null;
    for (const bSent of beforeSentences) {
      const ov = sentenceOverlap(aSent, bSent);
      if (ov > bestOverlap) {
        bestOverlap = ov;
        bestBefore = bSent;
      }
    }
    if (bestOverlap >= 0.85) {
      // unchanged — keep the after version (trivial edits OK)
      safe.push(aSent);
    } else if (bestOverlap >= driftThreshold) {
      // modified but within threshold — keep
      safe.push(aSent);
    } else if (bestBefore && bestOverlap >= 0.3) {
      // too different — revert to original sentence
      safe.push(bestBefore);
    }
    // else: net-new insertion with no good match — drop from safe version
  }

  return safe.join(' ');
}

/**
 * Check drift against threshold and split if exceeded.
 *
 * @param {string} runDir - Run directory
 * @param {number} round - Current round number
 * @param {string} beforePath - Path to the before text (working.md)
 * @param {string} afterPath - Path to the proposed redraft
 * @param {number} driftThreshold - From configs.json[artifact_type].drift_threshold
 * @returns {object} { exceeded, content_drift, threshold, safe_path?, structural_path? }
 */
function checkDriftGate(runDir, round, beforePath, afterPath, driftThreshold) {
  const beforeText = fs.readFileSync(beforePath, 'utf-8');
  const afterText = fs.readFileSync(afterPath, 'utf-8');
  const report = voiceDriftReport(beforeText, afterText);
  const contentDrift = report.content_drift;

  const roundDir = path.join(runDir, `round-${round}`);
  fs.mkdirSync(roundDir, { recursive: true });

  if (contentDrift <= driftThreshold) {
    return {
      exceeded: false,
      content_drift: contentDrift,
      threshold: driftThreshold,
    };
  }

  // Drift exceeded — split the redraft
  const safeText = buildSafeRedraft(beforeText, afterText, driftThreshold);
  const safePath = path.join(roundDir, 'safe-redraft.md');
  const structuralPath = path.join(roundDir, 'structural-redraft.md');

  fs.writeFileSync(safePath, safeText + '\n', 'utf-8');
  fs.writeFileSync(structuralPath, afterText, 'utf-8');

  return {
    exceeded: true,
    content_drift: contentDrift,
    threshold: driftThreshold,
    safe_path: safePath,
    structural_path: structuralPath,
  };
}

/**
 * DRIFT-02: In headless/batch mode, commit structural redraft separately.
 */
function commitStructuralRedraft(runDir, round, contentDrift, driftThreshold, opts = {}) {
  const gitInt = require('./git-integration.cjs');
  if (!gitInt.isEnabled()) return { ok: false, reason: 'git_disabled' };

  const cwd = opts.cwd || process.cwd();
  const slug = path.basename(runDir);
  const relRunDir = path.relative(cwd, runDir);
  const roundDirRel = path.join(relRunDir, `round-${round}`);

  try {
    const { execSync } = require('child_process');
    execSync(`git add "${path.join(roundDirRel, 'structural-redraft.md')}" "${path.join(roundDirRel, 'safe-redraft.md')}"`, {
      cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
    });
    const msg = `tumble-dry: round ${round} structural redraft (drift=${contentDrift.toFixed(2)}, exceeds threshold ${driftThreshold.toFixed(2)})`;
    execSync(`git commit -m "${msg}"`, {
      cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
    });
    const hash = execSync('git rev-parse --short HEAD', {
      cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return { ok: true, hash, message: msg };
  } catch (err) {
    return { ok: false, reason: 'commit_failed', error: err.message };
  }
}

module.exports = {
  checkDriftGate,
  buildSafeRedraft,
  commitStructuralRedraft,
};
