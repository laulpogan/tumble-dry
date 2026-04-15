# Phase 4: FORMAT (v0.5.2) - Context

**Mode:** Auto-generated

<domain>
## Phase Boundary
Office format ingestion: `.docx`, `.pptx`, `.xlsx`, `.pdf`, `.md`/`.txt` direct, pandoc fallback. Source binary preserved; FINAL.md is markdown projection. No automatic roundtrip (out of scope).

FORMAT-01..07 in REQUIREMENTS.md.
</domain>

<decisions>
- Stack: `mammoth` + `turndown` (.docx), `officeparser` unified (.pptx/.xlsx/.pdf), `unpdf` ESM fallback (PDF). NOT `xlsx` (CVE) NOT `pdf-parse` (abandoned). Per STACK.md.
- `package.json` introduced this phase; deps as `optionalDependencies`.
- Loaders return typed result `{ok:true, markdown, format, warnings[]} | {ok:false, reason, detail}`.
- HTML-comment boundary markers preserved (`<!-- slide:N -->`, `<!-- sheet:Name -->`, `<!-- page:N -->`).
- ROUNDTRIP_WARNING.md emitted at load time.
- `lib/loaders/` directory; one module per format.
</decisions>

<code_context>
- `lib/run-state.cjs::initRun` currently copies source verbatim → `working.md`. Must be intercepted to call loader first.
- Existing markdown polish path must continue working unchanged when source is `.md`.
- Loader is called only at init / resume, never per-round.
</code_context>
