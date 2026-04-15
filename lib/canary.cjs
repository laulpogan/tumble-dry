/**
 * CANARY-01/02: zero-config first-run voice inference.
 *
 * When no `.tumble-dry.yml` is found, derive voice_refs from the user's own
 * git history by grepping commits for prose-heavy files and sampling added
 * lines. Falls back to source-self-sampling when git is unavailable or yields
 * nothing usable. Never blocks — the first run must not require user setup.
 *
 * Output shape matches lib/voice.cjs::sampleExcerpts():
 *   [{ file: string, text: string }, ...]
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PROSE_GLOBS = ['*.md', '*.markdown', 'README*', 'docs/**', 'blog/**', 'posts/**'];
const CACHE_FILENAME = '_canary-voice.json';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 1 day — refresh daily during active writing

function gitAvailable(cwd) {
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd, stdio: 'pipe' });
    return true;
  } catch { return false; }
}

function gitUserName(cwd) {
  try {
    return execFileSync('git', ['config', 'user.name'], { cwd, encoding: 'utf-8' }).trim();
  } catch { return null; }
}

function getRecentCommits(cwd, author, limit = 50) {
  try {
    const args = ['log', `--author=${author}`, '--pretty=format:%H', `-n`, String(limit), '--'];
    for (const g of PROSE_GLOBS) args.push(g);
    const out = execFileSync('git', args, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    return out.split('\n').filter(Boolean);
  } catch { return []; }
}

function getCommitProse(cwd, sha, maxChars = 4000) {
  try {
    // Unified diff; +lines (additions) only, strip leading '+' and metadata.
    const out = execFileSync('git', ['show', '--pretty=format:', '--unified=0', sha], {
      cwd, encoding: 'utf-8', maxBuffer: 8 * 1024 * 1024, stdio: ['pipe', 'pipe', 'ignore'],
    });
    const lines = out.split('\n');
    const added = [];
    for (const l of lines) {
      if (!l.startsWith('+') || l.startsWith('+++')) continue;
      const text = l.slice(1);
      // Skip trivial lines (empty, single punctuation, pure code-looking).
      if (text.trim().length < 20) continue;
      if (/^[{}()\[\];]*$/.test(text.trim())) continue;
      added.push(text);
    }
    const joined = added.join('\n').trim();
    if (!joined) return null;
    return joined.length > maxChars ? joined.slice(0, maxChars) : joined;
  } catch { return null; }
}

/**
 * Infer voice excerpts from the user's prose-author history. Returns
 * `{ excerpts: [...], source: 'git_history' | 'self' | 'none', commits_sampled: N }`.
 */
function inferVoiceFromGit(cwd, sampleSize = 5) {
  if (!gitAvailable(cwd)) return { excerpts: [], source: 'none', commits_sampled: 0 };
  const author = gitUserName(cwd);
  if (!author) return { excerpts: [], source: 'none', commits_sampled: 0 };

  const shas = getRecentCommits(cwd, author, 50);
  if (!shas.length) return { excerpts: [], source: 'none', commits_sampled: 0 };

  const picks = shas.slice(0, sampleSize);
  const excerpts = [];
  for (const sha of picks) {
    const prose = getCommitProse(cwd, sha, 1500);
    if (prose) excerpts.push({ file: `git:${sha.slice(0, 7)}`, text: prose });
  }
  if (!excerpts.length) return { excerpts: [], source: 'none', commits_sampled: picks.length };
  return { excerpts, source: 'git_history', commits_sampled: picks.length };
}

function cachePath(cwd) {
  return path.join(cwd, '.tumble-dry', CACHE_FILENAME);
}

function readCache(cwd) {
  const p = cachePath(cwd);
  if (!fs.existsSync(p)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
    if (!data.cached_at) return null;
    const age = Date.now() - new Date(data.cached_at).getTime();
    if (age > CACHE_TTL_MS) return null;
    return data;
  } catch { return null; }
}

function writeCache(cwd, payload) {
  const p = cachePath(cwd);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify({ ...payload, cached_at: new Date().toISOString() }, null, 2), 'utf-8');
}

/**
 * Top-level entry: produce inferred defaults for a zero-config first run.
 * Returns `{ voice_refs: [], voice_excerpts: [...], source, commits_sampled, notice }`.
 *
 * `voice_refs` is always [] because we bypass the filesystem-ref flow entirely —
 * we inject excerpts directly. Downstream builders should prefer `voice_excerpts`
 * when present.
 */
function inferDefaults(cwd, { cache = true, sampleSize = 5 } = {}) {
  if (cache) {
    const cached = readCache(cwd);
    if (cached) return cached;
  }
  const git = inferVoiceFromGit(cwd, sampleSize);
  const notice = git.source === 'git_history'
    ? `first run — using inferred defaults: voice_refs=git_history(N=${git.commits_sampled} commits, K=${git.excerpts.length} excerpts)`
    : `first run — git history unavailable; falling back to source-self-sampling`;
  const payload = {
    voice_refs: [],
    voice_excerpts: git.excerpts,
    source: git.source,
    commits_sampled: git.commits_sampled,
    notice,
  };
  if (cache && git.source !== 'none') {
    try { writeCache(cwd, payload); } catch { /* best effort */ }
  }
  return payload;
}

/**
 * Dump inferred config to `.tumble-dry.yml` for editing. Used by the new
 * `tumble-dry config init` subcommand. Idempotent: refuses if file exists.
 */
function dumpConfigYaml(cwd, { overwrite = false } = {}) {
  const yml = path.join(cwd, '.tumble-dry.yml');
  if (fs.existsSync(yml) && !overwrite) {
    return { written: false, reason: 'exists', path: yml };
  }
  const inferred = inferDefaults(cwd, { cache: false });
  const body = [
    '# tumble-dry config (inferred from zero-config canary)',
    '# Edit these values; delete the file to revert to inferred defaults.',
    '',
    'voice_refs: []              # list of file / dir paths with past writing',
    'panel_size: 5               # reviewers per round',
    'convergence_threshold: 2    # material findings that still block convergence',
    'max_rounds: 4',
    'drift_threshold: 0.25       # content-drift cap (0-1) before convergence blocks',
    '',
    `# Inferred: ${inferred.notice}`,
    '',
  ].join('\n');
  fs.writeFileSync(yml, body, 'utf-8');
  return { written: true, path: yml, inferred };
}

module.exports = { inferDefaults, inferVoiceFromGit, dumpConfigYaml, cachePath };
