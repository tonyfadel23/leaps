// Brief tab — Feasibility. bd.feasibility is null for every idea seen so far, so
// this tab is built from the research data that does exist: a stat row (affected,
// opportunity, complexity), the key data points, and the open questions. The real
// feasibility path is kept but guarded for when an assessment object appears.
// Returns a STRING (single pane).
window.BriefSections = window.BriefSections || {};

window.BriefSections.feasibility = (idea, bd) => {
  const BK = window.BK;
  bd = bd || {};
  const research = (bd.research && typeof bd.research === 'object') ? bd.research : {};

  let out = BK.hero('Feasibility', 'Can we actually build this?');

  // Stat row — only the dimensions that are actually present.
  const stat = (v, l) => (v != null && String(v).trim() !== '') ? [{ v: String(v), l }] : [];
  const stats = [
    ...stat(research.affected, 'Affected'),
    ...stat(research.opportunitySize, 'Opportunity'),
    ...stat(research.complexity, 'Complexity'),
  ];
  if (stats.length) out += BK.stats(stats);

  // Real feasibility assessment — render its fields if it ever becomes an object.
  const f = bd.feasibility;
  let renderedAssessment = false;
  if (f && typeof f === 'object') {
    const pairs = [];
    ['risk', 'effort', 'confidence', 'verdict'].forEach((k) => {
      if (f[k] != null && typeof f[k] !== 'object') pairs.push([k.charAt(0).toUpperCase() + k.slice(1), String(f[k])]);
    });
    if (pairs.length) { out += BK.kv(pairs); renderedAssessment = true; }

    const norm = (it, keys) => (typeof it === 'object' && it)
      ? (keys.map(k => it[k]).find(v => v != null) ?? '-')
      : it;
    if (Array.isArray(f.risks) && f.risks.length) {
      out += BK.sub('Risks') + BK.list(f.risks.map(r => String(norm(r, ['text', 'risk', 'label']))));
      renderedAssessment = true;
    }
    if (Array.isArray(f.dependencies) && f.dependencies.length) {
      out += BK.sub('Dependencies') + BK.list(f.dependencies.map(d => String(norm(d, ['text', 'name', 'label']))));
      renderedAssessment = true;
    }
  }

  // Data points — research.keyDataPoints: [{label, value, source, sourceUrl}].
  // Source renders as a real clickable link (Looker/BQ/docs) via BK.srcLink, or
  // muted plain text when there's no URL.
  const kdp = Array.isArray(research.keyDataPoints)
    ? research.keyDataPoints.filter(d => d && (d.label != null || d.value != null))
    : [];
  if (kdp.length) {
    const hasSource = kdp.some(d => d.source != null && String(d.source).trim() !== '');
    const cols = hasSource ? ['Data point', 'Value', 'Source'] : ['Data point', 'Value'];
    const rows = kdp.map(d => {
      const row = [
        d.label != null && String(d.label).trim() !== '' ? String(d.label) : '-',
        d.value != null && String(d.value).trim() !== '' ? String(d.value) : '-',
      ];
      if (hasSource) {
        const txt = d.source != null ? String(d.source).trim() : '';
        const url = d.sourceUrl != null ? String(d.sourceUrl).trim() : '';
        // BK.srcLink escapes text + url internally; pre-built safe HTML.
        row.push(txt ? BK.srcLink(txt, url) : '<span class="bk-src bk-src-plain">-</span>');
      }
      return row;
    });
    // Source column is pre-built HTML → exempt from re-escaping via rawCols.
    out += BK.sub('Data points') + BK.table(cols, rows, null, hasSource ? [2] : []);
  }

  // Open questions — two shapes coexist: top-level [{question, owner, status}]
  // (objects → table with status tone) and research.openQuestions [string]
  // (→ statusList in the 'needs' accent). Prefer the richer object shape.
  const topOQ = Array.isArray(bd.openQuestions) ? bd.openQuestions : [];
  const objQs = topOQ.filter(q => q && typeof q === 'object' && q.question != null);
  let renderedQs = false;

  if (objQs.length) {
    const rows = objQs.map(q => [
      String(q.question),
      q.owner != null && String(q.owner).trim() !== '' ? String(q.owner) : '-',
      q.status != null && String(q.status).trim() !== '' ? String(q.status) : '-',
    ]);
    const statusTone = (val) => {
      const v = String(val || '').toLowerCase();
      if (v.indexOf('resolv') === 0 || v.indexOf('answer') === 0 || v === 'done' || v === 'closed') return 'pursue';
      if (v.indexOf('block') !== -1) return 'kill';
      return 'needs';
    };
    out += BK.sub('Open questions') +
      BK.table(['Question', 'Owner', 'Status'], rows, (ri, ci, val) => (ci === 2 ? statusTone(val) : null));
    renderedQs = true;
  } else {
    // String-shaped questions from either source.
    const strQs = [];
    topOQ.forEach(q => { if (typeof q === 'string' && q.trim() !== '') strQs.push(q); });
    if (!strQs.length && Array.isArray(research.openQuestions)) {
      research.openQuestions.forEach(q => {
        if (typeof q === 'string' && q.trim() !== '') strQs.push(q);
        else if (q && q.question != null) strQs.push(String(q.question));
      });
    }
    if (strQs.length) {
      out += BK.sub('Open questions') + BK.statusList(strQs, 'needs');
      renderedQs = true;
    }
  }

  // Nothing beyond the hero — say so plainly.
  if (!stats.length && !renderedAssessment && !kdp.length && !renderedQs) {
    out += BK.empty('Feasibility not assessed yet.');
  }

  return BK.col(out);
};
