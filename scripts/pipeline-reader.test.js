const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { listIdeas, getIdea } = require('../electron/engine/pipeline-reader');

// Validate the read path against the shipped sample concept (always present).
const EXAMPLES = path.join(__dirname, '..', 'examples');

test('listIdeas reads the sample concept from examples/', () => {
  const r = listIdeas(EXAMPLES);
  assert.ok(Array.isArray(r.ideas), 'ideas is an array');
  const sample = r.ideas.find(i => i.id === 'team-lunch-ordering');
  assert.ok(sample, 'sample concept is listed');
  assert.strictEqual(sample.stage, 'Assessed');
  assert.ok(sample.conviction >= 0 && sample.conviction <= 100);
});

test('getIdea returns a full view-model with a verdict and 4 conviction dimensions', () => {
  const idea = getIdea(EXAMPLES, 'team-lunch-ordering');
  assert.ok(idea, 'idea resolved');
  assert.strictEqual(idea.id, 'team-lunch-ordering');
  assert.strictEqual(idea.dimensions.length, 4);
  assert.deepStrictEqual(idea.dimensions.map(d => d.key), ['problem', 'size', 'feasibility', 'evidence']);
  assert.ok(['pursue', 'needs', 'kill'].includes(idea.verdict));
});

test('getIdea returns null/undefined for an unknown slug', () => {
  const idea = getIdea(EXAMPLES, 'no-such-idea');
  assert.ok(!idea || idea.id !== 'no-such-idea');
});
