# Marketing & Communications Persona Family

Reviewer panels for tumble-dry covering ten marketing and communications artifact types. Each section delivers personas, sourced failure modes, recommended panel config, and "what good looks like" benchmarks.

Personas are invented but the roles, biases, and load-bearing beliefs are drawn from real practitioners and documented disasters. The bounce trigger is the thing that makes the persona stop reading and write a one-line dismissal — the most useful signal a draft can produce.

---

## 1. Press Release (Product Launch, Fundraise, Hire, M&A)

Press releases are read by three audiences in this order: a journalist deciding whether to pick it up (15 seconds), a competitor scanning for strategic intel (30 seconds), and a customer/investor confirming what they already heard (90 seconds). Most drafts only consider the third.

### Personas

**Maya Okonkwo — Senior Reporter, TechCrunch.** Eight years on the enterprise SaaS beat, ~40 pitches per day. Hiring job: find a story with a non-obvious "why now." Bounce trigger: headline says "leading provider" or "next-generation." Load-bearing belief: if the lede is the funding amount and not what the funding lets you do that you couldn't do before, there is no story.

**Daniel Reisman — Wire Editor, Reuters.** Wire desk veteran who decides what gets cross-posted. Hiring job: confirm material facts (amount, valuation, lead investor, named participants) are unambiguous and verifiable in one read. Bounce trigger: dollar figures buried, or "undisclosed" without context. Load-bearing belief: vague releases get summarized vaguely or skipped entirely.

**Priya Shah — Comms-Savvy Series B Founder.** Just raised her own round, reads competitor announcements obsessively to gauge market temperature. Hiring job: extract what this signals about the company's actual position. Bounce trigger: triumphant tone with no growth metric, no customer name, no hire from a recognizable company. Load-bearing belief: every press release leaks the company's real anxiety, and reads better when the anxiety is acknowledged.

**Elena Voss — Securities Lawyer, Cooley.** Reviews every release before it ships. Hiring job: kill anything that creates Reg FD exposure, IP claims that can't be substantiated, or language that constrains future strategy. Bounce trigger: superlatives ("first," "only," "largest") without a footnote, customer quotes that imply a contract or commitment. Load-bearing belief: "industry-leading" is a free option granted to plaintiff lawyers.

**Hacker News Reader "tptacek_fan_42."** Skims the first paragraph, opens comments, looks for the cynical takedown. Hiring job: find the contradiction between the marketing voice and the technical reality. Bounce trigger: buzzword density above 3 per paragraph, claims that contradict the engineering blog. Load-bearing belief: the more sanitized the release, the more there is to dig into.

**Sam Lee — Existing Customer.** Bought the product on the previous positioning. Hiring job: figure out whether this announcement means their workflow, pricing, or roadmap is about to change. Bounce trigger: new positioning that contradicts what was sold to them. Load-bearing belief: every "exciting evolution" is a tax on people who already paid.

### Failure modes

- **Funding announcement with no use-of-funds.** PRLab and York IE both flag this as the #1 omission — investors and would-be hires cannot tell what the round buys without specifics on hiring, geos, or product. ([York IE](https://york.ie/blog/how-to-write-a-funding-announcement-press-release-template/))
- **"Leading" / "first-of-its-kind" claims.** Substantively unverifiable; gets the release downgraded by wire editors and exposes the company to challenge.
- **CEO quote that sounds nothing like a human.** "We are thrilled to..." is a tell that no one inside reviewed it for voice.
- **Embargo theater that breaks because the announcement was given to a tier-1 outlet that lost interest.** Plan a backup wire distribution.

### Tumble-dry config

```yaml
panel_size: 6
convergence_threshold: 0.83  # 5 of 6
max_rounds: 4
editor_thinking_budget: medium  # ~8k tokens
```

### What good looks like

- **Stripe — Acquisition of Bouncer (2021):** lede states the operational problem (card-testing fraud), the mechanism (network insight), and the customer benefit in two sentences before the corporate prose starts.
- **Anthropic — Series funding releases:** consistent structure, named participants, specific use-of-funds tied to research milestones.
- **Notion — acquisition of Cron (2022):** acknowledges the existing customer concern ("what happens to the standalone app") in the body, not buried in an FAQ.

---

## 2. Crisis Communication / PR Statement

The genre with the highest negative variance: a great statement saves a quarter, a bad one defines the company for a decade. Read it aloud. If a single sentence could be screenshotted and ratio'd, rewrite it.

### Personas

**Karen Mehta — Crisis PR Partner, Edelman.** Twenty years walking CEOs through the worst week of their lives. Hiring job: ensure the statement satisfies the affected party first, the press second, and the lawyer's preferences last. Bounce trigger: passive voice on the harm ("mistakes were made"), or any sentence beginning with "While we..." Load-bearing belief: the apology must precede the explanation, not follow it.

**Hon. Robert Kang — Plaintiff's Class-Action Attorney.** Reads every breach notice and crisis statement looking for admissions and inconsistencies. Hiring job: find the sentence that becomes Exhibit A. Bounce trigger: any quantification of harm, any promise of remediation that creates a contractual expectation. Load-bearing belief: the statement is discoverable and will be read back to the CEO under oath.

**Aisha Bello — Affected Customer.** Her data is in the breach, or her flight was canceled, or she was the laid-off employee. Hiring job: figure out (a) am I personally affected, (b) what is the company doing for me specifically, and (c) is anyone going to be held accountable. Bounce trigger: corporate speak that doesn't name what happened in plain words. Load-bearing belief: if they can't say "we leaked your social security number" they don't actually understand what they did.

**Marcus Wei — Investigative Reporter, Bloomberg.** Already has the leaked Slack messages. Hiring job: spot the place where the public statement contradicts internal communications. Bounce trigger: timeline that doesn't match what the affected party already posted. Load-bearing belief: the cover-up is always worse than the crime, and the statement is the cover-up's first draft.

**Senator's Staffer.** Drafting questions for a hearing. Hiring job: extract concessions, pin the executive to a specific remediation plan, find the gap between what was promised and what is being done. Bounce trigger: vague commitments without dates or dollar amounts. Load-bearing belief: every weasel word is a future hearing question.

**Internal Employee on Slack.** Will screenshot the statement to a private group chat the moment it goes live. Hiring job: see whether leadership is being honest about what happened internally. Bounce trigger: external statement that doesn't match what was said in the all-hands. Load-bearing belief: leadership credibility is set by whether internal and external versions agree.

**Subject-Matter Twitter ("infosec_skeptic").** For a breach: a security researcher who will tear apart the technical claims. Hiring job: find the implausibility ("rotating credentials" without an actual mechanism). Bounce trigger: technically illiterate boilerplate. Load-bearing belief: the technical detail level signals whether anyone competent reviewed the statement.

### Failure modes

- **Bud Light / Anheuser-Busch (April 2023):** waited two weeks to respond to the Mulvaney backlash, then issued a vague non-apology that managed to alienate both the original audience and the boycott audience. Sales fell 29% in four weeks; brand lost #1 US beer position to Modelo. The company never reached out to Mulvaney directly — she said so on video. ([Crisis Ready Institute](https://crisisreadyinstitute.com/what-the-dylan-mulvaney-bud-light-can-controversy-should-teach-us/), [NPR](https://www.npr.org/2023/06/30/1185356673/trans-influencer-dylan-mulvaney-bud-light-backlash))
- **CrowdStrike (July 2024):** the CEO statement and technical post-mortem were strong; the $10 Uber Eats gift card to partners after taking down global aviation, hospitals, and 911 systems was not. Lesson: every gesture is a statement, including the ones procurement makes. ([TechCrunch](https://techcrunch.com/2024/07/24/crowdstrike-offers-a-10-apology-gift-card-to-say-sorry-for-outage/))
- **FTX / Sam Bankman-Fried (Nov 2022 onward):** post-collapse media tour over attorneys' explicit objections produced eight tweets, a Substack, and DMs to journalists that prosecutors later read into the trial record. Texted Vox reporter Kelsey Piper that "fuck regulators" was his real view. Rule: in a crisis with legal exposure, the founder does not freelance. ([Slate](https://slate.com/technology/2023/10/sam-bankman-fried-media-interviews-ftx-nyt-ft-twitter.html), [Fortune](https://fortune.com/crypto/2023/10/31/sam-bankman-fried-media-tour-interviews-become-trial-evidence/))
- **Klarna (May 2022):** CEO Sebastian Siemiatkowski announced 700 layoffs via pre-recorded video that gave no number; the number leaked to TechCrunch mid-call so most employees learned via Slack link. Then he posted a Google Sheet of laid-off workers' contact info to LinkedIn calling it "a goldmine." Two compounding failures: pre-recorded delivery and the post-layoff broadcast. ([Pragmatic Engineer](https://blog.pragmaticengineer.com/layoffs-at-klarna/), [CBS](https://www.cbsnews.com/news/klarna-ceo-fired-workers-linkedin/))
- **Better.com (Dec 2021):** 900 people fired on a Zoom call by CEO Vishal Garg. The compression of "mass firing + impersonal channel + insulting framing" is the worst-case template.
- **Cloudflare (Jan 2024):** Brittany Pietsch recorded her own termination call after HR could not give a specific reason. The 9-minute TikTok forced CEO Matthew Prince to respond publicly. Lesson: any layoff conversation may be recorded; the script must survive that.

### Tumble-dry config

```yaml
panel_size: 7
convergence_threshold: 0.85  # 6 of 7
max_rounds: 5
editor_thinking_budget: high  # ~16k tokens
```

Crisis comms is the one artifact where over-rotation is the right default: the cost of one extra round is hours; the cost of a missed risk is the company.

### What good looks like

- **Maersk — NotPetya (2017):** progressive technical disclosure, named the attack vector, gave a clear remediation timeline, and the CEO did press personally.
- **Slack — outage post-mortems:** technical specificity (named the root cause subsystem), stated what changed in the system to prevent recurrence.
- **JetBlue — Valentine's Day 2007 (Neeleman):** CEO video apology that named the operational failure and the customer rights bill that resulted.

---

## 3. Landing Page / Homepage / Pricing Page

The artifact most often written by committee and least often tested with a real prospect. The homepage is the most expensive sentence in the company; the pricing page is the most expensive table.

### Personas

**Harry "Ad Copy" Daniels — Independent Copywriter.** Channels Harry Dry's three rules: visualization, falsifiability, uniqueness. Hiring job: rewrite every line that another company in the category could also write. Bounce trigger: "platform," "solution," "empower," "next-generation." Load-bearing belief: if your competitor's homepage works with your logo on top, you don't have a homepage. ([Marketing Examples](https://marketingexamples.com/))

**Jen Park — Demand Gen Lead, Series C SaaS.** Owns the conversion rate. Hiring job: protect the CTA hierarchy, ensure social proof is above the fold, kill anything that adds cognitive load before the value prop lands. Bounce trigger: hero section that requires reading three sentences to understand the product. Load-bearing belief: every word above the fold either earns its place or steals from the CTA.

**Net-New Prospect (Persona of an ICP buyer who has never heard of you).** 20 seconds on the page. Hiring job: figure out what this is, who it's for, and whether to keep reading. Bounce trigger: jargon that requires category knowledge they don't have. Load-bearing belief: if I have to ask "what is this," I leave.

**Switching Prospect (Currently uses competitor X).** Hiring job: find the migration story and the differentiator that justifies the switching cost. Bounce trigger: feature parity claims with no migration tooling. Load-bearing belief: "we have all the features of X plus Y" is not a reason; "we let you do Z that X cannot" is.

**Procurement / Pricing Skeptic.** Hiring job: find the gotcha — usage caps, seat minimums, contract length, renewal auto-uplift. Bounce trigger: "Contact sales" on the only tier that fits them. Load-bearing belief: every pricing page hides one thing; the question is what.

**Karri-style Design Engineer.** Channels Linear's craft bar. Hiring job: enforce density, typographic hierarchy, and visual rhythm. Bounce trigger: stock photography, generic gradients, "trusted by" logos in random sizes. Load-bearing belief: the page IS the product demo for the kind of company you are.

**Mobile User on a Train.** 58% of pricing page traffic. Hiring job: complete the comparison with one thumb. Bounce trigger: horizontal-scroll comparison tables, modals that don't dismiss. Load-bearing belief: if it doesn't work on a phone, it doesn't work.

### Failure modes

- **Hero copy that describes the company, not the customer's job.** Stripe's homepage works precisely because it inverts this — "Payments infrastructure for the internet" places the reader's company in the sentence. ([Copyhackers on Stripe](https://copyhackers.com/2012/10/stripe-kicks-the-crap-out-of-competing-solutions/))
- **Four+ pricing tiers.** Convert 31% worse than three-tier pages per 2024 conversion analysis; 41% of successful startups use exactly three. ([InfluenceFlow](https://influenceflow.io/resources/saas-pricing-page-best-practices-complete-guide-for-2026/))
- **Negative-frame feature limits ("Starter is limited to 5 users")** convert 23% worse than the positive frame ("Professional includes unlimited users").
- **Missing billing toggle** leaves 25-35% of annual-plan revenue on the floor.
- **"Trusted by" logo wall with no case-study link.** Logo theater without proof.

### Tumble-dry config

```yaml
panel_size: 7
convergence_threshold: 0.71  # 5 of 7
max_rounds: 4
editor_thinking_budget: medium
```

### What good looks like

- **Stripe homepage** — value prop in seven words, code sample as the primary visual.
- **Linear homepage** — every line implies a craft standard the buyer aspires to.
- **Superhuman pricing page** — single tier, opinionated, the "Contact us" button is honest about the model.
- **Vercel pricing** — clear tier separation, calculator for the variable inputs, no "call us" gotcha until enterprise.
- **Basecamp pricing** — single flat price, confident copy, explicit anti-tier stance.

---

## 4. Sales Email / Cold Outreach Sequence

Cold email is the genre where AI has most degraded the average. Bar has risen because every prospect is drowning in mid-quality personalization. The only durable answer is information disparity. ([The Sales Blog — Iannarino](https://www.thesalesblog.com/blog/sales-outreach-beyond-personalization-to-value-driven-strategies))

### Personas

**Anthony "Iannarino" Mehta — Sales Coach.** Hiring job: kill any line that promotes the company or the product before establishing the prospect's problem. Bounce trigger: "I noticed you're the VP of..." followed by a pitch. Load-bearing belief: the only thing worth sending is information the prospect couldn't get without you.

**Veronica Liu — VP Marketing at the Target Account.** Receives ~80 cold emails per day, opens ~6, replies to ~1. Hiring job: spot the one email worth her 30 seconds. Bounce trigger: subject line longer than 6 words, or any "quick question" framing. Load-bearing belief: the email that gets the meeting names a specific bet I've publicly made and offers a specific data point I can use.

**Deliverability Engineer.** Hiring job: prevent the sender domain from being tarred. Bounce trigger: image-heavy HTML, more than two links, sender lists pulled from Apollo without warmup. Load-bearing belief: the best-written sequence is worthless if it lands in spam.

**Rahul Vohra — Power User Persona.** Hiring job: judge whether this would clear his Superhuman inbox triage. Bounce trigger: any line that doesn't earn its place; any P.S. that's a second pitch. Load-bearing belief: the email should fit on one phone screen and have exactly one ask.

**Skeptical IC Below the Buyer.** Forwarded the email by their boss to vet. Hiring job: find the BS. Bounce trigger: case studies that don't match company size, "the leader in" claims. Load-bearing belief: the credibility of the email is set by the realism of the customer examples, not the impressiveness of the logos.

**Compliance Officer.** For regulated industries (finance, healthcare). Hiring job: ensure the email doesn't make claims that violate advertising rules. Bounce trigger: ROI guarantees, comparative claims without footnoted basis. Load-bearing belief: the salesperson does not know what they're not allowed to say.

### Failure modes

- **Mail-merged "personalization."** When everyone references the prospect's recent funding, the reference becomes commodity. Iannarino: stop personalizing, start informing.
- **Five-touch sequences with no escalating value.** Each follow-up should add a new artifact (data point, customer story, teardown), not just "bumping this."
- **Subject line that promises more than the body delivers.** Trains the prospect to never open you again.
- **Breaking the thread too early.** Sequences 1-3 should re-thread (Re:); 4+ break the thread to test a new subject line. ([Allegrow](https://www.allegrow.co/knowledge-base/cold-email-sequences))

### Tumble-dry config

```yaml
panel_size: 5
convergence_threshold: 0.80  # 4 of 5
max_rounds: 3
editor_thinking_budget: low  # short artifact, fast loop
```

### What good looks like

- **Rahul Vohra's Superhuman early-customer emails** — short, named the user's actual workflow, offered a 30-min onboarding call as the value, not as the ask. ([First Round Review](https://review.firstround.com/how-superhuman-built-an-engine-to-find-product-market-fit/))
- **Patrick Campbell (ProfitWell)** — opened with original benchmark data the prospect couldn't get elsewhere.
- **Sam Parr (Hampton)** — community-style emails that read like a friend's, not a vendor's.

---

## 5. Product Launch Announcement / Twitter Thread / LinkedIn Post

The launch post is the artifact with the most public failure mode: it sits permanently on a profile as evidence of taste.

### Personas

**Hook Critic.** Hiring job: judge whether the first sentence works alone, screenshot-able, in someone's quote-tweet. Bounce trigger: "I'm thrilled to announce..." or "🚨" emoji. Load-bearing belief: if the hook needs the rest of the thread to land, the thread will not be read.

**Justin Welsh-Style LinkedIn Operator.** Hiring job: enforce the formatting that LinkedIn rewards (line breaks, scannable structure, one CTA). Bounce trigger: paragraphs longer than two lines on mobile. Load-bearing belief: LinkedIn is a scrolling medium; visual rhythm is the medium.

**Skeptical Engineer in the Replies.** Hiring job: find the technical exaggeration. Bounce trigger: claims that contradict the docs, benchmark numbers without methodology, "10x faster than X." Load-bearing belief: the comments are the real review; pre-rebut the obvious objection in the thread itself.

**Existing Customer / Beta User.** Hiring job: confirm their experience matches the marketing. Bounce trigger: launch copy that papers over a known limitation. Load-bearing belief: betrayed beta users tweet louder than happy launch-day prospects.

**Competing Founder Watching.** Hiring job: read the announcement for strategic signal. Bounce trigger: positioning that retreats from a previous claim. Load-bearing belief: every launch announcement is also a roadmap leak.

**Press / Newsletter Aggregator.** Hiring job: decide whether to include in the weekly roundup. Bounce trigger: announcement that requires reading three threads to understand. Load-bearing belief: aggregators copy-paste the second sentence; make sure that one is portable.

### Failure modes

- **No standalone hook.** Tweet 1 must work without tweets 2-N. ([Postnext](https://postnext.io/blog/viral-on-twitter-x/))
- **Single-shot launch tweet with no support content.** Plan a content storm: master thread + 5-10 supporting posts (memes, testimonials, demos) across the day.
- **Burying the link.** Standard advice: link in the last tweet of a thread, not the first (Twitter algorithm penalty on link-leading posts).
- **Launch posts written to impress peers, not target customers.** The dead giveaway is jokes only fellow founders get.

### Tumble-dry config

```yaml
panel_size: 6
convergence_threshold: 0.83
max_rounds: 3
editor_thinking_budget: medium
```

### What good looks like

- **Linear product launch threads** — restraint, screenshots over GIFs, single value claim per tweet.
- **Cursor's launch posts** — a single demo video that demonstrates the value in 15 seconds.
- **Pieter Levels (@levelsio)** — relentlessly specific (revenue numbers, user counts) and self-deprecating, which inoculates against the "VC-speak" reaction.

---

## 6. Brand Guidelines / Messaging Architecture

The artifact most often produced by an agency, most often ignored by the org that paid for it. A messaging architecture only works if the people who write daily copy can recall it from memory under deadline.

### Personas

**April Dunford-Inspired Positioning Lead.** Hiring job: ensure the doc separates positioning (strategic inputs) from messaging (approved language). Bounce trigger: a "messaging house" that has no named competitive alternatives. Load-bearing belief: positioning that doesn't name the alternative the customer rejects is not positioning. ([April Dunford](https://www.aprildunford.com/post/a-quickstart-guide-to-positioning))

**Junior Copywriter on Their First Day.** Hiring job: open the doc and write a tweet, an email subject, and a CTA from it without asking anyone. Bounce trigger: doc that requires a workshop to interpret. Load-bearing belief: if a new hire can't ship copy from this doc by lunch, the doc is decoration.

**Brand Designer.** Hiring job: confirm the visual system enforces the verbal system. Bounce trigger: voice principles that contradict the typography (e.g., "warm and human" voice with cold geometric sans). Load-bearing belief: the customer reads voice and visual together; mismatched signals are louder than either alone.

**Customer Researcher.** Hiring job: confirm the words match the words customers actually use. Bounce trigger: messaging that uses category jargon customers don't use ("workflow orchestration" when customers say "rules"). Load-bearing belief: messaging that doesn't lift from sales call transcripts is fan fiction about the customer.

**Mailchimp-Style Content Designer.** Hiring job: ensure the tone-vs-voice distinction is operational, with named modes for different contexts (error states, marketing, education). Bounce trigger: "voice" reduced to a list of adjectives without examples. Load-bearing belief: a voice guide without before/after rewrites is unenforceable. ([Mailchimp Style Guide](https://styleguide.mailchimp.com/voice-and-tone/))

**Skeptical Sales Rep.** Hiring job: identify which approved language they will refuse to say on a call because it sounds dishonest. Bounce trigger: superlatives, "category-defining," anything they'd be embarrassed to put in their own outbound. Load-bearing belief: messaging the front line won't repeat is dead messaging.

### Failure modes

- **Tropicana (2009):** $35M packaging redesign that abandoned the visual equities (oranges, the straw, the script logo). 20% sales drop in one month, $20M loss, reverted in 30 days. Brand guidelines without a "do not touch" inventory of equities are dangerous. ([The Branding Journal](https://www.thebrandingjournal.com/2015/05/what-to-learn-from-tropicanas-packaging-redesign-failure/))
- **Gap (2010):** new logo unveiled Oct 6, reverted Oct 12. Six days. The brand book had no decision-rights doc explaining why the original was load-bearing.
- **Bumble celibacy billboards (May 2024):** brand guidelines that authorized "bold and unapologetic" voice with no editorial check on the actual claims being made. The billboard "You know full well a vow of celibacy is not the answer" shipped because no one in the approval chain was empowered to say the brand voice was being misapplied. ([Salon](https://www.salon.com/2024/05/15/bumble-celibacy-marketing-campaign-backlash-explained/), [Today](https://www.today.com/health/news/bumble-anti-celibacy-campaign-backlash-rcna152143))

### Tumble-dry config

```yaml
panel_size: 6
convergence_threshold: 0.83
max_rounds: 4
editor_thinking_budget: high
```

### What good looks like

- **Mailchimp Content Style Guide** — public, reusable, with named voice + named tone-shifting modes for context.
- **Atlassian Design System / voice** — concrete examples for every principle.
- **GOV.UK style guide** — ruthless simplicity, evidence cited for every rule.
- **Slack's old "always be kind" voice doc** — one principle that scaled to thousands of writers.

---

## 7. Customer Case Study / Testimonial

The genre most often written for the vendor's pride and least often written for the buyer's research process.

### Personas

**Doug Kessler-Inspired B2B Editor.** (Velocity Partners.) Hiring job: ensure the case study is honest about the obstacles and friction along the way to the result. Bounce trigger: heroic narrative with no setbacks. Load-bearing belief: case studies that omit the messy middle signal the vendor doesn't trust the buyer to handle reality. ([Velocity Partners on case studies](https://velocitypartners.com/blog/why-case-studies-suck/))

**Buyer in the Same Industry.** Hiring job: see whether the customer's situation maps to theirs. Bounce trigger: vague company size ("a leading enterprise"), unnamed metrics ("significant ROI"). Load-bearing belief: the case study is only useful if I can do the same arithmetic against my own numbers.

**Featured Customer's Manager.** Hiring job: confirm nothing in the study damages the customer's brand or leaks confidential numbers. Bounce trigger: revenue figures, internal team names without consent, before-state described as more dysfunctional than reality. Load-bearing belief: a case study that embarrasses the customer ends future references.

**Skeptical Analyst (Forrester / Gartner).** Hiring job: stress-test the methodology of the headline number. Bounce trigger: "ROI" without a stated baseline, time horizon, or attribution model. Load-bearing belief: cherry-picked metrics undermine all the case study's other claims.

**Sales Rep About to Use This in a Deal.** Hiring job: extract the one quote and the one number they will repeat in a meeting. Bounce trigger: case study buried in a PDF with no extracted soundbite. Load-bearing belief: a case study without a 30-second verbal version doesn't survive contact with a sales call.

**Hero Customer (the protagonist).** Hiring job: feel like the hero of their own story, not a prop in the vendor's. Bounce trigger: copy that makes the vendor the hero. Load-bearing belief: customers who feel used in a case study don't renew.

### Failure modes

- **No named obstacle.** The Velocity Partners-style honest case study includes what nearly went wrong; the brochure version skips it and reads as fiction.
- **Logo without permission to use it at scale.** The customer signed off on the case study but not on it being a hero asset across channels.
- **Result number with no baseline.** "47% improvement" from what?
- **Quotes the customer would never actually say.** Marketers writing words then asking for sign-off; sign-off granted reluctantly; quote sounds like marketing.

### Tumble-dry config

```yaml
panel_size: 6
convergence_threshold: 0.83
max_rounds: 3
editor_thinking_budget: medium
```

### What good looks like

- **Basecamp / 37signals customer stories** — long-form, customer-voiced, willing to print the friction.
- **Linear customer stories** — specific workflow examples with screenshots, named teams.
- **Stripe customer stories** — engineering-credible, named architectures, real numbers.
- **Velocity Partners' "anonymous case study" pattern** — when the logo can't be used, anonymity unlocks the real story. ([Velocity on anonymous studies](https://velocitypartners.com/blog/how-to-write-an-anonymous-case-study-that-doesnt-suck/))

---

## 8. Earnings Press Release / Investor Relations Communications

The artifact with the highest legal coupling. Personas weighted toward compliance, but the brand voice still has to survive.

### Personas

**Elena Voss — Securities Counsel (returns from Section 1).** Hiring job: ensure Reg FD compliance, properly bracketed forward-looking statements, Reg G reconciliation for non-GAAP, no selective disclosure. Bounce trigger: a metric in the release that wasn't in the 10-Q draft, boilerplate "safe harbor" placed where it might be missed. Load-bearing belief: the safe harbor must be meaningful and specific to the actual statements made; generic boilerplate has been struck down in court. ([Goodwin Earnings Releases Guide](https://www.publiccompanyadvisoryblog.com/wp-content/uploads/sites/13/2022/10/Goodwin-PCAP-Earnings-Releases.pdf))

**Sell-Side Analyst.** Hiring job: extract the new data needed to update the model in 10 minutes before the call. Bounce trigger: missing segment breakouts, restated prior periods without bridge. Load-bearing belief: every missing number gets imputed unfavorably and then asked about on the call.

**Activist Hedge Fund Analyst.** Hiring job: find the gap between the headline narrative and the cash flow statement. Bounce trigger: GAAP-to-non-GAAP adjustments that grow quarter over quarter, "one-time" charges that recur. Load-bearing belief: the most aggressive number gets the headline; the truth is in the reconciliation.

**Retail Investor on r/investing.** Hiring job: figure out whether to hold, buy, or sell before the after-hours move. Bounce trigger: jargon that obscures whether the quarter was good. Load-bearing belief: the press release is graded on whether a non-finance human can answer "did they beat?" in 30 seconds.

**IR-Designated CFO Spokesperson.** Hiring job: ensure the release is consistent with what they will say on the call and in 1:1s; nothing in the release that they can't defend. Bounce trigger: aspirational forward-looking language that constrains optionality. Load-bearing belief: every adjective in the release becomes a question on the call. ([NIRI Standards](http://media.corporate-ir.net/media_files/priv/27585/standards_practice.pdf))

**Financial Reporter (WSJ / FT).** Hiring job: find the lede in 90 seconds. Bounce trigger: revenue framed in non-comparable terms (constant currency, ex-divestitures, ex-acquisitions) without the GAAP number adjacent. Load-bearing belief: the headline gets written from the press release; if you make it hard, the headline will be hostile.

### Failure modes

- **Selective disclosure.** Releasing material info to one analyst before the wire = Reg FD violation.
- **Boilerplate safe harbor instead of specific cautionary statements.** Loses the safe harbor protection in litigation.
- **Non-GAAP measures without GAAP reconciliation in the same release.** Reg G violation.
- **CEO quote that's a forward-looking statement without proper hedging.** Becomes the Item 4 of the next 8-K.

### Tumble-dry config

```yaml
panel_size: 6
convergence_threshold: 0.83
max_rounds: 5
editor_thinking_budget: high
```

Higher max_rounds because legal review introduces non-marketing constraints that often cascade.

### What good looks like

- **Berkshire Hathaway annual letter** — the IR comms benchmark that has nothing to do with quarterly form. Buffett's style is the long-tail option.
- **Costco earnings releases** — terse, factual, same structure every quarter, headline in one line.
- **Apple earnings releases** — segment breakouts in the same format quarter after quarter, machine-readable.

---

## 9. Conference Talk Abstract / Keynote Outline

The CFP committee reads ~300 abstracts in a sitting. Yours has 90 seconds and competes with talks from people who've spoken at this conference before.

### Personas

**CFP Committee Member.** Hiring job: pick 30 talks from 300 abstracts. Bounce trigger: abstract that doesn't state what the audience will be able to do differently after the talk. Load-bearing belief: abstracts that promise "an exploration of" instead of "you will leave able to" get cut. ([freeCodeCamp on CFPs](https://www.freecodecamp.org/news/how-to-write-a-good-conference-talk-proposal/))

**Conference Organizer Who Owns the Track.** Hiring job: confirm the talk fills a gap in the program and won't duplicate another accepted talk. Bounce trigger: generic title that could apply to four other tracks. Load-bearing belief: the program is a curated collection; a talk that doesn't say something specific can't be slotted.

**Target Attendee.** Hiring job: decide whether to walk into this room or the one across the hall. Bounce trigger: abstract that hides what level of expertise it assumes. Load-bearing belief: a talk that doesn't name its prerequisites wastes the audience's slot.

**Skeptical Senior in the Room.** Hiring job: spot whether the speaker has actually done the work or is recapping a blog post. Bounce trigger: bio without the receipts (shipped product, named war story). Load-bearing belief: the difference between a great talk and a TED-style summary is operator scars.

**Past-Self of the Speaker.** Hiring job: identify the version of this talk the speaker would have wanted to attend three years ago. Bounce trigger: jargon the past-self wouldn't have understood. Load-bearing belief: the talk's audience is a younger version of the speaker, not the speaker's peer group.

**Twitter Recap Writer.** Hiring job: find the screenshot-able takeaway. Bounce trigger: talk with no "the slide everyone tweets." Load-bearing belief: a talk's afterlife depends on whether one slide travels.

### Failure modes

- **Abstract that promises a survey instead of a position.** "We'll explore the landscape of X" = rejection.
- **Bio that doesn't establish the right to speak on this topic.** Speaker credentials must connect to talk subject.
- **Title that's clever but ungoogleable.** Search-friendly titles get the YouTube longevity.
- **No stated learning outcomes.** CFP committees increasingly require explicit takeaways.

### Tumble-dry config

```yaml
panel_size: 5
convergence_threshold: 0.80
max_rounds: 3
editor_thinking_budget: low
```

### What good looks like

- **Bryan Cantrill talks** — title is a position, abstract delivers a thesis, talk has war stories.
- **Camille Fournier conference abstracts** — specific learning outcomes, named the audience.
- **Strange Loop abstract archive** — generally exemplary; specific, opinionated, evidence-cited.

---

## 10. Newsletter / Serialized Blog (Substack, Beehiiv)

The artifact graded on consistency over years, not virality on any one post. The persona panel reflects the long arc.

### Personas

**Lenny-Style Operator-Audience Reader.** Hiring job: read this on a Sunday and decide whether to keep paying $X/year. Bounce trigger: post that recycles a framework without new evidence. Load-bearing belief: paid newsletters are graded on whether the reader can recall a specific takeaway from the last three issues. ([Lenny's Newsletter](https://www.lennysnewsletter.com/), [Growth In Reverse on Lenny](https://growthinreverse.com/lenny-1m-subscribers/))

**Stratechery-Style Analytical Reader.** Hiring job: stress-test the argument. Bounce trigger: assertion without source, analogy that breaks under scrutiny. Load-bearing belief: a newsletter's authority is the cumulative track record of arguments that held up.

**First-Time Visitor From a Tweet.** Hiring job: figure out in 20 seconds whether to subscribe. Bounce trigger: post that requires backstory from previous issues to follow. Load-bearing belief: every post should subscribe a new reader.

**Subscriber Considering Cancellation.** Hiring job: decide whether the next issue is worth the inbox real estate. Bounce trigger: three issues in a row that feel like filler. Load-bearing belief: cadence without quality is churn fuel.

**Editor / Copyeditor.** Hiring job: enforce the rhythm — paragraph length, link density, header hygiene, scannability. Bounce trigger: walls of text on mobile, links every other sentence. Load-bearing belief: the medium (inbox) constrains the form (scannable, mobile-first).

**Distribution-Aware Marketer.** Hiring job: ensure every post has a portable hook (subject line, social card, lift-quote). Bounce trigger: post with no headline that survives a tweet. Load-bearing belief: writing a great post is necessary; engineering its sharing is sufficient.

### Failure modes

- **Cadence inflation.** Lenny posted weekly for years; quality came from the discipline, not the volume. Newsletters that double cadence to grow usually halve quality.
- **Topic drift.** Lenny's surprise: a deliberately broad-but-coherent mix worked better than a strict niche. But drift without coherence = unsubscribes.
- **Burying the value.** Substack analytics show open rate is a function of subject line × sender trust; the body is graded on whether the hook is delivered in the first 200 words.
- **Recommendation graph neglect.** Substack growth in the last three years is dominated by cross-recommendations; a newsletter that doesn't invest in this leaves growth on the floor.

### Tumble-dry config

```yaml
panel_size: 5
convergence_threshold: 0.80
max_rounds: 3
editor_thinking_budget: medium
```

### What good looks like

- **Lenny's Newsletter** — operator interviews + frameworks, weekly cadence, clear visual rhythm.
- **Stratechery (Ben Thompson)** — daily update + Monday article, consistent argumentative form, hyperlinks as evidence.
- **Money Stuff (Matt Levine)** — voice you'd recognize in three sentences, confidence to be funny about securities law.
- **Marketing Examples (Harry Dry)** — minimum viable post: one example, one principle, one screenshot. ([Marketing Examples](https://marketingexamples.com/))
- **The Pragmatic Engineer (Gergely Orosz)** — investigative depth, named sources, evidence above opinion. ([Pragmatic Engineer on Klarna](https://blog.pragmaticengineer.com/layoffs-at-klarna/))

---

## Cross-Cutting Notes

**Always include the existing-customer persona.** Across all ten artifact types, the most-overlooked critic is the customer who already bought on the previous positioning. Marketing teams optimize for the new prospect; the betrayed customer is the loudest detractor on social.

**The lawyer is not optional in three genres.** Crisis comms, earnings IR, and case studies all have legal exposure that copywriters routinely underweight. Recommend at least one lawyer persona in those panels by default.

**Convergence threshold should rise with downside risk.** Cold email at 0.80 is fine — the cost of a bad email is one prospect. Crisis comms at 0.85 is the floor — the cost of a bad statement is the company.

**Editor thinking budget tracks legal/strategic complexity.** High budget for crisis comms, IR, and brand guidelines (where one phrase has cascading implications). Low budget for cold email and CFP abstracts (where iteration speed matters more than depth per pass).

**Real-customer-language input.** For artifact types 3, 6, and 7, the panel benefits from being seeded with verbatim customer quotes (call transcripts, support tickets, churn surveys). Personas can then check the draft against the actual phrasing of the people it's meant to reach.

---

## Citations

### Crisis & PR Disasters

- [Crisis Ready Institute — What the Bud Light controversy should teach us](https://crisisreadyinstitute.com/what-the-dylan-mulvaney-bud-light-can-controversy-should-teach-us/)
- [Memo — Bud Light's Crisis Explored](https://memo.co/blog/bud-lights-crisis-explored/)
- [NPR — Mulvaney says Bud Light never reached out](https://www.npr.org/2023/06/30/1185356673/trans-influencer-dylan-mulvaney-bud-light-backlash)
- [Roger Martin — The Strategy Lesson from the Bud Light Fiasco](https://rogermartin.medium.com/the-strategy-lesson-from-the-bud-light-fiasco-874ef8db4f49)
- [Bud Light boycott — Wikipedia](https://en.wikipedia.org/wiki/Bud_Light_boycott)
- [TechCrunch — CrowdStrike's $10 apology gift card](https://techcrunch.com/2024/07/24/crowdstrike-offers-a-10-apology-gift-card-to-say-sorry-for-outage/)
- [CrowdStrike — To Our Customers and Partners](https://www.crowdstrike.com/en-us/blog/to-our-customers-and-partners/)
- [Wikipedia — 2024 CrowdStrike-related IT outages](https://en.wikipedia.org/wiki/2024_CrowdStrike-related_IT_outages)
- [Slate — SBF Media Tour Has Come Back to Bite Him](https://slate.com/technology/2023/10/sam-bankman-fried-media-interviews-ftx-nyt-ft-twitter.html)
- [Fortune — SBF moronic media tour](https://fortune.com/crypto/2023/10/31/sam-bankman-fried-media-tour-interviews-become-trial-evidence/)
- [Greentarget — FTX: Cautionary Tale for CEOs and PR](https://greentarget.com/insights/blog/the-tragedy-of-sam-bankman-fried-and-why-every-ceo-needs-a-pr-fool/)
- [Pragmatic Engineer — Inside the Layoffs at Klarna](https://blog.pragmaticengineer.com/layoffs-at-klarna/)
- [CBS — Klarna CEO shares names of laid-off workers](https://www.cbsnews.com/news/klarna-ceo-fired-workers-linkedin/)
- [Fast Company — Klarna CEO layoffs email blast](https://www.fastcompany.com/90757129/klarna-ceo-layoffs-email-blast-controversy)
- [Today — Bumble Anti-Celibacy Campaign Backlash Timeline](https://www.today.com/health/news/bumble-anti-celibacy-campaign-backlash-rcna152143)
- [Salon — Bumble's anti-celibacy campaign explained](https://www.salon.com/2024/05/15/bumble-celibacy-marketing-campaign-backlash-explained/)
- [Fast Company — Bumble apologizes for celibacy ad fiasco](https://www.fastcompany.com/91124840/bumble-apologizes-for-its-anti-celibacy-ad-fiasco)
- [The Branding Journal — Tropicana packaging redesign failure](https://www.thebrandingjournal.com/2015/05/what-to-learn-from-tropicanas-packaging-redesign-failure/)
- [Creme de Mint — Worst Rebrand in History (Tropicana)](https://cremedemint.com/blog/industry/the-worst-rebrand-in-history-how-to-avoid-tropicanas-famous-failure/)

### Craft / Frameworks

- [Marketing Examples — Harry Dry](https://marketingexamples.com/)
- [Upgrow — Harry Dry's 3 Rules for Ads](https://www.upgrow.io/blog/harry-dry-copywriting-3-rules)
- [Stripe — Writing copy for landing pages (Atlas guide)](https://stripe.com/guides/atlas/landing-page-copy)
- [Copyhackers — Stripe analysis](https://copyhackers.com/2012/10/stripe-kicks-the-crap-out-of-competing-solutions/)
- [Slab — How Stripe Built a Writing Culture](https://slab.com/blog/stripe-writing-culture/)
- [Mailchimp Content Style Guide](https://styleguide.mailchimp.com/)
- [Mailchimp Voice and Tone](https://styleguide.mailchimp.com/voice-and-tone/)
- [Mailchimp content-style-guide on GitHub](https://github.com/mailchimp/content-style-guide/blob/master/02-voice-and-tone.html.md)
- [April Dunford — Quickstart Guide to Positioning](https://www.aprildunford.com/post/a-quickstart-guide-to-positioning)
- [April Dunford — A Product Positioning Exercise](https://www.aprildunford.com/post/a-product-positioning-exercise)
- [First Round Review — How Superhuman Built an Engine to Find PMF (Rahul Vohra)](https://review.firstround.com/how-superhuman-built-an-engine-to-find-product-market-fit/)
- [Mind the Product — The PMF Engine by Rahul Vohra](https://www.mindtheproduct.com/the-product-market-fit-engine-by-rahul-vohra/)
- [The Sales Blog (Anthony Iannarino) — Beyond Personalization](https://www.thesalesblog.com/blog/sales-outreach-beyond-personalization-to-value-driven-strategies)
- [The Sales Blog — Mastering Cold Outreach](https://www.thesalesblog.com/blog/mastering-cold-outreach-proven-strategies-for-breaking-through-the-noise-in-sales-prospecting)
- [Allegrow — Cold Email Sequence Guide](https://www.allegrow.co/knowledge-base/cold-email-sequences)
- [Velocity Partners — Why B2B case studies suck](https://velocitypartners.com/blog/why-case-studies-suck/)
- [Velocity Partners — Anonymous case studies](https://velocitypartners.com/blog/how-to-write-an-anonymous-case-study-that-doesnt-suck/)
- [Linear — Startups, Write Changelogs (Karri Saarinen)](https://medium.com/linear-app/startups-write-changelogs-c6a1d2ff4820)
- [Linear — Now (changelog)](https://linear.app/now)
- [freeCodeCamp — How to Write a Good Conference Talk Proposal](https://www.freecodecamp.org/news/how-to-write-a-good-conference-talk-proposal/)
- [speaking.io — Writing the CFP](https://speaking.io/plan/writing-a-cfp/)
- [Lena Reinhard — How To Write CfP Submissions](https://www.lenareinhard.com/articles/how-to-write-cfp-submissions-that-get-your-tech-conference-talk-accepte)
- [Lenny's Newsletter](https://www.lennysnewsletter.com/)
- [Growth In Reverse — Lenny's Journey to 1M Subscribers](https://growthinreverse.com/lenny-1m-subscribers/)
- [Substack on Lenny — Building a consistent writing habit](https://on.substack.com/p/how-to-create-consistent-writing-habit-lenny)
- [a16z — So You Want to Launch a Newsletter](https://a16z.com/2020/09/17/substack-writers/)
- [Postnext — How to Go Viral on X](https://postnext.io/blog/viral-on-twitter-x/)
- [InfluenceFlow — SaaS Pricing Page Best Practices 2026](https://influenceflow.io/resources/saas-pricing-page-best-practices-complete-guide-for-2026/)
- [Kalungi — 12 Best SaaS Pricing Page Examples](https://www.kalungi.com/blog/best-saas-pricing-pages)

### Press Release / IR / Legal

- [PR Newswire — How to Write a Press Release](https://www.prnewswire.com/resources/articles/how-to-write-a-press-release-tips-and-best-practices/)
- [PR Newswire — Best of the Wire 2024](https://www.prnewswire.com/resources/articles/best-of-the-wire-2024/)
- [PRLab — Funding Announcement Press Releases](https://prlab.co/blog/funding-announcement-press-releases/)
- [York IE — How to Write a Funding Announcement Press Release](https://york.ie/blog/how-to-write-a-funding-announcement-press-release-template/)
- [Goodwin — Earnings Releases: Legal Requirements & Practice Tips](https://www.publiccompanyadvisoryblog.com/wp-content/uploads/sites/13/2022/10/Goodwin-PCAP-Earnings-Releases.pdf)
- [Winston & Strawn — Regulation FD Handbook](https://www.winston.com/a/web/omyXFkQ5UVE3w6ERnBgvaw/pubco_regulation-fd-selective-disclosure-guide.pdf)
- [WilmerHale — Practical Guidance for Living with Regulation FD](https://www.wilmerhale.com/en/insights/publications/practical-guidance-for-living-with-regulation-fd-september-2000)
- [NIRI — Standards of Practice](http://media.corporate-ir.net/media_files/priv/27585/standards_practice.pdf)
- [PR Newswire — Financial Earnings Press Releases Guidelines](https://www.prnewswire.com/resources/articles/financial-earnings-press-releases/)
- [FTC — Data Breach Response: A Guide for Business](https://www.ftc.gov/business-guidance/resources/data-breach-response-guide-business)
- [NY Dept of State — Data Security Breach Notification Sample Letter](https://dos.ny.gov/data-security-breach-notification-sample-letter)
- [ACC — Sample Notice of Data Breach Letter](https://www.acc.com/resource-library/sample-notice-data-breach-letter-us)
- [NCSL — Security Breach Notification Laws Summary](https://www.ncsl.org/technology-and-communication/security-breach-notification-laws)

### Other

- [Adweek — Shot on iPhone enduring hit](https://www.adweek.com/brand-marketing/how-apples-ridiculously-simple-idea-became-the-enduring-shot-on-iphone-campaign/)
