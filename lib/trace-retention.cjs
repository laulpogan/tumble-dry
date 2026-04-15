/**
 * HARDEN-05: Trace retention.
 *
 * Keep the last N rounds of traces uncompressed for easy debugging; gzip
 * older rounds in place (preserves filenames with .gz suffix) so disk
 * stays bounded across long runs. Writes an INDEX.md per round listing
 * what's full vs archived.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function gzipFileInPlace(srcPath) {
  const dst = srcPath + '.gz';
  if (fs.existsSync(dst)) {
    // Already archived — just remove the original if it still exists.
    try { fs.unlinkSync(srcPath); } catch {}
    return dst;
  }
  const buf = fs.readFileSync(srcPath);
  fs.writeFileSync(dst, zlib.gzipSync(buf));
  fs.unlinkSync(srcPath);
  return dst;
}

function listTraces(tracesDir) {
  if (!fs.existsSync(tracesDir)) return [];
  return fs.readdirSync(tracesDir).filter(n =>
    /\.(json|thinking\.md)$/.test(n) || /\.(json|thinking\.md)\.gz$/.test(n)
  );
}

function writeTraceIndex(roundDir, archived) {
  const tracesDir = path.join(roundDir, 'traces');
  if (!fs.existsSync(tracesDir)) return null;
  const entries = listTraces(tracesDir);
  const lines = [
    `# Trace index — ${path.basename(roundDir)}`,
    '',
    `Generated: ${new Date().toISOString()}`,
    `Archived (gzipped): ${archived ? 'yes' : 'no'}`,
    '',
    '## Files',
    '',
  ];
  for (const name of entries.sort()) {
    const full = path.join(tracesDir, name);
    let size = 0;
    try { size = fs.statSync(full).size; } catch {}
    const state = name.endsWith('.gz') ? 'gzipped' : 'full';
    lines.push(`- \`${name}\` — ${state}, ${size}B`);
  }
  lines.push('');
  const indexPath = path.join(tracesDir, 'INDEX.md');
  fs.writeFileSync(indexPath, lines.join('\n'), 'utf-8');
  return indexPath;
}

/**
 * Archive traces for rounds strictly older than (currentRound - retention).
 * Default retention: 3 most-recent rounds kept full.
 *
 * pruneTraces(runDir, 7, { retention: 3 }) → gzips rounds 1..3, leaves 4..7 full.
 */
function pruneTraces(runDir, currentRound, config = {}) {
  const retention = Number.isFinite(config.trace_full_retention)
    ? config.trace_full_retention
    : 3;
  if (!fs.existsSync(runDir)) return { archived: [], kept: [] };
  const archived = [];
  const kept = [];
  const rounds = fs.readdirSync(runDir)
    .map(n => ({ n, m: n.match(/^round-(\d+)$/) }))
    .filter(x => x.m)
    .map(x => ({ name: x.n, num: parseInt(x.m[1], 10) }));
  for (const r of rounds) {
    const rDir = path.join(runDir, r.name);
    const tracesDir = path.join(rDir, 'traces');
    if (!fs.existsSync(tracesDir)) continue;
    const shouldArchive = r.num < (currentRound - retention + 1);
    if (shouldArchive) {
      for (const name of listTraces(tracesDir)) {
        if (name.endsWith('.gz')) continue;
        const full = path.join(tracesDir, name);
        try {
          gzipFileInPlace(full);
          archived.push(path.join(r.name, 'traces', name));
        } catch {}
      }
      writeTraceIndex(rDir, true);
    } else {
      kept.push(r.name);
      writeTraceIndex(rDir, false);
    }
  }
  return { archived, kept, retention };
}

module.exports = { pruneTraces, writeTraceIndex, gzipFileInPlace };
