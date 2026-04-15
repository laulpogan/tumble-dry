#!/usr/bin/env node
/**
 * tumble-dry convergence loop driver — HEADLESS / CI / SCRIPTING fallback.
 *
 * This is one of two control planes for tumble-dry:
 *
 *   1. Claude Code-native (PREFERRED for interactive use):
 *      /tumble-dry <artifact>
 *      - Inherits Claude Code session auth (no ANTHROPIC_API_KEY needed)
 *      - Dispatches each agent as a parallel Task subagent
 *      - Trace fidelity reduced: subagent request/response payloads are
 *        not exposed to the orchestrator (subagent context isolation).
 *        CC traces record brief-path, critique-path, timing, and exit status.
 *
 *   2. Headless Node CLI (THIS FILE — for CI / scripting / no-CC environments):
 *      bin/tumble-dry-loop.cjs <artifact>
 *      - Requires ANTHROPIC_API_KEY (env var or ~/.anthropic/api_key)
 *      - Full per-dispatch traces (request, response, extended thinking)
 *        per CORE-04 — see traces/<persona>.json
 *
 * Both planes share the same data plane (bin/tumble-dry.cjs subcommands)
 * and produce the same .tumble-dry/<slug>/ layout, FINAL.md, and
 * polish-log.md.
 *
 * Usage:
 *   tumble-dry-loop <artifact-path> [--auto-redraft] [--no-auto-redraft] [--panel-size N]
 *
 * Exits 0 on clean convergence, 1 on max_rounds cap, 2 on error.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { loadConfig } = require('../lib/config.cjs');
const { initRun, roundDir: ensureRoundDir, currentRound, snapshotHistory } = require('../lib/run-state.cjs');
const { aggregateRound, renderAggregate, aggregateJson } = require('../lib/aggregator.cjs');
const { dispatchWave, selectBackend } = require('../lib/dispatch.cjs');
const { voiceDriftReport } = require('../lib/voice.cjs');
const { extractPersonas } = require('../lib/reviewer-brief.cjs');
const { pruneTraces } = require('../lib/trace-retention.cjs');

function parseArgs(argv) {
  const out = { artifact: null, autoRedraft: true, panelSize: null, writeFinal: false };
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a === '--auto-redraft') { out.autoRedraft = true; i++; }
    else if (a === '--no-auto-redraft') { out.autoRedraft = false; i++; }
    else if (a === '--panel-size') { out.panelSize = parseInt(argv[++i], 10); i++; }
    else if (a === '--write-final') { out.writeFinal = true; i++; }
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

function aggregateAndCheck({ slug, roundN, roundDir, runDir, artifactAbs, config }) {
  const critiques = fs.readdirSync(roundDir)
    .filter(n => /^critique-.+\.md$/.test(n))
    .map(n => path.join(roundDir, n));
  const agg = aggregateRound(critiques, { runDir, currentRound: roundN });
  const rendered = renderAggregate(agg, config, roundN);

  // HARDEN-01: voice-drift gate. Cumulative content_drift from round-0
  // original exceeding threshold BLOCKS convergence regardless of material
  // count. Anti-reward-hack against editor suppressing findings by rewrite.
  let drift_blocked = false;
  let driftPayload = null;
  const originalSnapshot = path.join(runDir, 'history', 'round-0-original.md');
  if (fs.existsSync(originalSnapshot) && fs.existsSync(artifactAbs)) {
    try {
      const before = fs.readFileSync(originalSnapshot, 'utf-8');
      const after = fs.readFileSync(artifactAbs, 'utf-8');
      driftPayload = voiceDriftReport(before, after);
      const threshold = Number.isFinite(config.drift_threshold) ? config.drift_threshold : 0.40;
      if ((driftPayload.content_drift || 0) > threshold) {
        drift_blocked = true;
      }
      log(`round ${roundN} drift — content=${driftPayload.content_drift} structural=${driftPayload.structural_drift} threshold=${threshold} blocked=${drift_blocked}`);
    } catch (e) {
      log(`round ${roundN} drift report skipped: ${e.message}`);
    }
  }

  let converged = rendered.converged;
  let renderedMd = rendered.markdown;
  if (drift_blocked) {
    converged = false;
    const threshold = Number.isFinite(config.drift_threshold) ? config.drift_threshold : 0.40;
    const block = `\n## ⚠ Drift block\n\nCumulative content-drift from round-0 original is **${driftPayload.content_drift}**, which exceeds the configured threshold of **${threshold}**. Convergence is BLOCKED regardless of material count — the editor has rewritten too much of the author's voice.\n\n**Structural drift** (markdown re-shape, heading reflow): ${driftPayload.structural_drift} — informational only, does not gate.\n\n**Persona reviewers, round ${roundN + 1}:** the editor is drifting. In your next critique, explicitly preserve source phrasing where the critique's intent can be satisfied with lighter edits. Flag any rewrite that replaces voice-carrying sentences wholesale as a material finding.\n`;
    renderedMd = renderedMd + block;
  }

  fs.writeFileSync(path.join(roundDir, 'aggregate.md'), renderedMd, 'utf-8');
  const jsonOut = aggregateJson(agg);
  jsonOut.drift_blocked = drift_blocked;
  if (driftPayload) {
    jsonOut.content_drift = driftPayload.content_drift;
    jsonOut.structural_drift = driftPayload.structural_drift;
  }
  fs.writeFileSync(path.join(roundDir, 'aggregate.json'), JSON.stringify(jsonOut, null, 2), 'utf-8');
  log(`round ${roundN} aggregate — raw=${agg.total_raw} unique=${agg.unique_clusters} material=${agg.by_severity.material||0} minor=${agg.by_severity.minor||0} nit=${agg.by_severity.nit||0} structural=${agg.structural_count||0} drift_blocked=${drift_blocked} converged=${converged}`);
  return { agg, converged, drift_blocked };
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
  if (drift.backend === 'tree-sitter') {
    log(`round ${roundN} — AST drift: score=${drift.drift_score} signature_changes=${drift.signature_changed_count || 0} counts=${JSON.stringify(drift.counts)}`);
  } else {
    log(`round ${roundN} — drift: score=${drift.drift_score} unchanged=${drift.counts.unchanged} modified=${drift.counts.modified} inserted=${drift.counts.inserted} deleted=${drift.counts.deleted}`);
  }

  // CODE-06/07: code-mode guardrails.
  // If parse_check failed, or verify_cmd failed, DO NOT apply the redraft.
  const srcFmtPath = path.join(runDir, 'source-format.json');
  let srcMeta = { artifact_kind: 'prose' };
  if (fs.existsSync(srcFmtPath)) {
    try { srcMeta = JSON.parse(fs.readFileSync(srcFmtPath, 'utf-8')); } catch { /* ignore */ }
  }

  let redraftRejected = false;
  const rejectReasons = [];
  if (srcMeta.artifact_kind === 'code') {
    if (drift.parse_check && drift.parse_check.ok === false && !drift.parse_check.skipped) {
      redraftRejected = true;
      rejectReasons.push(`proposed-redraft-invalid: ${drift.parse_check.error}`);
    }
    if (drift.signature_changed_count && drift.signature_changed_count > 0) {
      log(`round ${roundN} — ⚠ ${drift.signature_changed_count} signature change(s) flagged STRUCTURAL (cannot silently converge)`);
    }

    // verify_cmd: default to `npm test -- --run` when package.json has a
    // `test` script; otherwise no verify. Config override wins.
    let verifyCmd = config.verify_cmd || null;
    if (!verifyCmd) {
      const sourcePathFile = path.join(runDir, 'source.path');
      const sourcePath = fs.existsSync(sourcePathFile)
        ? fs.readFileSync(sourcePathFile, 'utf-8').trim() : null;
      if (sourcePath) {
        const stat = fs.statSync(sourcePath);
        const projectDir = stat.isDirectory() ? sourcePath : path.dirname(sourcePath);
        const pkg = path.join(projectDir, 'package.json');
        if (fs.existsSync(pkg)) {
          try {
            const pkgJson = JSON.parse(fs.readFileSync(pkg, 'utf-8'));
            if (pkgJson.scripts && pkgJson.scripts.test) {
              verifyCmd = { cmd: 'npm', args: ['test', '--', '--run'], cwd: projectDir };
            }
          } catch { /* ignore */ }
        }
      }
    } else if (typeof verifyCmd === 'string') {
      verifyCmd = { cmd: 'sh', args: ['-c', verifyCmd], cwd: path.dirname(stagedPath) };
    }

    if (verifyCmd && !redraftRejected) {
      log(`round ${roundN} — verify_cmd: ${verifyCmd.cmd} ${verifyCmd.args.join(' ')} (cwd=${verifyCmd.cwd})`);
      const r = spawnSync(verifyCmd.cmd, verifyCmd.args, {
        cwd: verifyCmd.cwd,
        encoding: 'utf-8',
        timeout: 300000,
      });
      const verifyLog = {
        cmd: verifyCmd.cmd,
        args: verifyCmd.args,
        cwd: verifyCmd.cwd,
        status: r.status,
        stdout_tail: (r.stdout || '').slice(-4000),
        stderr_tail: (r.stderr || '').slice(-4000),
      };
      fs.writeFileSync(path.join(roundDir, 'verify.json'), JSON.stringify(verifyLog, null, 2), 'utf-8');
      if (r.status !== 0) {
        redraftRejected = true;
        rejectReasons.push(`verify_cmd failed (exit ${r.status})`);
      }
    }

    if (redraftRejected) {
      log(`round ${roundN} — ⚠ redraft REJECTED: ${rejectReasons.join('; ')} — working.md unchanged`);
      fs.writeFileSync(path.join(roundDir, 'redraft-rejected.md'),
        `# Redraft rejected — round ${roundN}\n\n` +
        rejectReasons.map(r => `- ${r}`).join('\n') + '\n',
        'utf-8');
      // Surface to aggregate for next-round brief visibility.
      const aggPath = path.join(roundDir, 'aggregate.md');
      if (fs.existsSync(aggPath)) {
        const prior = fs.readFileSync(aggPath, 'utf-8');
        fs.writeFileSync(aggPath,
          prior + `\n\n## ⚠ Redraft rejected\n\n${rejectReasons.map(r => `- ${r}`).join('\n')}\n\n` +
          `The editor's proposed redraft did not satisfy code-mode guardrails. working.md is unchanged.\n`,
          'utf-8');
      }
      return; // keep working.md as-is; loop continues with prior state
    }
  }

  // Non-destructive: snapshot the working copy state before+after the editor
  // pass into history/. The source file (recorded in source.path) is never touched.
  snapshotHistory(runDir, roundN, 'input', artifactAbs);
  fs.copyFileSync(stagedPath, artifactAbs);  // overwrite working.md, NOT source
  snapshotHistory(runDir, roundN, 'output', artifactAbs);
  log(`round ${roundN} — working.md updated; history snapshots: round-${roundN}-input.md, round-${roundN}-output.md`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.artifact) {
    console.error('tumble-dry-loop — headless convergence loop driver (v0.6.0)');
    console.error('');
    console.error('USAGE:');
    console.error('  tumble-dry-loop <artifact-path> [--panel-size N] [--no-auto-redraft] [--write-final]');
    console.error('');
    console.error('REQUIRES:');
    console.error('  ANTHROPIC_API_KEY (env var or ~/.anthropic/api_key)');
    console.error('');
    console.error('SCENARIO EXAMPLES:');
    console.error('');
    console.error('  Polish a substack post (prose):');
    console.error('    node bin/tumble-dry-loop.cjs post.md');
    console.error('');
    console.error('  Polish a pitch deck (office format — .pptx projected to markdown):');
    console.error('    node bin/tumble-dry-loop.cjs deck.pptx');
    console.error('    # Loader writes ROUNDTRIP_WARNING.md; FINAL.md ships as markdown,');
    console.error('    # original .pptx preserved at .tumble-dry/<slug>/history/round-0-original.pptx');
    console.error('');
    console.error('  Polish a code refactor PR (AST-aware drift + linter-clean assumption):');
    console.error('    node bin/tumble-dry-loop.cjs --panel-size 5 src/auth/');
    console.error('    # Detects code via linguist-js; editor swaps voice for PEP 8 / Effective Go / etc.;');
    console.error('    # signature changes on public API are permanent STRUCTURAL flags.');
    console.error('');
    console.error('  Polish a spec doc with a verify command (.docx + pytest gate):');
    console.error('    # Set in .tumble-dry.yml:   verify_cmd: "pytest tests/"');
    console.error('    node bin/tumble-dry-loop.cjs spec.docx');
    console.error('    # Redraft is rejected if verify_cmd exits non-zero; loop continues with prior state.');
    console.error('');
    console.error('PREFER /tumble-dry inside Claude Code:');
    console.error('  The /tumble-dry slash command runs the same loop using your');
    console.error('  active Claude Code session — no API key required, no separate');
    console.error('  process. Use this headless CLI only for CI, scripting, or');
    console.error('  environments without an interactive Claude Code session.');
    console.error('');
    console.error('TRACE-FIDELITY NOTE:');
    console.error('  This headless path writes full per-dispatch traces to');
    console.error('  .tumble-dry/<slug>/round-N/traces/. The /tumble-dry slash');
    console.error('  command path produces thinner traces (no request/response');
    console.error('  payload — subagent context is isolated by Claude Code).');
    process.exit(2);
  }

  const cwd = process.cwd();
  const config = loadConfig(cwd);
  if (args.panelSize) config.panel_size = args.panelSize;
  log(`backend=api panel_size=${config.panel_size} convergence_threshold=${config.convergence_threshold} max_rounds=${config.max_rounds}`);

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
    const { converged } = aggregateAndCheck({ slug, roundN, roundDir, runDir, artifactAbs, config });

    // HARDEN-05: trim older rounds' traces after aggregation.
    try { pruneTraces(runDir, roundN, config); } catch (e) { log(`trace retention skipped: ${e.message}`); }

    if (converged) {
      log(`✓ converged at round ${roundN}`);
      runCli(['finalize', slug, ...(args.writeFinal ? ['--apply'] : [])]);
      log(`FINAL.md + polish-log.md written to ${runDir}`);
      return 0;
    }

    if (roundN >= config.max_rounds) {
      log(`⚠ hit max_rounds (${config.max_rounds}) without convergence — finalizing current state`);
      runCli(['finalize', slug, ...(args.writeFinal ? ['--apply'] : [])]);
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
