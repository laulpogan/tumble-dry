/**
 * .pptx loader — officeparser → per-slide markdown with boundary markers.
 *
 * Optional dep: `officeparser`.
 *
 * Output schema (FORMAT-02):
 *   <!-- slide:N -->
 *   ## Slide N — <title>
 *
 *   <body>
 *
 * The boundary comment is addressable anchor for aggregator dedup.
 */

const fs = require('fs');

const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const extensions = ['.pptx'];

function detect(filepath) {
  return filepath.toLowerCase().endsWith('.pptx');
}

function tryRequire(name) {
  try { return require(name); } catch { return null; }
}

async function load(filepath) {
  const officeparser = tryRequire('officeparser');
  if (!officeparser) {
    return {
      ok: false,
      reason: 'unsupported',
      detail: 'pptx loader requires officeparser. Run `npm install` in tumble-dry root.',
    };
  }
  try {
    const stat = fs.statSync(filepath);
    if (stat.size > MAX_INPUT_BYTES) {
      return { ok: false, reason: 'too_large', detail: `pptx is ${stat.size} bytes; max ${MAX_INPUT_BYTES}.` };
    }
    let raw;
    try {
      // officeparser: parseOfficeAsync(filepath, config?) returns concatenated text.
      // It uses a configurable newlineDelimiter — we set a unique one to split slides.
      const NL = '\n<<<TD_SLIDE_BREAK>>>\n';
      raw = await officeparser.parseOfficeAsync(filepath, { newlineDelimiter: NL });
    } catch (err) {
      const msg = String(err && err.message || err);
      if (/encrypt|password|protect/i.test(msg)) {
        return { ok: false, reason: 'encrypted', detail: msg };
      }
      return { ok: false, reason: 'corrupt', detail: msg };
    }
    if (!raw || !raw.trim()) {
      return { ok: false, reason: 'empty', detail: 'pptx contained no extractable text' };
    }
    // officeparser joins all slide text with the newlineDelimiter. Splitting
    // gives us individual slide-bodies; take first non-empty line as title.
    // NOTE: this is best-effort — officeparser does not emit per-slide AST.
    const parts = raw.split('<<<TD_SLIDE_BREAK>>>').map(s => s.trim()).filter(Boolean);
    const out = [];
    parts.forEach((body, i) => {
      const n = i + 1;
      const firstLine = body.split(/\r?\n/)[0].trim().slice(0, 120) || `(slide ${n})`;
      const rest = body.split(/\r?\n/).slice(1).join('\n').trim();
      out.push(`<!-- slide:${n} -->`);
      out.push(`## Slide ${n} — ${firstLine}`);
      out.push('');
      if (rest) out.push(rest);
      out.push('');
    });
    return { ok: true, markdown: out.join('\n'), format: 'pptx', warnings: [] };
  } catch (err) {
    return { ok: false, reason: 'corrupt', detail: `pptx load failed: ${err.message}` };
  }
}

module.exports = { extensions, detect, load, priority: 40, async: true };
