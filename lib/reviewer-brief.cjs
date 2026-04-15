const fs = require('fs');

/**
 * Brief assembly for tumble-dry.
 *
 * Every brief has two parts:
 *   1. A STATIC PREFIX — identical across all reviewers in a wave. Contains the
 *      reviewer agent prompt, artifact, assumption audit, voice excerpts.
 *      This is what gets cached by the API (prompt caching).
 *   2. A VOLATILE SUFFIX — persona-specific content (or editor-specific, etc.).
 *      This varies per dispatch so it doesn't benefit from caching.
 *
 * The two parts are separated by a literal `---CACHE-SPLIT---` line.
 * lib/dispatch-api.cjs splits on that marker and applies cache_control only
 * to the prefix block.
 *
 * For non-API backends, the marker is just ignored markdown — the whole brief
 * is sent as one prompt.
 */

const CACHE_SPLIT = '---CACHE-SPLIT---';

const OUTPUT_INSTRUCTION = (kind) =>
  `Output ONLY the requested ${kind} markdown — no preamble, no meta-commentary, no "here is the" wrappers. Start directly with the top-level heading. The full output will be written verbatim to the target file.`;

function buildReviewerBrief({
  artifactText,
  personaSlug,
  personaBlock,
  assumptionAudit,
  voiceExcerpts,
  roundNumber,
  reviewerAgentPath,
}) {
  const reviewerAgent = fs.readFileSync(reviewerAgentPath, 'utf-8');
  const voiceBlock = (voiceExcerpts && voiceExcerpts.length)
    ? voiceExcerpts.map((e, i) => `### Voice excerpt ${i + 1} (from ${e.file})\n\n${e.text}`).join('\n\n')
    : '_No voice references configured. Review content, not style._';

  // STATIC PREFIX — identical for every reviewer in this wave.
  const prefix = `# Reviewer Brief — Round ${roundNumber}

## Agent instructions

${reviewerAgent}

## Voice excerpts (context only — review content, not style)

${voiceBlock}

## Artifact

${artifactText}

## Assumption audit

${assumptionAudit}`;

  // VOLATILE SUFFIX — this persona's slug + block.
  const suffix = `## Your persona

**Persona slug:** ${personaSlug} — use this exact slug in your critique heading.

${personaBlock}

---

${OUTPUT_INSTRUCTION('critique')}`;

  return `${prefix}\n\n${CACHE_SPLIT}\n\n${suffix}\n`;
}

function buildAudienceBrief({ artifactText, panelSize, audienceOverride, agentPath, roundNumber }) {
  const agent = fs.readFileSync(agentPath, 'utf-8');
  const override = audienceOverride
    ? `\n## Audience override\n\nThe user supplied: ${audienceOverride}\nUse this as the primary audience; refine into ${panelSize} personas.\n`
    : '';
  return `# Audience Inferrer Brief — Round ${roundNumber}

${agent}

## Artifact

${artifactText}

${CACHE_SPLIT}

**panel_size:** ${panelSize}
${override}

---

${OUTPUT_INSTRUCTION('audience panel (audience.md)')}
`;
}

function buildAuditorBrief({ artifactText, agentPath, roundNumber }) {
  const agent = fs.readFileSync(agentPath, 'utf-8');
  return `# Assumption Auditor Brief — Round ${roundNumber}

${agent}

## Artifact

${artifactText}

${CACHE_SPLIT}

---

${OUTPUT_INSTRUCTION('assumption audit (assumption-audit.md)')}
`;
}

function buildEditorBrief({ artifactText, aggregateMarkdown, voiceExcerpts, voiceSource, agentPath, roundNumber }) {
  const agent = fs.readFileSync(agentPath, 'utf-8');
  const voiceBlock = (voiceExcerpts && voiceExcerpts.length)
    ? voiceExcerpts.map((e, i) => `### Voice excerpt ${i + 1} (from ${e.file})\n\n${e.text}`).join('\n\n')
    : '_(no voice anchor available — keep changes minimal and surface-level)_';
  // When voiceSource === 'self' the editor's job is "preserve the source's
  // own voice" rather than "match an external corpus." Make this explicit so
  // the editor doesn't drift toward a generic Claude voice.
  const voiceHeader = voiceSource === 'self'
    ? "## Voice anchor (binding) — match the SOURCE'S OWN voice\n\nThe excerpts below are sampled from the source artifact itself. Your job is to preserve the author's existing tone, sentence shape, and word choice. Do not impose a generic editorial voice. When in doubt, keep more of the original phrasing.\n"
    : "## Voice excerpts (binding) — match the AUTHOR'S past writing\n\nThe excerpts below are sampled from the author's prior work. Your redraft must read like it came from the same writer.\n";
  return `# Editor Brief — Round ${roundNumber}

${agent}

${voiceHeader}
${voiceBlock}

## Current artifact

${artifactText}

${CACHE_SPLIT}

## Aggregated findings

${aggregateMarkdown}

---

${OUTPUT_INSTRUCTION('proposed redraft (proposed-redraft.md — must include full redrafted artifact in the final "## Redrafted artifact" section)')}
`;
}

function personaSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // strip diacritics (Jiménez → Jimenez)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'reviewer';
}

function extractPersonas(audienceMarkdown) {
  // Panel sections are H3s under the "## Panel" H2.
  const lines = audienceMarkdown.split('\n');
  const personas = [];
  let inPanel = false;
  let current = null;
  for (const line of lines) {
    if (/^##\s+Panel\b/i.test(line)) { inPanel = true; continue; }
    if (/^##\s+/.test(line) && inPanel && !/^##\s+Panel/i.test(line)) { inPanel = false; }
    if (!inPanel) continue;
    const h3 = line.match(/^###\s+(?:\d+\.\s*)?(.+?)\s*$/);
    if (h3) {
      if (current) personas.push(current);
      const rawName = h3[1].split(/\s+—\s+|\s+-\s+/)[0].trim();
      current = { name: rawName, slug: personaSlug(rawName), block: line + '\n' };
    } else if (current) {
      current.block += line + '\n';
    }
  }
  if (current) personas.push(current);
  return personas;
}

module.exports = {
  buildReviewerBrief,
  buildAudienceBrief,
  buildAuditorBrief,
  buildEditorBrief,
  extractPersonas,
  personaSlug,
  CACHE_SPLIT,
};
