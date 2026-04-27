# `personas/real-people/` — Mask Game persona briefs

These briefs anchor the [`/mask`](../../docs/superpowers/specs/2026-04-27-the-mask-game.md)
command. Each file represents one real, named, public person whose published writings are
robust enough to support a stress-test conversation about an artifact you are about to
ship to them (or to people like them).

This is **separate** from `personas/library.md`, which holds anonymous archetypes used by
`/tumble-dry`'s convergence loop. Real-people briefs are 1:1 dialogue tools. Anonymous
archetypes are panel members in a polishing pipeline. Don't confuse the two.

## Privacy posture (load-bearing — read this first)

**Real-people briefs must NEVER be committed to a public repo.** A public file with a
named real person — even with a "synthetic proxy" disclaimer — will surface in google
results for that name. That's the harm to prevent, and it overrides the polish of having
named-archetype briefs in the public repo.

Convention enforced by [`.gitignore`](../../.gitignore):

- **Allowed in the repo:** `README.md`, `index.md`, `opt-outs.md`, `TEMPLATE.md`.
- **Gitignored:** every other `.md` in this directory. Real briefs live here on your
  local machine but never push.
- **The bridge:** if you want a real-grounded archetype to ship in the public
  `personas/library.md` panel library, run `bin/mask anonymize <slug>` (added in PR #3).
  The anonymizer strips identity fingerprints (real name, firm, citations, named
  frameworks) and emits a panel entry plus an audit-block listing what was scrubbed.

## Schema

Copy [`TEMPLATE.md`](./TEMPLATE.md) and fill in the sections. Each `<slug>.md` file has
YAML frontmatter and ten markdown sections:

```markdown
---
name: <full name>
slug: <lowercase-hyphen-slug>
last_validated: <YYYY-MM-DD>
status: active | retired
---

# <Name>

*<one-paragraph anchored bio>*

## Hiring job
What this person is reading for / what they'd be deciding in a 30-min coffee.

## Bounce trigger
What disengages them.

## Championing trigger
What lights them up.

## Load-bearing beliefs
3-5 near-quotes with citations.

## Voice anchors
Stylistic markers — sentence length, vocabulary, rhetorical moves.

## Blindspot
What they typically miss or underweight, written honestly.

## Source corpus
3-5 URLs of recent (within 12 months) public writings.

## Domain scope
What artifact types this persona is calibrated for.

## Imitation ceiling note
One-sentence reminder reproduced in every output.
```

All ten sections are required. The brief loader will refuse to start a session with
`status: retired` briefs, and will warn loudly if `last_validated` is more than 6 months
in the past.

## Methodology citations

The brief format is informed by:

- [TwinVoice (arXiv 2510.25536)](https://arxiv.org/html/2510.25536v1) — few-shot writing
  samples + stated views beat abstract role descriptions for persona alignment.
- [Catch Me If You Can? (arXiv 2509.14543)](https://arxiv.org/html/2509.14543v1) —
  imitation ceiling: surface style mimicked well, deep opinions less so. Treat output as
  stress test, not verdict.
- [Personas in System Prompts (arXiv 2311.10054)](https://arxiv.org/html/2311.10054v3)
  — persona alone doesn't improve factual reasoning; use for stylistic / opinion-bearing
  tasks only.
- [Lakera Prompt Engineering Guide 2026](https://www.lakera.ai/blog/prompt-engineering-guide)
  — pair persona with structured-output constraints in one-shot mode.
- [Quantifying the Persona Effect (arXiv 2402.10811)](https://arxiv.org/html/2402.10811v2)
  — effect sizes are real but small; persona is one signal among many.

## Ethics

- **Never commit a real-people brief.** Privacy posture above is non-negotiable.
- **Never publish** Mask Game outputs as if the real person said them. Internal-only.
- **Never use in adversarial contexts** (legal, regulatory, competitive harm). Talking
  about a real person's likely critique of *your own* artifact is fine; using it to
  attack them or their portfolio is not.
- **Retire briefs when the subject materially changes role or views.** Set
  `status: retired` and replace with a successor brief if appropriate.
- **6-month staleness warning** in the runner is a soft check — overrideable when the
  person hasn't published recently but their stated views are stable.
- **Respect explicit opt-outs.** If a person publicly says "don't simulate me," set
  `status: retired` and add them to [`opt-outs.md`](./opt-outs.md). Don't run them again.

## Adding a new brief (local workflow)

1. Read enough of the person's recent (≤12mo) public writing to internalize their voice.
2. Copy [`TEMPLATE.md`](./TEMPLATE.md) to a new `<your-slug>.md` (which will be gitignored).
3. Fill out every section. Resist the urge to leave the blindspot blank — a brief
   without an honest blindspot will quietly produce sycophantic critiques.
4. Validate with `bin/mask --list`.
5. Use locally with `bin/mask <your-slug>` (REPL) or `bin/mask <your-slug> --review <target>`.
6. **Do not** commit the brief. `.gitignore` should refuse it; if it doesn't, file a bug.

To share a real-grounded archetype publicly, run `bin/mask anonymize <your-slug>` and
paste the output into `personas/library.md`. The anonymizer strips identity before the
content reaches a committed file.

When in doubt, err toward fewer briefs of higher quality. A weak brief produces
plausible-sounding critique that is actually noise.
