#!/usr/bin/env node
/**
 * Phase 8 / DRYRUN-01: cost estimation.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const { estimateRunCost, renderCostBlock, priceFor, estimateTokens, PRICES } = require(path.join(ROOT, 'lib/pricing.cjs'));

test('priceFor resolves named models to entries', () => {
  assert.deepEqual(priceFor('opus'), PRICES.opus);
  assert.deepEqual(priceFor('sonnet'), PRICES.sonnet);
  assert.deepEqual(priceFor('claude-opus-4-6'), PRICES.opus);
  assert.deepEqual(priceFor('unknown-model'), PRICES.default);
});

test('estimateTokens ~= chars/4', () => {
  assert.equal(estimateTokens(''), 0);
  assert.equal(estimateTokens('abcd'), 1);
  assert.equal(estimateTokens('x'.repeat(4000)), 1000);
});

test('estimateRunCost returns positive numbers + all fields', () => {
  const e = estimateRunCost({ artifactChars: 10000, panelSize: 5, maxRounds: 4 });
  assert.ok(e.total_usd > 0);
  assert.ok(e.per_round_usd > 0);
  assert.ok(e.round1_extra_usd > 0);
  assert.ok(e.rounds_estimated > 0);
  assert.ok(e.per_round_input_tokens > 0);
  assert.ok(e.per_round_output_tokens > 0);
});

test('estimateRunCost scales with panel size', () => {
  const small = estimateRunCost({ artifactChars: 5000, panelSize: 3, maxRounds: 4 });
  const big   = estimateRunCost({ artifactChars: 5000, panelSize: 9, maxRounds: 4 });
  assert.ok(big.total_usd > small.total_usd);
});

test('estimateRunCost caps at max_rounds', () => {
  const capped = estimateRunCost({ artifactChars: 5000, panelSize: 5, maxRounds: 1, expectedRounds: 10 });
  assert.equal(capped.rounds_estimated, 1);
});

test('renderCostBlock produces well-formed markdown with expected keys', () => {
  const e = estimateRunCost({ artifactChars: 5000, panelSize: 5 });
  const md = renderCostBlock(e);
  assert.match(md, /## Estimated cost/);
  assert.match(md, /Reviewer model:/);
  assert.match(md, /Editor model:/);
  assert.match(md, /Per-round cost:/);
  assert.match(md, /Total expected:/);
});
