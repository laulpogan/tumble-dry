# The Mask Game — Real-Person Impersonation as Live Conversation

**Status:** Spec, implemented in PRs #2 + #3
**Author:** Paul Logan + Claude (Slancha)
**Date:** 2026-04-27
**Last revised:** 2026-04-27

A new tumble-dry command, `/mask`, that lets a user **hold a live conversation** with a real, named, public person — anchored on their actual writings — about an artifact (deck, page, plan, code).

Tumble-dry's existing pipeline is a stone polisher: parallel-archetype panel → findings → editor → convergence. The Mask Game is something different: a people-facing live dialogue tool. Same persona infrastructure (`personas/real-people/`), entirely separate runtime.

## Privacy posture (load-bearing — read this first)

**Real-people briefs must NEVER be committed to a public repo.** A public file with a named real person — even with a "synthetic proxy" disclaimer — will surface in google results for that name. That's the harm to prevent, and it overrides the polish of having named-archetype briefs in the public repo.

Convention enforced by `.gitignore`:

- **Allowed in the repo:** `README.md`, `index.md`, `opt-outs.md`, `TEMPLATE.md` (a fictional schema example, slug `template`).
- **Gitignored:** every other `.md` in `personas/real-people/`. Real briefs live there on your local machine but never push.
- **The bridge:** if you want a real-grounded archetype to ship in the public `personas/library.md` panel library, run `bin/mask anonymize <your-slug>`. The anonymizer strips identity fingerprints (real name, firm, citations, named frameworks) and emits a panel entry plus an audit-block listing what was scrubbed.

Every example in this spec uses the fictional `template` persona. Substitute your local slug when you run for real.

## TL;DR

```
/mask template
> [persona template]: what do you have for me?
> [you]: pitching slancha.ai — BYOK routing layer in front of OpenAI/Anthropic/DeepSeek
> [persona template]: ok, what compounds? what does the routing learn that nobody else gets?
> [you]: ...
```

The persona brief loads as the system prompt. You chat. You can paste artifacts mid-conversation. You can save the transcript. The persona stays in voice.

There's also a secondary one-shot mode (`/mask template --review <target>`) that produces a structured single-pass critique without dialogue — useful when you want a stress-test report rather than a conversation.

## Why this is *not* a flag on `/tumble-dry`

| | `/tumble-dry` | `/mask` |
|---|---|---|
| **Purpose** | Polish artifacts through simulated public contact | Stress-test a pitch / plan against one named voice |
| **Runtime** | Batch: parallel personas → editor convergence loop | Interactive: REPL conversation with one persona at a time |
| **Output** | Polished artifact + finding register | Conversation transcript + (optional) saved insights |
| **Persona panel** | 5-7 archetypes | 1 real person at a time |
| **Audience for output** | The artifact's reader | The artifact's *author* |
| **Frequency** | Once per artifact draft | Multiple sessions per pitch as it evolves |
| **Metaphor** | Stone polisher | Coffee with someone who'd actually say no |

These are different products that share a persona library. Forcing them under one entry point would muddy both.

## What it is NOT

- **Not satire.** Output is internal. Don't publish or attribute.
- **Not a verdict.** Per [arXiv 2509.14543](https://arxiv.org/html/2509.14543v1), LLMs mimic surface style well, miss long-term opinion stability. Treat as stress test.
- **Not for everyone in your contacts.** Only people with enough public writing to anchor a brief. If they don't write publicly, no Mask Game.
- **Not a replacement for the actual meeting.** It's a pre-flight check.

## File structure to add

```
tumble-dry/
├── personas/
│   └── real-people/
│       ├── README.md                      # Schema explainer + privacy posture + ethics
│       ├── index.md                       # Catalog (public repo ships only TEMPLATE)
│       ├── opt-outs.md                    # People who have asked not to be simulated
│       ├── TEMPLATE.md                    # Fictional schema example — slug `template`
│       └── <your-local-slug>.md           # Gitignored. Yours alone.
├── examples/
│   └── the-mask-game/
│       ├── README.md                      # Example invocations
│       └── template-review-slancha.md     # `template` persona → Slancha brief, fictional
├── bin/
│   └── mask                              # CLI entry point (executable)
├── src/
│   └── mask/
│       ├── repl.cjs                      # Interactive conversation loop
│       ├── one-shot.cjs                  # `--review` mode (structured critique)
│       ├── brief-loader.cjs              # Schema validation + corpus fetch
│       ├── prompt-builder.cjs            # System prompt assembly
│       ├── transcript.cjs                # Save/replay conversations
│       └── target-loader.cjs             # URL/file/dir → markdown
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-04-27-the-mask-game.md  # THIS FILE
```

## Commands

### `/mask <persona-slug>` — interactive REPL

Default and primary mode. Opens a conversation with the persona.

```
/mask template
[persona template]: what do you have for me?
[you]: > _
```

**Conversation primitives:**

| Action | Syntax | Behavior |
|---|---|---|
| Send text | `<message>` | Sent as user turn to the persona |
| Paste a file | `:paste <path>` | Loads the file content into context, persona reads it as if you handed it to them |
| Paste a URL | `:read <url>` | Same as `:paste` but fetches first |
| Show what's loaded | `:context` | Lists all files/URLs currently in conversation context |
| Save transcript | `:save [path]` | Writes the full conversation as markdown |
| Switch personas (carry context) | `:switch <slug>` | Hands the same artifact context to a different persona, gets their take |
| Ask the persona to challenge you back | `:challenge` | Persona asks 3 questions you'd struggle to answer |
| Reset | `:reset` | Drops conversation, keeps loaded artifacts |
| Exit | `:exit` | Saves transcript by default, prompts for path |

**Session state:**

- Each session has a unique slug like `mask-template-2026-04-27-1430`
- Auto-saved transcript at `~/.tumble-dry/mask-sessions/<slug>.md` after every turn
- Resumable via `/mask --resume <slug>`

**Persona behavior rules** baked into the system prompt:

- Stay in character. Never break the fourth wall except in the imitation-ceiling reminder when the user asks "are you really X?"
- Don't flatter. If the artifact is weak, say so in voice.
- Don't summarize. Push back on substance.
- Honor the persona's documented blindspot — if the user's pitch addresses something outside the persona's calibration domain, say "this is outside what I'd usually evaluate" and decline to fake an opinion.
- Reference the persona's own prior writings when they apply ("as I wrote in *<Their Essay>*...").
- End-of-session ceiling reminder, single line: "Reminder: I'm a synthetic proxy of <Name>'s priors based on public writings through <date>. Stress test, not verdict."

### `/mask <persona-slug> --review <target>` — one-shot structured critique

Single-pass critique of an artifact in the persona's voice, structured output. Use when you don't want a dialogue, you just want "what would they say at first read."

```
/mask template --review https://slancha.ai/
/mask <your-local-slug> --review ./pitch-deck.pptx
/mask <your-local-slug> --review ./homepage-copy.md --output ./reviews/
```

**Output structure** (markdown file written to disk):

1. **First read** (one paragraph)
2. **What I'd push on** (3-5 bullets)
3. **What earns my time** (1-3 bullets)
4. **Verdict** (one sentence)
5. **Imitation ceiling note**

See `examples/the-mask-game/template-review-slancha.md` for an example output (fictional persona, real Slancha pitch brief — illustrates structure without naming any real person).

### `/mask --list`

List available personas, validation status, and last-validated date.

```
/mask --list
SLUG               NAME                STATUS   LAST_VALIDATED   DOMAIN
template           Persona Template    active   2026-04-27       (fictional schema example)
<your-slug>        <Local persona>     active   2026-04-27       <your-domain>
```

(The public repo ships only `template`. Your local briefs appear here too.)

### `/mask --resume <session-slug>`

Continue a previously saved conversation. Reloads context.

## Persona brief schema (`personas/real-people/<slug>.md`)

Same as the previous spec revision. Six required fields, three Mask-Game-specific.

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

## Reference brief

The repo ships a single fictional schema example: [`personas/real-people/TEMPLATE.md`](../../../personas/real-people/TEMPLATE.md) (slug `template`, name `Persona Template`). It is fictional by design — the privacy posture above forbids committing real-people briefs to a public repo.

To build a real-grounded brief, copy `TEMPLATE.md` to `personas/real-people/<your-slug>.md` (which is gitignored). Read enough of the person's recent (≤12mo) public writing to internalize their voice, then fill in every section honestly — especially the **Blindspot** section, which is the most important guard against sycophantic critique.

A well-anchored real brief produces sharply in-voice output. The fictional template's voice anchors are intentionally generic, so its `--review` output is generic; that's a feature for a schema example, not a bug.

If you want a real-grounded archetype to reach the public `personas/library.md` panel library used by `/tumble-dry`, run `bin/mask anonymize <your-slug>` (PR #3). The anonymizer strips identity fingerprints (real name, firm, citations, named frameworks) and emits a panel entry plus an audit-block listing what was scrubbed. That is the only path from real brief → committed asset.

## Runtime: REPL implementation sketch

Stack: Node.js, `@anthropic-ai/sdk`, `inquirer` for prompt UX, `marked` for inline markdown rendering in terminal.

```javascript
// src/mask/repl.cjs (sketch)

import Anthropic from '@anthropic-ai/sdk';
import { loadBrief } from './brief-loader.cjs';
import { buildSystemPrompt } from './prompt-builder.cjs';
import { Transcript } from './transcript.cjs';
import readline from 'readline';

async function runRepl(personaSlug) {
  const brief = await loadBrief(personaSlug);
  const system = buildSystemPrompt(brief);
  const transcript = new Transcript({ persona: brief.name, slug: personaSlug });
  const client = new Anthropic();

  const messages = [];
  const context = { files: [], urls: [] };

  console.log(`[${brief.name}]: what do you have for me?`);
  transcript.add('assistant', 'what do you have for me?');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  for await (const userInput of readLines(rl)) {
    if (userInput.startsWith(':')) {
      // Handle :paste, :read, :context, :save, :switch, :challenge, :reset, :exit
      await handleCommand(userInput, { context, transcript, messages, brief });
      continue;
    }

    messages.push({ role: 'user', content: userInput });
    transcript.add('user', userInput);

    const response = await client.messages.create({
      model: 'claude-opus-4-7',  // 1M context for long artifact-laden conversations
      max_tokens: 2000,
      system,
      messages: prependContext(context, messages),
    });

    const reply = response.content[0].text;
    messages.push({ role: 'assistant', content: reply });
    transcript.add('assistant', reply);
    console.log(`[${brief.name}]: ${reply}`);
    transcript.flushToDisk();  // auto-save every turn
  }
}
```

The `buildSystemPrompt` assembles:

```
You are <Name>. <Bio>.

Recent writings (your own, attributed):
<2-3 excerpts from corpus, ~500 tokens each>

Your stated views:
<load-bearing beliefs verbatim>

Your voice:
<voice anchors>

Your blindspot (be honest about it when it comes up):
<blindspot>

Behavior rules:
- Stay in character. Don't summarize. Don't flatter. Push back when warranted.
- If the user pastes an artifact, react as if they handed it to you in a meeting.
- Use specific numbers and your own prior framings when they apply.
- Honor your blindspot. If the user's pitch addresses something outside your calibration
  domain, say so and decline to fake an opinion.
- If asked "are you really <Name>?", reply: "I'm a synthetic proxy of <Name>'s priors
  based on public writings through <last_validated>. Stress test, not verdict."
- If the user asks for an end-of-session summary, give them one and remind them of the
  imitation ceiling.
```

## Methodology citations (drop in `personas/real-people/README.md`)

- [TwinVoice (arXiv 2510.25536)](https://arxiv.org/html/2510.25536v1) — few-shot writing samples + stated views > abstract role descriptions
- [Catch Me If You Can? (arXiv 2509.14543)](https://arxiv.org/html/2509.14543v1) — imitation ceiling: surface style mimicked, deep opinions less so
- [Personas in System Prompts (arXiv 2311.10054)](https://arxiv.org/html/2311.10054v3) — persona alone doesn't improve factual reasoning; use for stylistic / opinion-bearing tasks only
- [Lakera Prompt Engineering Guide 2026](https://www.lakera.ai/blog/prompt-engineering-guide) — pair persona with structured-output constraints in one-shot mode
- [Quantifying the Persona Effect (arXiv 2402.10811)](https://arxiv.org/html/2402.10811v2) — effect sizes are real but small; one signal among many

## Ethics

- **Never publish** Mask Game outputs as if the real person said them. Internal-only.
- **Never use in adversarial contexts** (legal, regulatory, competitive harm). Talking about a real person's likely critique of *your own* artifact is fine; using it to attack them or their portfolio is not.
- **Retire briefs when the subject materially changes role or views.** Set `status: retired` and replace with a successor brief if appropriate.
- **6-month staleness warning** in the runner is a soft check — overrideable when the person hasn't published recently but their stated views are stable.
- **Respect explicit opt-outs.** If a person publicly says "don't simulate me," set `status: retired` and don't run them again. Build a public-facing list at `personas/real-people/opt-outs.md`.

## Roadmap (after MVP)

- **Brief auto-generation.** Given a person's blog/twitter handle, runner drafts a brief by clustering their recent posts. Human-edited before activation.
- **Multi-persona panel within `/mask` REPL.** `/mask <slug-a> <slug-b>` opens a conversation where both personas are present and can disagree with each other in front of you.
- **Brief-validation lint.** Checks each brief has a non-trivial blindspot, ≥3 source URLs that resolve, narrow domain scope, and an imitation-ceiling note.
- **Auto-suggested follow-ups.** Persona offers `[1] push on data flywheel  [2] go deeper on unit economics  [3] move on to another topic` after each major exchange. Lower friction.
- **Voice-mode replay.** Save a transcript and replay it as a script for an actual rehearsed pitch.
- **Cross-persona convergence in one-shot mode.** If you `--review` with multiple personas, get a roll-up that consolidates common findings (already in v1 spec, kept).

## Implementation order suggestion

1. Add `personas/real-people/TEMPLATE.md` (the fictional schema example) and a `.gitignore` rule that keeps real briefs local-only.
2. Add `personas/real-people/README.md` (schema explainer + ethics) and `personas/real-people/index.md` (catalog).
3. Add `bin/mask` and `src/mask/` skeleton.
4. Implement **`--review` one-shot mode first**. Faster to ship, validates the brief format. Re-uses the canonical 2026-04-26 slancha critiques as fixtures.
5. Implement the REPL on top of the same brief-loader / prompt-builder.
6. Implement `:paste`, `:read`, `:context`, `:save`, `:exit` first. `:switch`, `:challenge`, `:reset`, `--resume` second.
7. Document `bin/mask --help` and add a short callout in tumble-dry's main `README.md` linking to this spec.

## Out of scope for v1

- Speech / voice. Text-only.
- Memory across sessions. Each session is fresh; transcripts saved but not auto-loaded.
- Live web fetching during the conversation (only `:read` on user demand, not autonomous browsing by the persona).
- A persona "library" UI. CLI only.

---

## What stayed from the previous draft, what changed

| | Previous | This revision |
|---|---|---|
| **Mode** | Flag on `/tumble-dry`, single-pass critique | Separate `/mask` command, primary mode is REPL conversation |
| **Output** | Structured-critique markdown only | Conversation transcript primary; structured-critique secondary via `--review` |
| **Convergence with editor** | Optional merge into editor loop | Out of scope. `/mask` is people-facing, separate from the polish loop |
| **Persona brief schema** | Same | Same |
| **Reference briefs** | Two named real persons committed to repo | Fictional `TEMPLATE.md` only; real briefs gitignored (privacy posture) |
| **Citations + ethics** | Same | Same |
