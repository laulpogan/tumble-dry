/**
 * .docx writer — markdown → DOCX via `docx` lib (ROUNDTRIP-02).
 *
 * Optional dep: `docx@^9`. Missing dep → {ok:false, reason:'unsupported'}.
 *
 * Mapped (preserved):
 *   - ATX headings #..###### → HEADING_1..HEADING_6
 *   - paragraphs (blank-line separated)
 *   - inline emphasis: **bold**, *italic* / _italic_, `code`
 *   - unordered lists (- / *), ordered lists (1.)
 *   - GFM-ish pipe tables
 *   - block quotes (>) → indented paragraphs
 *
 * Stripped silently:
 *   - HTML comment markers (<!-- slide:N -->, <!-- sheet:Name -->, <!-- page:N -->, <!-- notes: ... -->)
 *
 * Dropped (lossy_notes):
 *   - images, embedded objects, comments, track-changes, custom styles, footnotes
 */

const fs = require('fs');

function tryRequire(name) {
  try { return require(name); } catch { return null; }
}

const COMMENT_RE = /^<!--\s*(slide:\d+|sheet:[^>]+|page:\d+|notes:[^>]*)\s*-->\s*$/;

function stripCommentMarkers(line) {
  return COMMENT_RE.test(line) ? null : line;
}

// Parse inline emphasis into an array of {text, bold, italic, code} runs.
// Order of precedence: code (backtick) > bold (**) > italic (* or _).
function parseInline(text) {
  const out = [];
  let i = 0;
  while (i < text.length) {
    // code
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end > i) {
        out.push({ text: text.slice(i + 1, end), code: true });
        i = end + 1;
        continue;
      }
    }
    // bold (**...**)
    if (text[i] === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end > i + 1) {
        out.push({ text: text.slice(i + 2, end), bold: true });
        i = end + 2;
        continue;
      }
    }
    // italic (*...* or _..._)
    if (text[i] === '*' || text[i] === '_') {
      const ch = text[i];
      const end = text.indexOf(ch, i + 1);
      if (end > i && text.slice(i + 1, end).indexOf('\n') === -1) {
        out.push({ text: text.slice(i + 1, end), italic: true });
        i = end + 1;
        continue;
      }
    }
    // run of plain text up to next special char
    let j = i + 1;
    while (j < text.length && !'`*_'.includes(text[j])) j++;
    out.push({ text: text.slice(i, j) });
    i = j;
  }
  return out.filter(r => r.text.length > 0);
}

function buildRuns(docx, runs) {
  const { TextRun } = docx;
  return runs.map(r => new TextRun({
    text: r.text,
    bold: !!r.bold,
    italics: !!r.italic,
    font: r.code ? { name: 'Courier New' } : undefined,
  }));
}

function isTableSep(line) {
  return /^\s*\|?\s*:?-{2,}:?(\s*\|\s*:?-{2,}:?)+\s*\|?\s*$/.test(line);
}

function parseTableRow(line) {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map(c => c.trim());
}

/**
 * Convert markdown text into an array of docx Paragraph/Table elements.
 */
function buildDocChildren(docx, markdown, lossy) {
  const {
    Paragraph, HeadingLevel, Table, TableRow, TableCell, TextRun, AlignmentType,
  } = docx;

  // Drop HTML-comment markers
  const lines = markdown.split(/\r?\n/).filter(l => stripCommentMarkers(l) !== null);

  const children = [];
  let i = 0;
  let listStackOrdered = false;

  function flushParagraph(buf, opts = {}) {
    if (!buf.length) return;
    const text = buf.join(' ');
    const runs = parseInline(text);
    children.push(new Paragraph({
      children: buildRuns(docx, runs),
      ...opts,
    }));
  }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank line — paragraph separator
    if (!trimmed) { i++; continue; }

    // Heading
    const h = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const headingMap = [
        HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3,
        HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6,
      ];
      children.push(new Paragraph({
        heading: headingMap[level - 1],
        children: buildRuns(docx, parseInline(h[2])),
      }));
      i++;
      continue;
    }

    // Block quote
    if (/^>\s?/.test(trimmed)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        buf.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      children.push(new Paragraph({
        indent: { left: 720 },
        children: buildRuns(docx, parseInline(buf.join(' '))),
      }));
      continue;
    }

    // Table — header line + separator + rows
    if (trimmed.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const header = parseTableRow(lines[i]);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().includes('|') && !lines[i].trim().startsWith('#')) {
        const t = lines[i].trim();
        if (!t) break;
        rows.push(parseTableRow(t));
        i++;
      }
      const allRows = [header, ...rows];
      const tableRows = allRows.map((row, ridx) => new TableRow({
        children: row.map(cell => new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: cell, bold: ridx === 0 })],
          })],
        })),
      }));
      children.push(new Table({ rows: tableRows }));
      continue;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(trimmed)) {
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        const item = lines[i].trim().replace(/^[-*+]\s+/, '');
        children.push(new Paragraph({
          bullet: { level: 0 },
          children: buildRuns(docx, parseInline(item)),
        }));
        i++;
      }
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const item = lines[i].trim().replace(/^\d+\.\s+/, '');
        children.push(new Paragraph({
          numbering: { reference: 'td-numbering', level: 0 },
          children: buildRuns(docx, parseInline(item)),
        }));
        i++;
      }
      continue;
    }

    // Default paragraph — collect contiguous non-empty non-special lines
    const buf = [];
    while (i < lines.length) {
      const t = lines[i].trim();
      if (!t) break;
      if (/^(#{1,6})\s+/.test(t)) break;
      if (/^>\s?/.test(t)) break;
      if (/^[-*+]\s+/.test(t)) break;
      if (/^\d+\.\s+/.test(t)) break;
      if (t.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) break;
      buf.push(t);
      i++;
    }
    flushParagraph(buf);
  }

  return children;
}

async function write(markdown, sourceMeta, outputPath) {
  const docx = tryRequire('docx');
  if (!docx) {
    return {
      ok: false,
      reason: 'unsupported',
      detail: 'docx writer requires `docx@^9`. Run `npm install` in tumble-dry root.',
    };
  }
  const { Document, Packer, LevelFormat, AlignmentType } = docx;
  const lossy = [];
  try {
    const children = buildDocChildren(docx, markdown, lossy);
    const doc = new Document({
      numbering: {
        config: [{
          reference: 'td-numbering',
          levels: [{
            level: 0,
            format: LevelFormat.DECIMAL,
            text: '%1.',
            alignment: AlignmentType.START,
          }],
        }],
      },
      sections: [{ children }],
    });
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outputPath, buffer);
    return {
      ok: true,
      path: outputPath,
      lossy_notes: {
        survived: ['headings (H1-H6)', 'paragraphs', 'lists (ordered, unordered)', 'tables (markdown pipe tables)', 'inline emphasis (bold, italic, inline code)', 'block quotes'],
        approximated: ['inline code rendered as Courier New (no syntax highlighting)', 'block quotes rendered as indented paragraphs (no left border)'],
        dropped: ['images', 'embedded objects (OLE)', 'comments', 'track-changes / revisions', 'custom styles from source', 'footnotes / endnotes', 'headers / footers', 'page numbers', 'section breaks'],
      },
    };
  } catch (err) {
    return { ok: false, reason: 'corrupt', detail: `docx write failed: ${err.message}` };
  }
}

module.exports = { write, parseInline, buildDocChildren };
