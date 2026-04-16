/**
 * COMP-01..02: Component integration — patch generation + application.
 *
 * After convergence, diff FINAL.md against the source and produce a
 * unified diff patch at `.tumble-dry/<slug>/PATCH.diff`.
 *
 * For JSX/TSX sources: extract string literals / JSX text nodes from
 * the source, match against FINAL.md sections, produce targeted
 * text-content replacements.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Generate a unified diff between source and final.
 * Uses system `diff -u` if available, otherwise a simple line-by-line diff.
 */
function generatePatch(sourcePath, finalPath) {
  const sourceText = fs.readFileSync(sourcePath, 'utf-8');
  const finalText = fs.readFileSync(finalPath, 'utf-8');

  // Try system diff first
  try {
    const diff = execSync(
      `diff -u "${sourcePath}" "${finalPath}"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return diff; // identical files → empty string
  } catch (err) {
    // diff returns exit code 1 when files differ — that's normal
    if (err.stdout) return err.stdout;
    // If diff command not found, build a simple unified diff
    return simpleDiff(sourcePath, sourceText, finalPath, finalText);
  }
}

/**
 * Simple unified diff fallback when system diff is unavailable.
 */
function simpleDiff(aPath, aText, bPath, bText) {
  const aLines = aText.split('\n');
  const bLines = bText.split('\n');
  const lines = [];
  lines.push(`--- ${aPath}`);
  lines.push(`+++ ${bPath}`);

  // Naive: show all as one hunk
  lines.push(`@@ -1,${aLines.length} +1,${bLines.length} @@`);
  for (const l of aLines) lines.push(`-${l}`);
  for (const l of bLines) lines.push(`+${l}`);
  return lines.join('\n') + '\n';
}

/**
 * For JSX/TSX: extract string literals and JSX text, match against
 * FINAL.md content, produce targeted replacements as a patch.
 *
 * This is a best-effort heuristic — not a full AST rewrite.
 * Extracts lines containing JSX text (between > and <) or string
 * literals in quotes, finds matching text in FINAL.md, and produces
 * a diff with just the text content changes.
 */
function generateJsxPatch(sourcePath, finalPath) {
  const sourceText = fs.readFileSync(sourcePath, 'utf-8');
  const finalText = fs.readFileSync(finalPath, 'utf-8');
  const sourceLines = sourceText.split('\n');
  const finalLines = finalText.split('\n');

  // Extract text segments from JSX: content between > and <
  const jsxTextRe = />([\s]*[^<>{}\n]{10,}[\s]*)</g;
  // Also match string literals: "..." or '...' with 10+ chars
  const stringLitRe = /["']([\s\S]{10,?})["']/g;

  const replacements = [];
  const finalJoined = finalLines.join('\n');

  for (let i = 0; i < sourceLines.length; i++) {
    const line = sourceLines[i];
    let match;

    // Check JSX text nodes
    jsxTextRe.lastIndex = 0;
    while ((match = jsxTextRe.exec(line)) !== null) {
      const text = match[1].trim();
      if (text.length < 10) continue;
      // Find a close match in FINAL.md
      const replacement = findBestMatch(text, finalLines);
      if (replacement && replacement !== text) {
        replacements.push({ line: i + 1, original: text, replacement });
      }
    }

    // Check string literals
    stringLitRe.lastIndex = 0;
    while ((match = stringLitRe.exec(line)) !== null) {
      const text = match[1].trim();
      if (text.length < 10) continue;
      const replacement = findBestMatch(text, finalLines);
      if (replacement && replacement !== text) {
        replacements.push({ line: i + 1, original: text, replacement });
      }
    }
  }

  if (!replacements.length) {
    // Fall back to regular diff
    return generatePatch(sourcePath, finalPath);
  }

  // Build a targeted diff from replacements
  const modifiedSource = sourceText.split('');
  const patchLines = [`--- ${sourcePath}`, `+++ ${sourcePath}`];
  for (const r of replacements) {
    patchLines.push(`@@ -${r.line},1 +${r.line},1 @@`);
    const origLine = sourceLines[r.line - 1];
    const newLine = origLine.replace(r.original, r.replacement);
    patchLines.push(`-${origLine}`);
    patchLines.push(`+${newLine}`);
  }
  return patchLines.join('\n') + '\n';
}

/**
 * Find the best matching line in FINAL.md for a source text snippet.
 * Uses word overlap to find the closest match.
 */
function findBestMatch(text, finalLines) {
  const textWords = new Set(text.toLowerCase().match(/[a-z0-9']+/g) || []);
  if (!textWords.size) return null;

  let bestScore = 0;
  let bestLine = null;

  for (const line of finalLines) {
    const lineWords = new Set(line.toLowerCase().match(/[a-z0-9']+/g) || []);
    if (!lineWords.size) continue;
    let inter = 0;
    for (const w of textWords) if (lineWords.has(w)) inter++;
    const score = inter / Math.max(textWords.size, lineWords.size);
    if (score > bestScore && score >= 0.3) {
      bestScore = score;
      bestLine = line.trim();
    }
  }
  return bestLine;
}

/**
 * COMP-01: Write patch file.
 */
function writePatch(runDir, sourcePath, finalPath) {
  const ext = path.extname(sourcePath).toLowerCase();
  const isJsx = ['.jsx', '.tsx', '.js', '.ts'].includes(ext);

  let diff;
  if (isJsx) {
    diff = generateJsxPatch(sourcePath, finalPath);
  } else {
    diff = generatePatch(sourcePath, finalPath);
  }

  const patchPath = path.join(runDir, 'PATCH.diff');
  fs.writeFileSync(patchPath, diff, 'utf-8');
  return patchPath;
}

/**
 * COMP-02: Apply patch via git apply or manual patching.
 */
function applyPatch(runDir, opts = {}) {
  const cwd = opts.cwd || process.cwd();
  const patchPath = path.join(runDir, 'PATCH.diff');
  if (!fs.existsSync(patchPath)) {
    return { ok: false, reason: 'no_patch', path: patchPath };
  }

  const diff = fs.readFileSync(patchPath, 'utf-8');
  if (!diff.trim()) {
    return { ok: false, reason: 'empty_patch' };
  }

  // Try git apply first
  try {
    execSync(`git apply "${patchPath}"`, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { ok: true, method: 'git_apply', path: patchPath };
  } catch {
    // git apply failed — try with --3way
    try {
      execSync(`git apply --3way "${patchPath}"`, {
        cwd,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return { ok: true, method: 'git_apply_3way', path: patchPath };
    } catch {
      return { ok: false, reason: 'apply_failed', path: patchPath,
        hint: 'Patch could not be applied automatically. Review PATCH.diff and apply manually.' };
    }
  }
}

module.exports = {
  generatePatch,
  generateJsxPatch,
  writePatch,
  applyPatch,
  findBestMatch,
};
