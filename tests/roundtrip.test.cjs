#!/usr/bin/env node
/**
 * Smoke tests for ROUNDTRIP-01..08 (v0.7.0 office-format roundtrip).
 *
 * Runs standalone: `node tests/roundtrip.test.cjs`
 *
 * Covers:
 *   - ROUNDTRIP-02: docx writer → mammoth re-load → structural equivalence
 *   - ROUNDTRIP-03: pptx writer → officeparser re-load → slide count + titles
 *   - ROUNDTRIP-04: xlsx writer → exceljs re-load → sheet count + dimensions
 *   - ROUNDTRIP-05: lossy report assembled with three sections
 *   - ROUNDTRIP-06: PDF guard rail returns {ok:false, reason:'pdf_unsupported'}
 *   - ROUNDTRIP-01: dispatcher routes by format
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
const docxWriter = require(path.join(ROOT, 'lib/writers/docx.cjs'));
const pptxWriter = require(path.join(ROOT, 'lib/writers/pptx.cjs'));
const xlsxWriter = require(path.join(ROOT, 'lib/writers/xlsx.cjs'));
const { writeFinal, PDF_MESSAGE } = require(path.join(ROOT, 'lib/writers/index.cjs'));
const { buildReport } = require(path.join(ROOT, 'lib/writers/lossy-report.cjs'));

function tryRequire(name) { try { return require(name); } catch { return null; } }
function tmpdir(prefix = 'td-roundtrip-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

// ---------- ROUNDTRIP-02: docx writer ----------

const DOCX_FIXTURE = `# Heading 1

A paragraph with **bold** and *italic* and \`inline code\`.

## Heading 2

Another paragraph.

- Bullet one
- Bullet two
- Bullet three

1. Numbered one
2. Numbered two

| Col A | Col B |
| ----- | ----- |
| a1    | b1    |
| a2    | b2    |

> A quote line.
`;

test('ROUNDTRIP-02: docx writer produces a valid file readable by mammoth', async () => {
  const mammoth = tryRequire('mammoth');
  if (!mammoth) {
    console.warn('  (skipping — mammoth not installed)');
    return;
  }
  const d = tmpdir();
  const out = path.join(d, 'FINAL.docx');
  const r = await docxWriter.write(DOCX_FIXTURE, { format: 'docx' }, out);
  assert.equal(r.ok, true, `writer failed: ${r.detail}`);
  assert.ok(fs.existsSync(out));
  assert.ok(fs.statSync(out).size > 1000, 'docx suspiciously small');

  const html = (await mammoth.convertToHtml({ path: out })).value;
  // Structural counts within tolerance
  const h1 = (html.match(/<h1>/g) || []).length;
  const h2 = (html.match(/<h2>/g) || []).length;
  assert.ok(h1 >= 1, 'expected at least 1 H1');
  assert.ok(h2 >= 1, 'expected at least 1 H2');
  assert.match(html, /bold/i);
  // Lists present (mammoth emits <ul>/<ol>)
  assert.ok(/<ul>|<ol>/.test(html), 'expected list elements');
  // Table present
  assert.ok(/<table/.test(html), 'expected table element');
});

test('ROUNDTRIP-02: docx writer strips HTML-comment markers silently', async () => {
  const mammoth = tryRequire('mammoth');
  if (!mammoth) { console.warn('  (skipping — mammoth not installed)'); return; }
  const d = tmpdir();
  const out = path.join(d, 'FINAL.docx');
  const md = `<!-- slide:1 -->\n# Title\n\nParagraph.\n<!-- notes: should be dropped -->\n`;
  const r = await docxWriter.write(md, { format: 'docx' }, out);
  assert.equal(r.ok, true);
  const html = (await mammoth.convertToHtml({ path: out })).value;
  assert.ok(!html.includes('slide:1'), 'comment marker leaked into docx');
  assert.ok(!html.includes('notes:'), 'notes marker leaked into docx');
});

test('ROUNDTRIP-02: docx writer returns lossy_notes with required sections', async () => {
  const docx = tryRequire('docx');
  if (!docx) { console.warn('  (skipping — docx not installed)'); return; }
  const d = tmpdir();
  const out = path.join(d, 'FINAL.docx');
  const r = await docxWriter.write('# Hello\n\nBody.\n', {}, out);
  assert.equal(r.ok, true);
  assert.ok(Array.isArray(r.lossy_notes.survived));
  assert.ok(Array.isArray(r.lossy_notes.approximated));
  assert.ok(Array.isArray(r.lossy_notes.dropped));
  assert.ok(r.lossy_notes.dropped.some(s => /image/i.test(s)));
});

// ---------- ROUNDTRIP-03: pptx writer ----------

const PPTX_FIXTURE = `<!-- slide:1 -->
## Opening Title

- bullet one
- bullet two

<!-- slide:2 -->
## Middle Slide

Body paragraph.

<!-- notes: speaker says hi -->

<!-- slide:3 -->
## Closing Slide

- final bullet
`;

test('ROUNDTRIP-03: pptx writer produces 3 slides from 3 boundary markers', async () => {
  const officeparser = tryRequire('officeparser');
  if (!officeparser) { console.warn('  (skipping — officeparser not installed)'); return; }
  const d = tmpdir();
  const out = path.join(d, 'FINAL.pptx');
  const r = await pptxWriter.write(PPTX_FIXTURE, { format: 'pptx' }, out);
  assert.equal(r.ok, true, `writer failed: ${r.detail}`);
  assert.ok(fs.existsSync(out));
  // Re-load with officeparser. It returns concatenated text. Use slide-break
  // delimiter to count the slides (matches loader behavior).
  const NL = '<<<TD_SLIDE_BREAK>>>';
  const parseFn = officeparser.parseOfficeAsync || officeparser.parseOffice;
  const result = await parseFn(out, { newlineDelimiter: NL });
  // officeparser v6+ returns {content, toText, ...}; older returns string.
  const raw = typeof result === 'string' ? result : (result.toText ? result.toText() : String(result));
  const parts = raw.split('<<<TD_SLIDE_BREAK>>>').map(s => s.trim()).filter(Boolean);
  assert.ok(parts.length >= 3, `expected ≥3 slide chunks, got ${parts.length}: ${raw.slice(0,200)}`);
  // Titles present
  const all = raw;
  assert.match(all, /Opening Title/);
  assert.match(all, /Middle Slide/);
  assert.match(all, /Closing Slide/);
});

test('ROUNDTRIP-03: pptx splitSlides parses 3 boundary markers', () => {
  const slides = pptxWriter.splitSlides(PPTX_FIXTURE);
  assert.equal(slides.length, 3);
  assert.equal(slides[0].index, 1);
  assert.equal(slides[2].index, 3);
});

test('ROUNDTRIP-03: pptx parseSlide extracts title, bullets, notes', () => {
  const parsed = pptxWriter.parseSlide('## My Title\n\n- a\n- b\n<!-- notes: hello -->\n');
  assert.equal(parsed.title, 'My Title');
  assert.deepEqual(parsed.bullets, ['a', 'b']);
  assert.equal(parsed.notes, 'hello');
});

// ---------- ROUNDTRIP-04: xlsx writer ----------

const XLSX_FIXTURE = `<!-- sheet:Revenue -->
## Sheet: Revenue

| Quarter | Amount |
| ------- | ------ |
| Q1      | 100    |
| Q2      | 150    |
| Q3      | 200    |

<!-- sheet:Costs -->
## Sheet: Costs

| Item | USD |
| ---- | --- |
| rent | 50  |
| ops  | 75  |
`;

test('ROUNDTRIP-04: xlsx writer produces 2 sheets from 2 boundary markers', async () => {
  const ExcelJS = tryRequire('exceljs');
  if (!ExcelJS) { console.warn('  (skipping — exceljs not installed)'); return; }
  const d = tmpdir();
  const out = path.join(d, 'FINAL.xlsx');
  const r = await xlsxWriter.write(XLSX_FIXTURE, { format: 'xlsx' }, out);
  assert.equal(r.ok, true, `writer failed: ${r.detail}`);
  assert.ok(fs.existsSync(out));

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(out);
  assert.equal(wb.worksheets.length, 2, 'expected 2 sheets');
  const names = wb.worksheets.map(ws => ws.name);
  assert.ok(names.includes('Revenue'), `missing Revenue sheet: ${names.join(',')}`);
  assert.ok(names.includes('Costs'), `missing Costs sheet: ${names.join(',')}`);
  const rev = wb.getWorksheet('Revenue');
  assert.equal(rev.rowCount, 4, 'expected 4 rows (header + 3) in Revenue');
  // Header row bold
  assert.equal(rev.getRow(1).font && rev.getRow(1).font.bold, true);
  // Numeric coercion
  const v = rev.getRow(2).getCell(2).value;
  assert.equal(v, 100);
  const costs = wb.getWorksheet('Costs');
  assert.equal(costs.rowCount, 3, 'expected 3 rows (header + 2) in Costs');
});

test('ROUNDTRIP-04: xlsx splitSheets and parseTable work', () => {
  const sheets = xlsxWriter.splitSheets(XLSX_FIXTURE);
  assert.equal(sheets.length, 2);
  assert.equal(sheets[0].name, 'Revenue');
  assert.equal(sheets[1].name, 'Costs');
  const t = xlsxWriter.parseTable(sheets[0].body);
  assert.deepEqual(t.header, ['Quarter', 'Amount']);
  assert.equal(t.rows.length, 3);
});

test('ROUNDTRIP-04: xlsx coerce preserves leading zeros, parses ints/floats', () => {
  assert.equal(xlsxWriter.coerce('100'), 100);
  assert.equal(xlsxWriter.coerce('-12.5'), -12.5);
  assert.equal(xlsxWriter.coerce('00123'), '00123');
  assert.equal(xlsxWriter.coerce('abc'), 'abc');
});

// ---------- ROUNDTRIP-05: lossy report ----------

test('ROUNDTRIP-05: buildReport assembles three sections with bullets', () => {
  const md = buildReport({
    format: 'docx',
    sourcePath: '/tmp/src.docx',
    finalPath: '/tmp/FINAL.md',
    regenPath: '/tmp/FINAL.docx',
    lossy: {
      survived: ['headings'],
      approximated: ['quotes'],
      dropped: ['images', 'comments'],
    },
  });
  assert.match(md, /## Survived/);
  assert.match(md, /## Approximated/);
  assert.match(md, /## Dropped/);
  assert.match(md, /- headings/);
  assert.match(md, /- comments/);
  assert.match(md, /Source format.*docx/);
});

// ---------- ROUNDTRIP-06: PDF guard rail ----------

test('ROUNDTRIP-06: writeFinal returns pdf_unsupported for format=pdf', async () => {
  const r = await writeFinal('pdf', '# anything\n', {}, '/tmp/FINAL.md');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'pdf_unsupported');
  assert.match(r.detail, /PDF roundtrip is not supported/);
  assert.match(r.detail, /pandoc|weasyprint/);
});

test('ROUNDTRIP-06: PDF_MESSAGE constant matches REQUIREMENTS spec', () => {
  assert.match(PDF_MESSAGE, /PDF roundtrip is not supported/);
  assert.match(PDF_MESSAGE, /FINAL\.md is your polished output/);
  assert.match(PDF_MESSAGE, /README §Roundtrip/);
});

// ---------- ROUNDTRIP-01: dispatcher routing ----------

test('ROUNDTRIP-01: writeFinal routes docx/pptx/xlsx to correct writer', async () => {
  const docx = tryRequire('docx');
  if (!docx) { console.warn('  (skipping — docx not installed)'); return; }
  const d = tmpdir();
  const finalMd = path.join(d, 'FINAL.md');
  fs.writeFileSync(finalMd, '# X\n');
  const r = await writeFinal('docx', '# X\n\nhello\n', {}, finalMd);
  assert.equal(r.ok, true);
  assert.equal(path.extname(r.path), '.docx');
});

test('ROUNDTRIP-01: writeFinal returns unsupported_format for unknown formats', async () => {
  const r = await writeFinal('rtf', '# x\n', {}, '/tmp/FINAL.md');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'unsupported_format');
});

// ---------- ROUNDTRIP-01: integration via finalize CLI subcommand ----------

test('ROUNDTRIP-01 integration: finalize --apply on PDF source exits 4 with PDF message', async () => {
  const { spawnSync } = require('node:child_process');
  const d = tmpdir();
  // Build a synthetic .tumble-dry/<slug>/ run dir with PDF source-format.json.
  const runRoot = path.join(d, '.tumble-dry', 'fakedoc');
  fs.mkdirSync(path.join(runRoot, 'history'), { recursive: true });
  const workingPath = path.join(runRoot, 'working.md');
  fs.writeFileSync(workingPath, '# Final content\n\nPolished.\n');
  fs.writeFileSync(path.join(runRoot, 'artifact.path'), workingPath);
  fs.writeFileSync(path.join(runRoot, 'source.path'), path.join(d, 'fake.pdf'));
  fs.writeFileSync(path.join(runRoot, 'source-format.json'), JSON.stringify({
    format: 'pdf', source_ext: '.pdf', warnings: [], artifact_kind: 'prose',
  }));
  const bin = path.join(ROOT, 'bin/tumble-dry.cjs');
  const r = spawnSync('node', [bin, 'finalize', 'fakedoc', '--apply'], {
    cwd: d, encoding: 'utf-8',
  });
  assert.equal(r.status, 4, `expected exit 4, got ${r.status}. stderr: ${r.stderr}`);
  assert.match(r.stderr, /PDF roundtrip is not supported/);
  // FINAL.md still produced
  assert.ok(fs.existsSync(path.join(runRoot, 'FINAL.md')));
});

test('ROUNDTRIP-01 integration: finalize without --apply on PDF source exits 0', async () => {
  const { spawnSync } = require('node:child_process');
  const d = tmpdir();
  const runRoot = path.join(d, '.tumble-dry', 'fakedoc');
  fs.mkdirSync(path.join(runRoot, 'history'), { recursive: true });
  const workingPath = path.join(runRoot, 'working.md');
  fs.writeFileSync(workingPath, '# x\n');
  fs.writeFileSync(path.join(runRoot, 'artifact.path'), workingPath);
  fs.writeFileSync(path.join(runRoot, 'source.path'), path.join(d, 'fake.pdf'));
  fs.writeFileSync(path.join(runRoot, 'source-format.json'), JSON.stringify({ format: 'pdf' }));
  const bin = path.join(ROOT, 'bin/tumble-dry.cjs');
  const r = spawnSync('node', [bin, 'finalize', 'fakedoc'], {
    cwd: d, encoding: 'utf-8',
  });
  assert.equal(r.status, 0, `expected exit 0, got ${r.status}. stderr: ${r.stderr}`);
});

test('ROUNDTRIP-01 integration: finalize --apply on docx source writes FINAL.docx + LOSSY_REPORT', async () => {
  const docx = tryRequire('docx');
  if (!docx) { console.warn('  (skipping — docx not installed)'); return; }
  const { spawnSync } = require('node:child_process');
  const d = tmpdir();
  const runRoot = path.join(d, '.tumble-dry', 'mydoc');
  fs.mkdirSync(path.join(runRoot, 'history'), { recursive: true });
  const workingPath = path.join(runRoot, 'working.md');
  fs.writeFileSync(workingPath, '# Title\n\nParagraph with **bold**.\n\n- a\n- b\n');
  fs.writeFileSync(path.join(runRoot, 'artifact.path'), workingPath);
  fs.writeFileSync(path.join(runRoot, 'source.path'), path.join(d, 'src.docx'));
  fs.writeFileSync(path.join(runRoot, 'source-format.json'), JSON.stringify({
    format: 'docx', source_ext: '.docx',
  }));
  const bin = path.join(ROOT, 'bin/tumble-dry.cjs');
  const r = spawnSync('node', [bin, 'finalize', 'mydoc', '--apply'], {
    cwd: d, encoding: 'utf-8',
  });
  assert.equal(r.status, 0, `expected exit 0, got ${r.status}. stderr: ${r.stderr}`);
  assert.ok(fs.existsSync(path.join(runRoot, 'FINAL.md')));
  assert.ok(fs.existsSync(path.join(runRoot, 'FINAL.docx')));
  assert.ok(fs.existsSync(path.join(runRoot, 'LOSSY_REPORT.md')));
  const polishLog = fs.readFileSync(path.join(runRoot, 'polish-log.md'), 'utf-8');
  assert.match(polishLog, /## Roundtrip/);
  assert.match(polishLog, /FINAL\.docx/);
});

// ---------- Runner ----------
(async () => {
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`  ok  ${t.name}`);
    } catch (err) {
      failed++;
      console.error(`FAIL  ${t.name}`);
      console.error(err.stack || err.message);
    }
  }
  console.log(`\n${tests.length - failed}/${tests.length} passed`);
  process.exit(failed ? 1 : 0);
})();
