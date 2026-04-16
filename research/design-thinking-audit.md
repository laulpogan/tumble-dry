# Design Thinking Audit: tumble-dry Persona Library

Audit of the ~200-persona library across 40 artifact types against six frameworks from persona design, UX research, and Jobs-to-be-Done theory.

Date: 2026-04-15

---

## Executive Summary

The tumble-dry persona library is unusually strong for a synthetic persona system. The mandatory four-field schema (name/role, hiring job, bounce trigger, load-bearing belief) enforces behavioral specificity that most persona libraries lack. The believer/skeptic pairing rule and the panel composition rule (believer + operator + auditor + skeptic + end-reader) prevent mode collapse structurally.

That said, the audit surfaces six systemic issues:

1. **Behavioral duplication across panels** — roughly 15-20% of personas are behaviorally identical to a persona in an adjacent panel, differentiated only by domain vocabulary. The library has ~200 named personas but closer to ~155-165 behaviorally unique roles.
2. **Malformed JTBDs** — hiring jobs capture motivation but rarely capture situation or outcome. They read as task descriptions, not jobs.
3. **Missing engagement triggers** — every persona has a bounce trigger (what makes them leave) but none have an engagement trigger (what makes them champion). This produces critique-only panels.
4. **Thin inclusive-design coverage** — the library has exactly one non-native English speaker (Marisol Vega, Patient-Facing Health Info), one mobile-user persona (Mobile User on a Train, Landing Page), and zero personas representing cognitive-load-constrained readers across the 30+ non-health artifact types.
5. **No anti-persona methodology** — the runbook's "Out of Scope" operates at artifact level, not persona level. No panel defines who the document is NOT for.
6. **No decay mechanism** — personas reference market conditions (GPU startups, SaaS benchmarks, regulatory regimes) that will go stale. No freshness protocol exists.

Estimated effort to remediate: 2-3 sessions of focused library edits, plus 4 new runbook rules.

---

## 1. Cooper's Behavioral Variables Analysis

### Framework

Alan Cooper's persona methodology ("The Inmates Are Running the Asylum," 1999; "About Face," 4th ed., 2014) argues personas must be constructed from behavioral variables — observable patterns in how people use systems, make decisions, and prioritize — not from demographic attributes. Two personas who exhibit the same behavior when reading a document are one persona wearing two hats, regardless of differences in name, title, company, or background.

Cooper's key tests:
- **Behavioral axis mapping:** place each persona on axes of behavior (e.g., risk tolerance, time budget, decision authority, domain depth). Two personas at the same coordinates on all axes are duplicates.
- **Goal differentiation:** each persona must have a unique goal that no other persona in the panel shares.
- **Elastic user prevention:** a persona that could mean anything to anyone is not a persona.

### Assessment

The library passes Cooper's tests at the panel level — within any single artifact type, the 5-7 personas are behaviorally distinct along clear axes: decision authority (LP vs. GP vs. founder), risk posture (believer vs. skeptic), operational proximity (operator vs. observer), and domain depth (specialist vs. generalist). The panel composition rule (believer + operator + auditor + skeptic + end-reader) enforces Cooper's behavioral-axis requirement by design.

**Cross-panel duplication is the problem.** When comparing personas across artifact types, behavioral duplicates emerge:

| Behavioral role | Personas sharing it | Behaviorally distinct? |
|---|---|---|
| "Auditor who reconciles claims to source data" | Sasha Mendel (Series A), Lena Voss (Financial Model), Carla Ruth (Board Memo), Tomás Ribeiro (Clinical Abstract) | Partially — Sasha and Lena are near-identical; Carla and Tomás have distinct domains but identical behavior |
| "On-call SRE / 3 a.m. operator" | Ines Carvalho (RFC), Frances Idemudia (Runbook + Code), Ben Olafsson (API), Niko Lazaridis (Migration), Jules Akinwale (Threat Model) | Frances is distinct (execution focus); others differ mainly by which artifact they read, not how they read it |
| "Securities/compliance lawyer" | Elena Voss (Press Release + Earnings), Hon. Robert Kang (Crisis), General Counsel (Earnings Call) | Elena appears in two panels with identical behavior — she IS a duplicate of herself |
| "Skeptical journalist/reporter" | Maya Okonkwo (Press Release), Marcus Wei (Crisis), Bjorn Naess (M&A), Financial Reporter (Earnings) | Maya and the Financial Reporter have the same behavior (find the lede); Bjorn and Marcus are distinct (angle-hunting vs. contradiction-hunting) |
| "Hostile end-reader" | Hacker News Reader (Press Release), infosec_skeptic (Crisis), Skeptical Engineer (Launch Post) | Behaviorally identical — all three read for the gap between marketing and technical reality |

**Estimated behavioral duplicates: 30-45 personas** out of ~200 are duplicates of another persona in a different panel, distinguishable only by artifact-type vocabulary. This is not necessarily wrong — the library is organized by artifact type, so some role-repetition is structural. But it means the library's effective behavioral diversity is ~155-165 unique roles, not ~200.

### Recommendations

1. **Create a behavioral-role taxonomy** as a cross-reference appendix. Name the ~20 archetypal behavioral roles (Auditor, Operator, Skeptic-Journalist, Hostile-Reader, Compliance-Gatekeeper, Layman-Proxy, etc.) and tag each persona with their archetype. This makes duplication visible and intentional.
2. **Merge Elena Voss** — she appears in two panels (Press Release and Earnings IR) with identical fields. Either make her a named cross-panel persona with a single definition, or differentiate her bounce triggers per artifact type.
3. **Don't reduce the count** — Cooper argues for minimum viable persona sets within a *product*, but tumble-dry's panels are per-artifact-type. Cross-panel duplication is acceptable if each panel's internal composition is behaviorally complete. The taxonomy just makes the structure legible.

---

## 2. Jobs-to-be-Done (JTBD) Analysis

### Framework

Jobs-to-be-Done theory (Christensen, "Competing Against Luck," 2016; Ulwick, "What Customers Want," 2005; Klement, "When Coffee and Kale Compete," 2018) holds that customers "hire" products for a job. A well-formed JTBD follows the structure:

> When I'm [situation/context], I want to [motivation/action], so I can [expected outcome].

The three components are:
- **Situation:** the circumstance that creates the need (not the persona's identity)
- **Motivation:** the progress the persona seeks
- **Outcome:** the measurable result

Ulwick's Outcome-Driven Innovation adds that jobs should be stable over time (the job doesn't change even when the technology does) and functional (not emotional or social, though those are separate job dimensions).

### Assessment

The library's "hiring job" field maps directly to JTBD but is structurally incomplete. Current hiring jobs read as **motivation-only** statements — they capture what the persona wants to do but omit situation and outcome.

**Examples of current vs. well-formed JTBD:**

| Persona | Current hiring job | Well-formed JTBD |
|---|---|---|
| Maya Park (Seed) | "Decide in 90 seconds whether to take the meeting." | When I'm scanning 30 decks this week with 2 partner-meeting slots left, I want to decide in 90 seconds whether to take the meeting, so I can protect my time for the best 2 deals. |
| Frances Idemudia (Runbook) | "Execute at 3 a.m. with no context." | When I'm paged at 3 a.m. and haven't touched this service in weeks, I want to execute the runbook without needing prior context, so I can resolve the alert before it escalates to SEV-1. |
| Devon Marsh (TOS) | "Summarize obligations and rights." | When I'm signing up for a new service and the TOS is 12 pages, I want to identify my obligations, data exposure, and exit rights, so I can decide whether the service is worth the tradeoff. |

The current one-liners work as shorthand — they're punchy and memorable, which matters for an LLM that needs to stay in character. But they systematically omit the **situation** (what triggered the reading) and the **outcome** (what changes after). This matters because:

- Without situation, the persona reads every artifact the same way regardless of urgency or context.
- Without outcome, the persona can critique but can't evaluate "is this artifact doing its job?" A persona who knows their outcome can say "this document achieves what I hired it for" — an engagement signal, not just a bounce signal.

### Recommendations

1. **Don't rewrite all 200 hiring jobs** — the current one-liners are effective as in-character prompts. Instead, add a `hiring_context` field per persona that provides the Christensen-format JTBD. This gives the LLM richer context without losing the punchiness of the one-liner.
2. **Prioritize situation-enrichment for 5 artifact types** where context most affects review behavior: pitch decks (what round is the VC in? how many decks this week?), postmortems (is this 48 hours after the incident or 2 weeks?), crisis comms (is the news already out?), board memos (is this pre-brief or day-of?), and cold emails (is this the 6th or the 60th today?).
3. **Add outcome to bounce triggers** — bounce triggers currently say "what makes them leave" but not "what would make them act." E.g., Maya Park bounces on TAM-first decks — but what makes her *forward the deck to her partner*? That's the outcome side of the JTBD.

---

## 3. IDEO / Stanford d.school Empathy Mapping

### Framework

The d.school empathy map (Osterwalder adaptation; IDEO HCD Toolkit, 2015) asks four questions per persona:
- **Think:** what are they thinking during the experience? (private beliefs, concerns)
- **Feel:** what emotions drive their behavior? (anxiety, excitement, boredom, obligation)
- **Say:** what do they literally say or write? (observable output)
- **Do:** what actions do they take? (observable behavior)

Plus two fields the d.school later added:
- **Pain:** frustrations, obstacles, risks
- **Gain:** wants, needs, measures of success

### Assessment

The library's four-field schema maps partially to the empathy map:

| Empathy map quadrant | Library field | Coverage |
|---|---|---|
| Think | Load-bearing belief | Strong — every persona has an explicit belief |
| Feel | (none) | Missing |
| Say | (none) | Missing (implied by the review output, but not specified) |
| Do | Hiring job | Partial — captures the task but not the broader behavior pattern |
| Pain | Bounce trigger | Strong — every persona has explicit frustrations |
| Gain | (none) | **Missing — this is the critical gap** |

**The missing "gain" quadrant is the audit's most actionable finding.** Every persona knows what makes them *disengage* (bounce trigger) but no persona knows what makes them *engage* (gain trigger / championing trigger). This means:

- Panels produce critique-only output. No persona is equipped to say "this is actually excellent because [specific gain signal]."
- The believer/skeptic pairing is structural but behavioral: believers are labeled as such in the pairing line but their fields (hiring job, bounce trigger, belief) are identical in kind to the skeptics'. A believer persona like Maya Park has a bounce trigger ("Slide 1 doesn't tell her what the company does") but no explicit *championing trigger* ("Slide 1 nails the contrarian insight — she's texting her partner before slide 3").
- This creates an asymmetry: the panel is good at saying "this fails because..." but has no vocabulary for "this succeeds because..." Reviewers who only critique produce documents optimized for not-failing rather than for winning.

### Recommendations

1. **Add a `championing trigger` field** to every persona. This is the inverse of the bounce trigger: the specific signal that makes this persona advocate for the artifact. Examples:
   - Maya Park: "Founder articulates one contrarian insight that reframes the market — she's texting her partner before slide 3."
   - Frances Idemudia: "Runbook has a diagnostic decision tree, every command is copy-pasteable, prerequisites are on line 1 — she'd add this to the team's onboarding doc."
   - Aisha Bello (Crisis): "Statement names the specific harm, says what they're doing, and includes a direct contact — she shares it with her community group as evidence of accountability."
2. **Require reviewers to output at least one championing observation** per review. The prompt instruction would be: "If any element of this artifact would trigger your championing response, name it explicitly. Not every review must champion — but every review must check."
3. **Add a `feel` field** to a subset of high-stakes personas (crisis comms, patient-facing health, pitch decks) where emotional state materially affects reading behavior. Aisha Bello is angry and scared; the retail investor on r/investing is anxious and time-pressured; Marisol Vega is confused and potentially afraid. These emotions change what "good" looks like.

---

## 4. Inclusive Design / Persona Spectrum Analysis

### Framework

Microsoft's Inclusive Design methodology (Kat Holmes, "Mismatch," 2018; Microsoft Inclusive Design Toolkit, 2016) argues that designing for users at the margins of ability, expertise, and access produces better outcomes for everyone. The framework defines three rings of exclusion:

- **Permanent:** e.g., blind, deaf, one-armed
- **Temporary:** e.g., eye infection, ear infection, arm in cast
- **Situational:** e.g., distracted driver, noisy bar, carrying a baby

Applied to document review, the relevant exclusion dimensions are:
- **Language access:** non-native English speakers, varying literacy levels
- **Device/channel access:** mobile readers, screen-reader users, readers in low-bandwidth environments
- **Cognitive load:** busy executives scanning on phone, sleep-deprived on-call engineers, patients receiving bad news
- **Domain expertise:** ranges from deep specialist to complete newcomer

### Assessment

The library handles the **domain-expertise spectrum** well. Most panels include an end-reader proxy (layman, retail investor, consumer, newcomer, student persona) alongside domain specialists. The code-review panel's replacement of "layman" with "new-hire-in-6-months" is a thoughtful adaptation — laypeople don't read code, but new hires do.

**Language access is nearly absent.** The only persona with explicit non-native-English-speaker characteristics is Marisol Vega (Patient-Facing Health Info), who is "Spanish-dominant" and "reads at ~5th-grade level in English." No other panel has a non-native English speaker. This matters for:
- Landing pages (global traffic)
- Developer docs (majority of developers worldwide are non-native English speakers)
- Open-source READMEs (international contributor base)
- Contracts/TOS (global user base)
- Cold emails (international prospects)

**Device/channel access is nearly absent.** Only one persona (Mobile User on a Train, Landing Page panel) explicitly reads on mobile. No persona reads via screen reader. No persona reads in a low-bandwidth environment. Given that:
- 58% of pricing-page traffic is mobile (the library itself cites this)
- Developer docs are commonly read on a second monitor or phone while coding
- Investor updates are frequently read on phones during commutes
- Board memos are increasingly read on tablets

...the library under-represents mobile and constrained-device readers.

**Cognitive-load constraints are implicit but not explicit.** Several personas imply cognitive load (Frances Idemudia at 3 a.m., Sandra Klepner updating her model in 4 hours, Maya Park at 90 seconds per deck) but none explicitly name cognitive load as a design constraint. The difference matters: "reads in 90 seconds" is a time constraint; "reads in 90 seconds while simultaneously evaluating whether to cancel her next meeting" is a cognitive-load constraint that changes what "scannable" means.

### Recommendations

1. **Add a `Non-Native English Reader` persona** to 5 high-international-traffic panels: Developer Docs, Open-Source README, Landing Page, Contract/TOS, and API Design Doc. This persona's hiring job is "complete the task in my second language without misunderstanding a critical term." Bounce trigger: "idioms, culturally specific metaphors, undefined acronyms, sentences requiring native-level parsing." This is a single archetype instantiated per panel, not 5 new unique personas.
2. **Add a `Mobile/Constrained Reader` persona** to 4 panels where mobile readership is documented or obvious: Investor Update, Board Memo, Newsletter, and Press Release. Hiring job: "Extract the key number and forward to my group chat while walking." Bounce trigger: "content requiring horizontal scroll, tables wider than portrait viewport, modals that don't dismiss."
3. **Annotate existing personas with cognitive-load context** rather than creating new personas. Add a one-line `cognitive context` note to the 10-15 personas whose reading conditions most affect review quality. Examples: "Frances: paged at 3 a.m., sleep-deprived, reading on a laptop in bed." "Maya Park: 30th deck this week, deciding between this and lunch." This is lighter than a new field — it enriches the existing bio line.

---

## 5. Anti-Persona Methodology

### Framework

Anti-personas (negative personas, exclusion personas) define who the product or artifact is explicitly NOT designed for. Cooper discusses this briefly; it's elaborated in Pruitt & Adlin ("The Persona Lifecycle," 2006) and in Harley's NNGroup article on anti-personas (2018). The purpose is threefold:

1. **Prevent scope creep** — without naming who you're NOT writing for, reviewers optimize for everyone, which means no one.
2. **Resolve disagreements** — when two reviewers conflict, the anti-persona resolves it: "we're not writing for person X, so reviewer Y's objection is out of scope."
3. **Sharpen tone** — knowing who you exclude sharpens the voice for who you include.

### Assessment

The library has no anti-personas. The runbook's "Out of Scope" section handles artifact-level exclusion (e.g., "don't treat a shell script as a PRD") but never persona-level exclusion.

This creates a real problem in practice. Consider:

- **Pitch deck panels** — is the deck for the GP or the associate? If the associate (screening), the deck needs to survive low-context scanning. If the GP (conviction), the deck needs depth. Both personas are in the panel, but which one is the anti-persona for a given deck? The panel currently tries to satisfy both, which is the exact failure mode anti-personas prevent.
- **Developer docs** — is this doc for the power user or the beginner? If it's a tutorial, the power user is the anti-persona (they should be reading the reference). If it's a reference, the beginner is the anti-persona. The Diataxis framework handles this at the mode level, but the panel doesn't explicitly exclude.
- **Press releases** — is this for the reporter or the customer? If it's a funding announcement, the reporter is primary and the customer is secondary. If it's a product launch, the customer is primary. The current panel includes both but doesn't indicate primacy.

### Recommendations

1. **Add an `anti-persona` line to each panel header**, parallel to the believer/skeptic pairing line. Format: `Anti-persona (this artifact is NOT optimized for): [name/description]`. This is NOT a new persona with full fields — it's a one-line exclusion statement.
2. **Implement anti-persona as a runbook rule** in Section 3 (mix-and-match): "Before emitting the panel, identify and state the anti-persona. If a reviewer's critique aligns with what the anti-persona would want, flag the critique as `OUT-OF-SCOPE:` rather than `STRUCTURAL:`."
3. **Start with 5 artifact types** where anti-persona ambiguity most affects review quality:
   - Pitch decks: anti-persona = the tire-kicker with no check-writing authority
   - Developer docs: anti-persona = the mode-mismatched reader (beginner in reference, expert in tutorial)
   - Press releases: anti-persona varies by sub-type (funding = anti-persona is the customer; product launch = anti-persona is the reporter without the product context)
   - Crisis comms: anti-persona = the internal employee (they get a different artifact)
   - Cold emails: anti-persona = the prospect who isn't in-market (don't optimize for warming cold leads, optimize for converting warm ones)

---

## 6. Persona Decay / Staleness

### Framework

Cooper (2004, revised in "About Face" 4th ed.) warns that personas go stale as markets, technologies, and user behaviors evolve. Nielsen Norman Group's guidance (Harley, 2015) recommends reviewing personas every 12-18 months or after a major market shift. Pruitt & Adlin's "Persona Lifecycle" framework defines four stages: conception, gestation, maturation, and retirement — and notes that most organizations skip retirement, leaving zombie personas in circulation.

### Assessment

The tumble-dry library is static markdown with no freshness mechanism. Several personas reference market conditions that have a shelf life:

| Persona | Time-sensitive element | Staleness risk |
|---|---|---|
| Helena Borg (Seed) | "use of 'ARR' before $1M of recurring revenue exists" | Medium — the ARR-threshold norm may shift with market conditions |
| Nathan Greaves (Series A) | "CAC payback > 24 months presented as healthy" | High — benchmark thresholds shift with interest rates and capital availability |
| Eleanor Wachowski (Late-stage) | "Rule of 40 >= 40" | Medium — the Rule of 40 itself is under debate; some investors now use Rule of X |
| Marcus Tanaka (Late-stage) | "vs. public alternative" | Low — structural, not cyclical |
| Yusra Khalil (Policy) | "Chevron/Loper-Bright challenges" | High — Loper Bright (2024) overturned Chevron; legal landscape still evolving |
| Renata Oduya (TOS) | "Cancellation asymmetric with signup" — FTC click-to-cancel rule | High — regulatory specifics change |
| Dr. Imani Faulkner (ML) | "pre-register the eval" | Medium — eval norms in ML are still evolving rapidly |

The library also embeds cultural references (Hacker News reader, r/investing, fintwit) whose platform relevance may shift — though the underlying behavior (hostile technical reader, retail investor, real-time financial commentator) is stable.

**No mechanism exists to detect or trigger persona updates.** The library has no version dates, no review-by dates, no changelog, and no automated staleness detection.

### Recommendations

1. **Add a `last_validated` date** to each panel header (not each persona — panels share a temporal context). Format: `Last validated: 2026-04`. Review cadence: every 12 months, or immediately after a major market/regulatory shift.
2. **Add a `market_assumptions` line** to panels with time-sensitive thresholds. This line lists the 1-3 assumptions that, if they change, invalidate the panel's calibration. Examples:
   - Seed deck: "Assumes seed rounds are <$5M, ARR expectation is nascent, YC batch size ~200."
   - Policy memo: "Assumes post-Loper-Bright deference regime; Circular A-4 2023 revision in effect."
   - Late-stage deck: "Assumes Rule of 40 as primary efficiency metric; public SaaS multiples in 5-10x revenue range."
3. **Create a staleness-detection rule** in the runbook: "When generating a panel for an artifact that references specific benchmarks, thresholds, or regulatory regimes, the audience-inferrer should compare the artifact's assumptions against the panel's `market_assumptions`. If they diverge (e.g., the artifact references Rule of X while the panel assumes Rule of 40), log a `STALE_PANEL` warning and note the divergence in the reviewer brief."
4. **Establish a lightweight changelog** in the library header: a 5-10 line log of substantive panel edits, so future editors know what was changed and why. This is not a full version-control system — git provides that — but a human-readable "what changed and why" for the file's primary reader (the audience-inferrer agent).

---

## Specific Fixes Per Artifact Type

### Pitch Decks (Seed, Series A, Late-stage)

- Add anti-persona: "tire-kicker without check-writing authority" (Seed), "tourist fund doing diligence for market intel" (Series A), "retail investor reading the TechCrunch summary" (Late-stage)
- Enrich Maya Park and Priya Iyer hiring jobs with situation context (deck count this week, meeting slots remaining)
- Add championing trigger to all believer personas (what makes them forward the deck)
- Add `market_assumptions` line to all three panels

### Developer Docs / README / API Design

- Add Non-Native English Reader persona to all three panels
- Add anti-persona per Diataxis mode (tutorial anti-persona = power user; reference anti-persona = beginner)
- Add championing trigger to Felix Andrade (tutorial) and Naomi Glassman (reference): what does a doc that earns a bookmark look like?

### Financial Models / Board Memos / Investor Updates

- Add Mobile/Constrained Reader to Board Memo and Investor Update panels
- Add championing trigger to Jason L. (investor update): what makes him reply with a useful intro?
- Add `market_assumptions` line to Financial Model panel (benchmark thresholds)

### Crisis Comms / Press Release

- Add anti-persona to both panels (Crisis: internal employee; Press Release: varies by sub-type)
- Add `feel` field to Aisha Bello (Crisis) and Sam Lee (Press Release) — emotional state changes review output
- Add championing trigger to Karen Mehta (Crisis): what does a statement that actually resolves the crisis look like?

### Patient-Facing Health / Contract-TOS

- These panels already handle inclusive design best (Marisol Vega, Devon Marsh, Dr. Sun-Hee Lim)
- Add championing trigger to Dr. Anita Rao: what does a handout that actually prevents phone calls look like?
- Add `last_validated` to Contract/TOS panel (regulatory specifics shift frequently)

### Code Review

- Panel is well-designed; no major changes needed
- Add championing trigger to Priya Narayanan: what does code that earns a "LGTM, ship it" look like? ("Clean abstraction boundary, single-responsibility functions, meaningful names, observable and rollbackable.")
- Consider adding a performance/scalability persona for latency-sensitive code paths (currently the SRE covers this partially, but capacity planning != hot-path optimization)

---

## New Runbook Rules to Add

### Rule 3.6: Anti-Persona Declaration

> Before emitting the panel, state the anti-persona for this artifact: the reader this document is NOT optimized for. If a reviewer's critique aligns with what the anti-persona would want, the editor should flag the critique as `OUT-OF-SCOPE:` rather than `STRUCTURAL:`. Anti-personas are declared per artifact type in `personas/library.md`; if none is declared, the audience-inferrer should infer one from the artifact's stated audience and log it in `audience.md`.

### Rule 3.7: Championing Requirement

> Every reviewer panel must be capable of producing at least one positive observation. If a reviewer's championing trigger is met by the artifact, the reviewer should state it explicitly with the prefix `CHAMPION:`. The editor should preserve `CHAMPION:` observations in the feedback to the user alongside `STRUCTURAL:` and surface findings. An all-negative review with no `CHAMPION:` observations from any reviewer is a panel-calibration failure and should be logged.

### Rule 5: Panel Freshness

> Each panel in `personas/library.md` carries a `last_validated` date and an optional `market_assumptions` line. When the audience-inferrer detects that the artifact references assumptions diverging from the panel's `market_assumptions`, it should emit a `STALE_PANEL` warning in the reviewer brief. Panels not validated within 12 months should be flagged for human review. The audience-inferrer does not auto-update panels — it flags and continues.

### Rule 3.8: Inclusive-Access Persona Injection

> For artifact types flagged as high-international-traffic or high-mobile-traffic in `configs.json`, the audience-inferrer should inject the appropriate access persona (Non-Native English Reader or Mobile/Constrained Reader) if not already present in the library panel. This injection follows the same rules as the layman injection (§3.2): it adds to the panel, does not replace, and is subject to the `panel_size` clamp.

---

## Citations

1. Cooper, A. (1999). *The Inmates Are Running the Asylum.* Sams Publishing.
2. Cooper, A., Reimann, R., Cronin, D., & Noessel, C. (2014). *About Face: The Essentials of Interaction Design* (4th ed.). Wiley.
3. Christensen, C. M., Dillon, K., Hall, T., & Duncan, D. S. (2016). *Competing Against Luck: The Story of Innovation and Customer Choice.* Harper Business.
4. Ulwick, A. W. (2005). *What Customers Want: Using Outcome-Driven Innovation to Create Breakthrough Products and Services.* McGraw-Hill.
5. Klement, A. (2018). *When Coffee and Kale Compete: Become Great at Making Products People Will Buy.* NYC Press.
6. IDEO (2015). *The Field Guide to Human-Centered Design.* IDEO.org.
7. Holmes, K. (2018). *Mismatch: How Inclusion Shapes Design.* MIT Press.
8. Microsoft (2016). *Inclusive Design Toolkit.* microsoft.com/design/inclusive.
9. Pruitt, J., & Adlin, T. (2006). *The Persona Lifecycle: Keeping People in Mind Throughout Product Design.* Morgan Kaufmann.
10. Harley, A. (2015). "Personas Make Users Memorable for Product Team Members." Nielsen Norman Group.
11. Harley, A. (2018). "Anti-Personas." Nielsen Norman Group.
12. Mitchell, M., et al. (2019). "Model Cards for Model Reporting." *Proceedings of FAT*.
13. Osterwalder, A., Pigneur, Y., Bernarda, G., & Smith, A. (2014). *Value Proposition Design.* Wiley. (Empathy map adaptation.)
14. Garner, B. A. (2013). *Legal Writing in Plain English* (2nd ed.). University of Chicago Press.
15. Sweller, J. (2011). "Cognitive Load Theory." *Psychology of Learning and Motivation,* Vol. 55. Academic Press.
