const { test } = require('node:test');
const assert = require('node:assert');
const { parseRoles, serializeRoles, withCatalog, CATALOG_ROLES } = require('../electron/engine/connectors');

test('serializeRoles → parseRoles round-trips a bound role', () => {
  const roles = [{
    role: 'metrics_source', description: 'Counts and sizing',
    mcp: 'looker', url: 'https://mcp.example.com/looker', transport: 'http',
    hint: 'Ask for numbers', required: true, fallback_mode: 'ask_user',
  }];
  const back = parseRoles(serializeRoles(roles));
  assert.strictEqual(back.length, 1);
  const m = back[0];
  assert.strictEqual(m.role, 'metrics_source');
  assert.strictEqual(m.description, 'Counts and sizing');
  assert.strictEqual(m.mcp, 'looker');
  assert.strictEqual(m.url, 'https://mcp.example.com/looker');
  assert.strictEqual(m.transport, 'http');
  assert.strictEqual(m.required, true);
  assert.strictEqual(m.fallback_mode, 'ask_user');
});

test('an unbound role writes no primary and survives the round-trip', () => {
  const back = parseRoles(serializeRoles([
    { role: 'knowledge_base', description: 'Prior work', mcp: '', url: '', transport: 'http', required: false, fallback_mode: 'skip' },
  ]));
  assert.strictEqual(back[0].mcp, null, 'no mcp written when unbound');
  assert.strictEqual(back[0].fallback_mode, 'skip');
});

test('role names are slugified on write', () => {
  const back = parseRoles(serializeRoles([{ role: 'My Source!', mcp: 'x', url: 'https://a.b', transport: 'http' }]));
  assert.strictEqual(back[0].role, 'my_source');
});

test('primary + ordered fallbacks round-trip', () => {
  const roles = [{
    role: 'metrics_source', description: 'numbers',
    mcp: 'looker', url: 'https://looker', transport: 'http',
    required: true, fallback_mode: 'ask_user',
    fallbacks: [{ mcp: 'bigquery', url: 'https://bq', transport: 'http' }, { mcp: 'tableau', url: '', transport: 'stdio' }],
  }];
  const back = parseRoles(serializeRoles(roles));
  assert.strictEqual(back[0].mcp, 'looker', 'primary preserved');
  assert.deepStrictEqual(back[0].fallbacks.map(f => f.mcp), ['bigquery', 'tableau'], 'fallback order preserved');
  assert.strictEqual(back[0].fallbacks[1].transport, 'stdio');
});

test('withCatalog returns every fixed role even when the file is empty', () => {
  const roles = withCatalog(parseRoles('connectors:\n'));
  assert.deepStrictEqual(roles.map(r => r.role), CATALOG_ROLES);
  assert.ok(roles.every(r => Array.isArray(r.fallbacks)), 'each role has a fallbacks array');
});
