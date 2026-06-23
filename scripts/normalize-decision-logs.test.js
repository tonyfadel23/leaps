const assert = require('assert');
const {
  parseDecisionLog,
  normalizeSection,
  normalizeDateFormat,
  normalizeQAFormat,
  removeExtraBlankLines,
  detectDuplicateQA,
  renumberQA,
  buildNormalizedContent,
} = require('./normalize-decision-logs');

// ── parseDecisionLog ───────────────────────────────────────────

console.log('parseDecisionLog...');

// Parses standard sections
{
  const input = `# Decision Log: test-idea

## /1 Ground — 2026-06-05

**Q1:** What is this?
**A1:** A test idea.

**Q2:** Who is it for?
**A2:** Everyone.

## /2 Sketch — 2026-06-05

**Q3:** What does it look like?
**A3:** A box.
`;
  const result = parseDecisionLog(input);
  assert.strictEqual(result.title, 'test-idea');
  assert.strictEqual(result.sections.length, 2);
  assert.strictEqual(result.sections[0].skill, '/1');
  assert.strictEqual(result.sections[0].skillName, 'Ground');
  assert.strictEqual(result.sections[0].date, '2026-06-05');
  assert.strictEqual(result.sections[0].entries.length, 2);
  assert.strictEqual(result.sections[1].entries.length, 1);
  assert.strictEqual(result.sections[1].entries[0].question, 'What does it look like?');
  assert.strictEqual(result.sections[1].entries[0].answer, 'A box.');
}

// Parses double-dash separator
{
  const input = `# Decision Log: smart-restock

## /1 Ground -- 2026-06-05

**Q1**: Is this a conviction idea?
**A1**: Yes. \`[inferred]\`
`;
  const result = parseDecisionLog(input);
  assert.strictEqual(result.sections[0].date, '2026-06-05');
  assert.strictEqual(result.sections[0].originalSeparator, '--');
}

// Parses colon-outside-bold format
{
  const input = `# Decision Log: test

## /1 Ground — 2026-06-05

**Q1**: What is this?
**A1**: A test.
`;
  const result = parseDecisionLog(input);
  assert.strictEqual(result.sections[0].entries.length, 1);
  assert.strictEqual(result.sections[0].entries[0].question, 'What is this?');
}

// Handles multiline answers
{
  const input = `# Decision Log: test

## /1 Ground — 2026-06-05

**Q1:** What is this?
**A1:** This is a test idea.
It has multiple lines.
And another line.

**Q2:** What else?
**A2:** Nothing else.
`;
  const result = parseDecisionLog(input);
  assert.strictEqual(result.sections[0].entries.length, 2);
  assert(result.sections[0].entries[0].answer.includes('multiple lines'));
  assert(result.sections[0].entries[0].answer.includes('another line'));
}

// Handles Cascade sections
{
  const input = `# Decision Log: test

## /1 Ground — 2026-06-05

**Q1:** What?
**A1:** This.

## Cascade — /1 Ground re-run, 2026-06-06

**What changed:** The JTBD was refined.
**Downstream impact:** Sketch needs update.
**PM decision:** Proceed with re-sketch.
`;
  const result = parseDecisionLog(input);
  assert.strictEqual(result.sections.length, 2);
  assert.strictEqual(result.sections[1].isCascade, true);
  assert.strictEqual(result.sections[1].cascadeText, '/1 Ground re-run');
}

// Handles non-standard section titles (Quantitative Research, etc.)
{
  const input = `# Decision Log: test

## /1 Ground — 2026-06-05

**Q1:** What?
**A1:** This.

## Quantitative Research — 2026-06-08

**Q2:** Data question?
**A2:** Data answer.
`;
  const result = parseDecisionLog(input);
  assert.strictEqual(result.sections.length, 2);
  assert.strictEqual(result.sections[1].isNonStandard, true);
}

console.log('  PASS');

// ── normalizeDateFormat ────────────────────────────────────────

console.log('normalizeDateFormat...');

{
  assert.strictEqual(normalizeDateFormat('2026-06-05'), '2026-06-05');
  assert.strictEqual(normalizeDateFormat('June 5, 2026'), '2026-06-05');
  assert.strictEqual(normalizeDateFormat('6/5/2026'), '2026-06-05');
  assert.strictEqual(normalizeDateFormat('06/05/2026'), '2026-06-05');
  assert.strictEqual(normalizeDateFormat('5 June 2026'), '2026-06-05');
  assert.strictEqual(normalizeDateFormat('2026/06/05'), '2026-06-05');
  // Already correct stays the same
  assert.strictEqual(normalizeDateFormat('2026-01-15'), '2026-01-15');
}

console.log('  PASS');

// ── normalizeQAFormat ──────────────────────────────────────────

console.log('normalizeQAFormat...');

// Normalizes colon-outside-bold to colon-inside-bold
{
  const line = '**Q1**: What is this?';
  assert.strictEqual(normalizeQAFormat(line), '**Q1:** What is this?');
}

// Normalizes answer format
{
  const line = '**A1**: A test.';
  assert.strictEqual(normalizeQAFormat(line), '**A1:** A test.');
}

// Leaves already correct format alone
{
  const line = '**Q1:** What is this?';
  assert.strictEqual(normalizeQAFormat(line), '**Q1:** What is this?');
}

console.log('  PASS');

// ── removeExtraBlankLines ──────────────────────────────────────

console.log('removeExtraBlankLines...');

{
  const input = 'line 1\n\n\n\nline 2\n\n\nline 3';
  const result = removeExtraBlankLines(input);
  assert.strictEqual(result, 'line 1\n\nline 2\n\nline 3');
}

{
  // Single blank line stays
  const input = 'line 1\n\nline 2';
  assert.strictEqual(removeExtraBlankLines(input), 'line 1\n\nline 2');
}

console.log('  PASS');

// ── detectDuplicateQA ──────────────────────────────────────────

console.log('detectDuplicateQA...');

{
  const entries = [
    { qNum: 1, question: 'What is this?', answer: 'A test.' },
    { qNum: 2, question: 'Who is it for?', answer: 'Everyone.' },
    { qNum: 3, question: 'What is this?', answer: 'A test.' },
  ];
  const dupes = detectDuplicateQA(entries);
  assert.strictEqual(dupes.length, 1);
  assert.strictEqual(dupes[0].duplicate, 2); // index of the duplicate
  assert.strictEqual(dupes[0].original, 0); // index of the original
}

// No duplicates
{
  const entries = [
    { qNum: 1, question: 'What?', answer: 'This.' },
    { qNum: 2, question: 'Who?', answer: 'That.' },
  ];
  const dupes = detectDuplicateQA(entries);
  assert.strictEqual(dupes.length, 0);
}

console.log('  PASS');

// ── renumberQA ─────────────────────────────────────────────────

console.log('renumberQA...');

// Fixes gaps in numbering
{
  const sections = [
    {
      entries: [
        { qNum: 1, question: 'Q1', answer: 'A1' },
        { qNum: 2, question: 'Q2', answer: 'A2' },
      ],
    },
    {
      entries: [
        { qNum: 5, question: 'Q5', answer: 'A5' },
        { qNum: 8, question: 'Q8', answer: 'A8' },
      ],
    },
  ];
  const { sections: result, renumbered } = renumberQA(sections);
  assert.strictEqual(result[0].entries[0].qNum, 1);
  assert.strictEqual(result[0].entries[1].qNum, 2);
  assert.strictEqual(result[1].entries[0].qNum, 3);
  assert.strictEqual(result[1].entries[1].qNum, 4);
  assert.strictEqual(renumbered.length, 2); // Q5->Q3 and Q8->Q4
}

// Already sequential stays the same
{
  const sections = [
    {
      entries: [
        { qNum: 1, question: 'Q1', answer: 'A1' },
        { qNum: 2, question: 'Q2', answer: 'A2' },
      ],
    },
  ];
  const { sections: result, renumbered } = renumberQA(sections);
  assert.strictEqual(result[0].entries[0].qNum, 1);
  assert.strictEqual(result[0].entries[1].qNum, 2);
  assert.strictEqual(renumbered.length, 0);
}

console.log('  PASS');

// ── buildNormalizedContent ─────────────────────────────────────

console.log('buildNormalizedContent...');

// Produces canonical format
{
  const parsed = {
    title: 'test-idea',
    sections: [
      {
        skill: '/1',
        skillName: 'Ground',
        date: '2026-06-05',
        isCascade: false,
        isNonStandard: false,
        entries: [
          { qNum: 1, question: 'What is this?', answer: 'A test.' },
          { qNum: 2, question: 'Who is it for?', answer: 'Everyone.' },
        ],
      },
      {
        skill: '/2',
        skillName: 'Sketch',
        date: '2026-06-05',
        isCascade: false,
        isNonStandard: false,
        entries: [
          { qNum: 3, question: 'What does it look like?', answer: 'A box.' },
        ],
      },
    ],
  };
  const output = buildNormalizedContent(parsed);
  assert(output.startsWith('# Decision Log: test-idea'));
  assert(output.includes('## /1 Ground — 2026-06-05'));
  assert(output.includes('## /2 Sketch — 2026-06-05'));
  assert(output.includes('**Q1:** What is this?'));
  assert(output.includes('**A1:** A test.'));
  assert(output.includes('**Q3:** What does it look like?'));
  // Uses em dash, not double dash
  assert(!output.includes(' -- '));
}

// Preserves Cascade sections
{
  const parsed = {
    title: 'test-idea',
    sections: [
      {
        isCascade: true,
        cascadeText: '/1 Ground re-run',
        date: '2026-06-06',
        isNonStandard: false,
        rawContent: '**What changed:** JTBD refined.\n**Downstream impact:** Sketch stale.\n**PM decision:** Re-sketch.',
        entries: [],
      },
    ],
  };
  const output = buildNormalizedContent(parsed);
  assert(output.includes('## Cascade — /1 Ground re-run, 2026-06-06'));
  assert(output.includes('**What changed:**'));
}

// Preserves non-standard sections
{
  const parsed = {
    title: 'test',
    sections: [
      {
        isNonStandard: true,
        isCascade: false,
        rawHeader: '## Quantitative Research — 2026-06-08',
        entries: [
          { qNum: 1, question: 'Data Q?', answer: 'Data A.' },
        ],
      },
    ],
  };
  const output = buildNormalizedContent(parsed);
  assert(output.includes('## Quantitative Research — 2026-06-08'));
  assert(output.includes('**Q1:** Data Q?'));
}

// No trailing horizontal rules
{
  const parsed = {
    title: 'test',
    sections: [
      {
        skill: '/1',
        skillName: 'Ground',
        date: '2026-06-05',
        isCascade: false,
        isNonStandard: false,
        entries: [{ qNum: 1, question: 'Q?', answer: 'A.' }],
      },
    ],
  };
  const output = buildNormalizedContent(parsed);
  assert(!output.includes('---'));
}

// Does not include trailing metadata lines
{
  const parsed = {
    title: 'test',
    sections: [
      {
        skill: '/1',
        skillName: 'Ground',
        date: '2026-06-05',
        isCascade: false,
        isNonStandard: false,
        entries: [{ qNum: 1, question: 'Q?', answer: 'A.' }],
      },
    ],
  };
  const output = buildNormalizedContent(parsed);
  assert(!output.includes('Last updated by'));
}

console.log('  PASS');

// ── Normalize double-dash to em-dash ──────────────────────────

console.log('normalizeSection header separator...');

{
  const header = '## /1 Ground -- 2026-06-05';
  const result = normalizeSection(header);
  assert.strictEqual(result, '## /1 Ground — 2026-06-05');
}

{
  // Already uses em-dash
  const header = '## /1 Ground — 2026-06-05';
  const result = normalizeSection(header);
  assert.strictEqual(result, '## /1 Ground — 2026-06-05');
}

console.log('  PASS');

// ── End-to-end: normalize a file with mixed issues ────────────

console.log('end-to-end normalization...');

{
  const input = `# Decision Log: messy-idea

## /1 Ground -- 2026-06-05

**Q1**: What type of input is this?
**A1**: Conviction idea. \`[inferred]\`

**Q2**: Who is the segment?
**A2**: Everyone. \`[inferred]\`



## /2 Sketch -- June 5, 2026

**Q5**: What does it look like?
**A5**: A box. [autonomous]

**Q6**: Which variation?
**A6**: Variation A. [autonomous]

---

*Last updated by /2 explore, 2026-06-05*
`;

  const parsed = parseDecisionLog(input);
  // Renumber
  const { sections, renumbered } = renumberQA(parsed.sections);
  parsed.sections = sections;
  const output = buildNormalizedContent(parsed);

  // Em dash used, not double dash
  assert(output.includes('## /1 Ground — 2026-06-05'));
  // Date normalized
  assert(output.includes('## /2 Sketch — 2026-06-05'));
  // Q&A renumbered sequentially
  assert(output.includes('**Q3:** What does it look like?'));
  assert(output.includes('**A3:**'));
  assert(output.includes('**Q4:** Which variation?'));
  assert(output.includes('**A4:**'));
  // No triple+ blank lines
  assert(!output.includes('\n\n\n'));
  // No horizontal rule
  assert(!output.includes('---'));
  // No trailing metadata
  assert(!output.includes('Last updated'));
  // Colon inside bold
  assert(!output.match(/\*\*[QA]\d+\*\*:/));
}

console.log('  PASS');

console.log('\nAll tests passed.');
