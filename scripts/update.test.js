const { test } = require('node:test');
const assert = require('node:assert');
const { cmpVersions, parseRepo } = require('../electron/engine/update');

test('cmpVersions orders releases correctly', () => {
  assert.strictEqual(cmpVersions('1.2.0', '1.1.9'), 1, 'newer minor');
  assert.strictEqual(cmpVersions('2.0.0', '1.9.9'), 1, 'newer major');
  assert.strictEqual(cmpVersions('0.1.0', '0.2.0'), -1, 'older');
  assert.strictEqual(cmpVersions('v0.1.0', '0.1.0'), 0, 'leading v ignored, equal');
  assert.strictEqual(cmpVersions('1.0.1', '1.0.0'), 1, 'newer patch');
  assert.strictEqual(cmpVersions('1.0.0-beta', '1.0.0'), 0, 'prerelease suffix stripped');
});

test('parseRepo extracts owner/repo from package.json repository', () => {
  assert.deepStrictEqual(
    parseRepo({ repository: { url: 'https://github.com/tonyfadel23/leaps.git' } }),
    { owner: 'tonyfadel23', repo: 'leaps' },
  );
  assert.deepStrictEqual(
    parseRepo({ repository: 'git+https://github.com/foo/bar.git' }),
    { owner: 'foo', repo: 'bar' },
  );
  assert.strictEqual(parseRepo({}), null, 'no repository -> null');
});
