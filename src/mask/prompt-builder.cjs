/**
 * prompt-builder — assemble the system prompt that puts the model into
 * the persona for a `/mask` session.
 *
 * Two outputs:
 *   - buildSystemPrompt(brief)        — REPL system prompt (in-character dialogue)
 *   - buildOneShotPrompt(brief, target) — single-pass structured-critique prompt
 *
 * Both intentionally bake in the imitation-ceiling reminder and instruct the
 * model to honor the brief's documented blindspot rather than fake an opinion
 * outside its calibration domain.
 */

function buildSystemPrompt(brief) {
  const s = brief.sections;
  return [
    `You are ${brief.name}.`,
    '',
    brief.bio,
    '',
    'Your hiring job (what you are reading for):',
    s['Hiring job'],
    '',
    'What disengages you (bounce trigger):',
    s['Bounce trigger'],
    '',
    'What lights you up (championing trigger):',
    s['Championing trigger'],
    '',
    'Your load-bearing beliefs (use them; cite them in your own voice when they apply):',
    s['Load-bearing beliefs'],
    '',
    'Your voice (mimic these stylistic markers):',
    s['Voice anchors'],
    '',
    'Your honest blindspot — be candid about it when relevant:',
    s['Blindspot'],
    '',
    'Your domain scope (what you are calibrated for):',
    s['Domain scope'],
    '',
    'Behavior rules:',
    `- Stay in character as ${brief.name}. Don't summarize. Don't flatter. Push back on substance.`,
    `- If the user pastes an artifact (deck, page, plan, code), react as if they handed it to you in a 30-minute coffee.`,
    `- Use specific numbers and your own prior framings when they apply. Cite your published writing where natural.`,
    `- Honor your blindspot. If the user's pitch is outside your calibration domain, say "this is outside what I'd usually evaluate" and decline to fake an opinion.`,
    `- If the user asks "are you really ${brief.name.split(' ')[0]}?" or any variant, reply exactly: "I'm a synthetic proxy of ${brief.name}'s priors based on public writings through ${brief.last_validated}. Stress test, not verdict."`,
    `- If the user asks for an end-of-session summary, give one and remind them of the imitation ceiling above.`,
    `- Never break character except for the imitation-ceiling reminder.`,
    '',
    'Imitation ceiling note (always honor):',
    s['Imitation ceiling note'],
  ].join('\n');
}

function buildOneShotPrompt(brief, target) {
  const system = buildSystemPrompt(brief);
  const targetBlock = renderTarget(target);
  const user = [
    `A user has handed you the following artifact and asked for your single-pass critique.`,
    `Respond AS ${brief.name}, in your voice, with this exact structure (markdown):`,
    '',
    '## First read',
    '*One paragraph — your honest first reaction in voice.*',
    '',
    '## What I\'d push on',
    '*3–5 bullets — material concerns, in priority order.*',
    '',
    '## What earns my time',
    '*1–3 bullets — what makes you want to keep talking.*',
    '',
    '## Verdict',
    '*One sentence.*',
    '',
    '## Imitation ceiling',
    `*Reproduce verbatim:* ${brief.sections['Imitation ceiling note']}`,
    '',
    '---',
    '',
    `**Artifact** (${target.label}):`,
    '',
    targetBlock,
  ].join('\n');
  return { system, user };
}

function renderTarget(target) {
  if (!target || !target.content) return '*(empty target)*';
  const limit = 60000;
  let body = target.content;
  let truncated = false;
  if (body.length > limit) {
    body = body.slice(0, limit);
    truncated = true;
  }
  const fenced = '```\n' + body + '\n```';
  return truncated
    ? `${fenced}\n\n*(truncated at ${limit} characters of ${target.content.length})*`
    : fenced;
}

module.exports = { buildSystemPrompt, buildOneShotPrompt };
