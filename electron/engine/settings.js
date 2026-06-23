// settings.js — user-editable LEAPs settings (leaps.config.json at the project root).
//
// Currently holds the conviction verdict thresholds. Both the app (pipeline
// reader) and the CLI (compute-conviction) load from here so a change applies
// everywhere. Defaults come from the conviction engine, so the engine still runs
// standalone with no config present.

const fs = require('fs');
const path = require('path');
const { VERDICT_DEFAULTS } = require('./conviction');

const DEFAULTS = { verdict: Object.assign({}, VERDICT_DEFAULTS), discovery: { model: '' } };

// project root from this file: electron/engine/ -> root
function configPath() {
  return path.join(__dirname, '..', '..', 'leaps.config.json');
}

function loadSettings() {
  try {
    const p = configPath();
    if (fs.existsSync(p)) {
      const cfg = JSON.parse(fs.readFileSync(p, 'utf8')) || {};
      return {
        verdict: Object.assign({}, DEFAULTS.verdict, cfg.verdict || {}),
        discovery: Object.assign({}, DEFAULTS.discovery, cfg.discovery || {}),
      };
    }
  } catch {}
  return { verdict: Object.assign({}, DEFAULTS.verdict), discovery: Object.assign({}, DEFAULTS.discovery) };
}

// Shallow-merge a patch into leaps.config.json (creates it if absent). Returns the
// merged settings. Used by the app's Settings/onboarding to persist a change.
function saveSettings(patch) {
  const cur = loadSettings();
  const next = {
    verdict: Object.assign({}, cur.verdict, (patch && patch.verdict) || {}),
    discovery: Object.assign({}, cur.discovery, (patch && patch.discovery) || {}),
  };
  try { fs.writeFileSync(configPath(), JSON.stringify(next, null, 2) + '\n'); } catch {}
  return next;
}

module.exports = { loadSettings, saveSettings, DEFAULTS };
