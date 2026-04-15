const fs = require('fs');
const path = require('path');
const loader = require('./loader.cjs');

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'artifact';
}

// HARDEN-06: ensure `.tumble-dry/` is in project .gitignore on first init.
// Idempotent — checks for the exact line before appending. Creates .gitignore
// if absent. Never touches other lines.
function ensureGitignore(cwd) {
  const gi = path.join(cwd, '.gitignore');
  const line = '.tumble-dry/';
  if (!fs.existsSync(gi)) {
    fs.writeFileSync(gi, line + '\n', 'utf-8');
    return { created: true, appended: false };
  }
  const cur = fs.readFileSync(gi, 'utf-8');
  const lines = cur.split(/\r?\n/);
  // Match `.tumble-dry/` or `.tumble-dry` with optional leading slash.
  const hit = lines.some(l => /^\s*\/?\.tumble-dry\/?\s*$/.test(l));
  if (hit) return { created: false, appended: false };
  const trailing = cur.endsWith('\n') ? '' : '\n';
  fs.appendFileSync(gi, `${trailing}\n# tumble-dry working directories\n${line}\n`);
  return { created: false, appended: true };
}

const MARKDOWN_LIKE = new Set(['markdown', 'txt']);

function roundtripWarning(sourceAbs, format) {
  const ext = path.extname(sourceAbs).toLowerCase() || `.${format}`;
  return [
    '# ROUNDTRIP WARNING',
    '',
    `**Source format:** \`${ext}\` (${format})`,
    '',
    'tumble-dry polishes a **markdown projection** of this source. `FINAL.md` ships as',
    'markdown. Your original binary (`history/round-0-original' + ext + '`) is preserved',
    'byte-for-byte and will NOT be modified.',
    '',
    '**You must manually re-apply FINAL.md content back to the original format** —',
    'tumble-dry v0.5.x does not generate `.docx` / `.pptx` / `.xlsx` / `.pdf` output.',
    '',
    'Structural boundary markers (`<!-- slide:N -->`, `<!-- sheet:Name -->`,',
    '`<!-- page:N -->`) are preserved in the markdown so you can map findings back',
    'to the original slide / sheet / page.',
    '',
    '_This warning was written BEFORE round 1 began (FORMAT-04)._',
    '',
  ].join('\n');
}

// Public helper for CLI surfaces (bin/tumble-dry.cjs, commands/tumble-dry.md).
function loadSource(filepath) {
  return Promise.resolve(loader.load(filepath));
}

async function initRun(cwd, artifactPath) {
  // Non-destructive by default. Source file is immutable. We project to
  // markdown via lib/loader.cjs at init time and preserve the original
  // binary in history/ for provenance (FORMAT-03).
  //
  // - artifact.path points to working.md (all CLI subcommands read it transparently)
  // - source.path records the original absolute path
  // - history/round-0-original.<ext> preserves the untouched original
  // - ROUNDTRIP_WARNING.md written BEFORE round 1 for non-markdown sources (FORMAT-04)
  const sourceAbs = path.resolve(cwd, artifactPath);
  const slug = slugify(path.basename(sourceAbs));
  const runDir = path.join(cwd, '.tumble-dry', slug);
  // HARDEN-06: first-run .gitignore bootstrap.
  const tumbleRoot = path.join(cwd, '.tumble-dry');
  if (!fs.existsSync(tumbleRoot)) {
    try { ensureGitignore(cwd); } catch { /* best effort */ }
  }
  const historyDir = path.join(runDir, 'history');
  fs.mkdirSync(historyDir, { recursive: true });

  const workingPath = path.join(runDir, 'working.md');
  const sourceExt = path.extname(sourceAbs).toLowerCase() || '.md';

  // Resume case: if working.md exists, do not reload — user is continuing.
  if (!fs.existsSync(workingPath)) {
    const result = await loadSource(sourceAbs);
    if (!result || result.ok === false) {
      const reason = (result && result.reason) || 'unknown';
      const detail = (result && result.detail) || 'loader returned no result';
      const err = new Error(
        `failed to load ${sourceAbs}: ${reason} — ${detail}`
      );
      err.reason = reason;
      err.detail = detail;
      throw err;
    }
    // Projection: markdown working copy.
    fs.writeFileSync(workingPath, result.markdown, 'utf-8');
    // Preserve source binary byte-for-byte with its original extension (FORMAT-03).
    const originalSnapshot = path.join(historyDir, `round-0-original${sourceExt}`);
    fs.copyFileSync(sourceAbs, originalSnapshot);
    // For markdown/txt, also write legacy round-0-original.md snapshot so
    // existing tooling (voice sampling, drift anchor) keeps working unchanged.
    if (MARKDOWN_LIKE.has(result.format)) {
      fs.copyFileSync(sourceAbs, path.join(historyDir, 'round-0-original.md'));
    } else {
      // Non-markdown: emit ROUNDTRIP_WARNING.md before round 1 (FORMAT-04).
      fs.writeFileSync(
        path.join(runDir, 'ROUNDTRIP_WARNING.md'),
        roundtripWarning(sourceAbs, result.format),
        'utf-8'
      );
      // Also seed round-0-original.md with the markdown projection so the
      // voice-drift anchor has a markdown reference (it expects .md).
      fs.copyFileSync(workingPath, path.join(historyDir, 'round-0-original.md'));
    }
    // Record loader metadata for downstream consumers.
    fs.writeFileSync(
      path.join(runDir, 'source-format.json'),
      JSON.stringify({
        format: result.format,
        source_ext: sourceExt,
        warnings: result.warnings || [],
        loaded_at: new Date().toISOString(),
      }, null, 2),
      'utf-8'
    );
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

module.exports = { initRun, roundDir, currentRound, writeFinal, slugify, snapshotHistory, ensureGitignore, loadSource };
