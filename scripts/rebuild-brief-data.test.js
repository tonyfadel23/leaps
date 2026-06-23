const assert = require('assert');
const path = require('path');
const fs = require('fs');

// ─── Test Helpers ────────────────────────────────────────────────────────────

const FIXTURES_DIR = path.join(__dirname, '__test_fixtures_rebuild__');

function setupFixture(slug, files) {
  const dir = path.join(FIXTURES_DIR, slug);
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    if (name.includes('/')) {
      fs.mkdirSync(path.join(dir, path.dirname(name)), { recursive: true });
    }
    fs.writeFileSync(path.join(dir, name), content, 'utf8');
  }
  return dir;
}

function cleanFixtures() {
  if (fs.existsSync(FIXTURES_DIR)) {
    fs.rmSync(FIXTURES_DIR, { recursive: true, force: true });
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

let parsers;

function loadModule() {
  // Clear require cache so we can reload
  delete require.cache[require.resolve('./rebuild-brief-data')];
  parsers = require('./rebuild-brief-data');
}

// ── Setup/Teardown ──

cleanFixtures();
fs.mkdirSync(FIXTURES_DIR, { recursive: true });
loadModule();

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  OK  ${name}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err.message}`);
    if (err.stack) {
      const lines = err.stack.split('\n').slice(1, 3);
      lines.forEach(l => console.log(`        ${l.trim()}`));
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// parseSummary tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n── parseSummary ──');

test('extracts betHeadline from ## Bet section', () => {
  const result = parsers.parseSummary(`## Bet
Let users auto-refill medications — never miss a dose.

## Evidence Narrative
`);
  assert.strictEqual(result.betHeadline, 'Let users auto-refill medications — never miss a dose.');
});

test('extracts betHeadline from ## Bet Headline section', () => {
  const result = parsers.parseSummary(`## Bet Headline
GCC users want breakfast before work.

## Executive Summary
`);
  assert.strictEqual(result.betHeadline, 'GCC users want breakfast before work.');
});

test('extracts occasionLabel', () => {
  const result = parsers.parseSummary(`## Bet
Test
Occasion label: Morning Breakfast
Opportunity label: Curation Gap
`);
  assert.strictEqual(result.occasionLabel, 'Morning Breakfast');
  assert.strictEqual(result.opportunityLabel, 'Curation Gap');
});

test('extracts executiveSummary as array of objects', () => {
  const result = parsers.parseSummary(`## Evidence Narrative
1. **23K pharmacy customers** — the pharmacy base exists [Looker QC](data: Looker your-data-model)
2. **~EUR 83M potential** — if pharmacy grows 10x [Derived](data: derived from Looker)
3. **No GCC player offers auto-refill** — proves model works [Competitor](web: Amazon)
`);
  assert.strictEqual(result.executiveSummary.length, 3);
  assert.ok(result.executiveSummary[0].text.includes('23K pharmacy customers'));
  assert.ok(result.executiveSummary[0].source.includes('Looker'));
});

test('extracts keyNumbers from Impact section', () => {
  const result = parsers.parseSummary(`## Impact
- Opportunity size: ~$13.7M/month (GMV)
- Complexity: L — cross-vertical
- Confidence: Yellow — behavioral data strong
`);
  assert.strictEqual(result.keyNumbers.opportunity, '~$13.7M/month');
  assert.strictEqual(result.keyNumbers.metricType, 'GMV');
  assert.strictEqual(result.keyNumbers.complexity, 'L');
});

test('extracts confidence from Impact section', () => {
  const result = parsers.parseSummary(`## Impact
- Confidence: Red-Yellow — three critical gaps remain
`);
  assert.strictEqual(result.confidence.color, 'yellow');
  assert.ok(result.confidence.reason.includes('three critical gaps'));
});

test('extracts seeking and producer', () => {
  const result = parsers.parseSummary(`## Seeking
Alignment on problem framing.

## Producer
Sample PM

## Pipeline Cost
`);
  assert.strictEqual(result.seeking, 'Alignment on problem framing.');
  assert.strictEqual(result.producer, 'Sample PM');
});

test('extracts keyNumbers from Key Numbers section', () => {
  const result = parsers.parseSummary(`## Key Numbers
- Opportunity: ~$13.7M/month incremental GMV in UAE
- Affected: ~48K daily morning orders
- Complexity: L
`);
  assert.ok(result.keyNumbers.opportunity.includes('$13.7M'));
  assert.strictEqual(result.keyNumbers.complexity, 'L');
});

// ═══════════════════════════════════════════════════════════════════════════
// parseOutcomes tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n── parseOutcomes ──');

test('extracts job text', () => {
  const result = parsers.parseOutcomes(`## Job
Receive meds on a schedule without manual reordering.

## Occasion
`);
  assert.strictEqual(result.job, 'Receive meds on a schedule without manual reordering.');
});

test('extracts occasion as structured object', () => {
  const result = parsers.parseOutcomes(`## Occasion
| Dimension | Value | Evidence |
|-----------|-------|----------|
| Time | Monthly | Chronic meds in 30-day supplies |
| Social | Solo | Individual health management |
| Need | Routine + Urgent | Predictable refill |
| Struggle | Accessibility + Decision | Remembering to reorder |
`);
  assert.ok(result.occasion);
  assert.strictEqual(result.occasion.time, 'Monthly');
  assert.strictEqual(result.occasion.social, 'Solo');
});

test('extracts outcome map tables', () => {
  const result = parsers.parseOutcomes(`## Outcome Map
### Discover
| # | Outcome | I | S | Opp | Source |
|---|---------|---|---|-----|--------|
| 1 | Minimize time to find meds | 4 | 3 | 2.0 | [pm] |
| 2 | Minimize wrong dosage | 5 | 2 | 3.75 | [pm] |

### Decide
| # | Outcome | I | S | Opp | Source |
|---|---------|---|---|-----|--------|
| 3 | Compare pricing | 3 | 2 | 2.25 | [pm] |

### Do
| # | Outcome | I | S | Opp | Source |
|---|---------|---|---|-----|--------|
| 5 | Minimize steps to reorder | 5 | 1 | 5.0 | [pm] |

### Resolve
| # | Outcome | I | S | Opp | Source |
|---|---------|---|---|-----|--------|
| 8 | Resolve delivery issue | 4 | 2 | 3.0 | [pm] |
`);
  assert.strictEqual(result.outcomeMap.discover.length, 2);
  assert.strictEqual(result.outcomeMap.decide.length, 1);
  assert.strictEqual(result.outcomeMap.do.length, 1);
  assert.strictEqual(result.outcomeMap.resolve.length, 1);
  assert.strictEqual(result.outcomeMap.discover[0].num, '1');
  assert.strictEqual(result.outcomeMap.discover[0].text, 'Minimize time to find meds');
  assert.strictEqual(result.outcomeMap.discover[0].opp, '2.0');
});

test('extracts topOutcomes', () => {
  const result = parsers.parseOutcomes(`## Top Underserved Outcomes (Opp >= 3.0)
1. **#4** Maximize confidence in stock — **5.0** [pm] — No proactive stock check
2. **#5** Minimize steps to reorder — **5.0** [pm] — Full manual flow
3. **#7** Minimize medication gap — **5.0** [pm] — No scheduling
`);
  assert.strictEqual(result.topOutcomes.length, 3);
  assert.strictEqual(result.topOutcomes[0].num, 4);
  assert.strictEqual(result.topOutcomes[0].opp, 5.0);
});

// ═══════════════════════════════════════════════════════════════════════════
// parseDecisions tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n── parseDecisions ──');

test('extracts resolved decisions table', () => {
  const result = parsers.parseDecisions(`## Resolved Decisions
| # | Decision | Why | When |
|---|----------|-----|------|
| 1 | UAE first | Largest base | Strategy |
| 2 | Water as wedge | Clean test | Strategy |
`);
  assert.strictEqual(result.decisions.length, 2);
  assert.strictEqual(result.decisions[0].num, 1);
  assert.strictEqual(result.decisions[0].decision, 'UAE first');
  assert.strictEqual(result.decisions[0].why, 'Largest base');
  assert.strictEqual(result.decisions[0].when, 'Strategy');
});

test('extracts Key Decisions table too', () => {
  const result = parsers.parseDecisions(`## Key Decisions
| # | Decision | Why | When |
|---|----------|-----|------|
| 1 | Full cross-vertical | Grocery is 32% | Strategy |
`);
  assert.strictEqual(result.decisions.length, 1);
  assert.strictEqual(result.decisions[0].decision, 'Full cross-vertical');
});

test('extracts open questions', () => {
  const result = parsers.parseDecisions(`## Open Questions
| Question | Owner | Status |
|----------|-------|--------|
| Will customers order? | User Research | Open |
| Morning supply sufficient? | Vendor | Open |
`);
  assert.strictEqual(result.openQuestions.length, 2);
  assert.strictEqual(result.openQuestions[0].question, 'Will customers order?');
  assert.strictEqual(result.openQuestions[0].status, 'Open');
});

test('extracts open questions with # column too', () => {
  const result = parsers.parseDecisions(`## Open Questions
| # | Question | Raised in | Owner | Status |
|---|----------|-----------|-------|--------|
| 1 | Can we store rx? | /1 Ground | Legal | Open |
`);
  assert.strictEqual(result.openQuestions.length, 1);
  assert.strictEqual(result.openQuestions[0].question, 'Can we store rx?');
  assert.strictEqual(result.openQuestions[0].status, 'Open');
});

test('extracts decision log', () => {
  const result = parsers.parseDecisions(`## Decision Log

### /1 Ground — 2026-06-05

**Q1**: What type of input is this?
**A1**: Conviction idea. This is a thesis. [inferred]

**Q2**: Who is the primary segment?
**A2**: Chronic patients. [inferred]

### /2 Sketch — 2026-06-05

**Q8**: What are the variation dimensions?
**A8**: Varying along prescription model. [inferred]
`);
  assert.strictEqual(result.decisionLog.length, 2);
  assert.strictEqual(result.decisionLog[0].skill, '/1 Ground');
  assert.strictEqual(result.decisionLog[0].date, '2026-06-05');
  assert.strictEqual(result.decisionLog[0].entries.length, 2);
  assert.strictEqual(result.decisionLog[0].entries[0].q, 'What type of input is this?');
  assert.ok(result.decisionLog[0].entries[0].a.includes('Conviction idea'));
});

// ═══════════════════════════════════════════════════════════════════════════
// parseScope tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n── parseScope ──');

test('extracts whatToBuild, dontBuild, and later', () => {
  const result = parsers.parseScope(`## Build
- Browse curated bundles
- Tap into bundle detail

## Don't Build
- Full homepage transformation
- Schedule-ahead ordering

## Later
- Time-aware homepage (Phase 2 — after bundle adoption)
- Merchant-curated bundles (Phase 3 — needs merchant tools)
`);
  assert.strictEqual(result.whatToBuild.length, 2);
  assert.strictEqual(result.whatToBuild[0], 'Browse curated bundles');
  assert.strictEqual(result.dontBuild.length, 2);
  assert.strictEqual(result.later.length, 2);
  assert.strictEqual(result.later[0].phase, 'Phase 2');
  assert.ok(result.later[0].item.includes('Time-aware homepage'));
});

// ═══════════════════════════════════════════════════════════════════════════
// parseResearchPlan tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n── parseResearchPlan ──');

test('extracts research plan fields', () => {
  const result = parsers.parseResearchPlan(`# Research Plan: test

## Why
We have no direct customer evidence.

## Research Questions
1. Do patients experience gaps?
2. What verification models do regulators accept?

## Recommended Methods

### User Interviews (8-10 participants)
- Details about interviews

### Behavioral Data Pull
- What to pull from Looker

## Timeline
- Week 1: Pull data
- Week 2: Interviews

## What "enough evidence" looks like
5+ participants confirm medication gaps

### Completion Status
- [ ] User interviews — 0/8
- [x] Behavioral data pulled
`);
  assert.ok(result);
  assert.ok(result.why.includes('no direct customer evidence'));
  assert.strictEqual(result.questions.length, 2);
  assert.ok(result.questions[0].includes('patients experience gaps'));
  assert.strictEqual(result.methods.length, 2);
  assert.ok(result.methods[0].name.includes('User Interviews'));
  assert.ok(result.timeline.includes('Week 1'));
  assert.ok(result.exitCriteria.includes('5+ participants'));
  assert.strictEqual(result.status.length, 2);
  assert.strictEqual(result.status[0].done, false);
  assert.strictEqual(result.status[1].done, true);
});

// ═══════════════════════════════════════════════════════════════════════════
// parseFeasibility tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n── parseFeasibility ──');

test('extracts feasibility components', () => {
  const result = parsers.parseFeasibility(`## Feasibility Score

### Component Scores
| Component | Effort (1/2/4/8) | Deps (0-3) | Risk (1.0/1.5/2.0) | Criticality (1.0/1.5/2.0) | AI Ready (0.5/0.75/1.0) | Score | Driver |
|-----------|------------------|------------|---------------------|---------------------------|-------------------------|-------|--------|
| OTC Catalog | 2 | 1 | 1.0 | 1.0 | 1.0 | 4.0 | Existing category |
| Scheduler | 4 | 1 | 1.5 | 1.5 | 1.0 | 18.0 | Core new capability |

### Coordination
- Teams involved: 5 — NV, Fintech, Platform, Legal, Pharmacy
- Coordination factor: 2.0 (4+ teams)

### Total
> (4.0 + 18.0) x 2.0 = **44.0**

### Bottleneck Analysis
Scheduler drives 82% of cost.

## Risk Register
| Risk | Likelihood | Impact | Mitigation | Owner |
|------|------------|--------|------------|-------|
| Regulator denial | Medium | Critical | Start scoping immediately | Legal |

## Dependencies
| Dependency | Type | Blocks | Owner | Status |
|-----------|------|--------|-------|--------|
| DHA scoping | Regulatory | Phase 2 | Legal | Open |
`);
  assert.ok(result);
  assert.strictEqual(result.components.length, 2);
  assert.strictEqual(result.components[0].component, 'OTC Catalog');
  assert.strictEqual(result.teamCount, 5);
  assert.strictEqual(result.coordinationFactor, 2.0);
  assert.strictEqual(result.featureScore, 44.0);
  assert.ok(result.bottleneck.includes('Scheduler'));
  assert.strictEqual(result.risks.length, 1);
  assert.strictEqual(result.dependencies.length, 1);
});

// ═══════════════════════════════════════════════════════════════════════════
// detectStage tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n── detectStage ──');

test('detects Ground stage', () => {
  const dir = setupFixture('test-ground', {
    'ground.md': '# test',
    'summary.md': '## Bet\nTest',
  });
  assert.strictEqual(parsers.detectStage(dir), 'Ground');
});

test('detects Sketched stage', () => {
  const dir = setupFixture('test-sketched', {
    'ground.md': '# test',
    'sketch.md': '# test',
    'summary.md': '## Bet\nTest',
  });
  assert.strictEqual(parsers.detectStage(dir), 'Sketched');
});

test('detects Defined stage', () => {
  const dir = setupFixture('test-defined', {
    'ground.md': '# test',
    'sketch.md': '# test',
    'define.md': '# test',
    'summary.md': '## Bet\nTest',
  });
  assert.strictEqual(parsers.detectStage(dir), 'Defined');
});

test('detects Explored stage', () => {
  const dir = setupFixture('test-explored', {
    'ground.md': '# test',
    'sketch.md': '# test',
    'define.md': '# test',
    'explore.md': '# test',
    'summary.md': '## Bet\nTest',
  });
  assert.strictEqual(parsers.detectStage(dir), 'Explored');
});

test('detects Built stage', () => {
  const dir = setupFixture('test-built', {
    'ground.md': '# test',
    'sketch.md': '# test',
    'define.md': '# test',
    'explore.md': '# test',
    'build/prototype.html': '<html></html>',
    'summary.md': '## Bet\nTest',
  });
  assert.strictEqual(parsers.detectStage(dir), 'Built');
});

// ═══════════════════════════════════════════════════════════════════════════
// parsePrd tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n── parsePrd ──');

test('reads prd.md as raw string', () => {
  const result = parsers.parsePrd('# Build: Test Idea\n\n## Who this is for\n\nSome users.\n');
  assert.ok(typeof result === 'string');
  assert.ok(result.includes('# Build: Test Idea'));
});

test('returns null for empty prd', () => {
  const result = parsers.parsePrd(null);
  assert.strictEqual(result, null);
});

// ═══════════════════════════════════════════════════════════════════════════
// Full integration: rebuildBriefData
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n── rebuildBriefData integration ──');

test('builds full briefData from source files', () => {
  const dir = setupFixture('test-full', {
    'ground.md': '# test',
    'sketch.md': '# test',
    'summary.md': `## Bet
Test bet headline.
Occasion label: Test Occasion
Opportunity label: Test Opportunity

## JTBD
Users want X.

## Evidence Narrative
1. **10K users** — evidence one [Source A](data: Looker)
2. **50% growth** — evidence two [Source B](web: research)
3. **No competitor** — evidence three [Competitor](web: App Store)

## Impact
- Opportunity size: ~$5M/month (GMV)
- Complexity: M
- Confidence: Yellow — needs validation

## Seeking
Approval to proceed.

## Producer
Sample PM
`,
    'outcomes.md': `## Job
Receive items on schedule.

## Outcome Map
### Discover
| # | Outcome | I | S | Opp | Source |
|---|---------|---|---|-----|--------|
| 1 | Find items fast | 5 | 1 | 5.0 | [pm] |

### Decide
| # | Outcome | I | S | Opp | Source |
|---|---------|---|---|-----|--------|
| 2 | Pick right plan | 4 | 2 | 3.0 | [pm] |

### Do
| # | Outcome | I | S | Opp | Source |
|---|---------|---|---|-----|--------|
| 3 | Checkout easily | 5 | 1 | 5.0 | [pm] |

### Resolve
| # | Outcome | I | S | Opp | Source |
|---|---------|---|---|-----|--------|
| 4 | Fix delivery issues | 4 | 3 | 2.0 | [pm] |

## Top Underserved Outcomes (Opp >= 3.0)
1. **#1** Find items fast — **5.0** [pm] — No proactive search
2. **#3** Checkout easily — **5.0** [pm] — Too many steps
`,
    'decisions.md': `## Key Decisions
| # | Decision | Why | When |
|---|----------|-----|------|
| 1 | UAE first | Largest base | Strategy |

## Open Questions
| Question | Owner | Status |
|----------|-------|--------|
| Will users adopt? | Research | Open |

## Decision Log
[decision-log.md](decision-log.md)
`,
    'decision-log.md': `# Decision Log

### /1 Ground — 2026-06-05

**Q1**: What is this?
**A1**: A conviction idea.

**Q2**: Primary segment?
**A2**: Power users.
`,
    'prd.md': `# Build: Test Idea

## Who this is for
Test users in UAE.

## What to build
- Feature A
- Feature B
`,
    'scope.md': `## Build
- Feature A
- Feature B

## Don't Build
- Feature C

## Later
- Feature D (Phase 2 — later)
`,
  });
  const result = parsers.rebuildBriefData(dir, 'test-full');
  assert.ok(result);
  assert.strictEqual(result.meta.slug, 'test-full');
  assert.strictEqual(result.meta.stage, 'Sketched');
  assert.strictEqual(result.title, 'Test bet headline.');
  assert.ok(result.jtbd.includes('Users want X'));
  assert.strictEqual(result.executiveSummary.length, 3);
  assert.ok(result.prd.includes('# Build: Test Idea'));
  assert.strictEqual(result.decisions.length, 1);
  assert.strictEqual(result.openQuestions.length, 1);
  assert.strictEqual(result.decisionLog.length, 1);
  assert.strictEqual(result.whatToBuild.length, 2);
  assert.strictEqual(result.dontBuild.length, 1);
  assert.strictEqual(result.job, 'Receive items on schedule.');
  assert.strictEqual(result.outcomeMap.discover.length, 1);
  assert.strictEqual(result.topOutcomes.length, 2);
  assert.strictEqual(result.keyNumbers.opportunity, '~$5M/month');
  assert.strictEqual(result.keyNumbers.metricType, 'GMV');
  assert.strictEqual(result.confidence.color, 'yellow');
});

test('preserves existing briefData when source files have migration placeholders', () => {
  // Create a brief.html with existing valid data
  const existingBriefData = `const briefData = {
  meta: { slug: 'test-preserve', date: '2026-06-10', stage: 'Defined' },
  title: 'Existing Title',
  jtbd: 'Existing JTBD text.',
  executiveSummary: 'Existing summary',
  confidence: { color: 'green', reason: 'Strong' },
  keyNumbers: { opportunity: '$10M', metricType: 'GMV', complexity: 'M' },
  prd: null,
  researchPlan: null,
  feasibility: null,
  competitors: null,
  journey: null
};`;

  const dir = setupFixture('test-preserve', {
    'ground.md': '# test',
    'sketch.md': '# test',
    'define.md': '# test',
    'brief.html': `<html><script>${existingBriefData}</script></html>`,
    'summary.md': `<!-- Migrated from old format -->
## Bet Headline
<!-- Migration: could not extract -->

## Evidence
<!-- Migration: could not extract -->
`,
    'outcomes.md': `<!-- Migrated from old format -->
## Job
<!-- Migration: could not extract -->
`,
    'prd.md': `# Build: New PRD Content

## Who this is for
Test users.
`,
  });
  const result = parsers.rebuildBriefData(dir, 'test-preserve');
  // PRD should be populated from prd.md
  assert.ok(result.prd !== null, 'prd should be extracted from prd.md');
  assert.ok(result.prd.includes('New PRD Content'));
  // Title should be preserved from existing briefData (not overwritten by empty extraction)
  assert.strictEqual(result.title, 'Existing Title');
  assert.strictEqual(result.jtbd, 'Existing JTBD text.');
});

// ═══════════════════════════════════════════════════════════════════════════
// Report
// ═══════════════════════════════════════════════════════════════════════════

cleanFixtures();

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
if (failed > 0) process.exit(1);
