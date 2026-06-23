---
# model: sonnet  — DEPRECATED: brief rendering is now deterministic
---

# Brief Builder Agent v2 (DEPRECATED)

> **This agent is deprecated.** Brief rendering is now handled by
> `scripts/build-brief.js`, which runs in <1s with zero LLM tokens.
> All skill SKILL.md files have been updated to call the script directly.
> This file is kept as schema documentation for the `briefData` object.

## Role (historical)

You build and update the Pipeline Brief (`brief.html`) — a slide-deck
style single HTML file that brings together all pipeline artifacts into
a shareable presentation. Used by every pipeline skill (`/learn` through `/ship`).

---

## How You Work

1. Receive a `briefData` JS object from the orchestrating skill
2. Read `_shared/brief.css` and render `brief.html` as a single file — embed the CSS in a `<style>` tag, include JS and all slide content inline
3. Place the file at `pipeline/{idea-slug}/brief.html` (pipeline root, not inside `sketches/`)

---

## Design Philosophy

**MD files are extensive. Briefs are short, clear, human-readable.**

The brief builder's job is **compression, not synthesis**. Each brief
page has a 1:1 source md file. The builder reads the compressed fields
from `briefData` (already extracted by the orchestrating skill) and
renders them with proper visual hierarchy.

Three tiers of visual weight on every page:
1. **Hero** — the thing your eye hits first (title, verdict, score)
2. **Body** — the supporting content (evidence, tables, cards)
3. **Footer** — metadata that's present but not competing

---

## Pipeline Brief (`brief.html`)

Shipped incrementally — each pipeline stage adds its slides:

| Stage | Source files created | Slides added |
|-------|-------------------|-------------|
| `/learn` | `summary.md`, `outcomes.md`, `decisions.md` | Summary + Opportunities |
| `/explore` | `competitors.md`, `journey.md`, `variations.md` | Competitors + Journey + Variations |
| `/assess` | `metrics.md`, `scope.md` | KPIs + Scope |
| `/prove` | `feasibility.md` | Feasibility |
| `/ship` | `prd.md` | PRD |
| All stages | `decisions.md` (append) | Decisions |

### File

`pipeline/{idea-slug}/brief.html`

Since this file lives at the pipeline root, all iframe paths to sketch files use the `sketches/` prefix.

### Styling

Read `_shared/brief.css` and embed its full contents in a `<style>` tag
in the `<head>`. Do not modify the CSS — copy it verbatim.

**Font link** (in `<head>`, before the `<style>` tag):
```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

**Visual principles:** Precision editorial — pure white surfaces, surgical
orange accent, tight letter-spacing on headings, subtle depth through shadows
and borders. No cream backgrounds, no heavy colored sections.

### Visual Identity (6 Anchors)

These must be **identical** on every page:

1. **Hero strip** (`.hero-strip`) — same height, padding, bg on every page
2. **Section headers** (`.section-header`) — small caps, tertiary, 0.1em tracking
3. **Status pills** (`.pill-green/yellow/red`) — same component everywhere
4. **Evidence treatment** (`.evidence-list`) — bold stat + dash + interpretation + grey hyperlinked source
5. **Card component** (`.card`) — shared base: subtle border, consistent padding/radius
6. **Footer metadata** (`.metadata-footer`) — same position, 12px, tertiary color

---

## Navigation: Why / What / How

Replace pipeline-stage grouping with stakeholder-question grouping.
Nav pills grouped by question category with labels:

| Group | Label | Pills |
|-------|-------|-------|
| Why | `WHY` | Summary · Opportunities · Competitors |
| What | `WHAT` | Journey · Variations · KPIs · Scope |
| How | `HOW` | Feasibility · Decisions · PRD |

Render group labels as `.nav-group-label` elements. Separate groups
with `.nav-separator` (`|`). Only show a group label when at least
one pill in that group is visible.

```html
<nav class="topnav">
  <div class="nav-pills">
    <span class="nav-group-label">WHY</span>
    <button class="nav-pill active">Summary</button>
    <button class="nav-pill">Opportunities</button>
    <button class="nav-pill">Competitors</button>
    <span class="nav-separator">|</span>
    <span class="nav-group-label">WHAT</span>
    <button class="nav-pill">Journey</button>
    <!-- ... -->
  </div>
  <div class="nav-meta">
    <button class="share-btn">Share</button>
    <span class="meta-date">Jun 2026</span>
    <span class="stage-badge">Assessed</span>
  </div>
</nav>
```

---

## Page Routing

Each skill loads only the page specs it needs from `_shared/brief-pages/`:

| Skill | Pages to load |
|-------|---------------|
| /learn | summary.md, outcomes.md, decisions.md |
| /explore | competitors.md, journey.md, variations.md, decisions.md |
| /assess | kpis.md, scope.md, decisions.md |
| /prove | feasibility.md, decisions.md |
| /ship | decisions.md |

Load the core brief-builder (this file) + only the pages listed for the running skill.

---

## Data Source

All data embedded as a single `briefData` JS object in a `<script>` tag.

```javascript
const briefData = {
  meta: { slug: '', date: '', stage: '' },
  // stage: 'Ground' | 'Explored' | 'Assessed' | 'Proven' | 'Shipped'

  // SUMMARY fields (from summary.md)
  betHeadline: '',           // executive-facing: "When [occasion], [audience] need [job outcome]"
  occasionLabel: '',         // short label (e.g., "Family Weeknight Dinner")
  opportunityLabel: '',      // short label (e.g., "Decision Fatigue")
  seeking: '',               // "Approval for 90-day pilot"
  producer: '',              // single name
  title: '',                 // full title (used as fallback)
  jtbd: '',                  // full JTBD (kept in md, not shown on brief summary)
  execSummary: '',           // 1-2 sentence thesis TL;DR (shown before evidence)
  executiveSummary: [        // exactly 3 items, narrative-sequenced
    { text: '', source: '', sourceUrl: '' },  // 1. problem is real
    { text: '', source: '', sourceUrl: '' },  // 2. opportunity is sized
    { text: '', source: '', sourceUrl: '' },  // 3. bet is credible
  ],
  confidence: { color: '', label: '', reason: '' },
  keyNumbers: { opportunity: '', metricType: '', affected: '', complexity: '' },

  // OUTCOMES fields (from outcomes.md)
  occasion: {
    name: '', description: '',
    time: '', social: '', need: '', struggle: '',
    evidence: [{ text: '', source: '', sourceUrl: '' }]
  },
  job: '',
  outcomeMap: {
    discover: [{ num: 1, text: '', i: 4, s: 2, opp: 3.0, source: '' }],
    decide: [], do: [], resolve: []
  },
  topOutcomes: [{ num: 3, text: '', i: 5, s: 1, opp: 5.0, step: 'Decide', source: '' }],
  research: {
    inputType: '', affected: '', opportunitySize: '',
    complexity: { level: '', details: '' },
    openQuestions: [],
    keyDataPoints: [{ value: '', label: '', source: '', sourceUrl: '' }]
  },

  // COMPETITORS fields (from competitors.md)
  competitors: {
    strategicRead: '',       // 2-3 sentences
    tableStakes: [],         // array of strings
    differentiators: [       // comparison table rows
      { name: '', us: 'strong', compA: 'partial', compB: 'absent' }
    ],
    compNames: [],           // competitor column headers
    takeaways: [
      { insight: '', data: '', source: '', sourceUrl: '' }
    ],
    screenshots: [
      { name: '', filename: '', caption: '' }
    ]
  },

  // JOURNEY fields (from journey.md)
  journey: {
    insights: [
      { icon: '', title: '', text: '', highlight: false }  // exactly 3; one highlight
    ],
    storyboard: [
      { icon: '', thought: '', emotion: '', emotionClass: '', caption: '', detail: '', isIntervention: false }
      // exactly 5 panels. emotionClass: 'negative' | 'positive' | '' (intervention uses frame class)
    ],
    blueprint: {
      stages: [],  // exactly 5 stage column headers
      rows: [
        // 4 rows: customer, frontstage, backstage, support
        { label: 'Customer', cells: [{ title: '', detail: '', isIntervention: false }] },
        { label: 'Frontstage', cells: [{ title: '', detail: '', isIntervention: false }] },
        { label: 'Backstage', cells: [{ title: '', detail: '', isIntervention: false }] },
        { label: 'Support', cells: [{ title: '', detail: '', isIntervention: false }] }
      ]
    }
  },
  direction: { name: '', description: '' },

  // VARIATIONS fields (from variations.md)
  variations: [{
    id: '', name: '', concept: '', reaction: '', chosen: false,
    screens: [{ entry: '', label: '' }]
  }],
  chosenDirection: { name: '', why: '' },

  // KPIs fields (from metrics.md)
  metrics: {
    northStar: { name: '', outcomeNum: 0, oppScore: 0, baseline: '', target: '', confidence: '' },
    inputs: [{ name: '', outcomeNum: 0, oppScore: 0, baseline: '', target: '', confidence: '' }],
    guardrails: [{ name: '', outcomeNum: 0, oppScore: 0, baseline: '', target: '', confidence: '' }]
  },
  killCriteria: [{ condition: '', timeframe: '', action: '' }],
  goalsAlignment: { goal: '', mechanism: '' },

  // SCOPE fields (from scope.md)
  whatToBuild: [],
  dontBuild: [],
  later: [{ item: '', phase: '', reason: '' }],
  buildContext: [{ component: '', status: '', statusColor: '', notes: '' }],

  // FEASIBILITY fields (from feasibility.md)
  feasibility: {
    components: [{
      component: '', effort: 1, deps: 0, risk: 1.0,
      criticality: 1.0, aiReadiness: 1.0, score: 0, driver: ''
    }],
    teamCount: 0,
    teamNames: [],
    coordinationFactor: 1.0,
    featureScore: 0,
    bottleneck: '',
    aiReadinessNarrative: '',
    risks: [{ risk: '', likelihood: '', impact: '', mitigation: '' }],
    dependencies: [{ dep: '', type: '', blocks: '', owner: '', status: '' }]
  },

  // DECISIONS fields (from decisions.md)
  decisions: [{ num: 0, decision: '', why: '', when: '' }],
  openQuestions: [{ question: '', owner: '', status: '' }],
  decisionLog: [{
    skill: '/learn', date: '',
    entries: [{ q: '', a: '', tag: '' }]
  }],

  // PRD (from prd.md)
  prd: null,

  // META
  pipelineCost: {
    sessions: 0,
    inputTokens: '', outputTokens: '', cacheTokens: '',
    estCost: ''
  },
  files: {
    prototype: 'sketches/final.html',
    finalShowcase: 'sketches/final-showcase.html',
    journey: 'sketches/journey.html',
    variationExplorer: 'sketches/index.html'
  },
  screens: []
};
```

**Null-skipping rule:** When a top-level field is `null`, the builder
hides that slide's nav item and does not render the slide.

---

## Slide Navigation

```javascript
let activeSlide = 0;

const allSlides = [
  // WHY
  { id: 'summary', label: 'Summary', dataKey: null, group: 'Why' },
  { id: 'opportunities', label: 'Opportunities', dataKey: 'research', group: 'Why' },
  { id: 'competitors', label: 'Competitors', dataKey: 'competitors', group: 'Why' },
  // WHAT
  { id: 'journey', label: 'Journey', dataKey: 'journey', group: 'What' },
  { id: 'variations', label: 'Variations', dataKey: 'variations', group: 'What' },
  { id: 'kpis', label: 'KPIs', dataKey: 'metrics', group: 'What' },
  { id: 'scope', label: 'Scope', dataKey: 'whatToBuild', group: 'What' },
  // HOW
  { id: 'feasibility', label: 'Feasibility', dataKey: 'feasibility', group: 'How' },
  { id: 'decisions', label: 'Decisions', dataKey: 'decisionLog', group: 'How' },
  { id: 'prd', label: 'PRD', dataKey: 'prd', group: 'How' },
];

const visibleSlides = allSlides
  .filter(s => s.dataKey === null || briefData[s.dataKey] != null);

function setSlide(idx) {
  activeSlide = idx;
  document.querySelectorAll('.slide').forEach((s, i) => {
    s.style.display = i === idx ? 'flex' : 'none';
  });
  // Update nav pill active state
  // Lazy-load iframe src on first visit (data-src → src)
}

// Initialize: build nav then trigger slide 0 to load its iframes
buildNav();
setSlide(0);
```

---

## Share Button

Same as v1. Every brief includes a Share button that publishes to
`product-os.lths.ai/briefs/{slug}/` and copies the link.

```javascript
function shareBrief() {
  const slug = briefData.meta.slug;
  const url = `https://product-os.lths.ai/briefs/${slug}/`;
  const toast = document.getElementById('shareToast');
  if (window.electronAPI && window.electronAPI.publishBrief) {
    window.electronAPI.publishBrief(slug).then((r) => {
      if (r && r.url) { navigator.clipboard.writeText(r.url).catch(() => {}); showToast(toast, 'Published — link copied'); }
      else showToast(toast, 'Publish failed');
    });
  } else {
    navigator.clipboard.writeText(url).then(() => showToast(toast, 'Link copied')).catch(() => showToast(toast, url));
  }
}
function showToast(el, msg) { el.textContent = msg; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2500); }
```

---

## Rules

- **No brand label** in nav — no "PIPELINE BRIEF" text
- **No screenshot buttons** — users capture via OS tools
- **Lazy iframe loading** — `data-src` → `src` on first visit
- **No legacy aliases** — use canonical CSS variable names only
- **Evidence sources** — always render as small grey hyperlinks (`<a class="evidence-source">`)
- **One slide visible** at a time (`.slide` / `.slide.active`)
- **`slideEnter` animation** on active slides
