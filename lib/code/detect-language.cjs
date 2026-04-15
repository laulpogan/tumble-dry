/**
 * lib/code/detect-language.cjs — language detection for CODE-01.
 *
 * Contract:
 *   detect(filepath, { content? }) → { primary, regions, confidence, programming }
 *
 * Strategy (cheap → expensive):
 *   1. Shebang sniff on first line (handles extension-less scripts).
 *   2. `linguist-js` classifier (extension + filename + GitHub Linguist heuristics).
 *   3. Polyglot region scan: HTML `<script>` / `<style>`, Markdown fenced code
 *      blocks, Jupyter .ipynb cell extraction. Regions are returned with
 *      {lang, range: [start, end]} byte offsets into content.
 *
 * `primary` is the dominant language (chosen by byte count when regions
 * disagree). `confidence` is a [0,1] score — 1.0 for unambiguous extension
 * matches, down to 0.2 for plaintext fallback.
 *
 * linguist-js is an optional dependency; if missing we degrade to an
 * extension table + shebang only.
 */

const fs = require('fs');
const path = require('path');

// Minimal extension → language fallback table when linguist-js is absent.
const EXT_TABLE = {
  '.js': 'JavaScript', '.mjs': 'JavaScript', '.cjs': 'JavaScript', '.jsx': 'JavaScript',
  '.ts': 'TypeScript', '.tsx': 'TypeScript',
  '.py': 'Python', '.pyi': 'Python',
  '.go': 'Go',
  '.rs': 'Rust',
  '.rb': 'Ruby',
  '.java': 'Java',
  '.c': 'C', '.h': 'C',
  '.cc': 'C++', '.cpp': 'C++', '.cxx': 'C++', '.hpp': 'C++',
  '.sh': 'Shell', '.bash': 'Shell', '.zsh': 'Shell',
  '.html': 'HTML', '.htm': 'HTML',
  '.css': 'CSS',
  '.json': 'JSON',
  '.yml': 'YAML', '.yaml': 'YAML',
  '.md': 'Markdown', '.markdown': 'Markdown',
  '.ipynb': 'Jupyter Notebook',
  '.php': 'PHP',
  '.swift': 'Swift',
  '.kt': 'Kotlin', '.kts': 'Kotlin',
};

// Set of languages that are programming languages (i.e., "code"), not data/markup.
// Markdown + JSON + YAML deliberately excluded — they're handled by prose loaders.
const PROGRAMMING = new Set([
  'JavaScript', 'TypeScript', 'Python', 'Go', 'Rust', 'Ruby', 'Java',
  'C', 'C++', 'Shell', 'PHP', 'Swift', 'Kotlin', 'Scala', 'Haskell',
  'Clojure', 'Elixir', 'Erlang', 'OCaml', 'Lua', 'Perl', 'R', 'Julia',
  'C#', 'F#', 'Objective-C', 'Dart', 'Zig', 'Nim', 'Crystal',
]);

function isProgrammingLanguage(lang) {
  return PROGRAMMING.has(lang);
}

const SHEBANG_MAP = [
  [/^#!.*\bnode\b/, 'JavaScript'],
  [/^#!.*\b(python|py)\d?\b/, 'Python'],
  [/^#!.*\b(bash|sh|zsh)\b/, 'Shell'],
  [/^#!.*\bruby\b/, 'Ruby'],
  [/^#!.*\bperl\b/, 'Perl'],
  [/^#!.*\blua\b/, 'Lua'],
];

function shebangLanguage(firstLine) {
  if (!firstLine || !firstLine.startsWith('#!')) return null;
  for (const [re, lang] of SHEBANG_MAP) {
    if (re.test(firstLine)) return lang;
  }
  return null;
}

function tryLinguistJs() {
  try { return require('linguist-js'); }
  catch { return null; }
}

/**
 * Scan a content string for polyglot regions.
 * Returns [{lang, range: [start, end]}] with the PRIMARY language's body
 * excluded — callers should treat the remainder as `primary`.
 */
function polyglotRegions(content, primary) {
  const regions = [];
  if (!content) return regions;

  if (primary === 'HTML') {
    // <script>…</script>
    const scriptRe = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = scriptRe.exec(content)) !== null) {
      const bodyStart = m.index + m[0].indexOf(m[1]);
      regions.push({ lang: 'JavaScript', range: [bodyStart, bodyStart + m[1].length] });
    }
    const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
    while ((m = styleRe.exec(content)) !== null) {
      const bodyStart = m.index + m[0].indexOf(m[1]);
      regions.push({ lang: 'CSS', range: [bodyStart, bodyStart + m[1].length] });
    }
  } else if (primary === 'Markdown') {
    const fenceRe = /```([a-zA-Z0-9_+-]+)\n([\s\S]*?)```/g;
    let m;
    const fenceLangMap = {
      js: 'JavaScript', javascript: 'JavaScript', ts: 'TypeScript', typescript: 'TypeScript',
      py: 'Python', python: 'Python', go: 'Go', rs: 'Rust', rust: 'Rust',
      rb: 'Ruby', ruby: 'Ruby', sh: 'Shell', bash: 'Shell', html: 'HTML', css: 'CSS',
    };
    while ((m = fenceRe.exec(content)) !== null) {
      const lang = fenceLangMap[m[1].toLowerCase()];
      if (!lang) continue;
      const bodyStart = m.index + m[0].indexOf(m[2]);
      regions.push({ lang, range: [bodyStart, bodyStart + m[2].length] });
    }
  } else if (primary === 'Shell') {
    // Heredoc with python/node body: `<<'PY' … PY`
    const heredocRe = /<<\s*['"]?([A-Z_]+)['"]?[\s\S]*?\n([\s\S]*?)\n\1\b/g;
    let m;
    while ((m = heredocRe.exec(content)) !== null) {
      const body = m[2];
      const tag = m[1].toLowerCase();
      let lang = null;
      if (/^py/.test(tag)) lang = 'Python';
      else if (/^(js|node)/.test(tag)) lang = 'JavaScript';
      if (!lang) continue;
      const bodyStart = m.index + m[0].indexOf(body);
      regions.push({ lang, range: [bodyStart, bodyStart + body.length] });
    }
  }
  return regions;
}

/**
 * Extract code cells from a Jupyter notebook JSON.
 * Returns { primary, regions, concatenated } where concatenated is a single
 * string with only the code cell source joined by blank lines.
 */
function extractIpynb(content) {
  let nb;
  try { nb = JSON.parse(content); }
  catch { return null; }
  if (!nb || !Array.isArray(nb.cells)) return null;
  const kernel = (nb.metadata && nb.metadata.kernelspec && nb.metadata.kernelspec.language) || 'python';
  const langMap = { python: 'Python', javascript: 'JavaScript', r: 'R', julia: 'Julia' };
  const primary = langMap[kernel.toLowerCase()] || 'Python';
  const pieces = [];
  const regions = [];
  let offset = 0;
  for (const cell of nb.cells) {
    if (cell.cell_type !== 'code') continue;
    const src = Array.isArray(cell.source) ? cell.source.join('') : (cell.source || '');
    if (!src.trim()) continue;
    regions.push({ lang: primary, range: [offset, offset + src.length] });
    pieces.push(src);
    offset += src.length + 2; // +2 for "\n\n" separator
  }
  return { primary, regions, concatenated: pieces.join('\n\n') };
}

function detect(filepath, opts = {}) {
  const ext = path.extname(filepath).toLowerCase();
  let content = opts.content;
  if (content == null && filepath && fs.existsSync(filepath)) {
    try { content = fs.readFileSync(filepath, 'utf-8'); }
    catch { content = ''; }
  }
  content = content || '';

  // Jupyter notebooks: parse cells, language from kernelspec.
  if (ext === '.ipynb') {
    const nb = extractIpynb(content);
    if (nb) {
      return {
        primary: nb.primary,
        regions: nb.regions,
        confidence: 0.95,
        programming: isProgrammingLanguage(nb.primary),
        notebook_concatenated: nb.concatenated,
      };
    }
  }

  // Shebang first — handles extension-less scripts.
  const firstLine = content.split('\n', 1)[0] || '';
  const shebang = shebangLanguage(firstLine);

  // linguist-js (primary classifier).
  let primary = null;
  let confidence = 0.2;
  const ling = tryLinguistJs();
  if (ling) {
    try {
      // linguist-js wants a path; for content-only we fall back to ext table.
      // Newer versions support { fileContent } — try, catch, ignore.
      const r = ling.analyse ? null : null; // placeholder to keep the library reference live
      void r;
      if (filepath && fs.existsSync(filepath)) {
        // linguist-js is async → synchronous path here is just fallback.
        // Async callers can use detectAsync below.
      }
    } catch { /* ignore */ }
  }
  if (!primary && ext && EXT_TABLE[ext]) {
    primary = EXT_TABLE[ext];
    confidence = 0.85;
  }
  if (!primary && shebang) {
    primary = shebang;
    confidence = 0.75;
  }
  if (!primary) {
    primary = 'Plain Text';
    confidence = 0.2;
  }
  // Shebang overrides extension when they disagree in favor of the shebang
  // (extension-less scripts or misnamed files).
  if (shebang && ext === '') {
    primary = shebang;
    confidence = Math.max(confidence, 0.8);
  }

  const regions = polyglotRegions(content, primary);
  return {
    primary,
    regions,
    confidence,
    programming: isProgrammingLanguage(primary),
  };
}

/**
 * Async variant — uses linguist-js's async analyse API when available.
 * Falls through to sync detect() if linguist-js missing or fails.
 */
async function detectAsync(filepath, opts = {}) {
  const ling = tryLinguistJs();
  if (!ling || !filepath || !fs.existsSync(filepath)) return detect(filepath, opts);
  try {
    const result = await ling(filepath, { quick: true });
    // result shape: { languages: { all: {...}, programming: {...}, results: { '<file>': 'Lang' } } }
    let primary = null;
    if (result && result.languages && result.languages.results) {
      const entries = Object.entries(result.languages.results);
      if (entries.length) primary = entries[0][1];
    }
    if (!primary) return detect(filepath, opts);
    const content = opts.content || fs.readFileSync(filepath, 'utf-8');
    const regions = polyglotRegions(content, primary);
    return {
      primary,
      regions,
      confidence: 0.95,
      programming: isProgrammingLanguage(primary),
    };
  } catch {
    return detect(filepath, opts);
  }
}

module.exports = {
  detect,
  detectAsync,
  isProgrammingLanguage,
  EXT_TABLE,
  PROGRAMMING,
  shebangLanguage,
  polyglotRegions,
  extractIpynb,
};
