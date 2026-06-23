#!/usr/bin/env node
/**
 * llm-brief-fallback.js — LLM fallback for brief data extraction
 *
 * Part of the brief rendering pipeline. Orchestrated by build-brief.js.
 * After the deterministic parser (rebuild-brief-data.js) runs, this module
 * checks each field for null/empty. For any gaps, it reads the source md
 * file and calls Claude CLI to extract the missing data as JSON.
 *
 * Usage:
 *   const { fillGapsWithLLM } = require('./llm-brief-fallback');
 *   const enriched = await fillGapsWithLLM(briefData, ideaDir, slug);
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Map of briefData fields → source files + extraction prompts
const FIELD_SOURCES = {
  topOutcomes: {
    file: 'outcomes.md',
    prompt: `Extract the top underserved outcomes from this file. Return a JSON array where each item has: { "num": number, "text": "outcome statement", "opp": number, "step": "Discover|Decide|Do|Resolve", "source": "tag" }. Only include outcomes with opp >= 3.0. Return ONLY the JSON array, no explanation.`,
  },
  'competitors.takeaways': {
    file: 'competitors.md',
    prompt: `Extract the Key Takeaways from this competitors analysis. Return a JSON array of strings, each being one takeaway insight. Convert **bold** markdown to plain text. Return ONLY the JSON array, no explanation.`,
  },
  'competitors.tableStakes': {
    file: 'competitors.md',
    prompt: `Extract the Table Stakes items from this competitors analysis. Return a JSON array of strings, each being one table stake. Return ONLY the JSON array, no explanation.`,
  },
  'competitors.strategicRead': {
    file: 'competitors.md',
    prompt: `Extract the Strategic Read section from this competitors analysis. Return a JSON string (the paragraph text). Return ONLY the JSON string, no explanation.`,
  },
  occasion: {
    file: 'outcomes.md',
    prompt: `Extract the Occasion from this file. Return a JSON object with: { "name": "occasion name", "description": "one sentence", "time": "value", "social": "value", "need": "value", "struggle": "value" }. Return ONLY the JSON object, no explanation.`,
  },
  job: {
    file: 'outcomes.md',
    prompt: `Extract the Job statement from this file. Return a JSON string with just the core functional job statement. Return ONLY the JSON string, no explanation.`,
  },
  'research.keyDataPoints': {
    file: 'outcomes.md',
    prompt: `Extract the Key Data table from this file. Return a JSON array where each row is: { "label": "metric name", "value": "the number", "source": "source name", "sourceUrl": "" }. Return ONLY the JSON array, no explanation.`,
  },
  'journey.insights': {
    file: 'journey.md',
    prompt: `Extract the Insights section. Return a JSON array of 3 objects: { "icon": "emoji or word", "title": "3-5 word title", "text": "1-2 sentence insight", "highlight": boolean }. One item should have highlight:true. Return ONLY the JSON array.`,
  },
};

/**
 * Check if a briefData field is empty/missing.
 */
function isEmpty(val) {
  if (val === null || val === undefined) return true;
  if (Array.isArray(val)) return val.length === 0;
  if (typeof val === 'object') return Object.keys(val).length === 0;
  if (typeof val === 'string') return val.trim() === '';
  return false;
}

/**
 * Get a nested field from an object using dot notation.
 */
function getField(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : null, obj);
}

/**
 * Set a nested field on an object using dot notation.
 */
function setField(obj, path, value) {
  const keys = path.split('.');
  let target = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!target[keys[i]] || typeof target[keys[i]] !== 'object') {
      target[keys[i]] = {};
    }
    target = target[keys[i]];
  }
  target[keys[keys.length - 1]] = value;
}

/**
 * Call Claude CLI to extract data from a source file.
 * Uses haiku for speed and cost.
 */
function callClaude(sourceContent, extractionPrompt) {
  const fullPrompt = `${extractionPrompt}\n\n---\n\nSource file content:\n\n${sourceContent}`;

  try {
    const result = execSync(
      `claude -p ${JSON.stringify(fullPrompt)} --model haiku --output-format text --max-turns 1`,
      {
        encoding: 'utf8',
        timeout: 30000,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, CLAUDE_CODE_ENTRYPOINT: 'cli' },
      }
    );

    // Try to parse the result as JSON
    const trimmed = result.trim();

    // Handle cases where Claude wraps in ```json ... ```
    const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : trimmed;

    return JSON.parse(jsonStr);
  } catch (err) {
    // Silent failure — deterministic parser result stands
    if (process.env.BRIEF_DEBUG) {
      console.error(`LLM fallback failed for prompt: ${extractionPrompt.substring(0, 60)}...`);
      console.error(err.message);
    }
    return null;
  }
}

/**
 * Fill gaps in briefData using LLM extraction.
 * Runs synchronously (execSync) for simplicity.
 *
 * @param {object} briefData — output from rebuildBriefData()
 * @param {string} ideaDir — path to pipeline/{slug}/
 * @param {string} slug — idea slug
 * @returns {object} — enriched briefData with gaps filled
 */
function fillGapsWithLLM(briefData, ideaDir, slug) {
  let gapCount = 0;
  let filledCount = 0;

  for (const [fieldPath, config] of Object.entries(FIELD_SOURCES)) {
    const currentValue = getField(briefData, fieldPath);

    if (!isEmpty(currentValue)) continue; // Parser got it — skip

    gapCount++;

    const sourceFile = path.join(ideaDir, config.file);
    if (!fs.existsSync(sourceFile)) continue; // No source file — skip

    const content = fs.readFileSync(sourceFile, 'utf8');
    if (!content.trim()) continue;

    console.log(`  LLM fallback: extracting ${fieldPath} from ${config.file}...`);

    const extracted = callClaude(content, config.prompt);
    if (extracted !== null) {
      setField(briefData, fieldPath, extracted);
      filledCount++;
      console.log(`  ✓ ${fieldPath} filled (${Array.isArray(extracted) ? extracted.length + ' items' : typeof extracted})`);
    } else {
      console.log(`  ✗ ${fieldPath} — LLM extraction failed, keeping empty`);
    }
  }

  if (gapCount > 0) {
    console.log(`  LLM fallback: ${filledCount}/${gapCount} gaps filled`);
  }

  return briefData;
}

module.exports = { fillGapsWithLLM, FIELD_SOURCES };
