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
const { initRun, initBatch, roundDir, currentRound } = require('../lib/run-state.cjs');
const { readStatus, writeStatus, initStatus, isOrphan, renderProgressLine } = require('../lib/status.cjs');
const { writeRoundReport, writeFinalReport } = require('../lib/report.cjs');
const { estimateRunCost, renderCostBlock } = require('../lib/pricing.cjs');
const { inferDefaults, dumpConfigYaml } = require('../lib/canary.cjs');
const { astDriftReport, parseCheck } = require('../lib/code/ast-drift.cjs');
const gitInt = require('../lib/git-integration.cjs');
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

// GIT-06: --no-git flag disables all git operations.
const NO_GIT = argv.includes('--no-git');
if (NO_GIT) gitInt.disable();

// APPLY-01: --apply-to-source flag copies FINAL back to source path.
const APPLY_TO_SOURCE = argv.includes('--apply-to-source');

function die(msg, code = 1) { console.error(`tumble-dry: ${msg}`); process.exit(code); }

function findRunDir(slug) {
  const dir = path.join(cwd, '.tumble-dry', slug);
  if (!fs.existsSync(dir)) die(`run not found: ${dir}`);
  return dir;
}

function readSourceFormat(runDir) {
  const p = path.join(runDir, 'source-format.json');
  if (!fs.existsSync(p)) return { artifact_kind: 'prose' };
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
    return {
      artifact_kind: raw.artifact_kind || 'prose',
      language: raw.language || null,
      regions: raw.regions || [],
      format: raw.format,
    };
  } catch { return { artifact_kind: 'prose' }; }
}

async function runInit(artifact) {
  if (!artifact) die('usage: init <artifact-path>');
  if (!fs.existsSync(path.resolve(cwd, artifact))) die(`artifact not found: ${artifact}`);
  let runInfo;
  try {
    runInfo = await initRun(cwd, artifact);
  } catch (err) {
    const reason = err.reason || 'unknown';
    console.error(`tumble-dry: init failed (${reason}): ${err.detail || err.message}`);
    console.error('Supported formats: .md .markdown .txt .docx .pptx .xlsx .pdf (plus pandoc fallback if installed).');
    if (reason === 'unsupported') {
      console.error('Hint: run `npm install` in the tumble-dry repo root for .docx/.pptx/.xlsx/.pdf support.');
    }
    process.exit(3);
  }
  const { slug, runDir, artifactAbs } = runInfo;
  const round = currentRound(runDir) + 1;
  const rDir = roundDir(runDir, round);
  fs.writeFileSync(path.join(runDir, 'artifact.path'), artifactAbs);
  // Surface loader metadata (FORMAT-04 UX: warn before round 1).
  const fmtPath = path.join(runDir, 'source-format.json');
  let formatMeta = null;
  if (fs.existsSync(fmtPath)) {
    try { formatMeta = JSON.parse(fs.readFileSync(fmtPath, 'utf-8')); } catch { /* ignore */ }
    if (formatMeta && formatMeta.warnings && formatMeta.warnings.length) {
      for (const w of formatMeta.warnings) console.error(`[loader] warning: ${w}`);
    }
    if (formatMeta && formatMeta.format && !['markdown','txt'].includes(formatMeta.format)) {
      console.error(`[loader] source format: ${formatMeta.format} — working on markdown projection; ROUNDTRIP_WARNING.md written.`);
    }
  }
  // GIT-01: create branch unless --no-git or not a repo.
  let gitResult = null;
  if (gitInt.isEnabled()) {
    gitResult = gitInt.createRunBranch(slug, { cwd });
    if (gitResult.ok) {
      console.error(`[tumble-dry] git: on branch ${gitResult.branch}`);
    } else if (gitResult.reason !== 'not_a_repo') {
      console.error(`[tumble-dry] git: ${gitResult.reason} — continuing without git`);
    }
  }

  const out = { slug, run_dir: runDir, round, round_dir: rDir, artifact: artifactAbs };
  if (formatMeta) out.source_format = formatMeta.format;
  if (gitResult) out.git = gitResult;
  const warningPath = path.join(runDir, 'ROUNDTRIP_WARNING.md');
  if (fs.existsSync(warningPath)) out.roundtrip_warning = warningPath;
  console.log(JSON.stringify(out, null, 2));
}

switch (cmd) {
  case 'init': {
    // GLOB-02: if arg contains glob chars, expand and route to batch when N>1.
    const initArg = argv[1];
    if (initArg && /[*?{]/.test(initArg)) {
      const { expandInputs } = require('../lib/glob-expand.cjs');
      const resolved = expandInputs(cwd, [initArg]);
      if (!resolved.length) die(`no files matched glob: ${initArg}`);
      if (resolved.length > 1) {
        // Route to batch
        (async () => {
          try {
            const batch = await initBatch(cwd, resolved);
            initStatus(batch.batchDir, { kind: 'batch', slug: batch.batchSlug });
            // GIT-05: batch git branch
            if (gitInt.isEnabled()) {
              const gr = gitInt.createRunBranch(batch.batchSlug, { cwd });
              if (gr.ok) console.error(`[tumble-dry] git: on branch ${gr.branch}`);
            }
            console.log(JSON.stringify({
              kind: 'batch',
              batch_slug: batch.batchSlug,
              batch_dir: batch.batchDir,
              files: batch.fileRuns.map(f => ({
                slug: f.fileSlug,
                run_dir: f.runDir,
                artifact: f.artifactAbs,
                source: f.sourceAbs,
              })),
            }, null, 2));
          } catch (err) {
            console.error(`tumble-dry: init-batch failed: ${err.message}`);
            process.exit(1);
          }
        })().catch(e => { console.error(e.stack || e.message); process.exit(1); });
        break;
      }
      // Single file from glob — fall through to normal init
      runInit(resolved[0]).catch(err => { console.error(err.stack || err.message); process.exit(1); });
      break;
    }
    runInit(initArg).catch(err => { console.error(err.stack || err.message); process.exit(1); });
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
    const { markdown, converged } = renderAggregate(agg, cfg, round, { runDir });
    fs.writeFileSync(path.join(rDir, 'aggregate.md'), markdown, 'utf-8');
    fs.writeFileSync(path.join(rDir, 'aggregate.json'), JSON.stringify(aggregateJson(agg, converged), null, 2), 'utf-8');
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
    const srcMeta = readSourceFormat(runDir);
    if (srcMeta.artifact_kind === 'code') {
      (async () => {
        const astReport = await astDriftReport(before, after, srcMeta.language);
        const parseResult = await parseCheck(after, srcMeta.language);
        const driftPath = path.join(rDir, 'drift.json');
        const out = {
          round,
          backend: astReport.backend,
          language: srcMeta.language,
          ...astReport,
          parse_check: parseResult,
          drift_path: driftPath,
        };
        fs.writeFileSync(driftPath, JSON.stringify(out, null, 2), 'utf-8');

        const lines = [`# Round ${round} AST-Drift Report (${astReport.backend})`, ''];
        if (astReport.backend === 'tree-sitter') {
          lines.push(`**Language:** ${srcMeta.language}`);
          lines.push(`**Symbols before:** ${astReport.symbols_before} · **after:** ${astReport.symbols_after}`);
          lines.push(`**Drift score:** ${astReport.drift_score}`);
          const c = astReport.counts;
          lines.push(`**Counts:** unchanged=${c.unchanged} reformatted=${c.reformatted} moved=${c.moved} modified=${c.modified} renamed=${c.renamed} signature_changed=${c.signature_changed} added=${c.added} removed=${c.removed}`);
          if (astReport.signature_changed_count > 0) {
            lines.push('');
            lines.push(`**⚠ STRUCTURAL: ${astReport.signature_changed_count} signature change(s) on public API** — cannot silently auto-converge:`);
            for (const s of astReport.signature_changed_symbols) lines.push(`- \`${s}\``);
          }
          if (astReport.classifications) {
            lines.push('', '## Per-symbol classifications', '');
            for (const cls of astReport.classifications.slice(0, 50)) {
              lines.push(`- **${cls.kind}** \`${cls.name}\``);
            }
          }
        } else {
          lines.push(`_Fallback to sentence diff — ${astReport.reason || 'no grammar'}._`);
          lines.push(`**Drift score:** ${astReport.drift_score}`);
        }
        if (!parseResult.ok && !parseResult.skipped) {
          lines.push('', '## ⚠ proposed-redraft-invalid', '', `Parse failed: ${parseResult.error}`);
        }
        fs.writeFileSync(path.join(rDir, 'diff.md'), lines.join('\n') + '\n', 'utf-8');
        console.log(JSON.stringify(out, null, 2));
      })().catch(e => { console.error(e.stack || e.message); process.exit(1); });
      break;
    }
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
    const cfg = loadConfig(cwd);
    // BUG-3 fix: enforce panel_size cap. Runbook add-rules (layman, operator,
    // mobile reader) can push the audience-inferrer past the configured cap.
    // Trim to panel_size to prevent cost inflation (7 × 15 files × 3 rounds = 315 critiques).
    const capSize = cfg.panel_size || 5;
    let targets;
    if (onlySlug) {
      targets = personas.filter(p => p.slug === onlySlug);
    } else {
      targets = personas.slice(0, capSize);
      if (personas.length > capSize) {
        console.error(`[tumble-dry] panel capped: ${personas.length} personas → ${capSize} (panel_size=${capSize}). Use --panel-size ${personas.length} to override.`);
      }
    }
    if (!targets.length) die(onlySlug ? `persona slug not found: ${onlySlug}` : `no personas in audience.md`);
    const reviewerAgentPath = path.join(AGENTS_DIR, 'reviewer.md');
    const srcMeta = readSourceFormat(runDir);
    const written = [];
    for (const p of targets) {
      const brief = buildReviewerBrief({
        artifactText,
        personaSlug: p.slug,
        personaBlock: p.block,
        assumptionAudit,
        voiceExcerpts: srcMeta.artifact_kind === 'code'
          ? []
          : getVoiceExcerpts(cfg.voice_refs, artifactPath, 4).excerpts,
        roundNumber: round,
        reviewerAgentPath,
        runDir, // HARDEN-04: auto-loads prior round's unresolved material
        artifactKind: srcMeta.artifact_kind,
        language: srcMeta.language,
        regions: srcMeta.regions,
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
    const srcMeta = readSourceFormat(runDir);
    const isCode = srcMeta.artifact_kind === 'code';
    // CODE-04: code mode swaps voice excerpts for style anchors and
    // routes to agents/editor-code.md instead of agents/editor.md.
    const editorAgent = isCode ? 'editor-code.md' : 'editor.md';
    // Self-voice fallback when no voice_refs configured: sample from the
    // original source. Editor's job becomes "preserve the source's own voice"
    // rather than "imitate an external corpus."
    const originalSnapshot = path.join(runDir, 'history', 'round-0-original.md');
    const voiceAnchor = fs.existsSync(originalSnapshot) ? originalSnapshot : artifactPath;
    const { source: voiceSource, excerpts } = isCode
      ? { source: null, excerpts: [] }
      : getVoiceExcerpts(cfg.voice_refs, voiceAnchor, 4);
    const brief = buildEditorBrief({
      artifactText,
      aggregateMarkdown,
      voiceExcerpts: excerpts,
      voiceSource,
      agentPath: path.join(AGENTS_DIR, editorAgent),
      roundNumber: round,
      artifactKind: srcMeta.artifact_kind,
      language: srcMeta.language,
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
    // Accept positional slug + optional --apply/--apply-to-source/--clean flags
    // (ROUNDTRIP-01, APPLY-01, CLEAN-01).
    const positionals = argv.slice(1).filter(a => !a.startsWith('--'));
    const flags = argv.slice(1).filter(a => a.startsWith('--'));
    const slug = positionals[0];
    const applyRoundtrip = flags.includes('--apply');
    const applyToSource = APPLY_TO_SOURCE || flags.includes('--apply-to-source');
    const emitClean = flags.includes('--clean');
    if (!slug) die('usage: finalize <slug> [--apply] [--apply-to-source] [--clean]');
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
    // Write the base polish log up front so --apply branch can append to it.
    fs.writeFileSync(path.join(runDir, 'polish-log.md'), logLines.join('\n'), 'utf-8');
    // ROUNDTRIP-01: optional --apply flag regenerates source binary from FINAL.md.
    let roundtripOut = null;
    if (applyRoundtrip) {
      const fmtPath = path.join(runDir, 'source-format.json');
      let srcFmt = null;
      if (fs.existsSync(fmtPath)) {
        try { srcFmt = JSON.parse(fs.readFileSync(fmtPath, 'utf-8')); } catch { /* ignore */ }
      }
      const format = srcFmt && srcFmt.format;
      if (!format || ['markdown', 'txt'].includes(format)) {
        // Source already markdown — nothing to roundtrip.
        roundtripOut = { skipped: true, reason: 'source_is_markdown', format: format || 'unknown' };
      } else {
        const { writeFinal } = require('../lib/writers/index.cjs');
        const { writeReport } = require('../lib/writers/lossy-report.cjs');
        const finalMd = fs.readFileSync(finalPath, 'utf-8');
        // Resolve in IIFE to keep switch sync; the writer is async.
        (async () => {
          const result = await writeFinal(format, finalMd, srcFmt, finalPath);
          if (result.ok) {
            const reportPath = writeReport(runDir, {
              format,
              sourcePath: sourcePath,
              finalPath,
              regenPath: result.path,
              lossy: result.lossy_notes || {},
            });
            // Append to polish-log.md
            const extra = [
              '',
              '## Roundtrip',
              '',
              `- **Regenerated:** \`${result.path}\``,
              `- **Lossy report:** \`${reportPath}\``,
              '',
            ].join('\n');
            fs.appendFileSync(path.join(runDir, 'polish-log.md'), extra, 'utf-8');
            console.log(JSON.stringify({
              final: finalPath,
              polish_log: path.join(runDir, 'polish-log.md'),
              roundtrip: { ok: true, path: result.path, lossy_report: reportPath, format },
            }, null, 2));
            process.exit(0);
          } else {
            // PDF guard rail or writer failure (ROUNDTRIP-06).
            console.error(`tumble-dry: roundtrip failed (${result.reason}): ${result.detail}`);
            console.log(JSON.stringify({
              final: finalPath,
              polish_log: path.join(runDir, 'polish-log.md'),
              roundtrip: { ok: false, reason: result.reason, detail: result.detail, format },
            }, null, 2));
            // Exit 4 on PDF, 5 on other writer errors. FINAL.md still produced above.
            process.exit(result.reason === 'pdf_unsupported' ? 4 : 5);
          }
        })().catch(e => { console.error(e.stack || e.message); process.exit(2); });
        break;
      }
    }
    // GIT-03: commit FINAL.md + polish-log.md + REPORT.md on branch.
    if (gitInt.isEnabled()) {
      const fc = gitInt.commitFinal(runDir, slug, { cwd });
      if (fc.ok) console.error(`[tumble-dry] git: committed final (${fc.hash})`);
    }

    // APPLY-01: copy FINAL.md back to source path.
    if (applyToSource) {
      try {
        fs.copyFileSync(finalPath, sourcePath);
        console.error(`[tumble-dry] applied FINAL.md to ${sourcePath}`);
        if (gitInt.isEnabled()) {
          const ac = gitInt.commitApply(sourcePath, slug, { cwd });
          if (ac.ok) console.error(`[tumble-dry] git: committed apply (${ac.hash})`);
        }
      } catch (err) {
        console.error(`[tumble-dry] apply-to-source failed: ${err.message}`);
      }
    }

    // CLEAN-01: optional comment-free shipping draft alongside FINAL.md.
    let cleanPathOut = null;
    if (emitClean) {
      const { cleanFinal } = require('../lib/clean-final.cjs');
      const cleaned = cleanFinal(fs.readFileSync(finalPath, 'utf-8'));
      cleanPathOut = path.join(runDir, 'FINAL-clean.md');
      fs.writeFileSync(cleanPathOut, cleaned, 'utf-8');
      console.error(`[tumble-dry] wrote FINAL-clean.md (comment-free shipping draft)`);
    }

    // GIT-04: PR hint.
    if (gitInt.isEnabled()) {
      gitInt.prHint(slug, runDir);
      gitInt.returnToOriginalBranch({ cwd });
    }

    const out = { final: finalPath, polish_log: path.join(runDir, 'polish-log.md') };
    if (roundtripOut) out.roundtrip = roundtripOut;
    if (cleanPathOut) out.clean = cleanPathOut;
    console.log(JSON.stringify(out, null, 2));
    break;
  }
  case 'clean': {
    // CLEAN-02: post-hoc comment-stripper for an already-finalized run.
    // Reads FINAL.md, writes FINAL-clean.md alongside it.
    const slug = argv[1];
    if (!slug) die('usage: clean <slug>');
    const runDir = findRunDir(slug);
    const finalPath = path.join(runDir, 'FINAL.md');
    if (!fs.existsSync(finalPath)) die(`FINAL.md not found for slug '${slug}' (run finalize first)`);
    const { cleanFinal } = require('../lib/clean-final.cjs');
    const cleaned = cleanFinal(fs.readFileSync(finalPath, 'utf-8'));
    const cleanPath = path.join(runDir, 'FINAL-clean.md');
    fs.writeFileSync(cleanPath, cleaned, 'utf-8');
    console.log(JSON.stringify({ clean: cleanPath, source: finalPath }, null, 2));
    break;
  }
  case 'init-batch': {
    // BATCH-01: init a batch run across N artifacts. Accepts paths, globs, or directories.
    const inputs = argv.slice(1);
    if (!inputs.length) die('usage: init-batch <path-or-glob> [<path-or-glob> ...]');
    (async () => {
      const { expandInputs } = require('../lib/glob-expand.cjs');
      const resolved = expandInputs(cwd, inputs);
      if (!resolved.length) die('no files matched inputs');
      if (resolved.length === 1) {
        // Single-file: preserve single-run back-compat
        process.argv = ['node', 'tumble-dry.cjs', 'init', resolved[0]];
        return runInit(resolved[0]);
      }
      try {
        const batch = await initBatch(cwd, resolved);
        initStatus(batch.batchDir, { kind: 'batch', slug: batch.batchSlug });
        console.log(JSON.stringify({
          kind: 'batch',
          batch_slug: batch.batchSlug,
          batch_dir: batch.batchDir,
          files: batch.fileRuns.map(f => ({
            slug: f.fileSlug,
            run_dir: f.runDir,
            artifact: f.artifactAbs,
            source: f.sourceAbs,
          })),
        }, null, 2));
      } catch (err) {
        console.error(`tumble-dry: init-batch failed: ${err.message}`);
        process.exit(1);
      }
    })().catch(e => { console.error(e.stack || e.message); process.exit(1); });
    break;
  }
  case 'expand': {
    // Utility for the slash command: resolves paths/globs/dirs to a JSON array.
    const inputs = argv.slice(1);
    if (!inputs.length) die('usage: expand <path-or-glob> [<path-or-glob> ...]');
    const { expandInputs } = require('../lib/glob-expand.cjs');
    const files = expandInputs(cwd, inputs);
    console.log(JSON.stringify({ count: files.length, files }, null, 2));
    break;
  }
  case 'status': {
    // STATUS-01 + DASH-01: list runs with batch summary lines.
    const root = path.join(cwd, '.tumble-dry');
    if (!fs.existsSync(root)) {
      console.log('no runs found');
      process.exit(0);
    }
    const entries = fs.readdirSync(root, { withFileTypes: true })
      .filter(e => e.isDirectory() && !e.name.startsWith('_'));
    const rows = [];
    let anyUnconverged = false;
    const batchSummaries = []; // DASH-01: batch-level summaries

    for (const e of entries) {
      const rd = path.join(root, e.name);
      const st = readStatus(rd);
      // Detect batch by presence of batch.json
      const isBatch = fs.existsSync(path.join(rd, 'batch.json'));

      // DASH-01: batch summary
      if (isBatch) {
        let batchInfo = null;
        try { batchInfo = JSON.parse(fs.readFileSync(path.join(rd, 'batch.json'), 'utf-8')); } catch {}
        if (batchInfo && Array.isArray(batchInfo.files)) {
          const counts = { init: 0, converged: 0, in_progress: 0, forced_final: 0, total: batchInfo.files.length };
          for (const f of batchInfo.files) {
            const fileRunDir = f.run_dir || path.join(rd, f.slug || f.fileSlug);
            const fileSt = readStatus(fileRunDir);
            if (!fileSt || fileSt.phase === 'init') counts.init++;
            else if (fileSt.converged) counts.converged++;
            else if (fileSt.phase === 'max-rounds') counts.forced_final++;
            else counts.in_progress++;
          }
          batchSummaries.push({ slug: e.name, counts });
        }
        if (!st) {
          rows.push({ slug: e.name, kind: 'batch', round: '-', converged: '-', material: '-', last_updated: '-', orphan: true });
          anyUnconverged = true;
          continue;
        }
      }

      // Single: try to read latest aggregate.json
      let material = '-';
      let round = st ? st.round : 0;
      if (!st) {
        const rounds = fs.readdirSync(rd).filter(n => /^round-\d+$/.test(n)).map(n => parseInt(n.replace('round-', ''), 10)).sort((a, b) => a - b);
        if (rounds.length) {
          round = rounds[rounds.length - 1];
          const aggPath = path.join(rd, `round-${round}`, 'aggregate.json');
          if (fs.existsSync(aggPath)) {
            try {
              const agg = JSON.parse(fs.readFileSync(aggPath, 'utf-8'));
              material = (agg.by_severity && agg.by_severity.material) || 0;
            } catch { /* ignore */ }
          }
        }
      } else {
        material = st.material_count != null ? st.material_count : '-';
      }
      const converged = st ? (st.converged ? 'yes' : 'no') : (fs.existsSync(path.join(rd, 'FINAL.md')) ? 'yes' : 'unknown');
      const lastUpdated = st ? st.last_updated : (fs.existsSync(path.join(rd, 'FINAL.md')) ? fs.statSync(path.join(rd, 'FINAL.md')).mtime.toISOString() : '-');
      const orphan = st ? isOrphan(st) : (converged === 'unknown');
      if (converged !== 'yes') anyUnconverged = true;
      rows.push({ slug: e.name, kind: isBatch ? 'batch' : 'single', round, converged, material, last_updated: lastUpdated, orphan });
    }

    // DASH-01: print batch summaries first
    if (batchSummaries.length) {
      console.log('=== Batch Summary ===');
      for (const b of batchSummaries) {
        const c = b.counts;
        console.log(`  ${b.slug}: [${c.init}/${c.total} init] [${c.converged}/${c.total} converged] [${c.in_progress}/${c.total} in-progress] [${c.forced_final}/${c.total} forced-final]`);
      }
      console.log('');
    }

    // Render table
    const pad = (s, n) => String(s).padEnd(n);
    console.log(`${pad('slug', 40)} ${pad('kind', 7)} ${pad('round', 6)} ${pad('converged', 10)} ${pad('material', 9)} ${pad('last_updated', 22)} orphan`);
    console.log('-'.repeat(100));
    for (const r of rows) {
      console.log(`${pad(r.slug.slice(0, 40), 40)} ${pad(r.kind, 7)} ${pad(r.round, 6)} ${pad(r.converged, 10)} ${pad(r.material, 9)} ${pad(String(r.last_updated).slice(0, 22), 22)} ${r.orphan ? 'ORPHAN' : ''}`);
    }
    process.exit(anyUnconverged ? 1 : 0);
  }
  case 'resume': {
    // STATUS-02 + DASH-02: locate run or batch, print resume plan JSON.
    const slug = argv[1];
    if (!slug) die('usage: resume <slug>');
    const runDir = findRunDir(slug);

    // DASH-02: batch-level resume
    const batchJsonPath = path.join(runDir, 'batch.json');
    if (fs.existsSync(batchJsonPath)) {
      let batchInfo;
      try { batchInfo = JSON.parse(fs.readFileSync(batchJsonPath, 'utf-8')); } catch (e) { die(`batch.json parse error: ${e.message}`); }
      const fileStatuses = [];
      for (const f of (batchInfo.files || [])) {
        const fileRunDir = f.run_dir || path.join(runDir, f.slug || f.fileSlug);
        const fileSt = readStatus(fileRunDir);
        const converged = fileSt ? fileSt.converged : false;
        const phase = fileSt ? fileSt.phase : 'init';
        fileStatuses.push({
          slug: f.slug || f.fileSlug,
          run_dir: fileRunDir,
          converged,
          phase,
          needs_resume: !converged && phase !== 'max-rounds' && phase !== 'failed',
        });
      }
      const toResume = fileStatuses.filter(f => f.needs_resume);
      console.log(JSON.stringify({
        kind: 'batch',
        batch_slug: slug,
        batch_dir: runDir,
        total_files: fileStatuses.length,
        converged: fileStatuses.filter(f => f.converged).length,
        to_resume: toResume.length,
        files: toResume,
      }, null, 2));
      break;
    }

    // Single-file resume (existing logic)
    const st = readStatus(runDir);
    const rounds = fs.readdirSync(runDir).filter(n => /^round-\d+$/.test(n)).map(n => parseInt(n.replace('round-', ''), 10)).sort((a, b) => a - b);
    const lastRound = rounds.length ? rounds[rounds.length - 1] : 1;
    // Detect partial-round: critiques present but no aggregate
    const rDir = path.join(runDir, `round-${lastRound}`);
    const critiques = fs.existsSync(rDir) ? fs.readdirSync(rDir).filter(n => /^critique-.+\.md$/.test(n)) : [];
    const hasAggregate = fs.existsSync(path.join(rDir, 'aggregate.json'));
    let resumePhase;
    if (critiques.length && !hasAggregate) resumePhase = 'aggregate-and-plan-editor';
    else if (hasAggregate && !fs.existsSync(path.join(rDir, 'proposed-redraft.md'))) resumePhase = 'plan-editor';
    else if (fs.existsSync(path.join(rDir, 'proposed-redraft.md'))) resumePhase = 'apply-redraft';
    else resumePhase = 'plan-reviewers';
    console.log(JSON.stringify({
      slug,
      run_dir: runDir,
      resume_from_round: lastRound,
      resume_from_phase: resumePhase,
      status: st,
      partial_round: critiques.length && !hasAggregate,
      critiques_present: critiques.length,
    }, null, 2));
    break;
  }
  case 'dry-run': {
    // DRYRUN-01: emit cost estimate without dispatching reviewers.
    const artifact = argv[1];
    if (!artifact) die('usage: dry-run <artifact-path> [--panel-size N]');
    const psFlag = argv.indexOf('--panel-size');
    const panelSize = psFlag > 0 ? parseInt(argv[psFlag + 1], 10) : null;
    (async () => {
      let runInfo;
      try { runInfo = await initRun(cwd, artifact); }
      catch (err) { console.error(`tumble-dry: dry-run init failed: ${err.message}`); process.exit(3); }
      const { slug, runDir, artifactAbs } = runInfo;
      const cfg = loadConfig(cwd);
      const ps = panelSize || cfg.panel_size || 5;
      const artifactText = fs.readFileSync(artifactAbs, 'utf-8');
      const estimate = estimateRunCost({
        artifactChars: artifactText.length,
        panelSize: ps,
        maxRounds: cfg.max_rounds || 4,
        thinkingBudget: cfg.editor_thinking_budget || 4000,
      });
      const costMd = renderCostBlock(estimate);
      const out = {
        slug,
        run_dir: runDir,
        artifact: artifactAbs,
        artifact_chars: artifactText.length,
        panel_size: ps,
        estimate,
      };
      // Write cost block + dry-run record
      fs.writeFileSync(path.join(runDir, 'dry-run.md'), `# Dry run — ${slug}\n\n${costMd}\n`, 'utf-8');
      console.log(JSON.stringify(out, null, 2));
      console.log('');
      console.log(costMd);
    })().catch(e => { console.error(e.stack || e.message); process.exit(1); });
    break;
  }
  case 'report': {
    // HEADLESS-03: write per-round or final REPORT.md
    const slug = argv[1];
    const subMode = argv[2]; // 'round' or 'final'
    const roundN = parseInt(argv[3], 10);
    if (!slug || !subMode) die('usage: report <slug> <round|final> [round-number]');
    const runDir = findRunDir(slug);
    if (subMode === 'round') {
      if (!roundN) die('usage: report <slug> round <round-number>');
      const p = writeRoundReport(runDir, roundN);
      if (!p) die(`round ${roundN} report generation failed — missing round dir or aggregate`);
      console.log(p);
    } else if (subMode === 'final') {
      const p = writeFinalReport(runDir);
      if (!p) die(`final report generation failed — no rounds found`);
      console.log(p);
    } else { die(`unknown report mode: ${subMode}`); }
    break;
  }
  case 'status-write': {
    // Orchestrator surface: patch status.json. Args: slug, then key=value pairs.
    const slug = argv[1];
    if (!slug) die('usage: status-write <slug> key=value [key=value ...]');
    const runDir = findRunDir(slug);
    const patch = {};
    for (const kv of argv.slice(2)) {
      const m = kv.match(/^([^=]+)=(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      let val = m[2];
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (/^-?\d+(\.\d+)?$/.test(val)) val = Number(val);
      patch[key] = val;
    }
    const updated = writeStatus(runDir, patch);
    console.log(JSON.stringify(updated, null, 2));
    break;
  }
  case 'status-render': {
    const slug = argv[1];
    if (!slug) die('usage: status-render <slug>');
    const runDir = findRunDir(slug);
    const st = readStatus(runDir);
    console.log(renderProgressLine(st));
    break;
  }
  case 'config': {
    // Extended: `config init` dumps inferred config.
    if (argv[1] === 'init') {
      const res = dumpConfigYaml(cwd, { overwrite: argv.includes('--force') });
      console.log(JSON.stringify(res, null, 2));
      break;
    }
    console.log(JSON.stringify(loadConfig(cwd), null, 2));
    break;
  }
  case 'canary-infer': {
    // CANARY-01: surface inferred defaults as JSON for slash command + diagnostics.
    const inferred = inferDefaults(cwd, { cache: !argv.includes('--no-cache') });
    console.log(JSON.stringify(inferred, null, 2));
    break;
  }
  case 'apply-patch': {
    // COMP-02: apply a generated patch.
    const slug = argv[1];
    if (!slug) die('usage: apply-patch <slug>');
    const runDir = findRunDir(slug);
    const { applyPatch } = require('../lib/patch.cjs');
    const result = applyPatch(runDir, { cwd });
    if (result.ok) {
      console.log(`Patch applied (${result.method}). Review with \`git diff\`.`);
    } else {
      console.error(`Patch not applied: ${result.reason}. ${result.hint || ''}`);
    }
    console.log(JSON.stringify(result, null, 2));
    break;
  }
  case 'register': {
    // REGISTER-04: manually register a structural finding.
    const slug = argv[1];
    const findingSummary = argv.slice(2).join(' ');
    if (!slug || !findingSummary) die('usage: register <slug> <finding-summary>');
    const runDir = findRunDir(slug);
    const { manualRegister } = require('../lib/structural-register.cjs');
    const result = manualRegister(runDir, findingSummary);
    if (result.added) {
      console.log(`Registered: "${findingSummary}" (status: acknowledged)`);
    } else {
      console.log(`Already registered (matching entry found).`);
    }
    console.log(JSON.stringify({ added: result.added, register_count: result.register.length }, null, 2));
    break;
  }
  case 'commit-round': {
    // GIT-02: commit round artifacts with convergence metadata.
    const slug = argv[1];
    const round = parseInt(argv[2], 10);
    if (!slug || !round) die('usage: commit-round <slug> <round> [material=N] [structural=N] [drift=X] [converged=bool]');
    if (!gitInt.isEnabled()) {
      console.log(JSON.stringify({ ok: false, reason: 'disabled' }));
      break;
    }
    const runDir = findRunDir(slug);
    const meta = { material: 0, structural: 0, drift: 0, converged: false };
    for (const kv of argv.slice(3)) {
      const m = kv.match(/^([^=]+)=(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      const val = m[2];
      if (key === 'converged') meta.converged = val === 'true' || val === 'yes';
      else meta[key] = Number(val) || 0;
    }
    const result = gitInt.commitRound(runDir, round, meta, { cwd });
    console.log(JSON.stringify(result, null, 2));
    break;
  }
  default:
    console.error('tumble-dry — content polish via simulated-public-contact review');
    console.error('');
    console.error('Subcommands:');
    console.error('  init <artifact-path> [--no-git]');
    console.error('  new-round <slug>');
    console.error('  sample-voice [count]');
    console.error('  aggregate <slug> <round>');
    console.error('  drift <slug> <round> <before> <after>');
    console.error('  commit-round <slug> <round> [material=N] [structural=N] [drift=X] [converged=bool]');
    console.error('  config');
    console.error('  brief-audience <slug> <round> [panel-size] [override]');
    console.error('  brief-auditor <slug> <round>');
    console.error('  extract-personas <slug>');
    console.error('  brief-reviewer <slug> <round> <persona-slug>');
    console.error('  brief-editor <slug> <round>');
    console.error('  extract-redraft <slug> <round>');
    console.error('  register <slug> <finding-summary>');
    console.error('  apply-patch <slug>');
    console.error('  finalize <slug> [--apply] [--apply-to-source] [--clean]');
    console.error('  clean <slug>');
    process.exit(cmd ? 2 : 0);
}
