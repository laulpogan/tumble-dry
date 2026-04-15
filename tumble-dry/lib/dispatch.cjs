/**
 * Dispatch backend selector. Picks API vs gastown per config/env.
 *
 * Env/config resolution:
 *   - TUMBLE_DRY_BACKEND=api (default if ANTHROPIC_API_KEY set) | gastown | auto
 *   - Config `dispatch_backend` in .tumble-dry.yml overrides TUMBLE_DRY_BACKEND.
 *
 * auto = prefer API if key present, fall back to gastown if available, else error.
 */

const { execSync } = require('child_process');
const api = require('./dispatch-api.cjs');

function gastownAvailable() {
  try {
    const bridge = require('path').resolve(__dirname, 'gastown-bridge.sh');
    const out = execSync(`"${bridge}" available 2>/dev/null`, { encoding: 'utf-8' }).trim();
    return out === 'true';
  } catch { return false; }
}

function selectBackend(config) {
  const forced = config && config.dispatch_backend;
  const envForced = process.env.TUMBLE_DRY_BACKEND;
  const choice = forced || envForced || 'api';  // API is the default, period.
  if (choice === 'api') return 'api';
  if (choice === 'gastown') {
    if (!gastownAvailable()) {
      throw new Error('dispatch_backend=gastown requested but gastown daemon not running');
    }
    return 'gastown';
  }
  if (choice === 'auto') {
    // Legacy: prefer API if key present, fall back to gastown if available.
    try { require('./dispatch-api.cjs'); } catch {}
    if (process.env.ANTHROPIC_API_KEY) return 'api';
    if (gastownAvailable()) return 'gastown';
    throw new Error('dispatch_backend=auto: set ANTHROPIC_API_KEY or start gastown daemon');
  }
  throw new Error(`unknown dispatch_backend: ${choice}`);
}

/**
 * Generic wave dispatch. Records: [{ name, briefFile, targetFilename }].
 * Returns [{ name, target, error? }].
 */
async function dispatchWave({ records, roundDir, config }) {
  const backend = selectBackend(config);
  if (backend === 'api') {
    const out = await api.dispatchBatch({ records, roundDir });
    return out.map(r => ({
      name: r.record.name,
      target: r.target,
      error: r.error,
      usage: r.usage,
    }));
  }
  // gastown: delegate to shell bridge; shell handles parallelism
  return dispatchWaveGastown({ records, roundDir });
}

function dispatchWaveGastown({ records, roundDir }) {
  // Shell-driven path — invoke bridge's dispatch-batch.
  const { execSync: run } = require('child_process');
  const bridge = require('path').resolve(__dirname, 'gastown-bridge.sh');
  const slug = require('path').basename(require('path').dirname(roundDir));
  const round = parseInt(require('path').basename(roundDir).replace('round-', ''), 10);

  const input = records.map(r => `${r.name}\t${r.briefFile}`).join('\n') + '\n';
  const existingConvoy = existingConvoyFor(roundDir) || '';
  const out = run(
    `printf '%s' "$STDIN" | "${bridge}" dispatch-batch ${shq(slug)} ${round} ${shq(existingConvoy)}`,
    { encoding: 'utf-8', env: { ...process.env, STDIN: input } }
  );
  const beads = {};
  let convoy = existingConvoy;
  for (const line of out.split('\n')) {
    if (line.startsWith('BEAD:')) {
      const [, name, bead] = line.match(/^BEAD:([^:]+):(.+)$/) || [];
      if (name) beads[name] = bead;
    } else if (line.startsWith('CONVOY:')) {
      convoy = line.slice(7);
    }
  }
  // Wait for all beads
  const beadIds = Object.values(beads).join(' ');
  run(`"${bridge}" wait "${beadIds}" 15 1800`, { stdio: 'inherit' });
  // Reconstruct each into its targetFilename
  const results = [];
  for (const r of records) {
    const bead = beads[r.name];
    if (!bead) { results.push({ name: r.name, error: 'dispatch failed' }); continue; }
    try {
      run(`"${bridge}" reconstruct "${bead}" "${roundDir}" "${r.name}" "${r.targetFilename}"`, { stdio: 'pipe' });
      run(`"${bridge}" store "${roundDir}" "${r.name}" "${bead}" "${convoy}"`, { stdio: 'pipe' });
      results.push({ name: r.name, target: require('path').join(roundDir, r.targetFilename) });
    } catch (e) {
      results.push({ name: r.name, error: String(e) });
    }
  }
  return results;
}

function existingConvoyFor(roundDir) {
  const fs = require('fs');
  const beadsPath = require('path').join(roundDir, 'beads.json');
  if (!fs.existsSync(beadsPath)) {
    // try previous round
    const runDir = require('path').dirname(roundDir);
    const rounds = fs.readdirSync(runDir).filter(n => /^round-\d+$/.test(n)).sort();
    for (let i = rounds.length - 1; i >= 0; i--) {
      const p = require('path').join(runDir, rounds[i], 'beads.json');
      if (fs.existsSync(p)) {
        try { return JSON.parse(fs.readFileSync(p, 'utf-8')).convoy_id || ''; } catch {}
      }
    }
    return '';
  }
  try { return JSON.parse(fs.readFileSync(beadsPath, 'utf-8')).convoy_id || ''; } catch { return ''; }
}

function shq(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'"; }

module.exports = { selectBackend, dispatchWave };
