/**
 * REGISTER-01..04: Structural finding register.
 *
 * Persistent structural findings that survive multiple review rounds are
 * acknowledged here so they stop re-firing and blocking convergence.
 * The register lives at `.tumble-dry/<slug>/structural-register.json`.
 *
 * Schema per entry:
 *   {
 *     finding_summary: string,
 *     registered_at_round: number,
 *     status: 'acknowledged' | 'deferred' | 'resolved',
 *     reason: string,
 *     tokens: string[],   // for jaccard matching
 *   }
 */

const fs = require('fs');
const path = require('path');

function registerPath(runDir) {
  return path.join(runDir, 'structural-register.json');
}

function loadRegister(runDir) {
  const p = registerPath(runDir);
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); }
  catch { return []; }
}

function saveRegister(runDir, register) {
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(registerPath(runDir), JSON.stringify(register, null, 2) + '\n', 'utf-8');
}

function tokenize(s) {
  return (s || '').toLowerCase().match(/[a-z0-9']+/g) || [];
}

function jaccard(a, b) {
  const sa = new Set(a);
  const sb = new Set(b);
  if (!sa.size || !sb.size) return 0;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  return inter / (sa.size + sb.size - inter);
}

/**
 * Check if a finding summary matches any registered entry.
 * Uses jaccard token overlap >= 0.5 threshold.
 */
function isRegistered(register, findingSummary, threshold = 0.5) {
  const tokens = tokenize(findingSummary);
  for (const entry of register) {
    const entryTokens = entry.tokens || tokenize(entry.finding_summary);
    if (jaccard(tokens, entryTokens) >= threshold) return true;
  }
  return false;
}

/**
 * REGISTER-02: Auto-register structural findings that persisted from the
 * prior round. New-this-round findings are NOT registered.
 *
 * @param {string} runDir - Run directory
 * @param {number} currentRound - Current round number
 * @param {object} aggregateJson - Current round's aggregate.json data
 * @param {object|null} priorAggregateJson - Prior round's aggregate.json data
 * @returns {object[]} Updated register
 */
function autoRegister(runDir, currentRound, aggregateJson, priorAggregateJson) {
  if (!priorAggregateJson || currentRound <= 1) return loadRegister(runDir);

  const register = loadRegister(runDir);
  const priorClusters = (priorAggregateJson.clusters || [])
    .filter(c => c.severity === 'material' && c.structural);
  const currentClusters = (aggregateJson.clusters || [])
    .filter(c => c.severity === 'material' && c.structural);

  for (const cur of currentClusters) {
    const curTokens = cur.tokens || tokenize(cur.summary);
    // Check if this finding also existed in prior round
    const inPrior = priorClusters.some(pc => {
      const pcTokens = pc.tokens || tokenize(pc.summary);
      return jaccard(curTokens, pcTokens) >= 0.5;
    });
    if (!inPrior) continue; // new this round -- skip
    // Check if already registered
    if (isRegistered(register, cur.summary)) continue;
    register.push({
      finding_summary: cur.summary,
      registered_at_round: currentRound,
      status: 'acknowledged',
      reason: 'auto-registered: persisted from prior round',
      tokens: curTokens,
    });
  }

  saveRegister(runDir, register);
  return register;
}

/**
 * REGISTER-04: Manual registration via CLI.
 */
function manualRegister(runDir, findingSummary, opts = {}) {
  const register = loadRegister(runDir);
  if (isRegistered(register, findingSummary)) {
    return { added: false, reason: 'already_registered', register };
  }
  register.push({
    finding_summary: findingSummary,
    registered_at_round: opts.round || 0,
    status: opts.status || 'acknowledged',
    reason: opts.reason || 'user registered',
    tokens: tokenize(findingSummary),
  });
  saveRegister(runDir, register);
  return { added: true, register };
}

/**
 * Count how many material findings in an aggregate are NOT registered.
 * Used for convergence: registered findings don't block convergence.
 */
function unregisteredMaterialCount(register, aggregateJson) {
  const materialClusters = (aggregateJson.clusters || [])
    .filter(c => c.severity === 'material');
  let count = 0;
  for (const c of materialClusters) {
    if (!isRegistered(register, c.summary)) count++;
  }
  return count;
}

module.exports = {
  loadRegister,
  saveRegister,
  autoRegister,
  manualRegister,
  isRegistered,
  unregisteredMaterialCount,
  registerPath,
  // Exposed for testing
  tokenize: tokenize,
  jaccard: jaccard,
};
