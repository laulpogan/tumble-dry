# tumble-dry

**Polish content through simulated public contact.** Parallel reviewer personas critique in-character, an assumption auditor surfaces hidden premises, a voice-preserving editor redrafts, and the loop runs until reviewers converge.

Works on docs, copy, ads, blogs, markdown decks, financial models, pitch decks, strategy memos.

---

## Install

### As a Claude Code plugin

```bash
git clone https://github.com/laulpogan/tumble-dry.git ~/Source/tumble-dry
ln -s ~/Source/tumble-dry ~/.claude/plugins/tumble-dry
```

Then in any project:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
cat > .tumble-dry.yml <<'EOF'
voice_refs: [ ~/Source/my-past-writing ]
panel_size: 5
convergence_threshold: 2
max_rounds: 10
EOF

node ~/.claude/plugins/tumble-dry/tumble-dry/bin/tumble-dry-loop.cjs post.md
```

### As a CLI tool (no plugin)

```bash
git clone https://github.com/laulpogan/tumble-dry.git
~/tumble-dry/tumble-dry/bin/tumble-dry-loop.cjs post.md
```

### From another repo (git submodule)

```bash
cd my-other-project
git submodule add https://github.com/laulpogan/tumble-dry.git tools/tumble-dry
node tools/tumble-dry/tumble-dry/bin/tumble-dry-loop.cjs post.md
```

---

## What's in this repo

```
tumble-dry/      ← the plugin itself (agents, commands, CLI, lib)
  README.md      ← full feature docs, configuration, output layout
  agents/        ← audience-inferrer, assumption-auditor, reviewer, editor
  commands/      ← /tumble-dry slash command
  bin/           ← tumble-dry CLI + tumble-dry-loop autonomous driver
  lib/           ← aggregator, voice sampler, dispatch backends
  marketplace.json

docs/            ← supporting docs (adversarial review methodology, etc.)
examples/        ← end-to-end runs on real artifacts
```

**Read [`tumble-dry/README.md`](tumble-dry/README.md) for the full feature reference, configuration, and CLI reference.**

---

## Status

v0.4.0 — Non-destructive: source files are never modified; per-round history snapshots + full reasoning traces (request, response, extended thinking) saved to `.tumble-dry/<slug>/`. Built on v0.3.0's persona libraries + structural-finding detection and v0.2.0's API-first convergence loop with prompt caching.

## License

MIT — see [LICENSE](LICENSE).
