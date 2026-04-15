---
phase: 01-dispatch-v0-5-0
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - agents/audience-inferrer.md
  - agents/assumption-auditor.md
  - agents/reviewer.md
  - agents/editor.md
autonomous: true
requirements: [DISPATCH-03]
must_haves:
  truths:
    - "All four agent frontmatter `name` fields drop the `tumble-dry-` prefix (namespace auto-prefixes per CC plugin spec)"
    - "Each agent declares `model:` per dispatch-api.cjs convention (audience-inferrer + editor = opus; reviewer + assumption-auditor = sonnet)"
    - "Each agent declares `tools:` minimally: read-only agents get `Read`; editor gets `Read, Write`"
    - "No agent declares `hooks`, `mcpServers`, or `permissionMode` (silently stripped by loader; remove if present)"
    - "Each agent declares `maxTurns:` (3 for reviewer/auditor/audience-inferrer; 5 for editor) per STACK.md guidance"
  artifacts:
    - path: "agents/audience-inferrer.md"
      provides: "Subagent: panel design (one-shot per artifact)"
      contains: "name: audience-inferrer"
    - path: "agents/assumption-auditor.md"
      provides: "Subagent: load-bearing assumption surfacing"
      contains: "name: assumption-auditor"
    - path: "agents/reviewer.md"
      provides: "Subagent: per-persona critique (fanned out N-wide per round)"
      contains: "name: reviewer"
    - path: "agents/editor.md"
      provides: "Subagent: voice-preserving redraft"
      contains: "name: editor"
  key_links:
    - from: "agents/*.md frontmatter `name`"
      to: ".claude-plugin/marketplace.json agents[].name"
      via: "string equality (validated by Plan 03)"
      pattern: "name:\\s*(audience-inferrer|assumption-auditor|reviewer|editor)"
---

<objective>
Migrate all four agent frontmatter blocks to current Claude Code plugin-shipped subagent spec: drop the wrong `tumble-dry-` prefix from `name` (namespace auto-prefixes — current naming produces double-prefix `tumble-dry:tumble-dry-audience-inferrer`), add `model`/`tools`/`maxTurns`, and ensure no forbidden frontmatter fields (`hooks`, `mcpServers`, `permissionMode`) are present.

Purpose: Without this fix, slash-command Task fanout will silently invoke a generic helpful-LLM with no persona context (Pitfall 2 — "subagent spec drift" → false convergence on homogeneous panel).
Output: All four `agents/*.md` files have spec-compliant frontmatter; agent body content is unchanged.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/research/STACK.md
@.planning/research/PITFALLS.md
@.planning/phases/01-dispatch-v0-5-0/01-CONTEXT.md
@agents/audience-inferrer.md
@agents/assumption-auditor.md
@agents/reviewer.md
@agents/editor.md

<interfaces>
Per STACK.md §Concrete Fix List for Current Repo, target frontmatter for each agent:

- `audience-inferrer`: `model: opus`, `tools: Read, Write`, `maxTurns: 3`
- `assumption-auditor`: `model: sonnet`, `tools: Read, Write`, `maxTurns: 3`
- `reviewer`:           `model: sonnet`, `tools: Read, Write`, `maxTurns: 3`
- `editor`:             `model: opus`, `tools: Read, Write`, `maxTurns: 5`

(STACK.md notes "agents return markdown text" — but tumble-dry's existing convention is "subagent writes target file from brief" per ARCHITECTURE.md §1 Q2 fan-in invariant. Therefore Write IS required on all four. Override STACK.md's read-only suggestion for tumble-dry's filesystem-IPC architecture.)

Forbidden fields per STACK.md (silently stripped by loader for plugin-shipped agents): `hooks`, `mcpServers`, `permissionMode`. Verify none of the current agents have these (they don't, but enforce in this migration).

Allowed plugin-agent fields: `name`, `description`, `model`, `tools`, `disallowedTools`, `maxTurns`, `skills`, `isolation`, `color`.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rewrite frontmatter for all four agents</name>
  <files>agents/audience-inferrer.md, agents/assumption-auditor.md, agents/reviewer.md, agents/editor.md</files>
  <read_first>
    - agents/audience-inferrer.md (current frontmatter at lines 1-4)
    - agents/assumption-auditor.md (current frontmatter at lines 1-4)
    - agents/reviewer.md (current frontmatter at lines 1-4)
    - agents/editor.md (current frontmatter at lines 1-4)
    - .planning/research/STACK.md §Dimension 1 + §Concrete Fix List
  </read_first>
  <action>
    For each of the four files, replace ONLY the YAML frontmatter block (the lines between the two `---` delimiters at the top of the file). Leave the rest of the file content (markdown body, headers, examples) byte-for-byte unchanged.

    **agents/audience-inferrer.md** — new frontmatter:
    ```yaml
    ---
    name: audience-inferrer
    description: Read an artifact and propose a panel of 3–6 distinct reviewer personas tailored to its apparent audience and purpose.
    model: opus
    tools: Read, Write
    maxTurns: 3
    ---
    ```

    **agents/assumption-auditor.md** — new frontmatter:
    ```yaml
    ---
    name: assumption-auditor
    description: Extract the load-bearing assumptions and implicit premises the artifact makes about its reader, context, and subject. Output an audit the reviewers can stress-test.
    model: sonnet
    tools: Read, Write
    maxTurns: 3
    ---
    ```

    **agents/reviewer.md** — new frontmatter:
    ```yaml
    ---
    name: reviewer
    description: Critique an artifact through one assigned persona's lens. Tag each finding with severity. Do not rewrite — critique only.
    model: sonnet
    tools: Read, Write
    maxTurns: 3
    ---
    ```

    **agents/editor.md** — new frontmatter:
    ```yaml
    ---
    name: editor
    description: Redraft the artifact addressing aggregated material and minor findings, constrained by the author's voice samples. Flag any rewrite that would flatten voice rather than execute it.
    model: opus
    tools: Read, Write
    maxTurns: 5
    ---
    ```

    Critical constraints:
    - The `description` strings above are the EXACT current descriptions — preserve them verbatim (do not rewrite for brevity).
    - Do NOT add `hooks`, `mcpServers`, or `permissionMode` keys.
    - Do NOT modify any line below the closing `---` of the frontmatter block.
    - The first line of each file must be `---`; the closing `---` ends the frontmatter; the next non-blank line must be `# {Agent Name}` heading already present.
  </action>
  <verify>
    <automated>node -e "
    const fs=require('fs');
    const expect={
      'agents/audience-inferrer.md':{name:'audience-inferrer',model:'opus',maxTurns:'3'},
      'agents/assumption-auditor.md':{name:'assumption-auditor',model:'sonnet',maxTurns:'3'},
      'agents/reviewer.md':{name:'reviewer',model:'sonnet',maxTurns:'3'},
      'agents/editor.md':{name:'editor',model:'opus',maxTurns:'5'}
    };
    let fail=0;
    for(const [f,e] of Object.entries(expect)){
      const t=fs.readFileSync(f,'utf-8');
      const m=t.match(/^---\n([\s\S]*?)\n---/);
      if(!m){console.error(f,'no frontmatter');fail++;continue;}
      const fm=m[1];
      if(!new RegExp('^name:\\\\s*'+e.name+'$','m').test(fm)){console.error(f,'bad name');fail++;}
      if(/^name:\s*tumble-dry-/m.test(fm)){console.error(f,'still has tumble-dry- prefix');fail++;}
      if(!new RegExp('^model:\\\\s*'+e.model+'$','m').test(fm)){console.error(f,'bad model');fail++;}
      if(!new RegExp('^maxTurns:\\\\s*'+e.maxTurns+'$','m').test(fm)){console.error(f,'bad maxTurns');fail++;}
      if(!/^tools:\s*Read,\s*Write$/m.test(fm)){console.error(f,'bad tools');fail++;}
      if(/^(hooks|mcpServers|permissionMode):/m.test(fm)){console.error(f,'forbidden field');fail++;}
    }
    process.exit(fail);
    "</automated>
  </verify>
  <acceptance_criteria>
    - All four agents have `name` without `tumble-dry-` prefix (grep `^name: tumble-dry-` returns 0 hits across agents/*.md)
    - All four agents have `model:` field with the value above (grep verifiable)
    - All four agents have `tools: Read, Write` (grep verifiable)
    - All four agents have `maxTurns:` field with the integer above (grep verifiable)
    - No agent contains `hooks:`, `mcpServers:`, or `permissionMode:` keys (grep returns 0 hits)
    - Body content of each agent (everything after the closing `---`) is unchanged byte-for-byte from current state (verifiable via `git diff agents/*.md` showing only frontmatter block delta)
  </acceptance_criteria>
  <done>All four agent frontmatters compliant with current CC plugin-shipped subagent spec; bodies unchanged; ready for Plan 03 validator to cross-check against marketplace.json (which already has stripped names from Plan 01).</done>
</task>

</tasks>

<verification>
- `grep -l "name: tumble-dry-" agents/*.md` returns nothing
- `grep -c "^model:" agents/*.md` returns 1 per file (4 total)
- `grep -E "^(hooks|mcpServers|permissionMode):" agents/*.md` returns nothing
- `git diff --stat agents/` shows only 4 files changed, low line counts (frontmatter-only delta)
</verification>

<success_criteria>
Frontmatter is on the current spec; agent names match what `.claude-plugin/marketplace.json` already declares (Plan 01 wrote `audience-inferrer` etc., not `tumble-dry-audience-inferrer`). Plan 03 validator will assert this equality.
</success_criteria>

<output>
After completion, create `.planning/phases/01-dispatch-v0-5-0/01-02-SUMMARY.md`
</output>
