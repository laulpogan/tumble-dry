/**
 * .pptx writer — markdown → PPTX via `pptxgenjs@^3` (ROUNDTRIP-03).
 *
 * Splits markdown by `<!-- slide:N -->` boundary markers. Each slide:
 *   - First H2 line  → title text box
 *   - Subsequent paragraphs / bullets → body text box
 *   - `<!-- notes: ... -->` markers → speaker notes
 *
 * Dropped: original templates, animations, transitions, embedded media,
 * slide masters, theme colors.
 */

function tryRequire(name) {
  try { return require(name); } catch { return null; }
}

const SLIDE_MARKER_RE = /<!--\s*slide:(\d+)\s*-->/g;
const NOTES_RE = /<!--\s*notes:\s*([\s\S]*?)\s*-->/g;

function splitSlides(markdown) {
  const parts = markdown.split(/(?=<!--\s*slide:\d+\s*-->)/);
  const slides = parts.map(p => p.trim()).filter(Boolean);
  // If no markers found, treat the whole document as a single slide.
  if (slides.length === 0 || (slides.length === 1 && !/<!--\s*slide:/.test(slides[0]))) {
    return [{ index: 1, body: markdown.trim() }];
  }
  return slides.map((chunk, i) => {
    const m = chunk.match(/<!--\s*slide:(\d+)\s*-->/);
    const idx = m ? parseInt(m[1], 10) : i + 1;
    const body = chunk.replace(/<!--\s*slide:\d+\s*-->\s*/, '');
    return { index: idx, body: body.trim() };
  });
}

function extractNotes(body) {
  const notes = [];
  const cleaned = body.replace(NOTES_RE, (_, n) => { notes.push(n.trim()); return ''; });
  return { notes: notes.join('\n\n'), body: cleaned.trim() };
}

function parseSlide(rawBody) {
  const { notes, body } = extractNotes(rawBody);
  const lines = body.split(/\r?\n/);
  let title = '';
  const bodyLines = [];
  let titleFound = false;
  for (const line of lines) {
    const t = line.trim();
    if (!titleFound) {
      const h = t.match(/^##\s+(.*)$/);
      if (h) { title = h[1].trim(); titleFound = true; continue; }
    }
    bodyLines.push(line);
  }
  // Body bullets: each non-empty line becomes a bullet item;
  // strip leading list markers if present.
  const bullets = bodyLines
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => l.replace(/^[-*+]\s+/, '').replace(/^\d+\.\s+/, ''));
  return { title: title || `Slide ${rawBody.length ? '' : ''}`.trim() || 'Untitled', bullets, notes };
}

async function write(markdown, sourceMeta, outputPath) {
  const PPTX = tryRequire('pptxgenjs');
  if (!PPTX) {
    return {
      ok: false,
      reason: 'unsupported',
      detail: 'pptx writer requires `pptxgenjs@^3`. Run `npm install` in tumble-dry root.',
    };
  }
  try {
    const PptxGenJS = PPTX.default || PPTX;
    const pres = new PptxGenJS();
    const slides = splitSlides(markdown);
    for (const s of slides) {
      const parsed = parseSlide(s.body);
      const slide = pres.addSlide();
      slide.addText(parsed.title || `Slide ${s.index}`, {
        x: 0.5, y: 0.3, w: 9, h: 0.8,
        fontSize: 28, bold: true,
      });
      if (parsed.bullets.length) {
        slide.addText(parsed.bullets.map(b => ({ text: b, options: { bullet: true } })), {
          x: 0.5, y: 1.3, w: 9, h: 5.5,
          fontSize: 18,
        });
      }
      if (parsed.notes) slide.addNotes(parsed.notes);
    }
    await pres.writeFile({ fileName: outputPath });
    return {
      ok: true,
      path: outputPath,
      lossy_notes: {
        survived: ['slide count (from <!-- slide:N --> markers)', 'slide titles (from H2)', 'body bullets', 'speaker notes (from <!-- notes: ... -->)'],
        approximated: ['layout (single title + body text box per slide)', 'fonts (default theme fonts)'],
        dropped: ['original template / slide master', 'theme colors', 'animations / transitions', 'embedded media (images, video, audio)', 'charts and diagrams', 'speaker timing', 'custom shapes', 'tables (rendered as text bullets if present)'],
      },
    };
  } catch (err) {
    return { ok: false, reason: 'corrupt', detail: `pptx write failed: ${err.message}` };
  }
}

module.exports = { write, splitSlides, parseSlide };
