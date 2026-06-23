#!/usr/bin/env node

/**
 * Contract Tests for Product OS Pipeline Handoffs
 *
 * Validates that completed pipeline ideas have the artifacts required
 * by the handoff schema at each stage. Checks opportunity.md structure,
 * decision-log.md format, and .state.json schema.
 *
 * Run: node evals/agent-tests/contracts.test.js
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Resolve project root (two levels up from this file)
// ---------------------------------------------------------------------------
const ROOT = path.resolve(__dirname, '..', '..');
const PIPELINE_DIR = path.join(ROOT, 'pipeline');

let passed = 0;
let failed = 0;
const failures = [];

function pass(msg) {
  console.log(`  PASS  ${msg}`);
  passed++;
}

function fail(msg) {
  console.log(`  FAIL  ${msg}`);
  failed++;
  failures.push(msg);
}

function skip(msg) {
  console.log(`  SKIP  ${msg}`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function dirExists(dirPath) {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

function dirHasFiles(dirPath, ext) {
  if (!dirExists(dirPath)) return false;
  return fs.readdirSync(dirPath).some(f => f.endsWith(ext));
}

function readFile(filePath) {
  if (!fileExists(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Detect the highest stage reached by an idea (highest wins).
 * Order: ship > prove > assess > explore > learn > empty
 * Legacy filenames (build/, define.md, sketch.md, ground.md) map forward.
 */
function detectStage(ideaDir) {
  if (dirExists(path.join(ideaDir, 'ship'))) return 'shipped';
  if (fileExists(path.join(ideaDir, 'prove.md'))) return 'proven';
  if (fileExists(path.join(ideaDir, 'assess.md'))) return 'assessed';
  if (fileExists(path.join(ideaDir, 'explore.md'))) return 'explored';
  if (fileExists(path.join(ideaDir, 'learn.md'))) return 'learned';
  // legacy
  if (dirExists(path.join(ideaDir, 'build'))) return 'shipped';
  if (fileExists(path.join(ideaDir, 'define.md'))) return 'assessed';
  if (fileExists(path.join(ideaDir, 'sketch.md'))) return 'explored';
  if (fileExists(path.join(ideaDir, 'ground.md'))) return 'learned';
  return 'empty';
}

// ---------------------------------------------------------------------------
// Discover pipeline ideas (skip archive/, non-directories, dot-files)
// ---------------------------------------------------------------------------

if (!dirExists(PIPELINE_DIR)) {
  console.log('No pipeline/ directory found. Nothing to test.');
  process.exit(0);
}

const ideaSlugs = fs.readdirSync(PIPELINE_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .filter(d => !d.name.startsWith('.'))
  .filter(d => d.name !== 'archive')
  .map(d => d.name);

if (ideaSlugs.length === 0) {
  console.log('No ideas found in pipeline/. Nothing to test.');
  process.exit(0);
}

console.log(`\nFound ${ideaSlugs.length} pipeline ideas.\n`);

// ===========================================================================
// Test each idea
// ===========================================================================

for (const slug of ideaSlugs) {
  const ideaDir = path.join(PIPELINE_DIR, slug);
  const stage = detectStage(ideaDir);

  console.log(`--- ${slug} (stage: ${stage}) ---\n`);

  if (stage === 'empty') {
    skip(`${slug}: empty directory, no artifacts to check`);
    console.log('');
    continue;
  }

  // -------------------------------------------------------------------------
  // After /1 learn: learn.md, opportunity.md, decision-log.md must exist
  // -------------------------------------------------------------------------
  if (['learned', 'explored', 'assessed', 'proven', 'shipped'].includes(stage)) {
    const learnMd = path.join(ideaDir, 'learn.md');
    if (fileExists(learnMd)) {
      pass(`${slug}: learn.md exists`);
    } else {
      fail(`${slug}: learn.md missing (required after /1)`);
    }

    const opportunityMd = path.join(ideaDir, 'opportunity.md');
    if (fileExists(opportunityMd)) {
      pass(`${slug}: opportunity.md exists`);
    } else {
      fail(`${slug}: opportunity.md missing (required after /1)`);
    }

    const decisionLog = path.join(ideaDir, 'decision-log.md');
    if (fileExists(decisionLog)) {
      pass(`${slug}: decision-log.md exists`);
    } else {
      fail(`${slug}: decision-log.md missing (required after /1)`);
    }
  }

  // -------------------------------------------------------------------------
  // After /2 explore: explore.md, sketches/ with HTML, competitors/ directory
  // -------------------------------------------------------------------------
  if (['explored', 'assessed', 'proven', 'shipped'].includes(stage)) {
    const exploreMd = path.join(ideaDir, 'explore.md');
    if (fileExists(exploreMd)) {
      pass(`${slug}: explore.md exists`);
    } else {
      fail(`${slug}: explore.md missing (required after /2)`);
    }

    const sketchesDir = path.join(ideaDir, 'sketches');
    if (dirHasFiles(sketchesDir, '.html')) {
      pass(`${slug}: sketches/ contains at least 1 .html file`);
    } else {
      fail(`${slug}: sketches/ missing or has no .html files (required after /2)`);
    }

    const competitorsDir = path.join(ideaDir, 'competitors');
    if (dirExists(competitorsDir)) {
      pass(`${slug}: competitors/ directory exists`);
    } else {
      fail(`${slug}: competitors/ directory missing (required after /2)`);
    }
  }

  // -------------------------------------------------------------------------
  // After /3 assess: assess.md
  // -------------------------------------------------------------------------
  if (['assessed', 'proven', 'shipped'].includes(stage)) {
    const assessMd = path.join(ideaDir, 'assess.md');
    if (fileExists(assessMd)) {
      pass(`${slug}: assess.md exists`);
    } else {
      fail(`${slug}: assess.md missing (required after /3)`);
    }
  }

  // -------------------------------------------------------------------------
  // After /4 prove: prove.md
  // -------------------------------------------------------------------------
  if (['proven', 'shipped'].includes(stage)) {
    const proveMd = path.join(ideaDir, 'prove.md');
    if (fileExists(proveMd)) {
      pass(`${slug}: prove.md exists`);
    } else {
      fail(`${slug}: prove.md missing (required after /4)`);
    }
  }

  // -------------------------------------------------------------------------
  // After /5 ship: ship/ directory
  // -------------------------------------------------------------------------
  if (stage === 'shipped') {
    const shipDir = path.join(ideaDir, 'ship');
    if (dirExists(shipDir)) {
      pass(`${slug}: ship/ directory exists`);
    } else {
      fail(`${slug}: ship/ directory missing (required after /5)`);
    }
  }

  // -------------------------------------------------------------------------
  // opportunity.md structure checks (if file exists)
  // -------------------------------------------------------------------------
  const oppContent = readFile(path.join(ideaDir, 'opportunity.md'));
  if (oppContent) {
    // Must have a JTBD section or an equivalent job/problem section
    // Real files use various headings: ## JTBD, ## Job, ## Prototype, ## What to build
    if (/##\s*(JTBD|Job|Prototype|What to build)/i.test(oppContent)) {
      pass(`${slug}: opportunity.md has core problem/job section`);
    } else {
      fail(`${slug}: opportunity.md missing core problem/job section (expected ## JTBD, ## Job, ## Prototype, or ## What to build)`);
    }

    // Must have some form of scoring section (## Scoring or ## Score)
    if (/##\s*Scor(ing|e|ecard)/i.test(oppContent)) {
      pass(`${slug}: opportunity.md has Scoring section`);
    } else {
      fail(`${slug}: opportunity.md missing Scoring section`);
    }
  }

  // -------------------------------------------------------------------------
  // decision-log.md format check (if file exists)
  // -------------------------------------------------------------------------
  const dlContent = readFile(path.join(ideaDir, 'decision-log.md'));
  if (dlContent) {
    // Must contain at least one Q&A entry
    // Real format: **Q1**: question text / **A1**: answer text
    if (/\*\*Q\d+\*\*\s*:/.test(dlContent)) {
      pass(`${slug}: decision-log.md has Q&A entries`);
    } else {
      fail(`${slug}: decision-log.md has no Q&A entries (expected **Q1**: ... pattern)`);
    }
  }

  // -------------------------------------------------------------------------
  // .state.json schema check (if file exists)
  // -------------------------------------------------------------------------
  const stateContent = readFile(path.join(ideaDir, '.state.json'));
  if (stateContent) {
    try {
      const state = JSON.parse(stateContent);

      if (state.skill && typeof state.skill === 'string') {
        pass(`${slug}: .state.json has valid 'skill' field`);
      } else {
        fail(`${slug}: .state.json missing or invalid 'skill' field`);
      }

      if (state.phase && typeof state.phase === 'string') {
        pass(`${slug}: .state.json has valid 'phase' field`);
      } else {
        fail(`${slug}: .state.json missing or invalid 'phase' field`);
      }

      if (state.started_at && typeof state.started_at === 'string') {
        // Loose ISO 8601 check
        if (/^\d{4}-\d{2}-\d{2}T/.test(state.started_at)) {
          pass(`${slug}: .state.json 'started_at' is ISO 8601`);
        } else {
          fail(`${slug}: .state.json 'started_at' is not ISO 8601 format`);
        }
      } else {
        fail(`${slug}: .state.json missing 'started_at' field`);
      }
    } catch (e) {
      fail(`${slug}: .state.json is not valid JSON (${e.message})`);
    }
  }

  console.log('');
}

// ===========================================================================
// Summary
// ===========================================================================

console.log('='.repeat(60));
console.log(`  TOTAL: ${passed + failed}  |  PASSED: ${passed}  |  FAILED: ${failed}`);
console.log('='.repeat(60));

if (failures.length > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log(`  - ${f}`);
  }
}

console.log('');
process.exit(failed > 0 ? 1 : 0);
