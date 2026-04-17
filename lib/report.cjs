/**
 * HEADLESS-03: per-round + final REPORT.md writer.
 *
 * Per-round REPORT.md format (short — the main session cats the final one):
 *   # Round N Report — <slug>
 *
 *   <one-paragraph summary drawn from aggregate.json counts + drift>
 *
 *   ## Top material findings
 *   1. <summary>
 *   2. <summary>
 *   3. <summary>
 *
 *   ## Drift
 *   - Content drift: X
 *   - Structural drift: X
 *   - Converged: yes/no
 *
 * Final REPORT.md rolls per-round reports into a milestone-style summary
 * capped at ~5-10KB so main-session ingestion stays cheap.
 */

const fs = require('fs');
const path = require('path');
const { loadRegister } = require('./structural-register.cjs');

function parseAggregateJson(runDir, round) {
  const p = path.join(runDir, `round-${round}`, 'aggregate.json');
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); }
  catch { return null; }
}

function readTopFindings(runDir, round, limit = 3) {
  // Aggregate.md stores findings in severity order with H2 headers. Pull the
  // first `limit` H2 titles that fall under the material section. Cheap and
  // good-enough — avoids re-parsing every critique.
  const p = path.join(runDir, `round-${round}`, 'aggregate.md');
  if (!fs.existsSync(p)) return [];
  const text = fs.readFileSync(p, 'utf-8');
  const lines = text.split('\n');
  const out = [];
  let inMaterial = false;
  for (const l of lines) {
    if (/^#+\s+material/i.test(l)) { inMaterial = true; continue; }
    if (/^#+\s+(minor|nit|structural)/i.test(l)) { inMaterial = false; continue; }
    if (inMaterial && /^##\s+/.test(l)) {
      const title = l.replace(/^##\s+/, '').trim();
      if (title) out.push(title);
      if (out.length >= limit) break;
    }
  }
  return out;
}

function writeRoundReport(runDir, round) {
  const roundDir = path.join(runDir, `round-${round}`);
  if (!fs.existsSync(roundDir)) return null;
  const agg = parseAggregateJson(runDir, round) || {};
  const material = (agg.by_severity && agg.by_severity.material) || 0;
  const minor = (agg.by_severity && agg.by_severity.minor) || 0;
  const structural = agg.structural_count || 0;
  const contentDrift = agg.content_drift != null ? agg.content_drift : '—';
  const structuralDrift = agg.structural_drift != null ? agg.structural_drift : '—';
  const driftBlocked = agg.drift_blocked ? ' (BLOCKED)' : '';
  const converged = agg.converged === true;
  const top = readTopFindings(runDir, round, 3);
  const slug = path.basename(runDir);

  const scoreAvg = agg.scores && agg.scores.avg != null ? agg.scores.avg : null;
  const scoreStr = scoreAvg != null ? ` Score: ${scoreAvg}/10.` : '';

  const summary = converged
    ? `Round ${round} converged on ${slug}. Material findings: ${material}. Minor: ${minor}. Structural: ${structural}. Drift: ${contentDrift}${driftBlocked}.${scoreStr}`
    : `Round ${round} surfaced ${material} material finding(s) across ${agg.critique_count || '?'} reviewers on ${slug}. Minor: ${minor}. Structural: ${structural}. Drift: ${contentDrift}${driftBlocked}.${scoreStr}`;

  const lines = [
    `# Round ${round} Report — ${slug}`,
    '',
    summary,
    '',
    '## Top material findings',
    '',
  ];
  if (top.length === 0) lines.push('_No material findings this round._');
  else top.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
  lines.push('');
  lines.push('## Drift');
  lines.push('');
  lines.push(`- Content drift: ${contentDrift}`);
  lines.push(`- Structural drift: ${structuralDrift}`);
  lines.push(`- Converged: ${converged ? 'yes' : 'no'}`);
  if (agg.drift_blocked) lines.push(`- Drift blocked convergence (editor rewriting too much)`);
  lines.push('');

  // REGISTER-03: surface register in round report
  const register = loadRegister(runDir);
  if (register.length > 0) {
    const summaries = register.map(e => e.finding_summary).join('; ');
    lines.push('## Structural register');
    lines.push('');
    lines.push(`${register.length} structural finding(s) acknowledged (not blocking convergence): ${summaries}`);
    lines.push('');
  }

  const outPath = path.join(roundDir, 'REPORT.md');
  fs.writeFileSync(outPath, lines.join('\n'), 'utf-8');
  return outPath;
}

function writeFinalReport(runDir) {
  if (!fs.existsSync(runDir)) return null;
  const slug = path.basename(runDir);
  const rounds = fs.readdirSync(runDir)
    .filter(n => /^round-\d+$/.test(n))
    .map(n => parseInt(n.replace('round-', ''), 10))
    .sort((a, b) => a - b);
  if (!rounds.length) return null;

  const lastAgg = parseAggregateJson(runDir, rounds[rounds.length - 1]) || {};
  const finalConverged = lastAgg.converged === true;

  const lines = [
    `# tumble-dry Report — ${slug}`,
    '',
    finalConverged
      ? `Converged at round ${rounds[rounds.length - 1]} after ${rounds.length} round(s).`
      : `Did not converge. Ran ${rounds.length} round(s).`,
    '',
    '## Per-round summary',
    '',
    '| Round | Material | Minor | Structural | Drift | Score | Converged |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const r of rounds) {
    const a = parseAggregateJson(runDir, r) || {};
    const mat = (a.by_severity && a.by_severity.material) || 0;
    const min = (a.by_severity && a.by_severity.minor) || 0;
    const struct = a.structural_count || 0;
    const d = a.content_drift != null ? a.content_drift : '—';
    const sc = a.scores && a.scores.avg != null ? `${a.scores.avg}/10` : '—';
    const conv = a.converged === true ? 'yes' : 'no';
    lines.push(`| ${r} | ${mat} | ${min} | ${struct} | ${d} | ${sc} | ${conv} |`);
  }
  lines.push('');

  // Score trajectory — enables regression detection across runs
  const hasAnyScores = rounds.some(r => {
    const a = parseAggregateJson(runDir, r) || {};
    return a.scores && a.scores.avg != null;
  });
  if (hasAnyScores) {
    lines.push('## Score trajectory');
    lines.push('');
    const firstScore = (() => { for (const r of rounds) { const a = parseAggregateJson(runDir, r) || {}; if (a.scores?.avg != null) return a.scores.avg; } return null; })();
    const lastScore = (() => { for (let i = rounds.length - 1; i >= 0; i--) { const a = parseAggregateJson(runDir, rounds[i]) || {}; if (a.scores?.avg != null) return a.scores.avg; } return null; })();
    if (firstScore != null && lastScore != null) {
      const delta = Math.round((lastScore - firstScore) * 10) / 10;
      const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
      lines.push(`**${firstScore}/10 → ${lastScore}/10** (${delta >= 0 ? '+' : ''}${delta} ${arrow})`);
      lines.push('');
      if (delta < 0) {
        lines.push('⚠ Score regressed — later rounds scored lower than earlier ones. Check whether editor rewrites introduced new problems or whether reviewer fatigue inflated early scores.');
      } else if (delta >= 2) {
        lines.push('Strong improvement across rounds — convergence loop is working as intended.');
      }
    }
    lines.push('');
  }

  // Cat the last round's top findings to keep main session ingest cheap.
  const lastTop = readTopFindings(runDir, rounds[rounds.length - 1], 3);
  if (lastTop.length) {
    lines.push('## Last-round top material findings');
    lines.push('');
    lastTop.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
    lines.push('');
  }

  // REGISTER-03: surface register in final report
  const finalRegister = loadRegister(runDir);
  if (finalRegister.length > 0) {
    const summaries = finalRegister.map(e => e.finding_summary).join('; ');
    lines.push('## Structural register');
    lines.push('');
    lines.push(`${finalRegister.length} structural finding(s) acknowledged (not blocking convergence): ${summaries}`);
    lines.push('');
  }

  lines.push('## Artifacts');
  lines.push('');
  lines.push(`- FINAL.md: \`${path.join(runDir, 'FINAL.md')}\``);
  lines.push(`- polish-log.md: \`${path.join(runDir, 'polish-log.md')}\``);
  lines.push(`- per-round reports: \`${runDir}/round-*/REPORT.md\``);
  lines.push('');

  const outPath = path.join(runDir, 'REPORT.md');
  fs.writeFileSync(outPath, lines.join('\n'), 'utf-8');
  return outPath;
}

module.exports = { writeRoundReport, writeFinalReport, parseAggregateJson, readTopFindings };
