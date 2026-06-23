const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'connector-health-test-'));
}

function writeFile(dir, relPath, content) {
  const full = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  return full;
}

// ── Load module ──────────────────────────────────────────────────────────────

const {
  parseExecutionLog,
  parseConnectorsYaml,
  aggregateHealth,
  formatReport,
} = require('./connector-health.js');

// ── parseExecutionLog ────────────────────────────────────────────────────────

console.log('TEST: parseExecutionLog — extracts MCP call entries');
{
  const log = `## /1 learn — 2026-06-15

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
- **Artifacts written**: .state.json
- **Completed**: 2026-06-15T12:01:00Z
`;

  const entries = parseExecutionLog(log);

  // Should find 3 MCP call entries
  assert.strictEqual(entries.length, 3, `Expected 3 entries, got ${entries.length}`);

  // First entry: fallback
  assert.strictEqual(entries[0].role, 'metrics_source');
  assert.strictEqual(entries[0].mcp, 'your-bi-tool');
  assert.strictEqual(entries[0].outcome, 'failed');
  assert.strictEqual(entries[0].timestamp, '2026-06-15T12:00:00Z');

  // Second entry: success
  assert.strictEqual(entries[1].role, 'knowledge_base');
  assert.strictEqual(entries[1].mcp, 'your-knowledge-tool');
  assert.strictEqual(entries[1].outcome, 'success');

  // Third entry: success with note
  assert.strictEqual(entries[2].role, 'knowledge_base');
  assert.strictEqual(entries[2].mcp, 'your-knowledge-tool');
  assert.strictEqual(entries[2].outcome, 'success');
}
console.log('  PASS');

console.log('TEST: parseExecutionLog — handles "fallback" in outcome text');
{
  const log = `## /2 explore — 2026-06-15

### Phase 1: Journey & Research
- **Started**: 2026-06-15T12:30:00Z
- **Agents invoked**: journey-mapper
- **MCP calls**:
  - market_intel: WebSearch — success (DoorDash, Uber Eats)
  - metrics_source: looker — fallback used (primary your-bi-tool unavailable)
- **Connector failures**: none
- **Artifacts written**: journey.md
- **Completed**: 2026-06-15T12:45:00Z
`;

  const entries = parseExecutionLog(log);
  assert.strictEqual(entries.length, 2);

  assert.strictEqual(entries[0].role, 'market_intel');
  assert.strictEqual(entries[0].mcp, 'WebSearch');
  assert.strictEqual(entries[0].outcome, 'success');

  assert.strictEqual(entries[1].role, 'metrics_source');
  assert.strictEqual(entries[1].mcp, 'looker');
  assert.strictEqual(entries[1].outcome, 'fallback');
}
console.log('  PASS');

console.log('TEST: parseExecutionLog — phases with no MCP calls produce no entries');
{
  const log = `## /3 assess — 2026-06-15

### Phase 1: Load
- **Started**: 2026-06-15T14:00:00Z
- **Agents invoked**: none
- **MCP calls**: none
- **Connector failures**: none
- **Artifacts written**: .state.json
- **Completed**: 2026-06-15T14:02:00Z
`;

  const entries = parseExecutionLog(log);
  assert.strictEqual(entries.length, 0);
}
console.log('  PASS');

console.log('TEST: parseExecutionLog — handles "failed" explicitly');
{
  const log = `## /4 prove — 2026-06-18

### Phase 1: Scout
- **Started**: 2026-06-18T09:00:00Z
- **Agents invoked**: architecture-scout
- **MCP calls**:
  - ticketing: atlassian — failed (auth expired)
  - code_explorer: github — success
- **Connector failures**: atlassian auth expired
- **Artifacts written**: none
- **Completed**: 2026-06-18T09:05:00Z
`;

  const entries = parseExecutionLog(log);
  assert.strictEqual(entries.length, 2);
  assert.strictEqual(entries[0].role, 'ticketing');
  assert.strictEqual(entries[0].mcp, 'atlassian');
  assert.strictEqual(entries[0].outcome, 'failed');
  assert.strictEqual(entries[0].timestamp, '2026-06-18T09:00:00Z');

  assert.strictEqual(entries[1].role, 'code_explorer');
  assert.strictEqual(entries[1].mcp, 'github');
  assert.strictEqual(entries[1].outcome, 'success');
}
console.log('  PASS');

// ── parseConnectorsYaml ──────────────────────────────────────────────────────

console.log('TEST: parseConnectorsYaml — extracts role names');
{
  const yaml = `connectors:
  metrics_source:
    description: "BI data"
    primary:
      mcp: your-bi-tool
    required: true
  knowledge_base:
    description: "Internal docs"
    primary:
      mcp: your-knowledge-tool
    required: false
  session_replay:
    description: "Replays"
    required: false
  app_store:
    description: "App reviews"
    required: false
`;

  const roles = parseConnectorsYaml(yaml);
  assert.ok(roles.includes('metrics_source'));
  assert.ok(roles.includes('knowledge_base'));
  assert.ok(roles.includes('session_replay'));
  assert.ok(roles.includes('app_store'));
  assert.strictEqual(roles.length, 4);
}
console.log('  PASS');

// ── aggregateHealth ──────────────────────────────────────────────────────────

console.log('TEST: aggregateHealth — aggregates by role and MCP');
{
  const entries = [
    { role: 'metrics_source', mcp: 'your-bi-tool', outcome: 'failed', timestamp: '2026-06-15T12:00:00Z' },
    { role: 'metrics_source', mcp: 'looker', outcome: 'success', timestamp: '2026-06-15T12:01:00Z' },
    { role: 'metrics_source', mcp: 'looker', outcome: 'success', timestamp: '2026-06-16T10:00:00Z' },
    { role: 'knowledge_base', mcp: 'your-knowledge-tool', outcome: 'success', timestamp: '2026-06-15T12:00:00Z' },
    { role: 'knowledge_base', mcp: 'your-knowledge-tool', outcome: 'failed', timestamp: '2026-06-17T10:00:00Z' },
  ];

  const allRoles = ['metrics_source', 'knowledge_base', 'ticketing', 'session_replay'];
  const health = aggregateHealth(entries, allRoles);

  // Per-role checks
  assert.strictEqual(health.byRole['metrics_source'].total, 3);
  assert.strictEqual(health.byRole['metrics_source'].success, 2);
  assert.strictEqual(health.byRole['metrics_source'].failed, 1);

  assert.strictEqual(health.byRole['knowledge_base'].total, 2);
  assert.strictEqual(health.byRole['knowledge_base'].success, 1);
  assert.strictEqual(health.byRole['knowledge_base'].failed, 1);

  // Per-MCP checks
  assert.strictEqual(health.byMcp['your-bi-tool'].total, 1);
  assert.strictEqual(health.byMcp['your-bi-tool'].failed, 1);
  assert.strictEqual(health.byMcp['looker'].total, 2);
  assert.strictEqual(health.byMcp['looker'].success, 2);

  // Never used
  assert.ok(health.neverUsed.includes('ticketing'));
  assert.ok(health.neverUsed.includes('session_replay'));
  assert.ok(!health.neverUsed.includes('metrics_source'));

  // Timeline
  assert.strictEqual(health.byRole['metrics_source'].lastSuccess, '2026-06-16T10:00:00Z');
  assert.strictEqual(health.byRole['metrics_source'].lastFailure, '2026-06-15T12:00:00Z');
  assert.strictEqual(health.byRole['knowledge_base'].lastFailure, '2026-06-17T10:00:00Z');
}
console.log('  PASS');

console.log('TEST: aggregateHealth — counts fallback as its own category');
{
  const entries = [
    { role: 'metrics_source', mcp: 'looker', outcome: 'fallback', timestamp: '2026-06-15T12:00:00Z' },
    { role: 'metrics_source', mcp: 'looker', outcome: 'success', timestamp: '2026-06-16T12:00:00Z' },
  ];

  const health = aggregateHealth(entries, ['metrics_source']);

  // Fallback counts toward total but not toward success or failed
  assert.strictEqual(health.byRole['metrics_source'].total, 2);
  assert.strictEqual(health.byRole['metrics_source'].success, 1);
  assert.strictEqual(health.byRole['metrics_source'].fallback, 1);
  assert.strictEqual(health.byRole['metrics_source'].failed, 0);
}
console.log('  PASS');

console.log('TEST: aggregateHealth — empty entries with all roles = all never-used');
{
  const health = aggregateHealth([], ['ticketing', 'session_replay']);
  assert.strictEqual(health.neverUsed.length, 2);
  assert.ok(health.neverUsed.includes('ticketing'));
  assert.ok(health.neverUsed.includes('session_replay'));
}
console.log('  PASS');

// ── formatReport ─────────────────────────────────────────────────────────────

console.log('TEST: formatReport — produces non-empty string with header');
{
  const health = aggregateHealth([
    { role: 'metrics_source', mcp: 'your-bi-tool', outcome: 'success', timestamp: '2026-06-15T12:00:00Z' },
    { role: 'metrics_source', mcp: 'your-bi-tool', outcome: 'failed', timestamp: '2026-06-16T12:00:00Z' },
  ], ['metrics_source', 'session_replay']);

  const report = formatReport(health);
  assert.ok(report.includes('Connector Health Report'));
  assert.ok(report.includes('metrics_source'));
  assert.ok(report.includes('your-bi-tool'));
  assert.ok(report.includes('session_replay'));
  assert.ok(report.includes('Never Used'));
}
console.log('  PASS');

console.log('TEST: formatReport — includes recommendations for low success rates');
{
  const health = aggregateHealth([
    { role: 'ticketing', mcp: 'atlassian', outcome: 'success', timestamp: '2026-06-15T12:00:00Z' },
    { role: 'ticketing', mcp: 'atlassian', outcome: 'failed', timestamp: '2026-06-15T13:00:00Z' },
    { role: 'ticketing', mcp: 'atlassian', outcome: 'failed', timestamp: '2026-06-15T14:00:00Z' },
  ], ['ticketing']);

  const report = formatReport(health);
  assert.ok(report.includes('Recommendations'));
  assert.ok(report.includes('ticketing'));
}
console.log('  PASS');

console.log('TEST: formatReport — no recommendations when all rates are high');
{
  const health = aggregateHealth([
    { role: 'knowledge_base', mcp: 'your-knowledge-tool', outcome: 'success', timestamp: '2026-06-15T12:00:00Z' },
    { role: 'knowledge_base', mcp: 'your-knowledge-tool', outcome: 'success', timestamp: '2026-06-16T12:00:00Z' },
  ], ['knowledge_base']);

  const report = formatReport(health);
  // Should say all clear or similar
  assert.ok(!report.includes('Consider adding a fallback'));
}
console.log('  PASS');

// ── Integration: file scanning ───────────────────────────────────────────────

console.log('TEST: scanPipelineLogs — reads execution-log.md files from pipeline dirs');
{
  const { scanPipelineLogs } = require('./connector-health.js');

  const tmp = makeTmpDir();
  writeFile(tmp, 'idea-a/execution-log.md', `## /1 learn — 2026-06-15

### Phase 1: Orient
- **Started**: 2026-06-15T12:00:00Z
- **Agents invoked**: none
- **MCP calls**:
  - metrics_source: your-bi-tool — success
- **Connector failures**: none
- **Artifacts written**: none
- **Completed**: 2026-06-15T12:01:00Z
`);

  writeFile(tmp, 'idea-b/execution-log.md', `## /2 explore — 2026-06-16

### Phase 1: Research
- **Started**: 2026-06-16T10:00:00Z
- **Agents invoked**: none
- **MCP calls**:
  - knowledge_base: your-knowledge-tool — failed (timeout)
- **Connector failures**: your-knowledge-tool timeout
- **Artifacts written**: none
- **Completed**: 2026-06-16T10:05:00Z
`);

  // idea-c has no execution-log.md — should be silently skipped
  fs.mkdirSync(path.join(tmp, 'idea-c'), { recursive: true });

  const entries = scanPipelineLogs(tmp);
  assert.strictEqual(entries.length, 2);
  assert.strictEqual(entries[0].role, 'metrics_source');
  assert.strictEqual(entries[0].outcome, 'success');
  assert.strictEqual(entries[1].role, 'knowledge_base');
  assert.strictEqual(entries[1].outcome, 'failed');

  // Cleanup
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log('  PASS');

console.log('\nAll tests passed.');
