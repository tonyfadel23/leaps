#!/usr/bin/env node
/**
 * rebuild-brief-data.js — briefData extractor
 *
 * Part of the brief rendering pipeline. Orchestrated by build-brief.js.
 * Extracts structured briefData (JSON) from pipeline source .md files
 * (summary.md, outcomes.md, decisions.md, etc.).
 *
 * Usage:
 *   node scripts/rebuild-brief-data.js morning-breakfast     # Rebuild one
 *   node scripts/rebuild-brief-data.js --all                 # Rebuild all
 */

const fs = require('fs');
const path = require('path');

const PIPELINE_DIR = path.join(__dirname, '..', 'pipeline');

// ─── Utility ─────────────────────────────────────────────────────────────────

function readFile(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); }
  catch { return null; }
}

function fileExists(filePath) {
  try { return fs.statSync(filePath).isFile(); }
  catch { return false; }
}

function dirExists(dirPath) {
  try { return fs.statSync(dirPath).isDirectory(); }
  catch { return false; }
}

/** Extract text between two heading markers (##) */
function extractSection(content, heading) {
  // Match ##, ###, or #### headings
  const regex = new RegExp(`^#{2,4}\\s+${escapeRegex(heading)}\\b[^\\n]*\\n`, 'im');
  const match = content.match(regex);
  if (!match) return null;
  const matchLevel = (match[0].match(/^#+/) || ['##'])[0].length;
  const start = match.index + match[0].length;
  // Find next heading at the same or higher level
  const nextPattern = new RegExp(`\\n#{2,${matchLevel}}\\s`, 'g');
  nextPattern.lastIndex = start;
  const nextMatch = nextPattern.exec(content);
  const end = nextMatch ? nextMatch.index : content.length;
  const text = content.substring(start, end).trim();
  if (!text || text.startsWith('<!-- Migration:') || text === '*Run /') return null;
  return text;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Check if content is a migration placeholder */
function isMigrationPlaceholder(text) {
  if (!text) return true;
  if (text.startsWith('<!-- Migration:')) return true;
  if (text.startsWith('*Run /')) return true;
  return false;
}

/** Parse markdown table rows into arrays of cell values */
function parseTable(text) {
  if (!text) return [];
  const lines = text.split('\n').filter(l => l.trim().startsWith('|'));
  if (lines.length < 2) return []; // need header + separator at minimum
  // Skip header and separator rows
  const dataLines = lines.slice(2);
  return dataLines.map(line => {
    const cells = line.split('|').slice(1, -1).map(c => c.trim());
    return cells;
  }).filter(cells => cells.length > 0);
}

/** Parse markdown table with named columns */
function parseNamedTable(text) {
  if (!text) return [];
  const lines = text.split('\n').filter(l => l.trim().startsWith('|'));
  if (lines.length < 3) return []; // header + separator + at least one data row
  const headers = lines[0].split('|').slice(1, -1).map(h => h.trim().toLowerCase());
  const dataLines = lines.slice(2);
  return dataLines.map(line => {
    const cells = line.split('|').slice(1, -1).map(c => c.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i] || ''; });
    return row;
  });
}

// ─── Parsers ─────────────────────────────────────────────────────────────────

function parseSummary(content) {
  if (!content) return {};
  const result = {};

  // betHeadline: from ## Bet or ## Bet Headline
  const betSection = extractSection(content, 'Bet Headline') || extractSection(content, 'Bet');
  if (betSection) {
    // Take first non-empty line that isn't a sub-heading or label
    const lines = betSection.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('Occasion label:') && !l.startsWith('Opportunity label:'));
    result.betHeadline = lines[0] || null;
  }

  // occasionLabel and opportunityLabel
  const olMatch = content.match(/Occasion label:\s*(.+)/i);
  if (olMatch) result.occasionLabel = olMatch[1].trim();

  const opMatch = content.match(/Opportunity label:\s*(.+)/i);
  if (opMatch) result.opportunityLabel = opMatch[1].trim();

  // executiveSummary: Evidence Narrative items as array
  const evidenceSection = extractSection(content, 'Evidence Narrative');
  if (evidenceSection) {
    const items = [];
    const lines = evidenceSection.split('\n').filter(l => /^\d+\.\s/.test(l.trim()));
    for (const line of lines) {
      const cleaned = line.replace(/^\d+\.\s*/, '').trim();
      // Parse: **bold text** — description [Source](url)
      const text = cleaned.replace(/\*\*/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '').replace(/\s*$/, '').trim();
      const sourceMatch = cleaned.match(/\[([^\]]*)\]\(([^)]*)\)/);
      items.push({
        text: text,
        source: sourceMatch ? sourceMatch[1] : '',
        sourceUrl: sourceMatch ? sourceMatch[2] : '',
      });
    }
    if (items.length > 0) result.executiveSummary = items;
  }

  // keyNumbers from ## Impact or ## Key Numbers
  const impactSection = extractSection(content, 'Impact') || extractSection(content, 'Key Numbers');
  if (impactSection) {
    result.keyNumbers = {};
    result.confidence = {};

    const lines = impactSection.split('\n');
    for (const line of lines) {
      const l = line.trim();

      // Opportunity size
      const oppMatch = l.match(/(?:Opportunity\s*(?:size)?|Opportunity):\s*(.+)/i);
      if (oppMatch) {
        let oppText = oppMatch[1].trim();
        // Extract metricType from parenthetical
        const metricMatch = oppText.match(/\(([A-Za-z/]+)\)/);
        if (metricMatch) {
          result.keyNumbers.metricType = metricMatch[1];
          oppText = oppText.replace(/\s*\([A-Za-z/]+\)/, '').trim();
        }
        // Clean up — take first sentence or number
        const sizeMatch = oppText.match(/(~?\$[\d.,]+[KMB]?\/\w+|~?\$[\d.,]+[KMB]?\s+\w+|~?[$€][\d.,]+[KMB]?(?:\/\w+)?)/i);
        result.keyNumbers.opportunity = sizeMatch ? sizeMatch[1] : oppText.split('.')[0].split(';')[0].trim();
      }

      // Complexity
      const cxMatch = l.match(/Complexity:\s*(\w+)/i);
      if (cxMatch) result.keyNumbers.complexity = cxMatch[1];

      // Affected
      const affMatch = l.match(/Affected:\s*(.+)/i);
      if (affMatch) {
        const affText = affMatch[1].trim();
        const shortAff = affText.split('.')[0].split(';')[0].trim();
        result.keyNumbers.affected = shortAff.substring(0, 100);
      }

      // Confidence
      const confMatch = l.match(/Confidence:\s*(.+)/i);
      if (confMatch) {
        const confText = confMatch[1].trim();
        const colorMatch = confText.match(/^(Red-Yellow|Red|Yellow|Green|Medium-High|Medium|High|Low)/i);
        if (colorMatch) {
          const raw = colorMatch[1].toLowerCase();
          if (raw.includes('green') || raw === 'high') {
            result.confidence.color = 'green';
          } else if (raw.includes('red') && !raw.includes('yellow')) {
            result.confidence.color = 'red';
          } else {
            result.confidence.color = 'yellow';
          }
          const reason = confText.substring(colorMatch[0].length).replace(/^\s*[—–-]\s*/, '').trim();
          result.confidence.reason = reason;
        }
      }
    }
  }

  // Confidence from standalone ## Confidence section
  const confSection = extractSection(content, 'Confidence');
  if (confSection && (!result.confidence || !result.confidence.color)) {
    const confText = confSection.split('\n')[0].trim();
    const colorMatch = confText.match(/^(Red-Yellow|Red|Yellow|Green|Medium-High|Medium|High|Low)/i);
    if (colorMatch) {
      result.confidence = result.confidence || {};
      const raw = colorMatch[1].toLowerCase();
      if (raw.includes('green') || raw === 'high') {
        result.confidence.color = 'green';
      } else if (raw.includes('red') && !raw.includes('yellow')) {
        result.confidence.color = 'red';
      } else {
        result.confidence.color = 'yellow';
      }
      const reason = confText.substring(colorMatch[0].length).replace(/^\s*[—–-]\s*/, '').trim();
      result.confidence.reason = reason;
    }
  }

  // seeking
  const seekingSection = extractSection(content, 'Seeking');
  if (seekingSection) {
    result.seeking = seekingSection.split('\n')[0].trim();
  }

  // producer
  const producerSection = extractSection(content, 'Producer');
  if (producerSection) {
    result.producer = producerSection.split('\n')[0].trim();
  }

  // JTBD from summary (some formats have it here)
  const jtbdSection = extractSection(content, 'JTBD');
  if (jtbdSection) {
    result.jtbd = jtbdSection.split('\n').filter(l => l.trim()).join(' ').trim();
  }

  // Pipeline Cost
  const costSection = extractSection(content, 'Pipeline Cost');
  if (costSection) {
    const sessMatch = costSection.match(/(\d+)\s*sessions?/i);
    const costMatch = costSection.match(/~?\$[\d.]+/);
    if (sessMatch || costMatch) {
      result.pipelineCost = {
        sessions: sessMatch ? sessMatch[1] : '',
        estCost: costMatch ? costMatch[0] : '',
      };
    }
  }

  return result;
}

function parseOutcomes(content) {
  if (!content) return {};
  const result = {};

  // Job
  const jobSection = extractSection(content, 'Job');
  if (jobSection) {
    result.job = jobSection.split('\n').filter(l => l.trim() && !l.startsWith('|')).join(' ').trim();
  }

  // Occasion
  const occasionSection = extractSection(content, 'Occasion');
  if (occasionSection && !isMigrationPlaceholder(occasionSection)) {
    const rows = parseNamedTable(occasionSection);
    if (rows.length > 0) {
      const occ = { name: null, description: null, time: null, social: null, need: null, struggle: null, evidence: null };
      for (const row of rows) {
        const dim = (row.dimension || '').toLowerCase();
        const val = row.value || '';
        if (dim === 'time') occ.time = val;
        else if (dim === 'social') occ.social = val;
        else if (dim === 'need') occ.need = val;
        else if (dim === 'struggle') occ.struggle = val;
        else if (dim === 'name') occ.name = val;
        else if (dim === 'description') occ.description = val;
      }
      // Only set if at least one field was populated
      if (occ.time || occ.social || occ.need || occ.struggle) {
        result.occasion = occ;
      }
    }
  }

  // Outcome Map
  const outcomeMapSection = extractSection(content, 'Outcome Map');
  if (outcomeMapSection && !isMigrationPlaceholder(outcomeMapSection)) {
    const map = { discover: [], decide: [], do: [], resolve: [] };
    const steps = ['discover', 'decide', 'do', 'resolve'];
    for (const step of steps) {
      // Find the ### Step subsection
      const stepRegex = new RegExp(`###\\s+${step}[\\s\\S]*?(?=###|$)`, 'i');
      const stepMatch = outcomeMapSection.match(stepRegex);
      if (stepMatch) {
        const tableRows = parseTable(stepMatch[0]);
        for (const cells of tableRows) {
          if (cells.length >= 5) {
            map[step].push({
              num: cells[0].trim(),
              text: cells[1].trim(),
              i: cells[2].trim(),
              s: cells[3].trim(),
              opp: cells[4].trim(),
              source: cells[5] ? cells[5].trim() : '',
            });
          }
        }
      }
    }
    if (map.discover.length || map.decide.length || map.do.length || map.resolve.length) {
      result.outcomeMap = map;
    }
  }

  // Top Underserved Outcomes
  const topSection = extractSection(content, 'Top Underserved Outcomes');
  if (topSection && !isMigrationPlaceholder(topSection)) {
    const items = [];
    const lines = topSection.split('\n').filter(l => /^\d+\.\s/.test(l.trim()));
    for (const line of lines) {
      // Format: N. **#X** Description — **Y.Z** [source] — reason
      const numMatch = line.match(/#(\d+)/);
      const oppMatch = line.match(/\*\*(\d+\.?\d*)\*\*/g);
      const stepMatch = line.match(/\b(Discover|Decide|Do|Resolve)\b/i);
      const cleaned = line.replace(/^\d+\.\s*/, '').trim();
      const textMatch = cleaned.match(/\*\*#\d+\*\*\s*(.+?)\s*[—–-]\s*\*\*/);
      const sourceMatch = cleaned.match(/\[([^\]]*)\]/);

      const num = numMatch ? parseInt(numMatch[1]) : 0;
      let opp = 0;
      if (oppMatch && oppMatch.length >= 2) {
        opp = parseFloat(oppMatch[1].replace(/\*\*/g, ''));
      } else if (oppMatch) {
        opp = parseFloat(oppMatch[0].replace(/\*\*/g, ''));
      }
      const text = textMatch ? textMatch[1].trim() : cleaned.replace(/\*\*/g, '').replace(/#\d+/, '').trim();

      items.push({
        num,
        text: text.split(' — ')[0].split(' – ')[0].trim(),
        i: 0, s: 0,
        opp,
        step: stepMatch ? stepMatch[1] : '',
        source: sourceMatch ? sourceMatch[1] : '',
      });
    }
    if (items.length > 0) result.topOutcomes = items;
  }

  // Research section
  const researchSection = extractSection(content, 'Research') || extractSection(content, 'Key Data');
  if (researchSection && !isMigrationPlaceholder(researchSection)) {
    const research = {};
    // Parse bullet points for affected, opportunity size, complexity
    const lines = researchSection.split('\n');
    for (const line of lines) {
      const l = line.trim();
      if (l.match(/^-\s*Affected:/i)) {
        research.affected = l.replace(/^-\s*Affected:\s*/i, '').trim();
      }
      if (l.match(/^-\s*Opportunity\s*size:/i)) {
        research.opportunitySize = l.replace(/^-\s*Opportunity\s*size:\s*/i, '').trim();
      }
    }

    // Parse key data table
    const tableRows = parseNamedTable(researchSection);
    if (tableRows.length > 0) {
      research.keyDataPoints = tableRows.map(r => ({
        label: r.metric || r.label || '',
        value: r.value || '',
        source: r.source || '',
        sourceUrl: '',
      }));
    }
    if (Object.keys(research).length > 0) result.research = research;
  }

  return result;
}

function parseDecisions(content) {
  if (!content) return {};
  const result = {};

  // Resolved Decisions or Key Decisions table
  const resolvedSection = extractSection(content, 'Resolved Decisions') || extractSection(content, 'Key Decisions');
  if (resolvedSection) {
    const rows = parseTable(resolvedSection);
    const decisions = [];
    for (const cells of rows) {
      if (cells.length >= 4) {
        decisions.push({
          num: parseInt(cells[0]) || decisions.length + 1,
          decision: cells[1].replace(/\*\*/g, '').trim(),
          why: cells[2].trim(),
          when: cells[3].trim(),
        });
      }
    }
    if (decisions.length > 0) result.decisions = decisions;
  }

  // Open Questions
  const oqSection = extractSection(content, 'Open Questions');
  if (oqSection) {
    // Two formats: with or without # column
    const rows = parseTable(oqSection);
    const questions = [];
    if (rows.length > 0) {
      // Detect format by checking header
      const headerLine = oqSection.split('\n').find(l => l.trim().startsWith('|'));
      const hasNumCol = headerLine && headerLine.toLowerCase().includes('| # |');
      const hasRaisedCol = headerLine && headerLine.toLowerCase().includes('raised');

      for (const cells of rows) {
        if (hasNumCol && hasRaisedCol && cells.length >= 5) {
          // # | Question | Raised in | Owner | Status
          questions.push({
            question: cells[1].trim(),
            owner: cells[3].trim(),
            status: cells[4].trim(),
          });
        } else if (hasNumCol && cells.length >= 4) {
          // # | Question | Owner | Status
          questions.push({
            question: cells[1].trim(),
            owner: cells[2].trim(),
            status: cells[3].trim(),
          });
        } else if (cells.length >= 3) {
          // Question | Owner | Status
          questions.push({
            question: cells[0].trim(),
            owner: cells[1].trim(),
            status: cells[2].trim(),
          });
        }
      }
    }

    // Also handle bullet list format
    if (questions.length === 0) {
      const bulletLines = oqSection.split('\n').filter(l => l.trim().startsWith('-'));
      for (const line of bulletLines) {
        const text = line.replace(/^-\s*/, '').trim();
        const ownerMatch = text.match(/[—–-]\s*\*?([^*]+)\*?\s*$/);
        questions.push({
          question: ownerMatch ? text.substring(0, text.indexOf(ownerMatch[0])).trim() : text,
          owner: ownerMatch ? ownerMatch[1].trim() : '',
          status: 'Open',
        });
      }
    }

    if (questions.length > 0) result.openQuestions = questions;
  }

  // Decision Log — parse from the decisions.md file itself (### sections)
  // or from referenced decision-log.md
  const logSections = [];
  const logRegex = /###\s+(.+?)\s+[—–-]\s+(\d{4}-\d{2}-\d{2})/g;
  let logMatch;
  while ((logMatch = logRegex.exec(content)) !== null) {
    const skill = logMatch[1].trim();
    const date = logMatch[2].trim();
    const sectionStart = logMatch.index + logMatch[0].length;
    const nextSection = content.indexOf('\n### ', sectionStart);
    const sectionEnd = nextSection !== -1 ? nextSection : content.length;
    const sectionText = content.substring(sectionStart, sectionEnd);

    const entries = [];
    const qaRegex = /\*\*Q\d+\*\*:\s*(.+?)\n\*\*A\d+\*\*:\s*([\s\S]*?)(?=\n\*\*Q\d+\*\*:|\n###|\n---|\n$|$)/g;
    let qaMatch;
    while ((qaMatch = qaRegex.exec(sectionText)) !== null) {
      entries.push({
        q: qaMatch[1].trim(),
        a: qaMatch[2].trim(),
      });
    }

    if (entries.length > 0) {
      logSections.push({ skill, date, entries });
    }
  }
  if (logSections.length > 0) result.decisionLog = logSections;

  return result;
}

function parseDecisionLog(content) {
  if (!content) return null;
  const logSections = [];
  const logRegex = /###\s+(.+?)\s+[—–-]\s+(\d{4}-\d{2}-\d{2})/g;
  let logMatch;
  while ((logMatch = logRegex.exec(content)) !== null) {
    const skill = logMatch[1].trim();
    const date = logMatch[2].trim();
    const sectionStart = logMatch.index + logMatch[0].length;
    const nextSection = content.indexOf('\n### ', sectionStart);
    const sectionEnd = nextSection !== -1 ? nextSection : content.length;
    const sectionText = content.substring(sectionStart, sectionEnd);

    const entries = [];
    const qaRegex = /\*\*Q\d+\*\*:\s*(.+?)\n\*\*A\d+\*\*:\s*([\s\S]*?)(?=\n\*\*Q\d+\*\*:|\n###|\n---|\n$|$)/g;
    let qaMatch;
    while ((qaMatch = qaRegex.exec(sectionText)) !== null) {
      entries.push({
        q: qaMatch[1].trim(),
        a: qaMatch[2].trim(),
      });
    }

    if (entries.length > 0) {
      logSections.push({ skill, date, entries });
    }
  }
  return logSections.length > 0 ? logSections : null;
}

function parseScope(content) {
  if (!content) return {};
  const result = {};

  // Build items
  const buildSection = extractSection(content, 'Build') || extractSection(content, 'What to Build');
  if (buildSection && !isMigrationPlaceholder(buildSection)) {
    const items = buildSection.split('\n')
      .filter(l => l.trim().startsWith('-'))
      .map(l => l.replace(/^-\s*/, '').trim())
      .filter(l => l.length > 0);
    if (items.length > 0) result.whatToBuild = items;
  }

  // Don't Build
  const dontSection = extractSection(content, "Don't Build") || extractSection(content, "Dont Build") || extractSection(content, "Don\u2019t Build");
  if (dontSection && !isMigrationPlaceholder(dontSection)) {
    const items = dontSection.split('\n')
      .filter(l => l.trim().startsWith('-'))
      .map(l => l.replace(/^-\s*/, '').trim())
      .filter(l => l.length > 0);
    if (items.length > 0) result.dontBuild = items;
  }

  // Later
  const laterSection = extractSection(content, 'Later');
  if (laterSection && !isMigrationPlaceholder(laterSection)) {
    const items = [];
    const lines = laterSection.split('\n').filter(l => l.trim().startsWith('-'));
    for (const line of lines) {
      const text = line.replace(/^-\s*/, '').trim();
      // Format: Item text (Phase N — reason)
      const phaseMatch = text.match(/\(([^)]*Phase\s*\d+)[^)]*(?:[—–-]\s*(.+))?\)/i);
      if (phaseMatch) {
        const itemText = text.substring(0, text.indexOf('(')).trim();
        items.push({
          item: itemText || text,
          phase: phaseMatch[1].trim(),
          reason: phaseMatch[2] ? phaseMatch[2].trim() : '',
        });
      } else {
        // Try table format
        items.push({ item: text, phase: '', reason: '' });
      }
    }
    // Also handle table format
    const tableRows = parseTable(laterSection);
    for (const cells of tableRows) {
      if (cells.length >= 2) {
        items.push({
          item: cells[0].trim(),
          phase: cells[1].trim(),
          reason: cells[2] ? cells[2].trim() : '',
        });
      }
    }
    if (items.length > 0) result.later = items;
  }

  // Build Context
  const bcSection = extractSection(content, 'Build Context');
  if (bcSection && !isMigrationPlaceholder(bcSection)) {
    const tableRows = parseNamedTable(bcSection);
    if (tableRows.length > 0) {
      result.buildContext = tableRows.map(r => ({
        component: r.component || '',
        status: r.status || '',
        statusColor: (r.status || '').toLowerCase().includes('exists') ? 'green'
          : (r.status || '').toLowerCase().includes('new') ? 'red' : 'yellow',
        notes: r.notes || '',
      }));
    }
  }

  return result;
}

function parseMetrics(content) {
  if (!content) return {};
  const result = {};

  // North Star
  const nsSection = extractSection(content, 'North Star');
  if (nsSection && !isMigrationPlaceholder(nsSection)) {
    const tableRows = parseNamedTable(nsSection);
    if (tableRows.length > 0) {
      const row = tableRows[0];
      result.northStar = {
        name: row.metric || row.name || row.kr || '',
        outcomeNum: row['outcome #'] || row.outcome || '',
        oppScore: row['opp score'] || row.opp || '',
        baseline: row.baseline || '',
        target: row.target || row['target (90d)'] || '',
        confidence: row.confidence || '',
      };
    } else {
      // Key-value format (metric: X, outcome: Y, etc.)
      const kv = {};
      nsSection.split('\n').forEach(line => {
        const m = line.match(/^(\w+):\s*(.+)/);
        if (m) kv[m[1].toLowerCase()] = m[2].trim();
      });
      if (kv.metric) {
        result.northStar = {
          name: kv.metric || '',
          outcomeNum: kv.outcome || '',
          oppScore: kv.oppscore || kv.opp || '',
          baseline: kv.baseline || '',
          target: kv.target || '',
          confidence: kv.confidence || '',
          instrument: kv.instrument || '',
        };
      }
    }
  }

  // Measures / Input Metrics / Success Criteria
  const measuresSection = extractSection(content, 'Measures') || extractSection(content, 'Input Metrics') || extractSection(content, 'Success Criteria');
  if (measuresSection && !isMigrationPlaceholder(measuresSection)) {
    const tableRows = parseNamedTable(measuresSection);
    if (tableRows.length > 0) {
      result.inputs = tableRows.map(r => ({
        name: r.metric || r.name || r.kr || '',
        outcomeNum: r['outcome #'] || r.outcome || '',
        oppScore: r['opp score'] || r.opp || '',
        baseline: r.baseline || '',
        target: r.target || r['target (90d)'] || '',
        confidence: r.confidence || '',
      }));
    }
  }

  // Guardrails
  const guardSection = extractSection(content, 'Guardrails');
  if (guardSection && !isMigrationPlaceholder(guardSection)) {
    const tableRows = parseNamedTable(guardSection);
    if (tableRows.length > 0) {
      result.guardrails = tableRows.map(r => ({
        name: r.metric || r.name || r.kr || '',
        outcomeNum: r['outcome #'] || r.outcome || '',
        oppScore: r['opp score'] || r.opp || '',
        baseline: r.baseline || '',
        target: r.target || r['target (90d)'] || '',
        confidence: r.confidence || '',
      }));
    }
  }

  // Kill Criteria
  const killSection = extractSection(content, 'Kill Criteria');
  if (killSection && !isMigrationPlaceholder(killSection)) {
    const tableRows = parseNamedTable(killSection);
    if (tableRows.length > 0) {
      result.killCriteria = tableRows.map(r => ({
        condition: r.condition || r.criterion || '',
        timeframe: r.timeframe || r.window || '',
        action: r.action || '',
      }));
    }
  }

  // Goals Alignment
  const goalsSection = extractSection(content, 'Goals Alignment') || extractSection(content, 'Alignment');
  if (goalsSection && !isMigrationPlaceholder(goalsSection)) {
    const lines = goalsSection.split('\n').filter(l => l.trim());
    // Handle key-value format (goal: X, mechanism: Y)
    const kv = {};
    lines.forEach(l => {
      const m = l.match(/^(\w+):\s*(.+)/);
      if (m) kv[m[1].toLowerCase()] = m[2].trim();
    });
    if (kv.goal || kv.mechanism) {
      result.goalsAlignment = {
        goal: (kv.goal || '').replace(/\*\*/g, ''),
        mechanism: (kv.mechanism || '').replace(/\*\*/g, ''),
      };
    } else if (lines.length >= 1) {
      result.goalsAlignment = {
        goal: lines[0].replace(/^-\s*/, '').replace(/\*\*/g, '').trim(),
        mechanism: lines.slice(1).join(' ').replace(/^-\s*/, '').trim(),
      };
    }
  }

  return result;
}

function parseCompetitors(content) {
  if (!content) return null;

  // Check if content is just migration placeholders
  const sections = ['Strategic Read', 'Differentiators', 'Table Stakes', 'Key Takeaways'];
  const hasContent = sections.some(s => {
    const sec = extractSection(content, s);
    return sec && !isMigrationPlaceholder(sec);
  });
  if (!hasContent) return null;

  const result = {};

  const srSection = extractSection(content, 'Strategic Read');
  if (srSection && !isMigrationPlaceholder(srSection)) result.strategicRead = srSection;

  const tsSection = extractSection(content, 'Table Stakes');
  if (tsSection && !isMigrationPlaceholder(tsSection)) {
    result.tableStakes = tsSection.split('\n').filter(l => l.trim().startsWith('-')).map(l => l.replace(/^-\s*/, '').trim());
  }

  const diffSection = extractSection(content, 'Differentiators');
  if (diffSection && !isMigrationPlaceholder(diffSection)) {
    const tableRows = parseNamedTable(diffSection);
    if (tableRows.length > 0) result.differentiators = tableRows;
  }

  const taSection = extractSection(content, 'Key Takeaways');
  if (taSection && !isMigrationPlaceholder(taSection)) {
    const items = taSection.split('\n')
      .filter(l => l.trim().match(/^[-\d]/))
      .map(l => l.replace(/^[-\d]+[.)]\s*/, '').trim())
      .filter(l => l.length > 0);
    if (items.length > 0) result.takeaways = items;
  }

  return Object.keys(result).length > 0 ? result : null;
}

function parseJourney(content) {
  if (!content) return null;

  // New format: Direction + Insights + Storyboard + Blueprint
  const hasInsights = content.includes('## Insights');
  const hasStoryboard = content.includes('## Storyboard');
  const hasBlueprint = content.includes('## Blueprint');

  if (hasInsights || hasStoryboard || hasBlueprint) {
    // New brief-compatible format — return raw content for the renderer
    return { raw: content };
  }

  // Legacy format: Direction + Stages/mermaid
  const dirSection = extractSection(content, 'Direction');
  const stagesSection = extractSection(content, 'Stages');
  const mermaidMatch = content.match(/```mermaid\n([\s\S]*?)```/);

  const hasContent = (dirSection && !isMigrationPlaceholder(dirSection)) ||
    (stagesSection && !isMigrationPlaceholder(stagesSection)) ||
    mermaidMatch;

  if (!hasContent) return null;

  const result = {};

  if (mermaidMatch) {
    result.mermaid = mermaidMatch[1].trim();
  }

  if (stagesSection && !isMigrationPlaceholder(stagesSection)) {
    const stages = [];
    const lines = stagesSection.split('\n');
    let currentStage = null;
    for (const line of lines) {
      if (line.startsWith('### ')) {
        if (currentStage) stages.push(currentStage);
        currentStage = { stage: line.replace('### ', '').trim(), text: '' };
      } else if (currentStage && line.trim()) {
        currentStage.text += (currentStage.text ? ' ' : '') + line.trim();
      }
    }
    if (currentStage) stages.push(currentStage);
    if (stages.length > 0) result.stages = stages;
  }

  return Object.keys(result).length > 0 ? result : null;
}

function parseVariations(content) {
  if (!content) return null;

  const chosenSection = extractSection(content, 'Chosen Direction');
  const alsoSection = extractSection(content, 'Also Explored');

  if ((!chosenSection || isMigrationPlaceholder(chosenSection)) &&
      (!alsoSection || isMigrationPlaceholder(alsoSection))) {
    return null;
  }

  return { raw: content };
}

function parseFeasibility(content) {
  if (!content) return null;

  const result = {};

  // Component Scores table
  const compSection = extractSection(content, 'Component Scores');
  if (compSection) {
    const rows = parseTable(compSection);
    result.components = rows.map(cells => ({
      component: cells[0] ? cells[0].trim() : '',
      effort: cells[1] ? cells[1].trim() : '',
      deps: cells[2] ? cells[2].trim() : '',
      risk: cells[3] ? cells[3].trim() : '',
      criticality: cells[4] ? cells[4].trim() : '',
      aiReadiness: cells[5] ? cells[5].trim() : '',
      score: cells[6] ? parseFloat(cells[6]) : 0,
      driver: cells[7] ? cells[7].trim() : '',
    }));
  }

  // Coordination
  const coordSection = extractSection(content, 'Coordination');
  if (coordSection) {
    const teamMatch = coordSection.match(/Teams involved:\s*(\d+)/i);
    if (teamMatch) result.teamCount = parseInt(teamMatch[1]);
    const teamNamesMatch = coordSection.match(/Teams involved:\s*\d+\s*[—–-]\s*(.+)/i);
    if (teamNamesMatch) result.teamNames = teamNamesMatch[1].split(',').map(n => n.trim());
    const factorMatch = coordSection.match(/Coordination factor:\s*([\d.]+)/i);
    if (factorMatch) result.coordinationFactor = parseFloat(factorMatch[1]);
  }

  // Total
  const totalSection = extractSection(content, 'Total');
  if (totalSection) {
    const scoreMatch = totalSection.match(/\*\*([\d,.]+)\*\*/);
    if (scoreMatch) result.featureScore = parseFloat(scoreMatch[1].replace(/,/g, ''));
  }

  // Bottleneck Analysis
  const bnSection = extractSection(content, 'Bottleneck Analysis');
  if (bnSection) {
    result.bottleneck = bnSection.split('\n').filter(l => l.trim()).slice(0, 2).join(' ').trim();
  }

  // AI Readiness Detail
  const aiSection = extractSection(content, 'AI Readiness Detail');
  if (aiSection) {
    result.aiReadinessNarrative = aiSection.split('\n').filter(l => l.trim()).slice(0, 2).join(' ').trim();
  }

  // Risk Register
  const riskSection = extractSection(content, 'Risk Register');
  if (riskSection) {
    const rows = parseTable(riskSection);
    result.risks = rows.map(cells => ({
      risk: cells[0] ? cells[0].trim() : '',
      likelihood: cells[1] ? cells[1].trim() : '',
      impact: cells[2] ? cells[2].trim() : '',
      mitigation: cells[3] ? cells[3].trim() : '',
    }));
  }

  // Dependencies
  const depSection = extractSection(content, 'Dependencies');
  if (depSection) {
    const rows = parseTable(depSection);
    result.dependencies = rows.map(cells => ({
      dep: cells[0] ? cells[0].trim() : '',
      type: cells[1] ? cells[1].trim() : '',
      blocks: cells[2] ? cells[2].trim() : '',
      owner: cells[3] ? cells[3].trim() : '',
      status: cells[4] ? cells[4].trim() : '',
    }));
  }

  return (result.components || result.risks) ? result : null;
}

function parsePrd(content) {
  if (!content || !content.trim()) return null;
  return content.trim();
}

function parseResearchPlan(content) {
  if (!content) return null;
  const result = {};

  // Why
  const whySection = extractSection(content, 'Why');
  if (whySection) result.why = whySection.split('\n').filter(l => l.trim()).join(' ').trim();

  // Research Questions
  const rqSection = extractSection(content, 'Research Questions');
  if (rqSection) {
    result.questions = rqSection.split('\n')
      .filter(l => /^\d+\.\s/.test(l.trim()))
      .map(l => l.replace(/^\d+\.\s*/, '').replace(/\*\*/g, '').trim());
  }

  // Methods
  const methodsSection = extractSection(content, 'Recommended Methods');
  if (methodsSection) {
    const methods = [];
    const methodRegex = /###\s+(.+)/g;
    let mMatch;
    while ((mMatch = methodRegex.exec(methodsSection)) !== null) {
      const name = mMatch[1].trim();
      const start = mMatch.index + mMatch[0].length;
      const nextMethod = methodsSection.indexOf('\n### ', start);
      const end = nextMethod !== -1 ? nextMethod : methodsSection.length;
      const details = methodsSection.substring(start, end).trim()
        .split('\n').filter(l => l.trim().startsWith('-')).slice(0, 2)
        .map(l => l.replace(/^-\s*/, '').replace(/\*\*/g, '').trim()).join('; ');
      methods.push({ name, details });
    }
    result.methods = methods;
  }

  // Timeline
  const timelineSection = extractSection(content, 'Timeline');
  if (timelineSection) {
    result.timeline = timelineSection.trim();
  }

  // Exit criteria
  const exitSection = extractSection(content, 'What "enough evidence" looks like');
  if (!exitSection) {
    // Try alternate header
    const altMatch = content.match(/##\s+What.*enough.*evidence.*looks like\b[^\n]*\n([\s\S]*?)(?=\n## |\n### Completion|$)/i);
    if (altMatch) result.exitCriteria = altMatch[1].trim().split('\n').filter(l => l.trim()).join(' ').trim();
  } else {
    result.exitCriteria = exitSection.split('\n').filter(l => l.trim() && !l.startsWith('###')).join(' ').trim();
  }

  // Completion Status
  const statusMatch = content.match(/###?\s*Completion Status\b[^\n]*\n([\s\S]*?)(?=\n##[^#]|\n---|\n\*|$)/i);
  if (statusMatch) {
    result.status = statusMatch[1].split('\n')
      .filter(l => l.trim().match(/^-\s*\[/))
      .map(l => {
        const done = l.includes('[x]') || l.includes('[X]');
        const item = l.replace(/^-\s*\[[xX ]\]\s*/, '').trim();
        const noteMatch = item.match(/[—–-]\s*(.+)$/);
        return {
          item: noteMatch ? item.substring(0, item.indexOf(noteMatch[0])).trim() : item,
          done,
          note: noteMatch ? noteMatch[1].trim() : '',
        };
      });
  }

  return Object.keys(result).length > 0 ? result : null;
}

// ─── Stage Detection ─────────────────────────────────────────────────────────

function detectStage(dir) {
  if (dirExists(path.join(dir, 'build'))) return 'Built';
  if (fileExists(path.join(dir, 'explore.md'))) return 'Explored';
  if (fileExists(path.join(dir, 'define.md'))) return 'Defined';
  if (fileExists(path.join(dir, 'sketch.md'))) return 'Sketched';
  if (fileExists(path.join(dir, 'ground.md'))) return 'Ground';
  return 'Empty';
}

// ─── Title extraction ────────────────────────────────────────────────────────

function extractTitle(opportunityContent, summaryContent, slug) {
  if (opportunityContent) {
    // First line heading: # Build: Title or # Title
    const headingMatch = opportunityContent.match(/^#\s+(?:Build:\s*)?(.+)/m);
    if (headingMatch) return headingMatch[1].trim();
  }
  if (summaryContent) {
    // Try summary.md bet headline as title source
    const betSection = extractSection(summaryContent, 'Bet') || extractSection(summaryContent, 'Bet Headline');
    if (betSection && !isMigrationPlaceholder(betSection)) {
      const firstLine = betSection.split('\n')[0].trim();
      if (firstLine && firstLine.length > 3 && firstLine.length < 200) return firstLine;
    }
  }
  // Return null — let mergeField fall back to existing data, with slug as last resort
  return null;
}

function slugToTitle(slug) {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function extractJtbd(opportunityContent) {
  if (!opportunityContent) return null;
  // Blockquote in opportunity.md
  const bqMatch = opportunityContent.match(/^>\s*(.+(?:\n>\s*.+)*)/m);
  if (bqMatch) {
    return bqMatch[0].split('\n').map(l => l.replace(/^>\s*/, '')).join(' ').trim();
  }
  return null;
}

function extractTeam(opportunityContent) {
  if (!opportunityContent) return [];
  const teamMatch = opportunityContent.match(/\*\*Team\*\*:\s*(.+?)(?:\s*\||\n|$)/);
  if (teamMatch) {
    return teamMatch[1].split(',').map(t => t.trim()).filter(t => t.length > 0);
  }
  return [];
}

function extractScreens(dir) {
  const sketchesDir = path.join(dir, 'sketches');
  if (!dirExists(sketchesDir)) return [];
  // Look for a showcase or index.html and try to infer screens
  return [];
}

function extractFiles(dir) {
  const files = {
    prototype: null,
    finalShowcase: null,
    journey: null,
    variationExplorer: null,
  };
  const sketchesDir = path.join(dir, 'sketches');
  if (!dirExists(sketchesDir)) return files;

  const sketchFiles = fs.readdirSync(sketchesDir);
  if (sketchFiles.includes('final-showcase.html')) files.finalShowcase = 'sketches/final-showcase.html';
  if (sketchFiles.includes('journey.html')) files.journey = 'sketches/journey.html';
  if (sketchFiles.includes('index.html')) files.variationExplorer = 'sketches/index.html';

  // Prototype: final-showcase, or chosen variation, or first variation
  if (files.finalShowcase) files.prototype = files.finalShowcase;
  else {
    const variation = sketchFiles.find(f => f.startsWith('variation-') && f.endsWith('.html'));
    if (variation) files.prototype = 'sketches/' + variation;
  }

  // Also check for final.html
  if (sketchFiles.includes('final.html')) {
    files.prototype = files.prototype || 'sketches/final.html';
  }

  return files;
}

// ─── Main: Rebuild briefData ─────────────────────────────────────────────────

function rebuildBriefData(dir, slug) {
  // Read all source files
  const summaryContent = readFile(path.join(dir, 'summary.md'));
  const outcomesContent = readFile(path.join(dir, 'outcomes.md'));
  const decisionsContent = readFile(path.join(dir, 'decisions.md'));
  const decisionLogContent = readFile(path.join(dir, 'decision-log.md'));
  const scopeContent = readFile(path.join(dir, 'scope.md'));
  const metricsContent = readFile(path.join(dir, 'metrics.md'));
  const competitorsContent = readFile(path.join(dir, 'competitors.md'));
  const journeyContent = readFile(path.join(dir, 'journey.md'));
  const variationsContent = readFile(path.join(dir, 'variations.md'));
  const feasibilityContent = readFile(path.join(dir, 'feasibility.md'));
  const prdContent = readFile(path.join(dir, 'prd.md'));
  const opportunityContent = readFile(path.join(dir, 'opportunity.md'));
  const researchPlanContent = readFile(path.join(dir, 'research-plan.md'));

  // Parse each source
  const summary = parseSummary(summaryContent);
  const outcomes = parseOutcomes(outcomesContent);
  const decisions = parseDecisions(decisionsContent);
  const scope = parseScope(scopeContent);
  const metrics = parseMetrics(metricsContent);
  const competitors = parseCompetitors(competitorsContent);
  const journey = parseJourney(journeyContent);
  const variations = parseVariations(variationsContent);
  const feasibility = parseFeasibility(feasibilityContent);
  const prd = parsePrd(prdContent);
  const researchPlan = parseResearchPlan(researchPlanContent);

  // Also try to get decision log from decision-log.md if decisions.md didn't have it
  let decisionLog = decisions.decisionLog || null;
  if (!decisionLog && decisionLogContent) {
    decisionLog = parseDecisionLog(decisionLogContent);
  }

  // Read existing briefData if brief.html exists (for merge/preserve)
  let existingData = null;
  const briefPath = path.join(dir, 'brief.html');
  if (fileExists(briefPath)) {
    const content = readFile(briefPath);
    existingData = extractExistingBriefData(content);
  }

  // Extract title and jtbd from opportunity.md or summary.md bet headline
  const title = extractTitle(opportunityContent, summaryContent, slug);
  const jtbd = summary.jtbd || extractJtbd(opportunityContent);
  const team = extractTeam(opportunityContent);

  const today = new Date().toISOString().split('T')[0];
  const stage = detectStage(dir);
  const files = extractFiles(dir);
  const screens = existingData ? existingData.screens : [];

  // Build the new briefData, merging with existing
  const briefData = {
    meta: { slug, date: today, stage },
    title: mergeField(title, existingData, 'title') || slugToTitle(slug),
    jtbd: mergeField(jtbd, existingData, 'jtbd'),
    betHeadline: mergeField(summary.betHeadline || null, existingData, 'betHeadline'),
    occasionLabel: mergeField(summary.occasionLabel || null, existingData, 'occasionLabel'),
    opportunityLabel: mergeField(summary.opportunityLabel || null, existingData, 'opportunityLabel'),
    execSummary: mergeField(summary.execSummary || null, existingData, 'execSummary'),
    executiveSummary: mergeField(summary.executiveSummary || null, existingData, 'executiveSummary'),
    seeking: mergeField(summary.seeking || null, existingData, 'seeking'),
    producer: mergeField(summary.producer || null, existingData, 'producer'),
    doneLooksLike: existingData ? existingData.doneLooksLike : null,
    team: team.length > 0 ? team : (existingData ? existingData.team : []),
    approver: existingData ? existingData.approver : null,
    confidence: mergeField(
      (summary.confidence && summary.confidence.color) ? summary.confidence : null,
      existingData, 'confidence'
    ),
    direction: existingData ? existingData.direction : null,
    keyNumbers: mergeField(
      (summary.keyNumbers && summary.keyNumbers.opportunity) ? summary.keyNumbers : null,
      existingData, 'keyNumbers'
    ),
    occasion: mergeField(outcomes.occasion || null, existingData, 'occasion'),
    job: mergeField(outcomes.job || null, existingData, 'job'),
    outcomeMap: mergeField(outcomes.outcomeMap || null, existingData, 'outcomeMap'),
    topOutcomes: mergeField(outcomes.topOutcomes || null, existingData, 'topOutcomes'),
    research: mergeField(outcomes.research || null, existingData, 'research'),
    researchPlan: mergeField(researchPlan, existingData, 'researchPlan'),
    competitors: mergeField(competitors, existingData, 'competitors'),
    journey: mergeField(journey, existingData, 'journey'),
    variations: mergeField(variations, existingData, 'variations'),
    chosenDirection: existingData ? existingData.chosenDirection : null,
    metrics: mergeField(
      (metrics.northStar || metrics.inputs) ? metrics : null,
      existingData, 'metrics'
    ),
    killCriteria: mergeField(metrics.killCriteria || null, existingData, 'killCriteria'),
    goalsAlignment: mergeField(metrics.goalsAlignment || null, existingData, 'goalsAlignment'),
    whatToBuild: mergeField(scope.whatToBuild || null, existingData, 'whatToBuild'),
    dontBuild: mergeField(scope.dontBuild || null, existingData, 'dontBuild'),
    later: mergeField(scope.later || null, existingData, 'later'),
    buildContext: mergeField(scope.buildContext || null, existingData, 'buildContext'),
    decisions: mergeField(decisions.decisions || null, existingData, 'decisions'),
    openQuestions: mergeField(decisions.openQuestions || null, existingData, 'openQuestions'),
    decisionLog: mergeField(decisionLog, existingData, 'decisionLog'),
    feasibility: mergeField(feasibility, existingData, 'feasibility'),
    prd: mergeField(prd, existingData, 'prd'),
    pipelineCost: mergeField(summary.pipelineCost || null, existingData, 'pipelineCost'),
    files: files.prototype ? files : (existingData ? existingData.files : { prototype: null, finalShowcase: null, journey: null, variationExplorer: null }),
    screens: screens || [],
  };

  return briefData;
}

/**
 * Merge field: prefer new extraction if non-null, otherwise keep existing value.
 * This ensures we don't overwrite good data with empty extractions.
 */
function mergeField(newValue, existingData, fieldName) {
  if (newValue !== null && newValue !== undefined) return newValue;
  if (existingData && existingData[fieldName] !== undefined) return existingData[fieldName];
  return null;
}

/**
 * Extract existing briefData from a brief.html file
 */
function extractExistingBriefData(content) {
  if (!content) return null;
  const marker = 'const briefData = ';
  const start = content.indexOf(marker);
  if (start === -1) return null;

  const objStart = content.indexOf('{', start);
  let depth = 0;
  let i = objStart;
  for (; i < content.length; i++) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  const str = content.substring(start + marker.length, i + 1);
  try {
    // Use Function constructor to safely evaluate the JS object literal
    const fn = new Function('return ' + str);
    return fn();
  } catch {
    return null;
  }
}

// ─── HTML Generation ─────────────────────────────────────────────────────────

/**
 * Serialize briefData to JavaScript source string.
 * Handles strings, numbers, booleans, null, arrays, and objects.
 */
function serializeBriefData(data, indent) {
  indent = indent || 0;
  const pad = '  '.repeat(indent);
  const pad1 = '  '.repeat(indent + 1);

  if (data === null || data === undefined) return 'null';
  if (typeof data === 'boolean') return data ? 'true' : 'false';
  if (typeof data === 'number') return String(data);
  if (typeof data === 'string') {
    // Escape for JS string literal using single quotes
    const escaped = data
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
    return "'" + escaped + "'";
  }
  if (Array.isArray(data)) {
    if (data.length === 0) return '[]';
    const items = data.map(item => pad1 + serializeBriefData(item, indent + 1));
    return '[\n' + items.join(',\n') + '\n' + pad + ']';
  }
  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length === 0) return '{}';
    const props = keys.map(key => {
      const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : "'" + key + "'";
      return pad1 + safeKey + ': ' + serializeBriefData(data[key], indent + 1);
    });
    return '{\n' + props.join(',\n') + '\n' + pad + '}';
  }
  return String(data);
}

// ─── CLI Entry Point ─────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node scripts/rebuild-brief-data.js <idea-slug> | --all');
    process.exit(1);
  }

  // Import buildV2Brief from regenerate-briefs-v2.js
  let buildBriefFn;
  try {
    const { buildV2Brief } = require('./regenerate-briefs-v2');
    buildBriefFn = buildV2Brief;
  } catch (err) {
    console.error('Could not load buildV2Brief from regenerate-briefs-v2.js:', err.message);
    console.error('Falling back to direct briefData injection.');
  }

  const slugs = args[0] === '--all'
    ? fs.readdirSync(PIPELINE_DIR).filter(d => {
        const full = path.join(PIPELINE_DIR, d);
        return fs.statSync(full).isDirectory() && d !== 'index.html';
      })
    : [args[0]];

  let rebuilt = 0;
  let skipped = 0;

  for (const slug of slugs) {
    const dir = path.join(PIPELINE_DIR, slug);
    if (!dirExists(dir)) {
      console.log(`  ! Directory not found: pipeline/${slug}/`);
      skipped++;
      continue;
    }

    const briefPath = path.join(dir, 'brief.html');
    if (!fileExists(briefPath)) {
      console.log(`  ! No brief.html in pipeline/${slug}/ — skipping`);
      skipped++;
      continue;
    }

    try {
      const briefData = rebuildBriefData(dir, slug);

      let html;
      if (buildBriefFn) {
        html = buildBriefFn(briefData, slug);
      } else {
        // Fallback: inject into existing HTML
        const briefDataStr = 'const briefData = ' + serializeBriefData(briefData) + ';';
        const existing = readFile(briefPath);
        html = injectBriefData(existing, briefDataStr);
      }

      fs.writeFileSync(briefPath, html, 'utf8');
      rebuilt++;
      console.log(`  + Rebuilt ${slug}/brief.html (stage: ${briefData.meta.stage})`);
    } catch (err) {
      console.error(`  ! Error rebuilding ${slug}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`\nDone: ${rebuilt} rebuilt, ${skipped} skipped.`);
}

/**
 * Fallback: inject briefData into existing HTML by replacing the const briefData block
 */
function injectBriefData(htmlContent, briefDataStr) {
  const marker = 'const briefData = ';
  const start = htmlContent.indexOf(marker);
  if (start === -1) return htmlContent;

  const objStart = htmlContent.indexOf('{', start);
  let depth = 0;
  let i = objStart;
  for (; i < htmlContent.length; i++) {
    if (htmlContent[i] === '{') depth++;
    else if (htmlContent[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  // Find the semicolon after the closing brace
  let end = i + 1;
  if (htmlContent[end] === ';') end++;

  return htmlContent.substring(0, start) + briefDataStr + htmlContent.substring(end);
}

// ─── Module Exports (for testing) ────────────────────────────────────────────

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseSummary,
    parseOutcomes,
    parseDecisions,
    parseDecisionLog,
    parseScope,
    parseMetrics,
    parseCompetitors,
    parseJourney,
    parseVariations,
    parseFeasibility,
    parsePrd,
    parseResearchPlan,
    detectStage,
    rebuildBriefData,
    extractExistingBriefData,
    serializeBriefData,
    mergeField,
  };
}

// Run if called directly
if (require.main === module) {
  main();
}
