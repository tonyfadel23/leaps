const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

function makeTmpPipeline() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cost-report-test-'));
  return tmp;
}

function writeExecLog(dir, slug, content) {
  const ideaDir = path.join(dir, slug);
  fs.mkdirSync(ideaDir, { recursive: true });
  fs.writeFileSync(path.join(ideaDir, 'execution-log.md'), content, 'utf8');
  return ideaDir;
}

function writeOpportunity(dir, slug, content) {
  const ideaDir = path.join(dir, slug);
  fs.mkdirSync(ideaDir, { recursive: true });
  fs.writeFileSync(path.join(ideaDir, 'opportunity.md'), content, 'utf8');
  return ideaDir;
}

const {
  parseExecutionLog,
  parseSkillRun,
  aggregateReport,
  formatFullReport,
  formatIdeaReport,
  scanPipeline,
} = require('./pipeline-cost-report');

console.log('Running pipeline-cost-report tests...\n');

// --- parseSkillRun ---
{
  console.log('  parseSkillRun: extracts skill name, date, phases, agents, MCP calls, failures');

  const block = `## /1 learn — 2026-06-15

### Phase 0: Preflight
- **Started**: 2026-06-15T12:00:00Z
- **Agents invoked**: none
- **MCP calls**:
  - metrics_source: your-bi-tool — not found, using looker fallback
  - knowledge_base: your-knowledge-tool — success
- **Connector failures**: your-bi-tool (primary metrics_source not available)
- **Artifacts written**: none
- **Completed**: 2026-06-15T12:00:30Z

### Phase 1: Orient
- **Started**: 2026-06-15T12:00:30Z
- **Agents invoked**: context-retriever (inline)
- **MCP calls**:
  - knowledge_base: your-knowledge-tool — success (group ordering competitive intel found)
- **Connector failures**: none
- **Artifacts written**: .state.json, decision-log.md, execution-log.md
- **Completed**: 2026-06-15T12:01:00Z

### Phase 2: Interview
- **Started**: 2026-06-15T12:01:00Z
- **Agents invoked**: interviewer (inline), context-retriever (inline), data-analyst (inline)
- **MCP calls**:
  - knowledge_base: your-knowledge-tool — success
  - metrics_source: looker — success
- **Connector failures**: none
- **Artifacts written**: decision-log.md
- **Completed**: 2026-06-15T12:15:00Z`;

  const result = parseSkillRun(block);
  assert.strictEqual(result.skill, '/1 learn', 'skill name');
  assert.strictEqual(result.date, '2026-06-15', 'date');
  assert.strictEqual(result.phases, 3, 'phases count');
  assert.strictEqual(result.agents, 4, 'agents count (1 in phase 0 is none, 1 in phase 1, 3 in phase 2)');
  assert.strictEqual(result.mcpCalls, 5, 'MCP calls count (2 in phase 0, 1 in phase 1, 2 in phase 2)');
  assert.strictEqual(result.failures, 1, 'failure count');
  console.log('  PASS\n');
}

// --- parseSkillRun: none agents ---
{
  console.log('  parseSkillRun: handles "none" agents correctly');

  const block = `## /3 assess — 2026-06-19

### Phase 1: Load, Align & Inspect
- **Started**: 2026-06-19T10:00:00Z
- **Agents invoked**: none
- **MCP calls**: none
- **Connector failures**: none
- **Artifacts written**: .state.json, execution-log.md
- **Completed**: 2026-06-19T10:01:00Z`;

  const result = parseSkillRun(block);
  assert.strictEqual(result.skill, '/3 assess', 'skill name');
  assert.strictEqual(result.phases, 1, 'phases count');
  assert.strictEqual(result.agents, 0, 'zero agents');
  assert.strictEqual(result.mcpCalls, 0, 'zero MCP calls');
  assert.strictEqual(result.failures, 0, 'zero failures');
  console.log('  PASS\n');
}

// --- parseSkillRun: prototype-builder x4 counted correctly ---
{
  console.log('  parseSkillRun: counts multiplied agents (prototype-builder x4)');

  const block = `## /2 explore — 2026-06-15

### Phase 3: Prototype
- **Started**: 2026-06-15T12:50:00Z
- **Agents invoked**: prototype-builder ×4 (sonnet, parallel), showcase-builder ×2 (sonnet)
- **MCP calls**: none
- **Connector failures**: none
- **Artifacts written**: variation-a.html
- **Completed**: 2026-06-15T13:20:00Z`;

  const result = parseSkillRun(block);
  assert.strictEqual(result.agents, 6, 'prototype-builder x4 + showcase-builder x2 = 6');
  console.log('  PASS\n');
}

// --- parseExecutionLog ---
{
  console.log('  parseExecutionLog: splits multi-skill log into runs');

  const log = `## /1 learn — 2026-06-10

### Phase 1: Orient
- **Started**: 2026-06-10T10:00:00Z
- **Agents invoked**: context-retriever (inline)
- **MCP calls**: none
- **Connector failures**: none
- **Artifacts written**: .state.json
- **Completed**: 2026-06-10T10:01:00Z

## /2 explore — 2026-06-12

### Phase 1: Journey
- **Started**: 2026-06-12T10:00:00Z
- **Agents invoked**: journey-mapper (haiku)
- **MCP calls**:
  - knowledge_base: your-knowledge-tool — success
- **Connector failures**: none
- **Artifacts written**: journey.md
- **Completed**: 2026-06-12T10:10:00Z

### Phase 2: Prototype
- **Started**: 2026-06-12T10:10:00Z
- **Agents invoked**: prototype-builder (sonnet)
- **MCP calls**: none
- **Connector failures**: none
- **Artifacts written**: variation-a.html
- **Completed**: 2026-06-12T10:20:00Z`;

  const runs = parseExecutionLog(log);
  assert.strictEqual(runs.length, 2, 'two skill runs');
  assert.strictEqual(runs[0].skill, '/1 learn');
  assert.strictEqual(runs[0].phases, 1);
  assert.strictEqual(runs[1].skill, '/2 explore');
  assert.strictEqual(runs[1].phases, 2);
  assert.strictEqual(runs[1].agents, 2, 'journey-mapper + prototype-builder');
  console.log('  PASS\n');
}

// --- parseExecutionLog: with optional title line ---
{
  console.log('  parseExecutionLog: handles optional title line at top');

  const log = `# Execution Log: group-lunch-ordering

## /1 learn — 2026-06-15

### Phase 1: Orient
- **Started**: 2026-06-15T10:00:00Z
- **Agents invoked**: none
- **MCP calls**: none
- **Connector failures**: none
- **Artifacts written**: .state.json
- **Completed**: 2026-06-15T10:01:00Z`;

  const runs = parseExecutionLog(log);
  assert.strictEqual(runs.length, 1, 'one skill run');
  assert.strictEqual(runs[0].skill, '/1 learn');
  console.log('  PASS\n');
}

// --- aggregateReport ---
{
  console.log('  aggregateReport: aggregates runs across ideas');

  const pipelineData = {
    'water-subscription': [
      { skill: '/1 learn', date: '2026-06-10', phases: 4, agents: 3, mcpCalls: 8, failures: 0 },
      { skill: '/2 explore', date: '2026-06-12', phases: 4, agents: 5, mcpCalls: 4, failures: 1 },
    ],
    'group-ordering': [
      { skill: '/1 learn', date: '2026-06-11', phases: 4, agents: 2, mcpCalls: 6, failures: 0 },
    ],
  };

  const report = aggregateReport(pipelineData);

  // Per-skill averages
  assert.strictEqual(report.perSkill['/1 learn'].runs, 2, '/1 learn runs');
  assert.strictEqual(report.perSkill['/1 learn'].avgPhases, 4.0, '/1 learn avg phases');
  assert.strictEqual(report.perSkill['/1 learn'].avgAgents, 2.5, '/1 learn avg agents');
  assert.strictEqual(report.perSkill['/1 learn'].avgMcpCalls, 7.0, '/1 learn avg MCP');
  assert.strictEqual(report.perSkill['/1 learn'].avgFailures, 0.0, '/1 learn avg failures');

  assert.strictEqual(report.perSkill['/2 explore'].runs, 1, '/2 explore runs');

  // Totals
  assert.strictEqual(report.totals.runs, 3, 'total runs');
  assert.strictEqual(report.totals.agents, 10, 'total agents');
  assert.strictEqual(report.totals.mcpCalls, 18, 'total MCP calls');
  assert.strictEqual(report.totals.failures, 1, 'total failures');

  // Most active
  assert.strictEqual(report.mostActive[0].slug, 'water-subscription', 'most active idea');
  assert.strictEqual(report.mostActive[0].runs, 2, 'most active runs');

  console.log('  PASS\n');
}

// --- aggregateReport: failure breakdown ---
{
  console.log('  aggregateReport: empty pipeline produces zeroes');

  const report = aggregateReport({});
  assert.strictEqual(report.totals.runs, 0);
  assert.strictEqual(report.totals.agents, 0);
  assert.deepStrictEqual(report.mostActive, []);
  console.log('  PASS\n');
}

// --- scanPipeline ---
{
  console.log('  scanPipeline: scans pipeline directory for execution logs');

  const tmp = makeTmpPipeline();

  // Create two idea dirs with execution logs
  writeExecLog(tmp, 'idea-a', `## /1 learn — 2026-06-10

### Phase 1: Orient
- **Started**: 2026-06-10T10:00:00Z
- **Agents invoked**: context-retriever (inline)
- **MCP calls**: none
- **Connector failures**: none
- **Artifacts written**: .state.json
- **Completed**: 2026-06-10T10:01:00Z`);

  writeExecLog(tmp, 'idea-b', `## /2 explore — 2026-06-12

### Phase 1: Journey
- **Started**: 2026-06-12T10:00:00Z
- **Agents invoked**: journey-mapper (haiku)
- **MCP calls**:
  - knowledge_base: your-knowledge-tool — success
- **Connector failures**: none
- **Artifacts written**: journey.md
- **Completed**: 2026-06-12T10:10:00Z`);

  // Also create a dir with no execution log (should be skipped)
  fs.mkdirSync(path.join(tmp, 'idea-c'), { recursive: true });

  const data = scanPipeline(tmp);
  assert.strictEqual(Object.keys(data).length, 2, 'two ideas with logs');
  assert.ok(data['idea-a'], 'idea-a present');
  assert.ok(data['idea-b'], 'idea-b present');
  assert.strictEqual(data['idea-a'].length, 1);
  assert.strictEqual(data['idea-b'].length, 1);

  // Cleanup
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('  PASS\n');
}

// --- scanPipeline: empty pipeline ---
{
  console.log('  scanPipeline: returns empty for pipeline with no execution logs');

  const tmp = makeTmpPipeline();
  fs.mkdirSync(path.join(tmp, 'empty-idea'), { recursive: true });

  const data = scanPipeline(tmp);
  assert.strictEqual(Object.keys(data).length, 0);

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('  PASS\n');
}

// --- scanPipeline: skips index.html ---
{
  console.log('  scanPipeline: skips non-directory items like index.html');

  const tmp = makeTmpPipeline();
  fs.writeFileSync(path.join(tmp, 'index.html'), '<html></html>', 'utf8');

  writeExecLog(tmp, 'real-idea', `## /1 learn — 2026-06-10

### Phase 1: Orient
- **Started**: 2026-06-10T10:00:00Z
- **Agents invoked**: none
- **MCP calls**: none
- **Connector failures**: none
- **Artifacts written**: .state.json
- **Completed**: 2026-06-10T10:01:00Z`);

  const data = scanPipeline(tmp);
  assert.strictEqual(Object.keys(data).length, 1, 'only real-idea, not index.html');

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('  PASS\n');
}

// --- formatFullReport ---
{
  console.log('  formatFullReport: produces valid output');

  const pipelineData = {
    'water-subscription': [
      { skill: '/1 learn', date: '2026-06-10', phases: 4, agents: 3, mcpCalls: 8, failures: 0 },
    ],
  };

  const output = formatFullReport(aggregateReport(pipelineData));
  assert.ok(output.includes('Pipeline Cost Report'), 'has title');
  assert.ok(output.includes('/1 learn'), 'has skill name');
  assert.ok(output.includes('Total skill runs: 1'), 'has total runs');
  assert.ok(output.includes('water-subscription'), 'has idea name');
  console.log('  PASS\n');
}

// --- formatFullReport: empty pipeline ---
{
  console.log('  formatFullReport: handles empty pipeline');

  const output = formatFullReport(aggregateReport({}));
  assert.ok(output.includes('No execution data found'), 'empty message');
  console.log('  PASS\n');
}

// --- formatIdeaReport ---
{
  console.log('  formatIdeaReport: produces per-idea output');

  const runs = [
    { skill: '/1 learn', date: '2026-06-10', phases: 4, agents: 3, mcpCalls: 8, failures: 0 },
    { skill: '/2 explore', date: '2026-06-12', phases: 5, agents: 6, mcpCalls: 4, failures: 1 },
  ];

  const output = formatIdeaReport('water-subscription', runs);
  assert.ok(output.includes('water-subscription'), 'has slug');
  assert.ok(output.includes('/1 learn'), 'has first skill');
  assert.ok(output.includes('/2 explore'), 'has second skill');
  assert.ok(output.includes('Phases: 4'), 'has phase count');
  assert.ok(output.includes('Failures: 1'), 'has failures');
  console.log('  PASS\n');
}

// --- formatIdeaReport: no runs ---
{
  console.log('  formatIdeaReport: handles idea with no runs');

  const output = formatIdeaReport('empty-idea', []);
  assert.ok(output.includes('No execution data'), 'empty message');
  console.log('  PASS\n');
}

// --- parseSkillRun: failure detail extraction ---
{
  console.log('  parseSkillRun: extracts failure details');

  const block = `## /3 assess — 2026-06-15

### Phase 3: Validate & Instrument
- **Started**: 2026-06-15T14:10:00Z
- **Agents invoked**: data-analyst (inline)
- **MCP calls**:
  - metrics_source: looker — success
- **Connector failures**: Care_PU/Contacts explore not found (used Order_PU fct_contact instead)
- **Artifacts written**: none
- **Completed**: 2026-06-15T14:15:00Z`;

  const result = parseSkillRun(block);
  assert.strictEqual(result.failures, 1, 'one connector failure');
  assert.ok(result.failureDetails.length === 1, 'one failure detail');
  assert.ok(result.failureDetails[0].includes('Care_PU'), 'failure detail text');
  console.log('  PASS\n');
}

// --- parseSkillRun: multiple MCP call formats ---
{
  console.log('  parseSkillRun: handles inline MCP calls (single line)');

  const block = `## /1 learn — 2026-06-10

### Phase 1: Orient
- **Started**: 2026-06-10T10:00:00Z
- **Agents invoked**: none
- **MCP calls**: none
- **Connector failures**: none
- **Artifacts written**: .state.json
- **Completed**: 2026-06-10T10:01:00Z`;

  const result = parseSkillRun(block);
  assert.strictEqual(result.mcpCalls, 0, 'no MCP calls when "none"');
  console.log('  PASS\n');
}

console.log('All tests passed.');
