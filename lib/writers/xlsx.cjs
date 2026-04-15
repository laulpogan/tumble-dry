/**
 * .xlsx writer — markdown → XLSX via `exceljs@^4` (ROUNDTRIP-04).
 *
 * Splits markdown by `<!-- sheet:Name -->` boundary markers. For each:
 *   - Parses the markdown pipe table that follows.
 *   - Header row → bold cells (column titles).
 *   - Data rows → typed cells (number if parseable as finite number, else string).
 *
 * Dropped: formulas (cells become literal values), pivots, charts, conditional
 * formatting, data validation, named ranges, frozen panes, merged cells.
 *
 * NOTE: NOT SheetJS — same CVE rationale as ingestion.
 */

function tryRequire(name) {
  try { return require(name); } catch { return null; }
}

const SHEET_MARKER_RE = /<!--\s*sheet:([^>\s][^>]*?)\s*-->/;

function splitSheets(markdown) {
  const parts = markdown.split(/(?=<!--\s*sheet:[^>]+?-->)/);
  const sheets = parts.map(p => p.trim()).filter(Boolean);
  if (sheets.length === 0 || (sheets.length === 1 && !SHEET_MARKER_RE.test(sheets[0]))) {
    return [{ name: 'Sheet1', body: markdown.trim() }];
  }
  return sheets.map((chunk, i) => {
    const m = chunk.match(SHEET_MARKER_RE);
    const name = m ? m[1].trim() : `Sheet${i + 1}`;
    const body = chunk.replace(SHEET_MARKER_RE, '').trim();
    return { name, body };
  });
}

function isTableSep(line) {
  return /^\s*\|?\s*:?-{2,}:?(\s*\|\s*:?-{2,}:?)+\s*\|?\s*$/.test(line);
}

function parseRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
}

function parseTable(body) {
  const lines = body.split(/\r?\n/).map(l => l.trim());
  // Skip leading non-table lines (e.g. ## Sheet: foo headings)
  let i = 0;
  while (i < lines.length && !(lines[i].includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1]))) {
    i++;
  }
  if (i >= lines.length) return null;
  const header = parseRow(lines[i]);
  i += 2;
  const rows = [];
  while (i < lines.length && lines[i].includes('|')) {
    rows.push(parseRow(lines[i]));
    i++;
  }
  return { header, rows };
}

function coerce(cell) {
  if (cell === '') return null;
  // Don't coerce if leading zeros (preserve as string — IDs, ZIP codes)
  if (/^0\d+/.test(cell)) return cell;
  const n = Number(cell);
  if (Number.isFinite(n) && cell.trim() !== '' && /^-?\d+(\.\d+)?$/.test(cell.trim())) return n;
  return cell;
}

async function write(markdown, sourceMeta, outputPath) {
  const ExcelJS = tryRequire('exceljs');
  if (!ExcelJS) {
    return {
      ok: false,
      reason: 'unsupported',
      detail: 'xlsx writer requires `exceljs@^4`. Run `npm install` in tumble-dry root.',
    };
  }
  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'tumble-dry';
    const sheets = splitSheets(markdown);
    for (const s of sheets) {
      const ws = wb.addWorksheet(s.name.slice(0, 31)); // Excel sheet-name 31-char cap
      const table = parseTable(s.body);
      if (!table) {
        ws.addRow([s.body || '(no table)']);
        continue;
      }
      const headerRow = ws.addRow(table.header);
      headerRow.font = { bold: true };
      for (const r of table.rows) {
        ws.addRow(r.map(coerce));
      }
    }
    await wb.xlsx.writeFile(outputPath);
    return {
      ok: true,
      path: outputPath,
      lossy_notes: {
        survived: ['sheet count (from <!-- sheet:Name --> markers)', 'sheet names', 'table dimensions (rows × cols)', 'header row (bold)', 'numeric vs string cell types (auto-detected)'],
        approximated: ['cell types inferred from markdown text (numbers detected via regex; everything else string)', 'sheet names truncated to 31 chars (Excel limit)'],
        dropped: ['formulas (cells become literal values)', 'pivot tables', 'charts', 'conditional formatting', 'data validation rules', 'named ranges', 'frozen panes', 'merged cells', 'cell styles (colors, borders, fonts beyond bold header)', 'protected ranges', 'macros (VBA)'],
      },
    };
  } catch (err) {
    return { ok: false, reason: 'corrupt', detail: `xlsx write failed: ${err.message}` };
  }
}

module.exports = { write, splitSheets, parseTable, coerce };
