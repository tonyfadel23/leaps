const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Create a temporary pipeline directory for testing
function makeTmpPipeline() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cleanup-state-test-'));
  return tmp;
}

function writeState(dir, slug, state) {
  const ideaDir = path.join(dir, slug);
  fs.mkdirSync(ideaDir, { recursive: true });
  fs.writeFileSync(path.join(ideaDir, '.state.json'), JSON.stringify(state), 'utf8');
  return ideaDir;
}

function writeDecisionLog(dir, slug, content) {
  const ideaDir = path.join(dir, slug);
  fs.mkdirSync(ideaDir, { recursive: true });
  fs.writeFileSync(path.join(ideaDir, 'decision-log.md'), content, 'utf8');
}

// We'll load the module after writing it
const {
  scanStateFiles,
  classifyState,
  removeStateFile,
  formatDuration,
  parseArgs,
} = require('./cleanup-state');

console.log('Running cleanup-state tests...\n');

// --- parseArgs ---
{
  const defaults = parseArgs([]);
  assert.strictEqual(defaults.dryRun, false, 'default dryRun is false');
  assert.strictEqual(defaults.threshold, 24, 'default threshold is 24h');
  console.log('  PASS: parseArgs defaults');
}
{
  const args = parseArgs(['--dry-run']);
  assert.strictEqual(args.dryRun, true, '--dry-run sets dryRun');
  console.log('  PASS: parseArgs --dry-run');
}
{
  const args = parseArgs(['--threshold', '48']);
  assert.strictEqual(args.threshold, 48, '--threshold sets hours');
  console.log('  PASS: parseArgs --threshold');
}
{
  const args = parseArgs(['--dry-run', '--threshold', '12']);
  assert.strictEqual(args.dryRun, true, 'combined --dry-run');
  assert.strictEqual(args.threshold, 12, 'combined --threshold');
  console.log('  PASS: parseArgs combined flags');
}

// --- formatDuration ---
{
  assert.strictEqual(formatDuration(0), '0h ago');
  assert.strictEqual(formatDuration(1), '1h ago');
  assert.strictEqual(formatDuration(47), '47h ago');
  assert.strictEqual(formatDuration(0.5), '0h ago');
  console.log('  PASS: formatDuration');
}

// --- scanStateFiles ---
{
  const tmp = makeTmpPipeline();
  // idea with .state.json
  writeState(tmp, 'idea-a', { skill: '/2 explore', phase: 'prototype', started_at: new Date().toISOString() });
  // idea without .state.json
  fs.mkdirSync(path.join(tmp, 'idea-b'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'idea-b', 'ground.md'), '# Ground', 'utf8');
  // non-directory file (should be ignored)
  fs.writeFileSync(path.join(tmp, 'index.html'), '<html>', 'utf8');

  const results = scanStateFiles(tmp);
  assert.strictEqual(results.length, 2, 'finds both idea dirs');

  const ideaA = results.find(r => r.slug === 'idea-a');
  const ideaB = results.find(r => r.slug === 'idea-b');
  assert.ok(ideaA, 'finds idea-a');
  assert.ok(ideaB, 'finds idea-b');
  assert.ok(ideaA.hasState, 'idea-a has state');
  assert.ok(!ideaB.hasState, 'idea-b has no state');
  assert.ok(ideaA.state.skill === '/2 explore', 'idea-a state has skill');

  // cleanup
  fs.rmSync(tmp, { recursive: true });
  console.log('  PASS: scanStateFiles');
}

// --- scanStateFiles: skips underscore prefixed dirs ---
{
  const tmp = makeTmpPipeline();
  fs.mkdirSync(path.join(tmp, '_shared'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'idea-c'), { recursive: true });
  const results = scanStateFiles(tmp);
  assert.strictEqual(results.length, 1, 'skips _shared');
  assert.strictEqual(results[0].slug, 'idea-c', 'only idea-c found');
  fs.rmSync(tmp, { recursive: true });
  console.log('  PASS: scanStateFiles skips underscore dirs');
}

// --- classifyState: stale session ---
{
  const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  const result = classifyState(
    { hasState: true, state: { skill: '/1 learn', phase: 'jtbd', started_at: staleDate } },
    24
  );
  assert.strictEqual(result.status, 'stale', 'classified as stale');
  assert.ok(result.hoursAgo >= 25, 'hours ago is correct');
  console.log('  PASS: classifyState stale');
}

// --- classifyState: active session ---
{
  const freshDate = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const result = classifyState(
    { hasState: true, state: { skill: '/3 assess', phase: 'metrics', started_at: freshDate } },
    24
  );
  assert.strictEqual(result.status, 'active', 'classified as active');
  assert.ok(result.hoursAgo >= 2 && result.hoursAgo < 3, 'hours ago is correct');
  console.log('  PASS: classifyState active');
}

// --- classifyState: no state ---
{
  const result = classifyState({ hasState: false }, 24);
  assert.strictEqual(result.status, 'clean', 'classified as clean');
  console.log('  PASS: classifyState clean');
}

// --- classifyState: missing started_at ---
{
  const result = classifyState(
    { hasState: true, state: { skill: '/2 explore', phase: 'prototype' } },
    24
  );
  assert.strictEqual(result.status, 'stale', 'missing started_at treated as stale');
  assert.strictEqual(result.reason, 'missing started_at', 'reason set');
  console.log('  PASS: classifyState missing started_at');
}

// --- classifyState: invalid JSON flagged during scan ---
{
  const result = classifyState(
    { hasState: true, state: null, parseError: 'Unexpected token x' },
    24
  );
  assert.strictEqual(result.status, 'invalid', 'parse error → invalid');
  console.log('  PASS: classifyState invalid JSON');
}

// --- classifyState: custom threshold ---
{
  const date10h = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();
  const resultDefault = classifyState(
    { hasState: true, state: { skill: '/1 learn', phase: 'jtbd', started_at: date10h } },
    24
  );
  assert.strictEqual(resultDefault.status, 'active', 'within 24h threshold → active');

  const resultCustom = classifyState(
    { hasState: true, state: { skill: '/1 learn', phase: 'jtbd', started_at: date10h } },
    8
  );
  assert.strictEqual(resultCustom.status, 'stale', 'beyond 8h threshold → stale');
  console.log('  PASS: classifyState custom threshold');
}

// --- removeStateFile: creates backup and removes ---
{
  const tmp = makeTmpPipeline();
  const ideaDir = writeState(tmp, 'idea-remove', { skill: '/1 learn', phase: 'jtbd', started_at: '2026-06-09T14:30:00Z' });

  const statePath = path.join(ideaDir, '.state.json');
  assert.ok(fs.existsSync(statePath), 'state file exists before removal');

  removeStateFile(ideaDir, false);

  assert.ok(!fs.existsSync(statePath), 'state file removed');
  assert.ok(fs.existsSync(path.join(ideaDir, '.state.json.bak')), 'backup created');

  // Verify backup content matches original
  const backup = JSON.parse(fs.readFileSync(path.join(ideaDir, '.state.json.bak'), 'utf8'));
  assert.strictEqual(backup.skill, '/1 learn', 'backup has correct content');

  fs.rmSync(tmp, { recursive: true });
  console.log('  PASS: removeStateFile creates backup and removes');
}

// --- removeStateFile: dry run does not delete ---
{
  const tmp = makeTmpPipeline();
  const ideaDir = writeState(tmp, 'idea-dry', { skill: '/2 explore', phase: 'concepts', started_at: '2026-06-09T14:30:00Z' });

  removeStateFile(ideaDir, true);

  assert.ok(fs.existsSync(path.join(ideaDir, '.state.json')), 'state file still exists in dry run');
  assert.ok(!fs.existsSync(path.join(ideaDir, '.state.json.bak')), 'no backup in dry run');

  fs.rmSync(tmp, { recursive: true });
  console.log('  PASS: removeStateFile dry run does not delete');
}

// --- removeStateFile: appends to decision-log.md ---
{
  const tmp = makeTmpPipeline();
  const ideaDir = writeState(tmp, 'idea-log', { skill: '/3 assess', phase: 'baselines', started_at: '2026-06-09T10:00:00Z' });
  writeDecisionLog(tmp, 'idea-log', '# Decision Log\n\nExisting content.\n');

  removeStateFile(ideaDir, false, { skill: '/3 assess', started_at: '2026-06-09T10:00:00Z' }, 24);

  const log = fs.readFileSync(path.join(ideaDir, 'decision-log.md'), 'utf8');
  assert.ok(log.includes('Auto-cleanup'), 'decision-log has cleanup entry');
  assert.ok(log.includes('/3 assess'), 'decision-log mentions skill');
  assert.ok(!log.includes('//3 assess'), 'no double-slash in skill name');
  assert.ok(log.includes('Existing content'), 'existing content preserved');

  fs.rmSync(tmp, { recursive: true });
  console.log('  PASS: removeStateFile appends to decision-log.md');
}

// --- removeStateFile: no decision-log.md — no error ---
{
  const tmp = makeTmpPipeline();
  const ideaDir = writeState(tmp, 'idea-nolog', { skill: '/1 learn', phase: 'jtbd', started_at: '2026-06-09T10:00:00Z' });

  // Should not throw
  removeStateFile(ideaDir, false, { skill: '/1 learn', started_at: '2026-06-09T10:00:00Z' }, 24);

  assert.ok(!fs.existsSync(path.join(ideaDir, '.state.json')), 'state removed even without decision-log');
  assert.ok(!fs.existsSync(path.join(ideaDir, 'decision-log.md')), 'no decision-log created');

  fs.rmSync(tmp, { recursive: true });
  console.log('  PASS: removeStateFile no decision-log — no error');
}

// --- scanStateFiles: invalid JSON in .state.json ---
{
  const tmp = makeTmpPipeline();
  const ideaDir = path.join(tmp, 'idea-broken');
  fs.mkdirSync(ideaDir, { recursive: true });
  fs.writeFileSync(path.join(ideaDir, '.state.json'), 'not valid json!!!', 'utf8');

  const results = scanStateFiles(tmp);
  const broken = results.find(r => r.slug === 'idea-broken');
  assert.ok(broken, 'finds broken idea');
  assert.ok(broken.hasState, 'hasState is true for broken file');
  assert.strictEqual(broken.state, null, 'state is null for broken JSON');
  assert.ok(broken.parseError, 'parseError is set');

  fs.rmSync(tmp, { recursive: true });
  console.log('  PASS: scanStateFiles handles invalid JSON');
}

console.log('\nAll tests passed.');
