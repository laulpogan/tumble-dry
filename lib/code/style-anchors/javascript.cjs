/**
 * JavaScript style anchor — JavaScript Standard Style + modern idioms.
 */
module.exports = {
  name: 'JavaScript Standard Style',
  summary:
    '2-space indent, no semicolons (or consistent semicolon use — pick one), const/let never var, async/await over .then chains, early returns.',
  do: [
    '`const` by default; `let` only when reassignment is required.',
    'Arrow functions for callbacks; named function declarations for top-level definitions (better stack traces).',
    'Prefer `async`/`await` over `.then()` chains; always handle rejections.',
    'Use `===` / `!==` — triple equals.',
    'Destructure function parameters and imports.',
    'Early return to flatten nesting; avoid `else` after `return`.',
    'Document public APIs with JSDoc; include `@param` and `@returns`.',
  ],
  dont: [
    '`var` — always `const` or `let`.',
    'Silent Promise rejections — every async path must be awaited or `.catch()`ed.',
    'Mutate function parameters.',
    'Ignore `no-unused-vars` — remove them. A linter catches these; we assume linter-clean.',
    'Use `== null` checks except the deliberate "null or undefined" pattern.',
    'Reassign imported bindings.',
  ],
  references: [
    'https://standardjs.com/rules.html',
    'https://github.com/airbnb/javascript',
    'https://google.github.io/styleguide/jsguide.html',
  ],
  markdown() {
    return [
      '## Style anchor: JavaScript (Standard Style)',
      '',
      `**Summary:** ${this.summary}`,
      '',
      '**Do:**',
      ...this.do.map(d => `- ${d}`),
      '',
      '**Do NOT:**',
      ...this.dont.map(d => `- ${d}`),
      '',
      '**References:** ' + this.references.join(', '),
      '',
    ].join('\n');
  },
};
