# Persona Runbook

How the audience-inferrer goes from **raw artifact → detected type → selected panel → tuned config**. Consumed by `agents/audience-inferrer.md` and `lib/reviewer-brief.cjs`.

Companion files:
- `personas/library.md` — panel index per artifact type
- `personas/configs.json` — tuned defaults per type

---

## 1. Detection rules

Detection is a two-pass match: **extension + filename heuristic** first (cheap), **content heuristic** second (fallback). The first rule that fires wins. Order matters — more specific rules above more general.

| # | Trigger (file/ext + content signal) | Detected type (library section) |
|---|--------------------------------------|---------------------------------|
| 1 | Ext in `.py .js .ts .tsx .jsx .go .rs .java .kt .rb .cpp .c .h .swift .cs .scala .sh .sql` OR shebang present OR >60% lines match a source-lang grammar | `Code review (any language)` |
| 2 | `.ipynb` (notebook) | `Code review` (primary) + `Developer-Facing Docs` (prose cells) — polyglot; see §3 |
| 3 | Ext in `.xlsx .xlsm .xls` AND formulas detected (`=` prefix in cells) | `Financial model / unit-economics doc / pricing strategy` |
| 4 | Ext `.xlsx` AND no formulas — treat as structured data, not a model | `Financial model` (panel still applies; flag "static numbers" to reviewers) |
| 5 | `.pptx` AND slides contain words `seed`, `pre-seed`, `angel`, `raising $`, `TAM` without `ARR` | `Seed pitch deck` |
| 6 | `.pptx` AND slides contain `ARR`, `NRR`, `CAC`, `magic number`, `cohort` | `Series A pitch deck` |
| 7 | `.pptx` AND slides contain `Rule of 40`, `burn multiple`, `IPO`, `S-1`, `crossover` | `Late-stage / growth-equity pitch deck` |
| 8 | Filename matches `board*`, `board-deck*`, `board-memo*` | `Board memo / board deck` |
| 9 | Filename matches `investor-update*`, `monthly-update*`, `LP-letter*`, `quarterly*` (and not a 10-Q) | `Investor update / LP letter / portfolio quarterly` |
| 10 | Filename / content matches `M&A`, `acquisition`, `merger`, `synergy`, `day-100 plan` | `M&A pitch / acquisition rationale memo` |
| 11 | Content matches `MD&A`, `10-K`, `Form 10-K`, `segment reporting`, `critical accounting estimates` | `Annual report / 10-K MD&A` |
| 12 | Content matches `earnings call`, `prepared remarks`, `Q&A prep`, `guidance`, `non-GAAP reconciliation` | `Earnings call script / analyst Q&A prep` |
| 13 | Content matches `capex`, `hurdle rate`, `IRR > WACC`, `capital committee`, `NPV` | `Business case / internal capex investment proposal` |
| 14 | `.md` and frontmatter or H1 contains `PRD`, `Product Requirements`, `PRFAQ`, `Problem Statement`+`Success Metrics` | `PRD` |
| 15 | `.md` with `# RFC`, `# ADR`, `## Status: (proposed|accepted|deprecated)`, `## Context`+`## Decision`+`## Consequences` | `Engineering RFC / Design Proposal / ADR` |
| 16 | `.md` or `.yaml` containing OpenAPI / Swagger keys (`openapi:`, `paths:`, `components:`) OR `API Reference` H1 with endpoints | `Technical Spec / API Design Doc` |
| 17 | `.md` with `Postmortem`, `SEV1`, `SEV2`, `Incident Report`, `Root Cause`, `Timeline` | `Postmortem / Incident Report` |
| 18 | `.md` with `Runbook`, `Playbook`, `On-call`, `Alert:`, `Diagnostic Steps` | `Runbook / Operational Playbook` |
| 19 | Filename `README.md` or `CONTRIBUTING.md` (repo-root) | `Open-Source README + CONTRIBUTING` |
| 20 | `.md` with `Migration Plan`, `Breaking Change`, `Deprecation`, `Rollback`, `Coexistence` | `Migration Plan / Breaking Change Announcement` |
| 21 | `.md` with `Threat Model`, `STRIDE`, `Attacker Model`, `Trust Boundary` | `Security Review / Threat Model` |
| 22 | `.md` with `Model Card`, `Eval Plan`, `Intended Use`, `Subgroup Performance`, `Training Data` | `ML/AI Eval Plan / Model Card` |
| 23 | `.md` in `docs/` dir, or contains Diátaxis markers (`Tutorial`, `How-to`, `Reference`, `Explanation`) — and is not the other product/eng types above | `Developer-Facing Docs` |
| 24 | `.md` / `.docx` with `FOR IMMEDIATE RELEASE`, `Press Release`, `About <Company>` boilerplate at bottom | `Press Release` |
| 25 | Filename or content matches `statement`, `apology`, `breach notification`, `outage`, `incident statement` — *public-facing*, not an engineering postmortem | `Crisis Communication / PR Statement` |
| 26 | `.html` or `.md` with hero copy pattern (H1 + CTA + "Get started"/"Sign up") OR pricing-tier table OR `Pricing` H1 | `Landing Page / Homepage / Pricing Page` |
| 27 | Filename `cold-email*`, `outreach*`, `sequence*`, or content is 3–7 short email bodies with `Subject:` lines | `Sales Email / Cold Outreach Sequence` |
| 28 | `.md` Twitter thread pattern (numbered tweets, `1/`, `2/`) OR LinkedIn post (single post with hook + body + CTA) OR `launch.md` | `Product Launch Announcement / Twitter Thread / LinkedIn Post` |
| 29 | Filename matches `brand-*`, `messaging*`, `style-guide*`, `voice-tone*` | `Brand Guidelines / Messaging Architecture` |
| 30 | Filename matches `case-study*`, `customer-story*`, `testimonial*` | `Customer Case Study / Testimonial` |
| 31 | Content matches `Q1|Q2|Q3|Q4` + `earnings` + `GAAP` + `Safe Harbor Statement` | `Earnings Press Release / IR Comms` |
| 32 | Filename matches `cfp*`, `talk-abstract*`, `keynote*` OR content matches `Talk Abstract`+`Learning Outcomes`+`Bio` | `Conference Talk Abstract / Keynote Outline` |
| 33 | Filename matches `newsletter*`, `substack*`, `issue-*` OR content header matches `Issue #N` + subject + body | `Newsletter / Serialized Blog` |
| 34 | Content matches `Informed Consent`, `Medication Guide`, `Patient Information`, `IRB`, `45 CFR 46.116` | `Patient-Facing Health Information` |
| 35 | Content matches `Abstract`+`Methods`+`Results`+`Conclusions` AND (`CONSORT` OR `PRISMA` OR `ICMJE` OR `p <` OR `95% CI`) | `Clinical Research Summary / Abstract` |
| 36 | Filename matches `terms*`, `tos*`, `nda*`, `eula*`, `privacy-policy*` OR content matches `WHEREAS`+`NOW THEREFORE` | `Contract / NDA / TOS User-Facing Terms` |
| 37 | Content matches `COMES NOW`, `Statement of Facts`, `Argument`, `Certificate of Service`, `Plaintiff`, `Defendant`, case caption | `Legal Brief / Motion / Persuasive Memo` |
| 38 | Content matches `Policy Memo`, `White Paper`, `Comment Letter`, `RIN`, `Federal Register`, `Regulatory Analysis`, `Circular A-4` | `Policy Memo / White Paper / Regulatory Comment Letter` |
| 39 | Content matches `Dear Senator`, `Dear Representative`, `Testimony before`, `Op-Ed:`, byline + 600–900 words with single-ask pattern | `Legislative Testimony / Op-Ed for Advocacy` |
| 40 | Content matches `Abstract`+`Introduction`+`Discussion`+`References` and is NOT clinical (no CONSORT markers) | `Academic Paper Draft (Introduction & Discussion)` |
| 41 | Content matches `Specific Aims`, `NIH`, `NSF`, `Intellectual Merit`, `Broader Impacts`, `PAPPG`, `Biosketch` | `Grant Proposal (NIH, NSF, Foundation)` |
| 42 | Filename matches `lesson-plan*`, `curriculum*`, `syllabus*` OR content matches `Learning Objectives`+`Materials`+`Assessment`+`NGSS\|Common Core` | `Curriculum / Lesson Plan` |
| 43 | Content matches `let's figure this out`, `intuition before`, `motivation`, 3Blue1Brown/Khan-style explainer patterns | `Educational Explainer` |
| 99 | Fallback — no rule fired | `Developer-Facing Docs` → Explanation mode (prose) OR `default` config from `configs.json` |

**Shebang fallback (rule 1 refinement):** `.txt` or no-extension files starting with `#!/usr/bin/env python`, `#!/bin/bash`, etc. → `Code review`.

**Polyglot files (`.ipynb`, `.html` with embedded JS/CSS, shell + python heredoc):** emit a `{primary, regions}` detection result. Primary panel picked from the primary language; reviewer brief includes per-region annotations. See CODE-01 in REQUIREMENTS.md.

---

## 2. Panel selection

Given a detected artifact type:

1. **Look up the type in `personas/library.md`.** Each type lists 5–7 named personas.
2. **Default panel = first `panel_size` personas** from the library section, where `panel_size` comes from `configs.json` for that type (default 5 if unspecified).
3. **Validate believer/skeptic mix.** Before emitting the panel, confirm the library section's explicit "Believer/skeptic pairing" line resolves to **≥1 believer AND ≥1 skeptic in the selected subset**. If not, swap the last-selected persona for the missing pole. Never emit an all-believer or all-skeptic panel (Pitfall 16).
4. **System 1 first-impression pass (round 1 only).** Before the full reviewer wave, run a single "first impression" pass. Select the most audience-typical persona in the panel (the end-reader proxy, or if none, the persona closest to the artifact's primary reader). This persona does a 30-second scan — reads only the first 500 characters + headings + conclusion. Tags gut reactions only: `hooked`, `confused`, `skeptical`, `bored`, `excited`. This surfaces the System 1 signal that analytical (System 2) reviewers miss. The first-impression output goes into `critique-first-impression-<persona-slug>.md` and is included in the aggregate but does NOT count toward the material-finding convergence threshold (it is a qualitative signal, not a structured finding). Implementation: `lib/reviewer-brief.cjs` generates a truncated brief (`brief-first-impression-<persona>.md`) with the first 500 chars of the artifact + extracted headings + last paragraph. The reviewer's instructions: "You are doing a FIRST IMPRESSION scan. You have 30 seconds. React to: does this hook you? Are you confused? Would you keep reading? Tag your gut reaction from: hooked, confused, skeptical, bored, excited. Do NOT analyze deeply — this is System 1, not System 2."
5. **Emit `audience.md`** in the round directory with the required format from `agents/audience-inferrer.md`. Keep each persona's name, bio, hiring job, bounce trigger, championing trigger, blindspot, and load-bearing belief verbatim from the library (adapt names/bios only if the artifact supplies concrete details — e.g., real company name, real stack — that improve specificity without inventing facts).

**`panel_size` clamping:** if `panel_size > len(library section personas)`, clamp to library length and log a warning. Do not invent additional personas.

**Code-artifact rule (PERSONA-06):** when detected type is `Code review (any language)`:
- Default `panel_size: 5` from configs.json `code` entry.
- Reviewer brief MUST append: `Do NOT flag issues a linter would catch — assume linter clean.`
- **Replace "layman" with "new-hire-in-6-months" (Yuki Tanaka)** everywhere the general rule would call for a layman. This replacement is the explicit PERSONA-06 behavior.

---

## 3. Mix-and-match rules

Real artifacts straddle types. Apply these rules in order:

### 3.1 Primary + secondary types

An artifact can have **one primary type** (drives config + 60–80% of panel) and **≤1 secondary type** (supplies 1–2 additional personas).

| Straddle pattern | Primary | Secondary (contribute 1–2 personas) |
|------------------|---------|--------------------------------------|
| PRD with a financial projection section | `PRD` | `Financial model` → add Audra Kellerman (Fractional SaaS CFO) |
| Pitch deck with heavy technical architecture slides | `Series A pitch deck` or stage-appropriate | `Technical Spec / API Design Doc` → add Diego Marchetti |
| Blog post that is really a launch announcement | `Product Launch Announcement` | `Newsletter / Serialized Blog` → add Stratechery-Style Analytical Reader |
| Internal memo that is an M&A rationale | `M&A pitch / acquisition rationale memo` | `Board memo / board deck` → add Whitney Park (Future-investor reader) |
| README that doubles as a pitch for the project | `Open-Source README + CONTRIBUTING` | `Press Release` → add Maya Okonkwo (or the aggregator proxy Bea Oduya stays) |
| Threat model attached to an RFC | `Engineering RFC / Design Proposal / ADR` | `Security Review / Threat Model` → add Selma Karaköy |
| API design doc with migration guide | `Technical Spec / API Design Doc` | `Migration Plan / Breaking Change Announcement` → add Shankar Velayudhan |
| Policy memo with a cost-benefit model | `Policy Memo / White Paper / Regulatory Comment Letter` | `Financial model` → add Lena Voss (auditor) |
| Grant proposal with heavy code/methods (software grants) | `Grant Proposal` | `Code review` → add Priya Narayanan (staff eng) |
| Clinical abstract with an ML model card | `Clinical Research Summary / Abstract` | `ML/AI Eval Plan / Model Card` → add Renée Mukherjee |

**De-dup:** if the secondary-type persona overlaps by role with a primary-type persona, skip the add; do not pad.

### 3.2 When to add the layman

Add the layman (or closest analog — non-technical reader, angel, friend, net-new prospect, retail investor) **when the artifact has strategic or premise stakes the experts won't catch**:
- Any pitch deck → add the angel / layman proxy even if panel is already 6.
- Any financial model → add the layman (already in-library as the unnamed "premise-checker"; in practice use Karim Boateng as the CS benchmark + Mira Solis as the bear-case proxy).
- Any strategy doc, PRD, or internal memo → add a skip-level exec or friend-of-the-founder proxy.
- **Code artifacts: DO NOT add a layman.** Replace with Yuki Tanaka (new-hire-in-6-months). See §2 code rule.

### 3.3 When to add the operator

Add the operator (CFO, eng lead, ops manager, on-call SRE, integration lead, customer-success lead) **whenever the artifact has execution stakes**:
- Any financial model / capex / M&A memo → include the CFO (Audra Kellerman, Diane Pruitt, or Indira Mahmood depending on type).
- Any RFC / threat model / migration plan / API spec → include the on-call SRE (Ines Carvalho / Frances Idemudia / Niko Lazaridis / Ben Olafsson).
- Any PRD / launch announcement → include Casey Park (Support Lead) or an analogous support proxy.
- Any runbook / playbook → the 3 a.m. on-call test IS the panel; Frances Idemudia is mandatory.

### 3.4 Explicit `audience_override`

If the user supplied an `audience_override` string in the brief, honor it: quote it verbatim in the emitted `audience.md`, then adjust the panel by **adding** the override audience as a named persona (don't drop library picks). If the override contradicts the detected type (e.g., "pitch this to my grandmother" on a Series A deck), add Garrett Liu's angel persona as the closest library analog and keep the detected-type experts.

### 3.5 Anti-mode-collapse check

Before emitting, count believers vs. skeptics in the final panel. If the ratio is worse than 4:1 in either direction, swap the last-added persona for the missing pole. This is **Pitfall 16 enforcement** and is non-negotiable.

### 3.6 Inclusive-access persona injection

For any **public-facing artifact** (landing page, press release, blog, patient info, annual report, README, launch announcement, newsletter, educational explainer), inject the **Non-Native English Reader** (Kenji Nakamura) from the Cross-cutting: Inclusive Access section of `personas/library.md`. For any artifact **likely read on mobile** (email, newsletter, launch post, investor update, board memo, press release, pricing page), inject the **Mobile/Constrained Reader** (Daniela Ferreira). Injection follows the same rules as the layman injection (§3.2): adds to the panel, does not replace, and is subject to the `panel_size` clamp. If the injected persona would exceed `panel_size`, drop the last non-essential persona (not a believer, skeptic, or operator) to make room.

---

## 4. Structural-vs-surface failure-mode index

For each artifact type, tumble-dry reviewers must distinguish **structural** findings (premise problems the editor's rewrites cannot fix — scope, framing, evidence, audience mismatch) from **surface** findings (prose, structure-within-scope, formatting, tone). Reviewers flag structural findings with the `STRUCTURAL:` prefix in their critique; the editor is instructed to **escalate these to the user rather than silently rewrite**.

Below: 1–3 known structural failure modes per artifact type, sourced from `research/*.md`. Use this index when generating reviewer briefs and when the editor decides what to rewrite vs. flag.

### Business & Finance

- **Seed pitch deck:** (1) TAM-first storytelling with no wedge; (2) premature ARR claim before $1M real recurring revenue (YC Library, Helena Borg persona); (3) hidden co-founder churn / team discontinuity (Theranos pattern).
- **Series A pitch deck:** (1) ARR theater — non-recurring or LOI revenue counted; (2) NRR < 100% with gross-retention slide swap; (3) single-scenario financial model (Scale With CFO).
- **Late-stage pitch deck:** (1) custom EBITDA that obscures losses (WeWork "community-adjusted"); (2) Rule-of-40 calculated on TTM trough quarter only; (3) comp set omitting the obvious public alternative.
- **Financial model / pricing:** (1) bookings without collections (revenue recognized on invoice, cash never lands); (2) per-seat pricing on a usage product (Campbell); (3) gross margin < 60% on a "SaaS" pitch.
- **Board memo:** (1) memo with no "ask" — no decision being requested; (2) sending the deck the morning of the meeting (Fred Wilson); (3) public-co: undisclosed change in segment reporting.
- **Investor update / LP letter:** (1) definition drift — changing "users" or "ARR" definition between updates without footnote; (2) heroic-only narrative (Signature Block); (3) cadence collapse (>14 days after month-end = structural trust failure, not surface).
- **M&A memo:** (1) synergy inflation (McKinsey: 20–50% typical overestimate, 70% of revenue synergies miss); (2) no cultural-integration plan; (3) unbounded "revenue synergies" without haircut.
- **Annual report / 10-K MD&A:** (1) boilerplate risk factors (management isn't thinking about real risks); (2) non-GAAP without GAAP bridge (Reg G); (3) segment-definition change without bridge.
- **Earnings call script:** (1) scripted Q&A (analysts detect immediately); (2) surprise number not in the press release; (3) Reg FD selective disclosure.
- **Business case / capex:** (1) hurdle-rate gaming (IRR reverse-engineered to clear by 50–100 bps); (2) synergy / strategic-option value used to clear hurdle without quantification; (3) no post-approval measurement plan.

### Product & Engineering

- **PRD:** (1) no measurable success metric (you don't know what you're building); (2) UI mockups before user problem (Priya Ranganathan); (3) unclear strategic fit / no opportunity-cost framing (Theo Lindqvist).
- **RFC / ADR:** (1) no "what we considered and rejected" section (Sven Aaltonen); (2) no operational characteristics (SLOs, rollback, observability) — Ines Carvalho; (3) reinventing a primitive that already exists in the org (Anna Petrov).
- **API design doc:** (1) resource model leaks DB schema (Hannah Wexler — APIs are forever); (2) spec ignores transactionality / partial failure (Diego Marchetti); (3) no auth-scope or rate-limit discussion (Salma Idris).
- **Postmortem:** (1) "human error" listed as root cause without further analysis; (2) action items without owner, deadline, or priority (theater); (3) timeline papers over the period when nobody knew what was happening.
- **Runbook / playbook:** (1) conflating runbook (tactical, one alert) with playbook (coordination) — the #1 anti-pattern; (2) runbook written before the first real incident (documents imagined system, not actual); (3) no diagnostic decision tree (remediation-only).
- **README + CONTRIBUTING:** (1) burying the lede — hero animations and badges before "what is this"; (2) no LICENSE or SECURITY.md (unusable for enterprise); (3) CONTRIBUTING as maintainer checklist instead of onboarding ramp.
- **Migration plan:** (1) no rollback plan for any phase (Iris Halverson); (2) deprecation window shorter than consumer release cycle (Shankar); (3) no answer to "what breaks if we don't do this" (Avi Sternlicht).
- **Threat model:** (1) empty STRIDE cell (means it wasn't considered); (2) unowned mitigations (not mitigations); (3) scope excludes actual attack surface (threat-modeling the service but not the deploy pipeline).
- **ML eval plan / model card:** (1) eval set leaks into training data (Imani Faulkner); (2) aggregate-only metrics, no subgroup reporting (Renée Mukherjee); (3) intended use undefined / no prohibited-use statement (Vera Mladenovic).
- **Developer-facing docs (Diátaxis):** (1) **mode collision** — tutorial breaks into reference mid-flow, or reference becomes tutorial (Sora Lindgren); (2) tutorial with unstated prerequisites (Felix Andrade); (3) explanation that lists features instead of motivating (Theo Bauer).

### Marketing & Communications

- **Press release:** (1) funding announcement with no use-of-funds; (2) unverifiable superlatives ("leading," "first-of-its-kind") that create legal exposure; (3) CEO quote sounds nothing like a human.
- **Crisis comms:** (1) passive voice on the harm ("mistakes were made"); (2) apology *after* the explanation (order is structural); (3) external statement contradicts internal all-hands / leaked Slack.
- **Landing page / pricing:** (1) hero copy describes the company, not the customer's job; (2) 4+ pricing tiers (convert 31% worse than three); (3) feature parity framing ("we have all the features of X") instead of wedge.
- **Cold email:** (1) mail-merged "personalization" that's commodity (Iannarino — stop personalizing, start informing); (2) five-touch sequence with no escalating value; (3) subject line promises more than body delivers.
- **Launch announcement / thread:** (1) no standalone hook (tweet 1 requires the thread); (2) launch copy paper over a known limitation; (3) positioning that retreats from previous claim (Competing Founder catches).
- **Brand guidelines:** (1) "messaging house" with no named competitive alternatives (April Dunford); (2) voice reduced to a list of adjectives without examples (Mailchimp); (3) no "do not touch" inventory of brand equities (Tropicana pattern).
- **Case study:** (1) heroic narrative with no setbacks (Velocity Partners); (2) result number with no baseline; (3) copy that makes the vendor the hero, not the customer.
- **Earnings release / IR:** (1) selective disclosure (Reg FD violation); (2) non-GAAP without GAAP reconciliation (Reg G); (3) boilerplate safe harbor instead of specific cautionary statements.
- **Conference abstract:** (1) abstract promises a survey instead of a position; (2) no stated learning outcomes; (3) bio doesn't establish the right to speak on this topic.
- **Newsletter:** (1) cadence inflation — doubling cadence to grow (halves quality); (2) post recycles framework without new evidence; (3) topic drift without coherence.

### Domain-Specific

- **Patient-facing health info:** (1) reading level > 8th grade (AMA/NIH/CDC floor); (2) qualitative-only risk frequencies, no absolute numbers or denominators; (3) IRB boilerplate that *raises* grade level (Stunkel 2018).
- **Clinical research abstract:** (1) CONSORT-A / PRISMA-A non-compliance → desk-reject; (2) spin — non-significant primary outcome framed positively via secondary endpoints; (3) abstract-body mismatch.
- **Contract / TOS:** (1) reading level > 8th-grade FK on consumer-facing terms; (2) definitional cascades (Term A via Term B via Term C); (3) adhesion-style "agree to all" without meaningful consent UI.
- **Legal brief:** (1) deep issue buried past page 1 (Garner); (2) failure to address adverse controlling authority (Rule 3.3 candor violation); (3) local-rule formatting violations (filing struck before judge reads).
- **Policy memo / comment letter:** (1) BLUF violation — recommendation buried; (2) comment letter not tied to specific rule provisions or RIN (agency can ignore); (3) no quantified cost-benefit, no baseline, no alternatives (Circular A-4).
- **Legislative testimony / op-ed:** (1) more than one ask; (2) pure statistics, no human story (or story without policy mechanism); (3) lede longer than 60 words.
- **Academic paper (Intro/Discussion):** (1) lit review is a list, not an argument; missed seminal work; (2) gap stated as "gap in the literature" rather than gap in knowledge; (3) Discussion overclaims — causal language from correlational design.
- **Grant proposal:** (1) Specific Aims page not standalone (NIH triage); (2) weak Importance of the Research (overall impact 5+ regardless of methods); (3) boilerplate Broader Impacts (NSF no-vote).
- **Curriculum / lesson plan:** (1) activity-first planning, objectives retrofitted (inverts backward design); (2) verbs not measurable ("understand," "appreciate") instead of Bloom-aligned; (3) standards listed but not authentically addressed.
- **Educational explainer:** (1) definition-first / notation-first instead of motivation-first (3B1B principle); (2) illusion of understanding — viewer feels enlightened but can't reproduce; (3) curse of knowledge — author forgot what was hard about it.

### Code review (any language)

- **Code review (any language):** (1) **architectural misfit** — wrong abstraction boundary, business logic leaking into transport/persistence layer; editor rewrites cannot fix; (2) **security posture absent at new trust boundary** — new code path missing authN/authZ check entirely; requires design change, not prose fix; (3) **unrollbackable operational change** — migration, schema change, or feature flip with no rollback path; CODE-07 verify_cmd cannot rescue this. All three require `STRUCTURAL:` flag to the user.

---

## 5. Persona Freshness

Each panel in `personas/library.md` carries a `**Last validated:**` date and an optional `**market_assumptions:**` line.

**Staleness detection:** When the audience-inferrer generates a panel for an artifact type whose `last_validated` date is older than 12 months from the current date, it should print a warning in `audience.md`:

> ⚠ Panel for `<artifact-type>` last validated `<date>` — market assumptions may be stale. Review panel before use.

**Market-assumptions divergence:** When the artifact references assumptions that diverge from the panel's `market_assumptions` line (e.g., the artifact references "Rule of X" while the panel assumes "Rule of 40"), the audience-inferrer should log a `STALE_PANEL` warning in the reviewer brief and note the specific divergence.

**Personas with time-sensitive benchmarks** (VC panels, finance panels, legal/regulatory panels) include `market_assumptions:` noting what would invalidate the panel's calibration. These are not updated automatically — the audience-inferrer flags and continues; a human decides whether to update.

**Review cadence:** Panels should be reviewed every 12 months, or immediately after a major market shift (regulatory change, benchmark replacement, platform migration). The `last_validated` date is updated manually when a panel is reviewed.

---

## Runbook usage — quick reference for the audience-inferrer

1. Run detection rules in order → get artifact type.
2. Load library section + `configs.json` entry for that type.
3. Apply mix-and-match (§3) if the artifact straddles.
4. Validate believer/skeptic mix (§3.5).
5. Run System 1 first-impression pass (§2.4, round 1 only).
6. Inject inclusive-access personas if applicable (§3.6).
7. Check panel freshness (§5); emit `STALE_PANEL` warning if needed.
8. For code artifacts: apply §2 code rule (layman → new-hire-in-6-months; append linter clause to brief).
9. Emit `audience.md` per `agents/audience-inferrer.md` Output format.
10. Reviewers receive the structural-failure-mode index for their type (§4) and are instructed to prefix structural findings with `STRUCTURAL:`.
