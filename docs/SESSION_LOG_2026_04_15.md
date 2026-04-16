# Session Log: tumble-dry v0.4.2 → v0.9.1

**Date:** 2026-04-15
**Duration:** Single session, ~4 hours
**Author:** Paul Logan + Claude Opus 4.6 (1M context)
**Starting version:** v0.4.2 (gastown just ripped, voice self-defaults, code in scope)
**Ending version:** v0.9.1 (harness-only, psychographically validated persona library)

---

## What happened

This session took tumble-dry from a half-built plugin with an API-key dependency to a production-grade Claude Code tool with a research-validated persona library. 7 releases shipped. 3 architectural reversals documented honestly. 1 PM field report that killed an assumption.

### Releases shipped

| Version | Codename | What shipped |
|---------|----------|--------------|
| v0.4.2 | — | Gastown ripped, voice self-defaults to source, code in scope |
| v0.5.0 | DISPATCH | Claude Code-native dispatch via parallel Task subagents (no API key) |
| v0.5.1 | PERSONA | 40 artifact-type panels + runbook + configs.json |
| v0.5.1.5 | CORE-HARDEN | Voice-drift gate blocks convergence, bigram-Dice dedup, round-N seeding |
| v0.5.2 | FORMAT | Office format ingestion (.docx/.pptx/.xlsx/.pdf) via mammoth+officeparser+unpdf |
| v0.6.0 | CODE | Language detection, web-tree-sitter AST drift, style anchors, verify_cmd gate |
| v0.7.0 | ROUNDTRIP | Opt-in office-format regeneration (docx/pptx/xlsx writers + LOSSY_REPORT.md) |
| v0.8.0 | UX REBUILD | Headless orchestrator, batch input, status/resume, --dry-run, zero-config canary |
| v0.9.0 | HARNESS-ONLY | Excised all API key logic; plain Agent(prompt=...) dispatch; install.sh |
| v0.9.1 | PERSONA AUDIT | 9 fixes from psychographic + design thinking + LLM-as-critic research |

### Architectural reversals (honest record-keeping)

**Reversal 1: Gastown → API dispatch (v0.4.2)**
- Original: gastown polecat backend (each agent in its own tmux session).
- Why reversed: slow, fragile, required infrastructure most users don't have.
- New: direct Anthropic API dispatch with prompt caching.

**Reversal 2: API dispatch → Claude Code Task subagents (v0.5.0)**
- Original: API key required, custom dispatch-api.cjs with https module.
- Why reversed: user wanted zero-setup from inside Claude Code.
- New: Agent(subagent_type=...) calls via Claude Code session auth.

**Reversal 3: Slash command as orchestrator → headless orchestrator subagent (v0.8.0)**
- Original (ARCHITECTURE.md Q1): "slash command IS the orchestrator (NOT a subagent)" — for visibility.
- Why reversed: real PM dogfood proved main-session visibility = 400KB+ of Task-dispatch noise nobody reads.
- New: orchestrator runs in its own subagent context; main session sees only status.json + REPORT.md.
- Documented in ARCHITECTURE.md addendum.

**Reversal 4: Custom subagent_type → plain Agent(prompt=...) (v0.9.0)**
- Original: Agent(subagent_type="reviewer") etc. relying on .claude-plugin/ discovery.
- Why reversed: 6-session field report proved CC doesn't auto-discover plugins from arbitrary dirs. Custom subagent_type names never registered. Product was bricked.
- New: Agent system prompts read from disk at dispatch time, embedded in Agent(prompt=...). No plugin registry dependency.
- .claude-plugin/ directory deleted entirely. install.sh symlinks command to ~/.claude/commands/.

### Research conducted

| File | Words | Focus |
|------|-------|-------|
| research/business-finance.md | ~4,200 | 10 biz/finance artifact types, 50 sources |
| research/product-engineering.md | ~3,200 | 10 product/eng types, 35 sources |
| research/marketing-comms.md | ~6,200 | 10 marketing/comms types |
| research/domain-specific.md | ~4,200 | 5 domains × 2 types = 10 types |
| .planning/research/STACK.md | ~3,000 | CC plugin spec, office libs, tree-sitter |
| .planning/research/FEATURES.md | ~3,500 | Table-stakes vs differentiators vs anti-features |
| .planning/research/ARCHITECTURE.md | ~4,500 | Component boundaries, data flow, build order |
| .planning/research/PITFALLS.md | ~7,500 | 20 pitfalls across DISPATCH/FORMAT/CODE/domain |
| .planning/research/SUMMARY.md | ~2,500 | Synthesis + REQUIREMENTS deltas |
| research/psychographic-audit.md | ~3,800 | OCEAN, cognitive bias, Kahneman adversarial collab |
| research/design-thinking-audit.md | ~3,500 | Cooper personas, JTBD, IDEO empathy, inclusive design |
| research/llm-critic-literature.md | ~4,800 | Multi-agent debate, sycophancy, persona fidelity |
| **Total** | **~51,000** | |

### Key decisions (non-obvious, worth remembering)

1. **Filesystem is IPC.** Parallel subagents coordinate via .tumble-dry/<slug>/round-N/ file writes, not message passing. This is the single most important architectural decision — it makes every dispatch path isomorphic and lets the aggregator be a pure data-plane function.

2. **Brief-as-prompt.** Every subagent receives its entire task context via a generated brief file. No subagent reads from a database, cache, or another subagent's memory. Stateless and re-dispatchable.

3. **Convergence ≠ material count.** Original: converged when material findings ≤ N. Research-validated: converged when believer+skeptic agree AND findings are genuinely novel (not paraphrased). Stale-round detection flags fatigue-driven convergence.

4. **Voice self-sampling.** When no voice_refs configured, sample the source artifact itself. Editor's job becomes "preserve what's already there" not "match an external corpus." Most users polish one doc with no past corpus — this is the 90% case.

5. **STRUCTURAL: prefix.** Reviewers flag premise-level problems (not just surface rewrites). Aggregator auto-promotes findings that persist ≥2 rounds. No prior system does this — confirmed by LLM-as-critic literature review.

6. **Championing trigger.** Personas need to say what's GOOD, not just what's broken. Critique-only panels miss the gain quadrant. Every persona now has both a bounce trigger (pain) and a championing trigger (gain).

7. **Source files are NEVER modified.** Non-negotiable invariant from day 1. working.md is the live copy; history/ preserves every intermediate state; source.path records provenance.

8. **Plugin discovery is broken in Claude Code.** .claude-plugin/ manifests are valid but CC never reads them. Custom subagent_type registration via marketplace.json is DOA. The working install path is: symlink command file to ~/.claude/commands/. Agent system prompts embedded inline in Agent(prompt=...).

### Artifacts produced

```
tumble-dry/
  agents/                    5 agent specs (audience-inferrer, assumption-auditor, reviewer, editor, editor-code, orchestrator)
  bin/                       tumble-dry.cjs (data-plane CLI, 11+ subcommands), tumble-dry-loop.cjs (redirect notice)
  commands/                  tumble-dry.md (slash command, ~115 lines, plain Agent() dispatch)
  lib/                       aggregator, voice, run-state, reviewer-brief, config, loader, status, report, pricing, canary, glob-expand, trace-retention
  lib/loaders/               markdown, docx, pptx, xlsx, pdf, pandoc, code
  lib/writers/               docx, pptx, xlsx, lossy-report, index
  lib/code/                  detect-language, ast-drift, style-anchors/{python,go,rust,javascript,default,index}
  personas/                  library.md (2258 lines, 246 personas), runbook.md (244 lines), configs.json (322 lines)
  research/                  7 domain research files + 3 validation audits (~51k words total)
  docs/                      adversarial-review-process.md, this session log
  examples/                  dogfood-2026-04-14/, office-format/, code/, batch-polish/
  tests/                     9 test suites, 106+ assertions
  .planning/                 PROJECT.md, 3 archived milestone sets, 9 phase directories with CONTEXT + SUMMARY each
  install.sh                 One-line Claude Code command install
```

### Test coverage

| Suite | Assertions | Focus |
|-------|------------|-------|
| harden.test.cjs | 15 | Drift split, dedup, brief seeding, retention, gitignore |
| format.test.cjs | 15 | Loader dispatch, typed-result contract, encoding |
| code.test.cjs | 19 | Language detection, AST drift, style anchors, editor-code spec |
| roundtrip.test.cjs | 17 | docx/pptx/xlsx writers + PDF guard rail |
| headless.test.cjs | 10 | Orchestrator agent, status.json, report.md |
| batch.test.cjs | 9 | initBatch, shared audience, per-file subdirs |
| canary.test.cjs | 7 | Git voice inference, fallback, config init |
| dryrun.test.cjs | 6 | Cost estimate, dry-run exit |
| harness.test.cjs | 11 | Verify no API key refs anywhere in codebase |

### What's next

- **v0.10 candidates:** MULTI-LLM (OpenAI/Gemini/local), cross-file finding dedup, live Skill-menu verification, empirical validation (human expert review of 10-20 converged artifacts per LLM-as-critic literature recommendation).
- **VOICE-FT-01:** awaiting user's separate Qwen3-32B fine-tuning corpus project.
- **Anti-features (do NOT build):** Web UI / SaaS, real-user testing integration (tumble-dry simulates, never substitutes), lossless office roundtrip, Grammarly-style rules engine, group-chat debate (AutoGen-style), inline diff-accept UX (Cursor-style).

---

*Written for an audience of "future-me who has forgotten everything about this project."*
*Session artifacts: 7 GitHub releases (v0.4.2→v0.9.1), ~51k words of research, 106+ tests, 3 architectural reversals.*
