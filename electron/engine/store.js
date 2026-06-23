// store.js — non-destructive sidecar persistence for LEAPs.
//
// LEAPs NEVER edits a PM's real pipeline files. Any state LEAPs needs to remember
// about an idea (a verdict override, a kill reason, conviction history) lives in
// a `.leap.json` sidecar written INTO the idea folder, alongside (never over) the
// PM's own markdown/JSON/HTML artifacts.
//
// Sidecar shape used by the app:
//   {
//     verdictOverride: 'pursue'|'needs'|'kill'|null,   // human override of the engine
//     killReason: string|null,                         // why a human killed it
//     convictionSnapshots: [ { score:number, at:string } ]  // history over time
//   }

const fs = require('fs');
const path = require('path');

const SIDECAR_NAME = '.leap.json';

function sidecarPath(ideaDir) {
  return path.join(ideaDir, SIDECAR_NAME);
}

// readSidecar(ideaDir) → parsed object, or {} if missing/unreadable/invalid.
function readSidecar(ideaDir) {
  try {
    const raw = fs.readFileSync(sidecarPath(ideaDir), 'utf8');
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch (e) {
    return {};
  }
}

// writeSidecar(ideaDir, patch) → shallow-merges patch into the existing sidecar,
// writes pretty JSON, returns the merged object. On write failure, returns the
// merged object anyway (never throws — persistence is best-effort).
function writeSidecar(ideaDir, patch) {
  const current = readSidecar(ideaDir);
  const merged = Object.assign({}, current, patch || {});
  try {
    fs.writeFileSync(sidecarPath(ideaDir), JSON.stringify(merged, null, 2) + '\n', 'utf8');
  } catch (e) {
    // Swallow — caller still gets the merged object for in-memory use.
  }
  return merged;
}

module.exports = { readSidecar, writeSidecar };
