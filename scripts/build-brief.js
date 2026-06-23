#!/usr/bin/env node
/**
 * build-brief.js — Brief rendering orchestrator
 *
 * Architecture:
 *   build-brief.js (this file)
 *     ├── rebuild-brief-data.js    → Extracts briefData from source .md files
 *     ├── regenerate-briefs-v2.js  → Renders brief.html from briefData
 *     └── llm-brief-fallback.js   → LLM fallback for extraction gaps (rare)
 *
 * The brief is rendered deterministically from markdown source files.
 * LLM is only used as a fallback when field extraction from markdown fails.
 * This is intentional — deterministic rendering is faster and more consistent.
 *
 * Usage:
 *   node scripts/build-brief.js <slug>                     # rebuild from source MDs
 *   node scripts/build-brief.js <slug> --data <file.json>  # merge provided briefData
 *   node scripts/build-brief.js <slug> --skeleton           # init with skeleton briefData
 *   node scripts/build-brief.js <slug> --pipeline-dir <dir> # override pipeline root
 */

const fs = require('fs');
const path = require('path');

const { buildV2Brief } = require('./regenerate-briefs-v2');
const { rebuildBriefData, extractExistingBriefData } = require('./rebuild-brief-data');
const { fillGapsWithLLM } = require('./llm-brief-fallback');

// ── Parse CLI args ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const slug = args.find(a => !a.startsWith('--'));

if (!slug) {
  console.error('Usage: build-brief.js <slug> [--skeleton | --data <file>] [--pipeline-dir <dir>]');
  process.exit(1);
}

const flagIndex = (flag) => args.indexOf(flag);
const flagValue = (flag) => {
  const i = flagIndex(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
};

const isSkeleton = args.includes('--skeleton');
const noLLM = args.includes('--no-llm');
const dataFile = flagValue('--data');
const pipelineDir = flagValue('--pipeline-dir') || path.join(__dirname, '..', 'pipeline');

// ── Resolve paths ───────────────────────────────────────────────────────────

const ideaDir = path.join(pipelineDir, slug);
if (!fs.existsSync(ideaDir)) {
  console.error(`Error: directory not found: ${ideaDir}`);
  process.exit(1);
}

const briefPath = path.join(ideaDir, 'brief.html');

// ── Build briefData ─────────────────────────────────────────────────────────

let briefData;

if (isSkeleton) {
  // Skeleton: minimal briefData with slug-derived title
  const title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  briefData = {
    title,
    slug,
    date: new Date().toISOString().slice(0, 10),
    stage: 'ground'
  };
} else if (dataFile) {
  // Merge provided JSON with existing briefData (if brief.html exists)
  if (!fs.existsSync(dataFile)) {
    console.error(`Error: data file not found: ${dataFile}`);
    process.exit(1);
  }
  const provided = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

  // Try to extract existing briefData from current brief.html
  let existing = null;
  if (fs.existsSync(briefPath)) {
    const html = fs.readFileSync(briefPath, 'utf8');
    existing = extractExistingBriefData(html);
  }

  // Merge: provided fields win, fall back to existing
  briefData = existing ? { ...existing, ...provided } : provided;
  if (!briefData.slug) briefData.slug = slug;
} else {
  // Full rebuild from source MDs
  briefData = rebuildBriefData(ideaDir, slug);
}

// ── Inject raw decision-log.md ──────────────────────────────────────────────

const logPath = path.join(ideaDir, 'decision-log.md');
if (fs.existsSync(logPath)) {
  briefData.rawDecisionLog = fs.readFileSync(logPath, 'utf8');
}

// ── LLM fallback for gaps ───────────────────────────────────────────────────

if (!isSkeleton && !noLLM) {
  briefData = fillGapsWithLLM(briefData, ideaDir, slug);
}

// ── Write briefData JSON (used by vibe-pipelines upload API) ────────────────

const briefDataPath = path.join(ideaDir, '.briefdata.json');
fs.writeFileSync(briefDataPath, JSON.stringify(briefData, null, 2), 'utf8');

// ── Conviction: one engine of record (LEAPs), computed here so the brief shows it ─
// Runs the SAME engine LEAPs uses (electron/engine), reading the just-written
// .briefdata.json + the idea's files, and merges the verdict back in.
try {
  const reader = require('../electron/engine/pipeline-reader');
  const idea = reader.getIdea(pipelineDir, slug);
  if (idea && idea.conviction != null) {
    briefData.conviction = {
      score: idea.conviction, verdict: idea.verdict, evidence: idea.evidence,
      dimensions: idea.dimensions, gap: idea.gap, verdictLine: idea.verdictLine,
      computedAt: new Date().toISOString(),
    };
    fs.writeFileSync(briefDataPath, JSON.stringify(briefData, null, 2), 'utf8');
  }
} catch (e) {
  console.warn('Conviction skipped (engine not reachable):', e.message);
}

// ── Render & write ──────────────────────────────────────────────────────────

const html = buildV2Brief(briefData, slug);
fs.writeFileSync(briefPath, html, 'utf8');
console.log(`Brief written: ${briefPath}`);
