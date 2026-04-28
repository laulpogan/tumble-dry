/**
 * target-loader — resolve a `--review <target>` argument (or `:read <url>`,
 * `:paste <path>`) into { label, content } where `content` is markdown text
 * the persona can react to.
 *
 * Three input shapes:
 *   - URL (http/https)              → fetch, strip HTML to readable text
 *   - file path (any extension)     → if recognized by lib/loader.cjs, project to markdown;
 *                                     else read as UTF-8 text
 *   - directory                     → concatenate files (skipping binaries / huge files)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const TEXT_EXTS = new Set([
  '.md', '.markdown', '.txt', '.json', '.yml', '.yaml', '.toml', '.ini',
  '.html', '.htm', '.css', '.js', '.cjs', '.mjs', '.ts', '.tsx', '.jsx',
  '.py', '.rb', '.go', '.rs', '.java', '.c', '.h', '.cpp', '.hpp', '.sh',
]);

const MAX_FILE_BYTES = 2 * 1024 * 1024;        // 2 MB per file
const MAX_DIR_BYTES = 10 * 1024 * 1024;        // 10 MB per directory bundle
const FETCH_TIMEOUT_MS = 20000;

async function loadTarget(input) {
  if (!input) throw new Error('target-loader: empty target');
  if (/^https?:\/\//i.test(input)) return loadUrl(input);
  const abs = path.resolve(process.cwd(), input);
  if (!fs.existsSync(abs)) throw new Error(`target-loader: not found: ${input}`);
  const stat = fs.statSync(abs);
  if (stat.isDirectory()) return loadDirectory(abs);
  return loadFile(abs);
}

async function loadFile(abs) {
  const ext = path.extname(abs).toLowerCase();
  // Try the tumble-dry loader first for office formats / code-aware projection.
  try {
    const tdLoader = require('../../lib/loader.cjs');
    const result = await tdLoader.loadAsync(abs);
    if (result && result.ok && typeof result.markdown === 'string' && result.markdown.length > 0) {
      return {
        label: path.basename(abs),
        path: abs,
        content: result.markdown,
        format: result.format || ext.replace(/^\./, ''),
        warnings: result.warnings || [],
      };
    }
  } catch (_) { /* fall through to plain read */ }

  const stat = fs.statSync(abs);
  if (stat.size > MAX_FILE_BYTES) {
    throw new Error(`target-loader: file too large (${stat.size} bytes > ${MAX_FILE_BYTES})`);
  }
  if (!TEXT_EXTS.has(ext)) {
    process.stderr.write(`[mask] warning: ${ext || '(no extension)'} not in known text list — reading as UTF-8 anyway\n`);
  }
  const content = fs.readFileSync(abs, 'utf-8');
  return { label: path.basename(abs), path: abs, content, format: ext.replace(/^\./, '') || 'text', warnings: [] };
}

async function loadDirectory(absDir) {
  const files = walkDir(absDir, { maxBytes: MAX_DIR_BYTES });
  const parts = [];
  parts.push(`# Directory bundle: ${path.basename(absDir)}\n`);
  for (const f of files) {
    const rel = path.relative(absDir, f);
    const text = fs.readFileSync(f, 'utf-8');
    parts.push(`\n## ${rel}\n\n\`\`\`${path.extname(f).slice(1)}\n${text}\n\`\`\`\n`);
  }
  if (files.length === 0) {
    parts.push('\n*(no readable text files found)*\n');
  }
  return {
    label: path.basename(absDir) + '/',
    path: absDir,
    content: parts.join(''),
    format: 'directory',
    warnings: [],
  };
}

function walkDir(root, { maxBytes }) {
  const out = [];
  let total = 0;
  function visit(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      if (['node_modules', 'dist', 'build', '.git'].includes(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { visit(full); continue; }
      const ext = path.extname(e.name).toLowerCase();
      if (!TEXT_EXTS.has(ext)) continue;
      const stat = fs.statSync(full);
      if (stat.size > MAX_FILE_BYTES) continue;
      if (total + stat.size > maxBytes) return;
      total += stat.size;
      out.push(full);
    }
  }
  visit(root);
  return out;
}

function loadUrl(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https://') ? https : http;
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'tumble-dry-mask/0.1 (+https://github.com/laulpogan/tumble-dry)',
        Accept: 'text/html,text/plain,text/markdown,*/*;q=0.5',
      },
      timeout: FETCH_TIMEOUT_MS,
    }, (res) => {
      // Follow one redirect.
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        const next = new URL(res.headers.location, url).toString();
        return loadUrl(next).then(resolve, reject);
      }
      if (res.statusCode >= 400) {
        res.resume();
        return reject(new Error(`target-loader: ${url} → HTTP ${res.statusCode}`));
      }
      const chunks = [];
      let total = 0;
      const cap = 4 * 1024 * 1024; // 4 MB cap on URL fetch
      res.on('data', (c) => {
        total += c.length;
        if (total > cap) { req.destroy(new Error('URL response too large')); return; }
        chunks.push(c);
      });
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8');
        const ct = (res.headers['content-type'] || '').toLowerCase();
        const text = ct.includes('html') ? htmlToText(raw) : raw;
        resolve({
          label: url,
          path: url,
          content: text,
          format: ct.includes('html') ? 'html' : (ct.includes('markdown') ? 'markdown' : 'text'),
          warnings: [],
        });
      });
    });
    req.on('timeout', () => req.destroy(new Error(`target-loader: ${url} timed out`)));
    req.on('error', reject);
  });
}

/**
 * Lightweight HTML → text: strip script/style, collapse whitespace, decode a
 * few common entities. Not a real parser; good enough for "what does this
 * landing page actually say."
 */
function htmlToText(html) {
  let s = html;
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, '');
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<(br|p|div|li|h[1-6]|tr)\b[^>]*>/gi, '\n');
  s = s.replace(/<[^>]+>/g, '');
  s = s.replace(/&nbsp;/g, ' ');
  s = s.replace(/&amp;/g, '&');
  s = s.replace(/&lt;/g, '<');
  s = s.replace(/&gt;/g, '>');
  s = s.replace(/&quot;/g, '"');
  s = s.replace(/&#39;/g, "'");
  s = s.replace(/[ \t]+\n/g, '\n');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

module.exports = { loadTarget, loadFile, loadUrl, loadDirectory, htmlToText };
