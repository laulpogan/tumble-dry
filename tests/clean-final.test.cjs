// tests/clean-final.test.cjs
// Unit tests for lib/clean-final.cjs.
//
// Runs under the existing npm test harness style (plain node, assert-based, no external framework).

'use strict';

const assert = require('assert');
const { cleanFinal } = require('../lib/clean-final.cjs');

let passed = 0;
let failed = 0;
function t(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed += 1;
    console.log(`  FAIL ${name}`);
    console.log(`       ${err.message}`);
  }
}

console.log('# clean-final');

t('strips Round-N convergence note paragraphs', () => {
  const md = [
    '# Doc',
    '',
    '**Round-3 convergence note (editor):** Panel converged at round 3. Hand to PM pod.',
    '',
    'Real content survives.',
    '',
  ].join('\n');
  const out = cleanFinal(md);
  assert.ok(!/convergence note/i.test(out), 'convergence note should be stripped');
  assert.ok(/Real content survives/.test(out), 'real content should survive');
});

t('strips bracketed reviewer annotations but keeps real placeholders', () => {
  const md = [
    'Foundry Local is now in GA [status confirmation required from Microsoft comms before NVIDIA asserts Microsoft-product GA — elena-voss; tracked as B12.]',
    '',
    'Subheadline: [XXX]',
    '',
    'Model catalog at launch: one (Phi-Silica 3.3B). [REVIEWERS — Gerardo/Annamalai: Phi-4, Whisper, Llama-family roadmap needed.]',
    '',
    'Benefit line: delivers [10X] performance.',
    '',
  ].join('\n');
  const out = cleanFinal(md);
  assert.ok(!/elena-voss/.test(out), 'reviewer slug should be stripped');
  assert.ok(!/REVIEWERS\s—/.test(out), 'REVIEWERS marker block should be stripped');
  assert.ok(!/tracked as B12/.test(out), 'tracker ref should be stripped');
  assert.ok(/\[XXX\]/.test(out), 'real placeholder [XXX] must survive');
  assert.ok(/\[10X\]/.test(out), 'short placeholder [10X] must survive');
});

t('strips Structural decisions required and Blocking-item tracker sections', () => {
  const md = [
    '# Thesis',
    '',
    'This is the thesis.',
    '',
    '# Structural decisions required (round-2 add)',
    '',
    '1.  WinML + TRT-for-RTX vs. DirectML.',
    '2.  Perf-claim methodology footnote.',
    '',
    '# Blocking-item tracker',
    '',
    '| # | Item | Owner |',
    '| --- | --- | --- |',
    '| B1 | Perf methodology | Annamalai |',
    '',
    '# Target Announcements',
    '',
    'Announcement copy.',
    '',
  ].join('\n');
  const out = cleanFinal(md);
  assert.ok(!/Structural decisions required/i.test(out), 'structural section should be stripped');
  assert.ok(!/Blocking-item tracker/i.test(out), 'blocker tracker section should be stripped');
  assert.ok(!/WinML \+ TRT/.test(out), 'structural section body should be stripped');
  assert.ok(/Target Announcements/.test(out), 'later section should survive');
  assert.ok(/Announcement copy/.test(out), 'later section body should survive');
});

t('strips role annotations on reviewer-list entries', () => {
  const md = [
    '*   [Gerardo Delgado Cabrera](mailto:gerardod@nvidia.com) — **decide:** GPU support envelope; **block:** B17 positioning',
    '*   [Jessica Huang US](mailto:jessicah@nvidia.com) (GeForce) — reviewer',
    '*   [Jason Paul US](mailto:jpaul@nvidia.com) — **decide:** launch gate (go/no-go)',
  ].join('\n');
  const out = cleanFinal(md);
  assert.ok(/\[Gerardo Delgado Cabrera\]\(mailto:gerardod@nvidia\.com\)/.test(out), 'name + mailto must survive');
  assert.ok(!/\*\*decide:\*\*/i.test(out), 'decide annotation must be stripped');
  assert.ok(!/\*\*block:\*\*/i.test(out), 'block annotation must be stripped');
  assert.ok(!/— reviewer$/m.test(out), 'reviewer suffix must be stripped');
});

t('strips italic process-commentary paragraphs', () => {
  const md = [
    '# FAB',
    '',
    '*Reading order revised in round 2 per asher-ng + maya-okonkwo — Voicemod leads.*',
    '',
    'Actual Feature copy here.',
    '',
    '*Scaffold only — PMs have not filled. From a legal perspective nothing to review.*',
    '',
    'Additional real content.',
    '',
  ].join('\n');
  const out = cleanFinal(md);
  assert.ok(!/Reading order revised/.test(out), 'reading-order meta should be stripped');
  assert.ok(!/Scaffold only/.test(out), 'scaffold-only meta should be stripped');
  assert.ok(/Actual Feature copy/.test(out), 'real content must survive');
  assert.ok(/Additional real content/.test(out), 'real content must survive');
});

t('strips round-annotation parentheticals from bold labels', () => {
  const md = [
    '**Thesis (round-1 add; moved above reviewer list round 2; round-3 tightening)**',
    '',
    '*   Point one.',
  ].join('\n');
  const out = cleanFinal(md);
  assert.ok(/\*\*Thesis\*\*/.test(out), 'plain **Thesis** label must survive');
  assert.ok(!/round-1 add/.test(out), 'round-1 add parenthetical stripped');
  assert.ok(!/round-3 tightening/.test(out), 'round-3 tightening parenthetical stripped');
  assert.ok(/Point one/.test(out), 'body bullet must survive');
});

t('strips Decision ownership block (round-1 add)', () => {
  const md = [
    '**Decision ownership (round-1 add; retained and reconciled with reviewer-list annotation above round 3)**',
    '*   Launch gate (go/no-go): Jason Paul',
    '*   Perf-claim methodology + legal sign-off: Annamalai Chockalingam',
    '',
    '# Target Announcements',
    '',
    'Real body.',
  ].join('\n');
  const out = cleanFinal(md);
  assert.ok(!/Decision ownership/.test(out), 'decision-ownership label stripped');
  assert.ok(!/Launch gate/.test(out), 'decision-ownership bullets stripped');
  assert.ok(/Target Announcements/.test(out), 'following heading must survive');
  assert.ok(/Real body/.test(out), 'following body must survive');
});

t('collapses excess blank lines after stripping', () => {
  const md = [
    '# Head',
    '',
    '**Round-1 convergence note (editor):** foo bar.',
    '',
    '',
    '',
    'Body.',
    '',
  ].join('\n');
  const out = cleanFinal(md);
  assert.ok(!/\n{3,}/.test(out), 'no runs of 3+ blank lines');
});

t('preserves clean FAB content end-to-end (smoke test)', () => {
  const md = [
    '# MSFT Build \u201826 FAB',
    '',
    '**Headline (candidate direction):** "Windows AI APIs now run on RTX GPUs."',
    '',
    '**Windows ML Partner Celebration**',
    '',
    '*   Voicemod: Real-time AI voice conversion.',
    '*   Topaz: 20% faster video upscaling.',
    '',
  ].join('\n');
  const out = cleanFinal(md);
  assert.ok(/MSFT Build .26 FAB/.test(out));
  assert.ok(/Windows AI APIs now run on RTX GPUs/.test(out));
  assert.ok(/Windows ML Partner Celebration/.test(out));
  assert.ok(/Voicemod/.test(out));
  assert.ok(/Topaz/.test(out));
});

console.log('');
console.log(`# ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
