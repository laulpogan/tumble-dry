# Phase 5: CODE (v0.6.0) - Context

**Mode:** Auto-generated

<domain>
## Phase Boundary
Code as first-class artifact: language detection, AST-aware drift, language-specific style anchors, code-review persona invocation, verify_cmd gate.

CODE-01..07 in REQUIREMENTS.md.
</domain>

<decisions>
- `web-tree-sitter` (WASM) NOT native tree-sitter. Per STACK.md (native breaks Windows + ARM).
- `linguist-js` for language detection (extension + content heuristics).
- Drift taxonomy: `unchanged | renamed | moved | modified | signature_changed | added | removed | reformatted`. Signature changes on public API are permanent structural flag.
- `editor-code.md` separate agent from `editor.md` (per ARCHITECTURE.md Q4).
- Reviewer.md branches on artifact_kind (NOT separate file).
- verify_cmd config hook: editor redraft must pass before convergence allowed.
- Language fallback: extension + shebang only when WASM grammar absent.
- Style anchors per language: PEP 8 (Python), Effective Go (Go), Rust API guidelines, JS Standard. Default fall-through.
- personas/library.md already has Code review section from Phase 2.
</decisions>

<code_context>
- `lib/loader.cjs` from Phase 4 — extend to detect "code directory" mode (multiple files vs single file).
- `lib/voice.cjs::voiceDriftReport` — keep for prose; add separate `lib/code/ast-drift.cjs` for code mode.
- `lib/reviewer-brief.cjs` — extend to swap voice excerpts for style anchors when artifact is code.
- `agents/editor.md` — keep as prose editor; new `agents/editor-code.md`.
- `bin/tumble-dry.cjs init` and `lib/run-state.cjs::initRun` — detect code via linguist-js, set `source_kind: 'code'` in metadata.
</code_context>
