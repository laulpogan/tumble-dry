const fs = require('fs');
const path = require('path');

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'artifact';
}

function initRun(cwd, artifactPath) {
  // Non-destructive by default. The source file at `artifactPath` is treated
  // as immutable. We copy it once into runDir/working.md and operate on that.
  // - artifact.path points to working.md (so all CLI subcommands read it transparently)
  // - source.path records the original location for provenance + final --apply
  // - history/round-0-original.md preserves the untouched original byte-for-byte
  const sourceAbs = path.resolve(cwd, artifactPath);
  const slug = slugify(path.basename(sourceAbs));
  const runDir = path.join(cwd, '.tumble-dry', slug);
  const historyDir = path.join(runDir, 'history');
  fs.mkdirSync(historyDir, { recursive: true });

  const workingPath = path.join(runDir, 'working.md');
  const originalSnapshot = path.join(historyDir, 'round-0-original.md');

  // Only copy on fresh init. If a working copy already exists, leave it
  // (resume case — we're continuing a prior run).
  if (!fs.existsSync(workingPath)) {
    fs.copyFileSync(sourceAbs, workingPath);
    fs.copyFileSync(sourceAbs, originalSnapshot);
  }
  fs.writeFileSync(path.join(runDir, 'source.path'), sourceAbs);

  return { slug, runDir, artifactAbs: workingPath, sourceAbs, historyDir };
}

function snapshotHistory(runDir, roundN, label, srcPath) {
  // label: 'input' (before editor) | 'output' (after editor) | other
  const historyDir = path.join(runDir, 'history');
  fs.mkdirSync(historyDir, { recursive: true });
  const dest = path.join(historyDir, `round-${roundN}-${label}.md`);
  fs.copyFileSync(srcPath, dest);
  return dest;
}

function roundDir(runDir, n) {
  const d = path.join(runDir, `round-${n}`);
  fs.mkdirSync(d, { recursive: true });
  return d;
}

function currentRound(runDir) {
  if (!fs.existsSync(runDir)) return 0;
  const rounds = fs.readdirSync(runDir)
    .filter(n => /^round-\d+$/.test(n))
    .map(n => parseInt(n.replace('round-', ''), 10))
    .sort((a, b) => a - b);
  return rounds.length ? rounds[rounds.length - 1] : 0;
}

function writeFinal(runDir, content, summary) {
  fs.writeFileSync(path.join(runDir, 'FINAL.md'), content, 'utf-8');
  fs.writeFileSync(path.join(runDir, 'polish-log.md'), summary, 'utf-8');
}

module.exports = { initRun, roundDir, currentRound, writeFinal, slugify, snapshotHistory };
