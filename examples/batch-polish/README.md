# Batch polish example

This walks through polishing a directory of markdown files as a single tumble-dry batch run. Assumes tumble-dry is installed as a Claude Code plugin (see the top-level README for other install paths).

## Setup

```
mkdir -p site/copy
cat > site/copy/home.md <<'EOF'
# Welcome

We help small teams ship better software faster. Our AI-native platform reduces cycle time by 3x.
EOF

cat > site/copy/pricing.md <<'EOF'
# Pricing

$49/user/month. Cancel any time.
EOF

cat > site/copy/about.md <<'EOF'
# About

We're a team of engineers who believe software should be well-reviewed before it ships.
EOF
```

## Preview cost

```
/tumble-dry "site/copy/*.md" --dry-run
```

Emits:

```
## Estimated cost

- Reviewer model: sonnet ($3/M input, $15/M output)
- Editor model: opus ($15/M input, $75/M output)
- Rounds (expected / max): 3 / 4
- Per-round cost: $0.48
- Round-1 setup (audience + auditor): $0.21
- Total expected: $1.65
```

## Run the batch

```
/tumble-dry "site/copy/*.md"
```

What happens:

1. Slash command resolves the glob to 3 files, dispatches the orchestrator.
2. Orchestrator runs ONE audience-inferrer call against a concatenation of the 3 files' first ~500 chars (shared panel).
3. Per-file: one assumption-auditor Task, then parallel reviewer wave (panel × 3 files = N parallel Task calls in one assistant turn).
4. Per-file aggregate + editor redraft + drift check.
5. Converged files drop out of later waves; unconverged files continue.
6. Final shared `polish-log.md` at the batch root summarizes all files.

## Output layout

```
.tumble-dry/
  site-copy-20260415-1430/
    batch.json
    status.json
    REPORT.md                    # final rolled-up report
    polish-log.md                # shared, summarizes all files
    home/
      working.md
      FINAL.md
      round-1/REPORT.md
      round-1/aggregate.md
      round-2/REPORT.md
      ...
    pricing/
      working.md
      FINAL.md
      ...
    about/
      ...
```

## Per-round REPORT.md

Per-round reports are capped at ~1KB each:

```
# Round 1 Report — home

Round 1 surfaced 2 material finding(s) across 5 reviewers on home. Minor: 4. Structural: 0. Drift: 0.12.

## Top material findings

1. "3x cycle time" is an unsubstantiated claim — reviewers flagged as material.
2. "AI-native" is a buzzword with no supporting evidence.
3. Missing a concrete CTA or next step.

## Drift

- Content drift: 0.12
- Structural drift: 0.02
- Converged: no
```

Main session only reads the final `REPORT.md`, not the per-round ones. Those live on disk for debugging.

## Resume if killed

If you Ctrl-C or kill Claude Code mid-run:

```
/tumble-dry status

slug                                     kind    round  converged  material  last_updated           orphan
----------------------------------------------------------------------------------------------------
site-copy-20260415-1430                  batch   2      no         5         2026-04-15T14:42:11Z   ORPHAN
```

Then:

```
/tumble-dry resume site-copy-20260415-1430
```

The slash command reads the last `status.json`, detects the phase, and re-dispatches the orchestrator from the right point. Partial rounds (some critiques on disk, no aggregate) finish their round before the next wave decides what to do.
