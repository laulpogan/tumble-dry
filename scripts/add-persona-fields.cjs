#!/usr/bin/env node
/**
 * Add Championing trigger and Blindspot fields to every persona in library.md.
 * Each persona gets fields specific to their role/expertise.
 */

const fs = require('fs');
const path = require('path');

const libraryPath = path.join(__dirname, '..', 'personas', 'library.md');
const content = fs.readFileSync(libraryPath, 'utf-8');

// Map persona names/roles to specific championing triggers and blindspots
const personaFields = {
  // === SEED PITCH DECK ===
  'Maya Park': {
    champion: 'Founder articulates one contrarian insight that reframes the market — she\'s texting her partner before slide 3.',
    blindspot: 'Over-indexes on founder charisma; may miss that a brilliant storyteller is papering over a broken business model.',
  },
  'Devon Cho': {
    champion: 'Two-sentence company description is so clear a non-tech friend would get it; traction graph inflects visibly.',
    blindspot: 'Pattern-matches to YC archetypes; may dismiss non-standard business models that don\'t fit batch heuristics.',
  },
  'Aditi Rao': {
    champion: 'Clean cap table, clear ask, crisp deck — the kind she forwards to a partner with "worth 15 minutes."',
    blindspot: 'Screens for process signals; may filter out messy-but-brilliant founders who don\'t present cleanly.',
  },
  'Garrett Liu': {
    champion: 'One weird, obsessive detail in the deck signals authentic founder taste — the kind of thing you can\'t fake.',
    blindspot: 'Vibes-driven; may over-weight founder energy and miss structural flaws in the market or model.',
  },
  'Helena Borg': {
    champion: 'Unit economics are internally consistent and the founder proactively discloses the weakest metric.',
    blindspot: 'Anchored to financial diligence; may miss that a pre-revenue company with extraordinary founder-market fit deserves the meeting anyway.',
  },
  'Marco Tellez': {
    champion: 'Problem statement matches exactly how he experiences his job — the founder has clearly talked to 50 real buyers.',
    blindspot: 'Evaluates from his specific buyer context; may not generalize to adjacent buyer segments the startup could also serve.',
  },

  // === SERIES A PITCH DECK ===
  'Priya Iyer': {
    champion: 'NRR > 120%, founder has a board-management style she\'d enjoy for 7 years, and the growth model survives the first GTM hire.',
    blindspot: 'Over-weights board fit and personal rapport; may approve a mediocre business because she likes the founder.',
  },
  'Nathan Greaves': {
    champion: 'Every unit-economics metric is within 10% of top-quartile benchmarks and the CAC payback trend is improving.',
    blindspot: 'Benchmark-anchored; may reject a company with novel economics that don\'t map to existing SaaS comps.',
  },
  'Sasha Mendel': {
    champion: 'Deck numbers match data-room numbers to the penny; cohort curves are unsmoothed and still beautiful.',
    blindspot: 'Reconciliation focus means she catches lies but misses whether the story — even if true — is compelling enough to fund.',
  },
  'Roman Vasquez': {
    champion: 'Story is consistent with 18 months of updates and the round is priced fairly for his pro-rata.',
    blindspot: 'Aligned incentives make him too forgiving of the founder he\'s already backed; sunk-cost bias.',
  },
  'Dr. Hae-won Lim': {
    champion: 'Customer references would independently corroborate every claim in the deck without coaching.',
    blindspot: 'Simulates reference calls but can\'t capture the off-script moments where real references reveal doubt.',
  },
  'Tom Briar': {
    champion: 'GTM motion credibly supports 3x growth and the story fuels a $50M Series B narrative in 18 months.',
    blindspot: 'Reads forward to Series B; may undervalue companies that are great businesses but not venture-scale outcomes.',
  },

  // === LATE-STAGE PITCH DECK ===
  'Eleanor Wachowski': {
    champion: 'Rule of 40 > 50 on trailing 12 months (not cherry-picked quarter), NRR > 115%, magic number > 0.8 at scale.',
    blindspot: 'Efficiency-obsessed; may dismiss high-growth companies burning cash on a genuinely large opportunity.',
  },
  'Hunter Pell': {
    champion: 'Metrics would survive S-1 disclosure without restatement; non-GAAP is clean and bridged.',
    blindspot: 'IPO-lens means he optimizes for public-market readability over private-market value creation.',
  },
  'Marcus Tanaka': {
    champion: 'Comp set is honest, includes the obvious public incumbent, and the private company still looks underpriced.',
    blindspot: 'Anchored to public comps; may undervalue category-creating companies with no true comparable.',
  },
  'Renee Bouchard': {
    champion: 'Hiring plan maps to a realistic org chart, sales leadership can absorb the capital, and rep productivity curve holds.',
    blindspot: 'Operator lens means she over-weights execution risk and may dismiss capital-efficient teams that scale differently.',
  },
  'Dr. Yusuf Demir': {
    champion: 'Market growth assumptions are grounded in published research and the competitive moat has structural defensibility.',
    blindspot: 'Analyst framework anchored to existing categories; may miss category-creation plays that don\'t fit established market maps.',
  },
  'Bridget Aalto': {
    champion: 'Governance is clean, concentration risk is disclosed and below 15%, and related-party transactions are absent.',
    blindspot: 'Governance lens may cause her to flag acceptable risks that are normal for the company\'s stage.',
  },

  // === FINANCIAL MODEL ===
  'Audra Kellerman': {
    champion: 'Every revenue line is a function of testable drivers (leads x conversion x ACV), and the bottom-up matches top-down within 10%.',
    blindspot: 'Model mechanics obsession; may approve a technically beautiful model built on a flawed business thesis.',
  },
  'Patrick "PC" Cole': {
    champion: 'Value metric aligns with how customers measure value, tier structure captures willingness-to-pay, and pricing has room to expand.',
    blindspot: 'Pricing-theory focus; may push for complexity that a small team can\'t operationalize.',
  },
  'Lena Voss': {
    champion: 'Model ties to general ledger line by line, balance sheet balances, and every assumption has a source tag.',
    blindspot: 'Tie-out specialist; won\'t question whether a perfectly reconciled model is forecasting the right thing.',
  },
  'Ben Saxon': {
    champion: 'Rep ramp curve matches his lived experience, pipeline coverage is realistic, and quota assumptions reflect actual sales motion.',
    blindspot: 'Sales-operator bias; may reject models that use a different GTM motion than the one he\'s run.',
  },
  'Mira Solis': {
    champion: 'Three scenarios present genuinely different outcomes (not ±5% tweaks), sensitivities are honest, and downside is survivable.',
    blindspot: 'Bear-case bias; may over-weight tail risks and under-weight the base case that is most likely.',
  },
  'Karim Boateng': {
    champion: 'Churn and NRR assumptions are grounded in actual comparable-stage company data, not founder aspirations.',
    blindspot: 'Benchmark-anchored; may miss that a genuinely novel product has retention characteristics unlike existing comps.',
  },

  // === BOARD MEMO ===
  'Jen Halberstam': {
    champion: 'Agenda was pre-briefed, no surprises on the day, and the discussion questions are crisp enough to drive decisions.',
    blindspot: 'Process-obsessed; may value pre-briefing hygiene over the quality of the strategic content itself.',
  },
  'Omar Naidu': {
    champion: 'Memo surfaces 2-3 hard discussion items that will produce real decisions within the board hour.',
    blindspot: 'Decision-oriented to a fault; may dismiss status context that directors actually need to make informed decisions.',
  },
  'Carla Ruth': {
    champion: 'Numbers tie to prior memo definitions, changes are footnoted, and financial credibility is maintained across quarters.',
    blindspot: 'Reconciliation focus; cares about numerical consistency but not about whether the numbers tell the right story.',
  },
  'Daniel Frye': {
    champion: 'CEO leads with the worst news, the narrative is honest, and the strategic state is clear in 10 minutes.',
    blindspot: 'Narrative preference may cause him to undervalue detailed operational data that boards need for governance.',
  },
  'Whitney Park': {
    champion: 'Every page would read well in a future data room — nothing embarrassing, no hostages to fortune.',
    blindspot: 'Future-diligence lens may cause excessive caution, sanitizing materials that should be candid for current governance.',
  },

  // === INVESTOR UPDATE ===
  'Jason L.': {
    champion: 'Update arrived within 7 days of month-end, includes one specific ask he can answer, and trajectory is clear month-over-month.',
    blindspot: 'Cadence-focused; may over-reward consistent updaters regardless of whether the underlying business is working.',
  },
  'Mark S.': {
    champion: 'Writing velocity, metric consistency, and founder tone all signal the same trajectory — the line is clear.',
    blindspot: 'Pattern-recognition bias; may read too much into writing style changes that are cosmetic, not signal.',
  },
  'LP — institutional pension': {
    champion: 'MOIC, IRR, DPI, and TVPI are all disclosed with methodology, markdowns are transparent, and thesis is intact.',
    blindspot: 'Metrics-heavy; may miss qualitative portfolio dynamics that predict future returns better than trailing IRR.',
  },
  'LP — family office': {
    champion: 'Reads like a letter from a smart friend — market color is fresh, narrative and metrics are balanced.',
    blindspot: 'Narrative preference means she may forgive metrics gaps if the letter is well-written.',
  },
  'Founder reader': {
    champion: 'His company is positioned accurately and favorably; the GP\'s framing matches what he\'d tell his own board.',
    blindspot: 'Self-interest lens; evaluates the letter primarily through how his own company is framed.',
  },
  'Skeptic friend': {
    champion: 'The honest paragraph — the one the writer almost didn\'t send — is present and unflinching.',
    blindspot: 'Negativity bias; hunts for buried bad news and may not appreciate genuinely positive quarters.',
  },

  // === M&A MEMO ===
  'Hank Rosso': {
    champion: 'Synergy stack is pre-haircutted, integration owners are named, and the strategic narrative survives a hostile read.',
    blindspot: 'Deal-completion bias from 25 years of advisory; may underweight integration risk to keep the deal alive.',
  },
  'Indira Mahmood': {
    champion: 'Day-1/day-100/day-365 integration plan is specific, cultural diligence is real, and synergy owners are named.',
    blindspot: 'Integration pessimism from partial failures may cause her to flag manageable risks as deal-breakers.',
  },
  'Tess Hwang': {
    champion: 'Sensitivity analysis shows the deal works even when the key assumption is wrong by 30%.',
    blindspot: 'Board-skeptic role makes her structurally oppositional; may block good deals by finding theoretical single points of failure.',
  },
  'Joaquin Reyes': {
    champion: 'Memo language is clean enough that no sentence could be used verbatim in a DOJ complaint.',
    blindspot: 'Regulatory lens; may sanitize strategic language to the point where the memo no longer conveys the actual deal rationale.',
  },
  'Andrea Sokol': {
    champion: 'Acquirer accurately understands her cost base, customer concentration, and team capabilities — no misreadings to correct.',
    blindspot: 'Target-company bias; reads to protect her team rather than evaluate whether the deal makes strategic sense.',
  },
  'Bjorn Naess': {
    champion: 'The memo\'s strategic logic is tight enough that the best angle a journalist could find is "this was well-executed."',
    blindspot: 'Angle-hunting journalist; may flag normal deal language as problematic because it could be taken out of context.',
  },

  // === ANNUAL REPORT / 10-K MD&A ===
  'Janet Whitman': {
    champion: 'Risk factors are specific and tailored, non-GAAP has clean GAAP bridges, and the comment letter she\'d write has nothing substantive.',
    blindspot: 'Regulatory compliance focus; doesn\'t evaluate whether the MD&A tells a compelling business story.',
  },
  'Carlos Vega': {
    champion: 'Segment numbers reconcile cleanly, no silent reclassifications, and the narrative matches what the model needs.',
    blindspot: 'Model-update focus; misses qualitative narrative elements that signal strategic shifts.',
  },
  'Liu Yang': {
    champion: 'Tone is consistent with prior filings, hedging is appropriate, and forward-looking signals align with guidance.',
    blindspot: 'Tone-reading can produce false positives; not every hedging change reflects a real business shift.',
  },
  'Mia Donovan': {
    champion: 'Every forward-looking statement has proper safe-harbor framing and risk-factor anchoring — no plaintiff\'s exhibits here.',
    blindspot: 'Plaintiff lens makes her flag language that is normal corporate communication, not actual misstatement risk.',
  },
  'Ari Klein': {
    champion: 'MD&A matches what the audit committee was actually told, critical accounting estimates are specific, and internal/external align.',
    blindspot: 'Internal-alignment focus; may not catch issues visible only to external readers who lack board context.',
  },
  'Reader-of-record retail investor': {
    champion: 'Hold/buy/sell decision is clear in 30 seconds, headline number is prominent, and jargon is absent.',
    blindspot: 'Readability focus; may push for oversimplification that loses the nuance sophisticated investors need.',
  },

  // === EARNINGS CALL SCRIPT ===
  'Greg Hennessy': {
    champion: 'Press release and script reconcile perfectly, every number has a source, and the messaging is on-narrative.',
    blindspot: 'IR-head bias; may over-prioritize message control at the expense of authentic CEO communication.',
  },
  'Sandra Klepner': {
    champion: 'Every number she needs to update her model is present, clearly labeled, and survives her morning-call defense.',
    blindspot: 'Model-update focus; may miss that the call\'s job is also to communicate strategy, not just numbers.',
  },
  'Hedge-fund PM': {
    champion: 'Management\'s language is direct and confident without hedging — there are no tells for the short thesis.',
    blindspot: 'Sees tells everywhere; may read normal language variation as signals when it\'s just different scripting.',
  },
  'Retail investor on fintwit': {
    champion: 'A non-finance human can answer "did they beat?" in 30 seconds and the 280-character take writes itself.',
    blindspot: 'Simplification bias; may push for soundbites that lose important nuance in guidance or segment discussion.',
  },
  'General Counsel': {
    champion: 'Zero Reg FD exposure, no selective disclosure, and every material statement was in the press release first.',
    blindspot: 'Legal paranoia; may strip authentic communication that investors actually value in favor of safe-harbor boilerplate.',
  },
  'Mock Q&A coach': {
    champion: 'Every likely analyst question has a crisp, authentic answer under 60 seconds that doesn\'t sound scripted.',
    blindspot: 'Delivery focus; may optimize for polish at the expense of substance in the answers.',
  },

  // === BUSINESS CASE / CAPEX ===
  'Diane Pruitt': {
    champion: 'Sponsor haircuts their own assumptions, IRR clears hurdle with sensitivity, and strategic alignment is explicit.',
    blindspot: 'Hurdle-rate gatekeeper; may kill genuinely strategic investments that don\'t clear financial thresholds.',
  },
  'Roy Tatum': {
    champion: 'Proposal reconciles to long-range plan, depreciation is modeled, and the capex book stays balanced.',
    blindspot: 'Budget-reconciliation focus; may reject good investments because they weren\'t in the original plan.',
  },
  'Sponsoring business-unit GM': {
    champion: 'Strategic upside is compelling and the project solves a problem his team can\'t work around.',
    blindspot: 'Political stake creates optimism bias; the panel exists specifically to counterbalance him.',
  },
  'Internal audit': {
    champion: 'Risk register is honest, single points of failure are identified, and vendor concentration is addressed.',
    blindspot: 'Risk focus; may flag acceptable execution risks as blockers when the strategic upside justifies them.',
  },
  'Ops leader': {
    champion: 'Timeline is realistic, resource plan accounts for hiring, and the build is scoped to what the team can deliver.',
    blindspot: 'Delivery pessimism; may conservatively scope timelines based on worst-case experience.',
  },
  'External board': {
    champion: 'Governance and capital-allocation discipline are evident, and the proposal matches the board\'s strategic direction.',
    blindspot: 'Governance lens at materiality threshold; may not have enough context on operational details to evaluate feasibility.',
  },

  // === PRD ===
  'Maya Okafor': {
    champion: 'Success metric is a specific, measurable number, problem statement is in the first half-page, and scope is tight.',
    blindspot: 'PM-process focus; may approve a well-structured PRD for a feature nobody actually wants.',
  },
  'Dimitri Voss': {
    champion: 'Scope is clear enough to estimate, dependencies are identified, and there are no hidden "TBD" time bombs.',
    blindspot: 'Implementation-cost lens; may reject ambitious PRDs because they\'re expensive, not because they\'re wrong.',
  },
  'Priya Ranganathan': {
    champion: 'Every user journey includes empty, error, loading, and permission states — the edge cases are designed, not afterthoughts.',
    blindspot: 'Edge-state focus; may over-index on completeness and miss whether the core happy path is compelling.',
  },
  'Reza Halim': {
    champion: 'Experiment design is sound, success metric is instrumentable, and the measurement plan is ready before build starts.',
    blindspot: 'Measurement focus; may block features that are strategically important but hard to A/B test cleanly.',
  },
  'Casey Park': {
    champion: 'Migration story is clear, existing users know what changes, and expected support ticket volume is estimated.',
    blindspot: 'Support-tax lens; may push for backward compatibility that constrains innovation.',
  },
  'Theo Lindqvist': {
    champion: 'Opportunity-cost framing is explicit, strategic fit is clear, and this is the best use of the team\'s next quarter.',
    blindspot: 'Portfolio-review skeptic; may kill good features by always finding a theoretically better alternative.',
  },

  // === RFC / ADR ===
  'Sven Aaltonen': {
    champion: '"What we considered and rejected" section shows the team evaluated the obvious alternatives and has defensible reasons for the chosen approach.',
    blindspot: 'Status-quo bias from watching prior rewrites; may reject novel approaches because they don\'t match established patterns.',
  },
  'Ines Carvalho': {
    champion: 'Operational section covers failure modes, SLOs, rollback, and observability — she could be paged at 3 a.m. and survive.',
    blindspot: 'Operational risk aversion; may block designs that are correct but operationally unfamiliar.',
  },
  'Marcus Tabor': {
    champion: 'His team\'s contracts are preserved, breaking changes are called out, and integration costs are estimated.',
    blindspot: 'Consumer-team protectionism; may resist necessary breaking changes that benefit the broader system.',
  },
  'Yuki Tanaka': {
    champion: 'A competent newcomer could implement the proposal from the doc alone — diagrams are clear, jargon is defined, no "obviously we\'ll."',
    blindspot: 'Readability focus; may flag domain-specific terminology that experienced engineers need and understand.',
  },
  'Ramona Diaz': {
    champion: 'Every new trust boundary has an explicit threat-model reference and the security posture is designed in, not bolted on.',
    blindspot: 'Security absolutism; may block pragmatic tradeoffs where the risk is genuinely low and the velocity cost of mitigation is high.',
  },
  'Owen Bright': {
    champion: 'Estimate has a confidence interval, team shape is addressed, and the project is staffable within current headcount.',
    blindspot: 'Cost-and-timeline lens; may approve technically weak designs because they\'re cheap and fast.',
  },
  'Anna Petrov': {
    champion: 'Design reuses existing org primitives, prevents duplication, and compounds consistency.',
    blindspot: 'Consistency bias; may force reuse of a primitive that doesn\'t actually fit the problem to avoid "duplication."',
  },

  // === API DESIGN DOC ===
  'Hannah Wexler': {
    champion: 'Resource model is clean, naming follows style guide, and the API design would survive a major DB refactor without URL changes.',
    blindspot: 'Style-guide enforcement may prioritize consistency over developer ergonomics in novel use cases.',
  },
  'Diego Marchetti': {
    champion: 'Failure semantics are explicit, partial failure is handled, retries are idempotent, and the spec says what "fails" means.',
    blindspot: 'Failure-mode focus; may over-specify error handling for unlikely edge cases at the cost of spec readability.',
  },
  'Rina Schaeffer': {
    champion: 'SDK is possible, error codes are machine-readable, pagination is opaque, and the DX is clean across all client languages.',
    blindspot: 'SDK-author lens; may push for client-friendly design that complicates server implementation unnecessarily.',
  },
  'Jordan Akiyama': {
    champion: 'Time-to-first-200 is under 5 minutes, auth is clear, and the minimal worked example actually works.',
    blindspot: 'Hackathon-speed focus; may optimize for getting-started experience at the expense of production-grade design.',
  },
  'Salma Idris': {
    champion: 'Auth scopes are explicit, rate limits are documented, PII is out of URLs, and the security model is designed for least privilege.',
    blindspot: 'Security strictness; may push for scoping granularity that makes the API harder to use without meaningful risk reduction.',
  },
  'Ben Olafsson': {
    champion: 'Expected QPS is documented, quota story is clear, degradation behavior is specified, and capacity is priceable.',
    blindspot: 'Capacity-planning lens; may over-index on scaling characteristics for an API that won\'t see high traffic for years.',
  },

  // === POSTMORTEM ===
  'Mei Hartwell': {
    champion: 'Blamelessness is real (not performative), contributing factors are systemic, and the question is "what made this easy to do wrong."',
    blindspot: 'Blamelessness enforcement may prevent naming specific process failures that need individual accountability to fix.',
  },
  'Reuben Castellanos': {
    champion: 'Timeline is honest — including the embarrassing gap between detection and diagnosis where nobody knew what was happening.',
    blindspot: 'Timeline focus; may miss contributing factors that aren\'t visible in the chronological sequence.',
  },
  'Lin Zhao': {
    champion: 'Impact is described in user terms (checkouts failed, data lost), not internal metrics (p99 elevated).',
    blindspot: 'Customer-language focus; may lose technical precision that engineering teams need for prevention.',
  },
  'Aditya Banerjee': {
    champion: 'Every action item has an owner, a deadline, a priority, and a verification plan — this postmortem will produce shipped fixes.',
    blindspot: 'Action-item focus; may prioritize tractable fixes over harder systemic changes that would prevent the class of incident.',
  },
  'Quinn Aldridge': {
    champion: 'Lessons are generalized enough that other teams can apply them without having experienced this specific incident.',
    blindspot: 'Generalization push; may dilute incident-specific lessons into vague platitudes that don\'t drive action.',
  },
  'Tomás Reis': {
    champion: 'Incident classification is correct, regulatory notification timeline is met, and the postmortem is defensible as a legal artifact.',
    blindspot: 'Compliance lens; may push for sanitized language that makes the postmortem less useful for engineering learning.',
  },

  // === RUNBOOK / OPERATIONAL PLAYBOOK ===
  'Frances Idemudia': {
    champion: 'Diagnostic decision tree is on line 1, every command is copy-pasteable, prerequisites are stated up front — she\'d add this to onboarding.',
    blindspot: 'Execution speed focus; may not question whether the runbook addresses the right failure mode in the first place.',
  },
  'Hassan Ortega': {
    champion: 'Diagnostic tree teaches both diagnosis and remediation — a reader learns the system, not just the fix.',
    blindspot: 'Diagnosis-teaching goal may make runbooks too long for 3 a.m. execution when speed matters most.',
  },
  'Lena Brock': {
    champion: 'Escalation criteria are crystal clear — a reader knows exactly when to page the IC versus handle solo.',
    blindspot: 'IC-perspective bias; may over-weight escalation protocols at the expense of single-responder efficiency.',
  },
  'Ravi Subramanian': {
    champion: 'Every acronym is defined, every tool is linked, and a week-2 new hire can follow the runbook without asking anyone.',
    blindspot: 'Newcomer lens; may push for verbosity that slows down experienced engineers who just need the commands.',
  },
  'Pippa Crowley': {
    champion: 'Every manual step has been evaluated for scriptability, env/region/credentials are parameterized, not hardcoded.',
    blindspot: 'Automation bias; may push to script steps that benefit from human judgment during an incident.',
  },

  // === README + CONTRIBUTING ===
  'Ada Rinaldi': {
    champion: 'What the project does is clear in the first paragraph, install command is above the fold, and she knows if it belongs in her stack.',
    blindspot: 'First-impression focus; may optimize the top of the README at the expense of deeper documentation.',
  },
  'Kofi Mensah': {
    champion: 'CONTRIBUTING.md has local-dev setup, good-first-issue guidance, and every undocumented step is documented — he can ship a PR today.',
    blindspot: 'Contributor-onboarding focus; may push for contributor documentation that the maintainer can\'t keep up to date.',
  },
  'Yelena Iversen': {
    champion: 'README promises only what the maintainer can deliver, support guarantees are realistic, and the roadmap is honest.',
    blindspot: 'Future-proofing pessimism; may strip aspirational content that helps the project attract contributors.',
  },
  'Devon Whitley': {
    champion: 'LICENSE is clear, SECURITY.md exists, supply-chain statement is present — procurement would greenlight this.',
    blindspot: 'Enterprise-compliance lens; may push for governance overhead that\'s inappropriate for a small OSS project.',
  },
  'Bea Oduya': {
    champion: 'Last-commit badge is green, roadmap exists, dependencies are maintained — this project is clearly alive and loved.',
    blindspot: 'Aliveness-signal focus; may dismiss stable, feature-complete projects that intentionally have low commit frequency.',
  },

  // === MIGRATION PLAN ===
  'Iris Halverson': {
    champion: 'Every phase is reversible, rollback is tested, and the final irreversible step is announced separately with explicit go/no-go criteria.',
    blindspot: 'Reversibility absolutism; some migrations are inherently one-way (schema changes) and need forward-fix plans instead.',
  },
  'Shankar Velayudhan': {
    champion: 'Deprecation window exceeds his team\'s release cycle, migration tooling is provided, and the forced work is genuinely minimal.',
    blindspot: 'Consumer-team protectionism; may resist migrations that impose short-term cost but deliver long-term platform value.',
  },
  'Cora Begum': {
    champion: 'External announcement has FAQ, top-3 use-case examples, no internal jargon, and a developer could self-serve the migration.',
    blindspot: 'DevRel lens; may push for external polish at the expense of internal execution clarity.',
  },
  'Niko Lazaridis': {
    champion: 'Dual-write and shadow-traffic costs are estimated, coexistence period is bounded, and capacity impact is budgeted.',
    blindspot: 'Capacity focus; may over-weight infrastructure cost and under-weight the product value of completing the migration.',
  },
  'Marisol Pinto': {
    champion: 'Escalation path for stuck customers exists, white-glove accounts are listed, and the long tail is planned for.',
    blindspot: 'Customer-success bias; may push for accommodation that delays migration completion indefinitely.',
  },
  'Avi Sternlicht': {
    champion: 'Migration is justified by what it unlocks, not what it tidies — the "what breaks if we don\'t" answer is compelling.',
    blindspot: 'Skeptic role means he may block necessary maintenance migrations that don\'t have a flashy unlock story.',
  },

  // === SECURITY REVIEW / THREAT MODEL ===
  'Selma Karaköy': {
    champion: 'Every STRIDE category has substantive entries, mitigations are owned, and the threat model covers the actual attack surface.',
    blindspot: 'Checklist completeness focus; may flag low-impact STRIDE entries that dilute attention from the real threats.',
  },
  'Eitan Foss': {
    champion: 'Attacker model includes insider threat with valid credentials, attack chains are realistic, and the red team would struggle to find gaps.',
    blindspot: 'Offensive-security mindset; may push for mitigations against sophisticated attacks when the real risk is misconfiguration.',
  },
  'Nadia Worthington': {
    champion: 'Every mitigation has an owner, a timeline, and funded engineering work — these mitigations will actually ship.',
    blindspot: 'Ownership focus; may approve a threat model with good ownership but weak threat identification.',
  },
  'Arthur Mendes': {
    champion: 'PII flows are enumerated, data residency is addressed, retention is specified, and the privacy impact is manageable.',
    blindspot: 'Privacy-compliance lens; may miss application-layer security issues that don\'t involve personal data.',
  },
  'Jules Akinwale': {
    champion: 'Security controls have priced-in operational cost, automation replaces manual rotation, and uptime impact is acceptable.',
    blindspot: 'Operational-cost focus; may push to weaken security controls because they\'re expensive to operate.',
  },
  'Hugo Bellamy': {
    champion: 'Severity calibration is honest — highs are genuinely high, mediums are genuinely medium, and the risk budget is realistic.',
    blindspot: 'Calibration focus; may under-weight emerging threats that haven\'t been seen in production yet.',
  },

  // === ML/AI EVAL PLAN ===
  'Dr. Imani Faulkner': {
    champion: 'Eval is pre-registered, held-out hard slices are defined, and there\'s no leakage between train and eval sets.',
    blindspot: 'Eval-integrity focus; may miss that a perfectly clean eval doesn\'t matter if the model isn\'t solving the right problem.',
  },
  'Petros Kallergis': {
    champion: 'Online monitoring plan extends past launch, offline metrics have online proxies, and degradation is detectable.',
    blindspot: 'MLOps lens; may over-weight production monitoring at the expense of model quality improvements.',
  },
  'Renée Mukherjee': {
    champion: 'Subgroup performance is reported across meaningful demographic axes with disaggregated metrics — no hidden failures.',
    blindspot: 'Fairness focus; may push for subgroup reporting granularity that is statistically underpowered.',
  },
  'Walt Brzezinski': {
    champion: 'Model card is readable by PMs, metrics translate to product behavior, and deployment decisions are informed.',
    blindspot: 'Product-translation focus; may approve a model card that\'s PM-readable but technically imprecise.',
  },
  'Ophelia Stratton': {
    champion: 'Failure modes are described in domain-realistic scenarios that a clinician or lawyer would recognize as real.',
    blindspot: 'Domain-expert lens; may miss statistical subtleties that affect model behavior outside her specific domain.',
  },
  'Caleb Harte': {
    champion: 'Adversarial robustness is considered, prompt injection is addressed, and the eval assumes hostile users exist.',
    blindspot: 'Adversarial focus; may push for robustness against unlikely attacks at the expense of model utility.',
  },
  'Vera Mladenovic': {
    champion: 'Intended use is deliberate, prohibited uses are stated, and the legal artifact is defensible.',
    blindspot: 'Legal lens; may push for use restrictions that are so narrow the model can\'t be deployed usefully.',
  },

  // === DEVELOPER DOCS ===
  'Sora Lindgren': {
    champion: 'Diataxis modes are clean, tutorial stays tutorial, reference stays reference — a reader always knows what mode they\'re in.',
    blindspot: 'Mode-boundary enforcement may create artificial separation that fragments naturally connected content.',
  },
  'Felix Andrade': {
    champion: 'Tutorial runs end-to-end with zero friction, every prerequisite is stated, and every command works on first try.',
    blindspot: 'New-user focus; may push for hand-holding that makes docs tedious for experienced users.',
  },
  'Naomi Glassman': {
    champion: 'Every parameter is documented with type, default, and example — the reference is a complete lookup table.',
    blindspot: 'Completeness focus; may push for exhaustive documentation of rarely-used parameters.',
  },
  'Theo Bauer': {
    champion: 'Explanation provides the mental model — after reading, a newcomer understands *why* the system works this way.',
    blindspot: 'Mental-model focus; may push for conceptual depth that delays readers who just need to get something done.',
  },
  'Camila Restrepo': {
    champion: 'Task is in the title, answer is in the first paragraph, and the search-landing visitor finishes the task without scrolling past setup.',
    blindspot: 'Search-landing optimization; may push for self-contained pages that duplicate content across how-to guides.',
  },

  // === PRESS RELEASE ===
  'Maya Okonkwo': {
    champion: 'Headline has a non-obvious "why now," the lede is the story (not the funding amount), and she\'d pitch it to her editor.',
    blindspot: 'Story-hunting lens; may push for narrative angle that the company doesn\'t want as its primary message.',
  },
  'Daniel Reisman': {
    champion: 'Material facts are unambiguous in one read, dollar figures are prominent, and the wire editor can file in 5 minutes.',
    blindspot: 'Wire-speed focus; may strip context that slower-cycle journalists need for a deeper piece.',
  },
  'Priya Shah': {
    champion: 'The release honestly signals the company\'s real position — growth metric, customer name, or recognizable hire backs the tone.',
    blindspot: 'Competitive-signal reading; may over-interpret normal PR language as strategic vulnerability.',
  },
  'Elena Voss': {
    champion: 'Zero Reg FD exposure, no unsupportable superlatives, and customer quotes don\'t imply undisclosed contracts.',
    blindspot: 'Securities-law lens; may kill effective marketing language that carries negligible legal risk.',
  },
  'Hacker News Reader': {
    champion: 'Technical claims match the engineering blog, buzzword density is zero, and the release would survive a top-HN comment thread.',
    blindspot: 'Technical-audience bias; the release may not be targeting HN readers at all.',
  },
  'Sam Lee': {
    champion: 'New positioning is consistent with what was sold, workflow isn\'t changing, and the existing customer feels valued, not disrupted.',
    blindspot: 'Existing-customer conservatism; may resist positioning evolution that\'s necessary for the company\'s growth.',
  },

  // === CRISIS COMMS ===
  'Karen Mehta': {
    champion: 'Apology precedes explanation, specific harm is named, remediation is concrete, and the affected party feels heard first.',
    blindspot: 'PR-partner lens; may optimize for public perception over internal accountability.',
  },
  'Hon. Robert Kang': {
    champion: 'No sentence in the statement could become Exhibit A — quantification is careful, remediation promises are bounded.',
    blindspot: 'Litigation avoidance; may sanitize the statement to the point where affected parties feel the company isn\'t taking responsibility.',
  },
  'Aisha Bello': {
    champion: 'She knows if she\'s affected, what the company is doing for her, and who is accountable — she\'d share this as evidence of real accountability.',
    blindspot: 'Affected-party perspective; may demand specificity that creates additional legal or operational exposure.',
  },
  'Marcus Wei': {
    champion: 'Public statement and leaked internal comms tell the same story — no contradictions for a reporter to exploit.',
    blindspot: 'Contradiction-hunting journalist; may flag minor internal/external wording differences as substantive when they\'re not.',
  },
  'Senator\'s Staffer': {
    champion: 'Executive is pinned to specific remediation with dates and dollar amounts — enough to satisfy a preliminary inquiry.',
    blindspot: 'Political lens; may push for commitments that are operationally impossible to deliver on the stated timeline.',
  },
  'Internal Employee on Slack': {
    champion: 'External and internal statements align — the screenshot to the group chat won\'t embarrass leadership.',
    blindspot: 'Internal-alignment focus; may miss that external audiences need different framing than internal ones.',
  },
  'infosec_skeptic': {
    champion: 'Technical details are specific and accurate — "rotating credentials" means a specific mechanism, and someone competent clearly reviewed this.',
    blindspot: 'Technical-detail focus; may miss that the statement\'s primary audience is non-technical affected parties.',
  },

  // === LANDING PAGE / PRICING ===
  'Harry "Ad Copy" Daniels': {
    champion: 'Every line fails the competitor-swap test — no other company in the category could put their logo on this page.',
    blindspot: 'Uniqueness obsession; may reject clear, effective copy that uses standard category language customers expect.',
  },
  'Jen Park': {
    champion: 'CTA hierarchy is clean, hero section communicates in one sentence, and every word above the fold earns its place.',
    blindspot: 'Demand-gen conversion focus; may strip brand-building content that doesn\'t directly drive CTA clicks.',
  },
  'Net-New Prospect': {
    champion: 'Knows what this is, who it\'s for, and whether to keep reading — all in 20 seconds without jargon.',
    blindspot: 'Low-context perspective; may push for simplification that undersells the product to sophisticated buyers.',
  },
  'Switching Prospect': {
    champion: 'Migration story is clear, differentiator is specific ("we let you do Z that X cannot"), and the switch feels safe.',
    blindspot: 'Switching-cost focus; may miss that some prospects aren\'t switching from anything — they\'re new to the category.',
  },
  'Procurement': {
    champion: 'Pricing is transparent, no hidden gotchas, and the tier that fits them doesn\'t require "contact sales."',
    blindspot: 'Gotcha-hunting focus; may flag standard enterprise pricing practices as deceptive.',
  },
  'Karri-style Design Engineer': {
    champion: 'Typographic rhythm, density, and craft signal that this company builds products with the same attention to detail.',
    blindspot: 'Craft-bar obsession; may reject effective-but-unpolished pages that convert well despite aesthetic flaws.',
  },
  'Mobile User on a Train': {
    champion: 'Comparison works one-thumbed, no horizontal scroll, modals dismiss cleanly, and the page loads fast on mobile data.',
    blindspot: 'Mobile-only lens; may push for mobile optimization that degrades the desktop experience.',
  },

  // === COLD EMAIL ===
  'Anthony "Iannarino" Mehta': {
    champion: 'Every line establishes the prospect\'s problem before the company\'s solution — the email offers information they couldn\'t get without it.',
    blindspot: 'Sales-philosophy focus; may reject effective sequences that use proven patterns he considers outdated.',
  },
  'Veronica Liu': {
    champion: 'Subject line is under 6 words, the email names a specific bet she\'s publicly made, and offers a specific data point worth 30 seconds.',
    blindspot: 'VP-level perspective; what works for her inbox may not work for ICs or directors with different email patterns.',
  },
  'Deliverability Engineer': {
    champion: 'Plain text, minimal links, warmed sender list — the technical infrastructure won\'t undermine the content.',
    blindspot: 'Deliverability focus; may push for technical constraints that limit creative email design.',
  },
  'Rahul Vohra': {
    champion: 'Email fits on one phone screen, has exactly one ask, and every line earns its place — would clear Superhuman triage.',
    blindspot: 'Power-user inbox; his triage behavior may not represent the typical prospect\'s email workflow.',
  },
  'Skeptical IC Below the Buyer': {
    champion: 'Case studies match company size, claims are realistic, and the pitch would survive a "let me check this out" delegation.',
    blindspot: 'IC-vetting lens; may miss that the email\'s real job is to get the meeting, not to survive detailed scrutiny.',
  },
  'Compliance Officer': {
    champion: 'No ROI guarantees, no comparative claims without footnotes, and the sequence is compliant with relevant ad rules.',
    blindspot: 'Regulatory strictness; may kill effective sales language that carries minimal actual compliance risk.',
  },

  // === LAUNCH ANNOUNCEMENT ===
  'Hook Critic': {
    champion: 'Tweet 1 works alone in someone\'s quote-tweet, the hook doesn\'t need the thread, and it stops the scroll.',
    blindspot: 'Hook obsession; may optimize the opening at the expense of the substance that follows.',
  },
  'Justin Welsh-Style LinkedIn Operator': {
    champion: 'Paragraphs are under two lines on mobile, visual rhythm is optimized for scrolling, and the format rewards the algorithm.',
    blindspot: 'Platform-format focus; may push for LinkedIn-optimal formatting that feels inauthentic for some brands.',
  },
  'Skeptical Engineer in the Replies': {
    champion: 'Technical claims are backed by methodology, docs confirm the benchmarks, and the obvious objection is pre-rebutted.',
    blindspot: 'Engineer-skeptic lens; may hold launch copy to technical-documentation standards when the audience is broader.',
  },
  'Existing Customer / Beta User': {
    champion: 'Launch copy matches their experience, known limitations are acknowledged, and beta users feel respected, not used.',
    blindspot: 'Beta-user perspective; may push for caveats that undermine launch excitement for new prospects.',
  },
  'Competing Founder Watching': {
    champion: 'Positioning is confident, consistent with previous claims, and reveals strategic clarity — no roadmap leak, no retreat.',
    blindspot: 'Competitive-intelligence reading; may flag normal positioning evolution as "retreat" when it\'s healthy refinement.',
  },
  'Press / Newsletter Aggregator': {
    champion: 'Second sentence is portable, announcement is self-contained, and inclusion in the weekly roundup is obvious.',
    blindspot: 'Aggregator lens; may push for soundbite-friendly copy that loses nuance the company cares about.',
  },

  // === BRAND GUIDELINES ===
  'April Dunford-Inspired Positioning Lead': {
    champion: 'Positioning names the competitive alternative the customer rejects, the differentiated value, and the market category — Dunford\'s three pillars.',
    blindspot: 'Positioning-theory focus; may push for framework completeness that overwhelms the junior copywriter who needs to ship.',
  },
  'Junior Copywriter on Their First Day': {
    champion: 'She can open the doc and ship a tweet, email subject, and CTA by lunch without asking anyone for clarification.',
    blindspot: 'First-day lens; may push for oversimplification that strips the nuance experienced marketers need.',
  },
  'Brand Designer': {
    champion: 'Visual enforces verbal — typography, color, and layout choices align with the voice principles.',
    blindspot: 'Visual-verbal alignment focus; may not evaluate whether the messaging itself is correct.',
  },
  'Customer Researcher': {
    champion: 'Messaging uses words customers actually say in sales calls, not category jargon the marketing team invented.',
    blindspot: 'Customer-language literalism; may resist aspirational positioning language that shapes how customers think about the category.',
  },
  'Mailchimp-Style Content Designer': {
    champion: 'Voice is operationalized with before/after rewrites for different contexts — a writer can apply tone-vs-voice consistently.',
    blindspot: 'Operationalization focus; may push for process overhead that stifles creative writing.',
  },
  'Skeptical Sales Rep': {
    champion: 'Every line of messaging is something the front line would actually say on a call without embarrassment.',
    blindspot: 'Sales-floor lens; may resist aspirational brand language that builds long-term positioning but isn\'t sales-call ready.',
  },

  // === CASE STUDY ===
  'Doug Kessler-Inspired B2B Editor': {
    champion: 'Story includes the messy middle, setbacks are present, and the narrative trusts the buyer to handle reality.',
    blindspot: 'Messy-middle obsession; may push for vulnerability that the featured customer isn\'t comfortable sharing.',
  },
  'Buyer in the Same Industry': {
    champion: 'Company size is named, metrics have baselines, and the arithmetic maps to his own numbers — he can build the business case.',
    blindspot: 'Same-industry lens; may miss that the case study also needs to work for adjacent industries.',
  },
  'Featured Customer\'s Manager': {
    champion: 'Customer brand is protected, revenue figures are omitted or approved, and the before-state is accurate, not dramatized.',
    blindspot: 'Brand-protection bias; may sanitize the story to the point where it lacks the authenticity that sells.',
  },
  'Skeptical Analyst': {
    champion: 'ROI has a baseline, time horizon, and attribution model — the methodology would survive a Forrester Wave evaluation.',
    blindspot: 'Methodology rigor; may demand analytical depth that makes the case study unreadable for non-analyst buyers.',
  },
  'Sales Rep About to Use This in a Deal': {
    champion: 'The 30-second verbal version is extractable, the soundbite is ready, and it would land on a sales call.',
    blindspot: 'Sales-call utility; may push for simplification that strips the detail sophisticated buyers need.',
  },
  'Hero Customer': {
    champion: 'The customer is the hero of their own story, the vendor is the supporting character, and renewal feels earned.',
    blindspot: 'Hero-customer focus; may resist framing that highlights the vendor\'s unique contribution.',
  },

  // === EARNINGS IR ===
  'IR-Designated CFO Spokesperson': {
    champion: 'Release matches what they\'ll say on the call, forward-looking language preserves optionality, and every adjective is defensible.',
    blindspot: 'Message-control bias; may strip authentic tone that investors value in favor of legally safe boilerplate.',
  },
  'Sell-Side Analyst': {
    champion: 'Segment breakouts are present, prior periods are bridged, and the model can be updated in 10 minutes.',
    blindspot: 'Model-update focus; may miss narrative elements that signal strategic shifts not yet in the numbers.',
  },
  'Activist Hedge Fund Analyst': {
    champion: 'Headline number and cash-flow statement tell the same story — GAAP-to-non-GAAP adjustments are stable and justified.',
    blindspot: 'Activist lens; may interpret normal accounting practices as red flags because he\'s looking for ammunition.',
  },
  'Retail Investor on r/investing': {
    champion: 'A non-finance human can answer "did they beat?" in 30 seconds — the headline number is clear and contextualized.',
    blindspot: 'Simplification bias; may push for clarity that obscures important nuance about segment performance.',
  },
  'Financial Reporter': {
    champion: 'The lede writes itself in 90 seconds — revenue is comparable, framing is straightforward, and the headline will be fair.',
    blindspot: 'Headline focus; may push for lede-friendly framing that doesn\'t serve investors doing deeper analysis.',
  },

  // === CONFERENCE ABSTRACT ===
  'CFP Committee Member': {
    champion: 'Abstract states what the audience will be able to do differently after the talk — it\'s a "pick" in the first 30 seconds.',
    blindspot: 'Committee-volume lens; may favor safe, categorizable abstracts over genuinely novel proposals that don\'t fit a track.',
  },
  'Conference Organizer Who Owns the Track': {
    champion: 'Title is specific enough to slot into the program, fills a visible gap, and complements rather than overlaps adjacent talks.',
    blindspot: 'Programming-gap focus; may value track diversity over talk quality.',
  },
  'Target Attendee': {
    champion: 'Prerequisites are named, expertise level is clear, and she\'d walk into this room over the one across the hall.',
    blindspot: 'Attendee self-interest; may favor talks that serve her current project over talks that expand her thinking.',
  },
  'Skeptical Senior in the Room': {
    champion: 'Bio has receipts (shipped product, named war story), and the abstract promises operator scars, not blog-post recap.',
    blindspot: 'Seniority bias; may dismiss talks from less experienced speakers who have genuinely novel perspectives.',
  },
  'Past-Self of the Speaker': {
    champion: 'Past-self would have attended and left with something actionable — jargon is at the right level.',
    blindspot: 'Speaker-centrism; what the speaker\'s past-self needed may not match what the actual audience needs.',
  },
  'Twitter Recap Writer': {
    champion: 'There\'s at least one screenshot-able takeaway — the slide that travels and gives the talk its afterlife.',
    blindspot: 'Virality focus; may push for tweetable soundbites at the expense of depth.',
  },

  // === NEWSLETTER ===
  'Lenny-Style Operator-Audience Reader': {
    champion: 'He can recall a specific, actionable takeaway from this post next week — it earned the subscription price.',
    blindspot: 'Operator-utility lens; may dismiss posts that build intellectual frameworks rather than providing immediate tactics.',
  },
  'Stratechery-Style Analytical Reader': {
    champion: 'Argument is sourced, analogy holds under scrutiny, and the analysis adds to the newsletter\'s cumulative track record.',
    blindspot: 'Analytical rigor; may reject posts with genuine insight expressed in a more casual or personal style.',
  },
  'First-Time Visitor From a Tweet': {
    champion: 'Post is self-contained, subscribable in 20 seconds, and doesn\'t require backstory from previous issues.',
    blindspot: 'First-visit focus; may push for self-contained posts that break serial narratives loyal subscribers value.',
  },
  'Subscriber Considering Cancellation': {
    champion: 'This post alone justifies keeping the subscription — it\'s clearly not filler.',
    blindspot: 'Cancellation-threshold lens; may be too harsh on transitional posts that set up important future pieces.',
  },
  'Editor / Copyeditor': {
    champion: 'Paragraph length, link density, and scannability are all optimized for the medium — it reads well on phone.',
    blindspot: 'Formatting focus; may prioritize visual rhythm over content substance.',
  },
  'Distribution-Aware Marketer': {
    champion: 'Headline survives a tweet, post has a portable hook, and the sharing mechanics are engineered in.',
    blindspot: 'Distribution optimization; may push for clickbait-adjacent hooks that undermine the newsletter\'s credibility.',
  },

  // === PATIENT-FACING HEALTH INFO ===
  'Marisol Vega': {
    champion: 'She can read it aloud, paraphrase every sentence back, and knows exactly what to do next.',
    blindspot: 'Limited-literacy perspective; may push for simplification that loses clinical precision providers need.',
  },
  'Dr. Anita Rao': {
    champion: 'The handout actually prevents phone calls — patients leave the visit understanding their next steps without needing to call back.',
    blindspot: 'Clinician efficiency lens; may prioritize call-prevention over patient empowerment.',
  },
  'Jordan Pak': {
    champion: 'CCI score ≥ 90, risk frequencies use absolute numbers with denominators, and the material is CDC-clear.',
    blindspot: 'Index-score focus; a perfect CCI score doesn\'t guarantee the material addresses the patient\'s actual concerns.',
  },
  'Hannah Liebermann': {
    champion: 'Every risk has a specific frequency, "may" always has a number, and the disclosure would survive plaintiff scrutiny.',
    blindspot: 'Litigation lens; may push for disclosure precision that raises reading level and confuses patients.',
  },
  'Dr. Frank Olusegun': {
    champion: 'All 45 CFR 46.116 elements are present and Flesch-Kincaid is ≤ 8.0 — compliance and comprehension coexist.',
    blindspot: 'IRB compliance focus; may approve materials that are technically compliant but emotionally alienating.',
  },
  'Naomi Brackett': {
    champion: 'Teach-back simulation succeeds — instructions are actionable, numeracy requirements are ≤ 5th grade, and the handout scripts a real conversation.',
    blindspot: 'Teach-back focus; may over-optimize for oral communication at the expense of written reference utility.',
  },

  // === CLINICAL RESEARCH ABSTRACT ===
  'Dr. Wendell Hsu': {
    champion: 'Bottom line is extractable in 60 seconds and the "should I change practice?" question has a clear answer.',
    blindspot: 'Practice-change focus; may miss methodological issues that affect the validity of the bottom line.',
  },
  'Dr. Priya Sundaresan': {
    champion: 'Population, intervention, comparator, and primary outcome with CI are all present and properly reported.',
    blindspot: 'Methodological rigor; may reject an abstract that reports a genuinely important finding with minor reporting gaps.',
  },
  'Tomás Ribeiro': {
    champion: 'PRISMA-A or CONSORT-A compliance is complete, registration number is present, and the abstract would enter a meta-analysis cleanly.',
    blindspot: 'Reporting-standard focus; compliance doesn\'t guarantee the research question is important.',
  },
  'Dr. Hugh McAllister': {
    champion: 'Conclusion is directly supported by reported results, no spin, and the abstract represents what the paper actually found.',
    blindspot: 'Spin-detection focus; may flag appropriate clinical interpretation as "spin" when the authors are drawing reasonable inferences.',
  },
  'Dr. Mei-Lin Choi': {
    champion: 'Dose, route, duration, NNT/NNH are all reported — a pharmacist can evaluate clinical significance independently.',
    blindspot: 'Pharmacotherapy lens; may miss statistical or design issues outside her clinical specialty.',
  },

  // === CONTRACT / TOS ===
  'Devon Marsh': {
    champion: 'Data collection, waiver scope, and termination process are all identifiable without re-reading — the consumer can make an informed choice.',
    blindspot: 'Consumer-comprehension focus; may push for simplification that removes legally necessary precision.',
  },
  'Anya Kowalski': {
    champion: 'Zero doublets, defined terms are minimal, no sentence exceeds 40 words, and the contract is in plain language that\'s still enforceable.',
    blindspot: 'Plain-language absolutism; some legal precision genuinely requires complex sentence structures.',
  },
  'Marcus Webb': {
    champion: 'No ambiguity exploitable contra proferentem, every obligation is clear, and the contract would survive litigation without surprises.',
    blindspot: 'Litigation-readiness focus; may push for drafter-favorable language that undermines consumer trust.',
  },
  'Renata Oduya': {
    champion: 'Cancel is as easy as signup, granular consent is available, and the FTC wouldn\'t have a case.',
    blindspot: 'Consumer-protection lens; may flag industry-standard practices as deceptive when they\'re legally compliant.',
  },
  'Dr. Sun-Hee Lim': {
    champion: 'Flesch ≥ 50, FK grade ≤ 8, plain-language summary exists, and structure carries half the comprehension load.',
    blindspot: 'Readability-metrics focus; high readability scores don\'t guarantee the reader understands their obligations.',
  },
  'Karen Voss': {
    champion: 'Arbitration is enforceable, DPA covers EU users, and every clause would survive a challenge — the contract works.',
    blindspot: 'Enforceability focus; may approve consumer-hostile terms because they\'re technically enforceable.',
  },

  // === LEGAL BRIEF ===
  'Hon. Marian Costa': {
    champion: 'Deep issue is on page 1 line 1, holding sought is clear, and best authority is cited — she knows what you want before paragraph 2.',
    blindspot: 'Judicial efficiency preference; may undervalue thorough factual development that supports the legal argument.',
  },
  'Eli Brandt': {
    champion: 'Every cite is accurate, signals are used correctly, pinpoint citations are present, and the brief looks credible on first scan.',
    blindspot: 'Citation-form focus; perfect citations don\'t mean the argument is persuasive.',
  },
  'Sasha Reuben': {
    champion: 'The brief addresses every argument opposing counsel would make, and the response he\'d write has no good moves left.',
    blindspot: 'Opposing-counsel simulation; may miss arguments that are weak on paper but effective with a specific judge.',
  },
  'Prof. Iris Demetriou': {
    champion: 'Prose is clean — short sentences, active voice, topic sentences, no throat-clearing — the writing itself builds ethos.',
    blindspot: 'Writing-craft focus; may prioritize prose quality over legal substance in complex arguments.',
  },
  'Brent Marlowe': {
    champion: 'Every local-rule requirement is met — the brief will be accepted by the clerk before the judge reads word one.',
    blindspot: 'Procedural compliance; a locally-compliant brief can still be substantively weak.',
  },
  'Dr. Tasha Ade': {
    champion: 'Theme is unified, strongest argument gets primacy/recency positions, and the brief reads as a persuasive narrative, not a list of points.',
    blindspot: 'Persuasion-theory lens; may push for narrative arc that obscures straightforward legal analysis some judges prefer.',
  },

  // === POLICY MEMO ===
  'Chief of Staff Carla Mendez': {
    champion: 'Recommendation is in the first paragraph, the ask is clear, and she can brief the principal in 3 minutes from the first half-page.',
    blindspot: 'BLUF focus; may sacrifice analytical depth for executive brevity.',
  },
  'Dr. Henry Voorhees': {
    champion: 'Causal chain has an identification strategy, counterfactual is specified, and the policy lever would actually move the outcome.',
    blindspot: 'Analytical rigor; may reject good-enough policy analysis because the identification strategy isn\'t academic-grade.',
  },
  'Maya Chen': {
    champion: 'Active voice, short sentences, headings, and plain language — a 12th-grader could understand the recommendation.',
    blindspot: 'Plain-language enforcement; may strip technical precision that policy experts need.',
  },
  'Sen. Aide Brooks Whitman': {
    champion: 'Stakeholder analysis is present, opposition is named, and the memo is politically viable — it could survive a floor vote.',
    blindspot: 'Political-feasibility focus; may block good policy because it\'s politically difficult.',
  },
  'Yusra Khalil': {
    champion: 'Objections are tied to specific rule text, arguments are preserved for judicial review, and the comment is Loper-Bright-ready.',
    blindspot: 'APA-procedure focus; may miss that a technically preserved argument is substantively weak.',
  },
  'Dr. Olabisi Akande': {
    champion: 'Costs, benefits, and transfers are quantified, alternatives are analyzed, and the cost-benefit passes OIRA review.',
    blindspot: 'Monetization focus; may undervalue benefits that are real but genuinely hard to quantify.',
  },

  // === LEGISLATIVE TESTIMONY / OP-ED ===
  'Rep. Lori Bechtel': {
    champion: 'One bill, one position, one district connection — she heard it in 2 minutes and knows how to act.',
    blindspot: 'Legislator efficiency; may dismiss testimony that builds important context beyond the immediate ask.',
  },
  'Tomás Calderón': {
    champion: 'The human story grounds the policy in a real person\'s experience and is tied directly to the policy mechanism.',
    blindspot: 'Story focus; may over-weight narrative impact and under-weight analytical evidence.',
  },
  'Dale Whitcomb': {
    champion: 'Lede hooks in 60 words, thesis is singular, and the op-ed makes one point well in 750 words.',
    blindspot: 'Editor lens; may push for conventional op-ed structure when a non-traditional form might be more effective.',
  },
  'Ariel Norquist': {
    champion: 'Every paragraph produces a quote, a tweet, or a vote — the message stays on-coalition throughout.',
    blindspot: 'Coalition-message discipline; may suppress nuanced positions that would actually strengthen the argument.',
  },
  'Stuart Halberg': {
    champion: 'Every factual claim has a source, no attack boomerangs, and the worst sentence couldn\'t be weaponized out of context.',
    blindspot: 'Opposition-staffer hostility; may flag language as risky when the real audience wouldn\'t interpret it that way.',
  },

  // === ACADEMIC PAPER ===
  'Prof. Esther Lindqvist': {
    champion: 'Gap is real, contribution is novel, literature review builds an argument (not a list), and the seminal papers are cited.',
    blindspot: 'Subfield expertise; may miss relevant work from adjacent fields that addresses the same gap.',
  },
  'Dr. Reviewer #2': {
    champion: 'Every claim in the Discussion is backed by reported Results, limitations are stated, and the paper doesn\'t overclaim.',
    blindspot: 'Overclaim-hunting; may reject appropriate interpretation of results as "overreach" when the authors are being reasonable.',
  },
  'Prof. Ngozi Ogundipe': {
    champion: 'Contribution sentence is in the intro, the "so what" is clear by paragraph 3, and the paper merits send-for-review.',
    blindspot: 'Desk-reject lens; may dismiss papers that develop slowly but make important contributions.',
  },
  'Aditya Sankar': {
    champion: 'After reading the intro cold, he can restate the research question in one sentence — the writing is that clear.',
    blindspot: 'Cross-field reader; may flag necessary domain-specific terminology as "jargon" when experts need it.',
  },
  'Prof. Cal Winterborn': {
    champion: 'Zero metadiscourse, minimal nominalizations, and the prose achieves classic style — writer and reader looking at the world together.',
    blindspot: 'Prose-quality focus; may prioritize writing style over substantive contribution.',
  },
  'Dr. Marcia Olstad': {
    champion: 'Pre-registration is disclosed, limitations paragraph is honest, and the study could be replicated from the methods description.',
    blindspot: 'Rigor absolutism; may hold all papers to pre-registration standards when the research is exploratory.',
  },

  // === GRANT PROPOSAL ===
  'Dr. Reviewer 1': {
    champion: 'Importance is exceptional — the gap is clearly stated and the proposed work would genuinely fill it.',
    blindspot: 'Significance focus; may score importance highly without scrutinizing whether the approach can deliver.',
  },
  'Dr. Reviewer 2': {
    champion: 'Approach is rigorous — power calc is present, alternatives are planned, pitfalls are addressed, and the rigor plan is real.',
    blindspot: 'Approach focus; may approve a rigorous proposal addressing an unimportant question.',
  },
  'Dr. Reviewer 3': {
    champion: 'Specific Aims page is standalone-comprehensible, and a 30-minute read of all sections tells a coherent story.',
    blindspot: 'Generalist perspective; may miss domain-specific issues that specialist reviewers would catch.',
  },
  'Program Officer Dr. Helena Voigt': {
    champion: 'Portfolio fit is perfect, FOA responsiveness is clear, and the proposal aligns with the institute\'s strategic priorities.',
    blindspot: 'Portfolio-fit focus; may triage excellent science that doesn\'t fit the current funding priorities.',
  },
  'Dr. Broader Impacts reviewer': {
    champion: 'Broader Impacts are concrete, measurable, and go beyond boilerplate — the activities would genuinely broaden participation.',
    blindspot: 'BI focus; may under-weight intellectual merit relative to broader impacts.',
  },
  'Dr. Marisol Ng': {
    champion: 'Theory of change is clear, logic model is present, and the sustainability plan shows the work continues after the grant.',
    blindspot: 'Foundation lens; may apply foundation-style evaluation criteria to NIH/NSF proposals that use different frameworks.',
  },
  'Karen Liu': {
    champion: 'Page limits met, biosketch compliant, budget justified, and every compliance requirement is satisfied — it won\'t be withdrawn.',
    blindspot: 'Compliance tunnel-vision; a compliant proposal can still be scientifically weak.',
  },

  // === CURRICULUM / LESSON PLAN ===
  'Ms. Tanya Reyes': {
    champion: 'This would work in 45 minutes with 28 kids and 3 IEPs — pacing is realistic, transitions are planned, and contingencies exist.',
    blindspot: 'Practical-classroom focus; may resist innovative approaches that require new classroom management skills.',
  },
  'Dr. Jay McTighe-style instructional designer': {
    champion: 'Backward design is intact — assessment measures stated objectives, activities serve assessments, and alignment is airtight.',
    blindspot: 'Design-framework purism; may penalize effective lessons that don\'t follow backward design orthodoxy.',
  },
  'Standards-alignment specialist': {
    champion: 'Standards aren\'t just listed — activities authentically address them and assessments measure standard-aligned outcomes.',
    blindspot: 'Standards focus; may miss that a well-taught lesson addressing important content can be valuable without perfect alignment.',
  },
  'Ms. Imani Carter': {
    champion: 'UDL is present — multiple modalities, scaffolds for diverse learners, language supports — designed for the margins, works for everyone.',
    blindspot: 'Inclusion focus; may push for accommodations that slow the core lesson without benefiting the students who need them.',
  },
  'Student persona': {
    champion: 'Hook lands in the first 2 minutes, relevance is clear, and there\'s agency — the student wants to be here.',
    blindspot: 'Engagement focus; may mistake entertainment for learning.',
  },
  'Department chair': {
    champion: 'Connects to prior and next units, formative assessment data plan exists, and the lesson is a node in the curriculum, not an island.',
    blindspot: 'Vertical-alignment focus; may resist standalone lessons that address timely topics outside the planned sequence.',
  },

  // === EDUCATIONAL EXPLAINER ===
  'Grant Sanderson-style visual-intuition reviewer': {
    champion: 'Motivation precedes formalism, visualization explains (not just illustrates), and the intuition would survive without the formula.',
    blindspot: 'Visual-intuition bias; may resist formal treatment that some learners need for precision.',
  },
  'Sal Khan-style accessibility reviewer': {
    champion: 'Conversational tone, low affective filter, no "obviously" or "trivially" — a nervous learner would feel safe watching this.',
    blindspot: 'Accessibility focus; may push for simplification that patronizes advanced learners.',
  },
  'Dr. Lin Patel': {
    champion: 'Cognitive load is managed — one novel concept per chunk, no redundancy effect, no split attention — working memory stays at 3.',
    blindspot: 'Cognitive-load theory; may fragment content into chunks so small that the learner can\'t see the big picture.',
  },
  'Confused learner persona': {
    champion: 'Every sentence builds on the previous one, no unexplained terms, no unmotivated steps — a bright learner missing one prerequisite can follow.',
    blindspot: 'Prerequisite sensitivity; may flag domain terms that the target audience is expected to know.',
  },
  'Active-learning advocate': {
    champion: 'Retrieval practice is embedded, worked examples are present, predict-then-check prompts appear — the learner is doing, not just watching.',
    blindspot: 'Active-learning absolutism; some content genuinely benefits from extended worked examples before practice.',
  },

  // === CODE REVIEW ===
  'Priya Narayanan': {
    champion: 'Clean abstraction boundary, single-responsibility functions, meaningful names, observable and rollbackable — she\'d LGTM and ship it.',
    blindspot: 'Design-level focus; may miss subtle correctness bugs hiding behind a clean architecture.',
  },
  'Linus-style Hostile-Fork Reviewer': {
    champion: 'Code would survive a hostile fork — minimal internal coupling, defensible public API, no "call home" assumptions, and a maintainer could take it and run.',
    blindspot: 'Fork-survival lens; may push for decoupling that adds complexity in a codebase that will never be forked.',
  },
};

// Process library.md line by line
const lines = content.split('\n');
const output = [];
let i = 0;

while (i < lines.length) {
  const line = lines[i];
  output.push(line);

  // Check if this line has a Load-bearing belief
  if (/^\s+- Load-bearing belief:/.test(line)) {
    // Look back to find the persona name for this block
    let personaName = null;
    for (let j = output.length - 1; j >= 0; j--) {
      const nameMatch = output[j].match(/^\d+\.\s+\*\*(.+?)\s*(?:—|–|-)\s*/);
      if (nameMatch) {
        personaName = nameMatch[1].trim().replace(/\*\*/g, '');
        break;
      }
      // Also match non-numbered persona-like patterns (public-co swap-ins etc.)
      const altMatch = output[j].match(/^\*\*(.+?)\s*(?:—|–|-)\s*/);
      if (altMatch && /Hiring job:|Bounce trigger:/.test(lines.slice(Math.max(0,i-4), i+1).join('\n'))) {
        // These are inline swap-ins, handle them with generic fields
        break;
      }
    }

    // Determine indentation
    const indent = line.match(/^(\s+)/)?.[1] || '   ';

    // Look up persona-specific fields
    let champion, blindspot;
    if (personaName && personaFields[personaName]) {
      champion = personaFields[personaName].champion;
      blindspot = personaFields[personaName].blindspot;
    } else {
      // Generate reasonable defaults for personas not in the map
      // (public-co swap-ins, unnamed personas, etc.)
      // Try partial matching
      let found = false;
      for (const [key, val] of Object.entries(personaFields)) {
        if (personaName && personaName.includes(key)) {
          champion = val.champion;
          blindspot = val.blindspot;
          found = true;
          break;
        }
      }
      if (!found) {
        // Generic but still useful
        champion = 'The artifact demonstrates clear competence in this persona\'s domain — no red flags, well-structured, and ready for its intended audience.';
        blindspot = 'Deep domain expertise in their area may cause tunnel vision on adjacent concerns outside their specialty.';
      }
    }

    output.push(`${indent}- Championing trigger: ${champion}`);
    output.push(`${indent}- Blindspot: ${blindspot}`);
  }

  i++;
}

// Write the transformed file
fs.writeFileSync(libraryPath, output.join('\n'), 'utf-8');

console.log('Done. Added championing triggers and blindspots.');
console.log(`Output lines: ${output.length}`);
