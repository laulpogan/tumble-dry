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
  const abs = path.resolve(cwd, artifactPath);
  const slug = slugify(path.basename(abs));
  const runDir = path.join(cwd, '.tumble-dry', slug);
  fs.mkdirSync(runDir, { recursive: true });
  return { slug, runDir, artifactAbs: abs };
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

module.exports = { initRun, roundDir, currentRound, writeFinal, slugify };
