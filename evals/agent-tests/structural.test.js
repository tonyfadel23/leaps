#!/usr/bin/env node

/**
 * Structural Tests for Product OS Agents & Protocols
 *
 * Validates that agent files, protocol files, and SKILL.md entry points
 * exist and have the required structure. No test framework needed --
 * plain Node.js with a pass/fail summary.
 *
 * Run: node evals/agent-tests/structural.test.js
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Resolve project root (two levels up from this file)
// ---------------------------------------------------------------------------
const ROOT = path.resolve(__dirname, '..', '..');
const SKILLS_DIR = path.join(ROOT, '.claude', 'skills');
const AGENTS_DIR = path.join(ROOT, '.claude', 'agents');
const PROTOCOLS_DIR = path.join(SKILLS_DIR, '_shared', 'protocols');

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively find files matching a pattern under a directory. */
function findFiles(dir, pattern, results = []) {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findFiles(full, pattern, results);
    } else if (pattern.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

/** True when a file exists and has more than whitespace content. */
function isNonEmpty(filePath) {
  if (!fs.existsSync(filePath)) return false;
  return fs.readFileSync(filePath, 'utf8').trim().length > 0;
}

// ===========================================================================
// 1. Agent files -- non-empty with content beyond frontmatter
// ===========================================================================

console.log('\n--- Agent Files ---\n');

// Collect agent files from two locations:
//   .claude/skills/*/agents/*.md
//   .claude/agents/*.md
const agentFiles = [];

// Skill-scoped agents
const skillDirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory() && d.name !== '_shared')
  .map(d => path.join(SKILLS_DIR, d.name, 'agents'));

for (const agentDir of skillDirs) {
  if (fs.existsSync(agentDir)) {
    const files = fs.readdirSync(agentDir).filter(f => f.endsWith('.md'));
    for (const f of files) {
      agentFiles.push(path.join(agentDir, f));
    }
  }
}

// Top-level agents
if (fs.existsSync(AGENTS_DIR)) {
  const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));
  for (const f of files) {
    agentFiles.push(path.join(AGENTS_DIR, f));
  }
}

if (agentFiles.length === 0) {
  fail('No agent files found');
} else {
  pass(`Found ${agentFiles.length} agent files`);
}

for (const agentFile of agentFiles) {
  const rel = path.relative(ROOT, agentFile);
  if (!isNonEmpty(agentFile)) {
    fail(`Agent file is empty: ${rel}`);
    continue;
  }

  // Check that there is content beyond YAML frontmatter.
  // Frontmatter is delimited by --- ... ---. Content should follow.
  const raw = fs.readFileSync(agentFile, 'utf8');
  const stripped = raw.replace(/^---[\s\S]*?---\s*/m, '').trim();
  if (stripped.length < 20) {
    fail(`Agent file has no meaningful content after frontmatter: ${rel}`);
  } else {
    pass(`Agent file has content: ${rel}`);
  }
}

// ===========================================================================
// 2. SKILL.md entry points -- all expected skills present
// ===========================================================================

console.log('\n--- SKILL.md Entry Points ---\n');

// 5 core stages + 8 utilities. (sync-design, compare, share were merged into
// flags: /setup --sync-design, /pipeline --rank, /prd --publish.)
const EXPECTED_SKILLS = [
  'learn', 'explore', 'assess', 'prove', 'ship',
  'setup', 'prd', 'eval', 'grill-me',
  'landscape', 'pipeline', 'import', 'archive',
];

for (const skill of EXPECTED_SKILLS) {
  const skillMd = path.join(SKILLS_DIR, skill, 'SKILL.md');
  if (fs.existsSync(skillMd) && isNonEmpty(skillMd)) {
    pass(`SKILL.md exists: ${skill}/SKILL.md`);
  } else {
    fail(`Missing or empty SKILL.md: ${skill}/SKILL.md`);
  }
}

// ===========================================================================
// 3. Agent references in SKILL.md files resolve to real files
// ===========================================================================

console.log('\n--- Agent References in SKILL.md ---\n');

// Patterns that reference agent files in SKILL.md:
//   agents/some-name.md
//   ../other-skill/agents/some-name.md  (cross-skill relative path)
//   .claude/agents/some-name.md
const AGENT_REF_PATTERN = /(?:(?:\.\.\/[\w-]+\/)?agents\/[\w-]+\.md|\.claude\/agents\/[\w-]+\.md)/g;

const skillMdFiles = findFiles(SKILLS_DIR, /^SKILL\.md$/);

for (const skillMd of skillMdFiles) {
  const skillName = path.basename(path.dirname(skillMd));
  const skillDir = path.dirname(skillMd);
  const content = fs.readFileSync(skillMd, 'utf8');
  const refs = content.match(AGENT_REF_PATTERN) || [];

  // Deduplicate references
  const uniqueRefs = [...new Set(refs)];

  for (const ref of uniqueRefs) {
    let resolvedPath;
    if (ref.startsWith('.claude/')) {
      // Absolute reference from project root
      resolvedPath = path.join(ROOT, ref);
    } else if (ref.startsWith('../')) {
      // Relative path from the SKILL.md's own directory
      resolvedPath = path.resolve(skillDir, ref);
    } else {
      // Relative to the skill directory
      resolvedPath = path.join(SKILLS_DIR, skillName, ref);
    }

    if (fs.existsSync(resolvedPath)) {
      pass(`Agent ref resolves: ${skillName}/SKILL.md -> ${ref}`);
    } else {
      fail(`Broken agent ref: ${skillName}/SKILL.md -> ${ref} (expected at ${path.relative(ROOT, resolvedPath)})`);
    }
  }
}

// ===========================================================================
// 4. Protocol references in SKILL.md files resolve to real files
// ===========================================================================

console.log('\n--- Protocol References in SKILL.md ---\n');

const PROTOCOL_REF_PATTERN = /protocols\/[\w-]+\.md/g;

for (const skillMd of skillMdFiles) {
  const skillName = path.basename(path.dirname(skillMd));
  const content = fs.readFileSync(skillMd, 'utf8');
  const refs = content.match(PROTOCOL_REF_PATTERN) || [];

  const uniqueRefs = [...new Set(refs)];

  for (const ref of uniqueRefs) {
    const resolvedPath = path.join(SKILLS_DIR, '_shared', ref);
    if (fs.existsSync(resolvedPath)) {
      pass(`Protocol ref resolves: ${skillName}/SKILL.md -> ${ref}`);
    } else {
      fail(`Broken protocol ref: ${skillName}/SKILL.md -> ${ref} (expected at ${path.relative(ROOT, resolvedPath)})`);
    }
  }
}

// ===========================================================================
// 5. All protocol files are non-empty
// ===========================================================================

console.log('\n--- Protocol Files ---\n');

if (fs.existsSync(PROTOCOLS_DIR)) {
  const protocolFiles = fs.readdirSync(PROTOCOLS_DIR).filter(f => f.endsWith('.md'));

  if (protocolFiles.length === 0) {
    fail('No protocol files found in _shared/protocols/');
  } else {
    pass(`Found ${protocolFiles.length} protocol files`);
  }

  for (const pf of protocolFiles) {
    const fullPath = path.join(PROTOCOLS_DIR, pf);
    if (isNonEmpty(fullPath)) {
      pass(`Protocol file non-empty: ${pf}`);
    } else {
      fail(`Protocol file is empty: ${pf}`);
    }
  }
} else {
  fail('Protocols directory missing: .claude/skills/_shared/protocols/');
}

// ===========================================================================
// 6. Template references in skill files resolve to real files
// ===========================================================================

console.log('\n--- Template References in skills ---\n');

const TEMPLATE_REF_PATTERN = /templates\/[\w-]+\.md/g;
const allSkillFiles = findFiles(SKILLS_DIR, /\.md$/);
const templateRefs = new Set();
for (const f of allSkillFiles) {
  const content = fs.readFileSync(f, 'utf8');
  for (const ref of content.match(TEMPLATE_REF_PATTERN) || []) templateRefs.add(ref);
}
for (const ref of [...templateRefs].sort()) {
  const resolved = path.join(SKILLS_DIR, '_shared', ref);
  if (fs.existsSync(resolved)) {
    pass(`Template ref resolves: ${ref}`);
  } else {
    fail(`Broken template ref: ${ref} (expected at .claude/skills/_shared/${ref})`);
  }
}

// ===========================================================================
// Summary
// ===========================================================================

console.log('\n' + '='.repeat(60));
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
