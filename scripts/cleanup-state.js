#!/usr/bin/env node
// cleanup-state.js — Scan and clean stale .state.json files in the pipeline.
// Usage:
//   node scripts/cleanup-state.js              # Clean stale sessions (>24h)
//   node scripts/cleanup-state.js --dry-run    # Show what would be cleaned
//   node scripts/cleanup-state.js --threshold 48  # Custom threshold in hours
const fs = require('fs');
const path = require('path');

const PIPELINE = path.join(__dirname, '..', 'pipeline');

// --- Argument Parsing ---

function parseArgs(argv) {
  const args = { dryRun: false, threshold: 24 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') {
      args.dryRun = true;
    } else if (argv[i] === '--threshold' && argv[i + 1]) {
      args.threshold = parseInt(argv[i + 1], 10);
      i++;
    }
  }
  return args;
}

// --- Formatting ---

function formatDuration(hours) {
  return `${Math.floor(hours)}h ago`;
}

// --- Scanner ---

function scanStateFiles(pipelineDir) {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(pipelineDir);
  } catch (e) {
    return results;
  }

  for (const entry of entries) {
    // Skip underscore-prefixed dirs, non-directories, and files
    if (entry.startsWith('_')) continue;
    const full = path.join(pipelineDir, entry);
    let stat;
    try {
      stat = fs.statSync(full);
    } catch (e) {
      continue;
    }
    if (!stat.isDirectory()) continue;

    const statePath = path.join(full, '.state.json');
    const result = { slug: entry, dir: full, hasState: false, state: null, parseError: null };

    if (fs.existsSync(statePath)) {
      result.hasState = true;
      try {
        const raw = fs.readFileSync(statePath, 'utf8');
        result.state = JSON.parse(raw);
      } catch (e) {
        result.state = null;
        result.parseError = e.message;
      }
    }

    results.push(result);
  }

  return results;
}

// --- Classification ---

function classifyState(entry, thresholdHours) {
  if (!entry.hasState) {
    return { status: 'clean' };
  }

  if (entry.parseError || entry.state === null) {
    return { status: 'invalid', reason: entry.parseError || 'null state' };
  }

  const state = entry.state;

  if (!state.started_at) {
    return { status: 'stale', reason: 'missing started_at', hoursAgo: Infinity };
  }

  const startedAt = new Date(state.started_at);
  const hoursAgo = (Date.now() - startedAt.getTime()) / (1000 * 60 * 60);

  if (hoursAgo > thresholdHours) {
    return { status: 'stale', hoursAgo };
  }

  return { status: 'active', hoursAgo };
}

// --- Removal ---

function removeStateFile(ideaDir, dryRun, state, thresholdHours) {
  const statePath = path.join(ideaDir, '.state.json');

  if (dryRun) return;

  // Create backup
  const backupPath = path.join(ideaDir, '.state.json.bak');
  fs.copyFileSync(statePath, backupPath);

  // Remove original
  fs.unlinkSync(statePath);

  // Append to decision-log.md if it exists
  if (state) {
    const logPath = path.join(ideaDir, 'decision-log.md');
    if (fs.existsSync(logPath)) {
      const date = new Date().toISOString().slice(0, 10);
      const skill = (state.skill || 'unknown').replace(/^\/+/, '');
      const entry = `\n## Auto-cleanup — ${date}\n**Auto-cleared stale lock**: /${skill} started ${state.started_at || 'unknown'}, expired after ${thresholdHours || 24}h\n`;
      fs.appendFileSync(logPath, entry, 'utf8');
    }
  }
}

// --- Main ---

function main() {
  const args = parseArgs(process.argv.slice(2));
  const pipelineDir = PIPELINE;

  const entries = scanStateFiles(pipelineDir);

  if (entries.length === 0) {
    console.log('No pipeline ideas found.');
    return;
  }

  let staleCount = 0;
  let activeCount = 0;
  let cleanCount = 0;
  let invalidCount = 0;

  console.log('State Cleanup Report');
  console.log('====================');
  if (args.dryRun) console.log('(DRY RUN — no files will be modified)\n');
  else console.log('');

  for (const entry of entries) {
    const classification = classifyState(entry, args.threshold);

    if (classification.status === 'clean') {
      console.log(`${entry.slug}: no .state.json`);
      console.log('  → CLEAN\n');
      cleanCount++;
    } else if (classification.status === 'invalid') {
      console.log(`${entry.slug}: .state.json found`);
      console.log(`  Invalid JSON: ${classification.reason}`);
      console.log(`  → ${args.dryRun ? 'WOULD REMOVE' : 'REMOVED'} (invalid)\n`);
      removeStateFile(entry.dir, args.dryRun, null, args.threshold);
      invalidCount++;
    } else if (classification.status === 'stale') {
      const state = entry.state || {};
      console.log(`${entry.slug}: .state.json found`);
      console.log(`  Skill: ${state.skill || 'unknown'}, Phase: ${state.phase || 'unknown'}`);
      if (classification.reason === 'missing started_at') {
        console.log('  Started: unknown (missing started_at)');
      } else {
        console.log(`  Started: ${state.started_at} (${formatDuration(classification.hoursAgo)})`);
      }
      console.log(`  → ${args.dryRun ? 'WOULD REMOVE' : 'REMOVED'} (stale, >${args.threshold}h)\n`);
      removeStateFile(entry.dir, args.dryRun, state, args.threshold);
      staleCount++;
    } else if (classification.status === 'active') {
      const state = entry.state;
      console.log(`${entry.slug}: .state.json found`);
      console.log(`  Skill: ${state.skill}, Phase: ${state.phase}`);
      console.log(`  Started: ${state.started_at} (${formatDuration(classification.hoursAgo)})`);
      console.log('  → KEPT (active session)\n');
      activeCount++;
    }
  }

  const parts = [];
  if (staleCount > 0) parts.push(`${staleCount} stale session${staleCount > 1 ? 's' : ''} ${args.dryRun ? 'would be removed' : 'removed'}`);
  if (invalidCount > 0) parts.push(`${invalidCount} invalid file${invalidCount > 1 ? 's' : ''} ${args.dryRun ? 'would be removed' : 'removed'}`);
  if (activeCount > 0) parts.push(`${activeCount} active session${activeCount > 1 ? 's' : ''}`);
  if (cleanCount > 0) parts.push(`${cleanCount} clean`);

  console.log(`Summary: ${parts.join(', ')}`);
}

if (require.main === module) main();

module.exports = { scanStateFiles, classifyState, removeStateFile, formatDuration, parseArgs };

// TODO (after 2026-07-01): Delete these migration scripts that are no longer needed:
//   - scripts/migrate-brief-sources.js
//   - scripts/migrate-brief-sources.test.js
//   - scripts/normalize-decision-logs.js
//   - scripts/normalize-decision-logs.test.js
