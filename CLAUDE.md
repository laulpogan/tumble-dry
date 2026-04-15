<!-- GSD:project-start source:PROJECT.md -->
## Project

**tumble-dry**

An open-source convergence-loop content polisher: it dispatches a panel of in-character reviewer personas at any written artifact (docs, copy, decks, financial models, code), aggregates their critique, redrafts in the author's own voice, and repeats until reviewers stop finding material problems. Ships as a Claude Code plugin (`/tumble-dry`) with an opt-in headless Node CLI for CI/scripting.

**Core Value:** A solo author can simulate publishing-day pushback in 5–15 minutes per round and ship a piece that has already been stress-tested by the people they actually fear — without burning real users, real money, or real reputation.

### Constraints

- **Tech stack**: Pure Node.js (no transpile, no bundler), no `package.json` (intentional — keeps install to a single `git clone`). Adding office-format loaders in v0.5.2 will require introducing `package.json` + `node_modules` for `mammoth`, `xlsx`, `pdf-parse`. Trade-off accepted.
- **Auth**: v0.5.0 must work with zero API-key setup (Claude Code session inheritance). Headless CLI keeps requiring `ANTHROPIC_API_KEY` — that's its raison d'être.
- **Non-destructive**: Source files are NEVER modified. Working copy + per-round history under `.tumble-dry/<slug>/`. This invariant predates the project and is non-negotiable.
- **Voice**: When `voice_refs` is empty (the common case), self-sample from the source. Editor brief explicitly told to preserve source voice, not impose generic editorial tone.
- **Plugin distribution**: Must work as a Claude Code plugin AND a standalone clone AND a git submodule AND via the SlanchaAi marketplace. Path resolution is hard; keep `commands/tumble-dry.md` flexible.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## TL;DR
## Recommended Stack
### Dimension 1 — Claude Code plugin authoring (v0.5.0, DISPATCH-01/02/03)
| Component | Version / Spec | Purpose | Why |
|---|---|---|---|
| `.claude-plugin/plugin.json` | schema per plugins-reference | Plugin manifest — currently MISSING from tumble-dry | Required for plugin to register under namespace. `marketplace.json` alone is insufficient; it only describes catalog entries, not the plugin itself. |
| `.claude-plugin/marketplace.json` | schema per plugin-marketplaces | Marketplace catalog | **Current location at repo root is wrong.** Must be under `.claude-plugin/` subdirectory. SlanchaAi marketplace may be tolerating this via a relative-path quirk; Anthropic spec says `.claude-plugin/marketplace.json`. |
| `agents/*.md` frontmatter | `name`, `description`, `model`, `tools`, `disallowedTools`, `maxTurns`, `skills`, `isolation` (plugin agents ONLY) | Subagent definitions | Plugin-shipped agents **cannot** declare `hooks`, `mcpServers`, or `permissionMode` — these are stripped for security. Current `agents/*.md` look right but names should drop the `tumble-dry-` prefix (namespacing is automatic). |
| `commands/tumble-dry.md` | frontmatter: `description`, `argument-hint` | Slash command | Existing file is already correct shape. `commands/` is legacy-but-supported; `skills/` is the new recommended path but migration is not required and `commands/` keeps the existing `/tumble-dry` invocation working. |
| Task / Agent tool | invoked from slash command body via prose ("Use the Agent tool to dispatch ...") | Parallel subagent dispatch | As of Claude Code v2.1.63, `Task` was renamed to `Agent`. Both names work (aliased). **Critical:** subagents cannot spawn subagents — fan-out must happen from the slash command prose (which runs in the main thread), not a single dispatcher subagent. |
| Anthropic SDK (current path) | `@anthropic-ai/sdk@^0.40.x` if replacing `lib/dispatch-api.cjs` | Headless CLI backend | Current `lib/dispatch-api.cjs` uses raw `https` — works fine, no urgent need to swap. Consider replacing **only** if extended-thinking or prompt-caching header shape changes again. Retain as-is for v0.5.0; visit in v0.6+. |
- **Manifest is now at `.claude-plugin/plugin.json`**, not root. Tumble-dry's current flat `marketplace.json` at root will load under the SlanchaAi marketplace (which supplies its own `.claude-plugin/marketplace.json` pointing to this repo) but **not** in a direct `--plugin-dir` install. Fix this in v0.5.0.
- **Namespace auto-prefix.** A plugin named `tumble-dry` with an agent named `audience-inferrer` is invoked as `@agent-tumble-dry:audience-inferrer`. Do **not** include `tumble-dry-` in the agent's own `name` field — that produces `tumble-dry:tumble-dry-audience-inferrer`.
- **`model` field on agents accepts** `sonnet`, `opus`, `haiku`, full IDs like `claude-opus-4-6`, or `inherit`. Default is `inherit`. Set `model: opus` on audience-inferrer + editor; `model: sonnet` on reviewer + assumption-auditor (matches existing dispatch-api.cjs logic).
- **`tools` is a comma-separated string OR YAML list.** `tools: Read, Grep, Glob` works. For reviewers/auditor/audience-inferrer in the plugin context, they only need `Read` + `Write` (to emit their deliverable); deny Bash, Edit by omitting them.
- **No `permissionMode` in plugin agents.** Since plugin subagents can't set permissionMode, the slash command cannot rely on `bypassPermissions` — if you need agents to write files without prompting, do it via `permissions.allow` in plugin `settings.json` or the user's project settings. Safer path: agents return markdown text in their response, and the slash-command prose writes the file.
- **`isolation: worktree`** is supported and useful for the code-mode reviewers in v0.6.0 (each reviewer gets its own repo copy; can run static analysis without stomping). Enable only for code artifacts.
- **`maxTurns`** caps runaway agents. Recommended: `maxTurns: 3` for reviewers (read → think → emit), `maxTurns: 5` for editor.
- **Skills preloading (`skills: [...]`)** injects skill content into the subagent at startup. Useful for code-mode: preload PEP-8 / Effective-Go skills into code reviewers.
### Dimension 2 — Office format ingestion (v0.5.2, FORMAT-01/02/03)
| Library | Version | Purpose | Why |
|---|---|---|---|
| `mammoth` | `^1.12.0` | .docx → HTML | De-facto standard. Actively maintained (last publish ~1 month ago as of 2026-04). Handles Word styles, tables, images, footnotes. **Only convert to HTML, not markdown** — mammoth's built-in markdown output is deprecated by its author. |
| `turndown` | `^7.2.x` | HTML → markdown (pair with mammoth) | Standard HTML→MD converter. Pair with `@joplin/turndown-plugin-gfm` for table support. |
| `officeparser` | `^6.0.7` | .pptx, .xlsx, .pdf, .odt, .odp, .ods, .rtf → AST | Robust, strictly-typed, actively maintained (publish ~18 days ago as of 2026-04). Produces hierarchical AST with metadata + formatting + attachments. **One library covers four of the five formats** we need, which kills dependency sprawl. |
| `unpdf` | `^0.12.x` | PDF text+metadata fallback | Modern replacement for abandoned pdf-parse. Edge-runtime compatible (irrelevant here, but signal of active maintenance). Use when `officeparser` PDF handling is insufficient for a specific doc. |
| `pandoc` (external binary) | `>=3.x` via spawn | Catch-all fallback for unknown formats (.odt from LibreOffice, .epub, .tex, etc.) | Matches PROJECT.md FORMAT-01 plan. Detect via `which pandoc` at loader init; degrade gracefully with a clear error if absent. Not a node dep. |
- `.docx`: mammoth HTML → turndown markdown. Page breaks are unreliable in DOCX; don't try. H1/H2/H3 preserved natively. Tables preserved via turndown-gfm.
- `.pptx`: officeparser AST walked to produce `## Slide N` headers per slide + speaker-notes as blockquote. This matches FORMAT-02's "preserving slide boundaries" requirement.
- `.xlsx`: officeparser AST walked to produce `## Sheet: <name>` headers + GitHub-flavored-markdown table per sheet. Truncate at a size threshold (e.g., 500 rows × 20 cols) and append a "… truncated N rows" line — reviewers don't need to stress-test 10,000-row raw data.
- `.pdf`: officeparser as primary; if extraction yields <10 chars per page on average (likely a scanned PDF), fall back to `unpdf` and if that also fails, emit a `STRUCTURAL:` note in the working copy saying "this PDF appears to be image-only; tumble-dry cannot review it."
### Dimension 3 — Code-aware features (v0.6.0, CODE-01/02/03/04)
| Library | Version | Purpose | Why |
|---|---|---|---|
| `web-tree-sitter` | `^0.25.x` | Tree-sitter via WASM | **Do not use native `tree-sitter`** (aka `node-tree-sitter`) — it requires node-gyp, a C toolchain at install time, and rebuilds on Electron/Node upgrades. The WASM version has a tiny performance penalty (negligible at the file sizes we review) and installs as pure WASM bytes. Distribution cost matters more than 10% parse speed for a polish tool. |
| `tree-sitter-<lang>` (per-grammar WASM packages) | latest | Grammar WASM files | Ship one WASM per supported language. Starter set: JS/TS, Python, Go, Rust, Ruby, Java, C/C++, Bash. ~50KB–300KB per grammar WASM. Load on-demand based on detected language. |
| `linguist-js` | `^2.x` | Extension → language mapping | Derived from GitHub's `Linguist` YAML, which is the gold standard for "what language is this file?" by extension + filename patterns. Zero ML, zero training, just a lookup table. |
| (none) | — | Language detection by content | Skip this. PROJECT.md CODE-01 mentions "extension + shebang + tree-sitter" — that's sufficient. Adding `guesslang-js` (TF.js-based) introduces a ~10MB ML model and the marginal value is ~1% of real-world files (extension-less, no shebang). Emit a warning and fall back to "treat as plaintext" for those. |
- Tokenize both before/after working copies with the detected language's tree-sitter grammar.
- Walk the tree in parallel and classify at the **named-symbol level** (function definitions, class declarations, top-level const/let) instead of sentence level: `unchanged | modified | inserted | deleted | renamed`.
- Skip comments from drift scoring (comments are paraphraseable; code is not).
- Report drift as "N of M top-level definitions modified" plus a per-function diff table. This is far more meaningful for code than the existing sentence-based drift.
- Ship per-language style-anchor SKILL.md files under `agents/styles/` (or as `skills/` if migrating):
- Editor brief loads the matching style via the `skills` frontmatter field (preload) when detected language matches.
- Replaces voice-excerpt sampling for code artifacts (voice preservation doesn't apply to code).
## Installation
# v0.5.0 — no new deps (pure plugin restructure)
# Just create .claude-plugin/ directory and move files:
#   marketplace.json         → .claude-plugin/marketplace.json
#   (create new)             → .claude-plugin/plugin.json
# v0.5.2 — introduce package.json
# v0.6.0 — code-aware features
# Add more grammars as needed; each is ~100KB WASM.
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|---|---|---|
| `mammoth` (docx) | `docx4js`, `@adobe/mammoth` fork | Don't. `mammoth` is the mainline, community-maintained canonical. Forks exist for niche fixes but the mainline ~1.12 covers everything we need. |
| `officeparser` (pptx/xlsx/pdf) | Separate libs: `node-pptx-parser` + `exceljs` + `unpdf` | Use separates if you need write capability (generating new .xlsx). We don't — FORMAT-03 explicitly says FINAL.md ships as markdown, no roundtrip. One library is simpler. |
| `unpdf` (PDF fallback) | `pdfjs-dist` directly | Use `pdfjs-dist` if you need annotations, form fields, or text positions (coordinates on page). We don't — we need text. `unpdf` wraps pdfjs-dist with a simpler API. |
| `web-tree-sitter` (WASM) | `tree-sitter` (native Node binding) | Use native if you're parsing 1M+ LOC per run and need the 10-30% speed boost. We're reviewing single-file artifacts. WASM wins on install friction. |
| `linguist-js` (extension-based detection) | `vscode-languagedetect` (ML, used by VSCode), `guesslang-js` | Use ML detection if users routinely paste extension-less code snippets. For a polish tool that takes a filepath, extension + shebang is sufficient. |
| HTML→MD via `turndown` | `remark` + `rehype` pipeline | Use the unified ecosystem if you're doing further markdown AST transformation (e.g., post-processing mammoth's output with a custom plugin). For a straight one-shot docx→md, turndown is 1/10 the dependencies. |
## What NOT to Use
| Avoid | Why | Use Instead |
|---|---|---|
| `xlsx` (SheetJS) from npm | SheetJS left npm in 2023. Latest npm version (`0.18.5`) is stale and has a known high-severity vulnerability. Official distribution is now via `cdn.sheetjs.com`, which requires `npm install https://cdn.sheetjs.com/xlsx-latest/xlsx-latest.tgz` — unusual for a Node dep, fragile for CI. | `officeparser` handles .xlsx as part of its unified AST. |
| `pdf-parse` | Functional but effectively unmaintained. Community actively migrating to `unpdf`. PROJECT.md currently names `pdf-parse` — update this in v0.5.2. | `officeparser` (primary) + `unpdf` (fallback). |
| Native `tree-sitter` (`node-tree-sitter`) | Requires C toolchain at `npm install` time. Fails silently on Windows, on musl Linux, on fresh macOS without Xcode. Needs rebuild on every Node/Electron version bump. For a plugin where installation must Just Work, this is a nonstarter. | `web-tree-sitter` (WASM). |
| `guesslang-js` / `vscode-languagedetect` | ML-based language detection ships a ~10MB TF.js model. For 1% of cases (extension-less files), that's a terrible tradeoff. | `linguist-js` + shebang sniff + fall-back-to-plaintext. |
| Mammoth's built-in markdown output | Deprecated by the library author. Known to produce less clean output than HTML→markdown two-step. | `mammoth.convertToHtml()` → `turndown`. |
| `officegen` | Generates office files (write-path), doesn't parse them. Not relevant here and often confused with parsers in blog posts. | N/A. |
| `node-docx` | Unrelated — generates .docx, doesn't parse. | N/A. |
| Custom OOXML XML parsing (per FORMAT-01 original plan for .pptx) | DIY OOXML parsing is a rabbit hole: `<p:sp>`, `<a:t>`, namespace handling, inheritance chains, rels resolution. Every `officeparser` feature is something you'd end up re-implementing. | `officeparser`. Revise FORMAT-01 accordingly. |
| Agent frontmatter `hooks` / `mcpServers` / `permissionMode` in plugin-shipped agents | Silently stripped by Claude Code loader for security. Documenting them in plugin agents is a bug waiting to mislead contributors. | If you need these, the agent must be a user/project agent (not plugin-shipped), OR configure via plugin `settings.json` / hooks directory. |
## Stack Patterns by Variant
- Use `linguist-js` to detect language from path
- Use `web-tree-sitter` + per-language grammar to build AST
- Load matching `styles/<language>.md` as preload skill on reviewer + editor agents
- Set `isolation: worktree` on reviewer agents so they can run linters/tests non-destructively
- Replace voice sampling entirely (code has no "voice")
- Use symbol-level drift metric, not sentence-level
- Skip language detection, skip tree-sitter
- Keep voice-sampling from source (CORE-05) or configured `voice_refs`
- Keep sentence-level drift
- Current behavior unchanged
- Convert to markdown working copy at init time
- Preserve structural boundaries (slide/sheet/page) as markdown headers
- Store original binary at `history/round-0-original.<ext>` (CORE-03 invariant)
- FINAL.md is markdown; `polish-log.md` tells user how to re-apply to binary source
- Slash command prose runs the loop (not a single dispatcher agent)
- Fan-out via `Agent(subagent_type=...)` from the slash command body
- No API key; inherits Claude Code session auth
- Reviewers run in parallel via multiple Agent calls in the same response
- Current `bin/tumble-dry-loop.cjs` + `lib/dispatch-api.cjs` unchanged
- Requires `ANTHROPIC_API_KEY`
- Used for CI/scripting
## Version Compatibility
| Package | Compatible With | Notes |
|---|---|---|
| `mammoth@^1.12` | Node `>=18`, ESM + CJS dual | Safe. |
| `officeparser@^6.0.7` | Node `>=18`, TypeScript types bundled | Safe. Strictly-typed — good for editor tooling even without TS adoption. |
| `unpdf@^0.12` | Node `>=18`, **ESM-only** | Must use dynamic `import()` from CJS or convert loader module to ESM. |
| `turndown@^7.2` | Node `>=14`, CJS + ESM | Safe. |
| `web-tree-sitter@^0.25` | Node `>=16`, WASM runtime baked in | No native compile. Each grammar WASM is a separate install. |
| `tree-sitter-<lang>` (grammar packages) | must match `web-tree-sitter` ABI version | Pin grammar versions; bumping `web-tree-sitter` sometimes requires bumping grammars. |
| `linguist-js@^2` | Node `>=14`, CJS + ESM | Safe. |
| Claude Code plugin spec | Claude Code `>=2.1.63` (when `Task` → `Agent` rename landed; both aliases work) | Tumble-dry should target current stable and document minimum Claude Code version in README. |
## Concrete Fix List for Current Repo (pre-v0.5.0)
## Sources
- `https://code.claude.com/docs/en/plugins` — plugin structure, `.claude-plugin/plugin.json` location, skills vs commands vs agents directories (HIGH confidence, fetched 2026-04-15)
- `https://code.claude.com/docs/en/sub-agents` — full subagent frontmatter spec, plugin-agent restrictions (`hooks`/`mcpServers`/`permissionMode` stripped), `Task` → `Agent` rename in v2.1.63, subagents-can't-spawn-subagents rule, model resolution order (HIGH)
- `https://code.claude.com/docs/en/plugin-marketplaces` — `marketplace.json` schema, plugin entry format, source types (HIGH)
- `https://code.claude.com/docs/en/plugins-reference` — complete plugin manifest schema, all component path fields, `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PLUGIN_DATA}` env vars, agent plugin restrictions (HIGH)
- [mammoth npm](https://www.npmjs.com/package/mammoth) — 1.12.0 latest, markdown output deprecated per maintainer (MEDIUM — via WebSearch summary, confirmed active)
- [officeparser npm](https://www.npmjs.com/package/officeparser) — 6.0.7, covers docx/pptx/xlsx/pdf/odt/odp/ods/rtf with AST (MEDIUM — WebSearch summary, GitHub readme quoted)
- [SheetJS migration issue #2667](https://github.com/SheetJS/sheetjs/issues/2667) + [BleepingComputer article](https://www.bleepingcomputer.com/news/software/npm-package-with-14m-weekly-downloads-ditches-npmjscom-for-own-cdn/) — SheetJS off npm, 0.18.5 stale with CVE (HIGH — primary sources)
- [unpdf vs pdf-parse vs pdfjs-dist 2026 comparison](https://www.pkgpulse.com/blog/unpdf-vs-pdf-parse-vs-pdfjs-dist-pdf-parsing-extraction-nodejs-2026) — pdf-parse unmaintained, unpdf is modern replacement (MEDIUM — single comparison article, corroborated by [unpdf GitHub](https://github.com/unjs/unpdf))
- [web-tree-sitter npm](https://www.npmjs.com/package/web-tree-sitter) + [Pulsar Edit "Modern Tree-sitter" post](https://blog.pulsar-edit.dev/posts/20240902-savetheclocktower-modern-tree-sitter-part-7/) — WASM vs native trade-off; WASM penalty now negligible; distribution dramatically easier (HIGH)
- [linguist-js on Socket](https://socket.dev/npm/category/server/text-processing/language-detection) / GitHub Linguist dataset — extension → language mapping (MEDIUM — well-known library but not directly verified via Context7)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:gastown-start source:gastown.sh -->
## Gastown Integration

Gastown multi-agent orchestration is active on this machine.

**Town root:** ~/gt
**Rig:** gastown (default)
**Mayor:** Run `gt mayor attach` to enter the coordination session

## Orientation

- Source `$HOME/.claude/get-shit-done/bin/lib/gastown.sh` to access GSD dispatch helpers
- Dispatch functions: `detect_gastown()`, `create_plan_bead()`, `dispatch_plan_to_polecat()`
- Polecat results are written to bead notes before worktree teardown
- Registry: `.planning/gastown.json` maps plan IDs to bead IDs

## Hook Sync Safety

`gt hooks sync` writes ONLY `.claude/settings.json` — it does NOT touch CLAUDE.md files.
GSD context injected into CLAUDE.md is safe from hook sync overwrites.
<!-- GSD:gastown-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
