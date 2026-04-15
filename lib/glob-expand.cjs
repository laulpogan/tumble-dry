/**
 * BATCH-01: expand a mix of file paths, directories, and shell-style globs
 * into a concrete list of source artifact paths.
 *
 * - Plain file path: included as-is.
 * - Directory: recursive walk, filtered to known artifact extensions.
 * - Glob ("*.md", "site/**\/*.md", etc.): expanded via our own minimatch-lite.
 *
 * Intentionally zero-dep: the plugin has no `package.json` for core and
 * pulling minimatch/glob just for this adds install friction. We implement
 * the narrow subset we need (`*`, `**`, `?`, `{a,b}`).
 */

const fs = require('fs');
const path = require('path');

const ARTIFACT_EXT = new Set([
  '.md', '.markdown', '.txt',
  '.docx', '.pptx', '.xlsx', '.pdf',
  '.py', '.js', '.ts', '.tsx', '.jsx', '.mjs', '.cjs',
  '.go', '.rs', '.rb', '.java', '.c', '.cc', '.cpp', '.h', '.hpp', '.sh',
]);

const SKIP_DIRS = new Set(['node_modules', '.git', '.tumble-dry', 'dist', 'build', '.next', '.cache']);

function isGlob(pattern) {
  return /[*?{]/.test(pattern);
}

function globToRegex(glob) {
  // Escape regex specials except our glob tokens
  let re = '';
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        // ** matches any path (including separators)
        re += '.*';
        i += 2;
        if (glob[i] === '/') i++;
      } else {
        re += '[^/]*';
        i++;
      }
    } else if (c === '?') { re += '[^/]'; i++; }
    else if (c === '{') {
      const close = glob.indexOf('}', i);
      if (close === -1) { re += '\\{'; i++; }
      else {
        const alts = glob.slice(i + 1, close).split(',').map(a => a.replace(/[.+^$()|[\]\\]/g, '\\$&'));
        re += `(?:${alts.join('|')})`;
        i = close + 1;
      }
    } else if (/[.+^$()|[\]\\]/.test(c)) { re += '\\' + c; i++; }
    else { re += c; i++; }
  }
  return new RegExp('^' + re + '$');
}

function walkDir(rootAbs, maxDepth = 10) {
  const out = [];
  function rec(dir, depth) {
    if (depth > maxDepth) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (SKIP_DIRS.has(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) rec(full, depth + 1);
      else if (e.isFile()) {
        const ext = path.extname(e.name).toLowerCase();
        if (ARTIFACT_EXT.has(ext)) out.push(full);
      }
    }
  }
  rec(rootAbs, 0);
  return out;
}

function expandGlob(cwd, pattern) {
  // Locate the static prefix before any glob metachar
  const parts = pattern.split('/');
  let staticEnd = 0;
  for (let i = 0; i < parts.length; i++) {
    if (isGlob(parts[i])) break;
    staticEnd = i + 1;
  }
  const staticPart = parts.slice(0, staticEnd).join('/') || '.';
  const globPart = parts.slice(staticEnd).join('/');
  const base = path.resolve(cwd, staticPart);
  if (!fs.existsSync(base)) return [];
  if (!globPart) {
    // Caller passed a directory or file without glob
    const stat = fs.statSync(base);
    if (stat.isDirectory()) return walkDir(base);
    return [base];
  }
  const re = globToRegex(globPart);
  const all = walkDir(base);
  return all.filter(f => re.test(path.relative(base, f).replace(/\\/g, '/')));
}

function expandInputs(cwd, inputs) {
  const out = new Set();
  for (const raw of inputs) {
    const input = raw.trim();
    if (!input) continue;
    if (isGlob(input)) {
      for (const f of expandGlob(cwd, input)) out.add(f);
      continue;
    }
    const abs = path.resolve(cwd, input);
    if (!fs.existsSync(abs)) continue;
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      for (const f of walkDir(abs)) out.add(f);
    } else if (stat.isFile()) {
      out.add(abs);
    }
  }
  return Array.from(out).sort();
}

module.exports = { expandInputs, expandGlob, walkDir, globToRegex, isGlob, ARTIFACT_EXT };
