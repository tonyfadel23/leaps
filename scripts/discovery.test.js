const { test } = require('node:test');
const assert = require('node:assert');
const discovery = require('../electron/engine/discovery');
const { parseFindings } = discovery;

test('parseFindings extracts the leap-findings JSON block', () => {
  const txt = 'analysis...\n```leap-findings\n{"claims":[{"text":"x","source":"Looker"}],"verdictHint":"needs"}\n```\ndone';
  const r = parseFindings(txt);
  assert.ok(r);
  assert.strictEqual(r.claims.length, 1);
  assert.strictEqual(r.claims[0].source, 'Looker');
  assert.strictEqual(r.verdictHint, 'needs');
});

test('parseFindings returns the LAST block when several are present', () => {
  const txt = '```leap-findings\n{"summary":"first"}\n```\nmore\n```leap-findings\n{"summary":"second"}\n```';
  assert.strictEqual(parseFindings(txt).summary, 'second');
});

test('parseFindings returns null for no block, empty input, or malformed JSON', () => {
  assert.strictEqual(parseFindings('no fenced block here'), null);
  assert.strictEqual(parseFindings(''), null);
  assert.strictEqual(parseFindings('```leap-findings\n{not valid json}\n```'), null);
});

test('stopAll is safe on an empty registry and leaves no runs', () => {
  assert.doesNotThrow(() => discovery.stopAll());
  assert.deepStrictEqual(discovery.listRuns(), []);
});

test('stopDiscovery returns false for an unknown id', () => {
  assert.strictEqual(discovery.stopDiscovery('does-not-exist'), false);
});
