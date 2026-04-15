# Example — office-format polish

This example documents how to point tumble-dry at a Microsoft Office / PDF artifact and what to expect end-to-end. No binary fixtures are checked in — office files are always user-supplied (often contain private content, fonts, embedded media).

## Supported formats

| Extension            | Loader                                     | Boundary markers preserved |
| -------------------- | ------------------------------------------ | -------------------------- |
| `.docx`              | `mammoth` → HTML → `turndown` → markdown   | headings                   |
| `.pptx`              | `officeparser` (unified AST)               | `<!-- slide:N -->`         |
| `.xlsx`              | `officeparser` (unified AST)               | `<!-- sheet:Name -->`      |
| `.pdf`               | `officeparser` primary, `unpdf` fallback   | `<!-- page:N -->`          |

`xlsx` (SheetJS) and `pdf-parse` are **NOT** used — stale CVE / abandoned. See `.planning/research/STACK.md` §What NOT to use.

## Install optional deps once

```bash
cd ~/Source/tumble-dry
npm install       # pulls in mammoth, turndown, officeparser, unpdf (optionalDependencies)
```

Markdown-only users can skip `npm install` entirely — the loader returns `{ok:false, reason:"unsupported", detail: "<install hint>"}` with an actionable message if an office format is passed without its deps present.

## Run it

```bash
# Headless (CI / scripting):
node ~/Source/tumble-dry/bin/tumble-dry-loop.cjs slides.pptx

# Claude Code-native (preferred — no API key):
/tumble-dry slides.pptx
```

## What happens

1. **Loader dispatch.** `lib/loader.cjs` sniffs the extension, picks the right converter, writes:
   - `.tumble-dry/slides-pptx/working.md` — markdown projection with `<!-- slide:N -->` boundary markers above each slide's `## Slide N — <title>` heading.
   - `.tumble-dry/slides-pptx/history/round-0-original.pptx` — **byte-for-byte copy of the source** (FORMAT-03). The source file at its original path is never modified.
   - `.tumble-dry/slides-pptx/source-format.json` — loader metadata (`{format: "pptx", loader: "officeparser", warnings: [...]}`)
   - `.tumble-dry/slides-pptx/ROUNDTRIP_WARNING.md` — emitted **before round 1** (FORMAT-04), not just at finalize. Reminds you that FINAL.md ships as markdown; you must manually re-apply to the binary source.

2. **Slash command surfaces the warning.** The `/tumble-dry` orchestrator prints the `ROUNDTRIP_WARNING.md` contents to the chat before starting round 1, so you see it in-context.

3. **Convergence loop runs normally.** Reviewers see the markdown projection with boundary markers intact. The aggregator uses those markers as dedup anchors (HARDEN-03) — "slide 4 missing speaker notes" from reviewer A and "the slide-4 segment has no narrative glue" from reviewer B cluster together because both point at `<!-- slide:4 -->`.

4. **FINAL.md ships as markdown.** Tumble-dry **does not** regenerate the source `.pptx` — automatic roundtrip to binary formats is explicitly out of scope through v0.6 (lossy; see ROUNDTRIP-01 in `.planning/REQUIREMENTS.md` §v2 deferred).

## Manual re-apply

`polish-log.md` ends with a pointer to the original file and a reminder:

> Source was `slides.pptx`. FINAL.md is markdown — re-apply the edits manually in PowerPoint (copy-paste slide-by-slide; boundary markers `<!-- slide:N -->` map to the N-th slide).

For large decks, the common flow is:
- Open the original `.pptx` in PowerPoint/Keynote.
- Open `FINAL.md` side-by-side.
- For each `<!-- slide:N -->` block, paste the revised bullets into slide N. Don't regenerate — you'd lose layout, fonts, embedded assets.

## Failure modes the loader handles gracefully

All loaders return the typed-result contract: `{ok:true, markdown, format, warnings[]}` or `{ok:false, reason, detail}`. Callers branch on `ok`, never throw.

| `reason`       | Trigger                                            | What to do                                  |
| -------------- | -------------------------------------------------- | ------------------------------------------- |
| `encrypted`    | Password-protected docx/pdf                        | Remove the password, re-save, retry         |
| `corrupt`      | Malformed zip / missing XML parts                  | Re-save from source app                     |
| `unsupported`  | Extension recognized, deps missing                 | `npm install` in the plugin home            |
| `empty`        | 0-byte file or no extractable text                 | Check source has text (not just images)     |
| `too_large`    | >20MB (soft cap; >5MB forks to child process)      | Split the file, or pass `--force-large`     |

Encoding invariants (FORMAT-07): UTF-8 default, BOM stripped, CJK / RTL / curly quotes / emoji preserved through the projection. Test fixtures live in `tests/fixtures/format/`.

## Related

- `tests/format.test.cjs` — 15 smoke tests covering the loader contract, boundary markers, round-0 snapshot, ROUNDTRIP_WARNING emission, graceful degradation without deps.
- `lib/loader.cjs` — dispatcher.
- `lib/loaders/{md,docx,pptx,xlsx,pdf,pandoc}.cjs` — per-format implementations.
