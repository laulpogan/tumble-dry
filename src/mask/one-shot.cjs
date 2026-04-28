/**
 * one-shot — `/mask <slug> --review <target>`
 *
 * Single-pass structured critique of an artifact in the persona's voice.
 * No dialogue. Output is markdown (the structure defined in
 * prompt-builder.buildOneShotPrompt). Written to disk and echoed to stdout.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadBrief } = require('./brief-loader.cjs');
const { buildOneShotPrompt } = require('./prompt-builder.cjs');
const { loadTarget } = require('./target-loader.cjs');
const { oneShot: llmOneShot, DEFAULT_MODEL } = require('./llm.cjs');

async function runReview({ slug, target, outputPath, model, dryRun }) {
  const brief = loadBrief(slug);
  const t = await loadTarget(target);
  const { system, user } = buildOneShotPrompt(brief, t);

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      systemBytes: Buffer.byteLength(system, 'utf-8'),
      userBytes: Buffer.byteLength(user, 'utf-8'),
      target: { label: t.label, format: t.format, contentBytes: t.content.length },
      model: model || DEFAULT_MODEL,
    };
  }

  process.stderr.write(`[mask] reviewing ${t.label} as ${brief.name} (model: ${model || DEFAULT_MODEL})…\n`);
  const reply = await llmOneShot({ system, user, model });

  const finalPath = resolveOutputPath({ outputPath, brief, target: t });
  ensureDir(path.dirname(finalPath));
  fs.writeFileSync(finalPath, renderReview(brief, t, reply), 'utf-8');
  process.stderr.write(`[mask] wrote review → ${finalPath}\n`);
  return { ok: true, path: finalPath, brief: brief.slug, target: t.label };
}

function renderReview(brief, target, body) {
  return [
    `# ${brief.name} on ${target.label}`,
    '',
    `*Synthetic critique. Not the real ${brief.name}. Internal-only. Don't publish or attribute.*`,
    '',
    `- **persona:** ${brief.name} (\`${brief.slug}\`, last_validated ${brief.last_validated})`,
    `- **target:** ${target.label} (${target.format}, ${target.content.length} chars)`,
    `- **generated:** ${new Date().toISOString()}`,
    '',
    '---',
    '',
    body.trim(),
    '',
  ].join('\n');
}

function resolveOutputPath({ outputPath, brief, target }) {
  const safeLabel = String(target.label).replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 60) || 'target';
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `${brief.slug}-${safeLabel}-${stamp}.md`;

  if (!outputPath) {
    return path.join(os.homedir(), '.tumble-dry', 'mask-reviews', filename);
  }
  // If outputPath is an existing dir or ends in /, treat as dir.
  const looksDir = outputPath.endsWith('/') || (fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory());
  if (looksDir) return path.join(outputPath, filename);
  return outputPath;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

module.exports = { runReview };
