#!/usr/bin/env node
// compute-conviction.js — make conviction first-class in the pipeline DATA.
//
// LEAPs already computes conviction from each idea's files via the engine in
// electron/engine/ (conviction.js + pipeline-reader.js buildFacts). This script
// runs that SAME engine and persists the result into each idea's .briefdata.json
// as a `conviction` object, so the brief can render it and /eval can audit it.
// One engine of record — the app and the brief can never disagree.
//
// Usage:
//   node scripts/compute-conviction.js                 # dry-run, all ideas, prints table
//   node scripts/compute-conviction.js --write         # write conviction into every .briefdata.json
//   node scripts/compute-conviction.js <idea-slug>     # dry-run, one idea
//   node scripts/compute-conviction.js <idea-slug> --write
//   node scripts/compute-conviction.js --dir <pipelineDir> [--write] [slug]

const fs = require('fs');
const path = require('path');
const reader = require('../electron/engine/pipeline-reader');

const DEFAULT_PIPELINE = require('path').join(__dirname, '..', 'pipeline');

function parseArgs(argv) {
  const a = { write: false, check: false, dir: DEFAULT_PIPELINE, slug: null };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--write') a.write = true;
    else if (t === '--check') a.check = true;
    else if (t === '--dir') a.dir = argv[++i];
    else if (!t.startsWith('-')) a.slug = t;
  }
  return a;
}

// Tier-1 honesty gate for /eval: recompute fresh and compare to the STORED verdict.
// Catches drift, hand-editing, or a verdict that the rigor-gated engine would not
// produce. Exits non-zero if any idea fails. Reads stored from .briefdata.json.
function runCheck(dir, ids) {
  let failed = 0;
  console.log('CONVICTION CHECK (stored vs. fresh recompute)\n');
  console.log('idea'.padEnd(26), 'stored', 'fresh', 'verdict');
  for (const id of ids) {
    const fresh = convictionFor(dir, id);
    const bdPath = path.join(dir, id, '.briefdata.json');
    let stored = null;
    try { stored = (JSON.parse(fs.readFileSync(bdPath, 'utf8')).conviction) || null; } catch {}
    if (!fresh) { console.log(id.padEnd(26), 'not readable'); continue; }
    if (!stored) { console.log(id.padEnd(26), '  -  ', String(fresh.score).padStart(4), 'no stored conviction (run --write)'); continue; }
    const scoreOk = stored.score === fresh.score;
    const verdictOk = stored.verdict === fresh.verdict;
    const ok = scoreOk && verdictOk;
    if (!ok) failed++;
    console.log(
      id.padEnd(26),
      String(stored.score).padStart(5),
      String(fresh.score).padStart(5),
      ' ' + (ok ? 'OK' : `DRIFT stored=${stored.verdict} fresh=${fresh.verdict}`)
    );
  }
  console.log(`\n${failed === 0 ? 'PASS — all stored verdicts match the engine.' : 'FAIL — ' + failed + ' idea(s) drifted; re-run with --write or investigate tampering.'}`);
  return failed === 0 ? 0 : 1;
}

// Pull the conviction object out of the engine's view-model for one idea.
function convictionFor(pipelineDir, id) {
  const idea = reader.getIdea(pipelineDir, id);
  if (!idea) return null;
  return {
    score: idea.conviction,
    verdict: idea.verdict,
    evidence: idea.evidence,
    dimensions: idea.dimensions,
    gap: idea.gap,
    verdictLine: idea.verdictLine,
    computedAt: new Date().toISOString(),
  };
}

// Merge `conviction` into the idea's .briefdata.json without disturbing anything else.
function persist(pipelineDir, id, conviction) {
  const bdPath = path.join(pipelineDir, id, '.briefdata.json');
  if (!fs.existsSync(bdPath)) return { ok: false, reason: 'no .briefdata.json' };
  let bd;
  try { bd = JSON.parse(fs.readFileSync(bdPath, 'utf8')); }
  catch (e) { return { ok: false, reason: 'unparseable .briefdata.json' }; }
  bd.conviction = conviction;
  fs.writeFileSync(bdPath, JSON.stringify(bd, null, 2) + '\n', 'utf8');
  return { ok: true };
}

function main() {
  const { write, check, dir, slug } = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(dir)) { console.error('pipeline dir not found:', dir); process.exit(1); }

  const ids = slug ? [slug] : reader.listIdeas(dir).ideas.map(i => i.id);

  if (check) { process.exit(runCheck(dir, ids)); }

  console.log(`${write ? 'WRITING' : 'DRY-RUN'} conviction for ${ids.length} idea(s) in ${dir}\n`);
  console.log('idea'.padEnd(26), 'score', 'verdict'.padEnd(8), 'ev', 'gap');

  for (const id of ids) {
    const c = convictionFor(dir, id);
    if (!c) { console.log(id.padEnd(26), 'SKIPPED (not readable)'); continue; }
    console.log(
      id.padEnd(26),
      String(c.score).padStart(3),
      ' ' + String(c.verdict).padEnd(8),
      String(c.evidence) + '/5',
      (c.gap && c.gap.dim) || '-'
    );
    if (write) {
      const r = persist(dir, id, c);
      if (!r.ok) console.log('   ! not written:', r.reason);
    }
  }
  console.log(`\n${write ? 'Wrote conviction into .briefdata.json files.' : 'Dry-run only. Re-run with --write to persist.'}`);
}

main();
