/**
 * Phase-check registry for Product OS background auto-eval.
 *
 * Each pipeline skill maps to a list of deterministic structural checks run
 * against whatever artifacts currently exist in the idea directory. This is a
 * CURATED SUBSET of the full Layer-1 check list (see
 * .claude/skills/eval/SKILL.md and _shared/templates/verify-*.md) — the high
 * signal, unambiguous, no-LLM checks. The deep LLM-as-Judge eval that runs at
 * skill completion covers the rest.
 *
 * A check returns:
 *   true   -> pass
 *   false  -> fail
 *   null   -> not applicable yet (artifact missing — expected in early phases)
 *
 * The runner snapshots the idea's structural health at each phase boundary, so
 * checks naturally go from null -> pass/fail as a skill produces its artifacts.
 */

'use strict';

// Citation tags used across artifacts: [pm], [data: ...], [context: ...],
// [web: ...], [inferred], [scout: ...]
const CITATION_RE = /\[(pm\]|data:|context:|web:|inferred\]|scout:)/i;

/**
 * Build the per-check execution context for one idea directory.
 * `read(file)` returns file contents or null; `exists(file)` is a bool;
 * `count(subdir, suffix)` counts matching files in a subdirectory.
 */
function makeChecks(read, exists, count) {
  // `gate(file, fn)` => returns null when the file is absent (not-applicable),
  // otherwise the boolean result of fn(content).
  const gate = (file, fn) => {
    const content = read(file);
    if (content === null) return null;
    return fn(content);
  };

  return {
    // ── /1 learn ──────────────────────────────────────────────────────────
    ground: [
      ['learn.md exists & non-empty', () => exists('learn.md') ? read('learn.md').trim().length > 0 : null],
      ['learn.md JTBD is a single sentence', () => gate('learn.md', c => {
        // Field form (**JTBD**: ...) or heading form (### JTBD \n <statement>).
        const field = c.match(/\*\*JTBD\*\*:\s*(.+)/);
        if (field) return field[1].trim().length > 0;
        const heading = c.match(/###\s*JTBD\s*\n+\s*([^\n]+)/);
        return heading ? heading[1].trim().length > 0 : false;
      })],
      ['learn.md has citation tags', () => gate('learn.md', c => CITATION_RE.test(c))],
      ['learn.md opportunity size names a metric type', () => gate('learn.md', c => {
        const m = c.match(/\*\*Opportunity size\*\*:[^\n]*/i);
        return m ? /\((GMV|Revenue|Profit|Cost Savings|AOV[^)]*)\)/i.test(m[0]) : false;
      })],
      ['opportunity.md exists', () => exists('opportunity.md') ? true : null],
      ['opportunity.md has Scoring (Impact/Complexity/Confidence)', () => gate('opportunity.md', c =>
        /\*\*Impact\*\*/.test(c) && /\*\*Complexity\*\*/.test(c) && /\*\*Confidence\*\*/.test(c))],
      ['summary.md exists', () => exists('summary.md') ? true : null],
    ],

    // ── /2 explore ──────────────────────────────────────────────────────────
    sketch: [
      ['explore.md exists', () => exists('explore.md') ? true : null],
      ['explore.md has a mermaid journey diagram', () => gate('explore.md', c => /```mermaid/.test(c))],
      ['explore.md names a chosen direction', () => gate('explore.md', c => /Direction Chosen/i.test(c))],
      ['>= 3 variation-*.html files', () => exists('sketches') ? count('sketches', /^variation-.*\.html$/) >= 3 : null],
      ['sketches/final-showcase.html exists', () => exists('sketches') ? exists('sketches/final-showcase.html') : null],
      ['sketches/index.html exists', () => exists('sketches') ? exists('sketches/index.html') : null],
      ['variations.md names a Chosen Direction', () => gate('variations.md', c => /Chosen Direction/i.test(c))],
    ],

    // ── /3 assess ──────────────────────────────────────────────────────────
    define: [
      ['assess.md exists', () => exists('assess.md') ? true : null],
      ['assess.md has Kill Criteria', () => gate('assess.md', c => /Kill Criteria/i.test(c))],
      ['assess.md baselines cite a source', () => gate('assess.md', c => /\[data:/i.test(c) || /baseline/i.test(c))],
      ['metrics.md has a North Star', () => gate('metrics.md', c => /North Star/i.test(c))],
      ['scope.md has Build and Don\'t Build', () => gate('scope.md', c => /Build/i.test(c) && /Don'?t Build/i.test(c))],
    ],

    // ── /4 prove ─────────────────────────────────────────────────────────
    explore: [
      ['prove.md exists', () => exists('prove.md') ? true : null],
      ['prove.md has a Feasibility Assessment', () => gate('prove.md', c => /Feasibility Assessment/i.test(c))],
      ['prove.md has Competing Directions', () => gate('prove.md', c => /Competing Directions/i.test(c))],
      ['prove.md names a Recommended Direction', () => gate('prove.md', c => /Recommended Direction/i.test(c))],
      ['prove.md has a Risk Register', () => gate('prove.md', c => /Risk Register/i.test(c))],
      ['feasibility.md exists', () => exists('feasibility.md') ? true : null],
    ],

    // ── /5 ship ───────────────────────────────────────────────────────────
    build: [
      ['ship/ directory exists', () => exists('ship') ? true : null],
      ['ship/prototype.html exists', () => exists('ship') ? exists('ship/prototype.html') : null],
      ['ship/showcase.html exists', () => exists('ship') ? exists('ship/showcase.html') : null],
      ['ship/release-checklist.md exists', () => exists('ship') ? exists('ship/release-checklist.md') : null],
    ],

    // ── /landscape ─────────────────────────────────────────────────────────
    landscape: [
      ['a *-landscape.md file exists', () => count('.', /-landscape\.md$/) >= 1 ? true : null],
    ],
  };
}

/** Normalize a .state.json `skill` field ("/4 prove", "/2 explore") to a key. */
function skillKey(skillField) {
  if (!skillField) return null;
  const m = String(skillField).match(/([a-z-]+)\s*$/i);
  return m ? m[1].toLowerCase() : null;
}

module.exports = { makeChecks, skillKey, CITATION_RE };
