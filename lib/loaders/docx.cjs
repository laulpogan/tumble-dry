/**
 * .docx loader — mammoth (HTML) → turndown (markdown).
 *
 * Optional deps: `mammoth`, `turndown`. If either missing, loader
 * skips itself with `reason: 'unsupported'` and a clear npm-install hint.
 *
 * Boundary markers: H1/H2/H3 preserved natively — no extra markers needed.
 */

const fs = require('fs');

const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const extensions = ['.docx'];

function detect(filepath /*, buf */) {
  return filepath.toLowerCase().endsWith('.docx');
}

function tryRequire(name) {
  try { return require(name); } catch { return null; }
}

async function load(filepath) {
  const mammoth = tryRequire('mammoth');
  const TurndownService = tryRequire('turndown');
  if (!mammoth || !TurndownService) {
    return {
      ok: false,
      reason: 'unsupported',
      detail: 'docx loader requires mammoth + turndown. Run `npm install` in tumble-dry root.',
    };
  }
  try {
    const stat = fs.statSync(filepath);
    if (stat.size > MAX_INPUT_BYTES) {
      return {
        ok: false,
        reason: 'too_large',
        detail: `docx is ${stat.size} bytes; max ${MAX_INPUT_BYTES}.`,
      };
    }
    const warnings = [];
    let html;
    try {
      const result = await mammoth.convertToHtml({ path: filepath });
      html = result.value || '';
      for (const m of result.messages || []) {
        if (m.type === 'warning' || m.type === 'error') warnings.push(`mammoth: ${m.message}`);
      }
    } catch (err) {
      const msg = String(err && err.message || err);
      if (/encrypt|password|protect/i.test(msg)) {
        return { ok: false, reason: 'encrypted', detail: msg };
      }
      return { ok: false, reason: 'corrupt', detail: msg };
    }
    if (!html.trim()) {
      return { ok: false, reason: 'empty', detail: 'docx contained no convertible content' };
    }
    const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
    const markdown = td.turndown(html).trim() + '\n';
    if (!markdown.trim()) {
      return { ok: false, reason: 'empty', detail: 'docx converted to empty markdown' };
    }
    return { ok: true, markdown, format: 'docx', warnings };
  } catch (err) {
    return { ok: false, reason: 'corrupt', detail: `docx load failed: ${err.message}` };
  }
}

module.exports = { extensions, detect, load, priority: 30, async: true };
