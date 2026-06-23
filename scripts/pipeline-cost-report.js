#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Count agent invocations from an "Agents invoked" line.
 * Handles formats like:
 *   "none"
 *   "context-retriever (inline)"
 *   "interviewer (inline), context-retriever (inline), data-analyst (inline)"
 *   "prototype-builder ×4 (sonnet, parallel), showcase-builder ×2 (sonnet)"
 *   "none (synthesis by orchestrator)"
 */
function countAgents(line) {
  const value = line.replace(/^.*\*\*Agents invoked\*\*:\s*/, '').trim();
  if (!value || /^none/i.test(value)) return 0;

  let total = 0;
  // Split into agent entries: each starts with a word-char name, optionally
  // followed by ×N and parenthesized details, separated by ", " before the
  // next agent name. We strip parens first to simplify splitting.
  // Strategy: find all agent-like tokens: "name ×N" or just "name"
  // Agent names contain hyphens/underscores/letters, possibly followed by ×N
  const agents = value.match(/[a-zA-Z][\w-]*(?:\s*[×x]\d+)?/gi) || [];
  for (const agent of agents) {
    // Skip parenthesized qualifiers that were captured (e.g. "sonnet", "inline", "parallel", "haiku")
    const name = agent.trim();
    // Qualifiers are single words without hyphens that follow agent names in parens
    if (/^(sonnet|haiku|opus|inline|parallel)$/i.test(name)) continue;
    const multiplier = name.match(/[×x](\d+)/i);
    total += multiplier ? parseInt(multiplier[1], 10) : 1;
  }
  return total;
}

/**
 * Count MCP calls from the lines following an "MCP calls" header.
 * Each "  - role: tool" line is one call.
 * If the line says "none", returns 0.
 */
function countMcpCalls(phaseBlock) {
  const mcpMatch = phaseBlock.match(/\*\*MCP calls\*\*:\s*(.*)/);
  if (!mcpMatch) return 0;
  const firstLine = mcpMatch[1].trim();
  if (/^none/i.test(firstLine)) return 0;

  // Count indented list items (  - role: tool ...)
  const mcpLines = phaseBlock.match(/^\s+-\s+\w+.*?:/gm);
  // Filter to only lines that look like MCP call entries (role: tool pattern)
  // and not "Artifacts written" sub-items
  const afterMcp = phaseBlock.split(/\*\*MCP calls\*\*/)[1] || '';
  const beforeNext = afterMcp.split(/\*\*(Connector failures|Artifacts written|Completed)\*\*/)[0] || '';
  const callLines = beforeNext.match(/^\s+-\s+\w+/gm);
  return callLines ? callLines.length : (firstLine ? 1 : 0);
}

/**
 * Parse connector failures from a phase block.
 * Returns { count, details[] }
 */
function parseFailures(phaseBlock) {
  const match = phaseBlock.match(/\*\*Connector failures\*\*:\s*(.*)/);
  if (!match) return { count: 0, details: [] };
  const value = match[1].trim();
  if (/^none/i.test(value)) return { count: 0, details: [] };
  // Each non-"none" value is a failure. Could be comma-separated or single.
  const details = [value];
  return { count: 1, details };
}

/**
 * Parse a single skill run block (## /N skill — date ... next ## or end).
 * Returns { skill, date, phases, agents, mcpCalls, failures, failureDetails }
 */
function parseSkillRun(block) {
  const headerMatch = block.match(/^##\s+(\/\S+\s+\S+)\s+—\s+(\S+)/m);
  if (!headerMatch) return null;

  const skill = headerMatch[1];
  const date = headerMatch[2];

  // Split into phases by ### headers
  const phaseParts = block.split(/^###\s+/m).slice(1); // skip pre-header content

  let phases = phaseParts.length;
  let agents = 0;
  let mcpCalls = 0;
  let failures = 0;
  const failureDetails = [];

  for (const phase of phaseParts) {
    // Count agents
    const agentLine = phase.match(/\*\*Agents invoked\*\*:.*/);
    if (agentLine) {
      agents += countAgents(agentLine[0]);
    }

    // Count MCP calls
    mcpCalls += countMcpCalls(phase);

    // Count failures
    const f = parseFailures(phase);
    failures += f.count;
    failureDetails.push(...f.details);
  }

  return { skill, date, phases, agents, mcpCalls, failures, failureDetails };
}

/**
 * Parse a full execution-log.md file into an array of skill runs.
 */
function parseExecutionLog(content) {
  // Split on ## headers (skill run boundaries)
  // We need to split while keeping the ## header with its block
  const blocks = [];
  const lines = content.split('\n');
  let current = [];

  for (const line of lines) {
    if (/^##\s+\/\d/.test(line) && current.length > 0) {
      blocks.push(current.join('\n'));
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) blocks.push(current.join('\n'));

  const runs = [];
  for (const block of blocks) {
    const parsed = parseSkillRun(block);
    if (parsed) runs.push(parsed);
  }
  return runs;
}

// ---------------------------------------------------------------------------
// Pipeline scanning
// ---------------------------------------------------------------------------

/**
 * Scan a pipeline directory for execution logs.
 * Returns { slug: [runs] } for each idea that has an execution-log.md.
 */
function scanPipeline(pipelineDir) {
  const data = {};

  if (!fs.existsSync(pipelineDir)) return data;

  const entries = fs.readdirSync(pipelineDir);
  for (const entry of entries) {
    const entryPath = path.join(pipelineDir, entry);
    if (!fs.statSync(entryPath).isDirectory()) continue;

    const logPath = path.join(entryPath, 'execution-log.md');
    if (!fs.existsSync(logPath)) continue;

    const content = fs.readFileSync(logPath, 'utf8');
    const runs = parseExecutionLog(content);
    if (runs.length > 0) {
      data[entry] = runs;
    }
  }

  return data;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

/**
 * Aggregate pipeline data into a report structure.
 */
function aggregateReport(pipelineData) {
  const perSkill = {};
  let totalRuns = 0;
  let totalAgents = 0;
  let totalMcpCalls = 0;
  let totalFailures = 0;
  const ideaRunCounts = [];

  for (const [slug, runs] of Object.entries(pipelineData)) {
    ideaRunCounts.push({ slug, runs: runs.length });

    for (const run of runs) {
      totalRuns++;
      totalAgents += run.agents;
      totalMcpCalls += run.mcpCalls;
      totalFailures += run.failures;

      if (!perSkill[run.skill]) {
        perSkill[run.skill] = { runs: 0, totalPhases: 0, totalAgents: 0, totalMcpCalls: 0, totalFailures: 0 };
      }
      const s = perSkill[run.skill];
      s.runs++;
      s.totalPhases += run.phases;
      s.totalAgents += run.agents;
      s.totalMcpCalls += run.mcpCalls;
      s.totalFailures += run.failures;
    }
  }

  // Compute averages
  for (const s of Object.values(perSkill)) {
    s.avgPhases = s.runs > 0 ? round1(s.totalPhases / s.runs) : 0;
    s.avgAgents = s.runs > 0 ? round1(s.totalAgents / s.runs) : 0;
    s.avgMcpCalls = s.runs > 0 ? round1(s.totalMcpCalls / s.runs) : 0;
    s.avgFailures = s.runs > 0 ? round1(s.totalFailures / s.runs) : 0;
  }

  // Sort ideas by run count descending
  ideaRunCounts.sort((a, b) => b.runs - a.runs);

  return {
    perSkill,
    totals: {
      runs: totalRuns,
      agents: totalAgents,
      mcpCalls: totalMcpCalls,
      failures: totalFailures,
    },
    mostActive: ideaRunCounts,
  };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/**
 * Format the full pipeline report.
 */
function formatFullReport(report) {
  if (report.totals.runs === 0) {
    return 'No execution data found. Run pipeline skills to generate execution logs.\n';
  }

  const lines = [];
  lines.push('Pipeline Cost Report');
  lines.push('\u2550'.repeat(20));
  lines.push('');

  // Per-skill table
  lines.push('Per-Skill Averages:');

  const skillOrder = ['/1 learn', '/2 explore', '/3 assess', '/4 prove', '/5 ship'];
  const allSkills = Object.keys(report.perSkill);
  const ordered = skillOrder.filter(s => allSkills.includes(s));
  const extra = allSkills.filter(s => !skillOrder.includes(s)).sort();
  const sortedSkills = [...ordered, ...extra];

  // Table header
  const colW = { skill: 12, runs: 7, phases: 8, agents: 10, mcp: 11, fail: 10 };
  lines.push(
    '\u250C' + pad('\u2500', colW.skill) + '\u252C' + pad('\u2500', colW.runs) + '\u252C' + pad('\u2500', colW.phases) + '\u252C' + pad('\u2500', colW.agents) + '\u252C' + pad('\u2500', colW.mcp) + '\u252C' + pad('\u2500', colW.fail) + '\u2510'
  );
  lines.push(
    '\u2502' + padR(' Skill', colW.skill) + '\u2502' + padR(' Runs', colW.runs) + '\u2502' + padR(' Phases', colW.phases) + '\u2502' + padR(' Agents', colW.agents) + '\u2502' + padR(' MCP Calls', colW.mcp) + '\u2502' + padR(' Failures', colW.fail) + '\u2502'
  );
  lines.push(
    '\u251C' + pad('\u2500', colW.skill) + '\u253C' + pad('\u2500', colW.runs) + '\u253C' + pad('\u2500', colW.phases) + '\u253C' + pad('\u2500', colW.agents) + '\u253C' + pad('\u2500', colW.mcp) + '\u253C' + pad('\u2500', colW.fail) + '\u2524'
  );

  for (const skill of sortedSkills) {
    const s = report.perSkill[skill];
    lines.push(
      '\u2502' + padR(' ' + skill, colW.skill) +
      '\u2502' + padL(String(s.runs), colW.runs - 1) + ' ' +
      '\u2502' + padL(String(s.avgPhases), colW.phases - 1) + ' ' +
      '\u2502' + padL(String(s.avgAgents), colW.agents - 1) + ' ' +
      '\u2502' + padL(String(s.avgMcpCalls), colW.mcp - 1) + ' ' +
      '\u2502' + padL(String(s.avgFailures), colW.fail - 1) + ' ' +
      '\u2502'
    );
  }

  lines.push(
    '\u2514' + pad('\u2500', colW.skill) + '\u2534' + pad('\u2500', colW.runs) + '\u2534' + pad('\u2500', colW.phases) + '\u2534' + pad('\u2500', colW.agents) + '\u2534' + pad('\u2500', colW.mcp) + '\u2534' + pad('\u2500', colW.fail) + '\u2518'
  );

  lines.push('');

  // Totals
  const t = report.totals;
  const failRate = t.mcpCalls > 0 ? round1((t.failures / t.mcpCalls) * 100) : 0;
  lines.push('Pipeline Totals:');
  lines.push(`- Total skill runs: ${t.runs}`);
  lines.push(`- Total agent invocations: ${t.agents}`);
  lines.push(`- Total MCP calls: ${t.mcpCalls}`);
  lines.push(`- Total connector failures: ${t.failures} (${failRate}% failure rate)`);
  lines.push('');

  // Most active ideas (top 5)
  if (report.mostActive.length > 0) {
    lines.push('Most Active Ideas:');
    const top = report.mostActive.slice(0, 5);
    top.forEach((item, i) => {
      lines.push(`${i + 1}. ${item.slug} \u2014 ${item.runs} skill run${item.runs === 1 ? '' : 's'}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format a per-idea execution report.
 */
function formatIdeaReport(slug, runs) {
  if (!runs || runs.length === 0) {
    return `${slug} \u2014 No execution data found.\n`;
  }

  const lines = [];
  lines.push(`${slug} \u2014 Execution History`);
  lines.push('\u2550'.repeat(slug.length + 22));
  lines.push('');

  for (const run of runs) {
    lines.push(`${run.skill} \u2014 ${run.date}`);
    const parts = [
      `Phases: ${run.phases}`,
      `Agents: ${run.agents}`,
      `MCP calls: ${run.mcpCalls}`,
      `Failures: ${run.failures}`,
    ];
    lines.push(`  ${parts.join(' \u00B7 ')}`);

    if (run.failureDetails && run.failureDetails.length > 0) {
      for (const detail of run.failureDetails) {
        lines.push(`  \u26A0 ${detail}`);
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// String helpers
// ---------------------------------------------------------------------------

function pad(char, len) {
  return char.repeat(len);
}

function padR(str, len) {
  if (str.length >= len) return str.slice(0, len);
  return str + ' '.repeat(len - str.length);
}

function padL(str, len) {
  if (str.length >= len) return str;
  return ' '.repeat(len - str.length) + str;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main() {
  const ROOT = path.resolve(__dirname, '..');
  const PIPELINE_DIR = path.join(ROOT, 'pipeline');
  const slug = process.argv[2];

  if (slug) {
    // Per-idea report
    const logPath = path.join(PIPELINE_DIR, slug, 'execution-log.md');
    if (!fs.existsSync(logPath)) {
      console.log(`No execution log found for "${slug}".`);
      process.exit(0);
    }
    const content = fs.readFileSync(logPath, 'utf8');
    const runs = parseExecutionLog(content);
    console.log(formatIdeaReport(slug, runs));
  } else {
    // Full report
    const data = scanPipeline(PIPELINE_DIR);
    const report = aggregateReport(data);
    console.log(formatFullReport(report));
  }
}

// ---------------------------------------------------------------------------
// Exports (for testing) + CLI entry
// ---------------------------------------------------------------------------

module.exports = {
  parseSkillRun,
  parseExecutionLog,
  scanPipeline,
  aggregateReport,
  formatFullReport,
  formatIdeaReport,
  countAgents,
  countMcpCalls,
};

if (require.main === module) {
  main();
}
