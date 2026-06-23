#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PIPELINE_DIR = path.join(ROOT, 'pipeline');
const OUTPUT = path.join(PIPELINE_DIR, 'index.html');

const STAGES = ['Landscape', 'Learned', 'Explored', 'Assessed', 'Proven', 'Shipped'];

const STAGE_COLORS = {
  Landscape: { bg: '#fff7ed', border: '#f97316', text: '#9a3412' },
  Learned: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  Explored: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  Assessed: { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
  Proven: { bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6' },
  Shipped: { bg: '#d1fae5', border: '#059669', text: '#064e3b' },
};

const LEVEL_ORDER = ['High', 'Medium-High', 'Medium', 'Medium-Low', 'Low'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugToTitle(slug) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function fileExists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function readFile(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

function truncate(str, len) {
  if (str.length <= len) return str;
  return str.substring(0, len - 1) + '\u2026';
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sortLevels(levels) {
  return levels.sort((a, b) => {
    const ia = LEVEL_ORDER.indexOf(a);
    const ib = LEVEL_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

// ── Stage Detection ──────────────────────────────────────────────────────────

function detectStage(dir) {
  // Brief is source of truth — stage uses board column names directly
  const briefPath = path.join(dir, 'brief.html');
  if (fileExists(briefPath)) {
    const match = readFile(briefPath).match(/stage:\s*'([^']+)'/);
    if (match && STAGES.includes(match[1])) return match[1];
  }

  // Fallback: detect from files (ideas without a brief yet) — highest stage wins
  if (fileExists(path.join(dir, 'ship')) && fs.statSync(path.join(dir, 'ship')).isDirectory()) return 'Shipped';
  if (fileExists(path.join(dir, 'prove.md'))) return 'Proven';
  if (fileExists(path.join(dir, 'assess.md'))) return 'Assessed';
  if (fileExists(path.join(dir, 'explore.md'))) return 'Explored';
  if (fileExists(path.join(dir, 'learn.md'))) return 'Learned';
  // legacy filenames (older runs)
  if (fileExists(path.join(dir, 'build')) && fs.statSync(path.join(dir, 'build')).isDirectory()) return 'Shipped';
  if (fileExists(path.join(dir, 'define.md'))) return 'Assessed';
  if (fileExists(path.join(dir, 'sketch.md'))) return 'Explored';
  if (fileExists(path.join(dir, 'ground.md'))) return 'Learned';

  // Landscape directories: slug ends with -landscape or contains a *-landscape.md file
  const dirName = path.basename(dir);
  if (dirName.endsWith('-landscape')) return 'Landscape';
  const files = fs.readdirSync(dir);
  if (files.some(f => f.endsWith('-landscape.md'))) return 'Landscape';

  return 'Ground';
}

function getInProgress(dir) {
  const statePath = path.join(dir, '.state.json');
  if (!fileExists(statePath)) return null;
  try {
    const state = JSON.parse(readFile(statePath));
    // .state.json exists only while a skill is mid-run (deleted on completion).
    // Real schema: { skill, phase, completed_phases: [...], context }.
    if (state.phase) return { skill: state.skill, phase: state.phase };
    return null;
  } catch { return null; }
}

// ── Data Extraction ──────────────────────────────────────────────────────────

function extractJTBD(dir) {
  const oppPath = path.join(dir, 'opportunity.md');
  if (fileExists(oppPath)) {
    const content = readFile(oppPath);
    const match = content.match(/^>\s*(.+)/m);
    if (match) return match[1].trim();
  }
  const groundPath = fileExists(path.join(dir, 'learn.md')) ? path.join(dir, 'learn.md') : path.join(dir, 'ground.md');
  if (fileExists(groundPath)) {
    const content = readFile(groundPath);
    const fieldMatch = content.match(/\*\*JTBD\*\*:\s*(.+)/);
    if (fieldMatch) return fieldMatch[1].trim();
    const headingMatch = content.match(/###\s*JTBD\s*\n([\s\S]*?)(?=\n###|\n##|$)/);
    if (headingMatch) {
      return headingMatch[1].replace(/\*\*/g, '').replace(/\n/g, ' ').trim().substring(0, 200);
    }
  }
  return '';
}

function countDecisions(dir) {
  const logPath = path.join(dir, 'decision-log.md');
  if (!fileExists(logPath)) return 0;
  return (readFile(logPath).match(/\*\*Q\d+/g) || []).length;
}

function countBlocking(dir) {
  const oppPath = path.join(dir, 'opportunity.md');
  if (!fileExists(oppPath)) return 0;
  const content = readFile(oppPath);
  const section = content.match(/## Decide before building\n([\s\S]*?)(?=\n##|$)/);
  if (!section) return 0;
  return (section[1].match(/^- /gm) || []).length;
}

function countSketches(dir) {
  const sketchDir = path.join(dir, 'sketches');
  if (!fileExists(sketchDir)) return 0;
  try { return fs.readdirSync(sketchDir).filter(f => f.endsWith('.html')).length; } catch { return 0; }
}

function hasFinalShowcase(dir) {
  return fileExists(path.join(dir, 'sketches', 'final-showcase.html'));
}

function getLastUpdated(dir) {
  const oppPath = path.join(dir, 'opportunity.md');
  if (!fileExists(oppPath)) return '';
  const match = readFile(oppPath).match(/\*(?:Last updated|Created) by .+?,\s*(.+?)\*/);
  return match ? match[1].trim() : '';
}

function getEvalScore(dir) {
  // Deep LLM scorecards now live under the idea: pipeline/{slug}/eval/*.md
  const evalDir = path.join(dir, 'eval');
  if (!fileExists(evalDir)) return null;
  try {
    // Date-stamped scorecards only (YYYY-MM-DD.md) — skip phase-checks/feedback.
    const files = fs.readdirSync(evalDir)
      .filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f)).sort().reverse();
    if (files.length === 0) return null;
    const match = readFile(path.join(evalDir, files[0])).match(/Overall:\s*([\d.]+)\s*\/\s*5\.0/);
    return match ? parseFloat(match[1]) : null;
  } catch { return null; }
}

function getPMScore(dir) {
  // Feedback moved into the idea's eval folder; scale is /4 (per-phase + skill-end).
  const feedbackPath = path.join(dir, 'eval', 'feedback.md');
  if (!fileExists(feedbackPath)) return null;
  try {
    const matches = readFile(feedbackPath).match(/\*\*Score\*\*:\s*(\d)\s*\/\s*[45]/g);
    if (!matches || matches.length === 0) return null;
    const score = matches[matches.length - 1].match(/(\d)\s*\/\s*[45]/);
    return score ? parseInt(score[1]) : null;
  } catch { return null; }
}

function extractCost(dir) {
  const oppPath = path.join(dir, 'opportunity.md');
  if (!fileExists(oppPath)) return '';
  const match = readFile(oppPath).match(/\*\*Est\. cost\*\*\s*\|\s*\*\*([^*]+)\*\*/);
  return match ? match[1].trim() : '';
}

function hasOpportunity(dir) {
  return fileExists(path.join(dir, 'opportunity.md'));
}

function extractScoring(dir) {
  const oppPath = path.join(dir, 'opportunity.md');
  if (!fileExists(oppPath)) return {};
  const content = readFile(oppPath);
  const result = {};
  const impactMatch = content.match(/\*\*Impact\*\*:\s*([\w-]+)/);
  if (impactMatch) result.impact = impactMatch[1];
  const complexityMatch = content.match(/\*\*Complexity\*\*:\s*([\w-]+)/);
  if (complexityMatch) result.complexity = complexityMatch[1];
  const confidenceMatch = content.match(/\*\*Confidence\*\*:\s*([\w-]+)/);
  if (confidenceMatch) result.confidence = confidenceMatch[1];
  return result;
}

function extractTeamInfo(dir) {
  const oppPath = path.join(dir, 'opportunity.md');
  if (!fileExists(oppPath)) return { teams: [], owner: '' };
  const content = readFile(oppPath);
  const teamMatch = content.match(/\*\*Team\*\*:\s*([^|\n*]+)/);
  const teams = teamMatch ? teamMatch[1].split(',').map(t => t.trim()).filter(Boolean) : [];
  const ownerMatch = content.match(/\*\*Owner\*\*:\s*([^|\n*]+)/);
  const owner = ownerMatch ? ownerMatch[1].trim() : '';
  return { teams, owner };
}

function extractProducer(dir) {
  const summaryPath = path.join(dir, 'summary.md');
  if (!fileExists(summaryPath)) return '';
  const content = readFile(summaryPath);
  const match = content.match(/##\s*Producer\s*\n+([^\n]+)/);
  return match ? match[1].trim() : '';
}

// ── Similarity Detection ─────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the','a','an','to','in','of','and','or','for','who','that','they','their',
  'from','on','with','want','need','but','can','are','is','it','as','by','at',
  'be','so','get','its','has','have','been','was','will','more','when','than',
  'into','also','not','all','about','would','just','like','make','each','way',
  'may','every','most','after','before','through','between','over','under',
  'same','such','own','our','this','these','those','been','being','which'
]);

function extractKeywords(text) {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function jaccardSimilarity(a, b) {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function findSimilarGroups(ideas) {
  const keywords = ideas.map(i => extractKeywords(i.jtbd));
  const groups = {};
  let groupId = 0;

  for (let i = 0; i < ideas.length; i++) {
    for (let j = i + 1; j < ideas.length; j++) {
      const sim = jaccardSimilarity(keywords[i], keywords[j]);
      if (sim > 0.25) {
        const gi = groups[ideas[i].slug];
        const gj = groups[ideas[j].slug];
        if (gi !== undefined && gj !== undefined) {
          const target = Math.min(gi, gj);
          const source = Math.max(gi, gj);
          Object.keys(groups).forEach(k => { if (groups[k] === source) groups[k] = target; });
        } else if (gi !== undefined) {
          groups[ideas[j].slug] = gi;
        } else if (gj !== undefined) {
          groups[ideas[i].slug] = gj;
        } else {
          groups[ideas[i].slug] = groupId;
          groups[ideas[j].slug] = groupId;
          groupId++;
        }
      }
    }
  }
  return groups;
}

// ── Scanner ──────────────────────────────────────────────────────────────────

function scanPipelines() {
  if (!fileExists(PIPELINE_DIR)) return [];
  const dirs = fs.readdirSync(PIPELINE_DIR).filter(d => {
    const full = path.join(PIPELINE_DIR, d);
    return fs.statSync(full).isDirectory() && d !== 'node_modules' && !d.startsWith('.');
  }).sort();

  const ideas = dirs.map(slug => {
    const dir = path.join(PIPELINE_DIR, slug);
    const scoring = extractScoring(dir);
    const teamInfo = extractTeamInfo(dir);
    return {
      slug,
      stage: detectStage(dir),
      inProgress: getInProgress(dir),
      jtbd: extractJTBD(dir),
      decisions: countDecisions(dir),
      blocking: countBlocking(dir),
      sketches: countSketches(dir),
      hasFinal: hasFinalShowcase(dir),
      lastUpdated: getLastUpdated(dir),
      evalScore: getEvalScore(dir),
      pmScore: getPMScore(dir),
      hasOpp: hasOpportunity(dir),
      cost: extractCost(dir),
      impact: scoring.impact || '',
      complexity: scoring.complexity || '',
      confidence: scoring.confidence || '',
      teams: teamInfo.teams,
      owner: teamInfo.owner,
      producer: extractProducer(dir),
    };
  });

  // Compute similarity groups
  const simGroups = findSimilarGroups(ideas);
  ideas.forEach(idea => { idea.similarGroup = simGroups[idea.slug] !== undefined ? String(simGroups[idea.slug]) : ''; });

  return ideas;
}

// ── Badge Colors ─────────────────────────────────────────────────────────────

function badgeStyle(dimension, level) {
  const l = level.toLowerCase();
  const isHigh = l.includes('high');
  const isLow = l.includes('low');

  if (dimension === 'impact') {
    if (isHigh) return 'background:#dcfce7;color:#16a34a';
    if (isLow) return 'background:#f3f4f6;color:#6b7280';
    return 'background:#fef9c3;color:#a16207';
  }
  if (dimension === 'complexity') {
    if (isHigh) return 'background:#fee2e2;color:#dc2626';
    if (isLow) return 'background:#dcfce7;color:#16a34a';
    return 'background:#fef9c3;color:#a16207';
  }
  // confidence
  if (isHigh) return 'background:#dcfce7;color:#16a34a';
  if (isLow) return 'background:#fee2e2;color:#dc2626';
  return 'background:#fef9c3;color:#a16207';
}

// ── Similar Group Colors ─────────────────────────────────────────────────────

const SIM_COLORS = ['#8b5cf6', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6', '#f97316'];

// ── Card Renderer ────────────────────────────────────────────────────────────

function renderCard(idea, cardIndex) {
  const colors = STAGE_COLORS[idea.stage];
  const title = slugToTitle(idea.slug);
  const jtbd = escapeHtml(truncate(idea.jtbd, 120));
  const link = idea.hasOpp ? idea.slug + '/opportunity.md' : idea.slug + '/';
  const inProgressHtml = idea.inProgress
    ? '<div class="in-progress-bar"><span class="in-progress-dot"></span><span class="in-progress-label">' + escapeHtml(idea.inProgress.phase) + '</span></div>'
    : '';

  // Stage pill
  const stagePill = '<span class="stage-pill" style="background:' + colors.bg + ';color:' + colors.text + ';border:1px solid ' + colors.border + '">' + idea.stage + '</span>';

  // Producer & Owner line
  const metaLine = [];
  if (idea.producer) metaLine.push(escapeHtml(idea.producer));
  if (idea.owner && idea.owner !== idea.producer) metaLine.push(escapeHtml(idea.owner));
  const metaHtml = metaLine.length > 0
    ? '<div class="card-meta"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="5" r="3"/><path d="M2 14c0-3 2.5-5 6-5s6 2 6 5"/></svg>' + metaLine.join(' · ') + '</div>'
    : '';

  // Scoring icons (impact ↑, complexity ⚙, confidence ◎)
  const scoringIcons = [];
  if (idea.impact) scoringIcons.push('<span class="score-icon" title="Impact: ' + escapeHtml(idea.impact) + '" style="' + badgeStyle('impact', idea.impact) + '"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 12V4M4 7l4-4 4 4"/></svg></span>');
  if (idea.complexity) scoringIcons.push('<span class="score-icon" title="Complexity: ' + escapeHtml(idea.complexity) + '" style="' + badgeStyle('complexity', idea.complexity) + '"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="3" cy="3" r="1.5"/><circle cx="13" cy="3" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="3" cy="13" r="1.5"/><circle cx="13" cy="13" r="1.5"/><path d="M4.2 4l2.6 2.8M9.2 9.2l2.6 2.6M11.8 4L9.2 6.8M4.2 12l2.6-2.8"/></svg></span>');
  if (idea.confidence) scoringIcons.push('<span class="score-icon" title="Confidence: ' + escapeHtml(idea.confidence) + '" style="' + badgeStyle('confidence', idea.confidence) + '"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="3"/><circle cx="8" cy="8" r="0.5" fill="currentColor"/></svg></span>');
  const badgesHtml = scoringIcons.length > 0 ? '<div class="card-badges">' + scoringIcons.join('') + '</div>' : '';

  // Stats
  const stats = [];
  if (idea.decisions > 0) stats.push('<span class="stat" title="Decisions"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4h12M2 8h8M2 12h10"/></svg>' + idea.decisions + '</span>');
  if (idea.blocking > 0) stats.push('<span class="stat blocking" title="Blocking questions"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 5v4M8 11v0"/></svg>' + idea.blocking + '</span>');
  if (idea.sketches > 0) stats.push('<span class="stat" title="Sketch files"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="12" height="12" rx="2"/><path d="M5 10l3-4 3 4"/></svg>' + idea.sketches + '</span>');

  // Eval score with color coding
  let evalHtml = '';
  if (idea.evalScore !== null) {
    const evalClass = idea.evalScore >= 4.0 ? 'eval-high' : idea.evalScore >= 3.0 ? 'eval-mid' : 'eval-low';
    evalHtml = '<span class="stat eval ' + evalClass + '" title="Eval score">' + idea.evalScore.toFixed(1) + '/5</span>';
  }
  if (idea.pmScore !== null) {
    const pmClass = idea.pmScore >= 4 ? 'pm-high' : idea.pmScore >= 3 ? 'pm-mid' : 'pm-low';
    evalHtml += '<span class="stat pm-score ' + pmClass + '" title="PM feedback score">PM ' + idea.pmScore + '/5</span>';
  }

  const statsHtml = (stats.length > 0 || evalHtml) ? '<div class="card-footer"><div class="card-stats">' + stats.join('') + '</div>' + (evalHtml ? '<div class="card-scores">' + evalHtml + '</div>' : '') + '</div>' : '';

  // Data attributes for filtering
  const dataAttrs = ' data-impact="' + escapeHtml(idea.impact) + '"'
    + ' data-complexity="' + escapeHtml(idea.complexity) + '"'
    + ' data-confidence="' + escapeHtml(idea.confidence) + '"'
    + ' data-teams="' + escapeHtml(idea.teams.join(',')) + '"'
    + ' data-owner="' + escapeHtml(idea.owner) + '"'
    + ' data-similar="' + escapeHtml(idea.similarGroup) + '"'
    + ' style="--card-index:' + cardIndex + '"';

  return '\n    <a href="' + link + '" class="card"' + dataAttrs + '>'
    + inProgressHtml
    + '<div class="card-header">'
    + '<span class="card-title">' + escapeHtml(title) + '</span>'
    + stagePill
    + '</div>'
    + metaHtml
    + (jtbd ? '<p class="card-jtbd">' + jtbd + '</p>' : '')
    + badgesHtml
    + statsHtml
    + '</a>';
}

// ── Filter Bar Generator ─────────────────────────────────────────────────────

function buildFilterBar(ideas) {
  const allImpacts = sortLevels([...new Set(ideas.map(i => i.impact).filter(Boolean))]);
  const allComplexities = sortLevels([...new Set(ideas.map(i => i.complexity).filter(Boolean))]);
  const allConfidences = sortLevels([...new Set(ideas.map(i => i.confidence).filter(Boolean))]);
  const allTeams = [...new Set(ideas.flatMap(i => i.teams))].sort();
  const hasSimilar = ideas.some(i => i.similarGroup !== '');

  function buildDropdown(id, label, values) {
    if (values.length === 0) return '';
    const options = values.map(function(v) {
      return '<label class="filter-option"><input type="checkbox" data-dim="' + id + '" data-val="' + escapeHtml(v) + '"> ' + escapeHtml(v) + '</label>';
    }).join('');
    return '<div class="filter-dropdown">'
      + '<button class="filter-btn" data-dim="' + id + '">' + label + ' <svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none"/></svg></button>'
      + '<div class="filter-panel">' + options + '</div>'
      + '</div>';
  }

  const teamDropdown = allTeams.length > 0 ? buildDropdown('team', 'Team', allTeams) : '';
  const similarBtn = hasSimilar ? '<button class="filter-btn similar-btn" data-action="similar">Similar</button>' : '';

  return '<div class="filter-bar">'
    + '<div class="filter-left">'
    + buildDropdown('impact', 'Impact', allImpacts)
    + buildDropdown('complexity', 'Complexity', allComplexities)
    + buildDropdown('confidence', 'Confidence', allConfidences)
    + teamDropdown
    + similarBtn
    + '<button class="filter-btn clear-btn" data-action="clear" style="display:none">Clear all</button>'
    + '</div>'
    + '<div class="filter-right">'
    + '<input class="search-input" placeholder="Search ideas..." />'
    + '</div>'
    + '</div>';
}

// ── HTML Generator ───────────────────────────────────────────────────────────

function generateHTML(ideas) {
  const stageGroups = {};
  STAGES.forEach(s => stageGroups[s] = []);
  ideas.forEach(idea => stageGroups[idea.stage].push(idea));

  const stageCounts = STAGES.map(s => stageGroups[s].length + ' ' + s).filter(s => !s.startsWith('0'));
  const summary = ideas.length + ' ideas \u2014 ' + stageCounts.join(', ');

  let globalCardIndex = 0;
  const columns = STAGES.map(function(stage) {
    const colors = STAGE_COLORS[stage];
    const cards = stageGroups[stage].map(function(idea) { return renderCard(idea, globalCardIndex++); }).join('\n');
    const isEmpty = stageGroups[stage].length === 0;
    const count = stageGroups[stage].length;
    const emptyState = '<div class="empty-state"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.4"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg><span>No ideas yet</span></div>';
    return '\n      <div class="column' + (isEmpty ? ' empty' : '') + '">'
      + '<div class="column-header" style="--col-bg:' + colors.bg + ';--col-text:' + colors.text + ';--col-border:' + colors.border + '">'
      + '<span class="column-title">' + stage + '</span>'
      + '<span class="column-count" data-total="' + count + '">' + count + '</span>'
      + '</div>'
      + '<div class="column-body">'
      + (cards || emptyState)
      + '</div></div>';
  }).join('\n');

  const filterBar = buildFilterBar(ideas);
  const now = new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  // Similarity group color map (embedded as data for the script)
  const simGroupSet = [...new Set(ideas.map(i => i.similarGroup).filter(Boolean))];
  const simColorMap = {};
  simGroupSet.forEach(function(g, i) { simColorMap[g] = SIM_COLORS[i % SIM_COLORS.length]; });

  const clientScript = '(function(){'
    + 'var state={impact:new Set(),complexity:new Set(),confidence:new Set(),team:new Set(),search:"",similar:false};'
    + 'var simColors=' + JSON.stringify(simColorMap) + ';'
    + 'var isFiltering=false;'

    // Toggle dropdown
    + 'document.querySelectorAll(".filter-btn[data-dim]").forEach(function(btn){'
    + '  btn.addEventListener("click",function(e){'
    + '    e.stopPropagation();'
    + '    var panel=btn.nextElementSibling;'
    + '    document.querySelectorAll(".filter-panel.open").forEach(function(p){if(p!==panel)p.classList.remove("open")});'
    + '    panel.classList.toggle("open");'
    + '  });'
    + '});'
    + 'document.addEventListener("click",function(){document.querySelectorAll(".filter-panel.open").forEach(function(p){p.classList.remove("open")})});'

    // Checkbox change
    + 'document.querySelectorAll(".filter-panel input[type=checkbox]").forEach(function(cb){'
    + '  cb.addEventListener("change",function(){'
    + '    var dim=cb.dataset.dim,val=cb.dataset.val;'
    + '    if(cb.checked)state[dim].add(val);else state[dim].delete(val);'
    + '    updateBtnLabels();applyFilters();'
    + '  });'
    + '});'

    // Similar toggle
    + 'var simBtn=document.querySelector(".similar-btn");'
    + 'if(simBtn)simBtn.addEventListener("click",function(){'
    + '  state.similar=!state.similar;'
    + '  simBtn.classList.toggle("active",state.similar);'
    + '  applyFilters();'
    + '});'

    // Clear all
    + 'var clearBtn=document.querySelector(".clear-btn");'
    + 'if(clearBtn)clearBtn.addEventListener("click",function(){'
    + '  state.impact.clear();state.complexity.clear();state.confidence.clear();state.team.clear();'
    + '  state.search="";state.similar=false;'
    + '  document.querySelector(".search-input").value="";'
    + '  document.querySelectorAll(".filter-panel input[type=checkbox]").forEach(function(cb){cb.checked=false});'
    + '  if(simBtn)simBtn.classList.remove("active");'
    + '  updateBtnLabels();applyFilters();'
    + '});'

    // Search with debounce
    + 'var searchTimer=null;'
    + 'document.querySelector(".search-input").addEventListener("input",function(e){'
    + '  state.search=e.target.value;'
    + '  clearTimeout(searchTimer);'
    + '  searchTimer=setTimeout(function(){applyFilters()},80);'
    + '});'

    // Update button labels
    + 'function updateBtnLabels(){'
    + '  ["impact","complexity","confidence","team"].forEach(function(dim){'
    + '    var btn=document.querySelector(".filter-btn[data-dim="+dim+"]");'
    + '    if(!btn)return;'
    + '    var base=btn.textContent.replace(/\\s*\\(\\d+\\)/,"").replace(/\\s*$/,"");'
    + '    var svg=btn.querySelector("svg").outerHTML;'
    + '    if(state[dim].size>0){'
    + '      btn.innerHTML=base+" ("+state[dim].size+") "+svg;'
    + '      btn.classList.add("active");'
    + '    }else{'
    + '      btn.innerHTML=base+" "+svg;'
    + '      btn.classList.remove("active");'
    + '    }'
    + '  });'
    + '  var anyActive=state.impact.size+state.complexity.size+state.confidence.size+state.team.size>0||state.search||state.similar;'
    + '  clearBtn.style.display=anyActive?"":"none";'
    + '}'

    // Apply filters with animations
    + 'function applyFilters(){'
    + '  isFiltering=state.impact.size+state.complexity.size+state.confidence.size+state.team.size>0||state.search||state.similar;'
    + '  var cards=document.querySelectorAll(".card");'
    + '  cards.forEach(function(card){'
    + '    var show=true;'
    + '    if(state.impact.size>0&&!state.impact.has(card.dataset.impact))show=false;'
    + '    if(state.complexity.size>0&&!state.complexity.has(card.dataset.complexity))show=false;'
    + '    if(state.confidence.size>0&&!state.confidence.has(card.dataset.confidence))show=false;'
    + '    if(state.team.size>0){'
    + '      var t=(card.dataset.teams||"").split(",").map(function(s){return s.trim()});'
    + '      if(!t.some(function(v){return state.team.has(v)}))show=false;'
    + '    }'
    + '    if(state.search){'
    + '      var q=state.search.toLowerCase();'
    + '      if(card.textContent.toLowerCase().indexOf(q)===-1)show=false;'
    + '    }'
    + '    if(state.similar&&!card.dataset.similar)show=false;'
    // Animated filter transitions
    + '    if(show){'
    + '      card.classList.remove("card-hidden");'
    + '      card.classList.add("card-visible");'
    + '    }else{'
    + '      card.classList.remove("card-visible");'
    + '      card.classList.add("card-hidden");'
    + '    }'
    // Search dimming — matching cards full opacity, non-matching dim
    + '    if(state.search&&show){'
    + '      card.classList.add("card-search-match");'
    + '    }else{'
    + '      card.classList.remove("card-search-match");'
    + '    }'
    // Similar group highlight
    + '    if(state.similar&&card.dataset.similar&&simColors[card.dataset.similar]){'
    + '      card.style.borderLeftColor=simColors[card.dataset.similar];'
    + '      card.style.borderLeftWidth="5px";'
    + '    }else{'
    + '      card.style.borderLeftColor="";'
    + '      card.style.borderLeftWidth="";'
    + '    }'
    + '  });'
    // Update column counts and empty states
    + '  document.querySelectorAll(".column").forEach(function(col){'
    + '    var total=col.querySelectorAll(".card").length;'
    + '    var hidden=col.querySelectorAll(".card.card-hidden").length;'
    + '    var shown=total-hidden;'
    + '    col.querySelector(".column-count").textContent=shown;'
    + '    var body=col.querySelector(".column-body");'
    + '    var existing=body.querySelector(".empty-state");'
    + '    if(shown===0&&!existing){'
    + '      var div=document.createElement("div");div.className="empty-state filtered-empty";'
    + '      div.innerHTML=\'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.3"><path d="M3 4h18M7 8h10M10 12h4"/></svg><span>No matches</span>\';'
    + '      body.appendChild(div);'
    + '    }else if(shown>0&&existing&&existing.classList.contains("filtered-empty")){'
    + '      existing.remove();'
    + '    }'
    + '    col.classList.toggle("column-filtered-empty",shown===0&&isFiltering);'
    + '  });'
    + '}'

    + '})();';

  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Product OS Pipeline</title>\n<style>\n'
    + CSS
    + '\n</style>\n</head>\n<body>\n'
    + '  <div class="header">\n'
    + '    <div class="header-left">\n'
    + '      <h1>Orbit</h1>\n'
    + '      <span class="summary">' + escapeHtml(summary) + '</span>\n'
    + '    </div>\n'
    + '    <div class="header-right">\n'
    + '      <a href="architecture-flow.html" class="header-link" title="View Architecture Flow">Architecture</a>\n'
    + '    </div>\n'
    + '  </div>\n'
    + '  ' + filterBar + '\n'
    + '  <div class="board">\n'
    + '    ' + columns + '\n'
    + '  </div>\n'
    + '  <div class="page-footer">Auto-generated by Product OS &mdash; ' + escapeHtml(now) + '</div>\n'
    + '  <script>' + clientScript + '</script>\n'
    + '</body>\n</html>';
}

// ── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f8f9fb;
    color: #1a1a2e;
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* ── Animations ── */
  @keyframes cardFadeIn {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes inProgressGlow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(255, 90, 0, 0.15); }
    50% { box-shadow: 0 0 0 4px rgba(255, 90, 0, 0.08); }
  }
  @keyframes inProgressDot {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.3); opacity: 0.6; }
  }
  @keyframes evalPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.08); }
  }
  @keyframes fadeInPanel {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  /* ── Header ── */
  .header {
    padding: 28px 36px 14px;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }
  .header-left { display: flex; align-items: baseline; gap: 16px; }
  .header-right { display: flex; align-items: center; gap: 12px; }
  .header-link {
    font-size: 13px;
    font-weight: 500;
    color: #5a5e73;
    text-decoration: none;
    padding: 5px 12px;
    border: 1px solid #e2e4ea;
    border-radius: 8px;
    transition: all 0.2s ease;
  }
  .header-link:hover {
    color: #1a1a2e;
    border-color: #c5c8d4;
    background: #f5f6f8;
  }
  .header h1 {
    font-size: 22px;
    font-weight: 700;
    color: #1a1a2e;
    letter-spacing: -0.3px;
  }
  .header .summary {
    font-size: 13px;
    color: #8b8fa3;
    font-weight: 400;
    letter-spacing: 0.1px;
  }

  /* ── Filter Bar ── */
  .filter-bar {
    padding: 8px 36px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .filter-left {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .filter-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .filter-dropdown { position: relative; }
  .filter-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    border: 1px solid #e2e4ea;
    border-radius: 8px;
    background: #fff;
    color: #5a5e73;
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    letter-spacing: 0.1px;
  }
  .filter-btn:hover {
    border-color: #c5c8d4;
    background: #f5f6f8;
    color: #3a3e52;
  }
  .filter-btn.active {
    background: #1a1a2e;
    color: #fff;
    border-color: #1a1a2e;
    box-shadow: 0 1px 3px rgba(26,26,46,0.2);
  }
  .filter-btn.active:hover {
    background: #2a2a42;
  }
  .filter-btn.active svg path { stroke: #fff; }
  .filter-btn svg { flex-shrink: 0; }
  .similar-btn.active {
    background: #7c3aed;
    color: #fff;
    border-color: #7c3aed;
    box-shadow: 0 1px 3px rgba(124,58,237,0.3);
  }
  .clear-btn {
    color: #9ca0b4;
    border-color: transparent;
    background: transparent;
    font-size: 12px;
  }
  .clear-btn:hover { color: #dc2626; background: #fef2f2; border-color: #fecaca; }

  .filter-panel {
    display: none;
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    background: #fff;
    border: 1px solid #e8e9ee;
    border-radius: 12px;
    padding: 6px;
    min-width: 190px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
    z-index: 100;
  }
  .filter-panel.open {
    display: block;
    animation: fadeInPanel 0.15s ease-out;
  }
  .filter-option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 12px;
    border-radius: 8px;
    font-size: 13px;
    color: #3a3e52;
    cursor: pointer;
    transition: background 0.12s ease;
  }
  .filter-option:hover { background: #f5f6f8; }
  .filter-option input[type="checkbox"] {
    width: 15px;
    height: 15px;
    accent-color: #1a1a2e;
    cursor: pointer;
    border-radius: 4px;
  }

  .search-input {
    padding: 7px 14px 7px 36px;
    border: 1px solid #e2e4ea;
    border-radius: 8px;
    font-size: 13px;
    font-family: inherit;
    width: 220px;
    outline: none;
    background: #fff url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239ca0b4' stroke-width='2' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='m16 16 4 4'/%3E%3C/svg%3E") 12px center no-repeat;
    transition: all 0.2s ease;
    color: #1a1a2e;
  }
  .search-input::placeholder { color: #b0b3c5; }
  .search-input:focus {
    border-color: #7c3aed;
    box-shadow: 0 0 0 3px rgba(124,58,237,0.08);
  }

  /* ── Board ── */
  .board {
    display: flex;
    gap: 14px;
    padding: 0 36px 40px;
    overflow-x: auto;
    min-height: calc(100vh - 170px);
    scroll-behavior: smooth;
  }
  .board::-webkit-scrollbar { height: 6px; }
  .board::-webkit-scrollbar-track { background: transparent; }
  .board::-webkit-scrollbar-thumb { background: #d5d7de; border-radius: 3px; }

  .column {
    flex: 1;
    min-width: 260px;
    max-width: 320px;
    display: flex;
    flex-direction: column;
    transition: opacity 0.3s ease;
  }
  .column.empty { opacity: 0.55; }
  .column.column-filtered-empty { opacity: 0.35; }

  .column-header {
    padding: 12px 16px;
    border-radius: 12px 12px 0 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 600;
    font-size: 12.5px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--col-bg);
    color: var(--col-text);
    border-bottom: 3px solid var(--col-border);
    transition: background 0.25s ease, box-shadow 0.25s ease;
  }
  .column-header:hover {
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }

  .column-count {
    background: rgba(0,0,0,0.08);
    border-radius: 10px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 700;
    min-width: 22px;
    text-align: center;
    transition: transform 0.2s ease;
  }

  .column-body {
    background: #f0f1f5;
    border-radius: 0 0 12px 12px;
    padding: 10px;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  /* ── Card ── */
  .card {
    background: #fff;
    border-radius: 10px;
    padding: 14px 16px;
    text-decoration: none;
    color: inherit;
    display: block;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03);
    transition: box-shadow 0.2s ease, transform 0.2s ease, opacity 0.25s ease, filter 0.25s ease;
    animation: cardFadeIn 0.35s ease-out both;
    animation-delay: calc(var(--card-index, 0) * 50ms);
    position: relative;
    overflow: hidden;
  }
  .card:hover {
    box-shadow: 0 8px 24px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.04);
    transform: translateY(-2px);
  }
  .card:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }

  /* Card filter states */
  .card.card-hidden {
    opacity: 0;
    transform: scale(0.95);
    pointer-events: none;
    position: absolute;
    visibility: hidden;
    height: 0;
    padding: 0;
    margin: 0;
    overflow: hidden;
  }
  .card.card-visible {
    opacity: 1;
    transform: scale(1);
    position: relative;
    visibility: visible;
    height: auto;
  }

  .card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;
  }
  .card-title {
    font-weight: 600;
    font-size: 14px;
    line-height: 1.35;
    color: #1a1a2e;
    letter-spacing: -0.1px;
    flex: 1;
  }
  .stage-pill {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 6px;
    white-space: nowrap;
    letter-spacing: 0.3px;
    text-transform: uppercase;
    flex-shrink: 0;
    line-height: 1.5;
  }

  .card-meta {
    font-size: 11.5px;
    color: #8b8fa3;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .card-meta svg { opacity: 0.6; }

  /* In-progress indicator */
  .in-progress-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    margin: -14px -16px 10px;
    background: linear-gradient(90deg, rgba(255,90,0,0.06), rgba(255,90,0,0.02));
    border-bottom: 1px solid rgba(255,90,0,0.1);
  }
  .in-progress-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: #ff5a00;
    animation: inProgressDot 2s ease-in-out infinite;
    flex-shrink: 0;
  }
  .in-progress-label {
    font-size: 11px;
    color: #ff5a00;
    font-weight: 600;
    text-transform: capitalize;
    letter-spacing: 0.2px;
  }
  /* In-progress card glow */
  .card:has(.in-progress-bar) {
    animation: cardFadeIn 0.35s ease-out both, inProgressGlow 3s ease-in-out infinite;
    box-shadow: 0 0 0 1.5px #ff5a00;
  }

  .card-jtbd {
    font-size: 12.5px;
    color: #6b6f85;
    line-height: 1.5;
    margin-bottom: 10px;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Scoring icons */
  .card-badges {
    display: flex;
    gap: 5px;
    margin-bottom: 10px;
  }
  .score-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 6px;
    transition: transform 0.15s ease;
    cursor: default;
  }
  .score-icon:hover { transform: scale(1.12); }

  /* Card footer with stats + scores */
  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    padding-top: 8px;
    border-top: 1px solid #f0f1f5;
    margin-top: auto;
  }

  /* Stats */
  .card-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
  }
  .stat {
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 6px;
    background: #f3f4f7;
    color: #6b6f85;
    white-space: nowrap;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    transition: background 0.15s ease;
  }
  .stat svg { opacity: 0.5; }
  .stat:hover { background: #e8e9ee; }
  .stat.blocking {
    background: #fef2f2;
    color: #dc2626;
    font-weight: 600;
  }
  .stat.blocking svg { stroke: #dc2626; opacity: 0.7; }

  /* Score badges */
  .card-scores {
    display: flex;
    gap: 4px;
    align-items: center;
    flex-shrink: 0;
  }
  .stat.eval, .stat.pm-score {
    font-weight: 700;
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 6px;
  }
  .stat.eval-high { background: #dcfce7; color: #15803d; }
  .stat.eval-mid { background: #fef9c3; color: #a16207; }
  .stat.eval-low {
    background: #fee2e2;
    color: #dc2626;
    animation: evalPulse 2s ease-in-out infinite;
  }
  .stat.pm-high { background: #dbeafe; color: #1d4ed8; }
  .stat.pm-mid { background: #fff7ed; color: #c2410c; }
  .stat.pm-low {
    background: #fee2e2;
    color: #dc2626;
    animation: evalPulse 2s ease-in-out infinite;
  }

  /* Empty states */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 40px 16px;
    color: #b0b3c5;
    font-size: 12.5px;
    font-weight: 500;
    border: 2px dashed #dfe0e8;
    border-radius: 10px;
    background: rgba(255,255,255,0.4);
    transition: opacity 0.3s ease;
  }
  .empty-state span { letter-spacing: 0.2px; }
  .filtered-empty {
    border-style: dashed;
    padding: 24px 16px;
    border-color: #e2e4ea;
  }

  /* Page footer */
  .page-footer {
    text-align: center;
    padding: 20px;
    font-size: 11.5px;
    color: #b0b3c5;
    letter-spacing: 0.2px;
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .header { padding: 20px 20px 10px; }
    .filter-bar { padding: 8px 20px 16px; }
    .board { padding: 0 20px 32px; gap: 10px; }
    .column { min-width: 220px; }
    .search-input { width: 160px; }
  }
`;

// ── Run ──────────────────────────────────────────────────────────────────────

const ideas = scanPipelines();
const html = generateHTML(ideas);
fs.writeFileSync(OUTPUT, html, 'utf8');
console.log('Pipeline board generated: ' + OUTPUT + ' (' + ideas.length + ' ideas)');
