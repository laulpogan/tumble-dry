/**
 * Style anchor registry. Maps language names → anchor modules.
 * `get(language)` always returns a module — falls through to default.cjs
 * for unknown languages.
 */

const pythonAnchor = require('./python.cjs');
const goAnchor = require('./go.cjs');
const rustAnchor = require('./rust.cjs');
const jsAnchor = require('./javascript.cjs');
const defaultAnchor = require('./default.cjs');

const REGISTRY = {
  Python: pythonAnchor,
  Go: goAnchor,
  Rust: rustAnchor,
  JavaScript: jsAnchor,
  TypeScript: jsAnchor, // TS shares JS standard for this scope
};

function get(language) {
  return REGISTRY[language] || defaultAnchor;
}

function markdownFor(language) {
  return get(language).markdown();
}

module.exports = { get, markdownFor, REGISTRY, defaultAnchor };
