/**
 * lib/loader.cjs — format-dispatcher for tumble-dry source ingestion.
 *
 * Responsibilities (FORMAT-01..07):
 *   - Detect source format by extension + per-module detect() probe
 *   - Dispatch to the appropriate lib/loaders/*.cjs module
 *   - Return typed result: { ok:true, markdown, format, warnings[] }
 *                        | { ok:false, reason, detail }
 *   - Callers MUST branch on `ok` — loaders never throw for expected errors.
 *
 * Priority order (lowest number wins): markdown(10) → docx(30) →
 * pptx(40) → xlsx(50) → pdf(60) → pandoc(100, fallback).
 *
 * Each loader's optional-dependency require is wrapped in try/catch in the
 * loader module itself; missing deps degrade to {ok:false, reason:'unsupported'}
 * with a helpful npm-install hint.
 */

const fs = require('fs');

const MODULES = [
  require('./loaders/markdown.cjs'),
  require('./loaders/docx.cjs'),
  require('./loaders/pptx.cjs'),
  require('./loaders/xlsx.cjs'),
  require('./loaders/pdf.cjs'),
  require('./loaders/pandoc.cjs'),
].sort((a, b) => (a.priority || 50) - (b.priority || 50));

/**
 * Detect the appropriate loader module for a filepath.
 * Returns the module reference or null if no loader claims the file.
 */
function detect(filepath) {
  for (const mod of MODULES) {
    try {
      if (mod.detect(filepath)) return mod;
    } catch {
      // detect() must never throw — skip defensively
    }
  }
  return null;
}

/**
 * Load a source file into a markdown projection.
 * @param {string} filepath — absolute path to source artifact
 * @returns {Promise<LoaderResult>|LoaderResult} — some loaders are async
 */
function load(filepath) {
  if (!fs.existsSync(filepath)) {
    return { ok: false, reason: 'corrupt', detail: `file not found: ${filepath}` };
  }
  const mod = detect(filepath);
  if (!mod) {
    return {
      ok: false,
      reason: 'unsupported',
      detail: `no loader registered for: ${filepath}. Install pandoc for fallback or convert manually.`,
    };
  }
  try {
    return mod.load(filepath);
  } catch (err) {
    return { ok: false, reason: 'corrupt', detail: `loader threw: ${err.message}` };
  }
}

/**
 * Convenience: always returns a Promise so callers can uniformly await.
 */
async function loadAsync(filepath) {
  return Promise.resolve(load(filepath));
}

module.exports = { detect, load, loadAsync, MODULES };
