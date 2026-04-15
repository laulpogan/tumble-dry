#!/usr/bin/env node
/**
 * tumble-dry convergence loop driver.
 *
 * Runs the full multi-round pipeline autonomously:
 *   init → (round 1: audience + audit + reviewers + aggregate → editor if not converged)
 *        → (round 2..N: reviewers on redraft + aggregate → editor if not converged)
 *        → finalize on convergence OR max_rounds hit.
 *
 * Usage:
 *   tumble-dry-loop <artifact-path> [--auto-redraft] [--backend api|gastown|auto] [--voice-refs dir] [--panel-size N]
 *
 * Exits 0 on clean convergence, 1 on max_rounds cap, 2 on error.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { loadConfig } = require('../lib/config.cjs');
const { initRun, roundDir: ensureRoundDir, currentRound } = require('../lib/run-state.cjs');
const { aggregateRound, renderAggregate, aggregateJson } = require('../lib/aggregator.cjs');
const { dispatchWave, selectBackend } = require('../lib/dispatch.cjs');
const { voiceDriftReport } = require('../lib/voice.cjs');
const { extractPersonas } = require('../lib/reviewer-brief.cjs');

function parseArgs(argv) {
  const out = { artifact: null, autoRedraft: true, backend: null, panelSize: null };
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a === '--auto-redraft') { out.autoRedraft = true; i++; }
    else if (a === '--no-auto-redraft') { out.autoRedraft = false; i++; }
    else if (a === '--backend') { out.backend = argv[++i]; i++; }
    else if (a === '--panel-size') { out.panelSize = parseInt(argv[++i], 10); i++; }
    else if (!out.artifact) { out.artifact = a; i++; }
    else i++;
  }
  return out;
}

function log(...a) { console.error('[tumble-dry-loop]', ...a); }

function runCli(subArgs) {
  const bin = path.resolve(__dirname, 'tumble-dry.cjs');
  return execFileSync('node', [bin, ...subArgs], { encoding: 'utf-8', cwd: process.cwd() });
}

async function runRound1({ slug, runDir, roundDir, config, autoRedraft }) {
  log(`round 1 — generating briefs for audience + auditor`);
  runCli(['brief-audience', slug, '1', String(config.panel_size), config.audience_override || '-']);
  runCli(['brief-auditor', slug, '1']);

  log(`round 1 — dispatching audience + auditor (parallel)`);
  const wave1 = await dispatchWave({
    records: [
      { name: 'audience-inferrer',  briefFile: path.join(roundDir, 'brief-audience.md'), targetFilename: 'audience.md' },
      { name: 'assumption-auditor', briefFile: path.join(roundDir, 'brief-auditor.md'),  targetFilename: 'assumption-audit.md' },
    ],
    roundDir,
    config,
  });
  for (const r of wave1) if (r.error) throw new Error(`wave-1 dispatch failed for ${r.name}: ${r.error}`);
  log(`round 1 — audience.md and assumption-audit.md written`);
}

async function runReviewerWave({ slug, roundN, roundDir, config }) {
  log(`round ${roundN} — generating reviewer briefs`);
  const briefsJson = runCli(['brief-reviewers', slug, String(roundN)]);
  const briefs = JSON.parse(briefsJson);

  log(`round ${roundN} — dispatching ${briefs.length} reviewers (parallel)`);
  const records = briefs.map(b => ({
    name: b.slug,
    briefFile: b.brief_path,
    targetFilename: `critique-${b.slug}.md`,
  }));
  const res = await dispatchWave({ records, roundDir, config });
  const failures = res.filter(r => r.error);
  if (failures.length) throw new Error(`reviewer dispatch failures: ${failures.map(f => f.name + ': ' + f.error).join('; ')}`);
  log(`round ${roundN} — ${briefs.length} critiques written`);
}

function aggregateAndCheck({ slug, roundN, roundDir, runDir, config }) {
  const critiques = fs.readdirSync(roundDir)
    .filter(n => /^critique-.+\.md$/.test(n))
    .map(n => path.join(roundDir, n));
  const agg = aggregateRound(critiques, { runDir, currentRound: roundN });
  const rendered = renderAggregate(agg, config, roundN);
  fs.writeFileSync(path.join(roundDir, 'aggregate.md'), rendered.markdown, 'utf-8');
  fs.writeFileSync(path.join(roundDir, 'aggregate.json'), JSON.stringify(aggregateJson(agg), null, 2), 'utf-8');
  log(`round ${roundN} aggregate — raw=${agg.total_raw} unique=${agg.unique_clusters} material=${agg.by_severity.material||0} minor=${agg.by_severity.minor||0} nit=${agg.by_severity.nit||0} structural=${agg.structural_count||0} converged=${rendered.converged}`);
  return { agg, converged: rendered.converged };
}

async function runEditor({ slug, roundN, roundDir, runDir, artifactAbs, config }) {
  log(`round ${roundN} — generating editor brief`);
  runCli(['brief-editor', slug, String(roundN)]);

  log(`round ${roundN} — dispatching editor (single)`);
  const res = await dispatchWave({
    records: [{ name: 'editor', briefFile: path.join(roundDir, 'brief-editor.md'), targetFilename: 'proposed-redraft.md' }],
    roundDir,
    config,
  });
  if (res[0].error) throw new Error(`editor dispatch failed: ${res[0].error}`);

  log(`round ${roundN} — extracting redraft + drift report`);
  const stagedPath = runCli(['extract-redraft', slug, String(roundN)]).trim();
  const driftJson = runCli(['drift', slug, String(roundN), artifactAbs, stagedPath]);
  const drift = JSON.parse(driftJson);
  log(`round ${roundN} — drift: score=${drift.drift_score} unchanged=${drift.counts.unchanged} modified=${drift.counts.modified} inserted=${drift.counts.inserted} deleted=${drift.counts.deleted}`);

  log(`round ${roundN} — replacing artifact with redraft`);
  fs.copyFileSync(stagedPath, artifactAbs);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.artifact) {
    console.error('usage: tumble-dry-loop <artifact-path> [--backend api|gastown|auto] [--panel-size N]');
    process.exit(2);
  }
  if (args.backend) process.env.TUMBLE_DRY_BACKEND = args.backend;

  const cwd = process.cwd();
  const config = loadConfig(cwd);
  if (args.panelSize) config.panel_size = args.panelSize;
  const backend = selectBackend(config);
  log(`backend=${backend} panel_size=${config.panel_size} convergence_threshold=${config.convergence_threshold} max_rounds=${config.max_rounds}`);

  // Init or resume
  const { slug, runDir, artifactAbs } = initRun(cwd, args.artifact);
  fs.writeFileSync(path.join(runDir, 'artifact.path'), artifactAbs);
  let roundN = currentRound(runDir);
  if (roundN === 0) roundN = 1;
  let roundDir = ensureRoundDir(runDir, roundN);
  log(`slug=${slug} starting at round ${roundN}`);

  // Round 1 setup if fresh
  if (roundN === 1 && !fs.existsSync(path.join(roundDir, 'audience.md'))) {
    await runRound1({ slug, runDir, roundDir, config });
  }

  // Main loop
  while (roundN <= config.max_rounds) {
    roundDir = ensureRoundDir(runDir, roundN);

    if (!fs.existsSync(path.join(roundDir, 'aggregate.md'))) {
      await runReviewerWave({ slug, roundN, roundDir, config });
    }
    const { converged } = aggregateAndCheck({ slug, roundN, roundDir, runDir, config });

    if (converged) {
      log(`✓ converged at round ${roundN}`);
      runCli(['finalize', slug]);
      log(`FINAL.md + polish-log.md written to ${runDir}`);
      return 0;
    }

    if (roundN >= config.max_rounds) {
      log(`⚠ hit max_rounds (${config.max_rounds}) without convergence — finalizing current state`);
      runCli(['finalize', slug]);
      return 1;
    }

    if (!args.autoRedraft) {
      log(`not converged; --no-auto-redraft set, exiting without editor`);
      return 1;
    }

    await runEditor({ slug, roundN, roundDir, runDir, artifactAbs, config });
    roundN += 1;
  }
  return 1;
}

main().then(code => process.exit(code)).catch(e => {
  console.error('[tumble-dry-loop] FATAL:', e.message);
  process.exit(2);
});
