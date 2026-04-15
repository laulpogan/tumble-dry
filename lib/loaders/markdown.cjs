/**
 * Markdown / plaintext loader — identity projection.
 *
 * Covers: .md, .markdown, .txt
 * Dependencies: none (always available).
 *
 * Contract (FORMAT-01a):
 *   load(filepath) → { ok:true, markdown, format, warnings[] }
 *                  | { ok:false, reason, detail }
 *
 * Encoding (FORMAT-07): reads as UTF-8, strips BOM, preserves CJK/RTL/emoji.
 */

const fs = require('fs');

const MAX_INPUT_BYTES = 20 * 1024 * 1024; // 20MB — FORMAT-06

const extensions = ['.md', '.markdown', '.txt'];

function detect(filepath /*, buf */) {
  const lower = filepath.toLowerCase();
  return extensions.some(e => lower.endsWith(e));
}

function load(filepath) {
  try {
    const stat = fs.statSync(filepath);
    if (stat.size > MAX_INPUT_BYTES) {
      return {
        ok: false,
        reason: 'too_large',
        detail: `file is ${stat.size} bytes; max ${MAX_INPUT_BYTES}. Split input or raise limit.`,
      };
    }
    let text = fs.readFileSync(filepath, 'utf-8');
    const warnings = [];
    // Strip UTF-8 BOM (FORMAT-07)
    if (text.charCodeAt(0) === 0xfeff) {
      text = text.slice(1);
      warnings.push('stripped UTF-8 BOM');
    }
    if (!text.trim()) {
      return { ok: false, reason: 'empty', detail: 'file has no non-whitespace content' };
    }
    const format = filepath.toLowerCase().endsWith('.txt') ? 'txt' : 'markdown';
    return { ok: true, markdown: text, format, warnings };
  } catch (err) {
    return { ok: false, reason: 'corrupt', detail: `read failed: ${err.message}` };
  }
}

module.exports = { extensions, detect, load, priority: 10 };
