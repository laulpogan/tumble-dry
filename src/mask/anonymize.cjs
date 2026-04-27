/**
 * anonymize — convert a real-people brief into a library.md-shaped panel
 * entry, with identity-fingerprints stripped.
 *
 * Real-people briefs have 10 sections + a named person. library.md panel
 * entries have 5 fields + a fictional persona name. The transform is
 * interpretive (a regex strip would miss voice fingerprints), so this routes
 * through the model with a strict "scrub these classes of fingerprint" prompt.
 *
 * Output is markdown ready to paste into the appropriate library.md section.
 * No source-corpus citations carried through. No "as I wrote in <essay>"
 * framings. The persona's domain scope is preserved (that's WHY they're useful
 * as a library archetype) — but stripped of name and firm.
 */

const { loadBrief } = require('./brief-loader.cjs');
const { oneShot, DEFAULT_MODEL } = require('./llm.cjs');

const ANONYMIZER_SYSTEM = `
You are an anonymization editor. You are given a "real-people" persona brief
that profiles a specific named public figure. Your job is to convert it into
an *anonymized* persona entry suitable for a generic reviewer-panel library.

You must STRIP every identity fingerprint:
- The person's real name and any direct references to it.
- Specific firm names, fund names, employers (replace with generic role:
  "general partner at a Series A infra fund").
- Citations of specific essays, podcasts, talks, blog posts (the
  "as I wrote in <X>" framings — drop these entirely).
- Named frameworks the person owns or coined ("the bitter lesson," "tools for
  thought," etc.) — replace with the underlying behavioral pattern.
- Any biographical specifics that uniquely identify them (a particular
  acquisition price, a particular exit, a particular previous title at a
  particular company). Generalize: "led an infrastructure company through
  acquisition" not "founded Nicira, acquired by VMware for $1.26B."

You must PRESERVE:
- The behavioral patterns (how they read, what triggers them, what they miss).
- The domain calibration (AI infra, dev tools, etc. — that's WHY this archetype
  is useful in a library).
- The voice characteristics expressed as patterns, not as quotes
  ("compresses essays into slogans then rebuilds the argument" — yes;
  "writes like Casado" — no).
- The honest blindspot.
`;

function buildAnonymizerPrompt(brief, panelHint) {
  const s = brief.sections;
  const corpus = s['Source corpus'] || '';
  const lines = [
    `Here is a named real-people brief. Anonymize it per the rules above and`,
    `emit the result in tumble-dry's library.md panel-entry format.`,
    '',
    `Target panel section (best-fit guess; you may suggest a different one): ${panelHint || '(none specified — infer from Domain scope)'}`,
    '',
    `library.md entry format (output EXACTLY this structure, fill the fields):`,
    '',
    '```markdown',
    'N. **<Invented Name> — <Role descriptor>.** *<1–2 sentence italicized de-identified bio. Include the behavioral pattern that makes them useful, not their resume.>*',
    '   - Hiring job: <what they\'re reading this for, in one sentence>',
    '   - Bounce trigger: <what makes them disengage>',
    '   - Load-bearing belief: <one belief they bring to the read>',
    '   - Championing trigger: <what makes them say "this is excellent">',
    '   - Blindspot: <what they typically miss or underweight, written honestly>',
    '```',
    '',
    `(Use N=1 placeholder; the maintainer will renumber when pasting into the panel.)`,
    '',
    `After the entry, emit a "## Anonymization notes" section listing what you`,
    `stripped and why, so the maintainer can sanity-check that no identity`,
    `fingerprints leaked through. Be specific — name the citations dropped, the`,
    `framings generalized, the firm name replaced.`,
    '',
    '---',
    '',
    `**Source brief: ${brief.name}** (slug: \`${brief.slug}\`)`,
    '',
    `Bio: ${brief.bio}`,
    '',
    `## Hiring job\n${s['Hiring job']}`,
    '',
    `## Bounce trigger\n${s['Bounce trigger']}`,
    '',
    `## Championing trigger\n${s['Championing trigger']}`,
    '',
    `## Load-bearing beliefs\n${s['Load-bearing beliefs']}`,
    '',
    `## Voice anchors\n${s['Voice anchors']}`,
    '',
    `## Blindspot\n${s['Blindspot']}`,
    '',
    `## Domain scope\n${s['Domain scope']}`,
    '',
    `## Source corpus (DROP all citations from output — listed here only so you can recognize and strip the framings)\n${corpus}`,
  ];
  return lines.join('\n');
}

async function anonymize({ slug, panel, model, dryRun }) {
  const brief = loadBrief(slug);
  const user = buildAnonymizerPrompt(brief, panel);

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      brief: brief.slug,
      panelHint: panel || null,
      systemBytes: Buffer.byteLength(ANONYMIZER_SYSTEM, 'utf-8'),
      userBytes: Buffer.byteLength(user, 'utf-8'),
      model: model || DEFAULT_MODEL,
    };
  }

  process.stderr.write(`[mask] anonymizing ${brief.name} (model: ${model || DEFAULT_MODEL})…\n`);
  const reply = await oneShot({ system: ANONYMIZER_SYSTEM, user, model });
  return { ok: true, brief: brief.slug, output: reply };
}

function renderForFile(brief, body) {
  return [
    `<!-- Anonymized from personas/real-people/${brief.slug}.md (${brief.name}). -->`,
    `<!-- Generated by bin/mask anonymize. Maintainer: review the "Anonymization notes" -->`,
    `<!-- block before pasting the entry above into personas/library.md. -->`,
    '',
    body.trim(),
    '',
  ].join('\n');
}

module.exports = { anonymize, renderForFile, buildAnonymizerPrompt, ANONYMIZER_SYSTEM };
