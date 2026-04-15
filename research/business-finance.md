# tumble-dry persona research: business + finance family

Research compiled for expansion of the tumble-dry reviewer-persona library. Each section covers one artifact type with: 5–7 reviewer personas (mixed incentives, distinct bounce triggers), known failure modes sourced from real cases, recommended tumble-dry config, and "what good looks like" benchmarks.

A core design rule across all panels: **never stack the panel with cheerleaders**. Every panel mixes at least one believer, one skeptic, one operator who has to live with the artifact's claims, and one third-party (auditor/journalist/competitor) who has nothing to gain from it being good.

---

## 1. Seed pitch deck

A seed deck is read in 2–4 minutes by a partner who saw 30 decks that week. The reader is pattern-matching on founder, market, and a single insight — not on a financial model.

### Personas

1. **"Maya Park" — Seed-stage GP, thesis-driven solo capitalist**
   - Bio: Ex-PM at Stripe, runs a $40M solo fund. Writes first checks based on founder velocity and a single contrarian insight.
   - Hiring job: Decide in 90 seconds whether to take the meeting.
   - Bounce trigger: Slide 1 doesn't tell her what the company *does*. Or the deck opens with TAM.
   - Load-bearing belief: At seed, the market and the founder are the only things that matter; everything else is a story.

2. **"Devon Cho" — YC group partner**
   - Bio: Three-time founder, two exits, now runs office hours for ~30 batch companies. Allergic to fluff.
   - Hiring job: Confirm the team can describe the company in two sentences a normal person understands.
   - Bounce trigger: Jargon ("we're an AI-native composable platform for…"). Or no traction graph by slide 4.
   - Load-bearing belief: If you can't explain it simply, you don't understand it; investors fund traction now, not ideas. (Source: YC Library, Michael Seibel.)

3. **"Aditi Rao" — Pre-seed associate at multi-stage fund**
   - Bio: 26, ex-banking, screens 200 decks/month. First filter before partner sees it.
   - Hiring job: Decide if this gets escalated to a partner Monday morning.
   - Bounce trigger: Cap table mess, dropout co-founder, no clear ask amount.
   - Load-bearing belief: Process and clarity at seed predict process and clarity at scale.

4. **"Garrett Liu" — Angel operator, 40 checks deployed**
   - Bio: Sold a fintech in 2021, writes $25–100K checks based on founder energy.
   - Hiring job: Decide if he wants to spend 30 min on a Zoom.
   - Bounce trigger: Founder isn't visibly obsessed; market is "everyone."
   - Load-bearing belief: Conviction beats consensus; one weird detail in the deck signals real founder taste.

5. **"Helena Borg" — Skeptical LP-side advisor**
   - Bio: Former CFO at a $2B SaaS company, advises a fund of funds. Reads decks looking for what's missing.
   - Hiring job: Find the buried unit-economics lie.
   - Bounce trigger: Revenue chart with no axis labels. Use of "ARR" before $1M of recurring revenue exists.
   - Load-bearing belief: Decks omit what would kill the deal; her job is to find it.

6. **"Marco Tellez" — Domain-expert customer**
   - Bio: VP at the kind of buyer the startup is selling to. No financial stake.
   - Hiring job: Sanity-check whether the problem is real and the wedge is plausible.
   - Bounce trigger: Problem statement doesn't match how he actually experiences his job.
   - Load-bearing belief: Founders almost always misdescribe the buyer's pain by one level of abstraction.

### Failure modes

- **Overdesigned slides at seed.** YC explicitly warns: "your slides should be visually boring." Decks that look like a brand book signal more time on Figma than on customers (YC Library; Venture Curator analysis of 50+ funded YC decks).
- **TAM-first storytelling.** Leading with $X trillion market signals you don't have a wedge.
- **Premature ARR claims.** Calling $30K MRR "ARR" — Helena will catch this and circulate the deck to friends as a cautionary example.
- **Hidden co-founder churn.** Theranos's investors who skipped basic team diligence were the most embarrassed (Planet Compliance; Georgia Southern fraud-and-red-flags thesis).

### Recommended tumble-dry config

- panel_size: 5
- convergence_threshold: 2 material findings
- editor thinking budget: 3000 tokens
- max_rounds: 4

### What good looks like

- The original DoorDash 2014 seed memo (NFX repost) — clarity of wedge, founder-market fit articulated in one paragraph.
- The Airbnb 2008 seed deck — boring, legible, problem-first.
- YC Library "How to build your seed round pitch deck" template.

---

## 2. Series A pitch deck

Series A reads completely differently. The buyer is underwriting a *growth machine*, not a story. ARR, growth rate, and net revenue retention are expected within the first 60 seconds (Deckary 2025 analysis).

### Personas

1. **"Priya Iyer" — Series A lead partner at multi-stage fund**
   - Bio: 12 years investing, sits on 9 boards, leads ~2 deals/year. Cares about board fit as much as numbers.
   - Hiring job: Decide if she'd go to war for this on the Monday partner call.
   - Bounce trigger: NRR < 100% with no plausible explanation; founder dodges the churn question.
   - Load-bearing belief: A Series A is a hire — she's the one stuck on the board for 7 years.

2. **"Nathan Greaves" — Sector-specialist principal**
   - Bio: Spent 6 years in vertical SaaS, knows every comp's CAC payback by heart.
   - Hiring job: Pressure-test the unit economics against benchmarks.
   - Bounce trigger: CAC payback > 24 months presented as healthy; "magic number" computed wrong.
   - Load-bearing belief: Benchmarks compound — if you're 30% off median on three metrics, you're not just below median, you're a different company.

3. **"Sasha Mendel" — Diligence lead / former auditor turned VC**
   - Bio: Ex-Big 4 audit, reconciles deck claims to QuickBooks line by line.
   - Hiring job: Find the gap between deck and data room.
   - Bounce trigger: Logo slide includes pilots labeled as customers. Cohort retention curves "smoothed."
   - Load-bearing belief: If the deck and the source data don't match, walk.

4. **"Roman Vasquez" — Existing seed investor (pro-rata)**
   - Bio: Friendly. Wants the round to close at a good price for his book.
   - Hiring job: Confirm story is consistent with what he's heard for 18 months.
   - Bounce trigger: Sudden new "second product" he's never been briefed on. Surprise pivot.
   - Load-bearing belief: The most damaging thing in fundraising is an existing investor going quiet.

5. **"Dr. Hae-won Lim" — Reference-call simulator**
   - Bio: Stand-in for the customer references Priya will call next week.
   - Hiring job: Predict whether 3 customer calls will sound consistent with the deck claims.
   - Bounce trigger: Deck cites "love" from customer X, but X just renewed at lower seat count.
   - Load-bearing belief: Reference calls always reveal one thing the deck hid.

6. **"Tom Briar" — Growth-stage partner from the next round**
   - Bio: Series B/C investor invited to "pre-empt." Reads forward.
   - Hiring job: Decide if this story fuels a $50M round 18 months out.
   - Bounce trigger: GTM motion can't credibly support 3x next year. Single-channel acquisition.
   - Load-bearing belief: Series A bets are won or lost on whether the growth model survives the first GTM hire.

### Failure modes

- **ARR theater.** Counting non-recurring services revenue, one-time pilots, or LOIs as ARR. Common kill in diligence (Scale With CFO; Maxio "Top Red Flags").
- **NRR < 100% disguised by gross retention slide swap.** Investors increasingly demand both.
- **CAC excluding fully-loaded sales costs.** Classic founder mistake; CFO reviewers catch immediately (Ascent CFO).
- **Single-scenario financial model.** Signals founders haven't thought about downside (Scale With CFO).
- **Post-mortem reference: Quibi.** Lavish deck, premium investors, but unit economics never modeled against actual viewing behavior.

### Recommended tumble-dry config

- panel_size: 6
- convergence_threshold: 2
- editor thinking budget: 5000
- max_rounds: 5

### What good looks like

- The leaked Series A decks aggregated by Deckary / Slidebook.io (a16z, Bessemer, Sequoia portfolio).
- a16z's published "Growth Deck" framework (Andrew Chen).
- The Notion Series A narrative summarized in First Round Review.

---

## 3. Late-stage / growth-equity pitch deck

Growth equity (Series C+, PE, crossover) underwrites *durability and capital efficiency*, not narrative. The Rule of 40 (Brad Feld; Bessemer's "Rule of X") and burn multiple are baseline.

### Personas

1. **"Eleanor Wachowski" — Growth-equity MD**
   - Bio: 20-year buyout / growth investor. Builds Excel before reading the deck.
   - Hiring job: Confirm Rule of 40 ≥ 40, NRR ≥ 110, magic number ≥ 0.7 — at scale, not on the latest cohort.
   - Bounce trigger: Growth bought via S&M efficiency declines; "adjusted" metrics that aren't reconciled to GAAP.
   - Load-bearing belief: Past 18 months of efficiency predict the next 36; vibes don't.

2. **"Hunter Pell" — IPO-track CFO advisor**
   - Bio: Took two SaaS companies public. Reads decks as if SEC will read them next.
   - Hiring job: Stress-test whether the metrics survive S-1 disclosure.
   - Bounce trigger: Bookings/billings/revenue used interchangeably; non-GAAP without bridge.
   - Load-bearing belief: Late-stage decks that hide segment economics get punished in roadshows.

3. **"Marcus Tanaka" — Crossover hedge fund analyst**
   - Bio: Models comps daily. Looks at growth-adjusted multiples and asks "vs. public alternative."
   - Hiring job: Decide pricing relative to listed comps.
   - Bounce trigger: TAM math that double-counts segments; competitor map omits public incumbents.
   - Load-bearing belief: If the comp set is curated, the entire deck is curated.

4. **"Renee Bouchard" — Operator-in-residence**
   - Bio: Ex-COO of a $500M ARR vertical SaaS. Asks operational questions: hiring plan, sales-rep ramp, payback at the rep level.
   - Hiring job: Decide if the org can absorb the capital.
   - Bounce trigger: Hiring plan that 3x's headcount with no sales leadership change.
   - Load-bearing belief: Capital deployment failures show up in the rep productivity curve before they show in ARR.

5. **"Dr. Yusuf Demir" — Independent industry expert**
   - Bio: Former Gartner analyst in the relevant category.
   - Hiring job: Reality-check market growth and competitive moat.
   - Bounce trigger: TAM growth assumptions exceed his published numbers without justification.
   - Load-bearing belief: Categories grow at the rate of the underlying buyer budget, not the rate of investor enthusiasm.

6. **"Bridget Aalto" — Risk / governance reviewer**
   - Bio: Audit committee chair on two public boards.
   - Hiring job: Catch governance, related-party, and concentration risks before they kill the round.
   - Bounce trigger: Customer concentration > 20% buried in footnote; founder-controlled vendors.
   - Load-bearing belief: WeWork's collapse was a governance failure first and a unit-economics failure second (Ethics Sage; CNBC retrospective).

### Failure modes

- **Custom metrics that obscure losses.** WeWork's "community-adjusted EBITDA" is the canonical case.
- **Burn multiple > 2 with a "we're investing for growth" handwave.** Growth-stage investors have stopped accepting this since 2022.
- **Rule-of-40 calculated on TTM trough quarter only.**
- **Comp set omitting the obvious public alternative.**

### Recommended tumble-dry config

- panel_size: 7
- convergence_threshold: 3
- editor thinking budget: 6000
- max_rounds: 6

### What good looks like

- Snowflake S-1 (2020) — gold standard for late-stage metric disclosure.
- Datadog late-stage / IPO deck.
- Bessemer "State of the Cloud" benchmark report (annual).

---

## 4. Financial model / unit-economics doc / pricing strategy

Three sub-artifacts; the panel below works for all three. Reviewers should be split between "model mechanic" and "business reasoner."

### Personas

1. **"Audra Kellerman" — Fractional SaaS CFO**
   - Bio: Builds 30 models a year for Series A–C. Knows where formulas usually break.
   - Hiring job: Tear down the driver model from the bottom.
   - Bounce trigger: Revenue projection is a typed number, not a function of leads × conversion × ACV.
   - Load-bearing belief: Top-down models are theater; bottom-up models are management tools.

2. **"Patrick "PC" Cole" — Pricing strategist (Patrick Campbell archetype)**
   - Bio: Ran value-based pricing studies at 200+ SaaS companies.
   - Hiring job: Pressure-test the value metric and tier structure.
   - Bounce trigger: Per-seat pricing for a usage-driven product. No willingness-to-pay research cited.
   - Load-bearing belief: Pricing is value perception, not numbers; per-seat is a 1990s license artifact (Campbell, Business of Software talks; First Round Review "Price is Right").

3. **"Lena Voss" — Auditor (tie-out specialist)**
   - Bio: Big-4 senior, reconciles model to general ledger.
   - Hiring job: Find every place model and books disagree.
   - Bounce trigger: Balance sheet doesn't balance. MRR file disconnected from P&L.
   - Load-bearing belief: A model that doesn't tie to source data is a sales document, not a forecast.

4. **"Ben Saxon" — VP Sales (operator)**
   - Bio: Has hit number 7 of 10 quarters. Hates models built without sales input.
   - Hiring job: Sanity-check rep ramp, quota, pipeline coverage assumptions.
   - Bounce trigger: New rep producing $X in month 4 with no ramp curve. Pipeline coverage < 3x.
   - Load-bearing belief: Most models miss because the GTM motion in the spreadsheet has never existed in real life.

5. **"Mira Solis" — Investor diligence (downside scenarios)**
   - Bio: Series B partner who builds her own bear case before every term sheet.
   - Hiring job: Force the model to produce 30–40% downside and 1.5x upside cases.
   - Bounce trigger: Single-scenario model. No sensitivity tab.
   - Load-bearing belief: Every model needs three scenarios; founders who only have base case haven't earned the round.

6. **"Karim Boateng" — Customer success benchmark**
   - Bio: Runs CS at a comparable-stage company.
   - Hiring job: Reality-check churn and NRR assumptions against industry.
   - Bounce trigger: 2–3% annual churn modeled when comparable companies run 3–5% monthly (CFO Pro Analytics red-flag list).
   - Load-bearing belief: Founders systematically under-model churn and over-model expansion.

### Failure modes

- **Bookings without collections.** Classic red flag — revenue recognized on invoice, cash never lands.
- **CAC excluding fully-loaded costs.** (Ascent CFO; Scale With CFO 2025.)
- **Gross margin < 60% on a "SaaS" pitch.** Crisis-level if < 50%.
- **Per-seat pricing on a usage product.** Locks in churn at the buyer's first cost-cutting cycle (Campbell).
- **Static pricing.** Campbell recommends pricing review every quarter; six months max.

### Recommended tumble-dry config

- panel_size: 6
- convergence_threshold: 2
- editor thinking budget: 6000
- max_rounds: 5

### What good looks like

- Christoph Janz "5 ways to build a $100M business" — clean cohort math.
- Mostly Metrics (CJ Gustafson) public examples.
- David Kellogg's blog on bookings/billings/revenue reconciliation.

---

## 5. Board memo / board deck (early-stage vs. public co)

Two completely different audiences and two completely different artifacts. The reviewer set differs by stage; below covers both, with notes on which personas swap in.

### Personas (early-stage variant)

1. **"Jen Halberstam" — Lead VC director** — wants 1:1 brief 4 days early; will quietly kill the meeting if surprised on the day (Fred Wilson, AVC).
2. **"Omar Naidu" — Independent director** — operator. Wants tee-up of 2–3 hard discussion items, not line-by-line P&L.
3. **"Carla Ruth" — CFO observer** — checks numbers tie to the prior memo's numbers; bounces on changed definitions without footnote.
4. **"Daniel Frye" — Co-founder / CEO peer board member** — wants strategic narrative, not slides.
5. **"Whitney Park" — Future-investor reader** — board materials become diligence material at next round; bounces on anything she'd be embarrassed by in a future data room.

### Personas (public-co variant) — swap in

1. **"General Counsel"** — every word is a 10b-5 risk. Bounces on forward-looking statements without safe-harbor framing.
2. **"Audit Committee Chair"** — bounces on changes to non-GAAP definitions that aren't redlined.
3. **"Compensation Committee Chair"** — links any operating discussion back to comp metrics.
4. **"Lead Independent Director"** — owns executive-session agenda; bounces if "real" issues are buried.
5. **"Activist Investor (hostile reader)"** — read as if Elliott will FOIA-equivalent the materials in 18 months.

### Failure modes

- **Sending the deck the morning of the meeting.** Fred Wilson and Sequoia both: 3–4 days minimum.
- **Line-by-line financial review.** Wastes the most expensive hour of the quarter.
- **Memo with no "ask."** Boards are a resource; if the CEO has no specific request, the memo is performative.
- **Public-co: undisclosed change in segment reporting.** Triggers SEC comment letters (Deloitte Roadmap; Bass Berry guidance).

### Recommended tumble-dry config

- panel_size: 5 (early) / 6 (public)
- convergence_threshold: 2
- editor thinking budget: 4000 (early) / 7000 (public)
- max_rounds: 4 (early) / 6 (public)

### What good looks like

- Sequoia Capital "Preparing a Board Deck" template.
- Visible.vc board-meeting templates.
- Amazon-style 6-pager memo (Qualtrics, Domino are cited examples of memo-not-deck).

---

## 6. Investor update / LP letter / portfolio quarterly

Three artifacts in a family. Cadence matters as much as content; Lemkin: monthly to anyone with ≥1% until $10M ARR; AVC and First Round confirm.

### Personas

1. **"Jason L." — SaaS-investor archetype**
   - Bio: Reads 50 monthly updates. Skims first; reacts to specific asks.
   - Hiring job: Grade trajectory month-over-month and find the one ask he can answer.
   - Bounce trigger: Update arrives > 14 days after month-end. No metrics. No ask.
   - Load-bearing belief: A rough monthly update beats a polished quarterly one; the medium is the trust signal.

2. **"Mark S." — VC archetype, "lines not dots"**
   - Bio: Tracks founder updates as the leading indicator of the next round's quality.
   - Hiring job: Detect velocity changes in writing style and metric definition.
   - Bounce trigger: Metric definitions change between updates without footnote.
   - Load-bearing belief: Investors invest in lines, not dots; cadence is the line.

3. **"LP — institutional pension"**
   - Bio: Reads 30 fund letters/quarter. Cares about MOIC, IRR, DPI, TVPI, then thesis.
   - Hiring job: Decide whether to recommit to next fund.
   - Bounce trigger: Marks adjusted upward with no methodology change disclosed; markdowns hidden.
   - Load-bearing belief: GPs who gloss over markdowns don't get re-upped (Signature Block; AngelList LP-update guidance).

4. **"LP — family office"**
   - Bio: Less rigorous than pension, but reads narratively. Wants market color.
   - Hiring job: Forward to family principal as a "what's happening in tech" digest.
   - Bounce trigger: Pure metrics, no narrative; or pure narrative, no metrics.

5. **"Founder reader (portfolio CEO)"**
   - Bio: One of the GP's portfolio companies, reading to see how *their* update was framed.
   - Hiring job: Confirm the GP is positioning them well to LPs.
   - Bounce trigger: Their company misrepresented; or omitted entirely after a strong quarter.
   - Load-bearing belief: How the GP writes about other portfolio companies predicts how they'll write about me.

6. **"Skeptic friend"** — receives a copy from an LP. Hunts for the buried bad news. Bounces on heroic-only narratives.

### Failure modes

- **No "ask."** First Round / Visible / Lemkin all rate this the #1 missed opportunity. Optimal pattern: "Ask → Thanks cycle" 2 months apart.
- **Definition drift.** Counting "users" differently this month vs. last; shifting "ARR" to "annualized revenue."
- **Heroic narrative without losses.** LPs (Signature Block) explicitly downgrade trust when only wins appear.
- **Late delivery.** Lemkin: 48 hours after month-end is the gold standard.

### Recommended tumble-dry config

- panel_size: 5
- convergence_threshold: 1 (these are short, high-frequency)
- editor thinking budget: 2500
- max_rounds: 3

### What good looks like

- Visible.vc Jason Lemkin investor-update template.
- USV (Fred Wilson) public-portfolio commentary on AVC.
- Roelof Botha's Sequoia LP letters (excerpts public).

---

## 7. M&A pitch / acquisition rationale memo

The audience: a board approving the deal, plus regulators and journalists who will read it post-announcement. McKinsey: 70–90% of M&A deals fail to deliver projected value; revenue-synergy deals fail ~70% of the time.

### Personas

1. **"Hank Rosso" — M&A banker**
   - Bio: 25 years sell-side and buy-side advisory.
   - Hiring job: Pressure-test the synergy stack and the strategic narrative.
   - Bounce trigger: Synergies > 10% of target revenue with no integration owner named.
   - Load-bearing belief: Deal teams under bid pressure overstate synergies; the memo should pre-haircut.

2. **"Indira Mahmood" — Integration leader (operator)**
   - Bio: Has run three post-merger integrations; two were partial failures.
   - Hiring job: Decide if the integration plan in the memo is achievable.
   - Bounce trigger: "Cultural fit" assertions without diligence; no day-1 / day-100 / day-365 plan.
   - Load-bearing belief: Synergies die in the integration plan, not the deal model (McKinsey "Where mergers go wrong").

3. **"Tess Hwang" — Independent director on acquirer board**
   - Bio: Skeptic by job description. Has voted no on two prior deals.
   - Hiring job: Find the assumption that, if wrong, breaks the entire thesis.
   - Bounce trigger: One-scenario IRR; no sensitivity to revenue synergies.
   - Load-bearing belief: The board's job is to be the last reasonable adult in the room (HBR "Don't Make This Common M&A Mistake," 2020).

4. **"Joaquin Reyes" — Antitrust counsel**
   - Bio: Reads the memo for what regulators will see.
   - Hiring job: Flag any framing that increases regulatory risk (market-share claims, "we will dominate").
   - Bounce trigger: Memo language usable verbatim in a DOJ complaint.
   - Load-bearing belief: The memo is discoverable; write it accordingly.

5. **"Andrea Sokol" — Target-company CFO (counter-party)**
   - Bio: Reads to understand acquirer's view of her business.
   - Hiring job: Identify where acquirer is misreading her cost base or customer concentration.
   - Bounce trigger: Synergies that assume her team's redundancy without naming the cuts.

6. **"Bjorn Naess" — Industry journalist (Matt Levine reader)**
   - Bio: Will write the post-announcement piece.
   - Hiring job: Find the angle — cute or damning.
   - Bounce trigger: "Strategic" used > 5 times without specifics. Levine-bait phrases ("synergistic transformative platform").

### Failure modes

- **Synergy inflation.** McKinsey: typical acquirer overestimates by 20–50%; revenue synergies miss 70% of the time.
- **No cultural-integration plan.** Daimler-Chrysler is the canonical case; recent: Kraft-Heinz.
- **Custom EBITDA adjustments.** WeWork-style "community-adjusted" framings poison the well.
- **Unbounded "revenue synergies."** Most likely to be cut by haircut model.

### Recommended tumble-dry config

- panel_size: 7
- convergence_threshold: 3
- editor thinking budget: 8000
- max_rounds: 7

### What good looks like

- Microsoft–LinkedIn 8-K and Satya Nadella's internal memo (publicly excerpted).
- Adobe–Figma announcement materials (and the post-mortem of why regulators killed it — useful negative example).
- HBR "The New M&A Playbook" (Christensen et al.).

---

## 8. Annual report / 10-K MD&A

Reader set: SEC staff, sell-side analysts, plaintiff-side securities lawyers, activist investors, retail investors. Plain-English rule (1998) is the baseline; layered disclosure with executive summary is current best practice (Bass Berry; Deloitte Roadmap).

### Personas

1. **"Janet Whitman" — SEC reviewer archetype**
   - Bio: Issues comment letters. Looks for omissions and inconsistencies.
   - Hiring job: Generate the comment letter she would write.
   - Bounce trigger: Non-GAAP without GAAP reconciliation. Risk factor that's pure boilerplate.
   - Load-bearing belief: Boilerplate risk factors signal management isn't thinking about real risks.

2. **"Carlos Vega" — Sell-side analyst (covers the stock)**
   - Bio: Updates model from MD&A within 4 hours of filing.
   - Hiring job: Reconcile MD&A narrative to segment numbers; spot revisions.
   - Bounce trigger: Segment definitions changed without bridge to prior period.

3. **"Liu Yang" — Buy-side analyst (long-only fund)**
   - Bio: Reads MD&A for forward-looking signal beyond the safe harbor.
   - Hiring job: Detect tone shifts, hedging, new caveats.
   - Bounce trigger: Cash-flow narrative diverges from operating-income narrative without explanation.

4. **"Mia Donovan" — Securities-class-action plaintiff lawyer**
   - Bio: Reads after a stock drop, hunting for misstatements.
   - Hiring job: Identify any forward-looking language that could be alleged misleading.
   - Bounce trigger: Concrete future claims without "we believe" + risk-factor anchor.

5. **"Ari Klein" — Audit-committee chair**
   - Bio: Signs off internally.
   - Hiring job: Confirm MD&A matches what the audit committee was actually told.
   - Bounce trigger: Critical accounting estimates section is generic; doesn't match management discussions.

6. **"Reader-of-record retail investor"** — readability check at 12th-grade level. Bounces on jargon and 80-word sentences (Loughran-McDonald readability literature).

### Failure modes

- **Boilerplate risk factors.** SEC has called these out; activist investors mock them.
- **Non-GAAP without GAAP bridge.** Triggers comment letters and reputational damage.
- **Segment-definition change without bridge.** Sell-side will write a "concerning" note within hours.
- **Critical accounting estimate language unchanged for 5 years.** Signals copy-paste.

### Recommended tumble-dry config

- panel_size: 6
- convergence_threshold: 3
- editor thinking budget: 8000
- max_rounds: 8 (high — disclosure documents reward iteration)

### What good looks like

- Berkshire Hathaway annual letters (plain English, layered).
- Costco 10-K MD&A (clean segment economics).
- SEC's own "A Plain English Handbook" (1998) and current Deloitte Roadmap on MD&A.

---

## 9. Earnings call script / analyst Q&A prep

Highest-stakes 60-minute artifact in finance. Sell-side analysts use the call to defend their models; one slipped phrase ("guide-down," "headwind we didn't expect") moves the stock.

### Personas

1. **"Greg Hennessy" — IR head (internal author)**
   - Bio: Scripts every word. Owns the post-call follow-up calendar.
   - Hiring job: Ensure consistent messaging between press release and script.
   - Bounce trigger: CEO improvises a number not in the script.
   - Load-bearing belief: Differentiation between release and script is required, but every number must be reconciled (ICR best practices).

2. **"Sandra Klepner" — Sell-side analyst (covering)**
   - Bio: Has a $X target and a model she'll defend on her morning call tomorrow.
   - Hiring job: Get answers that justify or break her model.
   - Bounce trigger: Bridging used so heavily it sounds evasive (Pulse / Benjamin Ball).
   - Load-bearing belief: Survey analysts before the call; you should know 80% of questions.

3. **"Hedge-fund PM (short)"**
   - Bio: Listens for hedging language and tense shifts.
   - Hiring job: Find the tell that confirms his short thesis.
   - Bounce trigger: Management uses "we still expect" instead of "we expect."

4. **"Retail investor on Twitter / fintwit"**
   - Bio: Will live-tweet the call.
   - Hiring job: Form a 280-character take.
   - Bounce trigger: Buzzwords without numbers.

5. **"General Counsel"**
   - Bio: Reg FD enforcer.
   - Hiring job: Catch any selective disclosure.
   - Bounce trigger: New material non-public information disclosed to one analyst, not the room.

6. **"Mock Q&A coach"** — runs the dry run. Bounces if any answer > 60 seconds or any answer scripted-sounding.

### Failure modes

- **Scripted Q&A.** Analysts detect immediately; damages credibility (Pulse; AMW).
- **Over-bridging.** Sounds evasive; analysts respect "I can't disclose that" more than a non-answer.
- **Surprise number.** CFO mentions a metric not in the press release.
- **Reg FD slip.** Selective disclosure to a favored analyst.
- **Negative example: Meta Q4 2021 call** — guidance shocked street and stock dropped 26%; post-mortem highlighted insufficient pre-call expectation management.

### Recommended tumble-dry config

- panel_size: 6
- convergence_threshold: 2
- editor thinking budget: 7000
- max_rounds: 6

### What good looks like

- Costco quarterly calls (Charlie Munger praised the IR style).
- NVIDIA earnings call scripts (Jensen-style narrative within rigorous numbers).
- ICR's "Perfect Earnings Call: 5-Week Prep Plan."

---

## 10. Business case / internal capex investment proposal

Audience: internal capital-review committee, CFO, often CEO. Hurdle rate (WACC + risk premium) is the gate; NPV, IRR, payback are required.

### Personas

1. **"Diane Pruitt" — CFO / capital-committee chair**
   - Bio: Approves or kills 40 capex proposals/year.
   - Hiring job: Confirm IRR > hurdle, sensitivity is honest, strategic alignment is real.
   - Bounce trigger: IRR exactly at hurdle (signals reverse-engineered model).
   - Load-bearing belief: Sponsors who haircut their own assumptions get more capital over time.

2. **"Roy Tatum" — FP&A reviewer**
   - Bio: Builds the consolidated capex book.
   - Hiring job: Tie proposal to long-range plan; reconcile to budget.
   - Bounce trigger: Capex not in budget; depreciation impact not modeled.

3. **"Sponsoring business-unit GM"**
   - Bio: Champions the project; political stake.
   - Hiring job: Sell the strategic upside.
   - Bounce trigger (panel-side): Reviewer flags GM's optimism bias.
   - Load-bearing belief: His incentives skew the model; panel must include a check on him.

4. **"Internal audit / risk"**
   - Bio: Reviews execution risk and assumption fragility.
   - Hiring job: Identify single points of failure in the plan.
   - Bounce trigger: No risk register; vendor concentration not addressed.

5. **"Ops leader who has to deliver"**
   - Bio: Will own the build.
   - Hiring job: Reality-check timeline and resource plan.
   - Bounce trigger: 18-month build with current team and no hiring plan.

6. **"External board / audit committee"**
   - Bio: Sees only proposals above the materiality threshold.
   - Hiring job: Confirm governance and capital-allocation discipline.
   - Bounce trigger: Strategic narrative doesn't match what the board has been told publicly.

### Failure modes

- **Hurdle-rate gaming.** IRR engineered to clear by 50–100 bps. Diane catches.
- **Synergy / strategic-option value used to clear hurdle.** Acceptable only if quantified and risk-adjusted.
- **No measurement plan post-approval.** Most committees now require explicit KPIs and post-implementation review (Stratex; Business Case Analysis).
- **Sunk-cost framing.** "We've already spent $X" — disqualifying in a real committee.

### Recommended tumble-dry config

- panel_size: 6
- convergence_threshold: 2
- editor thinking budget: 5000
- max_rounds: 5

### What good looks like

- Amazon's working-backwards / 6-pager investment memo format.
- Shell's published capital-allocation framework slides.
- Business-Case-Analysis.com hurdle-rate templates.

---

## Cross-cutting design notes for tumble-dry

1. **Panel composition rule:** every panel includes (a) a believer who'd write the check / approve the spend, (b) an operator who has to live with the claims, (c) a domain auditor who reconciles to ground truth, (d) an outside skeptic with no upside, (e) an end-reader proxy (journalist, retail investor, future LP).
2. **Convergence threshold scales with audience cost:** internal docs (investor updates) → 1 finding; external docs read by regulators (10-K, M&A memo) → 3.
3. **Thinking budget scales with disclosure liability:** seed deck = 3K, M&A memo / 10-K = 8K.
4. **Max rounds scales with rewrite cost:** if the artifact is short and high-frequency (investor update), 3 rounds; if it's a once-a-year disclosure document, 6–8 rounds is justified.
5. **Persona swap by stage:** the seed-deck panel and the late-stage deck panel share zero personas. Same for early-board vs. public-board.

---

## Citations

- YC Library — How to build your seed round pitch deck. https://www.ycombinator.com/library/2u-how-to-build-your-seed-round-pitch-deck
- YC Library — Series A diligence checklist. https://www.ycombinator.com/library/3h-series-a-diligence-checklist
- a16z pitch deck guidelines (InkNarrates summary). https://www.inknarrates.com/post/andreessen-horowitz-pitch-deck-guidelines
- a16z growth deck (Andrew Chen). http://andrewchen.com/wp-content/uploads/2018/11/a16z_growth_deck.pdf
- Deckary — Series A pitch deck analysis 2025. https://deckary.com/blog/series-a-pitch-deck
- Venture Curator — analysis of 50+ funded YC seed decks. https://www.venturecurator.com/p/how-to-design-a-seed-pitch-deck-investors
- Guru Startups — Pitching to YC: lessons from successful pitch decks. https://www.gurustartups.com/reports/pitching-to-yc-lessons-from-successful-pitch-decks
- Bessemer Venture Partners — The Rule of X. https://www.bvp.com/atlas/the-rule-of-x
- Software Equity Group — Rule of 40. https://softwareequity.com/blog/rule-of-40/
- Wall Street Prep — Rule of 40 (Brad Feld). https://www.wallstreetprep.com/knowledge/rule-of-40/
- Scale With CFO — 7 financial-model mistakes that kill SaaS fundraising. https://www.scalewithcfo.com/post/financial-model-mistakes-kill-saas-fundraising
- Scale With CFO — Financial due diligence guide for SaaS founders. https://www.scalewithcfo.com/post/financial-due-diligence-guide-saas-founders
- CFO Pro Analytics — Financial red flags in early-stage SaaS. https://cfoproanalytics.com/cfo-wiki/saas/financial-red-flags-in-early-stage-saas-companies/
- Ascent CFO — 5 financial red flags that drive investors away. https://ascentcfo.com/resources/5-financial-red-flags-that-drive-investors-away/
- Maxio — Top red flags in SaaS financial reporting. https://www.maxio.com/blog/top-red-flags-in-saas-financial-reporting
- Patrick Campbell on value-based pricing (Business of Software). https://businessofsoftware.org/talks/pricing-retention-and-growth-strategies/
- First Round Review — The Price is Right. https://review.firstround.com/the-price-is-right-essential-tips-for-nailing-your-pricing-strategy/
- KickAss SaaS — Value-Based Pricing Lessons (Campbell). https://kickass-saas.com/patrick-campbell-value-based-pricing-lessons/
- AVC (Fred Wilson) — The Board of Directors: Board Meetings. https://avc.com/2012/04/the-board-of-directors-board-meetings/
- AVC — The Perfect Board. https://avc.com/2014/12/the-perfect-board/
- Sequoia — Preparing a Board Deck. https://articles.sequoiacap.com/preparing-a-board-deck
- Visible.vc — What we've learned from investors about running a board meeting. https://visible.vc/blog/weve-learned-investors-running-board-meeting/
- Visible.vc — How to write the perfect investor update. https://visible.vc/blog/how-to-write-the-perfect-investor-update/
- Visible.vc — Jason Lemkin investor update template. https://visible.vc/templates/jason-lemkin-investor-update-template/
- SaaStr — Good example of a monthly investor update. https://www.saastr.com/anyone-seen-good-examples-templates-startups-provide-monthly-email-investor-updates-e-g-kpi/
- AngelList — How to provide great LP updates. https://www.angellist.com/blog/lp-updates
- Signature Block — How to write LP updates. https://www.signatureblock.co/articles/how-to-write-lp-updates
- VC Stack — How to write an LP update as a VC. https://www.vcstack.io/blog/how-to-write-a-lp-update-as-a-vc
- McKinsey — Where mergers go wrong. https://www.mckinsey.com/capabilities/strategy-and-corporate-finance/our-insights/where-mergers-go-wrong
- HBR — Don't Make This Common M&A Mistake (2020). https://hbr.org/2020/03/dont-make-this-common-ma-mistake
- HBS — The New M&A Playbook. https://www.hbs.edu/faculty/Pages/item.aspx?num=39920
- Wharton (Feldman & Hernandez) — Synergy in M&A. https://faculty.wharton.upenn.edu/wp-content/uploads/2016/11/Synergy-in-Mergers_FeldmanHernandez.pdf
- Bass Berry — 12 things you need to know about drafting MD&A. https://www.bassberrysecuritieslawexchange.com/mda-best-practices/
- Deloitte DART — Topic 9: MD&A. https://dart.deloitte.com/USDART/home/accounting/sec/financial-reporting-manual/topic-9-management-s-discussion-analysis
- Covington — Preparing for 10-K Season: MD&A Rule Changes. https://www.cov.com/-/media/files/corporate/publications/2022/01/preparing-for-10-k-season-a-guide-to-the-mda-rule-changes.pdf
- SEC — How to read a 10-K/10-Q. https://www.sec.gov/fast-answers/answersreada10khtm.html
- ICR — Best practices for earnings call preparation. https://icrinc.com/news-resources/best-practices-for-earnings-call-preparation/
- ICR — Perfect earnings call: 5-week prep plan. https://icrinc.com/news-resources/perfect-earnings-call-5-week-prep-plan/
- Gilmartin Group — Quarterly earnings calls planning & preparation. https://gilmartinir.com/quarterly-earnings-calls-planning-preparation/
- AMW — How to prepare executives for earnings communications. https://amworldgroup.com/how-to/media-train-executives-earnings-calls
- BNY — IR practice note: the earnings conference call. https://www.bny.com/content/dam/bnymellon/documents/pdf/solutions/ir-practice-notes-earnings-call.pdf
- Matt Levine — Don't Let Robots Do Earnings Calls (Bloomberg). https://www.bloomberg.com/opinion/articles/2023-09-07/matt-levine-s-money-stuff-don-t-let-robots-do-earnings-calls
- Matt Levine — Everything Might Be Accounting Fraud (Bloomberg). https://www.bloomberg.com/opinion/articles/2025-01-13/everything-might-be-accounting-fraud
- Business-Case-Analysis.com — Capital review process. https://www.business-case-analysis.com/capital-review-process.html
- Business-Case-Analysis.com — Hurdle rate test. https://www.business-case-analysis.com/hurdle-rate.html
- Stratex — How to create an effective CapEx approval process in 8 steps. https://www.stratexonline.com/blog/capex-approval-process/
- 8020 Consulting — Writing a better capital expenditure report. https://8020consulting.com/blog/capital-expenditure-report
- Winning Presentations — How to structure a capex presentation to finance committees. https://winningpresentations.com/capital-expenditure-presentation/
- Planet Compliance — The Theranos scandal: a $9B mirage. https://www.planetcompliance.com/financial-compliance/the-theranos-scandal-a-9-billion-mirage-exposing-flaws-in-the-venture-capital-system/
- Georgia Southern — A study of fraud, red flags, and investor due diligence (Theranos). https://digitalcommons.georgiasouthern.edu/cgi/viewcontent.cgi?article=1538&context=honors-theses
- SGR Law — Lessons learned from the Theranos case. https://www.sgrlaw.com/ttl-articles/sgr-holds-due-diligence-roundtable-on-lessons-learned-from-theranos-case/
- Ethics Sage — What do WeWork and Theranos have in common? https://www.ethicssage.com/2022/05/what-do-wework-and-theranos-have-in-common.html
- CNBC — Founders get blamed for start-up scandals, but where were the investors? https://www.cnbc.com/amp/2022/01/14/founders-get-blamed-for-start-up-scandals-but-where-were-investors.html
- NFX — The DoorDash investment memo from 2014. https://www.nfx.com/post/doordash-memo
- Sequoia — Airbnb IPO: Embracing the Adventure. https://medium.com/sequoia-capital/airbnb-ipo-embracing-the-adventure-4565bd825cc4
- 20VC — The DoorDash memo: Alfred Lin. https://www.thetwentyminutevc.com/alfred-lin
- Holloway — The Holloway Syllabus on Startup Boards. https://www.holloway.com/s/syllabus-startup-boards
- Elad Gil — High Growth Handbook: Managing your board. https://growth.eladgil.com/book/cofounders/the-role-of-the-ceo-managing-your-board-of-directors/
