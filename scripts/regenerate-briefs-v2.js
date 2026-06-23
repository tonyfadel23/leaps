#!/usr/bin/env node
/**
 * regenerate-briefs-v2.js — Brief HTML renderer
 *
 * Part of the brief rendering pipeline. Orchestrated by build-brief.js.
 * Converts briefData (JSON) into the final brief.html slide deck.
 *
 * v2 template features:
 * - Hero strips on every page
 * - WHY / WHAT / HOW nav grouping
 * - Three-column Opportunities page
 * - Static HTML (no client-side briefData rendering)
 * - Share button
 * - Plus Jakarta Sans font
 * - brief.css visual identity
 *
 * Usage: node scripts/regenerate-briefs-v2.js [--dir archive|pipeline]
 */

const fs = require('fs');
const path = require('path');

// Parse variations.md raw content into the array format the renderer expects
function parseVariationsFromRaw(raw) {
  const vars = [];
  const lines = raw.split('\n');
  // Find Chosen Direction section
  let inChosen = false, inAlso = false;
  let current = null;
  let idCounter = 0;
  const idLetters = ['a','b','c','d','e','f'];

  for (const line of lines) {
    if (line.startsWith('## Chosen Direction')) { inChosen = true; inAlso = false; continue; }
    if (line.startsWith('## Also Explored')) { inAlso = true; inChosen = false; continue; }
    if (line.startsWith('## ') && !line.startsWith('## Chosen') && !line.startsWith('## Also')) {
      inChosen = false; inAlso = false; continue;
    }

    if (line.startsWith('### ')) {
      if (current) vars.push(current);
      current = { id: idLetters[idCounter++] || String(idCounter), name: line.replace('### ', '').replace(/^[A-C]\s*[—–-]\s*/, '').trim(), concept: '', chosen: false, reaction: '' };
      if (inAlso) current.chosen = false;
    }

    if (inChosen || inAlso) {
      const nameMatch = line.match(/^name:\s*(.+)/);
      const conceptMatch = line.match(/^concept:\s*(.+)/);
      const whyMatch = line.match(/^why(?:\s+dropped)?:\s*(.+)/);

      if (nameMatch && !current) {
        current = { id: idLetters[idCounter++] || String(idCounter), name: nameMatch[1].trim(), concept: '', chosen: inChosen, reaction: '' };
      } else if (nameMatch && current) {
        current.name = nameMatch[1].trim();
        if (inChosen) current.chosen = true;
      }
      if (conceptMatch && current) current.concept = conceptMatch[1].trim();
      if (whyMatch && current) current.reaction = whyMatch[1].trim();
    }
  }
  if (current) vars.push(current);

  // Ensure the first (chosen) one is marked
  if (vars.length > 0 && !vars.some(v => v.chosen)) vars[0].chosen = true;

  return vars;
}

const args = process.argv.slice(2);
const dirFlag = args.find(a => a === '--dir');
const dirIdx = args.indexOf('--dir');
const targetDir = dirIdx >= 0 ? args[dirIdx + 1] : 'pipeline';
const BASE_DIR = path.join(__dirname, '..', targetDir);

// Read canonical CSS
const cssPath = path.join(__dirname, '..', '.claude', 'skills', '_shared', 'brief.css');
const CSS = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';

// Main execution deferred until all builders are defined (see bottom of file)
function main() {
  const ideas = fs.readdirSync(BASE_DIR).filter(d => {
    const full = path.join(BASE_DIR, d);
    return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, 'brief.html'));
  });

  console.log(`Found ${ideas.length} briefs to regenerate in ${targetDir}/: ${ideas.join(', ')}`);

  for (const slug of ideas) {
    const briefPath = path.join(BASE_DIR, slug, 'brief.html');
    const content = fs.readFileSync(briefPath, 'utf8');
    let bd = extractBriefData(content);
    if (!bd) {
      // Fallback: rebuild from source markdown files
      try {
        const { rebuildBriefData } = require('./rebuild-brief-data');
        const ideaDir = path.join(BASE_DIR, slug);
        bd = rebuildBriefData(ideaDir, slug);
        if (bd) {
          console.log(`  ℹ Rebuilt briefData from source MDs for ${slug}`);
        }
      } catch (e) {
        // rebuild-brief-data.js might not handle all cases
      }
    }
    if (!bd) {
      console.log(`  ⚠ Could not extract or rebuild briefData for ${slug} — skipping`);
      continue;
    }
    // Inject raw decision-log.md if it exists
    const logPath = path.join(BASE_DIR, slug, 'decision-log.md');
    if (fs.existsSync(logPath)) {
      bd.rawDecisionLog = fs.readFileSync(logPath, 'utf8');
    }
    const html = buildV2Brief(bd, slug);
    fs.writeFileSync(briefPath, html, 'utf8');
    console.log(`  ✓ Regenerated ${slug}/brief.html (v2)`);
  }

  console.log('\nDone.');
}

// ---------------------------------------------------------------------------
// Extract briefData object from existing brief.html
// ---------------------------------------------------------------------------
function extractBriefData(content) {
  const marker = 'const briefData = ';
  const start = content.indexOf(marker);
  if (start === -1) return null;
  const objStart = content.indexOf('{', start);
  let depth = 0, i = objStart;
  for (; i < content.length; i++) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') { depth--; if (depth === 0) break; }
  }
  try {
    return eval('(' + content.substring(objStart, i + 1) + ')');
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function esc(s) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function confDotClass(level) {
  return level === 'High' ? 'conf-high' : level === 'Low' ? 'conf-low' : 'conf-medium';
}
function confPillClass(level) {
  return level === 'High' ? 'pill-green' : level === 'Low' ? 'pill-red' : 'pill-yellow';
}
function confLabel(color) {
  return color === 'green' ? 'High' : color === 'red' ? 'Low' : 'Medium';
}
function confChipColor(color) {
  return color === 'green' ? 'chip-green' : color === 'red' ? 'chip-red' : 'chip-yellow';
}
function statusDotClass(status) {
  if (!status) return 'yellow';
  const s = status.toLowerCase();
  return s === 'ready' || s === 'yes' || s === 'resolved' || s === 'green' ? 'green' :
         s === 'gap' || s === 'blocked' || s === 'no' || s === 'red' || s === 'open' ? 'red' : 'yellow';
}
function tagBadge(tag) {
  if (!tag) return '';
  const map = { pushback: ['tag-pushback','Pushed back'], flag: ['tag-flag','Flagged'], strategic: ['tag-strategic','Strategic call'] };
  const e = map[tag]; return e ? `<span class="tag-badge ${e[0]}">${e[1]}</span> ` : '';
}
function titleCase(s) { return (s||'').replace(/-/g,' ').replace(/\b\w/g, c => c.toUpperCase()); }

// ---------------------------------------------------------------------------
// Detect which pages have data
// ---------------------------------------------------------------------------
function detectStage(d) {
  if (d.feasibility) return 'Explored';
  if (d.metrics) return 'Defined';
  if (d.variations || d.journey) return 'Sketched';
  return 'Grounded';
}

// ---------------------------------------------------------------------------
// Build v2 brief HTML
// ---------------------------------------------------------------------------
function buildV2Brief(d, slug) {
  const stage = (d.meta && d.meta.stage) || detectStage(d);
  const date = (d.meta && d.meta.date) || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const title = d.title || titleCase(slug);
  const confColor = d.confidence ? d.confidence.color : 'yellow';

  // Determine which slides to show
  const slides = [];
  slides.push({ id: 'summary', label: 'Summary', group: 'WHY' });
  if (d.research || d.occasion || d.outcomes) slides.push({ id: 'opportunities', label: 'Opportunities', group: 'WHY' });
  if (d.competitors) slides.push({ id: 'competitors', label: 'Competitors', group: 'WHY' });
  if (d.journey) slides.push({ id: 'journey', label: 'Journey', group: 'WHAT' });
  if (d.variations) slides.push({ id: 'variations', label: 'Variations', group: 'WHAT' });
  if (d.metrics && d.metrics.northStar) slides.push({ id: 'kpis', label: 'KPIs', group: 'WHAT' });
  if (d.whatToBuild) slides.push({ id: 'scope', label: 'Scope', group: 'WHAT' });
  if (d.feasibility && (d.feasibility.overall || d.feasibility.featureScore || d.feasibility.teamCount || d.feasibility.bottleneck)) slides.push({ id: 'feasibility', label: 'Feasibility', group: 'HOW' });
  if (d.conviction && d.conviction.score != null) slides.push({ id: 'conviction', label: 'Conviction', group: 'HOW' });
  if (d.decisionLog || d.decisions || d.openQuestions) slides.push({ id: 'decisions', label: 'Decisions', group: 'HOW' });
  if (d.prd && typeof d.prd === 'string') slides.push({ id: 'prd', label: 'PRD', group: 'HOW' });

  // Build nav pills with group labels
  let navHtml = '';
  let lastGroup = null;
  slides.forEach((s, i) => {
    if (s.group !== lastGroup) {
      if (lastGroup !== null) navHtml += '<span class="nav-separator">|</span>';
      navHtml += `<span class="nav-group-label">${s.group}</span>`;
      lastGroup = s.group;
    }
    navHtml += `<button class="nav-pill${i===0?' active':''}" onclick="showSlide('${s.id}',this)">${s.label}</button>`;
  });

  // Build slide HTML
  const slideHtml = slides.map((s, i) => {
    const builder = slideBuilders[s.id];
    if (!builder) return '';
    const content = builder(d, slug);
    return `<div class="slide${i===0?' active':''}" id="slide-${s.id}">${content}</div>`;
  }).join('\n\n  ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pipeline Brief — ${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
${CSS}
</style>
</head>
<body>
<nav class="topnav">
  <div class="nav-pills">${navHtml}</div>
  <div class="nav-meta">
    <button class="share-btn" onclick="shareBrief()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> Share</button>
    <span class="meta-date">${date}</span>
    <span class="stage-badge">${stage}</span>
  </div>
</nav>

<div class="main">
  ${slideHtml}
</div>

<div class="share-toast" id="shareToast">Link copied to clipboard</div>

<script>
function showSlide(name, btn) {
  document.querySelectorAll('.slide').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-pill').forEach(p => p.classList.remove('active'));
  var el = document.getElementById('slide-' + name);
  if (el) {
    el.classList.add('active');
    // Lazy load iframes
    el.querySelectorAll('iframe[data-src]').forEach(function(iframe) {
      iframe.src = iframe.getAttribute('data-src');
      iframe.removeAttribute('data-src');
    });
  }
  if (btn) btn.classList.add('active');
}

function switchDecisionView(view, btn) {
  var structured = document.getElementById('decision-structured');
  var raw = document.getElementById('decision-raw');
  if (!structured || !raw) return;
  structured.style.display = view === 'structured' ? '' : 'none';
  raw.style.display = view === 'raw' ? '' : 'none';
  btn.parentElement.querySelectorAll('.dtab').forEach(function(t) { t.classList.remove('active'); });
  btn.classList.add('active');
}

function shareBrief() {
  var deployedUrl = document.querySelector('meta[name="deployed-url"]');
  var toast = document.getElementById('shareToast');
  if (deployedUrl && deployedUrl.content) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(deployedUrl.content).then(function() {
        toast.textContent = 'Live link copied!';
        toast.classList.add('show');
        setTimeout(function() { toast.classList.remove('show'); }, 2000);
      });
    }
  } else {
    toast.textContent = 'Not published yet — run /share to deploy';
    toast.classList.add('show');
    setTimeout(function() { toast.classList.remove('show'); }, 3000);
  }
}

function selectVariation(card) {
  document.querySelectorAll('.variation-card').forEach(c => c.classList.remove('active'));
  card.classList.add('active');
  var src = card.getAttribute('data-var-src');
  var iframe = document.getElementById('variationFrame');
  if (iframe && src) {
    iframe.src = src;
    iframe.removeAttribute('data-src');
  }
}

function copyPrd() {
  var el = document.querySelector('.prd-wrap');
  if (!el) return;
  navigator.clipboard.writeText(el.innerText).then(function() {
    var btn = document.querySelector('.prd-copy');
    if (btn) { btn.innerHTML = '\\u2713'; setTimeout(function(){ btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6B6B" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>'; }, 2000); }
  });
}

// Phone dots — message-based (no cross-origin window access needed)
window.addEventListener('message', function(e) {
  if (!e.data) return;

  // Prototype announces its screens on load
  if (e.data.type === 'screens-ready' && e.data.screens) {
    var screens = e.data.screens;
    // Find which phone frame this iframe belongs to
    var entries = [
      { frameId: 'summaryProtoFrame', dotsId: 'summaryDots', labelId: 'summaryLabel' },
      { frameId: 'variationFrame', dotsId: 'variationDots', labelId: 'variationLabel' }
    ];
    for (var i = 0; i < entries.length; i++) {
      var cfg = entries[i];
      var iframe = document.getElementById(cfg.frameId);
      if (iframe && iframe.contentWindow === e.source) {
        initDots(cfg.frameId, cfg.dotsId, cfg.labelId, screens);
        break;
      }
    }
  }

  // Prototype navigated to a new screen
  if (e.data.type === 'screen-change') {
    var allStates = ['summaryProtoFrame', 'variationFrame'];
    for (var j = 0; j < allStates.length; j++) {
      var state = window['_pd_' + allStates[j]];
      if (!state) continue;
      var fr = document.getElementById(allStates[j]);
      if (fr && fr.contentWindow === e.source) {
        var idx = state.screens.findIndex(function(s) { return s.param === e.data.entry; });
        if (idx !== -1) { state.setActive(idx); }
      }
    }
  }
});

function initDots(frameId, dotsId, labelId, screens) {
  if (!screens || !screens.length) return;
  var active = 0;
  var dotsEl = document.getElementById(dotsId);
  var labelEl = document.getElementById(labelId);
  function render() {
    if (!dotsEl) return;
    dotsEl.innerHTML = screens.map(function(s, i) {
      return '<button class="dot' + (i === active ? ' active' : '') + '" onclick="navProto(\\'' + frameId + '\\',' + i + ')"></button>';
    }).join('');
    if (labelEl && screens[active]) labelEl.textContent = screens[active].label;
  }
  render();
  window['_pd_' + frameId] = { screens: screens, render: render, setActive: function(i) { active = i; render(); } };
}

function navProto(frameId, idx) {
  var state = window['_pd_' + frameId];
  if (!state) return;
  var iframe = document.getElementById(frameId);
  state.setActive(idx);
  iframe.contentWindow.postMessage({ type: 'navigate', entry: state.screens[idx].param }, '*');
}

// Load iframes on initially active slide + init phone dots
(function() {
  var active = document.querySelector('.slide.active');
  if (active) {
    active.querySelectorAll('iframe[data-src]').forEach(function(iframe) {
      iframe.src = iframe.getAttribute('data-src');
      iframe.removeAttribute('data-src');
    });
  }
})();
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Slide Builders — each returns inner HTML for the slide div
// ---------------------------------------------------------------------------
var slideBuilders = {};

// ── SUMMARY ──────────────────────────────────────────────────────────────────
slideBuilders.summary = function(d, slug) {
  const confColor = d.confidence ? d.confidence.color : 'yellow';
  const confLbl = confLabel(confColor);
  const chipColor = confChipColor(confColor);
  const opp = d.keyNumbers ? d.keyNumbers.opportunity : '—';
  const complexity = d.keyNumbers ? d.keyNumbers.complexity : '—';
  const betHeadline = d.betHeadline || d.title || titleCase(slug);
  const occasionLabel = d.occasionLabel || (d.occasion ? d.occasion.name : '');
  const opportunityLabel = d.opportunityLabel || '';

  // Executive summary — handle both string and array formats
  let execHtml = '';
  if (typeof d.executiveSummary === 'string') {
    execHtml = `<div class="exec-summary">${d.executiveSummary}</div>`;
  } else if (d.execSummary) {
    execHtml = `<div class="exec-summary">${d.execSummary}</div>`;
  } else if (d.jtbd) {
    execHtml = `<div class="exec-summary">${d.jtbd}</div>`;
  }

  // Evidence bullets
  let evidenceHtml = '';
  if (Array.isArray(d.executiveSummary)) {
    evidenceHtml = d.executiveSummary.map(e => {
      let raw = e.text || e;
      // Strip markdown bold markers and split "stat — interpretation"
      raw = raw.replace(/\*\*/g, '');
      const dashSplit = raw.match(/^(.+?)\s*[—–-]\s+(.+)$/);
      const stat = dashSplit ? dashSplit[1].trim() : raw;
      const interp = dashSplit ? ` — ${dashSplit[2].trim()}` : '';
      const sourceLink = e.sourceUrl
        ? ` <a class="evidence-source" href="${e.sourceUrl}" target="_blank">${e.source || 'Source'}</a>`
        : (e.source ? ` <span class="evidence-source">${e.source}</span>` : '');
      return `<li><strong>${stat}</strong>${interp}${sourceLink}</li>`;
    }).join('');
  } else if (d.research && Array.isArray(d.research.keyDataPoints)) {
    evidenceHtml = d.research.keyDataPoints.slice(0, 3).map(dp =>
      `<li><strong>${dp.value}</strong> — ${dp.label} <span class="evidence-source">${dp.source || ''}</span></li>`
    ).join('');
  }
  if (evidenceHtml) evidenceHtml = `<div class="section-header">Evidence</div><ul class="evidence-list">${evidenceHtml}</ul>`;

  // Seeking
  const seeking = d.seeking || (d.confidence ? `Build confidence from ${confLbl} to proceed` : '');
  const seekingHtml = seeking ? `<div class="seeking-line"><span class="seeking-label">Seeking</span>${seeking}</div>` : '';

  // Context line
  let contextParts = [];
  if (d.meta && d.meta.stage) contextParts.push(`<span class="pill pill-orange">${d.meta.stage}</span>`);
  if (occasionLabel) contextParts.push(occasionLabel);
  if (opportunityLabel) contextParts.push(opportunityLabel);
  const contextHtml = contextParts.length
    ? `<div class="bet-context">${contextParts.join(' <span style="color:var(--text-muted)">·</span> ')}</div>`
    : '';

  // Pipeline cost
  let costHtml = '';
  if (d.pipelineCost) {
    costHtml = `<div class="metadata-footer"><div>${d.pipelineCost.sessions || '—'} sessions · ${d.pipelineCost.estCost || '—'}</div></div>`;
  }

  // Right pane: prototype or placeholder
  let rightPane;
  if (d.files && d.files.prototype) {
    rightPane = `<div class="pane-right bg-surface" style="display:flex;align-items:center;justify-content:center;">
      <div class="phone-wrapper">
        <div class="phone-frame">
          <div class="phone-notch"></div>
          <div class="phone-home"></div>
          <div class="phone-screen">
            <iframe id="summaryProtoFrame" data-src="${d.files.prototype}" style="width:100%;height:100%;border:none;"></iframe>
          </div>
        </div>
        <div class="nav-dots">
          <div class="dots-row" id="summaryDots"></div>
          <div class="screen-label" id="summaryLabel"></div>
        </div>
      </div>
    </div>`;
  } else {
    rightPane = `<div class="pane-right flex-col" style="align-items:center;justify-content:center;">
      <div style="text-align:center;color:var(--text-tertiary);font-size:14px;padding:40px;">
        <div style="font-size:48px;margin-bottom:16px;">&#128161;</div>
        <div style="font-weight:600;color:var(--text-secondary);margin-bottom:8px;">${titleCase(slug)}</div>
        <div>Run /2 to sketch the experience</div>
      </div>
    </div>`;
  }

  return `
    <div class="slide-body two-pane">
      <div class="pane-left">
        <div class="bet-slug">${slug}</div>
        <div class="bet-headline">${betHeadline}</div>
        ${contextHtml}
        <div class="stats-strip">
          <div class="stat-chip chip-neutral"><span class="stat-value">${opp}</span><span class="stat-label">Opportunity</span></div>
          <div class="stat-chip chip-neutral"><span class="stat-value">${complexity}</span><span class="stat-label">Complexity</span></div>
          <div class="stat-chip ${chipColor}"><span class="stat-value">${confLbl}</span><span class="stat-label">Confidence</span></div>
        </div>
        ${execHtml}
        ${evidenceHtml}
        ${seekingHtml}
        ${costHtml}
      </div>
      ${rightPane}
    </div>`;
};

// ── OPPORTUNITIES ────────────────────────────────────────────────────────────
slideBuilders.opportunities = function(d) {
  const r = d.research || {};
  const occasion = d.occasion || {};
  const confColor = d.confidence ? d.confidence.color : 'yellow';
  const confReason = d.confidence ? d.confidence.reason : '';
  const job = d.jtbd || d.title || '';

  // Dimension pills
  let dimPills = '';
  if (occasion.time || occasion.social || occasion.need || occasion.struggle) {
    dimPills = '<div class="dimension-pills">';
    if (occasion.time) dimPills += `<span class="dimension-pill"><span class="dimension-label">TIME</span> ${occasion.time}</span>`;
    if (occasion.social) dimPills += `<span class="dimension-pill"><span class="dimension-label">SOCIAL</span> ${occasion.social}</span>`;
    if (occasion.need) dimPills += `<span class="dimension-pill"><span class="dimension-label">NEED</span> ${occasion.need}</span>`;
    if (occasion.struggle) dimPills += `<span class="dimension-pill"><span class="dimension-label">STRUGGLE</span> ${occasion.struggle}</span>`;
    dimPills += '</div>';
  }

  // Hero — page label as title, JTBD as subtitle, dims + confidence below
  const heroHtml = `<div class="hero-strip">
    <div class="hero-title">Opportunities</div>
    <div class="hero-subtitle" style="font-size:13px; color:var(--text-secondary); max-width:700px;">${job}</div>
    <div style="margin-top:8px; display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
      ${dimPills}
      <span style="font-size:12px; color:var(--text-tertiary);"><span class="status-dot ${statusDotClass(confColor === 'green' ? 'green' : confColor === 'red' ? 'red' : 'yellow')}"></span>${confReason}</span>
    </div>
  </div>`;

  // Col 1: Top Opportunities (from outcomes)
  let outcomesHtml = '<div class="section-header">Top Opportunities</div>';
  const outcomes = d.topOutcomes || d.outcomes || [];
  if (outcomes.length) {
    outcomesHtml += outcomes.map(o => {
      const oppScore = o.opp || o.score || 0;
      const cls = oppScore >= 4.5 ? 'opp-critical' : oppScore >= 3.5 ? 'opp-significant' : 'opp-moderate';
      const imp = o.importance || o.I || '';
      const sat = o.satisfaction || o.S || '';
      const step = o.step || o.type || '';
      return `<div class="outcome-card ${cls}">
        <div class="outcome-text">${o.text || o.outcome || o.name || ''}</div>
        <div class="outcome-scores">
          <span class="pill pill-opp">Opp: ${oppScore}</span>
          ${imp ? `<span class="pill pill-dim">I:${imp} S:${sat}</span>` : ''}
          ${step ? `<span class="outcome-step">${step}</span>` : ''}
        </div>
      </div>`;
    }).join('');
  } else {
    outcomesHtml += '<div style="color:var(--text-tertiary);font-size:13px;">Run /1 to map outcomes</div>';
  }

  // Col 2: Key Data
  let dataHtml = '<div class="section-header">Key Data</div>';
  const dataPoints = r.keyDataPoints || [];
  if (dataPoints.length) {
    dataHtml += `<table class="brief-table"><thead><tr><th>Metric</th><th>Value</th><th>Source</th></tr></thead><tbody>`;
    dataHtml += dataPoints.map(dp => {
      const src = dp.source || '';
      const srcUrl = dp.sourceUrl || dp.url || '';
      const srcHtml = srcUrl ? `<a href="${srcUrl}" target="_blank" class="evidence-source">${src}</a>` : `<span class="evidence-source">${src}</span>`;
      return `<tr><td>${dp.label}</td><td style="font-weight:700;color:var(--text-primary);">${dp.value}</td><td>${srcHtml}</td></tr>`;
    }).join('');
    dataHtml += '</tbody></table>';
  }

  // Col 3: Open Questions
  let questionsHtml = '<div class="section-header">Open Questions</div>';
  const oqs = r.openQuestions || d.openQuestions || [];
  if (Array.isArray(oqs)) {
    questionsHtml += oqs.map(q => {
      const text = typeof q === 'string' ? q : q.question || q.text || '';
      return `<div class="question-item">${text}</div>`;
    }).join('');
  }

  return `${heroHtml}
    <div class="slide-body three-col">
      <div class="col-pane">${outcomesHtml}</div>
      <div class="col-pane">${dataHtml}</div>
      <div class="col-pane">${questionsHtml}</div>
    </div>`;
};

// ── COMPETITORS ──────────────────────────────────────────────────────────────
slideBuilders.competitors = function(d) {
  const c = d.competitors || {};
  const rows = c.competitorRows || [];
  const diffs = c.differentiators || [];
  const stakes = c.tableStakes || [];
  const takeaways = c.takeaways || [];
  const screenshots = c.screenshots || [];
  const strategicRead = c.strategicRead || '';

  let stakesHtml = '';
  if (stakes.length) {
    stakesHtml = `<div class="table-stakes-strip">${stakes.map(s => `<span class="table-stake-pill">${s}</span>`).join('')}</div>`;
  }

  const heroHtml = `<div class="hero-strip">
    <div class="hero-title">Competitive Landscape</div>
    ${strategicRead ? `<div class="hero-meta">${strategicRead}</div>` : ''}
    ${stakesHtml}
  </div>`;

  // Left: takeaways
  let takeawayHtml = '<div class="section-header">Key Takeaways</div>';
  if (takeaways.length) {
    takeawayHtml += '<ul class="evidence-list">' + takeaways.map(t => {
      const text = typeof t === 'string' ? t : (t.insight || t.text || '');
      const rendered = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      const srcUrl = typeof t === 'object' && t.sourceUrl ? t.sourceUrl : '';
      const srcName = typeof t === 'object' && t.source ? t.source : '';
      const srcHtml = srcUrl ? ` <a href="${srcUrl}" target="_blank" class="evidence-source">${srcName}</a>` : (srcName ? ` <span class="evidence-source">${srcName}</span>` : '');
      return `<li>${rendered}${srcHtml}</li>`;
    }).join('') + '</ul>';
  } else {
    takeawayHtml += '<div style="color:var(--text-tertiary);font-size:13px;">No takeaways extracted</div>';
  }

  // Right: differentiators grid (spec format) or legacy competitor table
  let tableHtml = '';
  if (diffs.length) {
    // Spec format: color-coded differentiator comparison grid
    // Collect competitor column names from first row
    const sampleKeys = Object.keys(diffs[0]).filter(k => k !== 'name');
    tableHtml = '<div class="section-header">Differentiators</div>';
    tableHtml += `<table class="brief-table"><thead><tr><th>Feature</th>${sampleKeys.map(k =>
      `<th>${k === 'us' ? 'Us' : k}</th>`
    ).join('')}</tr></thead><tbody>`;
    diffs.forEach(row => {
      tableHtml += `<tr><td><strong>${row.name}</strong></td>`;
      sampleKeys.forEach(k => {
        const val = row[k] || '';
        const cls = k === 'us' ? 'cell-highlight' :
          val === 'strong' ? 'cell-strong' : val === 'partial' ? 'cell-partial' : val === 'absent' ? 'cell-absent' : '';
        const label = val === 'strong' ? '●' : val === 'partial' ? '◐' : val === 'absent' ? '○' : val;
        tableHtml += `<td class="${cls}">${label}</td>`;
      });
      tableHtml += '</tr>';
    });
    tableHtml += '</tbody></table>';
  } else if (rows.length) {
    // Legacy format: simple competitor rows
    tableHtml = '<div class="section-header">Competitors</div>';
    tableHtml += `<table class="brief-table"><thead><tr><th>Competitor</th><th>Market</th><th>What they offer</th><th>Key insight</th></tr></thead><tbody>`;
    tableHtml += rows.map(r =>
      `<tr><td><strong>${r.name}</strong></td><td>${r.market||''}</td><td>${r.offer||''}</td><td>${r.interesting||r.how||''}</td></tr>`
    ).join('');
    tableHtml += '</tbody></table>';
  }

  // Gallery footer
  let galleryHtml = '';
  if (screenshots.length) {
    galleryHtml = `<div class="slide-footer"><div class="section-header">App Screenshots</div><div class="screenshot-gallery">`;
    galleryHtml += screenshots.map(s =>
      `<div class="screenshot-card"><img src="competitors/${s.filename}" alt="${s.name}"><div class="screenshot-caption">${s.name}</div></div>`
    ).join('');
    galleryHtml += '</div></div>';
  }

  return `<div class="slide-with-footer">
    ${heroHtml}
    <div class="slide-body two-pane">
      <div class="pane-left">${takeawayHtml}</div>
      <div class="pane-right flex-col">${tableHtml}</div>
    </div>
    ${galleryHtml}
  </div>`;
};

// ── JOURNEY ──────────────────────────────────────────────────────────────────
slideBuilders.journey = function(d) {
  const j = d.journey || {};
  const dir = d.direction || {};
  const narrative = j.narrative || [];

  const heroHtml = `<div class="hero-strip">
    <div class="hero-title">Customer Journey</div>
    ${dir.name ? `<div class="hero-subtitle">${dir.name}${dir.description ? ' — ' + dir.description : ''}</div>` : ''}
  </div>`;

  // If we have a journey.html file, embed it via iframe
  if (d.files && d.files.journey) {
    return `${heroHtml}
      <div class="slide-body full-width">
        <iframe class="showcase-frame" data-src="${d.files.journey}" style="width:100%;height:100%;border:none;border-radius:var(--radius-lg);"></iframe>
      </div>`;
  }

  // Rich structured layout: insights + storyboard + blueprint
  const insights = j.insights || [];
  const storyboard = j.storyboard || [];
  const blueprint = j.blueprint || {};
  if (insights.length || storyboard.length || (blueprint.stages && blueprint.stages.length)) {
    // ── Insights strip ──
    let insightsHtml = '';
    if (insights.length) {
      const cards = insights.map(ins => {
        const hl = ins.highlight ? ' highlight' : '';
        return `<div class="insight-card${hl}">
          <div class="insight-icon">${ins.icon || ''}</div>
          <div class="insight-body">
            <div class="insight-title">${ins.title || ''}</div>
            <div class="insight-text">${ins.text || ''}</div>
          </div>
        </div>`;
      }).join('');
      insightsHtml = `<div class="card" style="padding:16px;">
        <div class="section-header">Key Insights</div>
        <div class="insights-strip">${cards}</div>
      </div>`;
    }

    // ── Storyboard ──
    let storyboardHtml = '';
    if (storyboard.length) {
      const panels = storyboard.map((p, i) => {
        const emotionClass = p.emotion === 'positive' ? ' positive' : p.emotion === 'negative' ? ' negative' : '';
        const interventionClass = p.intervention ? ' intervention' : '';
        const interventionBg = p.intervention ? ' style="background:var(--orange-light,#fff7ed);"' : '';
        const emotionLabel = p.emotion === 'positive' ? 'Positive' : p.emotion === 'negative' ? 'Negative' : 'Neutral';
        const panel = `<div class="sb-panel">
          <div class="sb-frame${interventionClass}">
            <div class="sb-scene"${interventionBg}>
              <div class="icon">${p.icon || ''}</div>
              <div class="sb-thought">${p.thought || ''}</div>
            </div>
            <div class="sb-emotion${emotionClass}">${emotionLabel}</div>
          </div>
          <div class="sb-caption">${p.caption || ''}</div>
          <div class="sb-detail">${p.detail || ''}</div>
        </div>`;
        const arrow = i < storyboard.length - 1 ? '<div class="sb-arrow">&rarr;</div>' : '';
        return panel + arrow;
      }).join('');
      storyboardHtml = `<div class="card" style="padding:0;">
        <div class="storyboard-section">
          <div class="section-header" style="padding:12px 16px 0;">Customer Story</div>
          <div class="storyboard" style="padding:12px 16px 14px;">${panels}</div>
        </div>
      </div>`;
    }

    // ── Service blueprint ──
    let blueprintHtml = '';
    if (blueprint.stages && blueprint.stages.length && blueprint.layers) {
      const stages = blueprint.stages;
      const layers = blueprint.layers;
      const headerCells = stages.map(s => `<div class="bp-cell header">${s}</div>`).join('');
      const renderRow = (label, items) => {
        if (!items || !items.length) return '';
        const cells = items.map((item, i) => {
          // Mark intervention cells if storyboard has intervention at this index
          const isIntervention = storyboard[i] && storyboard[i].intervention;
          const cls = isIntervention ? ' intervention' : '';
          return `<div class="bp-cell${cls}">${item}</div>`;
        }).join('');
        return `<div class="bp-cell label">${label}</div>${cells}`;
      };
      blueprintHtml = `<div class="card" style="padding:16px;">
        <div class="section-header">Service Blueprint</div>
        <div class="bp-grid">
          <div class="bp-cell header label">Layer</div>${headerCells}
          ${renderRow('Customer', layers.customer)}
          ${renderRow('Frontstage', layers.frontstage)}
          <div class="bp-visibility">LINE OF VISIBILITY — customer does not see below</div>
          ${renderRow('Backstage', layers.backstage)}
          ${renderRow('Support', layers.support)}
        </div>
      </div>`;
    }

    return `${heroHtml}
      <div class="slide-body" style="padding:16px 24px;display:flex;flex-direction:column;gap:16px;overflow-y:auto;">
        ${insightsHtml}${storyboardHtml}${blueprintHtml}
      </div>`;
  }

  // Fallback: render narrative
  let narrativeHtml = narrative.map(n =>
    `<div style="margin-bottom:12px;"><div style="font-size:12px;font-weight:600;text-transform:uppercase;color:var(--orange);letter-spacing:.06em;margin-bottom:3px;">${n.stage}</div><div style="font-size:14px;color:#444;line-height:1.5;">${n.text}</div></div>`
  ).join('');

  return `${heroHtml}
    <div class="slide-body two-pane">
      <div class="pane-left">${narrativeHtml || '<div class="placeholder">Journey details available after /2 explore</div>'}</div>
      <div class="pane-right flex-col" style="align-items:center;justify-content:center;">
        <div class="placeholder">Journey map available after /2 explore</div>
      </div>
    </div>`;
};

// ── VARIATIONS ───────────────────────────────────────────────────────────────
slideBuilders.variations = function(d) {
  const rawVars = d.variations || [];
  // Handle {raw: content} format from parseVariations
  const vars = Array.isArray(rawVars) ? rawVars : (rawVars.raw ? parseVariationsFromRaw(rawVars.raw) : []);
  const chosen = vars.find(v => v.chosen);

  const heroHtml = `<div class="hero-strip">
    <div class="hero-title">Variations Explored</div>
    ${chosen ? `<div class="hero-subtitle">Chosen: <strong>${chosen.name}</strong>${chosen.concept ? ' — ' + chosen.concept : ''}</div>` : ''}
  </div>`;

  // Left: variation cards
  const chosenCards = vars.filter(v => v.chosen).map(v =>
    `<div class="variation-card active" data-var-src="sketches/variation-${v.id}.html" onclick="selectVariation(this)">
      <div class="variation-card-header"><span class="variation-name">${v.name}</span><span class="chosen-badge">PICK</span></div>
      <div class="variation-concept">${v.concept || ''}</div>
    </div>`
  ).join('');

  const altCards = vars.filter(v => !v.chosen).map(v =>
    `<div class="variation-card" data-var-src="sketches/variation-${v.id}.html" onclick="selectVariation(this)">
      <div class="variation-card-header"><span class="variation-name">${v.name}</span></div>
      <div class="variation-concept">${v.concept || ''}</div>
      ${v.reaction ? `<div class="dropped-reason">Dropped: ${v.reaction}</div>` : ''}
    </div>`
  ).join('');

  const chosenSrc = chosen ? `sketches/variation-${chosen.id}.html` : (d.files && d.files.variationExplorer ? d.files.variationExplorer : '');

  const rightPane = chosenSrc
    ? `<div class="pane-right bg-surface" style="display:flex;align-items:center;justify-content:center;">
        <div class="phone-wrapper">
          <div class="phone-frame">
            <div class="phone-notch"></div>
            <div class="phone-home"></div>
            <div class="phone-screen">
              <iframe id="variationFrame" data-src="${chosenSrc}" style="width:100%;height:100%;border:none;"></iframe>
            </div>
          </div>
          <div class="nav-dots">
            <div class="dots-row" id="variationDots"></div>
            <div class="screen-label" id="variationLabel"></div>
          </div>
        </div>
      </div>`
    : `<div class="pane-right flex-col" style="align-items:center;justify-content:center;"><div class="placeholder">Prototypes available after /2 explore</div></div>`;

  return `${heroHtml}
    <div class="slide-body two-pane">
      <div class="pane-left">
        ${chosenCards ? '<div class="section-header">Chosen Direction</div>' + chosenCards : ''}
        ${altCards ? '<div class="section-header">Also Explored</div>' + altCards : ''}
      </div>
      ${rightPane}
    </div>`;
};

// ── KPIs ─────────────────────────────────────────────────────────────────────
slideBuilders.kpis = function(d) {
  const m = d.metrics;
  if (!m || !m.northStar) return '<div class="placeholder">KPIs available after /3 assess</div>';

  const nsArr = Array.isArray(m.northStar) ? m.northStar : [m.northStar];
  const inputs = m.inputs || [];
  const guards = m.guardrails || [];
  const goals = d.goalsAlignment;

  const heroHtml = `<div class="hero-strip">
    <div class="hero-title">Success Criteria</div>
    <div class="hero-subtitle">
      ${goals ? `Metric tree inherited from outcome map <span style="margin-left:6px;" class="pill pill-green">Goals-aligned</span>` : 'Metric tree'}
    </div>
  </div>`;

  // Left pane
  let leftHtml = '';
  if (goals) {
    leftHtml += `<div class="goals-callout">
      <div class="callout-title" style="color:var(--orange);">Strategic Alignment</div>
      <p>Serves <strong>${goals.goal}</strong> by ${goals.mechanism}</p>
    </div>`;
  }

  // North star card
  nsArr.forEach(ns => {
    leftHtml += `<div class="north-star-card">
      <div class="north-star-name">${ns.name}</div>
      <div class="north-star-values">${ns.baseline} → ${ns.target} <span style="margin-left:8px;" class="pill ${confPillClass(ns.confidence)}">${ns.confidence} confidence</span></div>
    </div>`;
  });

  // Kill criteria
  if (d.killCriteria && d.killCriteria.length) {
    leftHtml += '<div class="section-header">Kill Criteria</div><ul class="kill-list">';
    leftHtml += d.killCriteria.map(k => `<li class="kill-item">${k.condition}${k.timeframe ? ' after ' + k.timeframe : ''}</li>`).join('');
    leftHtml += '</ul>';
  }

  // Right pane: metric tree
  let treeHtml = '<div class="metric-tree">';
  treeHtml += '<div class="metric-section-label">North Star</div>';
  nsArr.forEach(ns => {
    treeHtml += `<div class="metric-card north-star">
      <div class="metric-name">${ns.name}</div>
      <div class="metric-values"><span class="conf-dot ${confDotClass(ns.confidence)}"></span> ${ns.baseline} → <strong>${ns.target}</strong></div>
    </div>`;
  });

  if (inputs.length) {
    treeHtml += '<div class="tree-line"></div><div class="metric-section-label">Input Metrics</div>';
    // Pair inputs side by side
    for (let i = 0; i < inputs.length; i += 2) {
      treeHtml += '<div class="metric-row">';
      treeHtml += `<div class="metric-card input">
        <div class="metric-name">${inputs[i].name}</div>
        <div class="metric-values"><span class="conf-dot ${confDotClass(inputs[i].confidence)}"></span> ${inputs[i].baseline} → ${inputs[i].target}</div>
      </div>`;
      if (inputs[i+1]) {
        treeHtml += `<div class="metric-card input">
          <div class="metric-name">${inputs[i+1].name}</div>
          <div class="metric-values"><span class="conf-dot ${confDotClass(inputs[i+1].confidence)}"></span> ${inputs[i+1].baseline} → ${inputs[i+1].target}</div>
        </div>`;
      }
      treeHtml += '</div>';
    }
  }

  if (guards.length) {
    treeHtml += '<div class="tree-line"></div><div class="metric-section-label">Guardrails (Kill Signals)</div>';
    guards.forEach(g => {
      treeHtml += `<div class="metric-card guardrail">
        <div class="metric-name">${g.name}</div>
        <div class="metric-values"><span class="conf-dot ${confDotClass(g.confidence)}"></span> Must stay: ${g.target}</div>
      </div>`;
    });
  }
  treeHtml += '</div>';

  // KPI breakdown table — in left pane below kill criteria
  const allMetrics = [];
  nsArr.forEach(ns => allMetrics.push({ ...ns, role: 'North Star' }));
  inputs.forEach(inp => allMetrics.push({ ...inp, role: 'Input' }));
  guards.forEach(g => allMetrics.push({ ...g, role: 'Guardrail' }));

  if (allMetrics.length > 0) {
    leftHtml += `<div class="section-header" style="margin-top:16px;">Metric Breakdown</div>
      <table class="brief-table">
        <thead><tr>
          <th>Role</th><th>Metric</th><th>Baseline</th><th>Target</th><th>Conf.</th>
        </tr></thead>
        <tbody>${allMetrics.map(m => `<tr>
          <td><span class="pill ${m.role === 'North Star' ? 'pill-orange' : m.role === 'Guardrail' ? 'pill-red' : 'pill-green'}" style="font-size:9px;padding:2px 6px;">${m.role}</span></td>
          <td style="font-weight:600;">${m.name || ''}</td>
          <td>${m.baseline || '—'}</td>
          <td style="font-weight:600;">${m.target || '—'}</td>
          <td><span class="conf-dot ${confDotClass(m.confidence)}"></span> ${m.confidence || '—'}</td>
        </tr>`).join('')}</tbody>
      </table>`;
  }

  return `${heroHtml}
    <div class="slide-body two-pane" style="grid-template-columns:60% 40%;">
      <div class="pane-left">${leftHtml}</div>
      <div class="pane-right" style="padding:0;">${treeHtml}</div>
    </div>`;
};

// ── SCOPE ────────────────────────────────────────────────────────────────────
slideBuilders.scope = function(d) {
  const dir = d.direction || {};
  const heroHtml = `<div class="hero-strip">
    <div class="hero-title">Scope</div>
    ${dir.name ? `<div class="hero-subtitle">${dir.name} — Phase 1</div>` : ''}
  </div>`;

  // Build items
  let buildHtml = '<div class="section-header">Build</div>';
  (d.whatToBuild || []).forEach(w => {
    buildHtml += `<div class="scope-item build">${w}</div>`;
  });

  // Don't build + Later
  let rightHtml = '';
  if (d.dontBuild && d.dontBuild.length) {
    rightHtml += '<div class="section-header">Don\'t Build</div>';
    d.dontBuild.forEach(w => { rightHtml += `<div class="scope-item dont">${w}</div>`; });
  }
  if (d.later && d.later.length) {
    rightHtml += '<div class="section-header">Later</div>';
    d.later.forEach(l => {
      rightHtml += `<div class="later-item"><span class="phase-badge">${l.phase}</span> ${l.item}${l.reason ? ` <span style="color:var(--text-tertiary);font-size:12px;">— ${l.reason}</span>` : ''}</div>`;
    });
  }

  // Build context footer
  let footerHtml = '';
  if (d.buildContext && d.buildContext.length) {
    footerHtml = `<div class="slide-footer"><div class="section-header">Build Context</div>
      <table class="build-context-table"><thead><tr><th>Component</th><th>Status</th><th>Notes</th></tr></thead><tbody>`;
    d.buildContext.forEach(bc => {
      const dot = statusDotClass(bc.exists);
      const label = bc.exists === 'Yes' ? 'Exists' : bc.exists === 'No' ? 'New' : 'Modify';
      footerHtml += `<tr><td>${bc.component}</td><td><span class="status-dot ${dot}"></span> ${label}</td><td>${bc.notes || ''}</td></tr>`;
    });
    footerHtml += '</tbody></table></div>';
  }

  return `<div class="slide-with-footer">
    ${heroHtml}
    <div class="slide-body two-pane">
      <div class="pane-left">${buildHtml}</div>
      <div class="pane-right flex-col">${rightHtml}</div>
    </div>
    ${footerHtml}
  </div>`;
};

// ── FEASIBILITY ──────────────────────────────────────────────────────────────
slideBuilders.feasibility = function(d) {
  const f = d.feasibility;
  if (!f) return '<div class="placeholder">Feasibility available after /4 prove</div>';
  // Accept both flat spec fields (featureScore, teamCount, bottleneck) and legacy f.overall wrapper
  const hasOverall = f.overall && (f.overall.score || f.overall.status);
  const hasFlat = f.featureScore || f.teamCount || f.bottleneck;
  if (!hasOverall && !hasFlat) return '<div class="placeholder">Feasibility available after /4 prove</div>';

  const score = f.featureScore || (hasOverall && f.overall.score) || '—';
  const rationaleRaw = f.bottleneck || (hasOverall && f.overall.rationale) || '';
  const rationale = rationaleRaw.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const teamCount = f.teamCount || '';
  const overallStatus = hasOverall ? f.overall.status : (typeof score === 'number' && score <= 20 ? 'Green' : score <= 50 ? 'Yellow' : 'Red');
  const statusColor = overallStatus === 'Green' ? 'green' : overallStatus === 'Red' ? 'red' : 'yellow';
  const components = f.components || [];
  const risks = f.risks || [];
  const deps = f.dependencies || [];

  const teamLabel = teamCount ? `${teamCount} teams` : '';
  const heroHtml = `<div class="hero-strip">
    <div class="hero-title">Feasibility</div>
    <div class="hero-subtitle">Score: <strong>${score}</strong>${teamLabel ? ' <span style="color:var(--text-muted);">·</span> ' + teamLabel : ''}</div>
  </div>`;

  // Left: score + bottleneck analysis + components
  let leftHtml = '';
  if (score !== '—') {
    leftHtml += `<div style="margin-bottom:20px;">
      <div class="feasibility-score">${score}</div>
      ${rationale ? `<div class="feasibility-detail" style="margin-top:8px;">${rationale}</div>` : ''}
    </div>`;
  }

  if (components.length) {
    leftHtml += '<div class="section-header">Component Scores</div>';
    leftHtml += `<table class="brief-table"><thead><tr><th>Component</th><th>Score</th><th>Driver</th></tr></thead><tbody>`;
    components.forEach(c => {
      leftHtml += `<tr><td>${c.component || c.name || ''}</td><td>${c.score || c.effort || ''}</td><td>${c.driver || c.risk || c.notes || ''}</td></tr>`;
    });
    leftHtml += '</tbody></table>';
  }

  // AI readiness
  if (f.aiReadiness) {
    leftHtml += `<div class="ai-readiness"><div class="ai-readiness-label">AI Readiness</div><div class="ai-readiness-text">${f.aiReadiness}</div></div>`;
  }

  // Right: risks + deps
  let rightHtml = '';
  if (risks.length) {
    rightHtml += '<div class="section-header">Risk Register</div>';
    risks.forEach(r => {
      const severity = (r.likelihood === 'High' && r.impact === 'High') ? 'high' : (r.likelihood === 'Low' && r.impact === 'Low') ? 'low' : 'medium';
      rightHtml += `<div class="risk-card">
        <div class="risk-name"><span class="risk-severity ${severity}"></span>${r.risk}</div>
        <div class="risk-detail"><strong>Likelihood:</strong> ${r.likelihood} · <strong>Impact:</strong> ${r.impact}</div>
        <div class="risk-detail"><strong>Mitigation:</strong> ${r.mitigation || ''}</div>
      </div>`;
    });
  }

  if (deps.length) {
    rightHtml += '<div class="section-header">Dependencies</div>';
    rightHtml += `<table class="brief-table"><thead><tr><th>Dependency</th><th>Blocks</th><th>Owner</th><th>Status</th></tr></thead><tbody>`;
    deps.forEach(dep => {
      const statusCls = dep.status === 'Resolved' ? 'pill-green' : dep.status === 'Open' ? 'pill-red' : 'pill-yellow';
      rightHtml += `<tr><td>${dep.dep || dep.dependency || ''}</td><td>${dep.blocks || ''}</td><td>${dep.owner || ''}</td><td><span class="pill ${statusCls}" style="font-size:11px;">${dep.status || ''}</span></td></tr>`;
    });
    rightHtml += '</tbody></table>';
  }

  return `${heroHtml}
    <div class="slide-body two-pane">
      <div class="pane-left">${leftHtml}</div>
      <div class="pane-right flex-col">${rightHtml}</div>
    </div>`;
};

// ── CONVICTION ───────────────────────────────────────────────────────────────
slideBuilders.conviction = function(d) {
  const c = d.conviction;
  if (!c || c.score == null) return '<div class="placeholder">Conviction available after /3 assess</div>';
  const nd = s => String(s == null ? '' : s).replace(/\s*[—–]\s*/g, ' - '); // strip em/en-dashes
  const vMap = { pursue: { cls: 'green', label: 'Pursue' }, needs: { cls: 'yellow', label: 'Needs more' }, kill: { cls: 'red', label: 'Kill' } };
  const v = vMap[c.verdict] || vMap.needs;
  const dims = c.dimensions || [];

  const heroHtml = `<div class="hero-strip">
    <div class="hero-title">Conviction</div>
    <div class="hero-subtitle"><span class="pill pill-${v.cls}">${v.label}</span> <span style="color:var(--text-muted);">·</span> <strong>${c.score}</strong>/100 <span style="color:var(--text-muted);">·</span> Evidence ${c.evidence}/5</div>
  </div>`;

  let leftHtml = `<div style="margin-bottom:20px;">
    <div class="feasibility-score">${c.score}<span style="font-size:18px;color:var(--text-muted);">/100</span></div>
    ${c.verdictLine ? `<div class="feasibility-detail" style="margin-top:8px;">${nd(c.verdictLine)}</div>` : ''}
  </div>`;
  if (dims.length) {
    leftHtml += '<div class="section-header">Four dimensions</div>';
    leftHtml += `<table class="brief-table"><thead><tr><th>Dimension</th><th>Score</th><th>Read</th></tr></thead><tbody>`;
    dims.forEach(dim => {
      leftHtml += `<tr><td>${dim.label}</td><td>${dim.score}</td><td>${nd(dim.note)}</td></tr>`;
    });
    leftHtml += '</tbody></table>';
  }

  let rightHtml = '';
  if (c.gap && c.gap.body) {
    const gapDim = (c.gap.dim || '').charAt(0).toUpperCase() + (c.gap.dim || '').slice(1);
    rightHtml += '<div class="section-header">Biggest gap</div>';
    rightHtml += `<div class="risk-card">
      <div class="risk-name"><span class="risk-severity medium"></span>${gapDim}</div>
      <div class="risk-detail">${nd(c.gap.body)}</div>
    </div>`;
  }
  rightHtml += `<div class="ai-readiness"><div class="ai-readiness-label">How this is scored</div><div class="ai-readiness-text">A weighted blend of Problem, Size, Feasibility, and Evidence quality. It cannot run high unless claims are sourced - the rigor gate. A clean Kill is a valid outcome.</div></div>`;

  return `${heroHtml}
    <div class="slide-body two-pane">
      <div class="pane-left">${leftHtml}</div>
      <div class="pane-right flex-col">${rightHtml}</div>
    </div>`;
};

// ── DECISIONS ────────────────────────────────────────────────────────────────
slideBuilders.decisions = function(d) {
  const decs = d.decisions || [];
  const oqs = d.openQuestions || [];
  const log = d.decisionLog || [];

  const openCount = Array.isArray(oqs) ? oqs.filter(q => (typeof q === 'string') || q.status === 'Open').length : 0;
  const resolvedCount = decs.length;

  const heroHtml = `<div class="hero-strip">
    <div class="hero-title">Decisions</div>
    <div class="hero-subtitle">${openCount} open <span style="color:var(--text-muted)">·</span> ${resolvedCount} resolved</div>
  </div>`;

  // Left: open + resolved status items
  let leftHtml = '<div class="section-header">Open</div>';
  if (Array.isArray(oqs)) {
    oqs.forEach(q => {
      const text = typeof q === 'string' ? q : q.question || '';
      leftHtml += `<div class="decision-status-item open">${text}</div>`;
    });
  }
  leftHtml += '<div class="section-header">Resolved</div>';
  decs.forEach(d => {
    leftHtml += `<div class="decision-status-item resolved">${d.decision || d}</div>`;
  });

  // Right: full decision log
  let logHtml = '<div class="decision-timeline">';
  let qNum = 0;
  log.forEach(group => {
    logHtml += `<div class="skill-group-header">${group.skill} — ${group.date || ''}</div>`;
    (group.entries || []).forEach(e => {
      qNum++;
      logHtml += `<div class="decision-card"><div class="decision-q"><span class="q-badge">${qNum}</span><span>${e.q}</span></div><div class="decision-a">${tagBadge(e.tag)}${e.a}</div></div>`;
    });
  });
  logHtml += '</div>';

  // Raw decision-log.md content (if available)
  const rawMd = d.rawDecisionLog || '';
  const rawHtml = rawMd
    ? `<div class="decision-raw" id="decision-raw" style="display:none;">
        <pre class="raw-log">${rawMd.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</pre>
      </div>`
    : '';

  const tabBar = rawMd
    ? `<div class="decision-tabs">
        <button class="dtab active" onclick="switchDecisionView('structured',this)">Structured</button>
        <button class="dtab" onclick="switchDecisionView('raw',this)">Raw Log</button>
      </div>`
    : '';

  return `${heroHtml}
    ${tabBar}
    <div class="slide-body two-pane" id="decision-structured">
      <div class="pane-left">${leftHtml}</div>
      <div class="pane-right flex-col">${logHtml}</div>
    </div>
    ${rawHtml}`;
};

// ── PRD ──────────────────────────────────────────────────────────────────────
slideBuilders.prd = function(d) {
  if (!d.prd || typeof d.prd !== 'string') return '<div class="placeholder">PRD available after /prd</div>';

  const heroHtml = `<div class="hero-strip">
    <div class="hero-title">PRD</div>
    <div class="hero-subtitle">Ready for handoff</div>
  </div>`;

  // Convert markdown to HTML — paragraph-aware, no double spacing
  const lines = d.prd.split('\n');
  const htmlLines = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line — close list if open, skip (paragraph break handled by margins)
    if (!trimmed) {
      if (inList) { htmlLines.push('</ul>'); inList = false; }
      continue;
    }

    // Headers
    if (trimmed.startsWith('### ')) { if (inList) { htmlLines.push('</ul>'); inList = false; } htmlLines.push('<h3>' + trimmed.slice(4) + '</h3>'); continue; }
    if (trimmed.startsWith('## ')) { if (inList) { htmlLines.push('</ul>'); inList = false; } htmlLines.push('<h2>' + trimmed.slice(3) + '</h2>'); continue; }
    if (trimmed.startsWith('# ')) { if (inList) { htmlLines.push('</ul>'); inList = false; } htmlLines.push('<h1>' + trimmed.slice(2) + '</h1>'); continue; }

    // List items
    if (trimmed.startsWith('- ') || trimmed.match(/^\d+\.\s/)) {
      if (!inList) { htmlLines.push('<ul>'); inList = true; }
      htmlLines.push('<li>' + trimmed.replace(/^[-\d]+[.)]\s*/, '') + '</li>');
      continue;
    }

    // Horizontal rule
    if (trimmed === '---' || trimmed === '***') { if (inList) { htmlLines.push('</ul>'); inList = false; } htmlLines.push('<hr>'); continue; }

    // Regular paragraph
    if (inList) { htmlLines.push('</ul>'); inList = false; }
    htmlLines.push('<p>' + trimmed + '</p>');
  }
  if (inList) htmlLines.push('</ul>');

  const rendered = htmlLines.join('\n')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');

  return `${heroHtml}
    <div class="slide-body full-width">
      <div class="prd-wrap">
        <button class="prd-copy" onclick="copyPrd()" title="Copy PRD"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6B6B" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>
        ${rendered}
      </div>
    </div>`;
};

// ── Exports ──────────────────────────────────────────────────────────────────
module.exports = { buildV2Brief, extractBriefData };

// Run only when invoked directly
if (require.main === module) {
  main();
}
