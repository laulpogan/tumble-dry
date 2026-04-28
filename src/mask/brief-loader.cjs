/**
 * brief-loader — load + validate a real-person persona brief from
 * personas/real-people/<slug>.md.
 *
 * Returns a structured object with parsed frontmatter and section text.
 * Throws on missing slug, retired status, or malformed brief. Warns (stderr)
 * when last_validated is more than 6 months stale.
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_SECTIONS = [
  'Hiring job',
  'Bounce trigger',
  'Championing trigger',
  'Load-bearing beliefs',
  'Voice anchors',
  'Blindspot',
  'Source corpus',
  'Domain scope',
  'Imitation ceiling note',
];

const STALENESS_WARN_DAYS = 180;

function briefsDir() {
  return path.resolve(__dirname, '..', '..', 'personas', 'real-people');
}

function listBriefFiles() {
  const dir = briefsDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .filter(f => !['README.md', 'index.md', 'opt-outs.md'].includes(f))
    .map(f => path.join(dir, f));
}

function indexBySlug() {
  const idx = {};
  for (const file of listBriefFiles()) {
    try {
      const raw = fs.readFileSync(file, 'utf-8');
      const { fm } = parseFrontmatter(raw);
      if (fm.slug) idx[fm.slug] = file;
    } catch { /* skip malformed */ }
  }
  return idx;
}

function listSlugs() {
  return Object.keys(indexBySlug()).sort();
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { fm: {}, body: raw };
  const fm = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.+)$/);
    if (m) fm[m[1]] = m[2].trim();
  }
  return { fm, body: raw.slice(match[0].length) };
}

function extractSections(body) {
  const sections = {};
  const lines = body.split('\n');
  let current = null;
  let buf = [];
  let bio = [];
  let sawHeading = false;
  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      if (current) sections[current] = buf.join('\n').trim();
      else if (!sawHeading) {
        // body before first H2 is bio (after the H1 + bio paragraph)
      }
      current = h2[1].trim();
      buf = [];
      sawHeading = true;
      continue;
    }
    if (!sawHeading) bio.push(line);
    else buf.push(line);
  }
  if (current) sections[current] = buf.join('\n').trim();
  // Bio: pull the first italicized paragraph after the H1.
  const bioText = bio.join('\n');
  const bioMatch = bioText.match(/^#\s+.+?\n+\*([\s\S]+?)\*\s*$/m);
  return { sections, bio: bioMatch ? bioMatch[1].replace(/\s+/g, ' ').trim() : '' };
}

function loadBrief(slug) {
  if (!slug || typeof slug !== 'string') {
    throw new Error('brief-loader: slug required');
  }
  const idx = indexBySlug();
  let file = idx[slug];
  if (!file) {
    // Allow filename-style lookup as a convenience.
    const filenameGuess = path.join(briefsDir(), `${slug}.md`);
    if (fs.existsSync(filenameGuess)) file = filenameGuess;
  }
  if (!file) {
    const available = listSlugs().join(', ') || '(none)';
    throw new Error(`brief-loader: no brief for slug "${slug}". Available: ${available}`);
  }
  const raw = fs.readFileSync(file, 'utf-8');
  const { fm, body } = parseFrontmatter(raw);

  if (!fm.name || !fm.slug || !fm.last_validated || !fm.status) {
    throw new Error(`brief-loader: ${slug}.md missing required frontmatter (name/slug/last_validated/status)`);
  }
  if (fm.status === 'retired') {
    throw new Error(`brief-loader: ${slug} is retired — not eligible for /mask sessions`);
  }
  if (fm.status !== 'active') {
    throw new Error(`brief-loader: ${slug} has unknown status "${fm.status}" (expected active|retired)`);
  }

  const { sections, bio } = extractSections(body);
  const missing = REQUIRED_SECTIONS.filter(s => !sections[s]);
  if (missing.length) {
    throw new Error(`brief-loader: ${slug}.md missing sections: ${missing.join(', ')}`);
  }

  // Staleness check.
  const ageDays = ageInDays(fm.last_validated);
  if (ageDays !== null && ageDays > STALENESS_WARN_DAYS) {
    process.stderr.write(
      `[mask] warning: ${slug} last_validated ${fm.last_validated} (${ageDays}d ago). ` +
      `Persona priors may be stale. Re-validate before relying on output.\n`
    );
  }

  return {
    slug: fm.slug,
    name: fm.name,
    last_validated: fm.last_validated,
    status: fm.status,
    bio,
    sections,
    raw,
    file,
  };
}

function ageInDays(yyyyMmDd) {
  const m = yyyyMmDd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const then = new Date(`${yyyyMmDd}T00:00:00Z`).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86400000);
}

function listBriefs() {
  return listSlugs().map(slug => {
    try {
      const b = loadBrief(slug);
      return {
        slug: b.slug,
        name: b.name,
        status: b.status,
        last_validated: b.last_validated,
        domain: b.sections['Domain scope']
          ? b.sections['Domain scope'].split('\n')[0].slice(0, 80)
          : '',
      };
    } catch (err) {
      return { slug, name: '(invalid)', status: 'error', last_validated: '?', domain: err.message };
    }
  });
}

module.exports = { loadBrief, listBriefs, listSlugs, briefsDir };
