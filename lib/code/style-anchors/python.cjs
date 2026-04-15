/**
 * Python style anchor — PEP 8 + modern idioms.
 */
module.exports = {
  name: 'PEP 8 + Python community idioms',
  summary:
    'PEP 8 formatting, PEP 257 docstrings, type hints where they clarify contracts, f-strings over .format(), context managers for resource handling.',
  do: [
    '4-space indent, lines ≤ 88 chars (Black-compatible).',
    'snake_case for functions/variables; PascalCase for classes; SCREAMING_SNAKE_CASE for constants.',
    'Use `with` statements for files, locks, and other resources.',
    'Type-annotate public function signatures and dataclasses.',
    'Prefer f-strings for interpolation; reserve % / .format() for i18n edge cases.',
    'Raise specific exceptions; catch specific exceptions.',
    'Use `is` / `is not` only for singletons (None, True, False).',
  ],
  dont: [
    'Mutable default arguments (`def f(x=[])`) — use `None` sentinel.',
    'Bare `except:` — catch specific exceptions.',
    'Star-imports (`from foo import *`) in non-__init__ files.',
    'Boolean comparison (`if x == True`) — just `if x`.',
    'Manual string concatenation in loops — use `.join()` or comprehensions.',
  ],
  references: [
    'https://peps.python.org/pep-0008/',
    'https://peps.python.org/pep-0257/',
    'https://peps.python.org/pep-0484/',
  ],
  markdown() {
    return [
      '## Style anchor: Python (PEP 8)',
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
