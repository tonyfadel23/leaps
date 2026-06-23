const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..');
const FILES = [
  'design/DESIGN.md',
  'design/design_tokens.json',
  'presets/design/default.md',
  'presets/design/default.tokens.json',
];

test('shipped design data uses the neutral palette (no legacy brand colors)', () => {
  // Guard against an employer-specific palette regressing into the default: the
  // neutral primary must be present and the old brand orange must be absent.
  for (const rel of FILES) {
    const txt = fs.readFileSync(path.join(root, rel), 'utf8').toLowerCase();
    assert.ok(!/#f55905/.test(txt), `${rel} must not contain the legacy brand orange`);
  }
  const tokens = fs.readFileSync(path.join(root, 'design/design_tokens.json'), 'utf8');
  assert.match(tokens, /#2563EB/i, 'default tokens must use the neutral primary');
});

test('token files parse and expose a non-empty colors map', () => {
  for (const rel of ['design/design_tokens.json', 'presets/design/default.tokens.json']) {
    const j = JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
    assert.ok(j.colors && Object.keys(j.colors).length >= 6, `${rel} needs >=6 colors`);
  }
});

test('DESIGN.md keeps the AUTO-SYNCED markers the sync skill expects', () => {
  const md = fs.readFileSync(path.join(root, 'design/DESIGN.md'), 'utf8');
  assert.match(md, /<!-- AUTO-SYNCED/, 'must keep an AUTO-SYNCED start marker');
});

// ── design.js engine (isolated temp root via LEAPS_APP_ROOT) ──

function freshRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'leap-design-'));
  fs.mkdirSync(path.join(dir, 'design'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'presets', 'design'), { recursive: true });
  const tokens = JSON.stringify({
    name: 'Neutral Default System',
    colors: {
      primary: { '$type': 'color', '$value': { hex: '#2563EB' }, '$description': 'Primary' },
      danger: { '$type': 'color', '$value': { hex: '#DC2626' }, '$description': 'Danger' },
    },
  });
  fs.writeFileSync(path.join(dir, 'design', 'design_tokens.json'), tokens);
  fs.writeFileSync(path.join(dir, 'design', 'DESIGN.md'), '# Design\n');
  fs.writeFileSync(path.join(dir, 'presets', 'design', 'default.tokens.json'), tokens);
  fs.writeFileSync(path.join(dir, 'presets', 'design', 'default.md'), '# Design\n');
  process.env.LEAPS_APP_ROOT = dir;
  delete require.cache[require.resolve('../electron/engine/design')];
  return dir;
}
const loadDesign = () => require('../electron/engine/design');

test('getDesign parses colors and defaults to source=default', () => {
  freshRoot();
  const d = loadDesign().getDesign();
  assert.strictEqual(d.source, 'default');
  assert.strictEqual(d.figmaUrl, null);
  assert.deepStrictEqual(d.colors[0], { name: 'primary', hex: '#2563EB', description: 'Primary' });
  assert.strictEqual(d.colors.length, 2);
});

test('saveFigmaUrl persists the url and flips source to figma', () => {
  const root2 = freshRoot();
  const design = loadDesign();
  const d = design.saveFigmaUrl('https://figma.com/file/abc');
  assert.strictEqual(d.source, 'figma');
  assert.strictEqual(d.figmaUrl, 'https://figma.com/file/abc');
  assert.strictEqual(fs.readFileSync(path.join(root2, 'design', '.figma-source'), 'utf8').trim(),
    'https://figma.com/file/abc');
});

test('resetDesign restores default files, clears url, source=default', () => {
  const root2 = freshRoot();
  const design = loadDesign();
  design.saveFigmaUrl('https://figma.com/file/abc');
  fs.writeFileSync(path.join(root2, 'design', 'DESIGN.md'), '# Synced from Figma\n');
  const d = design.resetDesign();
  assert.strictEqual(d.source, 'default');
  assert.strictEqual(d.figmaUrl, null);
  assert.strictEqual(fs.existsSync(path.join(root2, 'design', '.figma-source')), false);
  assert.match(fs.readFileSync(path.join(root2, 'design', 'DESIGN.md'), 'utf8'), /^# Design/);
});

test('markSynced sets source=figma and a non-null lastSynced', () => {
  freshRoot();
  const design = loadDesign();
  const d = design.markSynced();
  assert.strictEqual(d.source, 'figma');
  assert.ok(d.lastSynced && !Number.isNaN(Date.parse(d.lastSynced)));
});

test('syncBlockedReason blocks without a figma url, allows with one', () => {
  freshRoot();
  const design = loadDesign();
  assert.match(design.syncBlockedReason(), /figma/i);
  design.saveFigmaUrl('https://figma.com/file/abc');
  assert.strictEqual(design.syncBlockedReason(), null);
});

test('getDesign tolerates malformed tokens (colors: [])', () => {
  const root2 = freshRoot();
  fs.writeFileSync(path.join(root2, 'design', 'design_tokens.json'), '{ not json');
  delete require.cache[require.resolve('../electron/engine/design')];
  const d = loadDesign().getDesign();
  assert.deepStrictEqual(d.colors, []);
});
