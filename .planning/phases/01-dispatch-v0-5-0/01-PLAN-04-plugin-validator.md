---
phase: 01-dispatch-v0-5-0
plan: 04
type: execute
wave: 2
depends_on: ["01-PLAN-01-plugin-spec-compliance", "01-PLAN-02-agent-frontmatter-migration"]
files_modified:
  - bin/validate-plugin.cjs
  - tests/validate-plugin.test.cjs
autonomous: true
requirements: [DISPATCH-02]
must_haves:
  truths:
    - "bin/validate-plugin.cjs exists and is executable as a Node CLI"
    - "Validator exits 0 on the current (post-Plan-01/02) repo state"
    - "Validator exits non-zero with a clear message if .claude-plugin/plugin.json is missing"
    - "Validator exits non-zero if .claude-plugin/marketplace.json is missing"
    - "Validator exits non-zero if any agents/*.md frontmatter `name` does not appear in marketplace.json agents[]"
    - "Validator exits non-zero if any agents/*.md frontmatter contains `hooks`, `mcpServers`, or `permissionMode`"
    - "Validator exits non-zero if any agents/*.md frontmatter `name` retains the `tumble-dry-` prefix"
    - "Validator can be invoked via `node bin/validate-plugin.cjs` and is intended for CI gating"
  artifacts:
    - path: "bin/validate-plugin.cjs"
      provides: "CI-gated plugin-spec validator — checks paths, frontmatter, name parity, forbidden fields"
      min_lines: 80
      contains: "marketplace.json"
    - path: "tests/validate-plugin.test.cjs"
      provides: "Smoke tests proving validator catches each failure mode"
      min_lines: 40
  key_links:
    - from: "bin/validate-plugin.cjs"
      to: ".claude-plugin/marketplace.json + agents/*.md"
      via: "fs.readFile + YAML frontmatter parse"
      pattern: "(marketplace\\.json|agents/.*\\.md)"
    - from: "tests/validate-plugin.test.cjs"
      to: "bin/validate-plugin.cjs"
      via: "child_process spawn with manipulated fixtures"
      pattern: "execFile.*validate-plugin"
---

<objective>
Build the CI-gated plugin validator (`bin/validate-plugin.cjs`) per DISPATCH-02. Cross-checks `.claude-plugin/{plugin.json, marketplace.json}` existence + agent-name parity between marketplace catalog and `agents/*.md` frontmatter + absence of forbidden frontmatter fields + absence of obsolete `tumble-dry-` prefix.

Purpose: Without this validator, agent-spec drift between marketplace.json and frontmatter (Pitfall 2) becomes a silent failure mode — slash command spawns generic helpful-LLM with no persona context, panel collapses to homogeneous critique, false convergence ensues. Validator must be runnable in CI and locally.
Output: `bin/validate-plugin.cjs` (executable Node script) + `tests/validate-plugin.test.cjs` (proves validator catches each failure mode). On the current repo state (Plans 01 and 02 complete), validator exits 0.
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
@.planning/phases/01-dispatch-v0-5-0/01-01-SUMMARY.md
@.planning/phases/01-dispatch-v0-5-0/01-02-SUMMARY.md
@bin/tumble-dry-loop.cjs

<interfaces>
Project conventions (from existing code):
- Pure Node.js, CJS (`require`), no `package.json`, no third-party deps allowed in this phase.
- File header docstring matching style of bin/tumble-dry-loop.cjs.
- Logging via `console.error` (stdout reserved for machine-readable output if any).
- Exit codes: 0 = pass, 1 = validation failure(s), 2 = unexpected error.

Frontmatter parser: must NOT add a YAML dep. Implement minimal line-based parser: split file on `\n`, find lines between leading `---` and next `---`, parse `key: value` pairs. Sufficient because tumble-dry frontmatter is flat (no nesting, no multiline values).

Forbidden frontmatter fields per STACK.md §Concrete Fix List + §What NOT to use: `hooks`, `mcpServers`, `permissionMode`.

Required parity rule: every entry in `marketplace.json#/agents` must have a matching `agents/<name>.md` file whose frontmatter `name:` equals the marketplace `name`. Conversely, every `agents/*.md` whose frontmatter declares a `name:` must appear in `marketplace.json#/agents` (catches orphan agents).

Test isolation: tests must NOT mutate the real `.claude-plugin/` or `agents/`. Use `os.tmpdir()` + a fixture copy per test case.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Implement bin/validate-plugin.cjs</name>
  <files>bin/validate-plugin.cjs</files>
  <read_first>
    - bin/tumble-dry-loop.cjs (style reference: docstring shape, console.error logging idiom, exit-code convention)
    - .claude-plugin/marketplace.json (current shape — Plan 01 just wrote this)
    - agents/audience-inferrer.md (current frontmatter — Plan 02 just wrote this)
    - .planning/research/STACK.md §Concrete Fix List (forbidden fields list)
  </read_first>
  <action>
    Create `bin/validate-plugin.cjs` as a Node CJS script with shebang `#!/usr/bin/env node`. Make it executable: `chmod +x bin/validate-plugin.cjs` after creation.

    Required behavior:

    1. **CLI signature:** Accept optional `--root <path>` (default `process.cwd()`). All path checks resolve against root. This makes the validator testable against tmp-dir fixtures.

    2. **Header docstring** (style-match bin/tumble-dry-loop.cjs):
       ```
       /**
        * tumble-dry plugin validator — CI-gated spec-compliance check.
        *
        * Verifies:
        *   - .claude-plugin/plugin.json exists and is valid JSON
        *   - .claude-plugin/marketplace.json exists and is valid JSON
        *   - Every marketplace agent entry has a matching agents/<name>.md file
        *     whose frontmatter `name:` equals the marketplace `name`
        *   - Every agents/*.md frontmatter `name:` appears in marketplace.json
        *   - No agent frontmatter contains `hooks`, `mcpServers`, or `permissionMode`
        *     (silently stripped by Claude Code loader for plugin-shipped agents)
        *   - No agent frontmatter `name:` retains the obsolete `tumble-dry-` prefix
        *
        * Usage:
        *   node bin/validate-plugin.cjs [--root <path>]
        *
        * Exits 0 = pass, 1 = validation failure(s), 2 = unexpected error.
        */
       ```

    3. **Implementation outline** (concrete, not pseudocode):

       ```javascript
       const fs = require('fs');
       const path = require('path');

       function log(...a) { console.error('[validate-plugin]', ...a); }

       function parseFrontmatter(text) {
         // Minimal flat-YAML parser. Returns { found: bool, fields: { key: value } }.
         const lines = text.split(/\r?\n/);
         if (lines[0] !== '---') return { found: false, fields: {} };
         const end = lines.indexOf('---', 1);
         if (end === -1) return { found: false, fields: {} };
         const fields = {};
         for (let i = 1; i < end; i++) {
           const m = lines[i].match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
           if (m) fields[m[1]] = m[2].trim();
         }
         return { found: true, fields };
       }

       function parseArgs(argv) {
         const out = { root: process.cwd() };
         for (let i = 0; i < argv.length; i++) {
           if (argv[i] === '--root') out.root = path.resolve(argv[++i]);
         }
         return out;
       }

       function main() {
         const { root } = parseArgs(process.argv.slice(2));
         const errors = [];

         // Check 1: .claude-plugin/plugin.json
         const pluginPath = path.join(root, '.claude-plugin', 'plugin.json');
         let plugin = null;
         if (!fs.existsSync(pluginPath)) {
           errors.push(`.claude-plugin/plugin.json missing (expected at ${pluginPath})`);
         } else {
           try { plugin = JSON.parse(fs.readFileSync(pluginPath, 'utf-8')); }
           catch (e) { errors.push(`.claude-plugin/plugin.json is not valid JSON: ${e.message}`); }
         }

         // Check 2: .claude-plugin/marketplace.json
         const mktPath = path.join(root, '.claude-plugin', 'marketplace.json');
         let mkt = null;
         if (!fs.existsSync(mktPath)) {
           errors.push(`.claude-plugin/marketplace.json missing (expected at ${mktPath})`);
         } else {
           try { mkt = JSON.parse(fs.readFileSync(mktPath, 'utf-8')); }
           catch (e) { errors.push(`.claude-plugin/marketplace.json is not valid JSON: ${e.message}`); }
         }

         // Check 3: root-level marketplace.json should NOT exist (it was moved by Plan 01)
         const rootMktPath = path.join(root, 'marketplace.json');
         if (fs.existsSync(rootMktPath)) {
           errors.push(`Stale marketplace.json at repo root — must be moved to .claude-plugin/marketplace.json (DISPATCH-04)`);
         }

         // Check 4–7: only run if marketplace parsed
         if (mkt && Array.isArray(mkt.agents)) {
           const mktNames = new Set(mkt.agents.map(a => a.name));

           // For every marketplace agent entry: matching file + matching frontmatter name
           for (const entry of mkt.agents) {
             const agentPath = path.join(root, entry.path || `agents/${entry.name}.md`);
             if (!fs.existsSync(agentPath)) {
               errors.push(`marketplace.json declares agent '${entry.name}' at '${entry.path}' but file does not exist`);
               continue;
             }
             const text = fs.readFileSync(agentPath, 'utf-8');
             const fm = parseFrontmatter(text);
             if (!fm.found) {
               errors.push(`${entry.path}: missing or malformed frontmatter`);
               continue;
             }
             if (fm.fields.name !== entry.name) {
               errors.push(`${entry.path}: frontmatter name='${fm.fields.name}' does not match marketplace name='${entry.name}'`);
             }
             if (typeof fm.fields.name === 'string' && fm.fields.name.startsWith('tumble-dry-')) {
               errors.push(`${entry.path}: frontmatter name '${fm.fields.name}' retains obsolete 'tumble-dry-' prefix (namespace auto-prefixes per CC plugin spec)`);
             }
             for (const forbidden of ['hooks', 'mcpServers', 'permissionMode']) {
               if (forbidden in fm.fields) {
                 errors.push(`${entry.path}: frontmatter contains forbidden field '${forbidden}' (silently stripped by Claude Code loader)`);
               }
             }
           }

           // Conversely: orphan agent files (frontmatter declares name not in marketplace)
           const agentsDir = path.join(root, 'agents');
           if (fs.existsSync(agentsDir)) {
             for (const f of fs.readdirSync(agentsDir)) {
               if (!f.endsWith('.md')) continue;
               const text = fs.readFileSync(path.join(agentsDir, f), 'utf-8');
               const fm = parseFrontmatter(text);
               if (fm.found && fm.fields.name && !mktNames.has(fm.fields.name)) {
                 errors.push(`agents/${f}: frontmatter name '${fm.fields.name}' not declared in marketplace.json`);
               }
             }
           }
         }

         if (errors.length) {
           log(`FAIL — ${errors.length} validation error(s):`);
           for (const e of errors) log(`  - ${e}`);
           process.exit(1);
         }
         log('PASS — plugin spec-compliant');
         process.exit(0);
       }

       try { main(); }
       catch (e) { console.error('[validate-plugin] FATAL:', e.message); process.exit(2); }
       ```

    4. After writing the file, run `chmod +x bin/validate-plugin.cjs`.

    5. Run `node bin/validate-plugin.cjs` from repo root and confirm exit 0 (Plans 01 + 02 should have left the repo in a passing state).
  </action>
  <verify>
    <automated>chmod +x bin/validate-plugin.cjs && node bin/validate-plugin.cjs && test -x bin/validate-plugin.cjs</automated>
  </verify>
  <acceptance_criteria>
    - `bin/validate-plugin.cjs` exists, has shebang `#!/usr/bin/env node`, is executable
    - Running `node bin/validate-plugin.cjs` from repo root exits 0 (PASS) on the current Plan-01+02 state
    - File contains explicit checks for: plugin.json existence, marketplace.json existence, root marketplace.json absence, name parity (both directions), tumble-dry- prefix rejection, forbidden frontmatter fields rejection
    - No third-party dependencies (no `require` of anything outside Node core)
  </acceptance_criteria>
  <done>Validator script implemented, executable, passes on current state, ready for CI gating + smoke tests in Task 2.</done>
</task>

<task type="auto">
  <name>Task 2: Smoke tests for validator failure modes</name>
  <files>tests/validate-plugin.test.cjs</files>
  <read_first>
    - bin/validate-plugin.cjs (Task 1 output — to know exact error message format)
    - .claude-plugin/marketplace.json (real fixture to copy from)
    - agents/reviewer.md (real fixture to copy from)
  </read_first>
  <action>
    Create `tests/validate-plugin.test.cjs` as a Node CJS test script using only Node's built-in `node:test` runner and `node:assert`. No third-party test deps.

    Test structure:

    ```javascript
    const { test } = require('node:test');
    const assert = require('node:assert');
    const fs = require('node:fs');
    const path = require('node:path');
    const os = require('node:os');
    const { execFileSync, spawnSync } = require('node:child_process');

    const VALIDATOR = path.resolve(__dirname, '..', 'bin', 'validate-plugin.cjs');
    const REAL_ROOT = path.resolve(__dirname, '..');

    function makeFixture() {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'td-validate-'));
      // Copy real .claude-plugin/ + agents/ into the fixture
      fs.mkdirSync(path.join(dir, '.claude-plugin'), { recursive: true });
      fs.mkdirSync(path.join(dir, 'agents'), { recursive: true });
      fs.copyFileSync(path.join(REAL_ROOT, '.claude-plugin', 'plugin.json'), path.join(dir, '.claude-plugin', 'plugin.json'));
      fs.copyFileSync(path.join(REAL_ROOT, '.claude-plugin', 'marketplace.json'), path.join(dir, '.claude-plugin', 'marketplace.json'));
      for (const f of fs.readdirSync(path.join(REAL_ROOT, 'agents'))) {
        if (f.endsWith('.md')) fs.copyFileSync(path.join(REAL_ROOT, 'agents', f), path.join(dir, 'agents', f));
      }
      return dir;
    }

    function runValidator(root) {
      const r = spawnSync('node', [VALIDATOR, '--root', root], { encoding: 'utf-8' });
      return { code: r.status, stderr: r.stderr };
    }

    test('passes on real repo state', () => {
      const r = runValidator(REAL_ROOT);
      assert.strictEqual(r.code, 0, `expected exit 0, got ${r.code}\n${r.stderr}`);
    });

    test('fails when plugin.json missing', () => {
      const dir = makeFixture();
      fs.unlinkSync(path.join(dir, '.claude-plugin', 'plugin.json'));
      const r = runValidator(dir);
      assert.strictEqual(r.code, 1);
      assert.match(r.stderr, /plugin\.json missing/);
    });

    test('fails when marketplace.json missing', () => {
      const dir = makeFixture();
      fs.unlinkSync(path.join(dir, '.claude-plugin', 'marketplace.json'));
      const r = runValidator(dir);
      assert.strictEqual(r.code, 1);
      assert.match(r.stderr, /marketplace\.json missing/);
    });

    test('fails when root marketplace.json present (stale)', () => {
      const dir = makeFixture();
      fs.writeFileSync(path.join(dir, 'marketplace.json'), '{}');
      const r = runValidator(dir);
      assert.strictEqual(r.code, 1);
      assert.match(r.stderr, /Stale marketplace\.json at repo root/);
    });

    test('fails when agent name uses obsolete tumble-dry- prefix', () => {
      const dir = makeFixture();
      const p = path.join(dir, 'agents', 'reviewer.md');
      const text = fs.readFileSync(p, 'utf-8');
      fs.writeFileSync(p, text.replace(/^name: reviewer$/m, 'name: tumble-dry-reviewer'));
      // Also update marketplace so name-parity passes and we hit the prefix check specifically
      const mktPath = path.join(dir, '.claude-plugin', 'marketplace.json');
      const mkt = JSON.parse(fs.readFileSync(mktPath, 'utf-8'));
      for (const a of mkt.agents) if (a.name === 'reviewer') a.name = 'tumble-dry-reviewer';
      fs.writeFileSync(mktPath, JSON.stringify(mkt, null, 2));
      const r = runValidator(dir);
      assert.strictEqual(r.code, 1);
      assert.match(r.stderr, /tumble-dry-/);
    });

    test('fails on forbidden frontmatter field (hooks)', () => {
      const dir = makeFixture();
      const p = path.join(dir, 'agents', 'editor.md');
      const text = fs.readFileSync(p, 'utf-8');
      fs.writeFileSync(p, text.replace(/^---\n/, '---\nhooks: PostToolUse\n'));
      const r = runValidator(dir);
      assert.strictEqual(r.code, 1);
      assert.match(r.stderr, /forbidden field 'hooks'/);
    });

    test('fails on agent name mismatch between marketplace and frontmatter', () => {
      const dir = makeFixture();
      const mktPath = path.join(dir, '.claude-plugin', 'marketplace.json');
      const mkt = JSON.parse(fs.readFileSync(mktPath, 'utf-8'));
      for (const a of mkt.agents) if (a.name === 'reviewer') a.name = 'critic';
      fs.writeFileSync(mktPath, JSON.stringify(mkt, null, 2));
      const r = runValidator(dir);
      assert.strictEqual(r.code, 1);
      assert.match(r.stderr, /does not match marketplace name='critic'|not declared in marketplace/);
    });
    ```

    Run the test suite to confirm all tests pass:
    ```bash
    node --test tests/validate-plugin.test.cjs
    ```
  </action>
  <verify>
    <automated>node --test tests/validate-plugin.test.cjs 2>&1 | grep -q "# pass 7" || node --test tests/validate-plugin.test.cjs</automated>
  </verify>
  <acceptance_criteria>
    - `tests/validate-plugin.test.cjs` exists
    - `node --test tests/validate-plugin.test.cjs` exits 0 with all 7 tests passing
    - Tests cover: real-state pass, plugin.json missing, marketplace.json missing, stale root marketplace.json, tumble-dry- prefix rejected, forbidden hooks field rejected, name-mismatch rejected
    - No third-party dependencies (only `node:*` core modules)
    - Tests use isolated tmp-dir fixtures (do NOT mutate the real `.claude-plugin/` or `agents/`)
  </acceptance_criteria>
  <done>Validator failure modes are codified as runnable tests; CI can wire `node --test tests/validate-plugin.test.cjs` as a gating check.</done>
</task>

</tasks>

<verification>
- `node bin/validate-plugin.cjs` exits 0 on current repo state
- `node --test tests/validate-plugin.test.cjs` exits 0 with 7/7 tests passing
- `bin/validate-plugin.cjs` is executable (`-rwxr-xr-x`)
- Validator catches every Pitfall 2 failure mode (spec drift, prefix retention, forbidden fields, missing files)
</verification>

<success_criteria>
DISPATCH-02 (validator portion) satisfied. The most dangerous silent failure mode in the plugin path (panel collapse via spec drift) is now caught at install/CI time instead of manifesting as a degraded review.
</success_criteria>

<output>
After completion, create `.planning/phases/01-dispatch-v0-5-0/01-04-SUMMARY.md`
</output>
