# Psychographic Validation Audit: Tumble-Dry Persona Library

**Date:** 2026-04-15
**Scope:** ~200 personas across 40 artifact types in `personas/library.md`
**Method:** Map library against Big Five / OCEAN, cognitive bias taxonomy, decision-making archetypes, Kahneman's adversarial collaboration model, Janis groupthink theory, and steelman/strawman orientation.

---

## Executive Summary

**What's good:** The persona library is unusually well-designed for an AI system. The mandatory five-slot structure (believer, operator, domain auditor, outside skeptic, end-reader proxy) implicitly covers four of five OCEAN dimensions without naming them. The believer/skeptic pairing rule (Pitfall 16) is the single most important anti-groupthink mechanism and it's non-negotiable. The "load-bearing belief" field is doing more psychographic work than it looks — it anchors each persona to a distinct cognitive frame, not just a role title.

**What's missing:**
1. No persona in any panel is explicitly high-Openness in the creative/divergent sense. Every persona is a *critic*, not a *possibility-finder*. This means panels reliably catch what's wrong but systematically miss what's possible.
2. Cognitive biases within panels are accidentally correlated — particularly anchoring bias in finance panels and status-quo bias in engineering panels.
3. No panel has a designated System 1 thinker. Every persona is System 2 (analytical, slow). This means panels miss gut-reaction failures that real readers would catch instantly.
4. The convergence mechanism ("repeat until <N material findings") selects for fatigue, not truth. Kahneman's adversarial collaboration model prescribes a different stopping rule.

**What's wrong:**
1. Three artifact types have panels where all skeptics share the same bias direction (anchoring to professional benchmarks), creating a monoculture of criticism that misses premise-level errors.
2. The "end-reader proxy" slot is the weakest across the library. In 14 of 40 panels, it's a token lay-reader with no specific cognitive profile — making it a satisficer when it should be the panel's most important divergent voice.

---

## 1. Big Five / OCEAN Analysis

### Framework
The Big Five personality dimensions (Costa & McCrae, 1992) predict distinct failure-detection profiles:
- **Openness (O):** Creativity, willingness to consider unconventional interpretations. High-O reviewers catch missed opportunities and reframing possibilities. Low-O reviewers enforce convention compliance.
- **Conscientiousness (C):** Detail orientation, systematic checking. High-C reviewers find formatting, consistency, and compliance errors. Low-C reviewers (rare in professional settings) catch over-engineering.
- **Extraversion (E):** Social energy orientation. High-E reviewers simulate audience reception. Low-E reviewers catch claims that only work in a room of enthusiasts.
- **Agreeableness (A):** Tendency to preserve harmony. High-A reviewers steelman. Low-A reviewers catch hidden weaknesses.
- **Neuroticism (N):** Sensitivity to negative outcomes. High-N reviewers are excellent threat-modelers and worst-case scenario generators. Low-N reviewers catch false alarms.

### Panel Mapping

**Typical Business/Finance panel (e.g., Series A pitch deck):**
| Persona | O | C | E | A | N |
|---------|---|---|---|---|---|
| Priya Iyer (lead partner) | Med | High | High | Med | Med |
| Nathan Greaves (sector specialist) | Low | Very High | Low | Low | Med |
| Sasha Mendel (diligence lead) | Low | Very High | Low | Low | Med |
| Roman Vasquez (seed investor) | Med | Med | High | High | Low |
| Dr. Hae-won Lim (reference sim) | Med | High | Med | Low | Med |
| Tom Briar (growth partner) | Med | High | Med | Med | Low |

**OCEAN diagnosis:** C is stacked (four of six personas are Very High or High Conscientiousness). This is correct for financial diligence — you want detail-oriented reviewers on a pitch deck. But O is uniformly Medium-to-Low. Nobody on this panel asks "what if the market is actually 10x larger than they think?" or "is there a positioning that makes this a category-creator instead of a category-entrant?" The panel reliably catches lies but misses missed ambitions.

**Typical Product/Engineering panel (e.g., RFC):**
| Persona | O | C | E | A | N |
|---------|---|---|---|---|---|
| Sven Aaltonen (principal eng) | Med | Very High | Low | Low | Med |
| Ines Carvalho (SRE) | Low | Very High | Low | Low | High |
| Marcus Tabor (adjacent consumer) | Low | High | Low | Low | Med |
| Yuki Tanaka (junior eng) | High | Med | Med | High | Low |
| Ramona Diaz (security) | Low | Very High | Low | Low | High |
| Owen Bright (director) | Med | High | Med | Med | Low |
| Anna Petrov (architecture) | Low | Very High | Low | Low | Med |

**OCEAN diagnosis:** Five of seven personas are Very High C, Low E, Low A. This is an introvert-heavy, disagreeable, conscientious panel — which is correct for technical review. But it creates a specific failure mode: the panel will reliably reject a design that's unusual even if the unusual design is correct. High-C, Low-O panels default to "we should do what we've always done." Yuki Tanaka (the junior engineer) is the only high-O persona, and she's positioned as a readability check, not as a design-alternative generator.

**Marketing panels (e.g., Landing Page):**
| Persona | O | C | E | A | N |
|---------|---|---|---|---|---|
| Harry Daniels (copywriter) | Very High | Med | High | Low | Med |
| Jen Park (demand gen) | Med | High | Med | Med | Med |
| Net-New Prospect | Med | Low | Med | Med | Med |
| Switching Prospect | Low | Med | Low | Low | Med |
| Procurement Skeptic | Low | Very High | Low | Low | High |
| Karri-style Design Engineer | Very High | High | Med | Low | Med |
| Mobile User on Train | Low | Low | High | Med | Low |

**OCEAN diagnosis:** This is the most balanced panel in the library. Harry Daniels and the Karri-style Design Engineer bring high Openness. The Procurement Skeptic brings disagreeable Conscientiousness. The Mobile User brings low-C constraint testing. This panel composition should be the template for other categories.

### OCEAN Recommendations

1. **Add one high-Openness "possibility-finder" to every finance and engineering panel.** Not a dreamer — a persona whose job is to ask "what if the author is underselling this?" Example for pitch decks: a second-time founder who sees the 100x version the first-time founder hasn't articulated yet. Example for RFCs: a principal engineer from a different org who'd solve this differently.

2. **Add one low-Conscientiousness "forest-for-trees" persona to compliance-heavy panels** (10-K, earnings, contracts). These panels are so detail-oriented they can miss that the entire document is answering the wrong question. The retail investor partly fills this role in finance, but needs a stronger mandate.

3. **Audit Extraversion distribution in panels meant for public-facing artifacts** (press releases, landing pages, launch announcements). High-E personas simulate real audience reception better than low-E personas reading in isolation.

---

## 2. Cognitive Bias Coverage

### Framework
A review panel's bias coverage matters more than any individual reviewer's expertise. The key question: are panel biases *anti-correlated* (they cancel out) or *accidentally stacked* (they compound)?

Core biases in document review (Kahneman & Tversky, 1974; Nickerson, 1998; Kruger & Dunning, 1999):

- **Anchoring bias:** Over-weighting the first piece of information encountered. Reviewers who know industry benchmarks anchor to them.
- **Confirmation bias:** Seeking evidence that confirms existing beliefs. Believers and skeptics both suffer from this — just in opposite directions.
- **Availability heuristic:** Overweighting vivid, recent, or personal examples.
- **Dunning-Kruger effect:** Overconfidence in areas of limited competence. Domain experts underrate their blind spots.
- **Status quo bias:** Preferring the current state. Engineers and operators default to "this is how we do it."
- **Survivorship bias:** Focusing on successful examples and ignoring failures.
- **Curse of knowledge:** Inability to reconstruct what it's like not to know something.

### Bias Stacking Analysis

**Finance panels — anchoring bias stacked:**
In the Financial Model panel, Audra Kellerman (CFO), Lena Voss (auditor), Mira Solis (investor), and Karim Boateng (CS benchmark) all anchor to industry benchmarks. This is correct for a model-verification task — you want benchmark-anchored reviewers. But the stack means the panel will unanimously flag a churn assumption of 1% monthly as "too low" even if the company genuinely has 1% monthly churn because of a novel business model. Only Patrick "PC" Cole (pricing strategist) might catch that the model's structure is the problem, not its numbers. Ben Saxon (VP Sales) is too operationally anchored to notice.

**Recommendation:** Add a persona who is explicitly *un-anchored* — perhaps a first-principles thinker or an adjacent-industry reviewer who doesn't carry SaaS benchmarks. This persona's job: "are the benchmarks even the right benchmarks?"

**Engineering panels — status quo bias stacked:**
In the RFC panel, Sven Aaltonen ("has watched two prior rewrites"), Anna Petrov ("prevent primitive duplication"), and Ines Carvalho ("if it can't roll back it shouldn't ship") all carry strong status-quo priors. This is a feature for stability but a bug for innovation. A genuinely novel architecture that breaks existing patterns will be rejected by this panel on instinct even if it's correct.

**Recommendation:** The RFC panel needs one persona whose load-bearing belief is "the existing system is wrong and should be replaced." This is not the same as Owen Bright (director/sponsor) — Owen cares about cost and timeline, not about whether the current architecture is wrong.

**Marketing panels — survivorship bias partially addressed:**
The Case Study panel includes the Doug Kessler-Inspired Editor whose job is to "surface the messy middle" — a direct survivorship-bias countermeasure. This is excellent design. The Press Release panel has the Hacker News Reader as a survivorship-bias check. But the Brand Guidelines panel has no persona whose job is "name the brands that tried this messaging and failed." The Skeptical Sales Rep partially fills this, but their lens is "will the front line say this," not "has this positioning failed before."

### Bias Anti-Correlation Matrix (Ideal vs. Actual)

For a panel to achieve bias anti-correlation, you need at least one persona who counteracts each dominant bias in the group:

| Dominant Bias in Panel | Counter-Persona Needed | Status in Library |
|------------------------|----------------------|-------------------|
| Anchoring (finance) | First-principles thinker | MISSING |
| Status quo (engineering) | Paradigm-challenger | MISSING |
| Confirmation (all) | Believer/skeptic pair | PRESENT (Pitfall 16) |
| Availability (crisis comms) | Historical-case analyst | PRESENT (Karen Mehta) |
| Dunning-Kruger (domain-specific) | Adjacent-domain expert | PARTIALLY present |
| Survivorship (marketing) | Failure-case analyst | PRESENT in some panels |
| Curse of knowledge (docs, education) | Naive reader persona | PRESENT (Felix Andrade, Confused Learner, etc.) |

---

## 3. Decision-Making Archetypes

### Framework
Behavioral economics identifies four key axes of decision-making style:
- **Maximizers vs. Satisficers** (Schwartz, 2004): Maximizers search for the best option; satisficers accept the first adequate option.
- **Risk-averse vs. Risk-seeking** (Kahneman & Tversky, 1979): How agents evaluate downside vs. upside.
- **System 1 vs. System 2** (Kahneman, 2011): Fast intuitive judgment vs. slow analytical reasoning.
- **Foxes vs. Hedgehogs** (Tetlock, 2005): Foxes integrate many small signals; hedgehogs apply one big theory.

### Panel Composition Analysis

**Maximizer/Satisficer distribution:**
Nearly every persona in the library is a maximizer. This is appropriate for document review — you want reviewers who keep looking for problems. But the end-reader proxies (retail investor, patient, consumer, student) are satisficers in real life. They don't read the whole document; they scan until they find what they need or give up. The library captures this for some proxies (Jordan Akiyama: "time-to-first-200"; Net-New Prospect: "20 seconds on the page") but not consistently.

**Recommendation:** Every end-reader proxy should have an explicit time budget in their hiring job. "Read for 20 seconds" is more psychographically valid than "read and evaluate."

**Risk orientation:**
Finance panels are well-balanced. Believers (Maya Park, Priya Iyer, Roman Vasquez) are risk-seeking. Skeptics (Helena Borg, Sasha Mendel, Mira Solis) are risk-averse. The believer/skeptic rule guarantees at least one of each.

Engineering panels skew risk-averse. Ines Carvalho (SRE), Ramona Diaz (security), and Sven Aaltonen (principal eng) are all fundamentally risk-averse — they've been burned before and their load-bearing beliefs reflect it. Only Owen Bright (director) carries any risk-seeking orientation, and his is instrumentalized ("staff the project"), not appetite-driven.

**Recommendation:** Engineering panels should include one persona with explicit risk appetite — someone whose load-bearing belief is about the cost of *not* shipping. This exists implicitly in Owen Bright but should be explicit. Candidate belief: "The biggest risk is not the bug we ship; it's the quarter we waste building the wrong thing safely."

**System 1 / System 2:**
This is the library's most significant gap. Every persona is a System 2 thinker — they analyze, verify, cross-reference, and produce structured critique. No persona is designed to deliver a System 1 reaction: "my gut says this is wrong but I can't articulate why" or "this feels off on first read."

System 1 failures in documents are real and consequential: a pitch deck that's technically correct but *feels* desperate; a press release that's legally clean but *reads* as tone-deaf; an RFC that's well-reasoned but *smells* like premature optimization. These are exactly the failures real readers catch that analytical reviewers miss.

**Recommendation:** Add a "first-impression" pass to the review protocol. Before deep analysis, one reviewer produces a 30-second gut reaction. This is not a new persona — it's a new *mode* for an existing persona. The end-reader proxy is the natural candidate. Add to runbook: "End-reader proxy produces a 2-sentence first impression before reading the full document."

**Foxes vs. Hedgehogs:**
The library naturally produces fox panels (many perspectives, each contributing a small signal) but individual personas are hedgehogs (each has one load-bearing belief they apply everywhere). This is correct design — Tetlock's research (2005) shows that aggregating many hedgehog judgments produces fox-like accuracy, which is exactly what a multi-persona panel does.

---

## 4. Kahneman's Adversarial Collaboration Model

### Framework
Kahneman and collaborators (Kahneman, 2003; Mellers, Hertwig & Kahneman, 2001) studied how to make disagreements productive rather than averaging them out. Key findings:

1. **Adversarial collaboration requires pre-registered disagreements.** Each collaborator states their prediction *before* seeing the evidence. Agreement after pre-registered disagreement is more informative than agreement without it.
2. **The stopping rule matters.** "Stop when you agree" selects for fatigue. "Stop when you can state the other side's best argument" selects for understanding.
3. **Truth-tracking requires *calibrated* confidence, not consensus.** A panel that produces "3 agree, 2 disagree" is more informative than a panel that produces "5 agree weakly."

### Application to Tumble-Dry

**Pre-registered disagreements:** The library implicitly implements this through the believer/skeptic pairing. When Maya Park (believer) and Helena Borg (skeptic) review the same seed pitch deck, their disagreements are pre-registered by their load-bearing beliefs. Maya believes "the founder is the only thing that matters at seed." Helena believes "decks omit what would kill the deal." These are genuinely opposing priors.

**However**, the system doesn't capture these pre-registered disagreements explicitly in the output. The reviewer brief gives each persona their role, but the convergence mechanism doesn't use the believer/skeptic structure to *weight* findings. A structural finding from the skeptic (who was pre-registered to be skeptical) is less informative than a structural finding from the believer (who was pre-registered to approve). The system treats them equally.

**Stopping rule:** The current mechanism ("repeat until <N material findings") has a critical flaw identified by Kahneman's work. It optimizes for *quantity of findings*, not *resolution of disagreements*. A panel that produces 5 findings where all 5 reviewers agree is less valuable than a panel that produces 2 findings where the believer and skeptic identified the same problem from opposite directions.

**Recommendations:**
1. **Weight findings by reviewer prior.** A structural finding from a believer persona (who was predisposed to approve) should be flagged as higher-signal than the same finding from a skeptic (who was predisposed to find problems). Add a `prior_disposition` field to the reviewer brief.
2. **Change the stopping rule.** Instead of "repeat until <N material findings," use: "repeat until (a) believer and skeptic agree on at least one finding, OR (b) believer and skeptic can each state the other's best argument." The first condition catches genuine problems; the second prevents premature convergence.
3. **Capture disagreement structure.** When the editor synthesizes findings, explicitly note which findings had believer-skeptic agreement (high confidence), believer-only support (possible false positive from optimism), and skeptic-only support (possible false positive from pessimism).

---

## 5. Groupthink Analysis (Janis, 1972)

### Framework
Janis identified eight symptoms of groupthink and seven structural conditions that prevent it:

**Symptoms:** (1) illusion of invulnerability, (2) collective rationalization, (3) belief in inherent morality, (4) stereotyping out-groups, (5) pressure on dissenters, (6) self-censorship, (7) illusion of unanimity, (8) self-appointed mind guards.

**Structural preventions:** (1) impartial leadership, (2) encourage dissent, (3) assign devil's advocate, (4) outside experts, (5) allow members to discuss with outsiders, (6) explore alternatives, (7) second-chance meeting after initial decision.

### Library Assessment Against Janis Criteria

**What the library gets right:**

1. **Devil's advocate assigned (condition 3):** The skeptic role in every panel is an explicit devil's advocate. The Pitfall 16 rule ensures they're never removed. This alone prevents the most common groupthink failure.

2. **Outside experts included (condition 4):** The "outside skeptic with no upside" slot in the panel composition rule brings in reviewers with no stake in the document's success. Bjorn Naess (journalist on M&A), Hacker News Reader (on press releases), and Marcus Tanaka (crossover analyst on late-stage decks) are genuine outside perspectives.

3. **End-reader proxy prevents echo chamber (condition 6):** By including someone who reads the document as a real consumer would, the panel avoids the trap of expert-only consensus that doesn't match real-world reception.

**What the library gets wrong or misses:**

1. **No structural dissent-protection mechanism (condition 2).** Janis showed that devil's advocates only work if there's a structural guarantee they won't be overridden by consensus. In the tumble-dry system, the editor synthesizes all reviewer outputs. If five reviewers agree and one dissents, the editor may rationally discount the dissent. The system needs a rule: "a skeptic finding cannot be overridden by believer consensus; it must be resolved or flagged." The current `STRUCTURAL:` prefix partly addresses this, but only for structural findings, not for all skeptic findings.

2. **No second-chance mechanism (condition 7).** Janis showed that groups make better decisions when they reconvene after sleeping on the initial decision. The tumble-dry system has iterative rounds, which is similar, but the rounds are convergent (trying to reduce findings) rather than divergent (trying to surface new ones). Consider adding a "red team round" after the panel converges: one final pass where the skeptic persona is asked to attack the *revised* document, not the original.

3. **Minimum panel diversity question.** Janis's research and subsequent meta-analyses (Esser, 1998; Park, 2000) suggest that effective dissent requires at minimum 2 out of N panelists holding a contrasting view — a single dissenter gets socially overridden even in structural-dissent systems. The current Pitfall 16 rule requires >=1 skeptic, which is below the Janis threshold.

**Recommendation:** Change the anti-mode-collapse rule from "at least 1 believer and 1 skeptic" to "at least 2 believers and 2 skeptics in any panel of 6+." For panels of 5, maintain 1:1 minimum but prefer 2:2 with 1 neutral. This matches the empirical finding that lone dissenters are overridden.

---

## 6. Steelmanning vs. Strawmanning

### Framework
A steelman argument (Dennett, 2013) finds the *strongest* version of the position being critiqued. A strawman finds the *weakest* version. In document review, the distinction manifests as:

- **Steelman reviewer:** "I disagree with the conclusion, but here's the strongest version of their argument, and here's why even that version fails."
- **Strawman reviewer:** "This claim is unsupported" (without attempting to find the strongest supporting evidence the author might have intended).

### Library Assessment

The library's personas are predominantly **strawman-oriented** by design, and this is mostly correct for document polish. Here's why:

**When strawmanning is appropriate (most artifact types):** A pitch deck reviewer should not steelman a weak TAM analysis. The deck either supports the TAM or it doesn't. Helena Borg's bounce trigger ("use of 'ARR' before $1M of recurring revenue exists") is a hard boundary, not an invitation to steelman. Similarly, Sasha Mendel ("find the gap between deck and data room") is explicitly looking for failures, not trying to construct the best possible interpretation.

**When steelmanning is critical (and the library misses it):** Three artifact types benefit from steelmanning that the library doesn't provide:

1. **RFCs / ADRs:** Sven Aaltonen checks "what we considered and rejected" — but doesn't steelman the rejected alternatives. A proper RFC review includes: "here's the strongest case for the approach you rejected, and here's why your chosen approach still wins." Without this, rejected alternatives are straw-manned, and the RFC becomes vulnerable to future "why didn't you just..." questions.

2. **Legal briefs:** Sasha Reuben (opposing counsel) should explicitly steelman the opposition's best argument, not just find weaknesses. Rule 3.3's candor requirement (adverse controlling authority) is literally a legal obligation to steelman. The library's Sasha Reuben persona is close but should have "steelman the opposition's best argument" as the hiring job, not "write the response in their head."

3. **Academic papers:** Reviewer #2 is a strawman archetype by design ("find every overclaim"). But the most useful Reviewer #2 is one who steelmans the author's contribution first, then shows where even the steelmanned version fails. This produces actionable revision guidance rather than "reject because overclaim."

**Recommendations:**
1. Add explicit steelman instructions to RFC, legal brief, and academic paper panels.
2. For RFCs: Change Sven Aaltonen's hiring job to "Steelman the best rejected alternative, then show why the chosen approach still wins."
3. For Legal Briefs: Change Sasha Reuben's hiring job to "Construct the opposition's strongest possible argument, then identify where the brief fails to address it."
4. For Academic Papers: Add to Reviewer #2's hiring job: "First state the strongest version of the author's contribution, then identify where even that version overclaims."

---

## Specific Persona Fixes

### High Priority

| Artifact Type | Persona | Current | Fix |
|---------------|---------|---------|-----|
| All finance panels | (New) | N/A | Add "First-Principles Reviewer" — un-anchored to benchmarks, asks "are the benchmarks right?" |
| RFC / ADR | Sven Aaltonen | "Pressure-test alternatives and prior art" | Change to "Steelman the best rejected alternative; pressure-test the chosen approach against it" |
| RFC / ADR | (New or mode) | N/A | Add one persona with load-bearing belief: "The existing system is wrong; show me why replacing it is too expensive" |
| Legal Brief | Sasha Reuben | "Write the response in their head" | Change to "Construct the opposition's strongest argument; show where the brief fails to address it" |
| Academic Paper | Dr. Reviewer #2 | "Find every overclaim" | Add: "First state the strongest version of the contribution" |
| All panels | End-reader proxy | Varies | Add explicit time budget: "Read for N seconds/minutes, then react" |
| Code review | (New mode) | N/A | Add first-impression pass: one reviewer's gut reaction before deep analysis |

### Medium Priority

| Artifact Type | Persona | Current | Fix |
|---------------|---------|---------|-----|
| Series A deck | (Coverage gap) | No high-O persona | Add one persona who asks "what if this is actually bigger than they think?" |
| Financial Model | (Coverage gap) | All anchored to benchmarks | Add un-anchored persona (adjacent-industry or first-principles) |
| Brand Guidelines | (Coverage gap) | No failure-case persona | Add persona whose job is "name the brands that tried this positioning and failed" |
| Patient Health Info | (Good as-is) | Marisol Vega is excellent | Consider adding a caregiver persona (family member helping navigate) |
| Crisis Comms | (Good as-is, 7 personas) | Comprehensive | None needed — best panel in the library |

---

## Panel Composition Rules to Add to Runbook

Add the following to `runbook.md` section 3:

### 3.6 OCEAN balance check

Before emitting, verify the panel covers at least three of five OCEAN dimensions at high intensity:
- High C (detail/compliance): at minimum the auditor and operator slots
- Low A (disagreeableness): at minimum the skeptic slot
- High O (openness/creativity): at minimum one persona whose job is possibility, not critique
- High N or Low N range: at minimum one worry-centric and one steady-state persona

If high-O is missing and the artifact has strategic stakes (pitch deck, PRD, brand guidelines, RFC), add a possibility-finder persona.

### 3.7 Bias anti-correlation check

Before emitting, verify that no more than 3 personas in a panel of 5-6 share the same dominant cognitive bias:
- Anchoring: personas who evaluate against benchmarks, industry norms, or "how we've always done it"
- Confirmation: personas who enter with a strong positive or negative prior
- Status quo: personas whose default is "don't change what works"

If anti-correlation fails, swap the last-added persona for one with a different bias orientation.

### 3.8 System 1 first-impression pass

For artifact types where audience first impression drives adoption (pitch decks, landing pages, press releases, launch announcements, cold emails, README, conference abstracts, patient info), instruct the end-reader proxy to produce a 2-sentence first impression before deep analysis. This impression is reported separately from analytical findings.

### 3.9 Adversarial collaboration weighting

When the editor synthesizes findings:
- Findings where believer and skeptic agree → flag as HIGH CONFIDENCE
- Findings from skeptic only → flag as SKEPTIC-ONLY (expected, may be pessimism)
- Findings from believer only → flag as BELIEVER-FLAGGED (unexpected, high signal — the persona predisposed to approve found a problem)

### 3.10 Minimum dissent threshold

For panels of 6+: require at least 2 skeptics (not just 1). A lone dissenter is overridden even in structural-dissent systems (Janis, 1972; Esser meta-analysis, 1998). Update Pitfall 16 enforcement: ratio floor moves from 4:1 to 3:2.

---

## Citations

- Costa, P. T., & McCrae, R. R. (1992). *Revised NEO Personality Inventory (NEO-PI-R) and NEO Five-Factor Inventory (NEO-FFI) professional manual.* Psychological Assessment Resources.
- Dennett, D. C. (2013). *Intuition Pumps and Other Tools for Thinking.* W. W. Norton.
- Esser, J. K. (1998). Alive and well after 25 years: A review of groupthink research. *Organizational Behavior and Human Decision Processes, 73*(2-3), 116-141.
- Janis, I. L. (1972). *Victims of Groupthink.* Houghton Mifflin.
- Kahneman, D. (2003). A perspective on judgment and choice: Mapping bounded rationality. *American Psychologist, 58*(9), 697-720.
- Kahneman, D. (2011). *Thinking, Fast and Slow.* Farrar, Straus and Giroux.
- Kahneman, D., & Tversky, A. (1974). Judgment under uncertainty: Heuristics and biases. *Science, 185*(4157), 1124-1131.
- Kruger, J., & Dunning, D. (1999). Unskilled and unaware of it: How difficulties in recognizing one's own incompetence lead to inflated self-assessments. *Journal of Personality and Social Psychology, 77*(6), 1121-1134.
- Mellers, B., Hertwig, R., & Kahneman, D. (2001). Do frequency representations eliminate conjunction effects? An exercise in adversarial collaboration. *Psychological Science, 12*(4), 269-275.
- Nickerson, R. S. (1998). Confirmation bias: A ubiquitous phenomenon in many guises. *Review of General Psychology, 2*(2), 175-220.
- Park, W. (2000). A comprehensive empirical investigation of the relationships among variables of the groupthink model. *Journal of Organizational Behavior, 21*(8), 873-887.
- Schwartz, B. (2004). *The Paradox of Choice: Why More Is Less.* Ecco.
- Tetlock, P. E. (2005). *Expert Political Judgment: How Good Is It? How Can We Know?* Princeton University Press.
- Tversky, A., & Kahneman, D. (1979). Prospect theory: An analysis of decision under risk. *Econometrica, 47*(2), 263-292.
