/**
 * Default style anchor — language-agnostic fallback.
 * Used when an artifact's language has no dedicated anchor module.
 */
module.exports = {
  name: 'Generic code style',
  summary:
    'Follow the project\'s existing conventions. Consistent naming, small well-named functions, explicit error handling, no speculative abstraction.',
  do: [
    'Match the surrounding file\'s indent, quote style, and naming conventions.',
    'Prefer clarity over cleverness — if a comment is needed to explain a line, rewrite the line.',
    'Handle errors at the boundary they matter; don\'t `catch (_) {}` silently.',
    'Name things by what they do or represent, not how they\'re implemented.',
    'Keep functions short enough that their purpose fits in a one-line comment.',
  ],
  dont: [
    'Introduce dependencies without justification.',
    'Add speculative abstractions (`_base_`, `_abstract_`, single-use factories) without a concrete second use case.',
    'Hide failure modes in catch-all handlers.',
    'Use magic numbers — name constants.',
    'Commit commented-out code.',
  ],
  references: [],
  markdown() {
    return [
      '## Style anchor: Generic',
      '',
      `**Summary:** ${this.summary}`,
      '',
      '**Do:**',
      ...this.do.map(d => `- ${d}`),
      '',
      '**Do NOT:**',
      ...this.dont.map(d => `- ${d}`),
      '',
    ].join('\n');
  },
};
