const fs = require('fs');
const path = require('path');

const SEVERITIES = ['material', 'minor', 'nit'];

// HARDEN-03: FORMAT-02 boundary markers. Reviewers may anchor findings to a
// specific slide/sheet/page using HTML comments the loader injected in
// working.md. If two findings reference the SAME marker they are almost
// certainly the same issue even if summary text differs.
const MARKER_RE = /<!--\s*(slide|sheet|page)\s*:\s*([^\s-][^-]*?)\s*-->/gi;

function extractMarkers(text) {
  if (!text) return [];
  const out = new Set();
  let m;
  MARKER_RE.lastIndex = 0;
  while ((m = MARKER_RE.exec(text)) !== null) {
    out.add(`${m[1].toLowerCase()}:${m[2].trim().toLowerCase()}`);
  }
  return Array.from(out);
}

function parseCritique(markdown) {
  // Critiques use H2 per finding. Each finding block may contain:
  //   **severity:** material
  //   **summary:** ...
  //   body paragraphs (may start with "STRUCTURAL:" to flag premise-level)
  const findings = [];
  const blocks = markdown.split(/^##\s+/m).slice(1);
  for (const block of blocks) {
    const lines = block.split('\n');
    const title = lines.shift().trim();
    const body = lines.join('\n');
    const sevMatch = body.match(/\*\*severity:\*\*\s*(material|minor|nit)/i);
    const sumMatch = body.match(/\*\*summary:\*\*\s*([^\n]+)/i);
    const severity = sevMatch ? sevMatch[1].toLowerCase() : 'minor';
    const summary = sumMatch ? sumMatch[1].trim() : title;
    // Structural = reviewer flagged premise-level (body or title starts with STRUCTURAL:)
    const structural = /\bSTRUCTURAL:/i.test(title) || /(^|\n)\s*STRUCTURAL:/i.test(body);
    const markers = extractMarkers(`${title}\n${body}`);
    findings.push({ title, severity, summary, body: body.trim(), structural, markers });
  }
  return findings;
}

function tokenize(s) {
  return new Set((s || '').toLowerCase().match(/[a-z0-9']+/g) || []);
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

// HARDEN-03: bigram-Dice on cluster-key text. Robust to paraphrase
// where Jaccard over word tokens would split ("pricing model unclear"
// vs "pricing isn't explained"). Char bigrams capture partial-word
// structure that survives rewording.
function charBigrams(s) {
  const norm = (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const out = new Set();
  for (let i = 0; i < norm.length - 1; i++) out.add(norm.slice(i, i + 2));
  return out;
}

function biDice(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const g of a) if (b.has(g)) inter++;
  return (2 * inter) / (a.size + b.size);
}

function dedupFindings(findings, similarityThreshold = 0.5) {
  // HARDEN-03: bigram-Dice (char-bigrams) replaces token-Jaccard on the
  // summary+title cluster key. Dice ~0.50 ≈ Jaccard ~0.33; paraphrase-robust.
  // Additional anchor: HTML-comment boundary markers (<!-- slide:N -->,
  // <!-- sheet:Name -->, <!-- page:N -->) emitted by FORMAT-02 loaders.
  // If two findings mention the SAME marker, cluster regardless of summary.
  // Deliberately NOT perfect — we err toward preserving findings. The
  // convergence gate only counts material, so false splits can only delay
  // convergence, not cause a false stop.
  const clusters = [];
  for (const f of findings) {
    const key = f.summary + ' ' + f.title;
    const grams = charBigrams(key);
    const tokens = tokenize(key);            // kept for persistence-match back-compat
    const markers = new Set(f.markers || []);
    let placed = false;
    for (const c of clusters) {
      // Marker anchor wins if present on both sides.
      let markerHit = false;
      if (markers.size && c.markers.size) {
        for (const m of markers) { if (c.markers.has(m)) { markerHit = true; break; } }
      }
      if (markerHit || biDice(grams, c.grams) >= similarityThreshold) {
        c.items.push(f);
        // Merge markers so downstream findings cluster transitively.
        for (const m of markers) c.markers.add(m);
        // promote cluster severity to highest-severity member
        const curIdx = SEVERITIES.indexOf(c.severity);
        const newIdx = SEVERITIES.indexOf(f.severity);
        if (newIdx !== -1 && (curIdx === -1 || newIdx < curIdx)) c.severity = f.severity;
        placed = true;
        break;
      }
    }
    if (!placed) {
      clusters.push({
        grams,
        tokens,
        markers,
        severity: f.severity,
        canonical_summary: f.summary,
        items: [f],
      });
    }
  }
  return clusters.map(c => ({
    severity: c.severity,
    summary: c.canonical_summary,
    reviewer_count: c.items.length,
    findings: c.items,
    structural: c.items.some(f => f.structural),
    tokens: Array.from(c.tokens),
    markers: Array.from(c.markers),
  }));
}

function loadPriorClusters(runDir, currentRound) {
  // Returns array of { round, clusters: [{ summary, severity, structural, tokens }] }
  // Reads aggregate.json files written by previous rounds. Missing rounds are skipped.
  if (!runDir || currentRound <= 1) return [];
  const out = [];
  for (let n = 1; n < currentRound; n++) {
    const p = path.join(runDir, `round-${n}`, 'aggregate.json');
    if (!fs.existsSync(p)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      if (Array.isArray(data.clusters)) out.push({ round: n, clusters: data.clusters });
    } catch {}
  }
  return out;
}

function annotatePersistence(clusters, priorRounds, similarityThreshold = 0.45) {
  // For each current cluster, count prior rounds in which a similar material cluster appeared.
  for (const c of clusters) {
    const tokens = new Set(c.tokens || []);
    let persisted = 0;
    const persistedRounds = [];
    for (const pr of priorRounds) {
      const hit = (pr.clusters || []).some(pc => {
        if (pc.severity !== 'material') return false;
        const pcTokens = new Set(pc.tokens || []);
        return jaccard(tokens, pcTokens) >= similarityThreshold;
      });
      if (hit) { persisted++; persistedRounds.push(pr.round); }
    }
    c.persistence_count = persisted;
    c.persisted_rounds = persistedRounds;
    // Heuristic: same material finding ≥2 prior rounds OR a structural-flagged material cluster
    // → treat as structural. Reviewers' explicit STRUCTURAL: tag is the strongest signal.
    if (c.severity === 'material' && (c.structural || persisted >= 2)) {
      c.structural = true;
    }
  }
  return clusters;
}

function aggregateRound(critiquePaths, opts = {}) {
  const all = [];
  const perReviewer = {};
  for (const p of critiquePaths) {
    const reviewer = path.basename(p, '.md').replace(/^critique-/, '');
    const md = fs.readFileSync(p, 'utf-8');
    const findings = parseCritique(md).map(f => ({ ...f, reviewer }));
    perReviewer[reviewer] = findings.length;
    all.push(...findings);
  }
  let clusters = dedupFindings(all);
  const priorRounds = opts.runDir
    ? loadPriorClusters(opts.runDir, opts.currentRound || 1)
    : [];
  clusters = annotatePersistence(clusters, priorRounds);
  const by = { material: 0, minor: 0, nit: 0 };
  for (const c of clusters) by[c.severity] = (by[c.severity] || 0) + 1;
  const structuralCount = clusters.filter(c => c.structural && c.severity === 'material').length;
  return {
    total_raw: all.length,
    per_reviewer: perReviewer,
    unique_clusters: clusters.length,
    by_severity: by,
    structural_count: structuralCount,
    clusters,
  };
}

function renderAggregate(agg, config, roundNumber) {
  const lines = [];
  lines.push(`# Round ${roundNumber} Aggregate`);
  lines.push('');
  lines.push(`**Raw findings:** ${agg.total_raw}`);
  lines.push(`**Unique after dedup:** ${agg.unique_clusters}`);
  lines.push(`**Material:** ${agg.by_severity.material || 0}`);
  lines.push(`**Minor:** ${agg.by_severity.minor || 0}`);
  lines.push(`**Nit:** ${agg.by_severity.nit || 0}`);
  lines.push(`**Structural (premise-level):** ${agg.structural_count || 0}`);
  lines.push('');
  const converged = (agg.by_severity.material || 0) <= config.convergence_threshold;
  lines.push(`**Convergence threshold:** ${config.convergence_threshold} material`);
  lines.push(`**Converged:** ${converged ? 'YES — loop stops' : 'no — continue'}`);
  lines.push('');
  if ((agg.structural_count || 0) > 0) {
    lines.push('## ⚠ Structural alert');
    lines.push('');
    lines.push('One or more material findings appear to be **premise-level**, not surface-level.');
    lines.push('Editor rewrites cannot fix structural problems — the underlying claim, pricing model,');
    lines.push('or thesis needs a real decision. Surface the structural clusters below before redrafting.');
    lines.push('');
    const struct = agg.clusters.filter(c => c.structural && c.severity === 'material');
    for (const c of struct) {
      const persist = (c.persistence_count || 0) > 0
        ? ` (also raised in round${c.persisted_rounds.length > 1 ? 's' : ''} ${c.persisted_rounds.join(', ')})`
        : '';
      lines.push(`- **${c.summary}**${persist}`);
    }
    lines.push('');
  }
  lines.push('## Per-reviewer totals');
  for (const [r, n] of Object.entries(agg.per_reviewer)) {
    lines.push(`- ${r}: ${n} findings`);
  }
  lines.push('');
  for (const sev of SEVERITIES) {
    const group = agg.clusters.filter(c => c.severity === sev);
    if (!group.length) continue;
    lines.push(`## ${sev.toUpperCase()} findings (${group.length})`);
    lines.push('');
    for (const c of group) {
      const tag = c.structural && c.severity === 'material' ? ' — STRUCTURAL' : '';
      lines.push(`### ${c.summary}${tag}`);
      lines.push(`**Raised by ${c.reviewer_count} reviewer(s):** ${c.findings.map(f => f.reviewer).join(', ')}`);
      if ((c.persistence_count || 0) > 0) {
        lines.push(`**Persistence:** also raised material in round(s) ${c.persisted_rounds.join(', ')}`);
      }
      lines.push('');
      for (const f of c.findings) {
        lines.push(`- **${f.reviewer}:** ${f.body.replace(/\n+/g, ' ').slice(0, 400)}`);
      }
      lines.push('');
    }
  }
  return { markdown: lines.join('\n'), converged };
}

function aggregateJson(agg) {
  // Compact, persistence-only payload. Body text is intentionally omitted —
  // future rounds need just enough to detect "same finding came back".
  return {
    by_severity: agg.by_severity,
    structural_count: agg.structural_count,
    clusters: agg.clusters.map(c => ({
      summary: c.summary,
      severity: c.severity,
      structural: !!c.structural,
      reviewer_count: c.reviewer_count,
      tokens: c.tokens || [],
      markers: c.markers || [],
      resolved: false,
    })),
  };
}

module.exports = { parseCritique, dedupFindings, aggregateRound, renderAggregate, aggregateJson, extractMarkers, SEVERITIES };
