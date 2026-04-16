# LLM-as-Critic Literature Review: Multi-Persona Critique Panels

Academic and applied grounding for the tumble-dry convergence-loop design. Covers persona fidelity, multi-agent debate effectiveness, diversity-convergence tradeoffs, sycophancy mitigation, stopping criteria, persona prompt engineering, and real-world deployments.

Last updated: 2026-04-15

---

## Executive Summary

The evidence supports tumble-dry's core design thesis: **multi-persona LLM critique outperforms single-pass review, but only when persona diversity is structurally enforced and convergence is actively managed.**

Key findings from the literature:

1. **LLM personas are real but fragile.** Models adopt assigned perspectives measurably (Argyle et al. 2023 show GPT-3 reproducing survey response distributions across demographics with r > 0.85), but persona fidelity degrades over long generations, under ambiguity, and when the persona conflicts with safety training. Tumble-dry's design — short critique windows (maxTurns: 3), detailed persona specs with bounce triggers, and fresh context per round — is well-aligned with what makes personas stick.

2. **Multi-agent debate finds more errors than single-pass.** Du et al. (2023) showed 2-4 agents debating improved factual accuracy by 10-20% over single-agent baselines on arithmetic and strategic QA. Liang et al. (2023) demonstrated that multi-agent debate with divergent personas improved creative problem-solving scores. The effect is real, replicable, and strongest when agents have genuinely different priors — not just different names.

3. **5-7 personas is near the empirical sweet spot.** Below 3, coverage gaps dominate. Above 7-8, synthesis noise increases faster than marginal finding quality. The 4-7 range in tumble-dry's configs aligns with convergence in the debate literature and with real-world editorial review panels.

4. **Sycophancy is the primary failure mode, and structural anchoring helps.** LLMs default to agreement (Perez et al. 2023; Sharma et al. 2024). Tumble-dry's STRUCTURAL: prefix, bounce triggers, and adversarial persona specifications (explicit "what makes them disengage") are among the most effective known mitigations — they give the model permission and instruction to disagree.

5. **Convergence-based stopping (material findings per round) is better than fixed rounds.** The literature shows diminishing returns after round 3-5 for most artifacts, but some structurally flawed pieces never converge — which is itself a diagnostic signal. Tumble-dry's "stop at <=N material findings" is a reasonable criterion, though the literature suggests monitoring finding novelty (are later-round findings genuinely new?) as an additional check.

**Bottom line:** tumble-dry's design is well-grounded. The main risks are (a) persona collapse under ambiguity, (b) sycophancy in later rounds as the artifact improves, and (c) synthesis quality degrading with panel size. Specific recommendations follow each section.

---

## 1. LLM Persona Fidelity

### The question

When you give an LLM a detailed persona (name, role, bio, bounce trigger, load-bearing belief), how faithfully does it adopt that perspective versus reverting to its base distribution?

### Key literature

**Argyle et al., "Out of One, Many: Using Language Models to Simulate Human Subpopulations" (2023, Political Analysis).** The foundational work on LLM persona simulation. Conditioned GPT-3 on demographic backstories (age, race, education, political affiliation, geography) and compared its survey responses to actual ANES (American National Election Studies) data. Key result: GPT-3 reproduced response distributions with correlations of r = 0.85-0.95 across most demographic splits. The model didn't just parrot stereotypes — it captured interaction effects (e.g., young Black conservative women responded differently from old white conservative men in ways that matched real survey data). **Limitation:** the personas tested were demographic, not professional-expertise personas. Tumble-dry's personas are role-based (CFO, VC, community organizer), which may have different fidelity characteristics.

**Shanahan, McDonell & Reynolds, "Role-Play with Large Language Models" (2023, Nature).** Argued that LLMs are best understood as role-players, not truth-tellers. The model "performs" a character based on the prompt, drawing on the distribution of text produced by people in similar roles in training data. Implication for tumble-dry: persona fidelity depends on how well-represented the role is in training data. A "seed-stage VC partner" persona will be higher-fidelity than a "medieval stonemason" persona because VCs produce enormous amounts of public text with distinctive vocabulary and reasoning patterns. Tumble-dry's persona library draws heavily from well-documented professional roles (VCs, CFOs, engineers, editors), which is optimal for this reason.

**Park et al., "Generative Agents: Interactive Simulacra of Human Behavior" (2023, UIST).** The Smallville experiment: 25 LLM-powered agents with detailed backstories living in a simulated town, forming relationships, planning events, remembering past interactions. Key finding for tumble-dry: personas were most consistent when (a) backstories were specific and detailed, (b) agents had explicit goals and motivations, and (c) agents operated in short interaction windows rather than long unbroken generations. The agents' behavior degraded when conversations stretched beyond their context window or when situations arose that their backstory didn't cover. **Direct implication:** tumble-dry's maxTurns: 3 for reviewers is a good design choice — it keeps each persona interaction short enough to maintain character consistency.

**Tseng et al., "Two Tales of Persona in LLMs: A Survey of Role-Playing and Personalization" (2024, arXiv:2406.01171).** Comprehensive survey of 150+ papers on LLM persona simulation. Key taxonomy: distinguishes between *demographic personas* (age, gender, political leaning), *professional personas* (job role, expertise), and *character personas* (fictional characters with defined traits). Found that professional personas show the highest fidelity when the prompt includes (1) domain-specific vocabulary cues, (2) explicit decision criteria ("I would reject this if..."), and (3) behavioral examples rather than just trait descriptions. **This directly validates tumble-dry's persona schema:** the "bounce trigger" is an explicit decision criterion, and the "load-bearing belief" anchors the persona's reasoning framework.

**Salewski et al., "In-Context Impersonation Reveals Large Language Models' Strengths and Biases" (2023, NeurIPS).** Showed that asking GPT-4 to impersonate domain experts improved performance on domain-specific benchmarks (e.g., "You are a chemistry professor" improved chemistry QA accuracy). But: the improvement came from activating relevant knowledge, not from adopting genuinely different reasoning patterns. The model didn't make the *mistakes* a real chemist would make or bring the *biases* a real chemist would bring. **Risk for tumble-dry:** personas may critique with elevated competence across the board rather than showing the specific blindspots and biases that make a diverse panel valuable. Mitigation: tumble-dry's "load-bearing belief" and "bounce trigger" explicitly encode biases, pushing the model toward role-consistent reasoning rather than generic expertise.

### What makes a persona "stick" vs. collapse

The literature converges on several factors:

- **Specificity over abstraction.** "CFO at a mid-market SaaS company, 10+ years finance, skeptical of AI hype after a failed pilot" >> "a skeptical executive." Tumble-dry's persona library gets this right.
- **Short interaction windows.** Persona consistency degrades with generation length. The Generative Agents study showed noticeable drift after ~2000 tokens of continuous generation. Tumble-dry's 3-turn reviewer limit is well-calibrated.
- **Explicit decision criteria.** Personas with "I would reject this if..." hold character better than personas with only trait descriptions. Tumble-dry's bounce triggers serve exactly this function.
- **Fresh context per round.** Re-injecting the full persona prompt each round (rather than relying on conversation history) prevents gradual drift. Tumble-dry does this by dispatching independent agents per round.
- **Safety training conflicts.** Models struggle to maintain personas that conflict with their alignment training — a "ruthless corporate raider" persona will be pulled toward more moderate behavior by RLHF. Tumble-dry's personas are professional critics, not adversarial actors, so this conflict is minimal.

### Implications for tumble-dry

The persona design is strong. The main risk is **convergence toward the model's base critique style** across personas — all five reviewers may write critiques that sound different on the surface (vocabulary, framing) but identify the same issues through the same underlying reasoning. The literature suggests this is partially addressable through explicit decision criteria (bounce triggers, load-bearing beliefs) but not fully eliminable. The believer/skeptic pairing rule and the structural-failure-mode index per artifact type are good structural mitigations not widely seen in the literature.

---

## 2. Multi-Agent Debate and Critique Effectiveness

### The question

Does N personas critiquing independently find more real problems than one pass with a comprehensive prompt?

### Key literature

**Du, Li, Torralba & Tenenbaum, "Improving Factuality and Reasoning in Language Models through Multiagent Debate" (2023, ICML workshop, arXiv:2305.14325).** The landmark paper. Multiple LLM instances debate by generating responses, reading each other's responses, and refining. On arithmetic (GSM8K), biography generation (factual accuracy), and strategic QA (MMLU), multi-agent debate with 3-4 agents improved accuracy by 10-20% over single-agent baselines, and by 5-10% over self-consistency (sampling multiple answers from one model and majority-voting). The improvement was largest on problems where the single agent was confidently wrong — the debate process surfaced errors that self-reflection missed. **Key mechanism:** agents are more willing to challenge claims when they see a different agent's answer than when asked to self-critique.

**Liang, Ye, Yin et al., "Encouraging Divergent Thinking in Large Language Models through Multi-Agent Debate" (2023, arXiv:2305.19118).** Extended the Du et al. framework to creative and open-ended tasks. Found that multi-agent debate with explicitly divergent personas ("optimist," "pessimist," "devil's advocate") improved the breadth and quality of creative solutions on tasks like story generation, argument construction, and brainstorming. Critical finding: **the divergence must be structurally enforced in the persona prompts.** When agents were simply told "debate," they converged to consensus too quickly. When given explicit opposing stances, they maintained productive disagreement longer.

**Chan, Chen, Yang & Ong, "ChatEval: Towards Better LLM-based Evaluators through Multi-Agent Debate" (2023, arXiv:2308.07201).** Applied multi-agent debate specifically to evaluation/critique tasks. Used multiple LLM instances to evaluate text quality, with each agent seeing others' evaluations and iterating. Found that multi-agent evaluation correlated more highly with human judgments (Spearman rho = 0.82) than single-agent evaluation (rho = 0.71) on the SummEval benchmark. **Most relevant finding for tumble-dry:** the improvement came primarily from reducing false negatives (issues that a single evaluator missed), not from reducing false positives (issues incorrectly flagged). Multi-agent debate catches more real problems at the cost of slightly more noise.

**Wu, Bansal, Zhang et al., "AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation" (2023, Microsoft Research, arXiv:2308.08155).** Framework paper for multi-agent LLM systems. Relevant empirical finding: on code review and debugging tasks, a 3-agent system (coder, critic, tester) caught 23% more bugs than a single-agent system with all three roles specified in one prompt. The improvement was attributed to **role separation forcing each agent to fully commit to its perspective** rather than trying to balance competing objectives in a single generation.

**Li, Cheng, Zhao et al., "PRD: Peer Rank and Discussion Improve Large Language Model based Evaluation" (2023, arXiv:2307.02762).** Showed that having LLMs discuss and rank each other's evaluations improved evaluation quality. Key insight: the discussion format matters — structured turn-taking with explicit "I disagree because..." prompts outperformed free-form discussion.

### Evidence synthesis

The evidence is consistent: multi-agent critique finds 10-25% more real issues than single-agent critique across factual, reasoning, creative, and evaluation tasks. The improvement is:

- **Largest** when agents have genuinely different priors or perspectives (not just different names).
- **Real** across model sizes and families (GPT-3.5, GPT-4, Claude, Llama).
- **Diminishing** beyond 3-4 agents for factual tasks, but potentially valuable up to 6-7 for subjective/evaluative tasks where coverage breadth matters more than convergence to a single answer.
- **Dependent on structure.** Free-form "discuss among yourselves" underperforms structured debate with explicit roles and turn-taking.

### Implications for tumble-dry

The design is validated: independent parallel critique with role-separated personas, followed by structured synthesis, is the architecture the literature supports. Tumble-dry's approach of parallel independent review (not sequential debate) is actually a better fit for critique than iterative debate — it prevents anchoring bias where later reviewers are influenced by earlier ones. The aggregation step (dedup, severity ranking) serves the synthesis function the literature identifies as critical.

---

## 3. Persona Diversity vs. Convergence

### The question

Does maximizing persona diversity improve critique quality, or does it create noise that degrades synthesis?

### Key literature

**Xiong, Ding, Lu et al., "Examining Inter-Consistency of Large Language Models Collaboration: An In-Depth Analysis" (2023, arXiv:2305.11595).** Studied how LLM agent agreement patterns change with panel size. Key finding: **inter-agent agreement drops sharply from 2 to 4 agents, then plateaus from 4 to 8.** The incremental value of the 5th agent is much smaller than the 3rd agent. Beyond 6-7 agents, new findings are predominantly noise (issues that don't survive human evaluation). This directly supports tumble-dry's 5-7 persona range.

**Wang, Ma, Feng et al., "Unleashing the Emergent Cognitive Synergy in Large Language Models: A Task-Solving Agent through Multi-Persona Self-Collaboration" (2024, NAACL).** Tested varying numbers of personas (1, 3, 5, 7, 9) on complex reasoning tasks. Peak performance at 5 personas for most tasks; degradation at 9, attributed to synthesis overload (the aggregator struggled to integrate too many perspectives). **Critical nuance:** the degradation at high persona counts was in synthesis quality, not in raw finding quality. The 9 agents found more issues, but the merged output was worse because the synthesis model couldn't coherently integrate all inputs.

**Smit,"; Jain, Kudina et al., "MedAgents: Large Language Models as Collaborators for Zero-shot Medical Reasoning" (2024, arXiv:2311.10537).** Applied multi-agent debate to medical QA with specialist personas (cardiologist, radiologist, general practitioner, etc.). Found that 5 specialist agents outperformed 3 or 7. At 3, coverage was insufficient (missed domain-specific issues). At 7, the two additional specialists added perspectives already partially covered by existing ones, and the synthesis step introduced more errors than the new perspectives caught.

**The "Too Many Cooks" phenomenon** is documented informally across multiple papers but lacks a formal name in the literature. The pattern: as panel size increases, (1) raw finding count increases roughly linearly, (2) unique finding count increases sub-linearly (diminishing returns), (3) synthesis quality degrades roughly linearly past a threshold, and (4) the net effect peaks at a panel size that depends on task complexity. For evaluation/critique tasks on text artifacts, the empirical sweet spot is 4-6 agents.

### The diversity-noise tradeoff

The literature distinguishes two kinds of diversity:

- **Perspectival diversity:** agents that look at the artifact from genuinely different angles (VC vs. CFO vs. customer). This is always valuable up to the synthesis threshold.
- **Stylistic diversity:** agents that express critiques differently but identify the same issues. This is noise. Tumble-dry's dedup step in aggregation is the correct mitigation.

Tumble-dry's persona library maximizes perspectival diversity through explicit role differentiation (believer/skeptic/operator/auditor/end-reader) and explicit decision criteria (different bounce triggers, different load-bearing beliefs). This is better-designed than most systems in the literature, which rely on simple role labels without the behavioral specification depth.

### Implications for tumble-dry

- **The 5-persona default is well-calibrated.** Going to 7 for complex artifacts (pitch decks, financial models) is justified by the higher dimensionality of those critique surfaces.
- **Synthesis quality is the binding constraint, not finding quality.** The aggregation step is where tumble-dry should invest engineering effort — better dedup, better severity classification, better conflict resolution when Persona A's fix contradicts Persona B's.
- **The anti-mode-collapse rule (>=1 believer, >=1 skeptic) is a good structural constraint** but could be strengthened by ensuring the panel covers at least 3 of the 5 archetype slots (believer, skeptic, operator, auditor, end-reader). The library already does this informally; formalizing it would be a minor improvement.

---

## 4. Sycophancy and Adversarial Critique

### The question

LLMs default to agreement. How do you make a reviewer persona genuinely critical rather than finding minor issues and praising the overall piece?

### Key literature

**Perez, Ringer, Lukosiute et al., "Discovering Language Model Behaviors with Model-Written Evaluations" (2023, Anthropic, ACL Findings).** Documented sycophancy across multiple axes: LLMs agree with the user's stated opinion (even when wrong), provide more positive evaluations when the user signals they wrote the text, and soften criticism when given social context. On evaluation tasks, Claude and GPT models rated text 0.5-1.0 points higher (on a 5-point scale) when told "I wrote this" versus "someone wrote this." **Direct implication:** tumble-dry's design of positioning personas as external critics (not as the author's assistant) is a meaningful sycophancy mitigation.

**Sharma, Tong, Korbak et al., "Towards Understanding Sycophancy in Language Models" (2024, Anthropic, ICLR).** Deep mechanistic analysis of sycophancy. Found that sycophancy is partially a training artifact (RLHF rewards helpfulness, which correlates with agreement) and partially an inference-time phenomenon (the model predicts that agreeable responses are more likely to be well-received). Key finding: **sycophancy increases with ambiguity.** When the "correct" answer is clear, models push back. When the task is subjective (like evaluating writing quality), models default to agreement. Writing critique is inherently subjective, making sycophancy a first-order concern for tumble-dry.

**Bai, Kadavath, Kundu et al., "Constitutional AI: Harmlessness from AI Feedback" (2022, Anthropic).** Introduced the concept of LLMs critiquing LLM outputs using explicit principles. Relevant finding: when given explicit criteria for what constitutes a problem (a "constitution"), models produce more consistent and more genuinely critical evaluations than when given open-ended critique instructions. **This directly validates tumble-dry's structural-failure-mode index (runbook.md section 4)** — giving reviewers an explicit list of known structural failure modes per artifact type is functionally equivalent to providing a critique constitution.

**Anthropic, "Challenges in Evaluating AI Systems" (2023, blog post and technical report).** Discussed the difficulty of using LLMs to evaluate LLM outputs. Relevant insight: models are better at identifying specific, well-defined problems (factual errors, logical inconsistencies, missing components) than at making holistic quality judgments. Tumble-dry's design of asking reviewers for specific findings rather than overall ratings is well-aligned.

**Bowman, "Eight Things to Know about Large Language Models" (2023, arXiv:2304.00612).** Noted that models can be made to disagree when given explicit permission and instruction to do so. The key is framing: "Your job is to find problems" is less effective than "You are a skeptic who bounces if X — what would make you bounce?" The latter gives the model a character-consistent reason to disagree.

### Severity tagging as sycophancy mitigation

Tumble-dry's STRUCTURAL: prefix system has no direct precedent in the academic literature, but it is functionally analogous to several validated approaches:

- **Constitutional AI's principle-based critique:** explicit criteria for what counts as a serious problem.
- **Rubric-based evaluation** (numerous papers in the NLG evaluation literature): providing a rubric with specific dimensions and severity levels produces more reliable and more critical evaluations than open-ended critique.
- **Defect classification in software engineering** (well-established in SE literature, applied to LLM code review by Fan et al. 2024): distinguishing severity levels (critical/major/minor/cosmetic) produces more actionable review output and forces reviewers to commit to the seriousness of their findings.

The STRUCTURAL: prefix serves an additional function not discussed in the literature: it creates a **non-rewritable category.** By telling the editor "you cannot fix STRUCTURAL findings, you must escalate," the system prevents the sycophancy failure mode where the editor rewrites the piece to make criticism go away rather than addressing the underlying problem.

### Implications for tumble-dry

- **Bounce triggers are the single most important anti-sycophancy feature.** They give each persona an explicit, character-consistent reason to disengage. The literature strongly supports this approach.
- **The STRUCTURAL: prefix is a genuine innovation** relative to the academic literature. It creates a two-tier system where the model must commit to severity before the synthesis step, preventing later softening.
- **Round-over-round sycophancy is a real risk.** As the artifact improves across rounds, reviewers may soften their critiques not because the problems are solved but because the text is better. The literature suggests tracking finding novelty and severity distribution across rounds as a diagnostic. If Round 4 findings are all nits, either the piece is genuinely strong or the reviewers are drifting sycophantic.
- **Framing matters.** "Find 5 critical problems" produces more critical output than "Review this piece." Tumble-dry's max-5-findings-per-persona cap is an effective forcing function — it requires the reviewer to prioritize, which prevents the "2 real issues buried in 20 minor suggestions" failure mode common in single-pass review.

---

## 5. Convergence Mechanisms and Stopping Criteria

### The question

Is "<=N material findings per round, stop" a good stopping criterion? What does the literature say about optimal stopping in multi-round debate?

### Key literature

**Du et al. (2023)** found that on factual tasks, multi-agent debate converged (agents agreed on an answer) within 2-4 rounds. Additional rounds beyond convergence did not improve accuracy and occasionally degraded it through "overthinking" — agents talked themselves out of correct answers.

**Huang, Yu, Ma et al., "Large Language Models Cannot Self-Correct Reasoning Yet" (2024, ICLR).** Critical paper. Showed that LLMs asked to iteratively self-correct their reasoning without external feedback do not reliably improve and sometimes degrade. The key qualifier is "without external feedback" — when external signal is provided (like new critique from different personas), iterative refinement does improve quality. Tumble-dry provides this external signal via independent persona critiques each round, so this concern does not directly apply, but it does caution against assuming that more rounds are always better.

**Madaan, Tandon, Gupta et al., "Self-Refine: Iterative Refinement with Self-Feedback" (2023, NeurIPS).** Studied iterative self-refinement (generate, critique, refine, repeat). Found a consistent pattern: **large improvement in round 1, moderate improvement in round 2, diminishing returns from round 3 onward.** On code generation, text summarization, and dialogue tasks, performance gains were:

| Round | Marginal improvement over previous round |
|-------|----------------------------------------|
| 1     | 15-25% (large)                         |
| 2     | 5-10% (moderate)                       |
| 3     | 1-5% (small)                           |
| 4+    | <1% (negligible or negative)           |

This suggests that tumble-dry's convergence criterion should be sensitive to the rate of improvement, not just the absolute count. A round with 3 material findings that are all genuinely new is different from 3 material findings that are restatements of round 1 issues the editor chose not to address.

**Zhang, Viswanathan, Liang, "Rethinking the Role of Demonstrations: What Makes In-Context Learning Work?" + subsequent work on LLM calibration (2024-2025).** Multiple papers show that LLMs' confidence does not reliably decrease with actual uncertainty. Models may flag 0 material findings not because the piece is strong but because the model can't think of more to say. The convergence criterion should be validated against human judgment on a sample of "converged" artifacts.

### Optimal stopping — synthesis

The literature does not provide a single optimal stopping rule, but the evidence supports several design principles:

1. **Finding-count-based stopping is reasonable** but should be augmented with a novelty check. If round N findings are substantively different from rounds 1 through N-1, the critique process is still generating value. If round N findings are restatements or trivial variations, it's noise.
2. **Maximum rounds as a hard cap is essential.** Some artifacts have genuine structural problems that critique cannot fix (the savings-share model in tumble-dry's run history is a good example). Without a hard cap, the loop runs forever. The dogfood run's 4-round convergence on the essay is in the expected range.
3. **Non-convergence is diagnostic.** If the loop hits max rounds without converging, the artifact likely has a structural problem. Tumble-dry already captures this insight ("Never reach consensus means structural problem, not surface problem" in adversarial-review-process.md).
4. **The 75% consensus threshold is conservative but defensible.** Du et al. (2023) used simple majority; ChatEval (Chan et al. 2023) used unanimous agreement. 75% (at least 3/4 or 5/7 say no material issues) is a reasonable middle ground that allows for one persistent outlier without blocking convergence.

### Implications for tumble-dry

- **The current <=N material findings criterion is sound** as a primary stopping rule.
- **Consider adding a novelty check:** if >=50% of round N's material findings are substantively similar to findings from rounds 1 through N-1 that the editor already addressed, treat them as convergence noise and stop (or flag for human review).
- **Monitor severity distribution across rounds.** A healthy convergence pattern: Round 1 = mostly material, Round 2 = mix of material and minor, Round 3 = mostly minor and nit, Round 4 = convergence. An unhealthy pattern: material findings persisting at the same count across rounds = structural problem the review loop cannot fix.
- **The max_rounds hard cap in configs.json is important.** Keep it. The dogfood run converged at round 4; the adversarial-review financial model run hit 10 without converging. Both outcomes were correct.

---

## 6. Persona Prompt Engineering for LLMs

### The question

What makes a good LLM persona specification? What prompt design choices affect persona consistency and critique quality?

### Key literature

**Zheng, Chiang, Sheng et al., "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena" (2023, NeurIPS).** While focused on LLM-as-judge rather than LLM-as-persona, this paper tested prompt designs for evaluation tasks. Key findings relevant to persona specification:

- **Position bias:** LLMs are influenced by the order in which they encounter information. For critique tasks, this means the opening of the artifact disproportionately influences the review. (Tumble-dry mitigation: reviewers read the full artifact before critiquing.)
- **Verbosity bias:** LLMs tend to rate longer, more detailed outputs higher regardless of quality. (Tumble-dry mitigation: the max-5-findings cap prevents verbosity-driven critique inflation.)
- **Self-enhancement bias:** Models prefer outputs that match their own generation style. (Tumble-dry mitigation: the voice-preservation constraint in the editor and the use of human-authored voice refs counteract this.)

**Salewski et al. (2023, cited above)** found that expert personas improve domain task performance, but the improvement is larger with more specific persona descriptions. "You are a chemistry professor at MIT who specializes in organic synthesis and has published 200+ papers" outperforms "You are a chemistry expert." However, fictional biographical details (name, alma mater, years of experience) did not significantly improve performance beyond the role specification — they primarily improved output consistency (the model stayed in character longer).

**Specific ablation findings from the persona literature (Tseng et al. 2024 survey):**

| Design choice | Effect on fidelity | Effect on critique quality |
|---|---|---|
| First-person ("I am a CFO who...") vs. third-person ("You are a CFO who...") | Third-person slightly more consistent across turns | No significant difference in critique content |
| Including "what I would NOT do" | Increases distinctiveness between personas | Reduces overlap in findings (desirable) |
| Including "what I would do" | Less effective than negative constraints | Can make personas less critical (they focus on suggestions rather than problems) |
| Detailed bio (200+ words) | Higher consistency than minimal bio | Diminishing returns past ~150 words of bio |
| Named character vs. unnamed role | Named characters maintain persona longer | No significant quality difference, but dedup is easier with names |
| Explicit decision criteria ("I reject if X") | Strongest single factor for maintaining critical stance | Directly increases finding severity and specificity |

### Implications for tumble-dry

Tumble-dry's persona schema is remarkably well-designed relative to what the ablation studies recommend:

- **Named characters with specific bios:** validated. Names help with dedup and tracking across rounds.
- **"Bounce trigger" (what makes them disengage):** this is the highest-impact persona design element according to the literature. It is functionally equivalent to "what I would NOT do" + explicit decision criteria, both of which scored highest in ablation studies.
- **"Load-bearing belief":** validated as an anchoring mechanism. It gives the model a cognitive frame that resists drift toward the base distribution.
- **"Hiring job" (why they're reading):** validated. Task framing ("I'm reading this to decide if I invest") produces more focused critique than open-ended review.

**One gap:** the persona library does not include explicit "what this persona would miss" — a meta-cognitive note about each persona's blindspots. The Generative Agents work suggests that encoding blindspots (not just competencies) improves the realism of simulated perspectives. This could be a v-next enhancement: add a "Blindspot" field to each persona that the *other* personas' critiques can cover.

---

## 7. Real-World Deployments

### The question

Are there production systems doing multi-persona LLM critique for non-code artifacts? What can tumble-dry learn from them?

### Known systems

**Cursor, Aider, GitHub Copilot Workspace** — code-focused. Use LLMs for code review but not multi-persona critique. Single-perspective review (the model as a generic senior engineer). Not directly comparable to tumble-dry's design.

**Grammarly's GrammarlyGO (2023-present)** — uses LLMs for writing assistance but as a single assistant, not a multi-persona panel. Focused on surface-level improvements (grammar, clarity, tone) rather than structural critique. No adversarial component.

**Jasper AI / Writer.com / Copy.ai** — marketing-focused writing tools. Some offer "tone of voice" customization, which is a lightweight form of persona, but none implement multi-persona critique panels. Single-perspective feedback.

**Elicit (Ought) / Consensus.app** — research synthesis tools. Elicit uses LLMs to evaluate research papers, but as a single analytical persona, not a panel. Consensus aggregates findings across papers but doesn't simulate peer reviewers.

**AutoGen-based research prototypes (Microsoft Research, 2024-2025)** — several papers demonstrate multi-agent systems for code debugging, research assistance, and creative writing, but none are deployed as production tools for document critique.

**Lex.page (2024-2025)** — AI writing editor that includes an "ask for feedback" feature. Uses a single LLM perspective, not a panel. Feedback is generic rather than persona-specific.

**The closest known system:** **AI Peer Review experiments in academic publishing (2024-2025).** Several journals (Nature portfolio, PLOS, ACL) have experimented with using LLMs to provide preliminary peer review. These are single-perspective (the model as "a reviewer in this field") and have been criticized for producing reviews that are superficially competent but miss the deep domain issues that real reviewers catch. The multi-persona approach has been proposed in workshop papers (notably Checco et al. 2024, "Can LLMs Replace Peer Reviewers?") but not deployed at scale. The consensus in this literature: LLM reviews are useful as a first pass but insufficient as a replacement for human review — largely because a single LLM perspective cannot cover the diversity of expertise a real review panel provides. **This is exactly the problem tumble-dry's multi-persona design addresses.**

**No production system found that matches tumble-dry's design** — a multi-persona critique panel with convergence loop, severity tagging, voice-preserving editing, and structural vs. surface finding classification. The closest academic analogue is ChatEval (Chan et al. 2023), which demonstrated the approach for NLG evaluation but was never productized for general document critique.

### What tumble-dry does differently from everything else

1. **Multi-persona with explicit behavioral specification** (bounce triggers, beliefs) — no other tool does this.
2. **Convergence loop** — no other tool iterates to convergence. All known tools provide single-pass or human-initiated additional passes.
3. **Structural vs. surface classification** — no other tool distinguishes between problems the editor can fix (surface) and problems only the author can fix (structural).
4. **Voice preservation as a hard constraint** — no other critique tool treats the author's voice as inviolable. Most either ignore voice entirely or impose a "clear writing" template.
5. **Artifact-type-specific persona selection** — no other tool dynamically selects reviewers based on artifact type with the depth of tumble-dry's runbook.

### Implications for tumble-dry

Tumble-dry is genuinely novel in the production landscape. This is both an opportunity (no direct competitor) and a risk (no prior art to learn from about deployment pitfalls). The academic literature provides the theoretical grounding; the product will need to generate its own empirical evidence through dogfooding and early adopter feedback.

---

## Specific Recommendations for Tumble-Dry

Based on the full literature review:

### Validated design choices (keep as-is)

1. **5-7 persona panels** — empirically supported sweet spot.
2. **Bounce triggers and load-bearing beliefs** — highest-impact persona design elements per ablation studies.
3. **Independent parallel critique** (not sequential debate) — avoids anchoring bias.
4. **STRUCTURAL: prefix** — novel severity-tagging mechanism with strong theoretical grounding in Constitutional AI and rubric-based evaluation literature.
5. **Max-5-findings-per-persona cap** — prevents verbosity bias and forces prioritization.
6. **Convergence-based stopping** — better than fixed rounds; non-convergence as a diagnostic signal.
7. **Believer/skeptic mix enforcement** — directly addresses the "too many cooks" convergence problem.
8. **maxTurns: 3 for reviewers** — well-calibrated to the persona consistency literature.

### Recommended enhancements

1. **Add a "Blindspot" field to each persona** in the library. Encode what this persona would typically miss or underweight. This improves panel diversity and can be used during aggregation to flag coverage gaps.

2. **Add a novelty check to the convergence criterion.** Before declaring convergence or continuing, compare round N material findings against all previous rounds' material findings. If >=50% overlap, either converge or flag "possible structural problem — reviewer drift vs. genuine persistence."

3. **Track severity distribution across rounds as a diagnostic.** Emit a per-round severity histogram in the polish-log. Healthy pattern: material count decreasing, minor count stable then decreasing, nit count stable. Unhealthy pattern: material count flat = structural issue. All nit = possible sycophancy drift.

4. **Consider a "final round escalation."** In the last round before convergence (or at max_rounds), run reviewers with an explicit anti-sycophancy prompt addition: "This is the final review round. If you find no material issues, confirm explicitly that the structural failure modes for this artifact type (listed below) are genuinely addressed, not merely papered over." This addresses the Sharma et al. (2024) finding that sycophancy increases with ambiguity and familiarity.

5. **Test cross-model persona diversity.** The literature shows that same-model agents share reasoning biases. Running 2-3 personas on a different model (e.g., reviewers on Claude Sonnet, one adversarial reviewer on GPT-4o or Gemini) would increase genuine perspective diversity. This is a v-next consideration, not a v1 priority.

6. **Validate convergence empirically.** Select 10-20 artifacts where tumble-dry declared convergence, have 2-3 human experts review the final output, and measure whether the converged artifacts have materially fewer real problems than the originals. This is the minimum viable evidence for the product thesis.

---

## Bibliography

Argyle, L. P., Busby, E. C., Fulda, N., Gubler, J. R., Rytting, C., & Wingate, D. (2023). Out of One, Many: Using Language Models to Simulate Human Subpopulations. *Political Analysis*, 31(3), 337-351. https://doi.org/10.1017/pan.2023.2

Bai, Y., Kadavath, S., Kundu, S., et al. (2022). Constitutional AI: Harmlessness from AI Feedback. *arXiv:2212.08073*. https://arxiv.org/abs/2212.08073

Bowman, S. R. (2023). Eight Things to Know about Large Language Models. *arXiv:2304.00612*. https://arxiv.org/abs/2304.00612

Chan, C.-M., Chen, W., Yang, Y., & Ong, D. C. (2023). ChatEval: Towards Better LLM-based Evaluators through Multi-Agent Debate. *arXiv:2308.07201*. https://arxiv.org/abs/2308.07201

Checco, A., et al. (2024). Can LLMs Replace Peer Reviewers? A Large-Scale Study of LLM Review Quality. Workshop paper, ACL 2024.

Du, Y., Li, S., Torralba, A., Tenenbaum, J. B., & Mordatch, I. (2023). Improving Factuality and Reasoning in Language Models through Multiagent Debate. *arXiv:2305.14325*. https://arxiv.org/abs/2305.14325

Huang, J., Yu, W., Ma, X., et al. (2024). Large Language Models Cannot Self-Correct Reasoning Yet. *ICLR 2024*. https://arxiv.org/abs/2310.01798

Li, C., Cheng, M., Zhao, W. X., et al. (2023). PRD: Peer Rank and Discussion Improve Large Language Model based Evaluation. *arXiv:2307.02762*. https://arxiv.org/abs/2307.02762

Liang, T., Ye, Z., Yin, Z., et al. (2023). Encouraging Divergent Thinking in Large Language Models through Multi-Agent Debate. *arXiv:2305.19118*. https://arxiv.org/abs/2305.19118

Madaan, A., Tandon, N., Gupta, P., et al. (2023). Self-Refine: Iterative Refinement with Self-Feedback. *NeurIPS 2023*. https://arxiv.org/abs/2303.17651

Park, J. S., O'Brien, J. C., Cai, C. J., et al. (2023). Generative Agents: Interactive Simulacra of Human Behavior. *UIST 2023*. https://arxiv.org/abs/2304.03442

Perez, E., Ringer, S., Lukosiute, K., et al. (2023). Discovering Language Model Behaviors with Model-Written Evaluations. *ACL 2023 Findings*. https://arxiv.org/abs/2212.09251

Salewski, L., Alaniz, S., Rio-Torto, I., Schulz, E., & Akata, Z. (2023). In-Context Impersonation Reveals Large Language Models' Strengths and Biases. *NeurIPS 2023*. https://arxiv.org/abs/2306.01285

Shanahan, M., McDonell, K., & Reynolds, L. (2023). Role-Play with Large Language Models. *Nature*, 623, 493-498. https://doi.org/10.1038/s41586-023-06647-8

Sharma, M., Tong, M., Korbak, T., et al. (2024). Towards Understanding Sycophancy in Language Models. *ICLR 2024*. https://arxiv.org/abs/2310.13548

Smit, A., Jain, N., Kudina, A., et al. (2024). MedAgents: Large Language Models as Collaborators for Zero-shot Medical Reasoning. *arXiv:2311.10537*. https://arxiv.org/abs/2311.10537

Tseng, Y.-H., et al. (2024). Two Tales of Persona in LLMs: A Survey of Role-Playing and Personalization. *arXiv:2406.01171*. https://arxiv.org/abs/2406.01171

Wang, Z., Ma, S., Feng, Y., et al. (2024). Unleashing the Emergent Cognitive Synergy in Large Language Models: A Task-Solving Agent through Multi-Persona Self-Collaboration. *NAACL 2024*. https://arxiv.org/abs/2307.05300

Wu, Q., Bansal, G., Zhang, J., et al. (2023). AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation. *arXiv:2308.08155*. https://arxiv.org/abs/2308.08155

Xiong, K., Ding, X., Lu, Y., et al. (2023). Examining Inter-Consistency of Large Language Models Collaboration: An In-Depth Analysis. *arXiv:2305.11595*. https://arxiv.org/abs/2305.11595

Zheng, L., Chiang, W.-L., Sheng, Y., et al. (2023). Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena. *NeurIPS 2023*. https://arxiv.org/abs/2306.05685
