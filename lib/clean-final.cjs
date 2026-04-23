// lib/clean-final.cjs
// Strip reviewer/editor annotation patterns from FINAL.md to produce a shipping draft.
//
// tumble-dry FINAL.md preserves the editor's inline reviewer attributions, round-by-round
// status callouts, and process-tracker blocks (Structural decisions required, Blocking-item
// tracker, Decision ownership) so the user has decision traceability. For a comment-free
// shipping version, this module strips those annotations with conservative regex passes.
//
// This is a best-effort post-processor. The editor is not required to emit a fixed annotation
// grammar, so novel shapes will leak through. The shapes handled below are the ones observed
// across the reference runs (prose FAB, product spec, press-release draft). Patterns that are
// genuinely ambiguous (e.g., a bare "round 3" appearing inside real product copy) are
// intentionally not stripped — better to leak than to destroy content.
//
// Usage:
//   const { cleanFinal } = require('./clean-final.cjs');
//   const cleaned = cleanFinal(finalMd);

'use strict';

// Known reviewer-slug signals. If a bracketed block contains any of these, it's commentary.
const REVIEWER_SIGNAL = /\b(asher-ng|maya-okonkwo|priya-shah|hn-rtx-skeptic|elena-voss|REVIEWERS?\s—|STRUCTURAL\s—|ATTRIBUTION\s+FIX|SCHEDULING\s+SEMANTICS|PERF-?CLAIM\s+METHODOLOGY|round-\d|Round-\d|tracked\s+as\s+B\d|editor\s+refuses|editor\s+flagged|editor\s+note|CHAMPION\s+trigger|voice\s+conflict|Option\s+[AB]|nit\s+fix|style\s+nit|elena-voss\s+hedge|elena-voss\s+nit|elena-voss\s+legal|version\s+pin\s*—\s*elena-voss|hn-rtx-skeptic\s+(nit|minor|material)|assumption-audit|redraft|aggregate\s+reviewer\s+pass|round\s+\d+\s+(status|reconciliation|annotation|response|minor|material|nit)|material\s+finding\s+in\s+the\s+round|reviewer\s+history|reviewer-list\s+annotation)/i;

// Headings / bold labels with round-annotation parentheticals: strip the parenthetical only.
// Matches these shapes at any position within the line:
//   **Thesis (round-1 add; moved above reviewer list round 2; ...)**
//   **Foundry Local in GA (round-2 ...)**
//   **Headline (candidate direction, round-2 draft — PR to refine):** ...
//   **Decision ownership (round-1 add; retained and reconciled with ...)**
// Rule: if a parenthetical contains any REVIEWER_SIGNAL, drop the entire parenthetical (and
// its leading whitespace). Leave the surrounding text untouched.
function stripRoundParenthetical(line) {
  return line.replace(
    /\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g,
    (match, inner) => {
      if (REVIEWER_SIGNAL.test(inner)) return '';
      return match;
    }
  );
}

// Strip inline bracketed commentary blocks. A bracketed block is treated as commentary if
// it contains any REVIEWER_SIGNAL. Bracketed content that is pure placeholder (e.g., [DATE],
// [XXX], [TBD], [BASELINE TBD], [10X], [G-Assist?]) is preserved — those are real FAB gaps.
//
// Two-pass strategy:
//   Pass A — handle bracket blocks that contain NESTED brackets (e.g., the editor quoting
//     `[DATE]` inside a reviewer narration). Scan linearly, track depth, and when a top-level
//     `[` opens a block whose (flat) content matches a commentary signal, consume through the
//     matching `]`. Also handle markdown-link bracket pairs: `[text](url)` is a link, NOT a
//     commentary block — skip those by only treating a `[` as an open when not immediately
//     followed later by `](`.
//   Pass B — handle bracket blocks without nested brackets via a simple regex for leftovers
//     and the tracker-reference cases (`[tracked as B\d+...]`, `[contingent on B\d+...]`).
function stripReviewerBrackets(text) {
  let out = nestingAwareBracketStrip(text);
  // Pass B — regex leftovers.
  for (let i = 0; i < 6; i += 1) {
    const prev = out;
    out = out.replace(/\[([^\[\]]{4,})\]/g, (match, inner) => {
      if (REVIEWER_SIGNAL.test(inner)) return '';
      // Tracker-reference markers — strip even without a reviewer slug.
      if (/^\s*(contingent on|tracked as)\s+B\d+\b/i.test(inner)) return '';
      if (/^\s*B\d+\s*(—|–|-)/.test(inner)) return '';
      return match;
    });
    if (out === prev) break;
  }
  return out;
}

// Scan for top-level `[` openers that are NOT markdown-link openers (`[text](url)`),
// track depth with nested `[` `]`, and if the block's flat text matches REVIEWER_SIGNAL,
// remove the entire block (including nested brackets).
function nestingAwareBracketStrip(text) {
  const out = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (ch === '[' && !isMarkdownLinkOpener(text, i)) {
      // Find matching `]` tracking depth.
      let depth = 1;
      let j = i + 1;
      while (j < n && depth > 0) {
        const c = text[j];
        if (c === '[') depth += 1;
        else if (c === ']') depth -= 1;
        if (depth === 0) break;
        j += 1;
      }
      if (depth === 0) {
        const inner = text.slice(i + 1, j);
        if (REVIEWER_SIGNAL.test(inner)) {
          // Skip whole block including nested brackets. Consume the closing `]`.
          i = j + 1;
          continue;
        }
      }
    }
    out.push(ch);
    i += 1;
  }
  return out.join('');
}

// Heuristic: is `text[pos]` the `[` of a markdown link `[label](url)`? Look ahead for `](`
// within ~200 chars without crossing a newline boundary or an unmatched `]`.
function isMarkdownLinkOpener(text, pos) {
  const maxScan = Math.min(pos + 300, text.length);
  let depth = 0;
  for (let k = pos; k < maxScan; k += 1) {
    const c = text[k];
    if (c === '\n') return false;
    if (c === '[') depth += 1;
    else if (c === ']') {
      depth -= 1;
      if (depth === 0) {
        // Next char must be `(` for a link.
        return text[k + 1] === '(';
      }
    }
  }
  return false;
}

// Strip **Round-N ...** bold-inline status updates that the editor interleaves inside bullets.
// Example: "…retained through final edit — don't let it drift back to \"automatic.\" **Round-3 elena-voss: this phrasing is…"
// These runs typically extend to end-of-line OR end-of-sentence, and we strip the whole bold span plus the trailing clause
// up to the next clean sentence terminator before paragraph break. Conservative rule: strip the **Round-N...** bold span
// and everything until the next newline.
function stripInlineRoundBoldRuns(text) {
  return text.replace(/\*\*Round-?\d[^*\n]*?\*\*[^\n]*$/gim, '');
}

// Strip italic meta-note paragraphs (single-paragraph italic blocks that are process commentary).
// Known prefixes:
//   *Reading order revised in round 2 …*
//   *Beat order changed in round 2 …*
//   *Reviewer notes on the working copy: …*
//   *Scaffold only — PMs have not filled. …*
//   *Status: scaffold + working headline …*
//   *Working copy, round-\d editor draft …*
//   *(Retained this section header deliberately. …)*
// Paragraphs are separated by blank lines. Strip whole paragraph if it starts with one of these.
function stripItalicMetaParagraphs(text) {
  // Prefixes that unambiguously mark a process-commentary paragraph, whether the full paragraph
  // is italicized or only the header is italicized with plain-text commentary following.
  const metaPrefixes = [
    /^\*Reading order (revised|changed) in round/i,
    /^\*Beat order (revised|changed) in round/i,
    /^\*Reviewer notes on the working copy:/i,
    /^\*Scaffold only\b/i,
    /^\*Status: scaffold\b/i,
    /^\*Working copy,\s+round-?\d/i,
    /^\*\(Retained this section header deliberately/i,
  ];
  const paras = text.split(/\n{2,}/);
  const kept = paras.filter((p) => {
    const trimmed = p.trim();
    if (!trimmed) return true;
    return !metaPrefixes.some((rx) => rx.test(trimmed));
  });
  return kept.join('\n\n');
}

// Strip "Round-N convergence note (editor):" paragraphs entirely.
function stripConvergenceNotes(text) {
  const paras = text.split(/\n{2,}/);
  const kept = paras.filter((p) => !/^\*\*Round-?\d+\s+convergence note\s*\(editor\):\*\*/i.test(p.trim()));
  return kept.join('\n\n');
}

// Strip whole sections by heading name. Removes the heading line and everything through
// (but not including) the next heading at the same or higher level.
//
// Heading levels: `#` = 1, `##` = 2, `###` = 3, etc. A section starts at a line matching
// `^#{level}\s+<title>` and ends at the next `^#{1..level}\s+` line.
function stripSectionByHeading(text, headingPatterns) {
  const lines = text.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const m = line.match(/^(#+)\s+(.+?)\s*$/);
    if (m) {
      const level = m[1].length;
      const title = m[2];
      const matched = headingPatterns.some((rx) => rx.test(title));
      if (matched) {
        // Skip until we reach a heading at level <= this one.
        i += 1;
        while (i < lines.length) {
          const next = lines[i];
          const nm = next.match(/^(#+)\s+/);
          if (nm && nm[1].length <= level) break;
          i += 1;
        }
        continue;
      }
    }
    out.push(line);
    i += 1;
  }
  return out.join('\n');
}

// Strip process-artifact blocks that aren't headings (e.g., bolded block labels followed by bullets).
// Removes a **label** line and all subsequent indented/bulleted lines until the next blank line
// followed by a non-list line, OR a new **label** or heading.
function stripLabeledBlocks(text, labelPatterns) {
  const lines = text.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    const isLabel = labelPatterns.some((rx) => rx.test(trimmed));
    if (isLabel) {
      i += 1;
      // Skip bullets and blank lines directly under the label.
      while (i < lines.length) {
        const next = lines[i];
        const ntrim = next.trim();
        if (ntrim === '') {
          // If the next non-blank line is another bullet of this block, keep skipping; else stop.
          let j = i + 1;
          while (j < lines.length && lines[j].trim() === '') j += 1;
          if (j < lines.length && /^[*\-]\s+/.test(lines[j].trim())) {
            i = j;
            continue;
          }
          break;
        }
        if (/^[*\-]\s+/.test(ntrim) || /^\s{2,}/.test(next)) {
          i += 1;
          continue;
        }
        break;
      }
      continue;
    }
    out.push(line);
    i += 1;
  }
  return out.join('\n');
}

// Strip role-annotation suffixes on reviewer-list entries.
// Pattern: "[Name](mailto:…) — **decide:** …" → "[Name](mailto:…)"
// Also handles: "— reviewer", "— stakeholder", "— **block:** …", "— **approve:** …".
function stripReviewerRoleAnnotations(text) {
  // Handles two observed shapes:
  //   …mailto:…) — **decide:** foo bar; **block:** baz    (consume to end-of-line)
  //   …mailto:…) (GeForce) — reviewer                       (consume just the keyword)
  //   …mailto:…) — stakeholder
  // The role keywords (reviewer, stakeholder) are bare; the annotation keywords (decide, block,
  // approve) are bold with a trailing colon and take an argument clause.
  let out = text;
  out = out.replace(
    /(\]\(mailto:[^)]+\)(?:\s+\([^)]*\))?)\s+—\s+\*\*(?:decide|block|approve):\*\*[^\n]*/g,
    '$1'
  );
  out = out.replace(
    /(\]\(mailto:[^)]+\)(?:\s+\([^)]*\))?)\s+—\s+(?:reviewer|stakeholder)\b/g,
    '$1'
  );
  return out;
}

// Strip "round-N annotation per reviewer-slug" suffixes on the **Reviewers** header.
// Example: "**Reviewers** *(round-3 annotation per priya-shah minor — …)*"
function stripReviewerHeaderSuffix(text) {
  return text.replace(
    /(\*\*Reviewers\*\*)\s*\*\((?:round-?\d[^)]*)\)\*/g,
    '$1'
  );
}

// Strip the Decision ownership bolded block (round-1 add; retained and reconciled…).
// This is structurally similar to a labeled block but the label is italicized within ** and has a parenthetical.
function stripDecisionOwnership(text) {
  return stripLabeledBlocks(text, [
    /^\*\*Decision ownership\b/i,
  ]);
}

// Collapse runs of 3+ blank lines down to exactly one blank line.
function collapseBlankLines(text) {
  return text.replace(/\n{3,}/g, '\n\n');
}

// Normalize trailing whitespace on each line.
function normalizeTrailingWhitespace(text) {
  return text.split('\n').map((l) => l.replace(/\s+$/g, '')).join('\n');
}

/**
 * Strip reviewer/editor annotations from a FINAL.md body.
 * @param {string} finalMd - full markdown text of FINAL.md.
 * @returns {string} clean markdown text suitable as a shipping draft.
 */
function cleanFinal(finalMd) {
  let t = finalMd;

  // 1) Whole sections (process-artifact headings).
  t = stripSectionByHeading(t, [
    /^Structural decisions required\b/i,
    /^Blocking-item tracker\b/i,
  ]);

  // 2) Labeled blocks that are process-only (not under a heading).
  t = stripDecisionOwnership(t);

  // 3) Paragraph-level strippers.
  t = stripConvergenceNotes(t);
  t = stripItalicMetaParagraphs(t);

  // 4) Inline strippers. Bracket stripping must run BEFORE stripInlineRoundBoldRuns so that
  //    the closing `]` of a reviewer bracket isn't consumed by the bold-run stripper.
  t = stripReviewerBrackets(t);
  t = stripInlineRoundBoldRuns(t);
  // Re-run bracket stripping in case the bold-run removal exposed a now-cleanly-bracketed block.
  t = stripReviewerBrackets(t);
  t = stripReviewerRoleAnnotations(t);
  t = stripReviewerHeaderSuffix(t);

  // 5) Round-parenthetical suffixes anywhere (gated on REVIEWER_SIGNAL inside the parenthetical).
  t = t
    .split('\n')
    .map((line) => stripRoundParenthetical(line))
    .join('\n');

  // 6) Dash-prefixed reviewer-slug clauses.
  //    Example: "*   (NVIDIA accelerates Windows) — maya-okonkwo flagged as 'relationship not news'; demoted."
  //    Also handles bold-label dashes: "**Label (foo) — round-N reviewer-attribution clause:**" →
  //    preserve the label + colon, drop the dash clause.
  //
  //    Pass 6a: dash clause inside a bold label (ends at the closing `**`).
  t = t.replace(
    /(\*\*[^*\n]+?)\s+—\s+(?:round-?\d+[^*\n]*|[a-z][a-z0-9-]*-[a-z][a-z0-9-]*[^*\n]*)(:\*\*)/gi,
    (match, before, colonClose) => (REVIEWER_SIGNAL.test(match) ? `${before}${colonClose}` : match)
  );
  //    Pass 6b: dash clause extending to end-of-line.
  t = t.replace(
    /\s+—\s+(?:[a-z][a-z0-9-]*-[a-z][a-z0-9-]*|REVIEWERS?|STRUCTURAL)[^\n]*$/gim,
    (match) => (REVIEWER_SIGNAL.test(match) ? '' : match)
  );

  // 7) Trailing-sentence strippers for tracker references.
  //    "Phillip Singh to populate before external release; tracked as B10/B11." → strip trailing clause.
  t = t.replace(/;\s*(tracked as|see)\s+B\d+(?:\s*\/\s*B\d+)*[^\n]*$/gim, '');
  //    "Tracked as B8." sentence at end of line → drop.
  t = t.replace(/\s+(?:Tracked as|See)\s+B\d+(?:\s*\/\s*B\d+)*\s*\.?\s*$/gim, '');

  // 8) Whitespace cleanup.
  t = normalizeTrailingWhitespace(t);
  t = collapseBlankLines(t);

  return t.replace(/^\s+|\s+$/g, '') + '\n';
}

module.exports = { cleanFinal };
