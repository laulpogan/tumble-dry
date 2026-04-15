/**
 * HEADLESS-02: status.json surface.
 *
 * The orchestrator writes `.tumble-dry/<slug>/status.json` after every phase
 * boundary. The slash command polls the file once per round and renders a
 * single progress line. For batch runs, this file lives under
 * `.tumble-dry/<batch-slug>/status.json` and aggregates per-file progress.
 *
 * Schema:
 *   {
 *     kind: 'single' | 'batch',
 *     slug: string,                      // run slug (or batch-slug)
 *     round: number,                     // current round number
 *     phase: 'init' | 'audience' | 'auditor' | 'reviewers-dispatched'
 *          | 'reviewers-returned' | 'aggregate' | 'editor' | 'drift'
 *          | 'round-complete' | 'converged' | 'max-rounds' | 'failed',
 *     reviewers_dispatched: number,
 *     reviewers_returned: number,
 *     material_count: number,
 *     structural_count: number,
 *     drift_score: number,
 *     converged: boolean,
 *     eta_rounds: number,                // rough estimate of rounds remaining
 *     last_updated: ISO8601 string,
 *     started_at: ISO8601 string,
 *     files?: Array<{ slug, round, phase, converged }>,  // batch only
 *     error?: string,                    // present if phase === 'failed'
 *   }
 */

const fs = require('fs');
const path = require('path');

function statusPath(runDir) {
  return path.join(runDir, 'status.json');
}

function readStatus(runDir) {
  const p = statusPath(runDir);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); }
  catch { return null; }
}

function writeStatus(runDir, patch) {
  fs.mkdirSync(runDir, { recursive: true });
  const cur = readStatus(runDir) || {};
  const next = {
    ...cur,
    ...patch,
    last_updated: new Date().toISOString(),
  };
  if (!cur.started_at && !patch.started_at) next.started_at = next.last_updated;
  fs.writeFileSync(statusPath(runDir), JSON.stringify(next, null, 2) + '\n', 'utf-8');
  return next;
}

function initStatus(runDir, { kind, slug }) {
  const now = new Date().toISOString();
  const st = {
    kind,
    slug,
    round: 0,
    phase: 'init',
    reviewers_dispatched: 0,
    reviewers_returned: 0,
    material_count: 0,
    structural_count: 0,
    drift_score: 0,
    converged: false,
    eta_rounds: null,
    started_at: now,
    last_updated: now,
  };
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(statusPath(runDir), JSON.stringify(st, null, 2) + '\n', 'utf-8');
  return st;
}

/**
 * Classify a run as "orphan" if its status.json hasn't updated in staleMs.
 * Default stale = 1 hour (3_600_000 ms) per STATUS-01.
 */
function isOrphan(status, staleMs = 3_600_000) {
  if (!status || !status.last_updated) return true;
  if (status.converged) return false;
  if (['max-rounds', 'failed'].includes(status.phase)) return false;
  const last = new Date(status.last_updated).getTime();
  if (!Number.isFinite(last)) return true;
  return (Date.now() - last) > staleMs;
}

/**
 * Render a one-line progress string for the slash command to print after
 * each orchestrator wave. Main session never sees raw status.json contents.
 */
function renderProgressLine(status) {
  if (!status) return '[tumble-dry] status: no data';
  const { round, phase, reviewers_dispatched, reviewers_returned, material_count, drift_score, converged } = status;
  if (converged) return `[tumble-dry] round ${round} — CONVERGED (material=${material_count}, drift=${drift_score})`;
  if (phase === 'max-rounds') return `[tumble-dry] round ${round} — hit max_rounds (material=${material_count}, drift=${drift_score})`;
  if (phase === 'failed') return `[tumble-dry] FAILED at round ${round}: ${status.error || 'unknown'}`;
  if (phase === 'reviewers-dispatched') return `[tumble-dry] round ${round} — reviewers ${reviewers_returned}/${reviewers_dispatched} returned`;
  return `[tumble-dry] round ${round} — ${phase} (material=${material_count}, drift=${drift_score})`;
}

module.exports = { statusPath, readStatus, writeStatus, initStatus, isOrphan, renderProgressLine };
