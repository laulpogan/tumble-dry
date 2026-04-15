/**
 * .pdf loader — officeparser primary, unpdf fallback (ESM-only, dynamic import).
 *
 * Output schema (FORMAT-02):
 *   <!-- page:N -->
 *   ## Page N
 *
 *   <text>
 *
 * Note: unpdf is ESM-only. Loaded via dynamic import() from CJS.
 */

const fs = require('fs');

const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const extensions = ['.pdf'];

function detect(filepath) {
  return filepath.toLowerCase().endsWith('.pdf');
}

function tryRequire(name) {
  try { return require(name); } catch { return null; }
}

async function loadViaOfficeparser(filepath) {
  const officeparser = tryRequire('officeparser');
  if (!officeparser) return null;
  try {
    const NL = '\n<<<TD_PAGE_BREAK>>>\n';
    const raw = await officeparser.parseOfficeAsync(filepath, { newlineDelimiter: NL });
    if (!raw || !raw.trim()) return null;
    const parts = raw.split('<<<TD_PAGE_BREAK>>>').map(s => s.trim()).filter(Boolean);
    return parts;
  } catch (err) {
    const msg = String(err && err.message || err);
    if (/encrypt|password|protect/i.test(msg)) {
      const wrap = new Error(msg); wrap.kind = 'encrypted'; throw wrap;
    }
    return null;
  }
}

async function loadViaUnpdf(filepath) {
  let mod;
  try {
    mod = await import('unpdf');
  } catch {
    return null;
  }
  try {
    const buf = fs.readFileSync(filepath);
    const { extractText, getDocumentProxy } = mod;
    const doc = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(doc, { mergePages: false });
    // text is string[] per page when mergePages:false
    const pages = Array.isArray(text) ? text : [String(text || '')];
    return pages.map(p => (p || '').trim()).filter(Boolean);
  } catch (err) {
    const msg = String(err && err.message || err);
    if (/encrypt|password|protect/i.test(msg)) {
      const wrap = new Error(msg); wrap.kind = 'encrypted'; throw wrap;
    }
    return null;
  }
}

async function load(filepath) {
  try {
    const stat = fs.statSync(filepath);
    if (stat.size > MAX_INPUT_BYTES) {
      return { ok: false, reason: 'too_large', detail: `pdf is ${stat.size} bytes; max ${MAX_INPUT_BYTES}.` };
    }
    const warnings = [];
    let pages;
    try {
      pages = await loadViaOfficeparser(filepath);
    } catch (err) {
      if (err && err.kind === 'encrypted') {
        return { ok: false, reason: 'encrypted', detail: err.message };
      }
      warnings.push(`officeparser failed: ${err.message}`);
    }
    if (!pages || !pages.length) {
      try {
        pages = await loadViaUnpdf(filepath);
      } catch (err) {
        if (err && err.kind === 'encrypted') {
          return { ok: false, reason: 'encrypted', detail: err.message };
        }
        warnings.push(`unpdf failed: ${err.message}`);
      }
    }
    if (!pages || !pages.length) {
      return {
        ok: false,
        reason: 'unsupported',
        detail: 'no PDF loader succeeded; install officeparser and/or unpdf (`npm install`).',
      };
    }
    const out = [];
    pages.forEach((body, i) => {
      const n = i + 1;
      out.push(`<!-- page:${n} -->`);
      out.push(`## Page ${n}`);
      out.push('');
      out.push(body);
      out.push('');
    });
    return { ok: true, markdown: out.join('\n'), format: 'pdf', warnings };
  } catch (err) {
    return { ok: false, reason: 'corrupt', detail: `pdf load failed: ${err.message}` };
  }
}

module.exports = { extensions, detect, load, priority: 60, async: true };
