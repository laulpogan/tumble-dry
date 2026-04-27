# Examples — `/mask`

This directory holds reference outputs of [`/mask`](../../docs/superpowers/specs/2026-04-27-the-mask-game.md).

These are **synthetic critiques.** They are not the views of the real people named.
Internal-use fixtures only — do not publish, do not attribute.

## One-shot `--review` fixtures

Both files were produced by the actual `bin/mask --review` pipeline against
[`SLANCHA_BRIEF.md`](https://github.com/laulpogan/slancha-website/blob/main/site/SLANCHA_BRIEF.md):

| File | Persona | Target |
|---|---|---|
| [`slancha-casado-2026-04-26.md`](./slancha-casado-2026-04-26.md) | Martin Casado | Slancha pitch brief |
| [`slancha-willison-2026-04-26.md`](./slancha-willison-2026-04-26.md) | Simon Willison | Slancha pitch brief |

## Reproduce

```bash
# Casado on the Slancha brief
node bin/mask casado --review path/to/SLANCHA_BRIEF.md \
  --output examples/the-mask-game/slancha-casado-$(date -u +%Y-%m-%d).md

# Willison on the same brief
node bin/mask willison --review path/to/SLANCHA_BRIEF.md \
  --output examples/the-mask-game/slancha-willison-$(date -u +%Y-%m-%d).md

# Or against a live URL
node bin/mask casado --review https://slancha.ai/

# Dry-run first to see prompt sizes + cost shape
node bin/mask casado --review path/to/anything.md --dry-run
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
