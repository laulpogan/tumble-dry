/**
 * transcript — append-only conversation log writer for /mask sessions.
 *
 * Every REPL session auto-saves to ~/.tumble-dry/mask-sessions/<slug>.md after
 * each turn, so killing the terminal never loses the conversation.
 *
 * One-shot --review mode also routes its output here (single artifact per
 * file), or to an explicit --output path.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_DIR = path.join(os.homedir(), '.tumble-dry', 'mask-sessions');

class Transcript {
  constructor({ persona, slug, file, header }) {
    this.persona = persona;
    this.slug = slug;
    this.file = file || defaultPath(slug);
    this.entries = [];
    this.header = header || defaultHeader(persona, slug);
    ensureDir(path.dirname(this.file));
  }

  add(role, content, meta) {
    this.entries.push({ role, content, meta: meta || null, at: new Date().toISOString() });
  }

  flushToDisk() {
    const body = this.render();
    fs.writeFileSync(this.file, body, 'utf-8');
  }

  render() {
    const parts = [this.header, ''];
    for (const e of this.entries) {
      const label =
        e.role === 'assistant' ? `### ${this.persona}` :
        e.role === 'user' ? '### you' :
        e.role === 'system' ? '### system' :
        `### ${e.role}`;
      parts.push(label);
      if (e.meta && e.meta.note) parts.push(`*(${e.meta.note})*`);
      parts.push('');
      parts.push(e.content);
      parts.push('');
    }
    return parts.join('\n').trimEnd() + '\n';
  }
}

function defaultPath(slug) {
  return path.join(DEFAULT_DIR, `${slug}.md`);
}

function defaultHeader(persona, slug) {
  return [
    `# /mask session — ${persona}`,
    '',
    `- **slug:** \`${slug}\``,
    `- **started:** ${new Date().toISOString()}`,
    `- **persona:** ${persona}`,
    '',
    `> Synthetic dialogue. Not the real ${persona}. Internal-only. Don't publish or attribute.`,
    '',
    '---',
  ].join('\n');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function newSlug(personaSlug) {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hhmm = String(d.getUTCHours()).padStart(2, '0') + String(d.getUTCMinutes()).padStart(2, '0');
  return `mask-${personaSlug}-${yyyy}-${mm}-${dd}-${hhmm}`;
}

function listSessions() {
  if (!fs.existsSync(DEFAULT_DIR)) return [];
  return fs.readdirSync(DEFAULT_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => ({ slug: f.replace(/\.md$/, ''), file: path.join(DEFAULT_DIR, f) }));
}

module.exports = { Transcript, newSlug, listSessions, defaultPath, DEFAULT_DIR };
