/**
 * llm — Claude invocation for /mask.
 *
 * Strategy (matches CLAUDE.md "Harness Claude Code, not the API"):
 *   - Default: spawn the `claude` CLI as a subprocess. Inherits the host's
 *     OAuth credentials from `claude login`, so /mask works with zero API-key
 *     setup for anyone who is already signed in.
 *   - We DO NOT use --bare (it disables OAuth keychain reads). Trade-off: the
 *     host's global ~/.claude/CLAUDE.md may inject a small amount of
 *     auto-memory context. The persona system prompt dominates.
 *
 * Two entry points:
 *   - oneShot({ system, user, model }) → string  (single completion)
 *   - converse({ system, history, model }) → string (REPL turn — re-sends the
 *     full message history each call; stateless across calls)
 *
 * History shape: [{ role: 'user' | 'assistant', content: string }, ...]
 */

const { spawn, spawnSync } = require('child_process');

// 1M-context Opus 4.7 by default — long artifact-laden conversations.
const DEFAULT_MODEL = process.env.MASK_MODEL || 'claude-opus-4-7[1m]';

function resolveClaudeBin() {
  if (process.env.MASK_CLAUDE_BIN) return process.env.MASK_CLAUDE_BIN;
  const which = spawnSync('which', ['claude'], { encoding: 'utf-8' });
  if (which.status === 0 && which.stdout.trim()) return which.stdout.trim();
  return null;
}

function ensureClaudeAvailable() {
  const bin = resolveClaudeBin();
  if (!bin) {
    throw new Error(
      '`claude` CLI not found on PATH. /mask harnesses Claude Code so it works ' +
      'with your existing `claude login` (no API key needed). Install Claude Code ' +
      'first: https://docs.claude.com/en/docs/claude-code'
    );
  }
  return bin;
}

async function oneShot({ system, user, model }) {
  return runClaude({ system, user, model: model || DEFAULT_MODEL });
}

async function converse({ system, history, model }) {
  const transcript = history.map(t =>
    t.role === 'assistant' ? `[YOU, IN VOICE]:\n${t.content}` : `[USER]:\n${t.content}`
  ).join('\n\n---\n\n');
  const user =
    `Continue the in-character dialogue below. Reply ONLY as the persona, in voice. ` +
    `Do NOT echo the user's last message. Do NOT add stage directions or labels. ` +
    `Just your next reply, plain text.\n\n${transcript}`;
  return runClaude({ system, user, model: model || DEFAULT_MODEL });
}

function runClaude({ system, user, model }) {
  const bin = ensureClaudeAvailable();
  return new Promise((resolve, reject) => {
    // Strip ANTHROPIC_API_KEY from child env so claude CLI uses OAuth auth.
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;
    const args = [
      '--print',
      '--model', model,
      '--system-prompt', system,
      '--no-session-persistence',
      '--disable-slash-commands',
      user,
    ];
    const child = spawn(bin, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (b) => { stdout += b.toString('utf-8'); });
    child.stderr.on('data', (b) => { stderr += b.toString('utf-8'); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`claude exited ${code}: ${stderr.trim() || stdout.trim() || '(no output)'}`));
      }
      const out = stdout.trim();
      if (!out) return reject(new Error(`claude returned empty output. stderr: ${stderr.trim() || '(none)'}`));
      resolve(out);
    });
  });
}

module.exports = { oneShot, converse, ensureClaudeAvailable, DEFAULT_MODEL };
