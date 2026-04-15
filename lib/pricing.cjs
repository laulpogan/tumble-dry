/**
 * DRYRUN-01: built-in price table for cost estimation.
 *
 * Prices in USD per million tokens. Current as of 2026-04 for Claude 4.x
 * family. Update when Anthropic changes pricing. The estimate is a
 * within-80% ballpark — prompt caching and tool-use overhead push real costs
 * around, but the user should be able to read "~$0.30 for this run" and
 * know whether to kill it before committing.
 */

const PRICES = {
  // Claude 4.6 family (current as of 2026-04)
  'opus':   { input: 15,  output: 75  },
  'sonnet': { input: 3,   output: 15  },
  'haiku':  { input: 1,   output: 5   },
  // Default: sonnet pricing (matches dispatch-api.cjs default)
  'default': { input: 3, output: 15 },
};

function priceFor(model) {
  if (!model) return PRICES.default;
  const key = String(model).toLowerCase();
  if (PRICES[key]) return PRICES[key];
  // Best-effort fuzzy: "claude-opus-4-6" → opus, etc.
  for (const name of Object.keys(PRICES)) {
    if (key.includes(name)) return PRICES[name];
  }
  return PRICES.default;
}

/**
 * Rough token-count heuristic for a string. Claude tokenization averages
 * ~3.8-4.0 chars/token on English prose. 4 is the standard engineering
 * estimate; use it.
 */
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Estimate cost of a full tumble-dry run on a single artifact.
 *
 * Inputs:
 *   artifactChars  — size of working.md
 *   panelSize      — number of reviewers per round
 *   panelBriefChars — audience.md typical size (seeded from library)
 *   maxRounds      — config cap (we estimate ceiling)
 *   thinkingBudget — editor extended-thinking cap in tokens
 *   reviewerModel  — sonnet (default) or opus
 *   editorModel    — opus (default) or sonnet
 *
 * Formula (per round):
 *   - Reviewer wave: panelSize × (artifact + brief ≈ 2× artifact) input +
 *                    ~1500 output tokens per critique
 *   - Aggregator: pure node, no LLM
 *   - Editor: (artifact + aggregate + brief ≈ 3× artifact) input +
 *             artifact output + thinkingBudget
 *   - Audience/Auditor (round 1 only): 1 opus call each ≈ artifact + 2000 output
 *
 * Returns { rounds, per_round_input, per_round_output, total_input, total_output, total_usd }.
 */
function estimateRunCost({
  artifactChars,
  panelSize = 5,
  panelBriefChars = 2000,
  maxRounds = 4,
  thinkingBudget = 4000,
  reviewerModel = 'sonnet',
  editorModel = 'opus',
  audienceModel = 'opus',
  // Heuristic: tumble-dry typically converges at round 2-3 based on PM dogfood
  expectedRounds = null,
}) {
  const artifactTok = estimateTokens('x'.repeat(artifactChars || 0));
  const briefTok = estimateTokens('x'.repeat(panelBriefChars || 0));

  const rounds = expectedRounds != null
    ? Math.min(Math.max(1, expectedRounds), maxRounds)
    : Math.min(3, maxRounds);

  // Per-round reviewer wave
  const reviewerInputPerCall = artifactTok + briefTok + 1500; // reviewer brief scaffolding
  const reviewerOutputPerCall = 1500;                          // typical critique size
  const reviewerWaveInput = reviewerInputPerCall * panelSize;
  const reviewerWaveOutput = reviewerOutputPerCall * panelSize;

  // Per-round editor
  const editorInput = 3 * artifactTok + 2000;
  const editorOutput = artifactTok + thinkingBudget;

  const revPrice = priceFor(reviewerModel);
  const edPrice = priceFor(editorModel);
  const audPrice = priceFor(audienceModel);

  const roundUsd =
    (reviewerWaveInput * revPrice.input + reviewerWaveOutput * revPrice.output) / 1_000_000 +
    (editorInput * edPrice.input + editorOutput * edPrice.output) / 1_000_000;

  // One-time round-1 audience + auditor (audience ≈ opus, auditor ≈ sonnet)
  const round1Extra =
    ((artifactTok + 1500) * audPrice.input + 2000 * audPrice.output) / 1_000_000 +
    ((artifactTok + 1500) * revPrice.input + 2000 * revPrice.output) / 1_000_000;

  const totalUsd = round1Extra + roundUsd * rounds;

  return {
    rounds_estimated: rounds,
    max_rounds: maxRounds,
    per_round_input_tokens: reviewerWaveInput + editorInput,
    per_round_output_tokens: reviewerWaveOutput + editorOutput,
    per_round_usd: Number(roundUsd.toFixed(4)),
    round1_extra_usd: Number(round1Extra.toFixed(4)),
    total_usd: Number(totalUsd.toFixed(4)),
    reviewer_model: reviewerModel,
    editor_model: editorModel,
  };
}

function renderCostBlock(estimate) {
  const lines = [
    '## Estimated cost',
    '',
    `- **Reviewer model:** ${estimate.reviewer_model} (\$${priceFor(estimate.reviewer_model).input}/M input, \$${priceFor(estimate.reviewer_model).output}/M output)`,
    `- **Editor model:** ${estimate.editor_model} (\$${priceFor(estimate.editor_model).input}/M input, \$${priceFor(estimate.editor_model).output}/M output)`,
    `- **Rounds (expected / max):** ${estimate.rounds_estimated} / ${estimate.max_rounds}`,
    `- **Per-round tokens:** ~${estimate.per_round_input_tokens.toLocaleString()} input / ${estimate.per_round_output_tokens.toLocaleString()} output`,
    `- **Per-round cost:** \$${estimate.per_round_usd}`,
    `- **Round-1 setup (audience + auditor):** \$${estimate.round1_extra_usd}`,
    `- **Total expected:** \$${estimate.total_usd}`,
    '',
    '_Estimate within ~80% of actual cost. Prompt caching and retries push it around._',
    '',
  ];
  return lines.join('\n');
}

module.exports = { PRICES, priceFor, estimateTokens, estimateRunCost, renderCostBlock };
