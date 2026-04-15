/**
 * Writers dispatcher (ROUNDTRIP-06).
 *
 * Routes by source format → docx / pptx / xlsx writer.
 * PDF returns {ok:false, reason:'pdf_unsupported'}.
 */

const path = require('path');

const PDF_MESSAGE =
  'PDF roundtrip is not supported. FINAL.md is your polished output — re-typeset with pandoc / weasyprint / your preferred markdown→PDF tool. See README §Roundtrip for rationale.';

const ROUTES = {
  docx: { mod: () => require('./docx.cjs'), ext: '.docx' },
  pptx: { mod: () => require('./pptx.cjs'), ext: '.pptx' },
  xlsx: { mod: () => require('./xlsx.cjs'), ext: '.xlsx' },
};

async function writeFinal(format, finalMd, sourceMeta, finalMdPath) {
  if (format === 'pdf') {
    return { ok: false, reason: 'pdf_unsupported', detail: PDF_MESSAGE };
  }
  const route = ROUTES[format];
  if (!route) {
    return {
      ok: false,
      reason: 'unsupported_format',
      detail: `no writer registered for format=${format}. Supported: docx, pptx, xlsx.`,
    };
  }
  const writer = route.mod();
  const dir = path.dirname(finalMdPath);
  const base = path.basename(finalMdPath, path.extname(finalMdPath)); // FINAL
  const outPath = path.join(dir, `${base}${route.ext}`);
  const result = await writer.write(finalMd, sourceMeta || {}, outPath);
  return result;
}

module.exports = { writeFinal, PDF_MESSAGE };
