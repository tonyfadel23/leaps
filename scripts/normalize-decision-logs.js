#!/usr/bin/env node
// STATUS: Migration complete. Safe to delete after 2026-07-01.

/**
 * normalize-decision-logs.js
 *
 * Scans pipeline decision-log.md files and normalizes them to canonical format.
 *
 * Usage:
 *   node scripts/normalize-decision-logs.js                 # Normalize all
 *   node scripts/normalize-decision-logs.js pharmacy-auto-refill  # One idea
 *   node scripts/normalize-decision-logs.js --dry-run       # Preview changes
 */

const fs = require('fs');
const path = require('path');

// ── Months lookup ──────────────────────────────────────────────

const MONTH_NAMES = {
  january: '01', february: '02', march: '03', april: '04',
  may: '05', june: '06', july: '07', august: '08',
  september: '09', october: '10', november: '11', december: '12',
  jan: '01', feb: '02', mar: '03', apr: '04',
  jun: '06', jul: '07', aug: '08',
  sep: '09', oct: '10', nov: '11', dec: '12',
};

// ── Skill name normalization ───────────────────────────────────

const SKILL_NAMES = {
  '1': 'Ground',
  '2': 'Sketch',
  '3': 'Define',
  '4': 'Explore',
  '5': 'Build',
};

// ── normalizeDateFormat ────────────────────────────────────────

function normalizeDateFormat(dateStr) {
  if (!dateStr) return dateStr;
  const trimmed = dateStr.trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // YYYY/MM/DD
  const slashISO = trimmed.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (slashISO) {
    return `${slashISO[1]}-${slashISO[2]}-${slashISO[3]}`;
  }

  // M/D/YYYY or MM/DD/YYYY
  const usDate = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usDate) {
    const m = usDate[1].padStart(2, '0');
    const d = usDate[2].padStart(2, '0');
    return `${usDate[3]}-${m}-${d}`;
  }

  // Month D, YYYY (e.g., "June 5, 2026")
  const longDate1 = trimmed.match(/^(\w+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (longDate1) {
    const month = MONTH_NAMES[longDate1[1].toLowerCase()];
    if (month) {
      const d = longDate1[2].padStart(2, '0');
      return `${longDate1[3]}-${month}-${d}`;
    }
  }

  // D Month YYYY (e.g., "5 June 2026")
  const longDate2 = trimmed.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/);
  if (longDate2) {
    const month = MONTH_NAMES[longDate2[2].toLowerCase()];
    if (month) {
      const d = longDate2[1].padStart(2, '0');
      return `${longDate2[3]}-${month}-${d}`;
    }
  }

  // Fallback: return as-is
  return trimmed;
}

// ── normalizeSection ───────────────────────────────────────────

function normalizeSection(header) {
  // Replace -- with em dash (—)
  return header.replace(/\s+--\s+/, ' — ');
}

// ── normalizeQAFormat ──────────────────────────────────────────

function normalizeQAFormat(line) {
  // **Q1**: text  →  **Q1:** text
  // **A1**: text  →  **A1:** text
  return line.replace(/\*\*([QA]\d+)\*\*:\s*/, '**$1:** ');
}

// ── removeExtraBlankLines ──────────────────────────────────────

function removeExtraBlankLines(text) {
  return text.replace(/\n{3,}/g, '\n\n');
}

// ── detectDuplicateQA ──────────────────────────────────────────

function detectDuplicateQA(entries) {
  const dupes = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const qMatch = entries[i].question.trim().toLowerCase() ===
                      entries[j].question.trim().toLowerCase();
      const aMatch = entries[i].answer.trim().toLowerCase() ===
                      entries[j].answer.trim().toLowerCase();
      if (qMatch && aMatch) {
        dupes.push({ original: i, duplicate: j });
      }
    }
  }
  return dupes;
}

// ── renumberQA ─────────────────────────────────────────────────

function renumberQA(sections) {
  const renumbered = [];
  let counter = 1;

  const result = sections.map(section => {
    const newEntries = section.entries.map(entry => {
      const oldNum = entry.qNum;
      const newNum = counter++;
      if (oldNum !== newNum) {
        renumbered.push({ from: oldNum, to: newNum });
      }
      return { ...entry, qNum: newNum };
    });
    return { ...section, entries: newEntries };
  });

  return { sections: result, renumbered };
}

// ── parseDecisionLog ───────────────────────────────────────────

function parseDecisionLog(content) {
  const lines = content.split('\n');
  let title = '';
  const sections = [];
  let currentSection = null;
  let currentEntry = null;
  let collectingRawContent = false;
  let rawContentLines = [];

  // Extract title from first # heading
  const titleMatch = content.match(/^#\s+Decision Log:\s*(.+)$/m);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match ## section headers
    const sectionMatch = line.match(/^##\s+(.+)$/);
    if (sectionMatch) {
      // Save any in-progress entry
      if (currentEntry && currentSection) {
        currentSection.entries.push(currentEntry);
        currentEntry = null;
      }
      // Save raw content for cascade sections
      if (collectingRawContent && currentSection) {
        currentSection.rawContent = rawContentLines.join('\n').trim();
        collectingRawContent = false;
        rawContentLines = [];
      }

      const headerText = sectionMatch[1].trim();

      // Cascade section: ## Cascade — /1 Ground re-run, 2026-06-06
      const cascadeMatch = headerText.match(/^Cascade\s*[—–-]+\s*(.+?),\s*(\S+)$/);
      if (cascadeMatch) {
        currentSection = {
          isCascade: true,
          isNonStandard: false,
          cascadeText: cascadeMatch[1].trim(),
          date: normalizeDateFormat(cascadeMatch[2].trim()),
          entries: [],
          rawContent: '',
        };
        collectingRawContent = true;
        sections.push(currentSection);
        continue;
      }

      // Standard skill section: ## /N SkillName — date  or  ## /N SkillName -- date
      const skillMatch = headerText.match(/^\/(\d+)\s+(\w+)\s*[—–-]+\s*(.+)$/);
      if (skillMatch) {
        const separator = line.includes(' -- ') ? '--' : '—';
        currentSection = {
          skill: `/${skillMatch[1]}`,
          skillName: skillMatch[2],
          date: normalizeDateFormat(skillMatch[3].trim()),
          isCascade: false,
          isNonStandard: false,
          originalSeparator: separator,
          entries: [],
        };
        sections.push(currentSection);
        continue;
      }

      // Non-standard section (e.g., "Quantitative Research — 2026-06-08")
      currentSection = {
        isNonStandard: true,
        isCascade: false,
        rawHeader: line,
        entries: [],
      };
      sections.push(currentSection);
      continue;
    }

    // Skip horizontal rules, trailing metadata, and title line
    if (/^---+$/.test(line.trim())) continue;
    if (/^\*Last updated/.test(line.trim())) continue;
    if (/^#\s+Decision Log:/.test(line)) continue;

    // If collecting raw content for a cascade section
    if (collectingRawContent && currentSection) {
      rawContentLines.push(line);
      continue;
    }

    if (!currentSection) continue;

    // Match Q&A entries:
    //   **Q1:** text   (colon inside bold)
    //   **Q1**: text   (colon outside bold)
    const qaMatch = line.match(/^\*\*([QA])(\d+)(?::\*\*|\*\*:)\s*(.*)/);
    if (qaMatch) {
      const type = qaMatch[1];
      const num = parseInt(qaMatch[2], 10);
      const text = qaMatch[3].trim();

      if (type === 'Q') {
        // Save previous entry
        if (currentEntry) {
          currentSection.entries.push(currentEntry);
        }
        currentEntry = { qNum: num, question: text, answer: '' };
      } else if (type === 'A' && currentEntry) {
        currentEntry.answer = text;
      }
      continue;
    }

    // Continuation lines for multi-line answers
    if (currentEntry && line.trim() !== '' && currentEntry.answer !== '') {
      currentEntry.answer += '\n' + line;
    } else if (currentEntry && line.trim() !== '' && currentEntry.answer === '' && currentEntry.question !== '') {
      // Continuation of question (rare but possible)
      currentEntry.question += '\n' + line;
    }
  }

  // Save final entry
  if (currentEntry && currentSection) {
    currentSection.entries.push(currentEntry);
  }
  // Save final raw content
  if (collectingRawContent && currentSection) {
    currentSection.rawContent = rawContentLines.join('\n').trim();
  }

  return { title, sections };
}

// ── buildNormalizedContent ─────────────────────────────────────

function buildNormalizedContent(parsed) {
  const parts = [];
  parts.push(`# Decision Log: ${parsed.title}`);
  parts.push('');

  for (const section of parsed.sections) {
    // Cascade section
    if (section.isCascade) {
      parts.push(`## Cascade — ${section.cascadeText}, ${section.date}`);
      parts.push('');
      if (section.rawContent) {
        parts.push(section.rawContent);
        parts.push('');
      }
      continue;
    }

    // Non-standard section (preserve header as-is, normalize em-dash)
    if (section.isNonStandard) {
      parts.push(normalizeSection(section.rawHeader));
      parts.push('');
      for (const entry of section.entries) {
        parts.push(`**Q${entry.qNum}:** ${entry.question}`);
        parts.push(`**A${entry.qNum}:** ${entry.answer}`);
        parts.push('');
      }
      continue;
    }

    // Standard skill section
    parts.push(`## ${section.skill} ${section.skillName} — ${section.date}`);
    parts.push('');

    for (const entry of section.entries) {
      parts.push(`**Q${entry.qNum}:** ${entry.question}`);
      parts.push(`**A${entry.qNum}:** ${entry.answer}`);
      parts.push('');
    }
  }

  let result = parts.join('\n');
  result = removeExtraBlankLines(result);
  // Ensure single trailing newline
  result = result.trimEnd() + '\n';
  return result;
}

// ── Main CLI logic ─────────────────────────────────────────────

function normalizeFile(filePath, dryRun) {
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = parseDecisionLog(content);

  const fixes = [];

  // 1. Detect and remove duplicates
  const allEntries = parsed.sections.flatMap(s => s.entries);
  const dupes = detectDuplicateQA(allEntries);
  if (dupes.length > 0) {
    // Remove duplicates (from each section)
    const dupeIndices = new Set(dupes.map(d => d.duplicate));
    let globalIndex = 0;
    for (const section of parsed.sections) {
      const filtered = [];
      for (const entry of section.entries) {
        if (!dupeIndices.has(globalIndex)) {
          filtered.push(entry);
        } else {
          fixes.push(`removed duplicate Q${entry.qNum}`);
        }
        globalIndex++;
      }
      section.entries = filtered;
    }
  }

  // 2. Normalize dates
  for (const section of parsed.sections) {
    if (section.date) {
      const normalized = normalizeDateFormat(section.date);
      if (normalized !== section.date) {
        fixes.push(`normalized date ${section.date} → ${normalized}`);
        section.date = normalized;
      }
    }
  }

  // 3. Normalize section separators (-- → —)
  for (const section of parsed.sections) {
    if (section.originalSeparator === '--') {
      fixes.push(`normalized separator -- → — in ${section.skill} ${section.skillName}`);
    }
  }

  // 4. Renumber Q&A
  const { sections: renumberedSections, renumbered } = renumberQA(parsed.sections);
  parsed.sections = renumberedSections;
  if (renumbered.length > 0) {
    const first = renumbered[0];
    const last = renumbered[renumbered.length - 1];
    fixes.push(`renumbered Q${first.from}→Q${first.to} through Q${last.from}→Q${last.to}`);
  }

  // 5. Check if Q&A format needs normalization (colon outside bold)
  const colonOutsideQ = content.match(/\*\*Q\d+\*\*:/g);
  if (colonOutsideQ) {
    fixes.push(`normalized Q&A format in ${colonOutsideQ.length} entries`);
  }

  // 6. Check for horizontal rules and trailing metadata
  if (/^---+$/m.test(content)) {
    fixes.push('removed horizontal rule(s)');
  }
  if (/^\*Last updated/m.test(content)) {
    fixes.push('removed trailing metadata');
  }

  // 7. Check for extra blank lines
  if (/\n{3,}/.test(content)) {
    fixes.push('cleaned up extra blank lines');
  }

  // Count total entries
  const totalEntries = parsed.sections.reduce((sum, s) => sum + s.entries.length, 0);

  // Build normalized content
  const normalized = buildNormalizedContent(parsed);

  // Check if content actually changed
  const changed = normalized !== content;

  return { normalized, fixes, totalEntries, changed };
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const filteredArgs = args.filter(a => a !== '--dry-run');
  const targetSlug = filteredArgs[0] || null;

  const pipelineDir = path.join(__dirname, '..', 'pipeline');

  if (!fs.existsSync(pipelineDir)) {
    console.error('Error: pipeline/ directory not found.');
    process.exit(1);
  }

  // Find decision-log.md files
  let ideas;
  if (targetSlug) {
    const ideaDir = path.join(pipelineDir, targetSlug);
    if (!fs.existsSync(ideaDir)) {
      console.error(`Error: idea "${targetSlug}" not found in pipeline/`);
      process.exit(1);
    }
    ideas = [targetSlug];
  } else {
    ideas = fs.readdirSync(pipelineDir).filter(d => {
      const logPath = path.join(pipelineDir, d, 'decision-log.md');
      return fs.statSync(path.join(pipelineDir, d)).isDirectory() &&
             fs.existsSync(logPath);
    });
  }

  console.log('Decision Log Normalization Report');
  console.log('=================================');

  let totalEntries = 0;
  let totalFixes = 0;
  let totalIdeas = 0;

  for (const slug of ideas.sort()) {
    const logPath = path.join(pipelineDir, slug, 'decision-log.md');
    if (!fs.existsSync(logPath)) {
      continue;
    }

    totalIdeas++;

    const { normalized, fixes, totalEntries: entries, changed } = normalizeFile(logPath, dryRun);

    totalEntries += entries;
    totalFixes += fixes.length;

    const fixSummary = fixes.length > 0
      ? `${fixes.length} fixes (${fixes.join(', ')})`
      : '0 fixes (already clean)';

    console.log(`${slug}: ${entries} entries, ${fixSummary}`);

    if (changed && !dryRun) {
      // Backup original
      const bakPath = logPath + '.bak';
      fs.copyFileSync(logPath, bakPath);
      // Write normalized
      fs.writeFileSync(logPath, normalized, 'utf8');
    } else if (changed && dryRun) {
      // In dry-run, just report
    }
  }

  console.log('');
  if (dryRun) {
    console.log(`[DRY RUN] Total: ${totalEntries} entries across ${totalIdeas} ideas, ${totalFixes} fixes would be applied`);
  } else {
    console.log(`Total: ${totalEntries} entries across ${totalIdeas} ideas, ${totalFixes} fixes applied`);
  }
}

// ── Exports for testing ────────────────────────────────────────

module.exports = {
  parseDecisionLog,
  normalizeSection,
  normalizeDateFormat,
  normalizeQAFormat,
  removeExtraBlankLines,
  detectDuplicateQA,
  renumberQA,
  buildNormalizedContent,
  normalizeFile,
};

// Run if executed directly
if (require.main === module) {
  main();
}
