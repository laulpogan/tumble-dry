/**
 * .xlsx loader — officeparser (unified) → per-sheet markdown tables.
 *
 * Output schema (FORMAT-02):
 *   <!-- sheet:Name -->
 *   ## Sheet: <name>
 *
 *   <markdown table>
 *
 * officeparser emits flat text per workbook with a configurable newline
 * delimiter. Sheet boundaries are not always clearly surfaced — we best-
 * effort split on double-newline and title as "Sheet N". Downstream
 * reviewers get page-granularity addressing via the HTML-comment anchors.
 */

const fs = require('fs');

const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const extensions = ['.xlsx'];

function detect(filepath) {
  return filepath.toLowerCase().endsWith('.xlsx');
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
      detail: 'xlsx loader requires officeparser. Run `npm install` in tumble-dry root.',
    };
  }
  try {
    const stat = fs.statSync(filepath);
    if (stat.size > MAX_INPUT_BYTES) {
      return { ok: false, reason: 'too_large', detail: `xlsx is ${stat.size} bytes; max ${MAX_INPUT_BYTES}.` };
    }
    let raw;
    try {
      const NL = '\n<<<TD_SHEET_BREAK>>>\n';
      raw = await officeparser.parseOfficeAsync(filepath, { newlineDelimiter: NL });
    } catch (err) {
      const msg = String(err && err.message || err);
      if (/encrypt|password|protect/i.test(msg)) {
        return { ok: false, reason: 'encrypted', detail: msg };
      }
      return { ok: false, reason: 'corrupt', detail: msg };
    }
    if (!raw || !raw.trim()) {
      return { ok: false, reason: 'empty', detail: 'xlsx contained no extractable cells' };
    }
    const parts = raw.split('<<<TD_SHEET_BREAK>>>').map(s => s.trim()).filter(Boolean);
    const out = [];
    parts.forEach((body, i) => {
      const name = `Sheet${i + 1}`;
      out.push(`<!-- sheet:${name} -->`);
      out.push(`## Sheet: ${name}`);
      out.push('');
      out.push(body);
      out.push('');
    });
    return { ok: true, markdown: out.join('\n'), format: 'xlsx', warnings: [] };
  } catch (err) {
    return { ok: false, reason: 'corrupt', detail: `xlsx load failed: ${err.message}` };
  }
}

module.exports = { extensions, detect, load, priority: 50, async: true };
