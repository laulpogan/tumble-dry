---
phase: 01-dispatch-v0-5-0
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .claude-plugin/marketplace.json
  - .claude-plugin/plugin.json
  - marketplace.json
autonomous: true
requirements: [DISPATCH-04]
must_haves:
  truths:
    - ".claude-plugin/marketplace.json exists at the canonical path per current Claude Code plugin spec"
    - ".claude-plugin/plugin.json exists declaring the plugin name, version, description, author, license"
    - "Old root marketplace.json no longer exists (single source of truth for catalog metadata)"
    - "git mv preserves history of marketplace.json move"
  artifacts:
    - path: ".claude-plugin/marketplace.json"
      provides: "Marketplace catalog entry — lists agents and command paths under tumble-dry plugin"
      contains: "tumble-dry"
    - path: ".claude-plugin/plugin.json"
      provides: "Plugin manifest declaring tumble-dry plugin to Claude Code loader"
      contains: "\"name\": \"tumble-dry\""
  key_links:
    - from: ".claude-plugin/marketplace.json"
      to: "agents/*.md"
      via: "agent path entries"
      pattern: "agents/(audience-inferrer|assumption-auditor|reviewer|editor)\\.md"
    - from: ".claude-plugin/marketplace.json"
      to: "commands/tumble-dry.md"
      via: "command path entry"
      pattern: "commands/tumble-dry\\.md"
---

<objective>
Bring tumble-dry into Claude Code plugin spec compliance by relocating marketplace.json into the canonical `.claude-plugin/` directory and creating the missing `.claude-plugin/plugin.json` manifest.

Purpose: Without `.claude-plugin/plugin.json` the plugin cannot be installed via direct `--plugin-dir` (only via the SlanchaAi marketplace which masks the bug). Root-level `marketplace.json` is non-spec.
Output: `.claude-plugin/{plugin.json, marketplace.json}` exist; root `marketplace.json` removed.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/01-dispatch-v0-5-0/01-CONTEXT.md
@.planning/research/STACK.md
@marketplace.json

<interfaces>
Current root marketplace.json structure (to be moved verbatim into .claude-plugin/marketplace.json):
```json
{
  "name": "tumble-dry",
  "version": "0.4.2",
  "description": "...",
  "author": "Paul Logan",
  "commands": [{ "name": "tumble-dry", "path": "commands/tumble-dry.md" }],
  "agents": [
    { "name": "audience-inferrer",  "path": "agents/audience-inferrer.md" },
    { "name": "assumption-auditor", "path": "agents/assumption-auditor.md" },
    { "name": "reviewer",           "path": "agents/reviewer.md" },
    { "name": "editor",             "path": "agents/editor.md" }
  ]
}
```

Required `.claude-plugin/plugin.json` shape per STACK.md:
```json
{
  "name": "tumble-dry",
  "version": "0.5.0",
  "description": "Polish written work through simulated public contact",
  "author": { "name": "Paul Logan" },
  "homepage": "https://github.com/laulpogan/tumble-dry",
  "license": "MIT"
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Relocate marketplace.json and create plugin.json</name>
  <files>.claude-plugin/marketplace.json, .claude-plugin/plugin.json, marketplace.json</files>
  <read_first>
    - marketplace.json (current root file — exact contents to migrate)
    - .planning/research/STACK.md (§Concrete Fix List for Current Repo for plugin.json shape)
    - VERSION (if exists, to source version string)
  </read_first>
  <action>
    1. Create the `.claude-plugin/` directory: `mkdir -p .claude-plugin`
    2. Move existing marketplace.json with git history preservation: `git mv marketplace.json .claude-plugin/marketplace.json`
    3. Bump the `version` field in `.claude-plugin/marketplace.json` from `0.4.2` to `0.5.0` (this phase ships v0.5.0). Leave all other fields (commands[], agents[]) verbatim.
    4. Create `.claude-plugin/plugin.json` with EXACTLY this content (per STACK.md §Concrete Fix List):
       ```json
       {
         "name": "tumble-dry",
         "version": "0.5.0",
         "description": "Polish written work through simulated public contact",
         "author": { "name": "Paul Logan" },
         "homepage": "https://github.com/laulpogan/tumble-dry",
         "license": "MIT"
       }
       ```
    5. Verify root marketplace.json no longer exists: `test ! -f marketplace.json`.
    6. Verify both new files are valid JSON: `node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json'))" && node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/marketplace.json'))"`.
  </action>
  <verify>
    <automated>test -f .claude-plugin/plugin.json && test -f .claude-plugin/marketplace.json && test ! -f marketplace.json && node -e "const p=JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json'));const m=JSON.parse(require('fs').readFileSync('.claude-plugin/marketplace.json'));if(p.name!=='tumble-dry')process.exit(1);if(p.version!=='0.5.0')process.exit(2);if(!Array.isArray(m.agents)||m.agents.length!==4)process.exit(3);if(m.version!=='0.5.0')process.exit(4);"</automated>
  </verify>
  <acceptance_criteria>
    - `.claude-plugin/plugin.json` exists, valid JSON, name=tumble-dry, version=0.5.0
    - `.claude-plugin/marketplace.json` exists, valid JSON, contains 4 agents and 1 command, version=0.5.0
    - Root `marketplace.json` does NOT exist
    - `git log --follow .claude-plugin/marketplace.json` shows pre-move history (move was via `git mv`)
  </acceptance_criteria>
  <done>Plugin manifest at `.claude-plugin/plugin.json`; catalog at `.claude-plugin/marketplace.json`; old root file removed; git history preserved.</done>
</task>

</tasks>

<verification>
- `ls -la .claude-plugin/` shows `plugin.json` and `marketplace.json`
- `ls marketplace.json` returns "No such file"
- `cat .claude-plugin/plugin.json | jq .name` → `"tumble-dry"`
- `cat .claude-plugin/marketplace.json | jq '.agents | length'` → `4`
</verification>

<success_criteria>
Plugin spec compliance achieved per Claude Code plugins-reference. Plan 03 (validator) can now assert the canonical paths exist; future direct-install consumers of the plugin will see `.claude-plugin/plugin.json` and register the plugin correctly.
</success_criteria>

<output>
After completion, create `.planning/phases/01-dispatch-v0-5-0/01-01-SUMMARY.md`
</output>
