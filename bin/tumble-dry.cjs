#!/usr/bin/env node
/**
 * tumble-dry — simulated-public-contact review loop
 *
 * This CLI is the data-plane utility. The orchestration (dispatching
 * reviewer subagents, reading critiques, deciding when to stop) lives
 * in the /tumble-dry slash command's workflow so it can leverage Claude
 * Code's Task-tool parallelism directly.
 *
 * Subcommands:
 *   init <artifact-path>                  Create .tumble-dry/<slug>/ run dir, print slug + round dir
 *   new-round <slug>                      Create next round-N dir under .tumble-dry/<slug>/, print it
 *   sample-voice                          Print JSON array of voice-ref excerpts
 *   aggregate <slug> <round>              Read round-N/critique-*.md, write aggregate.md, print convergence JSON
 *   drift <slug> <round> <before> <after> Compute voice-drift report between two files
 *   config                                Print resolved config as JSON
 *   panel-stub <slug> <round> <count>     Write a starter persona panel audience.md stub
 */

const fs = require('fs');
const path = require('path');
const { loadConfig } = require('../lib/config.cjs');
const { sampleExcerpts, getVoiceExcerpts, voiceDriftReport } = require('../lib/voice.cjs');
const { aggregateRound, renderAggregate, aggregateJson } = require('../lib/aggregator.cjs');
const { initRun, roundDir, currentRound } = require('../lib/run-state.cjs');
const {
  buildReviewerBrief,
  buildAudienceBrief,
  buildAuditorBrief,
  buildEditorBrief,
  extractPersonas,
  personaSlug,
} = require('../lib/reviewer-brief.cjs');

const AGENTS_DIR = path.resolve(__dirname, '..', 'agents');

const argv = process.argv.slice(2);
const cmd = argv[0];
const cwd = process.cwd();

function die(msg, code = 1) { console.error(`tumble-dry: ${msg}`); process.exit(code); }

function findRunDir(slug) {
  const dir = path.join(cwd, '.tumble-dry', slug);
  if (!fs.existsSync(dir)) die(`run not found: ${dir}`);
  return dir;
}

switch (cmd) {
  case 'init': {
    const artifact = argv[1];
    if (!artifact) die('usage: init <artifact-path>');
    if (!fs.existsSync(path.resolve(cwd, artifact))) die(`artifact not found: ${artifact}`);
    const { slug, runDir, artifactAbs } = initRun(cwd, artifact);
    const round = currentRound(runDir) + 1;
    const rDir = roundDir(runDir, round);
    fs.writeFileSync(path.join(runDir, 'artifact.path'), artifactAbs);
    console.log(JSON.stringify({ slug, run_dir: runDir, round, round_dir: rDir, artifact: artifactAbs }, null, 2));
    break;
  }
  case 'new-round': {
    const slug = argv[1];
    if (!slug) die('usage: new-round <slug>');
    const runDir = findRunDir(slug);
    const round = currentRound(runDir) + 1;
    const rDir = roundDir(runDir, round);
    console.log(JSON.stringify({ slug, round, round_dir: rDir }, null, 2));
    break;
  }
  case 'sample-voice': {
    const cfg = loadConfig(cwd);
    const count = parseInt(argv[1] || cfg.panel_size || '4', 10);
    const slug = argv[2];
    let voiceAnchor = null;
    if (slug) {
      const runDir = path.join(cwd, '.tumble-dry', slug);
      if (fs.existsSync(runDir)) {
        const original = path.join(runDir, 'history', 'round-0-original.md');
        if (fs.existsSync(original)) voiceAnchor = original;
        else {
          const apath = path.join(runDir, 'artifact.path');
          if (fs.existsSync(apath)) voiceAnchor = fs.readFileSync(apath, 'utf-8').trim();
        }
      }
    }
    const { source, excerpts } = getVoiceExcerpts(cfg.voice_refs, voiceAnchor, count);
    console.log(JSON.stringify({ voice_refs: cfg.voice_refs, source, excerpts }, null, 2));
    break;
  }
  case 'aggregate': {
    const slug = argv[1];
    const round = parseInt(argv[2], 10);
    if (!slug || !round) die('usage: aggregate <slug> <round>');
    const runDir = findRunDir(slug);
    const rDir = path.join(runDir, `round-${round}`);
    if (!fs.existsSync(rDir)) die(`round dir not found: ${rDir}`);
    const critiques = fs.readdirSync(rDir)
      .filter(n => /^critique-.+\.md$/.test(n))
      .map(n => path.join(rDir, n));
    if (!critiques.length) die(`no critique-*.md files in ${rDir}`);
    const cfg = loadConfig(cwd);
    const agg = aggregateRound(critiques, { runDir, currentRound: round });
    const { markdown, converged } = renderAggregate(agg, cfg, round);
    fs.writeFileSync(path.join(rDir, 'aggregate.md'), markdown, 'utf-8');
    fs.writeFileSync(path.join(rDir, 'aggregate.json'), JSON.stringify(aggregateJson(agg), null, 2), 'utf-8');
    console.log(JSON.stringify({
      round,
      converged,
      material: agg.by_severity.material || 0,
      minor: agg.by_severity.minor || 0,
      nit: agg.by_severity.nit || 0,
      structural: agg.structural_count || 0,
      unique_clusters: agg.unique_clusters,
      critique_count: critiques.length,
      aggregate_path: path.join(rDir, 'aggregate.md'),
    }, null, 2));
    break;
  }
  case 'drift': {
    const slug = argv[1];
    const round = parseInt(argv[2], 10);
    const beforePath = argv[3];
    const afterPath = argv[4];
    if (!slug || !round || !beforePath || !afterPath) die('usage: drift <slug> <round> <before> <after>');
    const runDir = findRunDir(slug);
    const rDir = path.join(runDir, `round-${round}`);
    fs.mkdirSync(rDir, { recursive: true });
    const before = fs.readFileSync(beforePath, 'utf-8');
    const after = fs.readFileSync(afterPath, 'utf-8');
    const report = voiceDriftReport(before, after);
    const { counts, drift_score, sentences_before, sentences_after } = report;
    const lines = [];
    lines.push(`# Round ${round} Voice-Drift Report`);
    lines.push('');
    lines.push(`**Sentences before:** ${sentences_before} · **after:** ${sentences_after}`);
    lines.push(`**Unchanged:** ${counts.unchanged} · **Modified:** ${counts.modified} · **Inserted:** ${counts.inserted} · **Deleted:** ${counts.deleted}`);
    lines.push(`**Drift score:** ${drift_score} _(fraction of preserved sentences that were materially modified; insertions don't count)_`);
    lines.push('');
    if (drift_score < 0.1 && counts.inserted === 0) {
      lines.push('_Voice guardrail held — minimal modification, no insertions._');
    } else if (drift_score < 0.25) {
      lines.push('_Voice largely preserved. Some modification (see samples)._');
    } else {
      lines.push('_⚠ Significant modification of original sentences. Review carefully._');
    }
    if (report.modified_samples.length) {
      lines.push('', '## Modified sentences (first 10)', '');
      for (const f of report.modified_samples) {
        lines.push(`- **Overlap ${f.overlap}:** ${f.after}`);
        if (f.before) lines.push(`  - _was:_ ${f.before}`);
      }
    }
    if (report.inserted_samples.length) {
      lines.push('', '## Inserted sentences (first 10 — net-new content)', '');
      for (const s of report.inserted_samples) lines.push(`- ${s}`);
    }
    if (report.deleted_samples.length) {
      lines.push('', '## Deleted sentences (first 10)', '');
      for (const s of report.deleted_samples) lines.push(`- ${s}`);
    }
    fs.writeFileSync(path.join(rDir, 'diff.md'), lines.join('\n'), 'utf-8');
    console.log(JSON.stringify({ round, ...report, diff_path: path.join(rDir, 'diff.md') }, null, 2));
    break;
  }
  case 'config': {
    console.log(JSON.stringify(loadConfig(cwd), null, 2));
    break;
  }
  case 'brief-audience': {
    const slug = argv[1];
    const round = parseInt(argv[2], 10);
    if (!slug || !round) die('usage: brief-audience <slug> <round>');
    const runDir = findRunDir(slug);
    const rDir = path.join(runDir, `round-${round}`);
    const artifactPath = fs.readFileSync(path.join(runDir, 'artifact.path'), 'utf-8').trim();
    const artifactText = fs.readFileSync(artifactPath, 'utf-8');
    const cfg = loadConfig(cwd);
    const panelSize = parseInt(argv[3] || cfg.panel_size, 10);
    const audienceOverride = argv[4] && argv[4] !== '-' ? argv[4] : cfg.audience_override;
    const brief = buildAudienceBrief({
      artifactText,
      panelSize,
      audienceOverride,
      agentPath: path.join(AGENTS_DIR, 'audience-inferrer.md'),
      roundNumber: round,
    });
    const outPath = path.join(rDir, 'brief-audience.md');
    fs.writeFileSync(outPath, brief, 'utf-8');
    console.log(outPath);
    break;
  }
  case 'brief-auditor': {
    const slug = argv[1];
    const round = parseInt(argv[2], 10);
    if (!slug || !round) die('usage: brief-auditor <slug> <round>');
    const runDir = findRunDir(slug);
    const rDir = path.join(runDir, `round-${round}`);
    const artifactPath = fs.readFileSync(path.join(runDir, 'artifact.path'), 'utf-8').trim();
    const artifactText = fs.readFileSync(artifactPath, 'utf-8');
    const brief = buildAuditorBrief({
      artifactText,
      agentPath: path.join(AGENTS_DIR, 'assumption-auditor.md'),
      roundNumber: round,
    });
    const outPath = path.join(rDir, 'brief-auditor.md');
    fs.writeFileSync(outPath, brief, 'utf-8');
    console.log(outPath);
    break;
  }
  case 'extract-personas': {
    const slug = argv[1];
    if (!slug) die('usage: extract-personas <slug>');
    const runDir = findRunDir(slug);
    const audiencePath = path.join(runDir, 'round-1', 'audience.md');
    if (!fs.existsSync(audiencePath)) die(`audience.md not found: ${audiencePath}`);
    const personas = extractPersonas(fs.readFileSync(audiencePath, 'utf-8'));
    console.log(JSON.stringify(personas.map(p => ({ name: p.name, slug: p.slug })), null, 2));
    break;
  }
  case 'brief-reviewer':
  case 'brief-reviewers': {
    const slug = argv[1];
    const round = parseInt(argv[2], 10);
    const onlySlug = cmd === 'brief-reviewer' ? argv[3] : null;
    if (!slug || !round || (cmd === 'brief-reviewer' && !onlySlug)) {
      die(`usage: ${cmd} <slug> <round>${cmd === 'brief-reviewer' ? ' <persona-slug>' : ''}`);
    }
    const runDir = findRunDir(slug);
    const rDir = path.join(runDir, `round-${round}`);
    fs.mkdirSync(rDir, { recursive: true });
    const artifactPath = fs.readFileSync(path.join(runDir, 'artifact.path'), 'utf-8').trim();
    const artifactText = fs.readFileSync(artifactPath, 'utf-8');
    const auditPath = path.join(runDir, 'round-1', 'assumption-audit.md');
    const assumptionAudit = fs.existsSync(auditPath) ? fs.readFileSync(auditPath, 'utf-8') : '_(no audit available)_';
    const audiencePath = path.join(runDir, 'round-1', 'audience.md');
    if (!fs.existsSync(audiencePath)) die(`audience.md not found`);
    const personas = extractPersonas(fs.readFileSync(audiencePath, 'utf-8'));
    const targets = onlySlug ? personas.filter(p => p.slug === onlySlug) : personas;
    if (!targets.length) die(onlySlug ? `persona slug not found: ${onlySlug}` : `no personas in audience.md`);
    const cfg = loadConfig(cwd);
    const reviewerAgentPath = path.join(AGENTS_DIR, 'reviewer.md');
    const written = [];
    for (const p of targets) {
      const brief = buildReviewerBrief({
        artifactText,
        personaSlug: p.slug,
        personaBlock: p.block,
        assumptionAudit,
        voiceExcerpts: getVoiceExcerpts(cfg.voice_refs, artifactPath, 4).excerpts,
        roundNumber: round,
        reviewerAgentPath,
        runDir, // HARDEN-04: auto-loads prior round's unresolved material
      });
      const outPath = path.join(rDir, `brief-reviewer-${p.slug}.md`);
      fs.writeFileSync(outPath, brief, 'utf-8');
      written.push({ slug: p.slug, name: p.name, brief_path: outPath });
    }
    console.log(JSON.stringify(written, null, 2));
    break;
  }
  case 'brief-editor': {
    const slug = argv[1];
    const round = parseInt(argv[2], 10);
    if (!slug || !round) die('usage: brief-editor <slug> <round>');
    const runDir = findRunDir(slug);
    const rDir = path.join(runDir, `round-${round}`);
    const artifactPath = fs.readFileSync(path.join(runDir, 'artifact.path'), 'utf-8').trim();
    const artifactText = fs.readFileSync(artifactPath, 'utf-8');
    const aggPath = path.join(rDir, 'aggregate.md');
    if (!fs.existsSync(aggPath)) die(`aggregate.md not found — run aggregate first`);
    const aggregateMarkdown = fs.readFileSync(aggPath, 'utf-8');
    const cfg = loadConfig(cwd);
    // Self-voice fallback when no voice_refs configured: sample from the
    // original source. Editor's job becomes "preserve the source's own voice"
    // rather than "imitate an external corpus."
    const originalSnapshot = path.join(runDir, 'history', 'round-0-original.md');
    const voiceAnchor = fs.existsSync(originalSnapshot) ? originalSnapshot : artifactPath;
    const { source: voiceSource, excerpts } = getVoiceExcerpts(cfg.voice_refs, voiceAnchor, 4);
    const brief = buildEditorBrief({
      artifactText,
      aggregateMarkdown,
      voiceExcerpts: excerpts,
      voiceSource,
      agentPath: path.join(AGENTS_DIR, 'editor.md'),
      roundNumber: round,
    });
    const outPath = path.join(rDir, 'brief-editor.md');
    fs.writeFileSync(outPath, brief, 'utf-8');
    console.log(outPath);
    break;
  }
  case 'extract-redraft': {
    const slug = argv[1];
    const round = parseInt(argv[2], 10);
    if (!slug || !round) die('usage: extract-redraft <slug> <round>');
    const runDir = findRunDir(slug);
    const rDir = path.join(runDir, `round-${round}`);
    const redraftMdPath = path.join(rDir, 'proposed-redraft.md');
    if (!fs.existsSync(redraftMdPath)) die(`proposed-redraft.md not found`);
    const md = fs.readFileSync(redraftMdPath, 'utf-8');
    const m = md.match(/##\s+Redrafted artifact\s*\n([\s\S]+?)$/i);
    if (!m) die(`Redrafted artifact section not found in proposed-redraft.md`);
    const staged = path.join(rDir, 'redraft-staged.md');
    fs.writeFileSync(staged, m[1].trim() + '\n', 'utf-8');
    console.log(staged);
    break;
  }
  case 'finalize': {
    const slug = argv[1];
    if (!slug) die('usage: finalize <slug>');
    const runDir = findRunDir(slug);
    const artifactPath = fs.readFileSync(path.join(runDir, 'artifact.path'), 'utf-8').trim();
    const sourcePathFile = path.join(runDir, 'source.path');
    const sourcePath = fs.existsSync(sourcePathFile) ? fs.readFileSync(sourcePathFile, 'utf-8').trim() : artifactPath;
    const finalPath = path.join(runDir, 'FINAL.md');
    fs.copyFileSync(artifactPath, finalPath);
    // Assemble polish log from round aggregates
    const rounds = fs.readdirSync(runDir)
      .filter(n => /^round-\d+$/.test(n))
      .map(n => parseInt(n.replace('round-', ''), 10))
      .sort((a, b) => a - b);
    const logLines = [
      `# Polish Log — ${slug}`,
      '',
      `**Source (untouched):** ${sourcePath}`,
      `**Working copy:** ${artifactPath}`,
      `**Final polished:** ${finalPath}`,
      `**History:** ${path.join(runDir, 'history')}/`,
      `**Total rounds:** ${rounds.length}`,
      '',
      `> Source file is preserved byte-for-byte at \`${sourcePath}\`. To apply the polished version, run: \`cp ${finalPath} ${sourcePath}\``,
      '',
    ];
    for (const r of rounds) {
      const aggPath = path.join(runDir, `round-${r}`, 'aggregate.md');
      logLines.push(`## Round ${r}`);
      if (fs.existsSync(aggPath)) {
        const agg = fs.readFileSync(aggPath, 'utf-8');
        const material = (agg.match(/\*\*Material:\*\*\s*(\d+)/) || [])[1] || '?';
        const minor = (agg.match(/\*\*Minor:\*\*\s*(\d+)/) || [])[1] || '?';
        const nit = (agg.match(/\*\*Nit:\*\*\s*(\d+)/) || [])[1] || '?';
        const converged = /\*\*Converged:\*\*\s*YES/i.test(agg);
        logLines.push(`- Material: ${material} | Minor: ${minor} | Nit: ${nit}`);
        logLines.push(`- Converged: ${converged ? 'yes' : 'no'}`);
      } else {
        logLines.push('- (no aggregate)');
      }
      logLines.push('');
    }
    fs.writeFileSync(path.join(runDir, 'polish-log.md'), logLines.join('\n'), 'utf-8');
    console.log(JSON.stringify({ final: finalPath, polish_log: path.join(runDir, 'polish-log.md') }, null, 2));
    break;
  }
  default:
    console.error('tumble-dry — content polish via simulated-public-contact review');
    console.error('');
    console.error('Subcommands:');
    console.error('  init <artifact-path>');
    console.error('  new-round <slug>');
    console.error('  sample-voice [count]');
    console.error('  aggregate <slug> <round>');
    console.error('  drift <slug> <round> <before> <after>');
    console.error('  config');
    console.error('  brief-audience <slug> <round> [panel-size] [override]');
    console.error('  brief-auditor <slug> <round>');
    console.error('  extract-personas <slug>');
    console.error('  brief-reviewer <slug> <round> <persona-slug>');
    console.error('  brief-editor <slug> <round>');
    console.error('  extract-redraft <slug> <round>');
    console.error('  finalize <slug>');
    process.exit(cmd ? 2 : 0);
}
