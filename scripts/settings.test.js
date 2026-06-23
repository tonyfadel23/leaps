const { test } = require('node:test');
const assert = require('node:assert');
const { loadSettings, DEFAULTS } = require('../electron/engine/settings');

test('loadSettings returns verdict thresholds as numbers', () => {
  const s = loadSettings();
  assert.ok(s.verdict, 'has verdict block');
  assert.strictEqual(typeof s.verdict.killBelow, 'number');
  assert.strictEqual(typeof s.verdict.pursueFrom, 'number');
  assert.strictEqual(typeof s.verdict.pursueMinEvidence, 'number');
});

test('the default kill threshold is 50', () => {
  // DEFAULTS is the engine constant; loadSettings() reflects the user-editable
  // leaps.config.json, so only assert the value type there (not a fixed number).
  assert.strictEqual(DEFAULTS.verdict.killBelow, 50);
  assert.strictEqual(typeof loadSettings().verdict.killBelow, 'number');
});
