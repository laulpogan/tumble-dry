/**
 * Direct Anthropic API dispatch backend for tumble-dry.
 *
 * Alternative to lib/gastown-bridge.sh. Dispatches each "polecat" as a
 * parallel Claude API call. Input: brief markdown. Output: critique markdown
 * written to a target file in the round dir.
 *
 * Uses prompt caching on the static prefix (reviewer agent + artifact + audit)
 * so multi-reviewer waves share a cache entry across requests in a wave.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const QUALITY_MODEL = 'claude-opus-4-6';
const MAX_TOKENS = 8192;
const API_BASE = 'https://api.anthropic.com/v1/messages';

// Extended thinking budget per role. Editor gets the deepest reasoning since
// it's the synthesis step (one call per round, high-leverage). Reviewers and
// the audit/audience agents default to 0 to keep cost down on N parallel calls.
// Override per role via env: TUMBLE_DRY_THINK_<ROLE>=<budget_tokens> (0 disables).
const THINKING_DEFAULTS = {
  editor: 4000,
  'audience-inferrer': 0,
  'assumption-auditor': 0,
  reviewer: 0,
};

function thinkingBudgetFor(role) {
  const key = `TUMBLE_DRY_THINK_${(role || '').toUpperCase().replace(/-/g, '_')}`;
  if (process.env[key] !== undefined) return parseInt(process.env[key], 10) || 0;
  if (process.env.TUMBLE_DRY_THINK !== undefined) return parseInt(process.env.TUMBLE_DRY_THINK, 10) || 0;
  return THINKING_DEFAULTS[role] || 0;
}

// Role → model. Reviewers on Sonnet (fast + cheap, quality adequate).
// Audience Inferrer + Editor on Opus (quality-critical, runs once per wave).
// Override via TUMBLE_DRY_MODEL (all roles) or per-role TUMBLE_DRY_MODEL_<ROLE>.
function modelFor(role) {
  const all = process.env.TUMBLE_DRY_MODEL;
  if (all) return all;
  const key = `TUMBLE_DRY_MODEL_${(role || '').toUpperCase().replace(/-/g, '_')}`;
  if (process.env[key]) return process.env[key];
  if (role === 'audience-inferrer' || role === 'editor') return QUALITY_MODEL;
  return DEFAULT_MODEL;
}

function apiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  // Fallback: ~/.anthropic/api_key or ~/.config/anthropic/api_key
  const candidates = [
    path.join(os.homedir(), '.anthropic', 'api_key'),
    path.join(os.homedir(), '.config', 'anthropic', 'api_key'),
  ];
  for (const p of candidates) {
    try {
      const k = fs.readFileSync(p, 'utf-8').trim();
      if (k) return k;
    } catch {}
  }
  throw new Error(
    'ANTHROPIC_API_KEY not set.\n' +
    '  Fix: export ANTHROPIC_API_KEY=sk-ant-... OR\n' +
    '       write it to ~/.anthropic/api_key (one line, no quotes)'
  );
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Call the Anthropic messages API. Returns the response text.
 * Uses prompt caching via cache_control on the prefix block if provided.
 */
async function callApiOnce({ system, userPrefix, userSuffix, cachedPrefix, model, maxTokens, thinkingBudget }) {
  const content = [];
  if (userPrefix) {
    const block = { type: 'text', text: userPrefix };
    if (cachedPrefix) block.cache_control = { type: 'ephemeral' };
    content.push(block);
  }
  if (userSuffix) content.push({ type: 'text', text: userSuffix });

  const requestPayload = {
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content }],
  };
  if (thinkingBudget && thinkingBudget > 0) {
    // Extended thinking: model emits internal reasoning blocks before its answer.
    // budget_tokens must be < max_tokens. Bump max_tokens if needed so the model
    // still has room to actually answer after thinking.
    requestPayload.thinking = { type: 'enabled', budget_tokens: thinkingBudget };
    if (maxTokens <= thinkingBudget + 1024) {
      requestPayload.max_tokens = thinkingBudget + 4096;
    }
  }
  const body = JSON.stringify(requestPayload);

  return new Promise((resolve, reject) => {
    const req = https.request(API_BASE, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey(),
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
        'content-length': Buffer.byteLength(body),
      },
    }, (res) => {
      let chunks = '';
      res.on('data', (c) => { chunks += c; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(chunks);
            // Filter to text blocks only (was previously joining ALL block .text,
            // which silently concatenated thinking output with the deliverable).
            const blocks = parsed.content || [];
            const text = blocks
              .filter(b => b.type === 'text')
              .map(b => b.text || '')
              .filter(Boolean)
              .join('\n');
            const thinking = blocks
              .filter(b => b.type === 'thinking')
              .map(b => b.thinking || b.text || '')
              .filter(Boolean)
              .join('\n');
            return resolve({
              text,
              thinking,
              blocks,
              usage: parsed.usage || {},
              status: 200,
              request: requestPayload,
            });
          } catch (e) {
            return reject(new Error(`parse error: ${e.message}; body: ${chunks.slice(0, 200)}`));
          }
        }
        const err = new Error(`API ${res.statusCode}: ${chunks.slice(0, 500)}`);
        err.status = res.statusCode;
        err.body = chunks;
        reject(err);
      });
    });
    req.on('error', reject);
    req.setTimeout(600000, () => req.destroy(new Error('API request timeout 10min')));
    req.write(body);
    req.end();
  });
}

/**
 * Call the Anthropic messages API with retries on 429 / 529 / 5xx.
 * Exponential backoff with jitter; gives up after 4 attempts.
 */
async function callApi(opts) {
  const model = opts.model || modelFor(opts.role);
  const maxTokens = opts.maxTokens || MAX_TOKENS;
  const cachedPrefix = opts.cachedPrefix !== false;
  const thinkingBudget = opts.thinkingBudget !== undefined ? opts.thinkingBudget : thinkingBudgetFor(opts.role);
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await callApiOnce({ ...opts, model, maxTokens, cachedPrefix, thinkingBudget });
    } catch (e) {
      lastErr = e;
      const retriable = e.status === 429 || e.status === 529 || (e.status >= 500 && e.status < 600) || /timeout|ECONN|ETIMEDOUT/i.test(e.message);
      if (!retriable || attempt === 3) throw e;
      const backoff = Math.floor(2000 * Math.pow(2, attempt) * (0.7 + Math.random() * 0.6));
      console.error(`[api] retry ${attempt + 1}/3 after ${backoff}ms (${e.message.slice(0, 80)})`);
      await sleep(backoff);
    }
  }
  throw lastErr;
}

/**
 * Given a brief file, split it into system + cached-prefix + volatile-suffix.
 * Convention: the brief's first line starts with "# " (title). Content up to
 * a marker "---CACHE-SPLIT---" is cached; after is varied (persona etc.).
 * If no marker, everything is cached (safe but no reuse across reviewers).
 */
function splitBrief(briefText) {
  const marker = /^---CACHE-SPLIT---\s*$/m;
  const m = briefText.match(marker);
  if (!m) return { prefix: briefText, suffix: '' };
  const idx = briefText.indexOf(m[0]);
  return {
    prefix: briefText.slice(0, idx).trim(),
    suffix: briefText.slice(idx + m[0].length).trim(),
  };
}

/**
 * Run one dispatch: read brief, call API, write output to `<round_dir>/<target_filename>`.
 * Returns { target, usage }.
 */
const SYSTEM_PROMPT = 'You are a tumble-dry agent. Follow the brief exactly. Output only the requested markdown (the content of the deliverable file), nothing else — no preamble, no meta-commentary.';

/**
 * Map role → inferred agent kind for model selection.
 *   reviewer (any persona slug) → sonnet
 *   audience-inferrer / assumption-auditor / editor → opus
 */
function roleKind(role) {
  if (role === 'audience-inferrer' || role === 'assumption-auditor' || role === 'editor') return role;
  return 'reviewer';
}

async function dispatchOne({ briefFile, roundDir, targetFilename, role }) {
  const briefText = fs.readFileSync(briefFile, 'utf-8');
  const { prefix, suffix } = splitBrief(briefText);
  const kind = roleKind(role);
  const startedAt = new Date();
  const result = await callApi({
    system: SYSTEM_PROMPT,
    userPrefix: prefix,
    userSuffix: suffix,
    role: kind,
  });
  const finishedAt = new Date();
  const target = path.join(roundDir, targetFilename);
  fs.writeFileSync(target, result.text, 'utf-8');

  // Persist a reasoning trace so any run can be reconstructed later: full
  // request payload, separated content blocks, usage, timings. Lives next to
  // the deliverable so reviewers/editors can be re-audited without re-running.
  const tracesDir = path.join(roundDir, 'traces');
  fs.mkdirSync(tracesDir, { recursive: true });
  const traceName = (role || 'unknown').replace(/[^a-z0-9_-]/gi, '_');
  const trace = {
    role,
    kind,
    model: modelFor(kind),
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_ms: finishedAt - startedAt,
    request: result.request,
    response: {
      blocks: result.blocks,
      text: result.text,
      thinking: result.thinking,
    },
    usage: result.usage,
    target_file: target,
    brief_file: briefFile,
  };
  fs.writeFileSync(
    path.join(tracesDir, `${traceName}.json`),
    JSON.stringify(trace, null, 2),
    'utf-8'
  );
  if (result.thinking) {
    fs.writeFileSync(
      path.join(tracesDir, `${traceName}.thinking.md`),
      `# ${role} — extended thinking\n\nModel: ${trace.model}\nDuration: ${trace.duration_ms}ms\n\n---\n\n${result.thinking}\n`,
      'utf-8'
    );
  }

  return { target, usage: result.usage, model: modelFor(kind), trace_file: path.join(tracesDir, `${traceName}.json`) };
}

/**
 * Run N dispatches in parallel. `records` = [{ name, briefFile, targetFilename }].
 * `name` is used as the role hint; reviewers use their persona slug as name.
 */
async function dispatchBatch({ records, roundDir }) {
  const results = await Promise.allSettled(
    records.map(r => dispatchOne({
      briefFile: r.briefFile,
      roundDir,
      targetFilename: r.targetFilename,
      role: r.name,
    }))
  );
  return results.map((r, i) => r.status === 'fulfilled'
    ? { ...r.value, record: records[i] }
    : { error: r.reason && r.reason.message ? r.reason.message : String(r.reason), record: records[i] });
}

module.exports = { dispatchOne, dispatchBatch, callApi, splitBrief, modelFor, DEFAULT_MODEL, QUALITY_MODEL };
