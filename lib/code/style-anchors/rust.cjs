/**
 * Rust style anchor — Rust API Guidelines + rustfmt canon.
 */
module.exports = {
  name: 'Rust API Guidelines + rustfmt',
  summary:
    'rustfmt-shaped code, Result<T, E> for fallible operations, ownership-first design, traits for abstraction, clippy-clean by default.',
  do: [
    'Run `cargo fmt` — assume the file is already formatted.',
    'Assume `cargo clippy` clean — do not flag lints clippy would catch.',
    'Return `Result<T, E>` for fallible operations; reserve `panic!` for unrecoverable invariant violations.',
    'Name getters without `get_` prefix (C-GETTER): `self.name()`, not `self.get_name()`.',
    'Implement `Debug` for all public types; `Display` when user-facing.',
    'Use `?` operator for error propagation; chain with `.context()` (anyhow/thiserror) when adding info.',
    'Document panics, errors, and safety invariants in doc comments (`/// # Panics`, `/// # Errors`, `/// # Safety`).',
    'Accept `&str` when you only read; accept `String` only when you take ownership.',
  ],
  dont: [
    '`.unwrap()` / `.expect()` in library code except in proven-infallible contexts.',
    '`unsafe` without a `/// # Safety` block explaining the invariants the caller must uphold.',
    'Re-exporting dependencies unintentionally — pin your public API surface.',
    'Clone-everywhere — use references or `Cow<str>` when ownership is unclear.',
    'Trait objects (`Box<dyn Trait>`) when generic monomorphization is cheap and more type-safe.',
  ],
  references: [
    'https://rust-lang.github.io/api-guidelines/',
    'https://doc.rust-lang.org/1.0.0/style/',
    'https://rust-lang.github.io/rust-clippy/master/',
  ],
  markdown() {
    return [
      '## Style anchor: Rust (API Guidelines)',
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
