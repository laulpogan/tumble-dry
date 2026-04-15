/**
 * Pandoc fallback loader — catch-all for extensions not handled by other loaders.
 *
 * Detection: file extension not claimed by any other loader AND `pandoc`
 * is available on PATH. Runs `pandoc -f <ext> -t markdown <filepath>`.
 *
 * Priority: lowest (100). Other loaders match their specific extensions first.
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const MAX_INPUT_BYTES = 20 * 1024 * 1024;
// Accept any ext pandoc understands. We don't enumerate — we just try.
// This module declares an empty `extensions` list and uses detect() to
// dynamically decide.
const extensions = [];

let _pandocPresent = null;
function hasPandoc() {
  if (_pandocPresent !== null) return _pandocPresent;
  try {
    const r = spawnSync('pandoc', ['--version'], { stdio: 'ignore' });
    _pandocPresent = r.status === 0;
  } catch {
    _pandocPresent = false;
  }
  return _pandocPresent;
}

// These are extensions other loaders already own — skip them here.
const OWNED = new Set(['.md', '.markdown', '.txt', '.docx', '.pptx', '.xlsx', '.pdf']);

function detect(filepath /*, buf */) {
  const ext = path.extname(filepath).toLowerCase();
  if (!ext || OWNED.has(ext)) return false;
  return hasPandoc();
}

function load(filepath) {
  try {
    if (!hasPandoc()) {
      return {
        ok: false,
        reason: 'unsupported',
        detail: 'pandoc not on PATH; install pandoc or convert manually.',
      };
    }
    const stat = fs.statSync(filepath);
    if (stat.size > MAX_INPUT_BYTES) {
      return { ok: false, reason: 'too_large', detail: `file is ${stat.size} bytes; max ${MAX_INPUT_BYTES}.` };
    }
    const ext = path.extname(filepath).toLowerCase().replace(/^\./, '');
    let markdown;
    try {
      markdown = execSync(
        `pandoc -f ${JSON.stringify(ext)} -t markdown ${JSON.stringify(filepath)}`,
        { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 }
      );
    } catch (err) {
      return { ok: false, reason: 'corrupt', detail: `pandoc failed: ${err.message}` };
    }
    if (!markdown.trim()) {
      return { ok: false, reason: 'empty', detail: 'pandoc produced empty markdown' };
    }
    return { ok: true, markdown, format: `pandoc:${ext}`, warnings: ['converted via pandoc'] };
  } catch (err) {
    return { ok: false, reason: 'corrupt', detail: `pandoc load failed: ${err.message}` };
  }
}

module.exports = { extensions, detect, load, priority: 100 };
