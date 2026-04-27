#!/usr/bin/env node
/**
 * mask CLI — entry point for `/mask`.
 *
 * Usage:
 *   mask <slug>                            interactive REPL with persona <slug>
 *   mask <slug> --review <target>          one-shot structured critique
 *                  [--output <path>]       file or directory; default ~/.tumble-dry/mask-reviews/
 *                  [--model <id>]          default claude-opus-4-7[1m]
 *                  [--dry-run]             render prompt + sizes, don't call the model
 *   mask --list                            list available personas
 *   mask --resume <session-slug>           resume a saved REPL session  (v2)
 *   mask --help
 *
 * See: docs/superpowers/specs/2026-04-27-the-mask-game.md
 */

const path = require('path');
const fs = require('fs');

function parseArgs(argv) {
  const args = { positional: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { args.flags.help = true; continue; }
    if (a === '--list') { args.flags.list = true; continue; }
    if (a === '--dry-run') { args.flags.dryRun = true; continue; }
    if (a === '--review') { args.flags.review = argv[++i]; continue; }
    if (a === '--output') { args.flags.output = argv[++i]; continue; }
    if (a === '--model') { args.flags.model = argv[++i]; continue; }
    if (a === '--resume') { args.flags.resume = argv[++i]; continue; }
    if (a.startsWith('--')) {
      args.flags[a.slice(2)] = (argv[i + 1] && !argv[i + 1].startsWith('--')) ? argv[++i] : true;
      continue;
    }
    args.positional.push(a);
  }
  return args;
}

function printHelp() {
  process.stdout.write(`mask — talk to a real person about something you're about to ship.

Usage:
  mask <slug>                            interactive REPL with persona <slug>
  mask <slug> --review <target>          one-shot structured critique
                 [--output <path>]       file or directory (default: ~/.tumble-dry/mask-reviews/)
                 [--model <id>]          default: claude-opus-4-7[1m]
                 [--dry-run]             render prompt + sizes, don't call the model
  mask --list                            list available personas
  mask --resume <session-slug>           resume a saved REPL session
  mask --help

Personas live at personas/real-people/<slug>.md.
Spec: docs/superpowers/specs/2026-04-27-the-mask-game.md
`);
}

async function main(argv) {
  const args = parseArgs(argv);
  if (args.flags.help) { printHelp(); return 0; }

  if (args.flags.list) {
    const { listBriefs } = require('./brief-loader.cjs');
    const briefs = listBriefs();
    if (!briefs.length) { process.stderr.write('No personas in personas/real-people/\n'); return 0; }
    const w = (s, n) => String(s || '').padEnd(n).slice(0, n);
    process.stdout.write(`${w('SLUG', 18)} ${w('NAME', 22)} ${w('STATUS', 8)} ${w('LAST_VALIDATED', 16)} DOMAIN\n`);
    for (const b of briefs) {
      process.stdout.write(`${w(b.slug, 18)} ${w(b.name, 22)} ${w(b.status, 8)} ${w(b.last_validated, 16)} ${b.domain}\n`);
    }
    return 0;
  }

  if (args.flags.resume) {
    process.stderr.write('mask: --resume not yet implemented (REPL pass 2). See spec.\n');
    return 2;
  }

  const slug = args.positional[0];
  if (!slug) { printHelp(); return 1; }

  if (args.flags.review) {
    const { runReview } = require('./one-shot.cjs');
    try {
      const result = await runReview({
        slug,
        target: args.flags.review,
        outputPath: args.flags.output,
        model: args.flags.model,
        dryRun: args.flags.dryRun,
      });
      if (args.flags.dryRun) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      return 0;
    } catch (err) {
      process.stderr.write(`mask: ${err.message}\n`);
      return 1;
    }
  }

  // Default: REPL.
  const { runRepl } = require('./repl.cjs');
  try {
    await runRepl({ slug, model: args.flags.model });
    return 0;
  } catch (err) {
    process.stderr.write(`mask: ${err.message}\n`);
    return 1;
  }
}

if (require.main === module) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code || 0),
    (err) => { process.stderr.write(`mask: ${err.stack || err.message}\n`); process.exit(1); }
  );
}

module.exports = { main, parseArgs };
