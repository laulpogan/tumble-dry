/**
 * lib/code/ast-drift.cjs — AST-aware drift report (CODE-02).
 *
 * Taxonomy (per-symbol classification):
 *   unchanged          — same name, same body
 *   reformatted        — same name, same normalized body, whitespace diff
 *   modified           — same name, body bytes differ post-normalize
 *   renamed            — moved name; body matches a removed symbol's body
 *   moved              — same name + body but parent/position changed
 *   signature_changed  — same name, parameter list differs (STRUCTURAL flag)
 *   added              — present in AFTER only
 *   removed            — present in BEFORE only
 *
 * Public-API signature changes are a permanent structural flag: they can
 * NEVER be silently auto-converged. The aggregate surfaces them as
 * STRUCTURAL regardless of reviewer output.
 *
 * Strategy: use `web-tree-sitter` + a language WASM grammar to enumerate
 * top-level named symbols (function / class / method definitions). Fall back
 * to `lib/voice.cjs::voiceDriftReport` sentence diff if either web-tree-sitter
 * or the language grammar is unavailable.
 */

const fs = require('fs');
const path = require('path');
const { voiceDriftReport } = require('../voice.cjs');

let _parserReady = null;
let _Parser = null;
const _langCache = new Map();

async function initParser() {
  if (_parserReady) return _parserReady;
  _parserReady = (async () => {
    try {
      const mod = await import('web-tree-sitter');
      _Parser = mod.Parser || mod.default || mod;
      if (_Parser && typeof _Parser.init === 'function') {
        await _Parser.init();
      }
      return true;
    } catch {
      _Parser = null;
      return false;
    }
  })();
  return _parserReady;
}

// Map our Language names to:
//   (a) tree-sitter grammar WASM package name
//   (b) the node types that represent top-level named symbols
const LANGUAGE_CONFIG = {
  JavaScript: {
    grammarPkg: 'tree-sitter-javascript',
    wasmFile: 'tree-sitter-javascript.wasm',
    defNodeTypes: ['function_declaration', 'class_declaration', 'method_definition', 'generator_function_declaration'],
    nameField: 'name',
    paramField: 'parameters',
  },
  TypeScript: {
    grammarPkg: 'tree-sitter-typescript',
    wasmFile: 'tree-sitter-typescript.wasm',
    defNodeTypes: ['function_declaration', 'class_declaration', 'method_definition', 'interface_declaration'],
    nameField: 'name',
    paramField: 'parameters',
  },
  Python: {
    grammarPkg: 'tree-sitter-python',
    wasmFile: 'tree-sitter-python.wasm',
    defNodeTypes: ['function_definition', 'class_definition'],
    nameField: 'name',
    paramField: 'parameters',
  },
  Go: {
    grammarPkg: 'tree-sitter-go',
    wasmFile: 'tree-sitter-go.wasm',
    defNodeTypes: ['function_declaration', 'method_declaration', 'type_declaration'],
    nameField: 'name',
    paramField: 'parameters',
  },
  Rust: {
    grammarPkg: 'tree-sitter-rust',
    wasmFile: 'tree-sitter-rust.wasm',
    defNodeTypes: ['function_item', 'struct_item', 'impl_item'],
    nameField: 'name',
    paramField: 'parameters',
  },
};

function resolveGrammarWasm(language) {
  const cfg = LANGUAGE_CONFIG[language];
  if (!cfg) return null;
  // Try to locate the WASM file shipped alongside the grammar package.
  try {
    const pkgRoot = path.dirname(require.resolve(`${cfg.grammarPkg}/package.json`));
    const candidates = [
      path.join(pkgRoot, cfg.wasmFile),
      path.join(pkgRoot, 'prebuilds', cfg.wasmFile),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  } catch { /* grammar not installed */ }
  return null;
}

async function loadLanguage(language) {
  if (_langCache.has(language)) return _langCache.get(language);
  const ok = await initParser();
  if (!ok || !_Parser) { _langCache.set(language, null); return null; }
  const wasmPath = resolveGrammarWasm(language);
  if (!wasmPath) { _langCache.set(language, null); return null; }
  try {
    const LanguageCtor = _Parser.Language || (_Parser.default && _Parser.default.Language);
    const lang = await LanguageCtor.load(wasmPath);
    _langCache.set(language, lang);
    return lang;
  } catch {
    _langCache.set(language, null);
    return null;
  }
}

function walkForSymbols(root, cfg, source) {
  const symbols = [];
  function getNameText(node) {
    try {
      const nameNode = node.childForFieldName && node.childForFieldName(cfg.nameField);
      if (nameNode && typeof nameNode.text === 'string') return nameNode.text;
      if (nameNode) return source.slice(nameNode.startIndex, nameNode.endIndex);
    } catch { /* ignore */ }
    // Fallback: first identifier child.
    for (let i = 0; i < node.childCount; i++) {
      const c = node.child(i);
      if (c && c.type === 'identifier') return source.slice(c.startIndex, c.endIndex);
    }
    return null;
  }
  function getParamsText(node) {
    try {
      const p = node.childForFieldName && node.childForFieldName(cfg.paramField);
      if (p) return source.slice(p.startIndex, p.endIndex);
    } catch { /* ignore */ }
    return '';
  }
  function recurse(node) {
    if (!node) return;
    if (cfg.defNodeTypes.includes(node.type)) {
      const name = getNameText(node);
      if (name) {
        symbols.push({
          name,
          kind: node.type,
          parameters: getParamsText(node),
          body: source.slice(node.startIndex, node.endIndex),
          start: node.startIndex,
          end: node.endIndex,
        });
      }
    }
    for (let i = 0; i < node.namedChildCount; i++) {
      recurse(node.namedChild(i));
    }
  }
  recurse(root);
  return symbols;
}

function normalizeCode(s) {
  return (s || '').replace(/\s+/g, ' ').trim();
}

function parseParams(paramsText) {
  if (!paramsText) return [];
  const inner = paramsText.replace(/^\s*\(|\)\s*$/g, '');
  // Naive param split — good enough for signature equality.
  return inner.split(/,(?![^<>()[\]{}]*[>)\]}])/)
    .map(p => p.replace(/=.*/, '').replace(/:.+/, '').trim())
    .filter(Boolean);
}

function classifySymbols(beforeSyms, afterSyms) {
  const beforeByName = new Map(beforeSyms.map(s => [s.name, s]));
  const afterByName = new Map(afterSyms.map(s => [s.name, s]));
  const classifications = [];
  const counts = {
    unchanged: 0, renamed: 0, moved: 0, modified: 0,
    signature_changed: 0, added: 0, removed: 0, reformatted: 0,
  };

  const matchedBefore = new Set();
  const matchedAfter = new Set();

  // Pass 1: name-matches.
  for (const [name, before] of beforeByName) {
    const after = afterByName.get(name);
    if (!after) continue;
    matchedBefore.add(name);
    matchedAfter.add(name);
    const bodyEq = before.body === after.body;
    const normBodyEq = normalizeCode(before.body) === normalizeCode(after.body);
    const beforeParams = parseParams(before.parameters);
    const afterParams = parseParams(after.parameters);
    const sigEq = beforeParams.length === afterParams.length &&
      beforeParams.every((p, i) => p === afterParams[i]);
    const posEq = before.start === after.start;

    let kind;
    if (!sigEq) kind = 'signature_changed';
    else if (bodyEq && posEq) kind = 'unchanged';
    else if (bodyEq && !posEq) kind = 'moved';
    else if (normBodyEq) kind = 'reformatted';
    else kind = 'modified';

    counts[kind]++;
    classifications.push({
      name, kind,
      before_params: beforeParams, after_params: afterParams,
      structural: kind === 'signature_changed',
    });
  }

  // Pass 2: rename detection — unmatched before × unmatched after with body equality.
  const unmatchedBefore = beforeSyms.filter(s => !matchedBefore.has(s.name));
  const unmatchedAfter = afterSyms.filter(s => !matchedAfter.has(s.name));
  const usedAfter = new Set();
  for (const b of unmatchedBefore) {
    const normB = normalizeCode(b.body);
    const hit = unmatchedAfter.find(a => !usedAfter.has(a.name) && normalizeCode(a.body) === normB);
    if (hit) {
      usedAfter.add(hit.name);
      counts.renamed++;
      classifications.push({
        name: `${b.name} → ${hit.name}`, kind: 'renamed',
        before_params: parseParams(b.parameters), after_params: parseParams(hit.parameters),
      });
    } else {
      counts.removed++;
      classifications.push({ name: b.name, kind: 'removed' });
    }
  }
  for (const a of unmatchedAfter) {
    if (usedAfter.has(a.name)) continue;
    counts.added++;
    classifications.push({ name: a.name, kind: 'added' });
  }

  const totalSymbols = beforeSyms.length || 1;
  const preserved = counts.unchanged + counts.reformatted + counts.moved;
  const drift_score = Number(((totalSymbols - preserved) / totalSymbols).toFixed(3));
  return { counts, classifications, drift_score };
}

async function astDriftReport(beforeText, afterText, language) {
  // Fallback if language unknown or tree-sitter unavailable.
  const cfg = LANGUAGE_CONFIG[language];
  if (!cfg) {
    const vd = voiceDriftReport(beforeText, afterText);
    return { backend: 'sentence-fallback', reason: `no tree-sitter config for ${language}`, ...vd };
  }
  const lang = await loadLanguage(language);
  if (!lang || !_Parser) {
    const vd = voiceDriftReport(beforeText, afterText);
    return { backend: 'sentence-fallback', reason: `web-tree-sitter or ${cfg.grammarPkg} unavailable`, ...vd };
  }
  let parser;
  try {
    const ParserCtor = _Parser.Parser || _Parser;
    parser = new ParserCtor();
    parser.setLanguage(lang);
  } catch (err) {
    const vd = voiceDriftReport(beforeText, afterText);
    return { backend: 'sentence-fallback', reason: `parser init failed: ${err.message}`, ...vd };
  }

  let beforeTree, afterTree;
  try {
    beforeTree = parser.parse(beforeText);
    afterTree = parser.parse(afterText);
  } catch (err) {
    const vd = voiceDriftReport(beforeText, afterText);
    return { backend: 'sentence-fallback', reason: `parse failed: ${err.message}`, ...vd };
  }

  const beforeSyms = walkForSymbols(beforeTree.rootNode, cfg, beforeText);
  const afterSyms = walkForSymbols(afterTree.rootNode, cfg, afterText);
  const result = classifySymbols(beforeSyms, afterSyms);
  const signatureChangedSymbols = result.classifications
    .filter(c => c.kind === 'signature_changed')
    .map(c => c.name);
  return {
    backend: 'tree-sitter',
    language,
    symbols_before: beforeSyms.length,
    symbols_after: afterSyms.length,
    counts: result.counts,
    drift_score: result.drift_score,
    classifications: result.classifications,
    signature_changed_count: result.counts.signature_changed,
    signature_changed_symbols: signatureChangedSymbols,
    structural: signatureChangedSymbols.length > 0,
  };
}

/**
 * Parse-check a single file's content. Returns { ok, language, error? }.
 * If grammar unavailable, returns { ok: true, skipped: true } — don't gate
 * convergence on missing grammars.
 */
async function parseCheck(content, language) {
  const cfg = LANGUAGE_CONFIG[language];
  if (!cfg) return { ok: true, skipped: true, reason: 'no grammar config' };
  const lang = await loadLanguage(language);
  if (!lang || !_Parser) return { ok: true, skipped: true, reason: 'grammar not installed' };
  try {
    const ParserCtor = _Parser.Parser || _Parser;
    const parser = new ParserCtor();
    parser.setLanguage(lang);
    const tree = parser.parse(content);
    const hasError = tree.rootNode.hasError;
    return { ok: !hasError, language, error: hasError ? 'tree has ERROR nodes' : null };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = {
  astDriftReport,
  parseCheck,
  classifySymbols,
  LANGUAGE_CONFIG,
  // Exposed for testing:
  _walkForSymbols: walkForSymbols,
};
