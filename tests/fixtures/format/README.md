# tumble-dry format test fixtures

This directory holds tiny fixtures for `tests/format.test.cjs`.

## Included (text-only, committed)

- `sample.md` — plain markdown identity-load check
- `cjk.txt` — UTF-8 encoding (Japanese + Chinese + Korean)
- `emoji.md` — multi-codepoint emoji + ZWJ sequences
- `bom.md` — starts with UTF-8 BOM; loader must strip

## Binary fixtures (NOT committed — add locally if needed)

Binary fixtures for `.docx` / `.pptx` / `.xlsx` / `.pdf` are intentionally
omitted from the repo. To add local binary fixtures for dev testing:

```bash
# Generate a trivial docx via pandoc (if installed):
pandoc -o sample.docx <<< "# Title\n\nParagraph with **bold** and *italic*."

# Or copy a real one in:
cp ~/somedoc.docx tests/fixtures/format/sample.docx
```

The existing tests in `tests/format.test.cjs` skip binary-format branches when
the corresponding file is absent and print `[skip: no fixture]`. This keeps
CI green without shipping binary blobs through git.

## Encoding guarantees (FORMAT-07)

Every loader must preserve CJK, RTL, emoji, and curly-quotes byte-for-byte
in the markdown projection. If you add a fixture that exercises a new script
or codepoint range, add a matching assertion in `tests/format.test.cjs`.
