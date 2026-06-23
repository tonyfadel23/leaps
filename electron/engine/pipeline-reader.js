// pipeline-reader.js — reads real pipeline/{slug}/ idea folders and produces
// the renderer view-model (the shape in src/js/data/seed.js). Pure CommonJS,
// Node built-ins only. Never throws out of listIdeas/getIdea — bad folders are
// skipped and partial objects returned. Deterministic (no Math.random).

const fs = require('fs');
const path = require('path');

// Sibling modules (written in parallel). Degrade gracefully if absent so this
// file can be run standalone for its self-test.
let computeConviction, readSidecar, loadSettings;
try {
  ({ computeConviction } = require('./conviction'));
} catch (e) {
  computeConviction = (facts) => ({
    conviction: 0, verdict: 'needs', evidence: 0,
    dimensions: [], gap: { dim: '', body: '' }, verdictLine: '',
  });
}
try {
  ({ loadSettings } = require('./settings'));
} catch (e) {
  loadSettings = () => ({ verdict: {} });
}
// Verdict thresholds from leaps.config.json — read fresh per compute so a change
// in Settings applies on the next board refresh without restarting the app.
function verdictOpts() { try { return loadSettings().verdict || {}; } catch (e) { return {}; } }
try {
  ({ readSidecar } = require('./store'));
} catch (e) {
  readSidecar = () => ({});
}

// ---------- small fs helpers (all guarded) ----------

function safeReadDir(dir) {
  try { return fs.readdirSync(dir); } catch (e) { return []; }
}

function exists(p) {
  try { fs.accessSync(p); return true; } catch (e) { return false; }
}

function safeRead(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch (e) { return ''; }
}

function safeJson(p) {
  const raw = safeRead(p);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

function safeMtime(p) {
  try { return fs.statSync(p).mtimeMs; } catch (e) { return 0; }
}

function isDir(p) {
  try { return fs.statSync(p).isDirectory(); } catch (e) { return false; }
}

// ---------- formatting helpers ----------

function prettifySlug(slug) {
  return String(slug || '')
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function initialsFrom(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function humanizeAge(mtimeMs) {
  if (!mtimeMs) return '';
  const diff = Date.now() - mtimeMs;
  if (diff < 0) return 'just now';
  const min = diff / 60000;
  if (min < 2) return 'just now';
  const hr = min / 60;
  if (hr < 1) return Math.round(min) + 'm ago';
  if (hr < 24) return Math.round(hr) + 'h ago';
  const day = hr / 24;
  if (day < 7) return Math.round(day) + 'd ago';
  const wk = day / 7;
  if (wk < 5) return Math.round(wk) + 'w ago';
  const mo = day / 30;
  return Math.round(mo) + 'mo ago';
}

function firstSentence(text) {
  const t = String(text || '').trim();
  if (!t) return '';
  const m = t.match(/^[^.!?]*[.!?]/);
  return (m ? m[0] : t).trim();
}

function firstLine(text) {
  const lines = String(text || '').split('\n');
  for (const ln of lines) {
    const t = ln.replace(/^[#>\-*\s]+/, '').trim();
    if (t) return t;
  }
  return '';
}

// A claim/number is "sourced" when it cites real data, not when it's modeled,
// inferred or pm-asserted. Tags appear inline as [data: ...] / [inferred] / [pm]
// and/or in the briefdata source/sourceUrl fields.
function isSourced(text, source, sourceUrl) {
  const blob = String(text || '');
  if (/\[\s*(inferred|pm|modeled|derived|data gap)/i.test(blob)) return false;
  if (/\[\s*data\b/i.test(blob)) return true;
  if (source && String(source).trim()) {
    if (/infer|model|assume|comp:|derived/i.test(source)) return false;
    return true;
  }
  if (sourceUrl && String(sourceUrl).trim()) return true;
  return false;
}

function hasNumber(text) {
  return /\d/.test(String(text || ''));
}

// ---------- stage mapping ----------

const STAGE_BY_SKILL = {
  '1': 'Learned', '2': 'Explored', '3': 'Assessed', '4': 'Proven', '5': 'Shipped',
};
const STAGE_RANK = { '': 0, Empty: 0, Learned: 1, Explored: 2, Assessed: 3, Proven: 4, Shipped: 5,
  // legacy aliases (archived runs)
  Grounded: 1, Sketched: 2, Defined: 3, Built: 5 };

// Map old-vocabulary labels forward. 'Explored' is shared (new 'Explored' = stage 2),
// so it passes through; the rest (incl. 'Built' -> 'Shipped') map to current vocab.
const OLD_TO_NEW = { Grounded: 'Learned', Sketched: 'Explored', Defined: 'Assessed', Built: 'Shipped' };
const normStage = (s) => OLD_TO_NEW[s] || s;

function resolveStage(brief, state) {
  // Prefer an explicit, meaningful briefdata stage.
  const bs = brief && brief.meta && brief.meta.stage;
  if (bs && bs !== 'Empty') return normStage(bs);
  // Fall back to the .state.json skill number.
  const skill = state && state.skill;
  if (skill) {
    const m = String(skill).match(/\/?(\d)/);
    if (m && STAGE_BY_SKILL[m[1]]) return STAGE_BY_SKILL[m[1]];
  }
  return normStage(bs) || '';
}

function stageRank(stage) {
  return STAGE_RANK[stage] != null ? STAGE_RANK[stage] : 0;
}

// ---------- idea discovery ----------

function isIdeaDir(dir) {
  if (!isDir(dir)) return false;
  return exists(path.join(dir, '.pipeline-id')) || exists(path.join(dir, '.briefdata.json'));
}

// Read everything we need off disk once. Returns null if the folder is unreadable.
function loadIdea(pipelineDir, slug) {
  const dir = path.join(pipelineDir, slug);
  if (!isIdeaDir(dir)) return null;

  const brief = safeJson(path.join(dir, '.briefdata.json')) || {};
  const state = safeJson(path.join(dir, '.state.json')) || {};
  let sidecar = {};
  try { sidecar = readSidecar(dir) || {}; } catch (e) { sidecar = {}; }

  const files = safeReadDir(dir);
  const hasFile = (name) => files.indexOf(name) !== -1 || exists(path.join(dir, name));
  const sketchesDir = path.join(dir, 'sketches');
  const sketchFiles = safeReadDir(sketchesDir).filter((f) => /\.html?$/i.test(f));
  const competitorsDir = path.join(dir, 'competitors');
  const hasCompetitors = exists(path.join(competitorsDir, 'analysis.md')) || hasFile('competitors.md');

  return { dir, slug, brief, state, sidecar, files, hasFile, sketchFiles, sketchesDir, competitorsDir, hasCompetitors };
}

// Newest artifact mtime, for the "updated" label.
function newestMtime(ctx) {
  let newest = 0;
  for (const f of ctx.files) {
    if (f === '.DS_Store') continue;
    const m = safeMtime(path.join(ctx.dir, f));
    if (m > newest) newest = m;
  }
  return newest;
}

// ---------- facts for the conviction engine ----------

function buildClaims(brief) {
  const summary = Array.isArray(brief.executiveSummary) ? brief.executiveSummary : [];
  return summary
    .map((s) => ({ text: String(s && s.text || '').trim(), source: String(s && s.source || '').trim() }))
    .filter((c) => c.text);
}

function buildFacts(ctx) {
  const { brief, hasFile, sketchFiles, hasCompetitors, sidecar } = ctx;
  let claims = buildClaims(brief);

  // Fold in claims established by live discovery runs. These persist in the
  // .leap.json sidecar (non-destructive) so conviction stays moved across reloads.
  // Sourced claims lift Evidence quality + Size; assumed ones don't — the rigor gate.
  if (sidecar && Array.isArray(sidecar.discoveredClaims)) {
    const extra = sidecar.discoveredClaims
      .map((c) => ({ text: String(c && c.text || '').trim(), source: c && c.source ? String(c.source).trim() : '' }))
      .filter((c) => c.text);
    if (extra.length) claims = claims.concat(extra);
  }

  // New LEAPs filenames, with legacy names as fallback (archived runs).
  const metricsTxt = safeRead(path.join(ctx.dir, 'metrics.md'));
  const defineTxt = safeRead(path.join(ctx.dir, 'assess.md')) || safeRead(path.join(ctx.dir, 'define.md'));
  const groundTxt = safeRead(path.join(ctx.dir, 'learn.md')) || safeRead(path.join(ctx.dir, 'ground.md'));
  const opportunityTxt = safeRead(path.join(ctx.dir, 'opportunity.md'));

  const has = {
    ground: !!groundTxt || hasFile('learn.md') || hasFile('ground.md'),
    sketch: hasFile('explore.md') || hasFile('sketch.md') || sketchFiles.length > 0,
    define: !!defineTxt || hasFile('assess.md') || hasFile('define.md'),
    explore: hasFile('scope.md') || hasFile('prd.md') || hasFile('execution-log.md') || hasFile('prove.md'),
    metrics: !!metricsTxt || hasFile('metrics.md'),
    sketches: sketchFiles.length > 0,
    competitors: hasCompetitors,
    killCriteria: /kill\s*criteria/i.test(metricsTxt) || /kill\s*criteria/i.test(defineTxt),
    interviews: /\binterview/i.test(opportunityTxt) || /\binterview/i.test(groundTxt) || hasFile('research-plan.md'),
  };

  // Sizing-claim accounting: total numeric claims vs how many are sourced.
  let sizingTotal = 0;
  let sizingSourced = 0;
  for (const c of claims) {
    if (!hasNumber(c.text)) continue;
    sizingTotal += 1;
    if (isSourced(c.text, c.source)) sizingSourced += 1;
  }

  return {
    stage: resolveStage(brief, ctx.state),
    claims,
    has,
    sizingSourced,
    sizingTotal,
  };
}

// ---------- takeaway / summary fields ----------

function buildTakeaway(ctx) {
  const { brief, dir } = ctx;
  const bet = firstSentence(brief.betHeadline);
  if (bet) return bet;
  const seeking = firstSentence(brief.seeking);
  if (seeking) return seeking;
  const opp = firstLine(safeRead(path.join(dir, 'opportunity.md')));
  return opp || '';
}

function cleanOwner(producer) {
  const p = String(producer || '').trim();
  if (!p || p === 'TBD' || p === 'None') return '';
  return p;
}

function buildSummary(ctx, conv) {
  const { brief, slug } = ctx;
  const owner = cleanOwner(brief.producer);
  const name = String(brief.title || '').trim() || prettifySlug(slug);
  const category = String(brief.occasionLabel || brief.opportunityLabel || '').trim();
  const stage = resolveStage(brief, ctx.state);

  return {
    id: slug,
    slug,
    name,
    category,
    owner,
    initials: initialsFrom(owner),
    updated: humanizeAge(newestMtime(ctx)),
    stage,
    conviction: conv.conviction,
    verdict: conv.verdict,
    evidence: conv.evidence,
    takeaway: buildTakeaway(ctx),
  };
}

// ---------- sizing ----------

// Turn the numeric exec-summary claims into evidence rows. Sourced numbers get
// a green (pursue) dot; modeled/inferred ones get amber (needs).
function buildSizing(ctx) {
  const { brief } = ctx;
  const claims = buildClaims(brief);
  const numericClaims = claims.filter((c) => hasNumber(c.text));
  const kn = brief.keyNumbers || {};
  const headlineNum = String(kn.opportunity || '').trim();

  if (!numericClaims.length && !headlineNum) return null;

  const rows = numericClaims.map((c) => {
    const sourced = isSourced(c.text, c.source);
    return {
      m: shortLabel(c.text),
      v: extractNumber(c.text),
      s: c.source ? c.source : (sourced ? 'Data' : 'Modeled'),
      dot: sourced ? 'var(--pursue)' : 'var(--needs)',
    };
  });

  const sourcedCount = rows.filter((r) => r.dot === 'var(--pursue)').length;
  const total = rows.length;

  const metrics = [];
  if (headlineNum) metrics.push({ v: headlineNum, l: 'Opportunity / yr', dot: null });
  const conf = brief.confidence && brief.confidence.label;
  if (conf) metrics.push({ v: conf, l: 'Confidence', dot: 'var(--needs)' });
  if (kn.complexity) metrics.push({ v: complexityLabel(kn.complexity), l: 'Complexity', dot: null });

  return {
    headline: headlineNum
      ? ('Opportunity sized at ' + headlineNum + ' — ' + (sourcedCount + ' of ' + total + ' inputs are sourced.'))
      : 'Sizing assembled from the brief — most inputs are still modeled.',
    liveLabel: sourcedCount + ' of ' + total + ' live',
    metrics,
    rows,
    note: brief.confidence && brief.confidence.reason
      ? brief.confidence.reason
      : 'Sourced numbers are live; modeled numbers still need a real measurement.',
  };
}

function extractNumber(text) {
  const t = String(text || '');
  // Currency/percent ranges first, then plain magnitudes.
  const m = t.match(/(?:[$€£]|AED\s?)?\d[\d.,]*\s?(?:[-–]\s?(?:[$€£]|AED\s?)?\d[\d.,]*)?\s?[%KMB]?(?:\/\w+)?(?:\s?(?:million|billion))?/i);
  return m ? m[0].trim() : '';
}

function shortLabel(text) {
  // Use the clause before the em-dash as the row label, stripped of tags.
  let t = String(text || '').split(/[—–-]\s/)[0].trim();
  t = t.replace(/\[[^\]]*\]/g, '').trim();
  if (t.length > 60) t = t.slice(0, 57).trim() + '…';
  return t;
}

function complexityLabel(c) {
  const map = { S: 'Small', M: 'Medium', L: 'Large', XL: 'Very large' };
  return map[String(c).toUpperCase()] || String(c);
}

// ---------- journey ----------

function buildJourney(ctx) {
  const { dir } = ctx;
  const journeyTxt = safeRead(path.join(dir, 'journey.md'));
  const sketchTxt = safeRead(path.join(dir, 'sketch.md'));
  const src = journeyTxt || sketchTxt;
  if (!src) return null;

  const steps = parseJourneySteps(src);
  if (!steps.length) return null;

  const headline = deriveJourneyHeadline(src);
  return {
    headline: headline || 'The journey hinges on the friction point below.',
    steps,
    note: deriveJourneyNote(src),
  };
}

// Parse the storyboard (caption + emotionClass + isIntervention) into steps.
function parseJourneySteps(src) {
  const steps = [];
  const blocks = src.split(/\n-\s+icon:/);
  for (const blk of blocks) {
    const captionM = blk.match(/caption:\s*(.+)/);
    const emotionM = blk.match(/emotion:\s*(.+)/);
    const negM = /emotionClass:\s*negative/.test(blk);
    const interM = /isIntervention:\s*true/.test(blk);
    if (!captionM && !emotionM) continue;
    const label = emotionM ? emotionM[1].trim() : (captionM ? firstSentence(captionM[1]) : '');
    if (!label) continue;
    steps.push({
      t: interM ? 'fix' : (steps.length + 1) + '',
      l: label.slice(0, 28),
      friction: negM,
      note: captionM ? firstSentence(captionM[1]).slice(0, 60) : undefined,
    });
    if (steps.length >= 6) break;
  }
  if (steps.length) return steps;

  // Fallback: derive 3-5 steps from the "Journey:" arrow line in opportunity/sketch.
  const arrowM = src.match(/Journey:\s*([^\n]+)/i);
  if (arrowM) {
    const parts = arrowM[1].split(/→|->|»/).map((s) => s.trim()).filter(Boolean).slice(0, 5);
    parts.forEach((p, i) => {
      steps.push({ t: (i + 1) + '', l: p.slice(0, 28), friction: i === 0 });
    });
  }
  return steps;
}

function deriveJourneyHeadline(src) {
  const descM = src.match(/description:\s*(.+)/);
  if (descM) return firstSentence(descM[1]);
  return firstLine(src);
}

function deriveJourneyNote(src) {
  const interM = src.match(/isIntervention:\s*true[\s\S]{0,400}?detail:\s*(.+)/);
  if (interM) return firstSentence(interM[1]);
  const titleM = src.match(/highlight:\s*true[\s\S]{0,200}?text:\s*(.+)/);
  if (titleM) return firstSentence(titleM[1]);
  return 'The friction point above is where the order is won or lost.';
}

// ---------- brief ----------

function buildBrief(ctx) {
  const { brief, slug } = ctx;
  if (!brief || (!brief.betHeadline && !brief.jtbd && !brief.title)) return null;

  const sections = [];
  if (brief.betHeadline) sections.push({ lbl: 'The bet', body: String(brief.betHeadline).trim() });
  if (brief.jtbd) sections.push({ lbl: 'The job', body: String(brief.jtbd).trim() });

  const unknown = deriveUnknown(ctx);
  if (unknown) sections.push({ lbl: 'The unknown', body: unknown });

  return {
    title: String(brief.title || '').trim() || prettifySlug(slug),
    sections,
  };
}

function deriveUnknown(ctx) {
  const { brief } = ctx;
  if (brief.confidence && brief.confidence.reason) return String(brief.confidence.reason).trim();
  if (brief.seeking) return firstSentence(brief.seeking);
  return '';
}

// ---------- artifacts ----------

function buildArtifacts(ctx) {
  const { dir, hasFile, sketchFiles, hasCompetitors } = ctx;
  const arts = [];

  // Research / interviews
  if (hasCompetitors) {
    const file = exists(path.join(ctx.competitorsDir, 'analysis.md')) ? 'competitors/analysis.md' : 'competitors.md';
    const txt = safeRead(path.join(dir, file));
    arts.push({
      id: 'research', kind: 'Research · competitive', title: 'Competitor analysis',
      meta: humanizeAge(safeMtime(path.join(dir, file))) || 'On file',
      strength: txt.length > 1500 ? 4 : 2, icon: 'research', file,
    });
  } else if (hasFile('research-plan.md')) {
    arts.push({
      id: 'research', kind: 'Research · plan', title: 'Research plan',
      meta: 'Drafted', strength: 2, icon: 'research', file: 'research-plan.md',
    });
  }

  // Prototype
  if (sketchFiles.length) {
    const showcase = sketchFiles.indexOf('final-showcase.html') !== -1
      ? 'final-showcase.html' : sketchFiles[0];
    arts.push({
      id: 'proto', kind: 'Prototype · ' + sketchFiles.length + ' screens', title: 'Interactive sketch',
      meta: humanizeAge(safeMtime(path.join(ctx.sketchesDir, showcase))) || 'Updated',
      strength: 3, icon: 'proto', file: 'sketches/' + showcase,
    });
  }

  // Data — pending pull, detected from instrumentation gaps in metrics.md
  const metricsTxt = safeRead(path.join(dir, 'metrics.md'));
  if (/data gap|pending|queued|BigQuery|CRM pull|needs work/i.test(metricsTxt)) {
    arts.push({
      id: 'data', kind: 'Data pull · pending', title: 'Instrumentation gap',
      meta: 'Queued', strength: 1, icon: 'data', pending: true, file: 'metrics.md',
    });
  }

  // Brief
  if (hasFile('brief.html')) {
    arts.push({
      id: 'brief', kind: 'Brief · one-pager', title: 'Opportunity brief',
      meta: humanizeAge(safeMtime(path.join(dir, 'brief.html'))) || 'Drafted',
      strength: 3, icon: 'brief', file: 'brief.html',
    });
  } else if (hasFile('opportunity.md')) {
    arts.push({
      id: 'brief', kind: 'Brief · markdown', title: 'Opportunity',
      meta: 'Drafted', strength: 2, icon: 'brief', file: 'opportunity.md',
    });
  }

  return arts;
}

// ---------- chips ----------

function buildChips(gap) {
  const topic = gap && gap.dim ? gap.dim : '';
  const chips = [];
  const topicMap = {
    evidence: 'Pull the missing evidence',
    size: 'Tighten the sizing',
    problem: 'Validate the problem',
    feasibility: 'Pressure-test feasibility',
  };
  if (topicMap[topic]) chips.push(topicMap[topic]);
  else if (topic) chips.push('Close the ' + topic + ' gap');
  chips.push('Define kill criteria');
  chips.push('Draft the test');
  return chips;
}

// ---------- public API ----------

function listIdeas(pipelineDir) {
  const out = { ideas: [], killed: [] };
  let entries = [];
  try { entries = fs.readdirSync(pipelineDir); } catch (e) { return out; }

  for (const slug of entries) {
    try {
      const ctx = loadIdea(pipelineDir, slug);
      if (!ctx) continue;

      const facts = buildFacts(ctx);
      const override = ctx.sidecar && ctx.sidecar.verdictOverride;
      let conv = normalizeConv(computeConviction(facts, verdictOpts()) || {});
      if (override) conv.verdict = override;

      if (override === 'kill') {
        out.killed.push({
          name: String(ctx.brief.title || '').trim() || prettifySlug(slug),
          reason: ctx.sidecar.killReason || 'No reason recorded',
          when: humanizeAge(newestMtime(ctx)) ? ('Killed ' + humanizeAge(newestMtime(ctx))) : 'Killed',
          owner: initialsFrom(cleanOwner(ctx.brief.producer)),
        });
        continue;
      }
      // A freshly-created concept (no stage, no claims) is a Draft, not a Kill.
      if (!override && isUnstarted(facts)) { conv.verdict = 'draft'; conv.conviction = null; }

      out.ideas.push(buildSummary(ctx, conv));
    } catch (e) {
      // Skip unreadable / malformed folders.
    }
  }

  // Deterministic order: most-advanced stage first, then name.
  out.ideas.sort((a, b) => {
    const r = stageRank(b.stage) - stageRank(a.stage);
    if (r) return r;
    return String(a.name).localeCompare(String(b.name));
  });

  return out;
}

function getIdea(pipelineDir, id) {
  try {
    const ctx = loadIdea(pipelineDir, id);
    if (!ctx) return null;

    const facts = buildFacts(ctx);
    const override = ctx.sidecar && ctx.sidecar.verdictOverride;
    let conv = normalizeConv(computeConviction(facts, verdictOpts()) || {});
    if (override) conv.verdict = override;
    else if (isUnstarted(facts)) { conv.verdict = 'draft'; conv.conviction = null; }

    const summary = buildSummary(ctx, conv);
    const view = Object.assign({}, summary, {
      dimensions: conv.dimensions || [],
      gap: conv.gap || { dim: '', body: '' },
      verdictLine: conv.verdictLine || '',
      artifacts: buildArtifacts(ctx),
      messages: [],
      chips: buildChips(conv.gap),
    });

    const sizing = buildSizing(ctx);
    if (sizing) view.sizing = sizing;

    const journey = buildJourney(ctx);
    if (journey) view.journey = journey;

    const brief = buildBrief(ctx);
    if (brief) view.brief = brief;

    return view;
  } catch (e) {
    return null;
  }
}

// Fill any conviction fields the engine omitted, so the view-model is complete.
// A concept with no stage reached and no claims is brand-new — show it as a Draft.
function isUnstarted(facts) {
  return (!facts.claims || facts.claims.length === 0) && (!facts.stage || facts.stage === 'Empty');
}

function normalizeConv(conv) {
  return {
    conviction: conv.conviction != null ? conv.conviction : 0,
    verdict: conv.verdict || 'needs',
    evidence: conv.evidence != null ? conv.evidence : 0,
    dimensions: Array.isArray(conv.dimensions) ? conv.dimensions : [],
    gap: conv.gap || { dim: '', body: '' },
    verdictLine: conv.verdictLine || '',
  };
}

module.exports = { listIdeas, getIdea };

// ---------- self-test (runs only when invoked directly) ----------
if (require.main === module) {
  const PIPE = path.join(__dirname, '..', '..', 'pipeline');
  console.log('=== listIdeas ===');
  const list = listIdeas(PIPE);
  console.log(JSON.stringify({ ideaSlugs: list.ideas.map((i) => i.id), killed: list.killed }, null, 2));
  console.log('\n=== getIdea("breakfast-occasions") ===');
  console.log(JSON.stringify(getIdea(PIPE, 'breakfast-occasions'), null, 2));
}
