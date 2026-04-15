/**
 * Go style anchor — Effective Go + gofmt canon.
 */
module.exports = {
  name: 'Effective Go + gofmt',
  summary:
    'gofmt-shaped code, explicit error handling, short package-local names, receiver-method consistency, composition over inheritance.',
  do: [
    'Run `gofmt` / `goimports` — assume the file is already formatted.',
    'Return errors; do not panic across package boundaries.',
    'Package comments start with the package name. Exported identifiers have doc comments that begin with the identifier.',
    'Short receiver names (`p *Page`, not `page *Page`).',
    'Prefer `range` over indexed loops when the index is unused.',
    'Accept interfaces, return concrete types.',
    'Use `errors.Is` / `errors.As` for error inspection; wrap with `fmt.Errorf("...: %w", err)`.',
    'Goroutine ownership: whoever starts a goroutine is responsible for stopping it.',
  ],
  dont: [
    'Silently ignore errors (`_ = someCall()` unless documented).',
    'Stutter in names (`http.HTTPClient`) — use `http.Client`.',
    'Use getters prefixed with `Get` — just use the field name (`Owner()` not `GetOwner()`).',
    'Use `panic` for ordinary error conditions.',
    'Share mutable state across goroutines without a mutex or channel.',
  ],
  references: [
    'https://go.dev/doc/effective_go',
    'https://google.github.io/styleguide/go/',
    'https://github.com/golang/go/wiki/CodeReviewComments',
  ],
  markdown() {
    return [
      '## Style anchor: Go (Effective Go)',
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
