#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

// ── Parsing ──────────────────────────────────────────────────────────────────

/**
 * Parse an execution-log.md file and extract MCP call entries.
 *
 * Each entry: { role, mcp, outcome, timestamp }
 *   outcome is one of: 'success', 'failed', 'fallback'
 *
 * Timestamp is inherited from the phase's **Started** line.
 */
function parseExecutionLog(content) {
  const entries = [];
  const lines = content.split('\n');

  let currentTimestamp = null;
  let inMcpCalls = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect phase timestamp: - **Started**: 2026-06-15T12:00:00Z
    const startedMatch = line.match(/^\s*-\s+\*\*Started\*\*:\s*(.+)$/);
    if (startedMatch) {
      currentTimestamp = startedMatch[1].trim();
      continue;
    }

    // Detect MCP calls section header
    if (/^\s*-\s+\*\*MCP calls\*\*:/.test(line)) {
      // Check if it's "none" on same line
      if (/none/i.test(line)) {
        inMcpCalls = false;
        continue;
      }
      inMcpCalls = true;
      continue;
    }

    // If we're inside MCP calls, parse indented entries
    //   - role: mcp_name — outcome (optional note)
    if (inMcpCalls) {
      const mcpMatch = line.match(/^\s+-\s+(\w+):\s+(\S+)\s+\u2014\s+(.+)$/);
      if (mcpMatch) {
        const role = mcpMatch[1];
        const mcp = mcpMatch[2];
        const outcomeText = mcpMatch[3].toLowerCase();

        let outcome;
        if (outcomeText.startsWith('success')) {
          outcome = 'success';
        } else if (outcomeText.startsWith('fallback')) {
          // "fallback used ..." — this MCP was itself the fallback and worked
          outcome = 'fallback';
        } else {
          // "failed", "not found", "auth expired", "not found, using X fallback" = failed
          outcome = 'failed';
        }

        entries.push({ role, mcp, outcome, timestamp: currentTimestamp });
      } else if (/^\s*-\s+\*\*/.test(line)) {
        // Hit the next bold field — exit MCP calls section
        inMcpCalls = false;
      }
    }

    // Any other bold field resets MCP context
    if (/^\s*-\s+\*\*(Connector failures|Artifacts written|Completed|Agents invoked)\*\*/.test(line)) {
      inMcpCalls = false;
    }
  }

  return entries;
}

/**
 * Parse connectors.yaml (simple line-based, no YAML lib needed) to extract role names.
 * Looks for top-level keys under `connectors:` — lines matching /^  \w+:/ (2-space indent).
 */
function parseConnectorsYaml(content) {
  const roles = [];
  const lines = content.split('\n');
  let inConnectors = false;

  for (const line of lines) {
    if (/^connectors:\s*$/.test(line)) {
      inConnectors = true;
      continue;
    }

    if (inConnectors) {
      // Role line: exactly 2 spaces then word characters then colon
      const roleMatch = line.match(/^  (\w+):\s*$/);
      if (roleMatch) {
        roles.push(roleMatch[1]);
        continue;
      }

      // If we hit a non-indented, non-empty, non-comment line — we left connectors block
      if (/^\S/.test(line) && line.trim() !== '' && !line.trim().startsWith('#')) {
        inConnectors = false;
      }
    }
  }

  return roles;
}

// ── Aggregation ──────────────────────────────────────────────────────────────

/**
 * Aggregate parsed entries into health metrics.
 *
 * Returns:
 *   {
 *     byRole: { [role]: { total, success, failed, fallback, lastSuccess, lastFailure } },
 *     byMcp:  { [mcp]:  { total, success, failed, fallback, lastSuccess, lastFailure } },
 *     neverUsed: [role, ...]
 *   }
 */
function aggregateHealth(entries, allRoles) {
  const byRole = {};
  const byMcp = {};

  for (const entry of entries) {
    // Aggregate by role
    if (!byRole[entry.role]) {
      byRole[entry.role] = { total: 0, success: 0, failed: 0, fallback: 0, lastSuccess: null, lastFailure: null };
    }
    const r = byRole[entry.role];
    r.total++;
    r[entry.outcome]++;

    if (entry.outcome === 'success' && entry.timestamp) {
      if (!r.lastSuccess || entry.timestamp > r.lastSuccess) r.lastSuccess = entry.timestamp;
    }
    if (entry.outcome === 'failed' && entry.timestamp) {
      if (!r.lastFailure || entry.timestamp > r.lastFailure) r.lastFailure = entry.timestamp;
    }

    // Aggregate by MCP
    if (!byMcp[entry.mcp]) {
      byMcp[entry.mcp] = { total: 0, success: 0, failed: 0, fallback: 0, lastSuccess: null, lastFailure: null };
    }
    const m = byMcp[entry.mcp];
    m.total++;
    m[entry.outcome]++;

    if (entry.outcome === 'success' && entry.timestamp) {
      if (!m.lastSuccess || entry.timestamp > m.lastSuccess) m.lastSuccess = entry.timestamp;
    }
    if (entry.outcome === 'failed' && entry.timestamp) {
      if (!m.lastFailure || entry.timestamp > m.lastFailure) m.lastFailure = entry.timestamp;
    }
  }

  const usedRoles = new Set(Object.keys(byRole));
  const neverUsed = allRoles.filter(role => !usedRoles.has(role));

  return { byRole, byMcp, neverUsed };
}

// ── Formatting ───────────────────────────────────────────────────────────────

function formatDate(isoStr) {
  if (!isoStr) return '\u2014';
  // Extract just the date portion
  return isoStr.slice(0, 10);
}

function formatRate(success, fallback, total) {
  if (total === 0) return '  \u2014';
  // Success rate = (success + fallback) / total — fallback still worked
  const rate = Math.round(((success + fallback) / total) * 100);
  return `${String(rate).padStart(3)}%`;
}

function successRate(stats) {
  if (stats.total === 0) return 100;
  return Math.round(((stats.success + stats.fallback) / stats.total) * 100);
}

/**
 * Format the aggregated health data into a human-readable report string.
 */
function formatReport(health) {
  const lines = [];

  lines.push('Connector Health Report');
  lines.push('\u2550'.repeat(70));
  lines.push('');

  // Build rows: merge role + MCP data
  // Collect all role-mcp pairs
  const rows = [];
  const rolesMcps = {};

  // Group entries by role -> set of MCPs
  for (const [role, stats] of Object.entries(health.byRole)) {
    if (!rolesMcps[role]) rolesMcps[role] = [];
  }

  // To get role-MCP pairs we need to go deeper — re-derive from byMcp + byRole
  // Actually, we should show per-role rows with the primary MCP
  // Let's do: one row per role that has data

  // Header
  const hdr = [
    pad('Role', 22),
    pad('MCP', 18),
    pad('Calls', 7),
    pad('OK', 5),
    pad('Fail', 6),
    pad('FB', 5),
    pad('Rate', 6),
    pad('Last OK', 14),
    pad('Last Fail', 14),
  ].join('');
  lines.push(hdr);
  lines.push('\u2500'.repeat(hdr.length));

  // Sort roles alphabetically
  const sortedRoles = Object.keys(health.byRole).sort();
  for (const role of sortedRoles) {
    const stats = health.byRole[role];
    const rate = formatRate(stats.success, stats.fallback, stats.total);

    // Find most-used MCP for this role — we don't have direct mapping,
    // so show aggregated role-level stats. MCP column shows "mixed" if multiple.
    // For per-MCP detail, the byMcp section handles it.
    lines.push([
      pad(role, 22),
      pad('(all)', 18),
      pad(String(stats.total), 7),
      pad(String(stats.success), 5),
      pad(String(stats.failed), 6),
      pad(String(stats.fallback), 5),
      pad(rate, 6),
      pad(formatDate(stats.lastSuccess), 14),
      pad(formatDate(stats.lastFailure), 14),
    ].join(''));
  }

  lines.push('');

  // Per-MCP breakdown
  if (Object.keys(health.byMcp).length > 0) {
    lines.push('Per-MCP Breakdown');
    lines.push('\u2500'.repeat(60));

    const mcpHdr = [
      pad('MCP', 22),
      pad('Calls', 7),
      pad('OK', 5),
      pad('Fail', 6),
      pad('FB', 5),
      pad('Rate', 6),
    ].join('');
    lines.push(mcpHdr);
    lines.push('\u2500'.repeat(mcpHdr.length));

    for (const mcp of Object.keys(health.byMcp).sort()) {
      const stats = health.byMcp[mcp];
      lines.push([
        pad(mcp, 22),
        pad(String(stats.total), 7),
        pad(String(stats.success), 5),
        pad(String(stats.failed), 6),
        pad(String(stats.fallback), 5),
        formatRate(stats.success, stats.fallback, stats.total).padStart(6),
      ].join(''));
    }
    lines.push('');
  }

  // Never used roles
  if (health.neverUsed.length > 0) {
    lines.push(`Never Used Roles: ${health.neverUsed.join(', ')}`);
    lines.push('');
  }

  // Recommendations
  const recommendations = [];

  for (const [role, stats] of Object.entries(health.byRole)) {
    const rate = successRate(stats);
    if (rate < 90 && stats.total >= 2) {
      recommendations.push(
        `- ${role} (${rate}%): Consider adding a fallback MCP or checking auth/connectivity`
      );
    }
    if (stats.failed >= 3) {
      recommendations.push(
        `- ${role}: ${stats.failed} failures recorded \u2014 check auth, network, or rate limits`
      );
    }
  }

  if (recommendations.length > 0) {
    lines.push('Recommendations:');
    // Deduplicate
    const seen = new Set();
    for (const rec of recommendations) {
      if (!seen.has(rec)) {
        lines.push(rec);
        seen.add(rec);
      }
    }
    lines.push('');
  } else if (Object.keys(health.byRole).length > 0) {
    lines.push('All connectors operating within healthy thresholds.');
    lines.push('');
  }

  return lines.join('\n');
}

function pad(str, width) {
  if (str.length >= width) return str.slice(0, width);
  return str + ' '.repeat(width - str.length);
}

// ── File scanning ────────────────────────────────────────────────────────────

/**
 * Scan a pipeline directory for execution-log.md files and parse all entries.
 * @param {string} pipelineDir — path to the pipeline/ directory
 * @returns {Array} — flat array of parsed MCP call entries
 */
function scanPipelineLogs(pipelineDir) {
  const entries = [];

  let items;
  try {
    items = fs.readdirSync(pipelineDir, { withFileTypes: true });
  } catch {
    return entries;
  }

  for (const item of items) {
    if (!item.isDirectory()) continue;
    const logPath = path.join(pipelineDir, item.name, 'execution-log.md');
    try {
      const content = fs.readFileSync(logPath, 'utf8');
      entries.push(...parseExecutionLog(content));
    } catch {
      // No execution-log.md in this directory — skip
    }
  }

  return entries;
}

// ── CLI ──────────────────────────────────────────────────────────────────────

function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const pipelineDir = path.join(projectRoot, 'pipeline');
  const connectorsPath = path.join(projectRoot, 'connectors.yaml');

  // 1. Scan all execution logs
  const entries = scanPipelineLogs(pipelineDir);

  // 2. Read connectors.yaml for full role list
  let allRoles = [];
  try {
    const yaml = fs.readFileSync(connectorsPath, 'utf8');
    allRoles = parseConnectorsYaml(yaml);
  } catch {
    console.error('Warning: connectors.yaml not found at', connectorsPath);
    console.error('Role coverage check will be skipped.\n');
  }

  // 3. Aggregate
  const health = aggregateHealth(entries, allRoles);

  // 4. Report
  const report = formatReport(health);
  console.log(report);

  if (entries.length === 0) {
    console.log('No execution logs found. Run pipeline skills to generate data.');
  }
}

// ── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  parseExecutionLog,
  parseConnectorsYaml,
  aggregateHealth,
  formatReport,
  scanPipelineLogs,
};

// Run if called directly
if (require.main === module) {
  main();
}
