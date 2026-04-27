# Examples — `/mask`

This directory holds reference outputs of [`/mask`](../../docs/superpowers/specs/2026-04-27-the-mask-game.md).

## Privacy posture (read first)

These examples deliberately use the **fictional `template` persona** that ships with
the repo. **No example output uses a real named person** — that's a load-bearing
privacy choice, not an oversight. See
[`personas/real-people/README.md`](../../personas/real-people/README.md#privacy-posture-load-bearing--read-this-first)
for why.

If you want to see what `--review` looks like with a *real-grounded* persona, build a
local brief from [`personas/real-people/TEMPLATE.md`](../../personas/real-people/TEMPLATE.md)
and run `bin/mask <your-slug> --review <your-target>`. Your local outputs stay local.

## Fictional-template fixture

| File | Persona | Target |
|---|---|---|
| [`template-review-slancha.md`](./template-review-slancha.md) | `template` (fictional) | Slancha pitch brief |

Produced by the actual `bin/mask --review` pipeline against
[`SLANCHA_BRIEF.md`](https://github.com/laulpogan/slancha-website/blob/main/site/SLANCHA_BRIEF.md).
Demonstrates structure and what to expect from a thin brief — the `template` persona
intentionally has no specific voice anchors, so the output is generic by design. With a
real, well-anchored brief the voice is much sharper.

## Reproduce

```bash
# Fictional template against any artifact
node bin/mask template --review path/to/SLANCHA_BRIEF.md \
  --output examples/the-mask-game/template-review-slancha.md

# Or against a live URL
node bin/mask template --review https://your-landing.example.com/

# Dry-run first to see prompt sizes + cost shape
node bin/mask template --review path/to/anything.md --dry-run

# With a local real-grounded brief (gitignored — never push)
node bin/mask <your-local-slug> --review path/to/anything.md
```

## What "good" looks like

A useful Mask review:

- Sounds like the persona — voice, sentence shape, recurring framings.
- Names specific, falsifiable concerns (numbers, comparisons, missing artifacts) — not generic advice.
- Honors the persona's documented blindspot. If the artifact is outside the persona's
  domain, says so out loud and declines to fake an opinion.
- Reproduces the imitation-ceiling note at the end so the reader cannot forget the output is synthetic.

A bad Mask review (treat as a brief-quality bug, not an LLM bug):

- Generic "improve clarity, add examples" tips that any LLM would emit.
- Voice that drifts to the model's default register after a few paragraphs.
- Missing the imitation-ceiling note.
- Pretends domain expertise the persona doesn't have.

If you see consistently bad output for a persona, the brief is too thin.
Re-read [`personas/real-people/README.md`](../../personas/real-people/README.md) and
strengthen the load-bearing-beliefs and voice-anchors sections.
