/**
 * repl — `/mask <slug>` interactive REPL.
 *
 * Conversation primitives implemented (v1):
 *   :paste <path>     load a file into context
 *   :read <url>       fetch a URL into context
 *   :context          list files/URLs currently loaded
 *   :save [path]      write transcript to disk (auto-saves every turn anyway)
 *   :exit             save + quit
 *
 * Pass 2 (not yet wired):
 *   :switch <slug>    hand current artifact context to a different persona
 *   :challenge        ask the persona for 3 hard questions
 *   :reset            drop conversation, keep loaded artifacts
 *   --resume          continue a previous session
 */

const readline = require('readline');
const path = require('path');
const fs = require('fs');
const { loadBrief } = require('./brief-loader.cjs');
const { buildSystemPrompt } = require('./prompt-builder.cjs');
const { loadTarget } = require('./target-loader.cjs');
const { Transcript, newSlug, defaultPath } = require('./transcript.cjs');
const { converse, DEFAULT_MODEL } = require('./llm.cjs');

async function runRepl({ slug, model }) {
  const brief = loadBrief(slug);
  const system = buildSystemPrompt(brief);
  const sessionSlug = newSlug(brief.slug);
  const transcript = new Transcript({ persona: brief.name, slug: sessionSlug });
  const m = model || DEFAULT_MODEL;

  const history = [];
  const context = []; // [{ kind, label, path, content }]

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: process.stdout.isTTY,
  });
  const prompt = `[you]: > `;
  const personaLabel = `[${brief.name.toLowerCase()}]:`;

  const opener = 'what do you have for me?';
  process.stdout.write(`${personaLabel} ${opener}\n`);
  transcript.add('assistant', opener);
  transcript.flushToDisk();

  rl.setPrompt(prompt);
  rl.prompt();

  for await (const rawLine of rl) {
    const line = rawLine.trim();
    if (!line) { rl.prompt(); continue; }

    if (line.startsWith(':')) {
      const stop = await handleCommand(line, { context, transcript, brief, sessionSlug, history });
      if (stop) break;
      rl.prompt();
      continue;
    }

    history.push({ role: 'user', content: composeUserTurn(line, context) });
    transcript.add('user', line, context.length ? { note: `with ${context.length} loaded artifact(s)` } : null);
    transcript.flushToDisk();

    let reply;
    try {
      reply = await converse({ system, history, model: m });
    } catch (err) {
      process.stderr.write(`[mask] error: ${err.message}\n`);
      history.pop();
      rl.prompt();
      continue;
    }

    history.push({ role: 'assistant', content: reply });
    transcript.add('assistant', reply);
    transcript.flushToDisk();
    process.stdout.write(`${personaLabel} ${reply}\n`);
    rl.prompt();
  }

  rl.close();
  transcript.flushToDisk();
  process.stderr.write(`[mask] transcript saved → ${transcript.file}\n`);
}

function composeUserTurn(line, context) {
  if (!context.length) return line;
  // Inject loaded artifacts BEFORE the user line so the persona "reads" them
  // first and then responds to what the user said. Cheap but effective.
  const artifacts = context.map(c =>
    `[ARTIFACT — ${c.kind}: ${c.label}]\n${c.content}\n[END ARTIFACT]\n`
  ).join('\n');
  return `${artifacts}\n${line}`;
}

async function handleCommand(line, ctx) {
  const [cmd, ...rest] = line.split(/\s+/);
  const arg = rest.join(' ').trim();
  switch (cmd) {
    case ':help':
      printReplHelp();
      return false;
    case ':paste':
    case ':read': {
      if (!arg) { process.stderr.write(`usage: ${cmd} <path-or-url>\n`); return false; }
      try {
        const t = await loadTarget(arg);
        ctx.context.push({ kind: cmd === ':read' ? 'url' : 'file', label: t.label, path: t.path, content: t.content });
        ctx.transcript.add('system', `loaded ${cmd === ':read' ? 'url' : 'file'}: ${t.label} (${t.content.length} chars)`);
        ctx.transcript.flushToDisk();
        process.stderr.write(`[mask] loaded ${t.label} (${t.content.length} chars)\n`);
      } catch (err) {
        process.stderr.write(`[mask] ${cmd} failed: ${err.message}\n`);
      }
      return false;
    }
    case ':context': {
      if (!ctx.context.length) { process.stdout.write('(no artifacts loaded)\n'); return false; }
      for (const c of ctx.context) process.stdout.write(`- ${c.kind}: ${c.label} (${c.content.length} chars)\n`);
      return false;
    }
    case ':save': {
      const dest = arg || ctx.transcript.file;
      if (dest !== ctx.transcript.file) {
        fs.writeFileSync(dest, ctx.transcript.render(), 'utf-8');
        process.stderr.write(`[mask] transcript copied to ${dest}\n`);
      } else {
        ctx.transcript.flushToDisk();
        process.stderr.write(`[mask] transcript at ${ctx.transcript.file}\n`);
      }
      return false;
    }
    case ':exit':
    case ':quit':
      return true;
    case ':switch':
    case ':challenge':
    case ':reset':
      process.stderr.write(`[mask] ${cmd} not yet implemented (REPL pass 2)\n`);
      return false;
    default:
      process.stderr.write(`[mask] unknown command: ${cmd}. Try :help\n`);
      return false;
  }
}

function printReplHelp() {
  process.stdout.write(`Conversation commands:
  :paste <path>     load a file into context (persona "reads" it)
  :read <url>       fetch a URL into context
  :context          list loaded artifacts
  :save [path]      write transcript to disk (also auto-saves each turn)
  :exit             save and quit
  :help             this help

Pass 2 (not yet wired): :switch :challenge :reset
`);
}

module.exports = { runRepl };
