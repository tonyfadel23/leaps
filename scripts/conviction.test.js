const { test } = require('node:test');
const assert = require('node:assert');
const { computeConviction } = require('../electron/engine/conviction');

const ALL_ARTIFACTS = {
  ground: true, sketch: true, define: true, explore: true,
  metrics: true, sketches: true, competitors: true,
  killCriteria: true, interviews: true,
};
const dim = (r, key) => r.dimensions.find(d => d.key === key).score;

test('returns the 4 dimensions in fixed order with the required shape', () => {
  const r = computeConviction({ stage: 'Learned', claims: [], has: {} });
  assert.deepStrictEqual(r.dimensions.map(d => d.key), ['problem', 'size', 'feasibility', 'evidence']);
  for (const k of ['conviction', 'verdict', 'evidence', 'gap', 'verdictLine']) assert.ok(k in r, `missing ${k}`);
  assert.ok(r.conviction >= 0 && r.conviction <= 100);
  assert.ok(r.evidence >= 0 && r.evidence <= 5);
});

test('THE RIGOR WALL: a fully-built idea with all-assumed claims never pursues', () => {
  const r = computeConviction({
    stage: 'Shipped',
    has: ALL_ARTIFACTS,
    claims: [{ text: 'a', source: null }, { text: 'b', source: null }, { text: 'c', source: null }],
    sizingTotal: 4, sizingSourced: 0,
  });
  assert.notStrictEqual(r.verdict, 'pursue', 'confidence cannot be bought with stage progression');
  assert.strictEqual(dim(r, 'evidence'), 0, 'evidence quality is 0% when nothing is sourced');
});

test('evidence quality is the sourced ratio; zero claims is thin (20)', () => {
  const half = computeConviction({ stage: 'Assessed', has: {}, claims: [{ text: 'a', source: 'Looker' }, { text: 'b', source: null }] });
  assert.strictEqual(dim(half, 'evidence'), 50);
  const none = computeConviction({ stage: 'Learned', has: {}, claims: [] });
  assert.strictEqual(dim(none, 'evidence'), 20);
});

test('modeled-only sizing caps the Size dimension at 64', () => {
  const r = computeConviction({ stage: 'Shipped', has: ALL_ARTIFACTS, claims: [{ text: 'a', source: 'x' }], sizingTotal: 6, sizingSourced: 0 });
  assert.ok(dim(r, 'size') <= 64, 'size is capped when no sizing row is live');
});

test('a strong, fully-sourced, explored idea pursues', () => {
  const r = computeConviction({
    stage: 'Proven',
    has: ALL_ARTIFACTS,
    claims: [{ text: 'a', source: 'Looker' }, { text: 'b', source: 'BQ' }, { text: 'c', source: 'live' }, { text: 'd', source: 'live' }],
    sizingTotal: 4, sizingSourced: 4,
  });
  assert.strictEqual(r.verdict, 'pursue');
  assert.ok(r.conviction >= 70 && r.evidence >= 3);
});

test('legacy stage label "Built" ranks identically to "Shipped"', () => {
  const facts = { has: ALL_ARTIFACTS, claims: [{ text: 'a', source: 'x' }], sizingTotal: 2, sizingSourced: 2 };
  assert.strictEqual(
    computeConviction({ ...facts, stage: 'Built' }).conviction,
    computeConviction({ ...facts, stage: 'Shipped' }).conviction,
  );
});

test('gap names the lowest-scoring dimension', () => {
  const r = computeConviction({ stage: 'Learned', has: {}, claims: [{ text: 'a', source: 'x' }] });
  const lowest = r.dimensions.reduce((a, b) => (b.score < a.score ? b : a));
  assert.strictEqual(r.gap.dim, lowest.key);
});

test('default threshold: a weak idea (conviction below 50) is killed', () => {
  const r = computeConviction({ stage: 'Learned', has: {}, claims: [] });
  assert.ok(r.conviction < 50, 'maximally-weak idea scores under 50');
  assert.strictEqual(r.verdict, 'kill');
});

test('verdict thresholds are configurable via opts', () => {
  const weak = { stage: 'Learned', has: {}, claims: [] }; // conviction ~31
  assert.strictEqual(computeConviction(weak).verdict, 'kill', 'killed at default killBelow=50');
  assert.strictEqual(computeConviction(weak, { killBelow: 20 }).verdict, 'needs', 'lower killBelow spares it');

  const strong = {
    stage: 'Proven', has: ALL_ARTIFACTS,
    claims: [{ text: 'a', source: 'x' }, { text: 'b', source: 'y' }, { text: 'c', source: 'z' }],
    sizingTotal: 2, sizingSourced: 2,
  };
  assert.strictEqual(computeConviction(strong).verdict, 'pursue', 'pursues at default pursueFrom=70');
  assert.strictEqual(computeConviction(strong, { pursueFrom: 99 }).verdict, 'needs', 'higher bar blocks pursue');
});
