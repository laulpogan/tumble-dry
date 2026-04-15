const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULTS = {
  voice_refs: [],
  audience_override: null,
  panel_size: 5,
  convergence_threshold: 2,
  max_rounds: 10,
  fine_tune_model_path: null,
  dispatch_backend: 'api',  // 'api' (default) | 'gastown' (opt-in) | 'auto' (legacy)
};

function expandHome(p) {
  if (!p) return p;
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2));
  if (p === '~') return os.homedir();
  return p;
}

function parseYaml(src) {
  // Minimal YAML parser: supports top-level scalars, null, numbers, quoted strings,
  // and list-of-strings. No nested maps needed for .tumble-dry.yml.
  const out = {};
  const lines = src.split('\n');
  let currentKey = null;
  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, '').replace(/\s+$/, '');
    if (!line.trim()) { currentKey = null; continue; }
    if (line.startsWith('  - ')) {
      if (!currentKey) continue;
      const val = line.slice(4).trim().replace(/^["']|["']$/g, '');
      out[currentKey] = out[currentKey] || [];
      out[currentKey].push(val);
      continue;
    }
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    const rawVal = m[2].trim();
    if (rawVal === '') { currentKey = key; out[key] = []; continue; }
    currentKey = null;
    if (rawVal === '[]') { out[key] = []; continue; }
    if (rawVal === '{}') { out[key] = {}; continue; }
    if (rawVal === 'null' || rawVal === '~') { out[key] = null; continue; }
    if (rawVal === 'true') { out[key] = true; continue; }
    if (rawVal === 'false') { out[key] = false; continue; }
    if (/^-?\d+$/.test(rawVal)) { out[key] = parseInt(rawVal, 10); continue; }
    if (/^-?\d*\.\d+$/.test(rawVal)) { out[key] = parseFloat(rawVal); continue; }
    out[key] = rawVal.replace(/^["']|["']$/g, '');
  }
  return out;
}

function loadConfigFrom(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return parseYaml(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    return null;
  }
}

function loadConfig(cwd) {
  const candidates = [
    path.join(cwd, '.tumble-dry.yml'),
    path.join(cwd, '.tumble-dry.yaml'),
    path.join(os.homedir(), '.tumble-dry', 'config.yml'),
  ];
  let merged = { ...DEFAULTS };
  for (const p of candidates) {
    const loaded = loadConfigFrom(p);
    if (loaded) {
      merged = { ...merged, ...loaded };
      merged._source = p;
      break;
    }
  }
  if (Array.isArray(merged.voice_refs)) {
    merged.voice_refs = merged.voice_refs.map(expandHome);
  }
  if (merged.fine_tune_model_path) {
    merged.fine_tune_model_path = expandHome(merged.fine_tune_model_path);
  }
  return merged;
}

module.exports = { loadConfig, DEFAULTS, expandHome };
