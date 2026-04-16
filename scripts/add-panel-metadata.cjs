#!/usr/bin/env node
/**
 * Add panel-level metadata to library.md:
 * - **Not for:** (anti-persona) per panel
 * - **Last validated:** 2026-04-15 per panel
 * - **market_assumptions:** for time-sensitive panels
 */

const fs = require('fs');
const path = require('path');

const libraryPath = path.join(__dirname, '..', 'personas', 'library.md');
const content = fs.readFileSync(libraryPath, 'utf-8');

// Panel metadata keyed by H2 section title (exact match after "## ")
const panelMeta = {
  'Seed pitch deck': {
    notFor: 'Late-stage investors evaluating unit economics; they\'ll find this deck empty, and that\'s by design — seed decks sell vision, not metrics.',
    marketAssumptions: 'Seed rounds are typically <$5M; ARR expectation is nascent or zero; YC batch size ~240; seed-stage VC evaluates founder + market, not financials.',
  },
  'Series A pitch deck': {
    notFor: 'Seed investors pattern-matching on founder energy alone; this deck is a growth-machine underwriting, not a story pitch.',
    marketAssumptions: 'Series A expects $1-3M ARR with growth >2x YoY; NRR >100% is baseline; CAC payback <24 months is healthy; "magic number" >0.7 signals efficient growth.',
  },
  'Late-stage / growth-equity pitch deck': {
    notFor: 'Early-stage investors evaluating founder-market fit; this deck is a capital-efficiency audit, not a vision document.',
    marketAssumptions: 'Rule of 40 is the standard SaaS health metric as of 2025; public SaaS multiples in 5-10x revenue range; burn multiple <2x is efficient.',
  },
  'Financial model / unit-economics doc / pricing strategy': {
    notFor: 'Narrative readers looking for a business story; this is a mechanical audit of driver assumptions and formula integrity.',
    marketAssumptions: 'SaaS gross margin >60% is baseline; monthly churn 3-5% is typical for SMB SaaS; per-seat pricing is legacy for usage products.',
  },
  'Board memo / board deck': {
    notFor: 'External investors doing diligence — board materials are governance artifacts, not sales documents.',
  },
  'Investor update / LP letter / portfolio quarterly': {
    notFor: 'First-time readers with no portfolio context; these updates assume ongoing relationship and prior update cadence.',
    marketAssumptions: 'LP expectations: quarterly for fund letters, monthly for portfolio updates; MOIC/IRR/DPI/TVPI are standard return metrics.',
  },
  'M&A pitch / acquisition rationale memo': {
    notFor: 'Retail investors or press reading for the headline; this panel evaluates the internal deal rationale, not the announcement.',
    marketAssumptions: 'Revenue synergies miss 70% of the time (McKinsey); synergy overestimate is typically 20-50%; cultural integration is the #1 failure mode.',
  },
  'Annual report / 10-K MD&A': {
    notFor: 'Casual readers looking for a company overview; this panel evaluates SEC-grade disclosure, not marketing.',
    marketAssumptions: 'Plain English Handbook (SEC 1998) is baseline; Reg G governs non-GAAP; risk factors must be specific post-2020 SEC guidance.',
  },
  'Earnings call script / analyst Q&A prep': {
    notFor: 'Retail-only audiences; this panel assumes sell-side analyst and institutional investor as primary readers.',
    marketAssumptions: 'Reg FD (2000) governs selective disclosure; "still" is the most expensive word in earnings calls; non-GAAP reconciliation is Reg G mandatory.',
  },
  'Business case / internal capex investment proposal': {
    notFor: 'External investors or board members below materiality threshold; this is an internal capital-allocation artifact.',
  },
  'PRD (Product Requirements Document)': {
    notFor: 'End users or customers; PRDs are internal artifacts for engineering, design, and product leadership.',
  },
  'Engineering RFC / Design Proposal / ADR': {
    notFor: 'Non-technical stakeholders evaluating business impact; RFCs are engineering artifacts for technical decision-making.',
  },
  'Technical Spec / API Design Doc': {
    notFor: 'Business stakeholders evaluating ROI; API specs are technical contracts for implementers and consumers.',
  },
  'Postmortem / Incident Report': {
    notFor: 'External customers or press; postmortems are internal learning artifacts (external status pages are separate).',
  },
  'Runbook / Operational Playbook': {
    notFor: 'Strategic planners or architects; runbooks are tactical execution artifacts for on-call operators.',
  },
  'Open-Source README + CONTRIBUTING': {
    notFor: 'Internal team members who already know the codebase; READMEs are for first-time visitors and prospective contributors.',
  },
  'Migration Plan / Breaking Change Announcement': {
    notFor: 'Users who aren\'t affected by the migration; anti-persona is the developer whose workflow doesn\'t touch the changed surface.',
  },
  'Security Review / Threat Model': {
    notFor: 'Non-technical executives looking for a risk summary; threat models are technical artifacts for security engineering.',
  },
  'ML/AI Eval Plan / Model Card': {
    notFor: 'End users of the ML product; model cards are for ML engineers, product managers, and responsible-AI reviewers.',
    marketAssumptions: 'Pre-registration of evals is emerging best practice; Mitchell et al. (2019) model card standard; subgroup reporting is expected for high-stakes applications.',
  },
  'Developer-Facing Docs (Tutorial, Reference, Conceptual)': {
    notFor: 'The wrong Diataxis mode reader — if this is a tutorial, the power user is the anti-persona; if reference, the beginner is the anti-persona.',
  },
  'Press Release (Product Launch, Fundraise, Hire, M&A)': {
    notFor: 'Internal employees looking for the real strategy; press releases are external-facing artifacts optimized for journalist pickup.',
  },
  'Crisis Communication / PR Statement': {
    notFor: 'Internal employees (they receive a separate all-hands communication); this panel evaluates the external-facing statement.',
  },
  'Landing Page / Homepage / Pricing Page': {
    notFor: 'Existing power users looking for documentation; landing pages are for prospects evaluating whether to start.',
  },
  'Sales Email / Cold Outreach Sequence': {
    notFor: 'Prospects who aren\'t in-market; don\'t optimize for warming cold leads, optimize for converting warm ones.',
  },
  'Product Launch Announcement / Twitter Thread / LinkedIn Post': {
    notFor: 'Journalists looking for a press release; launch posts are social-native artifacts for the creator\'s direct audience.',
  },
  'Brand Guidelines / Messaging Architecture': {
    notFor: 'End customers; brand guidelines are internal artifacts for copywriters, designers, and agency partners.',
  },
  'Customer Case Study / Testimonial': {
    notFor: 'The vendor\'s internal team looking for praise; case studies are for prospective buyers evaluating fit.',
  },
  'Earnings Press Release / IR Comms': {
    notFor: 'General media looking for a news story; IR comms are for analysts, institutional investors, and compliance reviewers.',
    marketAssumptions: 'Reg FD (2000) and Reg G govern disclosure; safe harbor must be specific post-Janus Capital; non-GAAP adjustments must be stable QoQ.',
  },
  'Conference Talk Abstract / Keynote Outline': {
    notFor: 'Attendees looking for a tutorial — abstracts sell the talk, they don\'t teach the content.',
  },
  'Newsletter / Serialized Blog (Substack, Beehiiv)': {
    notFor: 'One-time readers looking for a definitive reference; newsletters are serialized artifacts graded on consistency over years.',
  },
  'Patient-Facing Health Information': {
    notFor: 'Healthcare professionals looking for clinical guidelines; patient-facing materials are for patients and caregivers at ≤8th-grade reading level.',
  },
  'Clinical Research Summary / Abstract': {
    notFor: 'Patients looking for treatment guidance; clinical abstracts are for researchers, reviewers, and clinicians evaluating evidence.',
  },
  'Contract / NDA / TOS User-Facing Terms': {
    notFor: 'Legal scholars analyzing doctrine; these are consumer-facing contracts evaluated for comprehension and enforceability.',
    marketAssumptions: 'FTC click-to-cancel rule in effect; GDPR/state privacy laws require granular consent; FK grade ≤8 is consumer-facing floor.',
  },
  'Legal Brief / Motion / Persuasive Memo': {
    notFor: 'Lay readers looking for a summary; legal briefs are for judges, clerks, and opposing counsel.',
  },
  'Policy Memo / White Paper / Regulatory Comment Letter': {
    notFor: 'General public looking for an explainer; policy memos are for decision-makers and regulatory bodies.',
    marketAssumptions: 'Post-Loper Bright (2024) deference regime; Circular A-4 2023 revision in effect; Plain Writing Act applies to federal agencies.',
  },
  'Legislative Testimony / Op-Ed for Advocacy': {
    notFor: 'Neutral readers looking for balanced analysis; testimony and op-eds are advocacy artifacts with a single ask.',
  },
  'Academic Paper Draft (Introduction & Discussion)': {
    notFor: 'General readers looking for an accessible summary; academic papers are for peer reviewers, editors, and field researchers.',
  },
  'Grant Proposal (NIH, NSF, Foundation)': {
    notFor: 'General readers or media; grant proposals are for study-section reviewers, program officers, and grants administrators.',
  },
  'Curriculum / Lesson Plan (K-12 and Higher Ed)': {
    notFor: 'Students looking for learning materials; lesson plans are for teachers, instructional designers, and curriculum coordinators.',
  },
  'Educational Explainer (Khan Academy / 3Blue1Brown style)': {
    notFor: 'Experts looking for a reference; explainers are for learners encountering the topic for the first time.',
  },
  'Code review (any language)': {
    notFor: 'Non-technical stakeholders evaluating business impact; code review is for engineers evaluating design, correctness, security, and operability.',
  },
};

const lines = content.split('\n');
const output = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  output.push(line);

  // Match H2 headers (## Title)
  const h2Match = line.match(/^## (.+)$/);
  if (h2Match) {
    const title = h2Match[1].trim();
    const meta = panelMeta[title];
    if (meta) {
      // Find the Believer/skeptic pairing line (or the first numbered persona)
      // Insert metadata BEFORE the Believer/skeptic pairing line
      // We need to look ahead to find where to insert
      // Actually, let's insert right after the description paragraph(s), before the pairing line
      // Strategy: collect lines until we hit the pairing line, then insert
      let j = i + 1;
      // Skip blank lines and description text until we hit Believer/skeptic pairing
      while (j < lines.length && !lines[j].startsWith('**Believer/skeptic pairing')) {
        output.push(lines[j]);
        j++;
      }
      // Now insert metadata before the pairing line
      output.push('');
      output.push(`**Last validated:** 2026-04-15`);
      output.push(`**Not for:** ${meta.notFor}`);
      if (meta.marketAssumptions) {
        output.push(`**market_assumptions:** ${meta.marketAssumptions}`);
      }
      output.push('');
      // Continue from j (the pairing line)
      i = j - 1; // -1 because the for loop will i++
    }
  }
}

fs.writeFileSync(libraryPath, output.join('\n'), 'utf-8');

const finalContent = fs.readFileSync(libraryPath, 'utf-8');
console.log(`Not for: ${(finalContent.match(/\*\*Not for:\*\*/g) || []).length}`);
console.log(`Last validated: ${(finalContent.match(/\*\*Last validated:\*\*/g) || []).length}`);
console.log(`market_assumptions: ${(finalContent.match(/\*\*market_assumptions:\*\*/g) || []).length}`);
console.log(`Total lines: ${finalContent.split('\n').length}`);
