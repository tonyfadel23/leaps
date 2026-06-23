#!/usr/bin/env node

/**
 * Background per-phase auto-eval for Product OS.
 *
 * Invoked by a PostToolUse(Write) hook whenever a `pipeline/{slug}/.state.json`
 * is written. Detects newly-reached phases by diffing the state file against
 * the idea's own `eval/.eval-state.json`, runs the deterministic structural
 * checks for the active skill (scripts/lib/phase-checks.js) against whatever
 * artifacts exist, and appends one JSON line per phase to
 * `pipeline/{slug}/eval/phase-checks.jsonl`.
 *
 * No LLM. Fast. Idempotent. NEVER blocks or fails the session — always exits 0.
 *
 * Usage (from the hook):  node scripts/run-phase-eval.js "$TOOL_INPUT"
 * The argument is the Write tool's input JSON (contains `file_path`).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { makeChecks, skillKey } = require('./lib/phase-checks');

const ROOT = path.resolve(__dirname, '..');

function safeExit() { process.exit(0); }

// Any unexpected error must not surface to the user or block the session.
process.on('uncaughtException', safeExit);

function main() {
  // ── Resolve the written file path from the tool input ────────────────────
  const raw = process.argv[2] || process.env.TOOL_INPUT || '';
  let filePath = '';
  try {
    filePath = (JSON.parse(raw).file_path) || '';
  } catch {
    const m = raw.match(/"file_path"\s*:\s*"([^"]+)"/);
    if (m) filePath = m[1];
  }
  if (!filePath) return;

  // Only act on a pipeline idea's .state.json
  const norm = filePath.replace(/\\/g, '/');
  const match = norm.match(/pipeline\/([^/]+)\/\.state\.json$/);
  if (!match) return;
  const slug = match[1];

  const ideaDir = path.join(ROOT, 'pipeline', slug);
  const statePath = path.join(ideaDir, '.state.json');
  if (!fs.existsSync(statePath)) return;

  let state;
  try {
    state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return; // mid-write / malformed — try again on the next write
  }

  const skill = state.skill || '';
  const key = skillKey(skill);
  if (!key) return;

  // Phases "reached" = everything completed plus the current phase. This is
  // robust to skills that don't fully maintain completed_phases: each
  // .state.json write marks a phase boundary, and we snapshot at that point.
  const reached = [...(state.completed_phases || []), state.phase].filter(Boolean);
  if (reached.length === 0) return;

  // ── Per-idea eval folder + bookkeeping ───────────────────────────────────
  const evalDir = path.join(ideaDir, 'eval');
  if (!fs.existsSync(evalDir)) fs.mkdirSync(evalDir, { recursive: true });

  const bookkeepPath = path.join(evalDir, '.eval-state.json');
  let evaluated = [];
  if (fs.existsSync(bookkeepPath)) {
    try { evaluated = JSON.parse(fs.readFileSync(bookkeepPath, 'utf8')).evaluated || []; } catch { evaluated = []; }
  }
  const evaluatedSet = new Set(evaluated);

  // Composite key so the same phase name across different skills is distinct.
  const compositeKey = phase => `${key}:${phase}`;
  const newPhases = reached.filter(p => !evaluatedSet.has(compositeKey(p)));
  if (newPhases.length === 0) return;

  // ── Run the skill's checks against current artifacts ─────────────────────
  const read = file => {
    const p = path.join(ideaDir, file);
    try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
  };
  const exists = file => fs.existsSync(path.join(ideaDir, file));
  const count = (subdir, re) => {
    const p = path.join(ideaDir, subdir);
    try { return fs.readdirSync(p).filter(f => re.test(f)).length; } catch { return 0; }
  };

  const checks = makeChecks(read, exists, count)[key] || [];
  const ts = new Date().toISOString();
  const lines = [];

  for (const phase of newPhases) {
    let passed = 0, failed = 0, skipped = 0;
    const failures = [];
    for (const [id, fn] of checks) {
      let result;
      try { result = fn(); } catch { result = null; }
      if (result === true) passed++;
      else if (result === false) { failed++; failures.push(id); }
      else skipped++;
    }
    lines.push(JSON.stringify({ ts, slug, skill, phase, passed, failed, skipped, failures }));
    evaluatedSet.add(compositeKey(phase));
  }

  // ── Persist ──────────────────────────────────────────────────────────────
  fs.appendFileSync(path.join(evalDir, 'phase-checks.jsonl'), lines.join('\n') + '\n', 'utf8');
  fs.writeFileSync(bookkeepPath, JSON.stringify({ evaluated: [...evaluatedSet] }, null, 2), 'utf8');
}

try { main(); } catch { /* never block */ }
safeExit();
