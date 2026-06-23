// design.js — the design system the prototype builder uses. The working copy
// lives in design/DESIGN.md + design/design_tokens.json (overwritten by a Figma
// sync via /setup --sync-design). A pristine neutral copy under presets/design/
// backs "Reset to default". A small per-machine marker (.design-state.json)
// records the active source so the UI shows it without guessing from mtimes.

const fs = require('fs');
const path = require('path');

const appRoot = () => process.env.LEAPS_APP_ROOT || path.join(__dirname, '..', '..');
const designDir = () => path.join(appRoot(), 'design');
const tokensPath = () => path.join(designDir(), 'design_tokens.json');
const designMdPath = () => path.join(designDir(), 'DESIGN.md');
const figmaSrcPath = () => path.join(designDir(), '.figma-source');
const statePath = () => path.join(designDir(), '.design-state.json');
const presetDir = () => path.join(appRoot(), 'presets', 'design');

function readState() {
  try { return JSON.parse(fs.readFileSync(statePath(), 'utf8')) || {}; } catch { return {}; }
}
function writeState(patch) {
  const next = Object.assign({ source: 'default', preset: null, lastSynced: null }, readState(), patch);
  try { fs.writeFileSync(statePath(), JSON.stringify(next, null, 2) + '\n'); } catch {}
  return next;
}

function readFigmaUrl() {
  try {
    const raw = fs.readFileSync(figmaSrcPath(), 'utf8');
    const line = raw.split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('#'));
    return line || null;
  } catch { return null; }
}

function parseColors() {
  try {
    const j = JSON.parse(fs.readFileSync(tokensPath(), 'utf8'));
    const colors = (j && j.colors) || {};
    return Object.keys(colors).map((name) => ({
      name,
      hex: (colors[name] && colors[name].$value && colors[name].$value.hex) || '',
      description: (colors[name] && colors[name].$description) || '',
    })).filter((c) => c.hex);
  } catch { return []; }
}

function getDesign() {
  const st = readState();
  return {
    source: st.source || 'default',
    preset: st.preset || null,
    figmaUrl: readFigmaUrl(),
    colors: parseColors(),
    lastSynced: st.lastSynced || null,
  };
}

function saveFigmaUrl(url) {
  const clean = String(url || '').trim();
  try { fs.writeFileSync(figmaSrcPath(), clean + '\n'); } catch {}
  writeState({ source: 'figma', preset: null });
  return getDesign();
}

function resetDesign() {
  try { fs.copyFileSync(path.join(presetDir(), 'default.md'), designMdPath()); } catch {}
  try { fs.copyFileSync(path.join(presetDir(), 'default.tokens.json'), tokensPath()); } catch {}
  try { fs.rmSync(figmaSrcPath(), { force: true }); } catch {}
  writeState({ source: 'default', preset: null, lastSynced: null });
  return getDesign();
}

function markSynced() {
  writeState({ source: 'figma', lastSynced: new Date().toISOString() });
  return getDesign();
}

// Pure guard: returns a reason string if a sync should be refused, else null.
function syncBlockedReason(d) {
  const design = d || getDesign();
  if (!design.figmaUrl) return 'Add your Figma file URL first (Connect Figma).';
  return null;
}

module.exports = { getDesign, saveFigmaUrl, resetDesign, markSynced, syncBlockedReason };
