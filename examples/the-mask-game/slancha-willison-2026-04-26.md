# Simon Willison on SLANCHA_BRIEF.md

*Synthetic critique. Not the real Simon Willison. Internal-only. Don't publish or attribute.*

- **persona:** Simon Willison (`willison`, last_validated 2026-04-27)
- **target:** SLANCHA_BRIEF.md (markdown, 21691 chars)
- **generated:** 2026-04-27T06:09:03.205Z

---

## First read
Black box pitch land wrong on me. I tried models out via OpenRouter all weekend — *seeing* which model answered is half the value. Brief say "customers no longer pick models by name" like that feature, not bug. For me, bug. Also: nowhere in 11 sections do I find price-per-million-tokens, signup URL, or curl example. Eleven sections of positioning, zero lines of code I could paste into terminal. DeepSeek-V4-Flash beat GPT-5.4 Nano on cost already — what number Slancha put next to it?

## What I'd push on
- **No price.** Whole pitch hinge on "frontier pricing unstable, we cheaper" but brief never quote $/Mtok. If you not beat DeepSeek-V4-Flash direct call, story collapse. Put number in section 1.
- **Black box = trust ask, not feature.** Routing decision must surface in response object — `x-slancha-model`, `x-slancha-route-confidence`, token cost breakdown. Otherwise indie devs assume worst model + markup. Not Diamond lose me same way; don't repeat mistake.
- **Self-serve or die.** Brief silent on signup. If gate behind "contact sales," I bounce in 60s. Need: free tier, OpenAI-compatible `base_url` swap, /playground page no-auth. One curl in README beat 11 sections of competitive table.
- **Fine-tune-on-my-traffic = data exfil concern unaddressed.** "Curates training data from actual usage patterns" — whose data, whose weights, retention, opt-out, can I take fine-tune with me when leave? Section 8 ("Stickiness") frame lock-in as feature; that flag, not moat. Indie buyer read that paragraph and run.
- **"Continuously gets better" unfalsifiable.** No eval methodology, no public leaderboard, no "here our router-v3 vs router-v2 on MMLU-Pro." Track Unsloth's quantization posts — they show numbers every release. Slancha need same discipline or claim collapse to vibes.

## What earns my time
- Layer 4 (QAT-to-4bit + MIG packing on B200) actually interesting infra story — if you publish tokens/sec/$ benchmark vs Fireworks on matched workload, I read that post.
- Closed-loop framing (route → curate → fine-tune → redeploy) genuinely differentiated vs OpenRouter/Portkey. Worth pitch — but only after self-serve exist.
- Honest blindspot flag: I optimize for indie-dev weekend buyer. Slancha brief read enterprise-procurement to me ("zero ML expertise required" team buying a black box). That outside my calibration. Different audience may not need transparency I demand. Worth user-test pitch on actual ML-light eng manager, not me.

## Verdict
Positioning doc strong, product doc missing — show me curl, $/Mtok, and visible routing decision before I believe any of section 8.

## Imitation ceiling
Synthetic proxy of Willison's priors based on public writings through 2026-04. Not him.
Stress test, not verdict. Never attribute back to him.
