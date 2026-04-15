/**
 * lib/loaders/code.cjs — CODE-03 code projection loader.
 *
 * Detects a single code file or a code directory and emits a markdown
 * projection with fenced code blocks tagged with language. The projection is
 * what reviewers read; the AST-drift reporter (lib/code/ast-drift.cjs) reads
 * the original bytes separately.
 *
 * Single file:  one fenced block, language tag from detect-language.cjs.
 * Directory:    `## <relpath>` header per file + fenced block, sorted path.
 *               Heuristic trigger: any of {package.json, go.mod, Cargo.toml,
 *               pyproject.toml, Gemfile} present at root OR ≥3 files with
 *               known programming-language extensions.
 *
 * Priority: 20 — runs AFTER markdown(10) so plain .md stays prose, but
 * BEFORE docx/pptx/xlsx/pdf.
 *
 * Follows the typed-result loader contract (FORMAT-01a).
 */

const fs = require('fs');
const path = require('path');
const { detect: detectLang, isProgrammingLanguage, EXT_TABLE } = require('../code/detect-language.cjs');

const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const MAX_DIR_FILES = 200; // truncate large dirs; reviewers can't read 10k files anyway

const extensions = Object.keys(EXT_TABLE).filter(e =>
  isProgrammingLanguage(EXT_TABLE[e])
);

const MANIFEST_FILES = new Set([
  'package.json', 'go.mod', 'Cargo.toml', 'pyproject.toml',
  'Gemfile', 'build.gradle', 'pom.xml', 'Makefile', 'CMakeLists.txt',
]);

function fenceLangTag(language) {
  const map = {
    JavaScript: 'javascript', TypeScript: 'typescript', Python: 'python',
    Go: 'go', Rust: 'rust', Ruby: 'ruby', Java: 'java',
    C: 'c', 'C++': 'cpp', Shell: 'bash', HTML: 'html', CSS: 'css',
    PHP: 'php', Swift: 'swift', Kotlin: 'kotlin',
  };
  return map[language] || language.toLowerCase().replace(/[^a-z0-9+-]/g, '');
}

function looksLikeCodeDir(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return false; }
  const names = entries.map(e => e.name);
  for (const m of names) if (MANIFEST_FILES.has(m)) return true;
  let codeHits = 0;
  for (const e of entries) {
    if (!e.isFile()) continue;
    const ext = path.extname(e.name).toLowerCase();
    if (extensions.includes(ext)) codeHits++;
    if (codeHits >= 3) return true;
  }
  return false;
}

function detect(filepath) {
  let stat;
  try { stat = fs.statSync(filepath); } catch { return false; }
  if (stat.isDirectory()) return looksLikeCodeDir(filepath);
  const ext = path.extname(filepath).toLowerCase();
  if (!extensions.includes(ext)) return false;
  const lang = EXT_TABLE[ext];
  return isProgrammingLanguage(lang);
}

function loadSingle(filepath) {
  const stat = fs.statSync(filepath);
  if (stat.size > MAX_INPUT_BYTES) {
    return { ok: false, reason: 'too_large', detail: `file is ${stat.size} bytes; max ${MAX_INPUT_BYTES}.` };
  }
  let text;
  try { text = fs.readFileSync(filepath, 'utf-8'); }
  catch (err) { return { ok: false, reason: 'corrupt', detail: `read failed: ${err.message}` }; }
  const warnings = [];
  if (text.charCodeAt(0) === 0xfeff) { text = text.slice(1); warnings.push('stripped UTF-8 BOM'); }
  if (!text.trim()) return { ok: false, reason: 'empty', detail: 'file has no non-whitespace content' };
  const langInfo = detectLang(filepath, { content: text });
  const tag = fenceLangTag(langInfo.primary);
  const base = path.basename(filepath);
  const markdown =
    `# Code artifact: \`${base}\`\n\n` +
    `**Language:** ${langInfo.primary} (confidence ${langInfo.confidence})\n\n` +
    (langInfo.regions && langInfo.regions.length
      ? `**Polyglot regions detected:** ${langInfo.regions.length} — see embedded language tags.\n\n`
      : '') +
    `<!-- code-file: ${base} lang=${langInfo.primary} -->\n` +
    '```' + tag + '\n' +
    text + (text.endsWith('\n') ? '' : '\n') +
    '```\n';
  return {
    ok: true,
    markdown,
    format: 'code',
    warnings,
    meta: {
      artifact_kind: 'code',
      language: langInfo.primary,
      confidence: langInfo.confidence,
      regions: langInfo.regions,
      programming: langInfo.programming,
      files: [{ path: base, language: langInfo.primary, bytes: text.length }],
    },
  };
}

function walkDir(dir, rootAbs, out) {
  if (out.length > MAX_DIR_FILES) return;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue; // skip .git, .tumble-dry, dotfiles
    if (e.name === 'node_modules' || e.name === 'dist' || e.name === 'build') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { walkDir(full, rootAbs, out); continue; }
    if (!e.isFile()) continue;
    const ext = path.extname(e.name).toLowerCase();
    if (!extensions.includes(ext)) continue;
    const lang = EXT_TABLE[ext];
    if (!isProgrammingLanguage(lang)) continue;
    out.push({ abs: full, rel: path.relative(rootAbs, full), language: lang, ext });
    if (out.length > MAX_DIR_FILES) return;
  }
}

function loadDir(dirpath) {
  const files = [];
  walkDir(dirpath, dirpath, files);
  if (!files.length) {
    return { ok: false, reason: 'empty', detail: `no recognizable code files under ${dirpath}` };
  }
  files.sort((a, b) => a.rel.localeCompare(b.rel));
  const truncated = files.length > MAX_DIR_FILES;
  const included = truncated ? files.slice(0, MAX_DIR_FILES) : files;

  const warnings = [];
  if (truncated) warnings.push(`directory has >${MAX_DIR_FILES} code files; truncated to first ${MAX_DIR_FILES}`);

  const byLang = {};
  for (const f of included) byLang[f.language] = (byLang[f.language] || 0) + 1;
  const primaryLang = Object.entries(byLang).sort((a, b) => b[1] - a[1])[0][0];

  const lines = [];
  lines.push(`# Code directory: \`${path.basename(dirpath)}\``);
  lines.push('');
  lines.push(`**Files:** ${included.length}${truncated ? ` (truncated from ${files.length})` : ''}`);
  lines.push(`**Primary language:** ${primaryLang}`);
  lines.push(`**Languages present:** ${Object.entries(byLang).map(([l, n]) => `${l} (${n})`).join(', ')}`);
  lines.push('');

  let totalBytes = 0;
  for (const f of included) {
    let body;
    try {
      const st = fs.statSync(f.abs);
      if (st.size > 512 * 1024) {
        lines.push(`<!-- code-file: ${f.rel} lang=${f.language} skipped=oversize -->`);
        lines.push(`## \`${f.rel}\` (${f.language})`);
        lines.push('');
        lines.push(`_Skipped — file is ${st.size} bytes (>512KB threshold for per-file inclusion)._`);
        lines.push('');
        warnings.push(`skipped oversize file: ${f.rel} (${st.size} bytes)`);
        continue;
      }
      body = fs.readFileSync(f.abs, 'utf-8');
    } catch (err) {
      warnings.push(`failed to read ${f.rel}: ${err.message}`);
      continue;
    }
    if (body.charCodeAt(0) === 0xfeff) body = body.slice(1);
    totalBytes += body.length;
    if (totalBytes > MAX_INPUT_BYTES) {
      warnings.push(`hit total-bytes cap (${MAX_INPUT_BYTES}) after ${f.rel} — remaining files omitted from projection`);
      break;
    }
    const tag = fenceLangTag(f.language);
    lines.push(`<!-- code-file: ${f.rel} lang=${f.language} -->`);
    lines.push(`## \`${f.rel}\` (${f.language})`);
    lines.push('');
    lines.push('```' + tag);
    lines.push(body.endsWith('\n') ? body.slice(0, -1) : body);
    lines.push('```');
    lines.push('');
  }

  return {
    ok: true,
    markdown: lines.join('\n'),
    format: 'code-dir',
    warnings,
    meta: {
      artifact_kind: 'code',
      language: primaryLang,
      confidence: 0.9,
      regions: [],
      programming: true,
      files: included.map(f => ({ path: f.rel, language: f.language })),
    },
  };
}

function load(filepath) {
  try {
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) return loadDir(filepath);
    return loadSingle(filepath);
  } catch (err) {
    return { ok: false, reason: 'corrupt', detail: `loader threw: ${err.message}` };
  }
}

module.exports = { extensions, detect, load, priority: 20, fenceLangTag };
