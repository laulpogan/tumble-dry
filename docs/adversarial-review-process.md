# Adversarial Review Process: Tumble Dry

A systematic method for stress-testing business artifacts (financial models, copy, pitch decks, strategy docs) by running them through multiple rounds of critique from adversarial expert personas.

---

## How It Works

### The Loop

```
Artifact → N Personas Attack → Synthesize Fixes → Apply Corrections → Repeat
                                                                        ↓
                                                         Stop when 75%+ personas
                                                         say "NO ISSUES FOUND"
```

1. **Input:** Any business artifact (financial model, website copy, pitch deck, strategy doc)
2. **Personas:** 4-7 expert reviewers with conflicting perspectives and incentives
3. **Each Round:** Every persona independently attacks the artifact (max 5 issues each)
4. **Synthesis:** All critiques merged into concrete fixes (max 8 per round)
5. **Correction:** Fixes applied to the artifact
6. **Repeat:** Corrected version goes back through all personas
7. **Consensus:** Stop when 75%+ personas find no remaining issues (or max rounds hit)

### Why It Works

- **No single perspective dominates** — a VC sees different problems than a CFO, who sees different problems than a customer
- **Fixes create new attack surface** — correcting one issue often reveals a deeper one
- **Converges toward robustness** — each round hardens the artifact against a wider range of objections
- **Exposes internal contradictions** — persona A's fix may conflict with persona B's, forcing a real decision

---

## Persona Design Principles

### Good Personas Have:
- **A specific background** (not "an investor" but "Sarah Chen, partner at Sequoia who's been burned by GPU startups")
- **Known biases** (the CFO cares about cash flow timing; the layman cuts through jargon)
- **Conflicting incentives** (the VC wants growth; the CFO wants margins; the customer wants low price)
- **A failure mode they've seen** ("I've been burned by founders who model 75% conversion rates")

### Bad Personas:
- Generic ("a smart person reviews this")
- Agreeable ("this looks great, minor suggestions...")
- Redundant (two VCs with the same perspective)

### The Layman Is Critical
Always include one non-expert persona. They catch:
- Jargon that hides weak logic
- Complexity that signals the founder doesn't understand their own business
- "Emperor's new clothes" problems everyone else is too polite to name

---

## Persona Libraries

### For Financial Models

| Persona | Focus | Catches |
|---------|-------|---------|
| **VC Partner** | Growth, TAM, defensibility | Optimistic assumptions, unrealistic CAC, missing moat |
| **Finance Professor** | Model structure, math | Circular logic, correlation errors, LTV formula bugs |
| **CFO (operator)** | Cash flow, ops, billing | Working capital holes, revenue recognition, scaling costs |
| **Layman / Angel** | Common sense | BS detection, "explain it to my wife" test |

### For Copy / Messaging

| Persona | Focus | Catches |
|---------|-------|---------|
| **CMO** | Brand, positioning, channel | Weak headlines, unclear ICP, missing social proof |
| **Net New Prospect** | First impression | Confusion, skepticism, "why should I care" |
| **Switching Prospect** | Migration pain, comparison | "I already have this", lock-in fears |
| **Technical Buyer** | Architecture, security, SLAs | Missing specs, compliance gaps, vendor risk |
| **Non-Technical Buyer** | Clarity, forwarding to eng team | Jargon, "I don't understand this" |
| **Copywriter** | Craft, structure, CTAs | Weak verbs, feature-focus vs outcome-focus |
| **SEO Consultant** | Search visibility | Wrong keywords, missing intent pages |

### For Pitch Decks

| Persona | Focus | Catches |
|---------|-------|---------|
| **Seed VC** | Team, market, early traction | Empty team slide, unvalidated TAM |
| **Series A VC** | Unit economics, growth rate | LTV/CAC math, NRR, cohort data |
| **Angel (non-tech)** | Understandability | Jargon-heavy slides, unclear ask |
| **Competitor CEO** | Differentiation | "We could build this in a quarter" |

---

## Implementation

### Using Claude Code

```bash
# Single persona critique
claude -p "SYSTEM: {persona_system_prompt}
USER: Review this artifact and give 5 critical attacks:
{artifact_text}" --model sonnet

# Synthesis across personas
claude -p "Synthesize these critiques into max 8 fixes:
{all_critiques}" --model sonnet
```

### Automation Script Pattern

```python
def adversarial_review(artifact, personas, max_rounds=10):
    current = artifact
    for round in range(1, max_rounds + 1):
        critiques = {name: get_critique(p, current) for name, p in personas.items()}

        # Check consensus
        no_issues = sum("NO ISSUES FOUND" in c.upper() for c in critiques.values())
        if no_issues >= len(personas) * 0.75:
            return current  # Consensus reached

        # Synthesize and apply fixes
        fixes = synthesize(critiques)
        current += f"\n## Round {round} Corrections\n{fixes}"

    return current  # Max rounds, return best version
```

### Key Parameters

| Parameter | Default | Notes |
|-----------|---------|-------|
| Max rounds | 10 | Most converge by 5-7; diminishing returns after |
| Personas | 4-7 | <4 = insufficient coverage; >7 = synthesis gets noisy |
| Issues per persona per round | 5 | Forces prioritization; prevents nitpicking |
| Consensus threshold | 75% | 3/4 or 5/7 say no issues |
| Model for personas | Sonnet | Fast enough for iteration; Opus for final round |
| Max fixes per synthesis | 8 | Prevents over-correction oscillation |

---

## What We've Run So Far

### Run 1: Financial Model v1 (Savings Share)
- **Personas:** VC, Finance Prof, CFO, Layman
- **Rounds:** 10 (no consensus)
- **Key finding:** Savings share model structurally broken — frontier price compression closes the delta
- **Output:** `adversarial-review-log.md` (2,918 lines)

### Run 2: Financial Model v2 (Platform Fee Only)
- **Personas:** VC, Finance Prof, CFO, Layman
- **Status:** Running
- **Output:** `adversarial-model-v2-log.md`

### Run 3: Copy / Messaging (Reframed Value Prop)
- **Personas:** CMO, 4 Prospect Types, Copywriter, SEO
- **Status:** Running
- **Output:** `adversarial-copy-log.md`

---

## Lessons Learned

1. **The first round always finds real problems.** If it doesn't, your personas are too soft.

2. **The layman consistently finds the deepest issues.** "So you make money by saving people money... how?" killed the savings share model faster than the Wharton professor's structural analysis.

3. **Synthesis is harder than critique.** When the VC says "raise prices" and the customer says "too expensive," you have to make a real decision — not just split the difference.

4. **Never reach consensus means the artifact has a structural problem,** not a surface problem. The savings share model went 10 rounds without consensus because the premise was wrong, not the numbers.

5. **Fixes from round N create attack surface for round N+1.** This is a feature, not a bug — it simulates real due diligence where answering one question raises three more.

6. **The CFO persona catches things nobody else does:** working capital timing, revenue recognition, billing infrastructure costs, stranded assets. Always include an operator.

7. **Run the review BEFORE you build the spreadsheet.** We built a detailed XLSX, then the adversarial review proved the pricing model wrong. Should have reviewed the assumptions doc first.

---

## When to Use This

- **Before fundraising:** Run on pitch deck + financial model
- **Before launch:** Run on website copy + pricing page
- **Before major pivots:** Run on the new strategy doc
- **After competitive research:** Run on your positioning vs competitors
- **Quarterly:** Re-run on your investor update / board deck

---

## When NOT to Use This

- For code review (use actual tests and linters)
- For design review (use real user testing)
- For product decisions (use customer interviews)
- When you need speed over rigor (just ship and iterate)
