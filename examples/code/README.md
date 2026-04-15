# Example — code polish

This example documents how to point tumble-dry at a source file or directory, what the code-aware mode changes, and what a small refactor review looks like end-to-end.

## Detection

Tumble-dry detects code via `linguist-js` (extension + content heuristics) with a shebang fallback for extension-less scripts. For a directory, any of:

- `package.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`
- ≥3 files with recognized programming extensions

triggers code mode. Detector contract: `{primary: lang, regions: [{lang, range}], confidence}` — polyglot artifacts (`.ipynb` cells, `.html` with embedded JS/CSS, shell heredocs) are detected but the AST drift report processes only the primary language.

## Run it

```bash
# Single file:
/tumble-dry src/auth/session.js

# Directory (detects via package.json):
/tumble-dry --panel-size 5 src/auth/

# Headless:
node bin/tumble-dry-loop.cjs --panel-size 5 src/auth/
```

## What changes in code mode

| Concern            | Prose mode                             | Code mode                                                                                           |
| ------------------ | -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Editor agent       | `agents/editor.md`                     | `agents/editor-code.md` (voice excerpts replaced with language style anchor)                        |
| Style reference    | Author's past-writing voice excerpts   | PEP 8 (Python) / Effective Go / Rust API Guidelines / JS Standard / generic default                 |
| Reviewer panel     | Audience-inferred personas             | Code-review panel (staff eng, security, on-call SRE, **new-hire-in-6-months**, hostile-fork)        |
| Reviewer floor     | "What would this audience say?"        | `do NOT flag issues a linter would catch — assume linter-clean input`                               |
| Drift report       | `lib/voice.cjs` sentence-level diff    | `lib/code/ast-drift.cjs` — `web-tree-sitter` WASM per-symbol taxonomy                               |
| Drift taxonomy     | `unchanged / modified / inserted / deleted` | `unchanged / renamed / moved / modified / signature_changed / added / removed / reformatted`   |
| Redraft gate       | Drift-threshold BLOCKS convergence     | (1) parseability (`hasError`-tree → reject), (2) `verify_cmd` (tests), (3) signature-change flags   |

**Signature changes on public API are a permanent `STRUCTURAL:` flag** — they can never silently auto-converge. A signature change is "I renamed a public function or changed its parameter list." The loop will keep flagging it every round until either the reviewers accept it (material finding resolved) or the editor reverts it.

## Worked example — a small deliberately-bad function

Pretend `before.js` is the source file you feed in:

```javascript
// before.js
function getUser(id) {
  return users.find(u => u.id == id);   // loose equality, no null check, no await
}

module.exports = { getUser };
```

What each reviewer persona catches (illustrative — actual output depends on real panel):

- **Staff eng (Miriam Okafor):** `users` is a free variable — where does it come from? If it's module-local mutable state, `getUser` is non-deterministic across test runs.
- **Security (Dev Patel):** `id == id` — loose equality lets `"1" == 1` succeed. Input coercion on user IDs is how IDOR bugs land.
- **New-hire-in-6-months (Yuki Tanaka):** `getUser` doesn't say what happens when the id isn't found. Returns `undefined`? Throws? I'd have to read every call site to know.
- **Hostile-fork reviewer:** This function is trivially forkable as `getUserStrict` / `getUserOrNull` / `getUserAsync`. No cohesion; ripe for bikeshedding.

The aggregator clusters these into a material finding: *"`getUser` has no null-contract, uses loose equality, and depends on free-variable state."* Reviewers **do not** flag "missing semicolon" or "prefer arrow function" — those are linter-catchable and explicitly excluded.

The editor redrafts to (roughly):

```javascript
// after.js (redraft)
/**
 * Find a user by id. Returns null if not found; throws on malformed input.
 * @param {string} id  non-empty user id
 * @returns {User|null}
 */
function getUser(users, id) {
  if (typeof id !== 'string' || id.length === 0) {
    throw new TypeError('getUser: id must be a non-empty string');
  }
  return users.find(u => u.id === id) ?? null;
}

module.exports = { getUser };
```

### What the AST drift report says

```json
{
  "backend": "tree-sitter",
  "drift_score": 0.62,
  "signature_changed_count": 1,
  "counts": { "unchanged": 0, "signature_changed": 1, "modified": 0, "added": 0, "removed": 0 },
  "symbols": [
    {
      "name": "getUser",
      "classification": "signature_changed",
      "before": { "params": ["id"] },
      "after":  { "params": ["users", "id"] },
      "structural_flag": "STRUCTURAL: public-signature-changed — getUser(id) → getUser(users, id)"
    }
  ],
  "parse_check": { "ok": true }
}
```

Because `signature_changed_count > 0`, the aggregator hoists a `⚠ Structural alert` to the top of `aggregate.md` for round N+1 — the orchestrator cannot silently converge while this flag is live. Either:

- Reviewers in round N+1 accept the new signature (material finding count drops below threshold → converge), **or**
- Editor reverts to the original signature in round N+1 (signature_changed drops to 0), **or**
- Max rounds hit and the loop finalizes with the flag still in `polish-log.md` as a permanent structural warning.

### `verify_cmd` gate

If your project has a `package.json` with a `test` script, tumble-dry runs `npm test -- --run` against the staged redraft before applying it. Override in `.tumble-dry.yml`:

```yaml
verify_cmd: "cargo test --quiet"
```

Or for Python:

```yaml
verify_cmd: "pytest -x tests/"
```

Non-zero exit → redraft rejected, `working.md` unchanged, `redraft-rejected.md` written with the reason, next round's reviewers see the rejection in `aggregate.md`.

## Limitations (v0.6.0)

- Single-language files and directories are well supported. Polyglot files (HTML with embedded JS, Markdown with fenced code, shell with language heredocs) are **detected** but AST drift only processes the primary language.
- Large files (>512KB per file in directory mode; >20MB total projection) are excluded with a warning.
- Only `tree-sitter-javascript` ships in `optionalDependencies`. For Python / Go / Rust / TypeScript AST drift, install the grammar yourself:

  ```bash
  npm install --no-save tree-sitter-python tree-sitter-go tree-sitter-rust tree-sitter-typescript
  ```

  Missing grammars degrade gracefully to `lib/voice.cjs::voiceDriftReport` sentence diff — you still get a drift number, just not the per-symbol taxonomy.

- Static analysis (lint, type-check) is the user's job. Tumble-dry reviews **what a person would flag**, not what a linter already catches.

## Related

- `tests/code.test.cjs` — 19 smoke tests covering language detection, AST drift, editor-code brief, verify_cmd, parseability gate.
- `agents/editor-code.md` — code-mode editor agent.
- `lib/code/ast-drift.cjs` — AST drift implementation.
- `lib/code/style-anchors/` — language-specific style anchor texts.
- `personas/library.md` §Code-review panel (PERSONA-06) — panel definitions.
