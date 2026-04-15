const fs = require('fs');
const path = require('path');

function listTextFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try { entries = fs.readdirSync(cur, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const full = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.isFile() && /\.(md|markdown|txt)$/i.test(e.name)) out.push(full);
    }
  }
  return out;
}

/**
 * Sample voice excerpts from the user's past writing.
 *
 * If `voiceRefs` is empty / unset, returns []. Callers should fall back to
 * `sampleSelfVoice(originalArtifactPath)` so the editor gets *something* —
 * defaulting to "preserve the source's own voice" beats no voice signal at all.
 */
function sampleExcerpts(voiceRefs, count = 4, excerptChars = 1200) {
  const pool = [];
  for (const ref of voiceRefs || []) {
    let stat;
    try { stat = fs.statSync(ref); } catch { continue; }
    if (stat.isDirectory()) pool.push(...listTextFiles(ref));
    else if (stat.isFile()) pool.push(ref);
  }
  if (!pool.length) return [];

  const excerpts = [];
  const seen = new Set();
  const maxTries = Math.min(count * 4, pool.length * 2);
  for (let i = 0; i < maxTries && excerpts.length < count; i++) {
    const file = pool[Math.floor(Math.random() * pool.length)];
    if (seen.has(file)) continue;
    seen.add(file);
    let fd, size;
    try {
      const st = fs.statSync(file);
      size = st.size;
      if (!size) continue;
      fd = fs.openSync(file, 'r');
    } catch { continue; }
    const start = size > excerptChars ? Math.floor(Math.random() * (size - excerptChars)) : 0;
    const buf = Buffer.alloc(Math.min(excerptChars, size));
    try {
      fs.readSync(fd, buf, 0, buf.length, start);
    } catch { fs.closeSync(fd); continue; }
    fs.closeSync(fd);
    const raw = buf.toString('utf-8');
    if (!raw.trim()) continue;
    const trimmed = start > 0 ? raw.replace(/^[^\n]*\n/, '…\n') : raw;
    excerpts.push({ file: path.basename(file), text: trimmed.trim() });
  }
  return excerpts;
}

function tokenize(s) {
  return s.toLowerCase().match(/[a-z0-9']+/g) || [];
}

function characterBigrams(s) {
  const normalized = (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const out = new Set();
  for (let i = 0; i < normalized.length - 1; i++) out.add(normalized.slice(i, i + 2));
  return out;
}

function bigramSimilarity(a, b) {
  const ba = characterBigrams(a);
  const bb = characterBigrams(b);
  if (!ba.size || !bb.size) return 0;
  let inter = 0;
  for (const g of ba) if (bb.has(g)) inter++;
  // Dice coefficient: 2*inter / (|A| + |B|)
  return (2 * inter) / (ba.size + bb.size);
}

function sentenceOverlap(a, b) {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (!ta.size || !tb.size) return 1;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const denom = Math.max(ta.size, tb.size);
  return inter / denom;
}

function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z"'“])/)
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Strip markdown structural tokens so that two texts differing only in
 * heading depth, list markers, blank lines, or fence formatting produce
 * the same canonical string. This isolates SUBSTANTIVE (content) drift
 * from STRUCTURAL (markdown re-shape) drift.
 *
 * What we strip:
 *   - ATX heading markers (#, ##, ...) — keeps heading text
 *   - List bullets (-, *, +, N.) — keeps item text
 *   - Fenced code block fences (```lang / ```)
 *   - Blockquote markers (>)
 *   - Table pipes (|) and delimiter rows (---)
 *   - HTML comments (including our boundary markers <!-- slide:N --> etc.)
 *   - Runs of blank lines (collapsed to single newline)
 *   - Trailing whitespace on every line
 */
function stripMarkdownStructure(text) {
  if (!text) return '';
  return text
    .split('\n')
    .map(l => l
      .replace(/^\s*#{1,6}\s+/, '')             // heading markers
      .replace(/^\s*[-*+]\s+/, '')              // bullet list markers
      .replace(/^\s*\d+\.\s+/, '')              // ordered list markers
      .replace(/^\s*>\s?/, '')                  // blockquote
      .replace(/^```.*$/, '')                   // fence lines
      .replace(/\|/g, ' ')                      // table pipes
      .replace(/^\s*:?-{3,}:?\s*$/, '')         // table delimiter row
      .replace(/<!--[\s\S]*?-->/g, '')          // html comments (incl. boundary markers)
      .replace(/\s+$/, '')
    )
    .join('\n')
    .replace(/\n{2,}/g, '\n')                   // collapse blank-line runs
    .trim();
}

/**
 * Structural drift score: fraction of characters that differ AFTER
 * content has been canonicalized (token-equivalent) but structure
 * (heading depth, list markers, fences, boundary markers) may have
 * changed. Cheap bigram-Dice on the PRE-strip text; if bigram
 * similarity is high but post-strip content identical, drift was
 * purely structural.
 *
 * Returns a score in [0, 1]. Informational only — does not gate.
 */
// Raw char-bigram Dice on BYTES (no normalization) — captures formatting
// differences that bigramSimilarity's alphanumeric-normalize would hide.
function rawCharBigrams(s) {
  const out = new Set();
  if (!s) return out;
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  return out;
}
function rawBigramDice(a, b) {
  const ba = rawCharBigrams(a);
  const bb = rawCharBigrams(b);
  if (!ba.size || !bb.size) return 0;
  let inter = 0;
  for (const g of ba) if (bb.has(g)) inter++;
  return (2 * inter) / (ba.size + bb.size);
}

function structuralDriftScore(beforeText, afterText) {
  const beforeStripped = stripMarkdownStructure(beforeText);
  const afterStripped = stripMarkdownStructure(afterText);
  // Raw delta on actual bytes (preserves markdown-token differences).
  const raw = 1 - rawBigramDice(beforeText, afterText);
  // If stripped content is identical, ALL the raw delta was structural.
  if (beforeStripped === afterStripped) return Number(raw.toFixed(3));
  // Otherwise subtract the content-level component.
  const content = 1 - rawBigramDice(beforeStripped, afterStripped);
  return Number(Math.max(0, raw - content).toFixed(3));
}

/**
 * Classify each AFTER-sentence as one of:
 *   unchanged  — matches a BEFORE-sentence at overlap ≥ preservedThreshold (default 0.85)
 *   modified   — matches a BEFORE-sentence at overlap ≥ driftThreshold but < preservedThreshold
 *   inserted   — best match to BEFORE is below driftThreshold (i.e., net-new content)
 *
 * Drift score = modified / (unchanged + modified). Insertions don't inflate it.
 *
 * Also reports deleted sentences — BEFORE-sentences with no AFTER-sentence above driftThreshold.
 */
function voiceDriftReport(beforeText, afterText, {
  driftThreshold = 0.6,
  preservedThreshold = 0.85,
} = {}) {
  const before = splitSentences(beforeText);
  const after = splitSentences(afterText);
  const classifications = [];
  const beforeMatched = new Array(before.length).fill(false);

  for (const aSent of after) {
    let best = 0, bestIdx = -1;
    for (let i = 0; i < before.length; i++) {
      const s = sentenceOverlap(aSent, before[i]);
      if (s > best) { best = s; bestIdx = i; }
    }
    let kind;
    if (best >= preservedThreshold) { kind = 'unchanged'; beforeMatched[bestIdx] = true; }
    else if (best >= driftThreshold) { kind = 'modified';  beforeMatched[bestIdx] = true; }
    else { kind = 'inserted'; }
    classifications.push({
      kind,
      after: aSent,
      before: bestIdx >= 0 ? before[bestIdx] : null,
      overlap: Number(best.toFixed(3)),
      afterIdx: classifications.length,
    });
  }

  // Second pass: heavy-paraphrase detection.
  // Pair "inserted" after-sentences with still-unmatched "deleted" before-sentences
  // by longest-common-bigrams / length similarity. If a weak signal exists, reclassify
  // both as a modified pair rather than inserted+deleted.
  const insertedClassifications = classifications.filter(c => c.kind === 'inserted');
  for (const ins of insertedClassifications) {
    let best = 0, bestIdx = -1;
    for (let i = 0; i < before.length; i++) {
      if (beforeMatched[i]) continue;
      const score = bigramSimilarity(ins.after, before[i]);
      if (score > best) { best = score; bestIdx = i; }
    }
    // Bigram Dice ≥ 0.35 is the paraphrase threshold. Lower is noise.
    // A proper paraphrase shares enough character structure to pass this;
    // unrelated sentences won't. Proper semantic match needs embeddings — v2.
    if (best >= 0.35 && bestIdx >= 0) {
      ins.kind = 'modified';
      ins.before = before[bestIdx];
      ins.overlap = Number(best.toFixed(3));
      ins.paraphrase = true;
      beforeMatched[bestIdx] = true;
    }
  }

  const deleted = before.filter((_, i) => !beforeMatched[i]);
  const counts = { unchanged: 0, modified: 0, inserted: 0, deleted: deleted.length };
  for (const c of classifications) counts[c.kind]++;

  const preservedPool = counts.unchanged + counts.modified;
  const drift_score = preservedPool > 0 ? Number((counts.modified / preservedPool).toFixed(3)) : 0;

  // HARDEN-02: split drift into structural (markdown re-shape) vs content
  // (substantive sentence rewrites). Only content_drift gates convergence
  // in HARDEN-01. Back-compat: drift_score === content_drift.
  const structural_drift = structuralDriftScore(beforeText, afterText);
  const content_drift = drift_score;

  return {
    sentences_after: after.length,
    sentences_before: before.length,
    counts,
    drift_score,
    structural_drift,
    content_drift,
    modified_samples: classifications.filter(c => c.kind === 'modified').slice(0, 10),
    inserted_samples: classifications.filter(c => c.kind === 'inserted').slice(0, 10).map(c => c.after),
    deleted_samples: deleted.slice(0, 10),
  };
}

/**
 * Self-voice fallback. When the user hasn't pointed voice_refs at any past
 * writing, sample the source artifact itself so the editor's "voice anchor"
 * is just "preserve what's already there." This is the right default for
 * the common case (polish a single doc; no corpus required).
 *
 * Returns excerpts in the same shape as sampleExcerpts(): [{ file, text }, ...].
 * Slices the source into evenly-spaced chunks rather than random windows so
 * we cover the whole tone arc, not just one paragraph.
 */
function sampleSelfVoice(artifactPath, count = 4, excerptChars = 1200) {
  if (!artifactPath || !fs.existsSync(artifactPath)) return [];
  let raw;
  try { raw = fs.readFileSync(artifactPath, 'utf-8'); } catch { return []; }
  if (!raw.trim()) return [];

  const text = raw.trim();
  if (text.length <= excerptChars) {
    return [{ file: path.basename(artifactPath) + ' (self)', text }];
  }
  const out = [];
  const step = Math.max(1, Math.floor((text.length - excerptChars) / Math.max(1, count - 1)));
  for (let i = 0; i < count; i++) {
    const start = Math.min(i * step, text.length - excerptChars);
    const slice = text.slice(start, start + excerptChars);
    // Trim partial leading/trailing words so excerpts read cleanly.
    const cleaned = slice.replace(/^\S*\s/, '').replace(/\s\S*$/, '');
    out.push({
      file: path.basename(artifactPath) + ' (self, ~' + Math.round((start / text.length) * 100) + '%)',
      text: cleaned,
    });
  }
  return out;
}

/**
 * Convenience: returns voice excerpts using voice_refs if configured,
 * otherwise self-samples from the artifact. Always returns at least one
 * excerpt (the source itself) when artifactPath is valid — voice signal
 * is now opt-out, not opt-in.
 */
function getVoiceExcerpts(voiceRefs, artifactPath, count = 4, excerptChars = 1200) {
  const fromRefs = sampleExcerpts(voiceRefs, count, excerptChars);
  if (fromRefs.length) return { source: 'voice_refs', excerpts: fromRefs };
  const fromSelf = sampleSelfVoice(artifactPath, count, excerptChars);
  return { source: 'self', excerpts: fromSelf };
}

module.exports = {
  sampleExcerpts,
  sampleSelfVoice,
  getVoiceExcerpts,
  voiceDriftReport,
  sentenceOverlap,
  stripMarkdownStructure,
  structuralDriftScore,
};
