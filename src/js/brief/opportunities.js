// Brief section — Opportunities. Mirrors brief.html #slide-opportunities: a hero
// (occasion framing + dimension pills + confidence note) followed by a 3-column
// body — top scored outcomes, sourced key data, and open questions. Composes
// window.BK; bespoke bits use LEAPs variables only. Every column guards its own
// data and is omitted when empty; nothing throws.
window.BriefSections = window.BriefSections || {};
window.BriefSections.opportunities = (idea, bd) => {
  const BK = window.BK;
  const esc = window.H.esc;
  bd = bd || {};
  const has = (v) => v != null && String(v).trim() !== '';

  // HERO — dimension pills from the occasion (time / social / need / struggle)
  const occ = bd.occasion || {};
  const dims = [
    { label: 'TIME', value: occ.time },
    { label: 'SOCIAL', value: occ.social },
    { label: 'NEED', value: occ.need },
    { label: 'STRUGGLE', value: occ.struggle },
  ].filter(d => has(d.value));
  const pillsHtml = dims.length ? BK.dimPills(dims) : '';
  const hero = BK.hero('Opportunities', has(bd.jtbd) ? bd.jtbd : '', pillsHtml);

  // Confidence note under the hero — status dot tinted by color, muted reason
  // text (matches the brief's hero-strip note line).
  const conf = bd.confidence;
  let confNote = '';
  if (conf && typeof conf === 'object' && (has(conf.label) || has(conf.reason))) {
    const tone = { green: 'pursue', yellow: 'needs', red: 'kill' }[String(conf.color || '').toLowerCase()] || 'needs';
    const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${BK.toneColor(tone)};margin-right:7px;vertical-align:middle"></span>`;
    const label = has(conf.label) ? `<span style="color:${BK.toneColor(tone)};font-weight:700">${esc(conf.label)}</span>` : '';
    const reason = has(conf.reason) ? `${label ? ' - ' : ''}${esc(conf.reason)}` : '';
    confNote = `<div style="margin-top:10px;font-size:12px;color:var(--ink-3);line-height:1.45">${dot}${label}${reason}</div>`;
  }

  // COL 1 — Top Opportunities → outcome cards (kit colours by opp score)
  const outcomes = Array.isArray(bd.topOutcomes) ? bd.topOutcomes.filter(o => o && has(o.text)) : [];
  const col1 = outcomes.length
    ? { header: 'Top Opportunities', body: BK.outcomeCards(outcomes.map(o => ({ text: o.text, opp: o.opp, step: o.step }))) }
    : null;

  // COL 2 — Key Data → sourced metric table. keyDataPoints: [{label, value,
  // source?, sourceUrl?}]. Add a Source column only when any source exists,
  // rendered as small accent links (or muted text when there's no URL).
  const research = bd.research || {};
  const points = Array.isArray(research.keyDataPoints)
    ? research.keyDataPoints.filter(d => d && (has(d.label) || has(d.value)))
    : [];
  let col2 = null;
  if (points.length) {
    const hasSources = points.some(d => has(d.source) || has(d.sourceUrl));
    if (hasSources) {
      // Source cells are pre-built safe HTML (kit's srcLink already escapes),
      // so flag that column index via rawCols so the table doesn't re-escape it.
      const rows = points.map(d => [
        d.label || '',
        d.value || '',
        BK.srcLink(has(d.source) ? d.source : (has(d.sourceUrl) ? d.sourceUrl : ''), d.sourceUrl),
      ]);
      const tbl = BK.table(['Metric', 'Value', 'Source'], rows, null, [2]);
      col2 = { header: 'Key Data', body: tbl };
    } else {
      const rows = points.map(d => [d.label || '', d.value || '']);
      col2 = { header: 'Key Data', body: BK.table(['Metric', 'Value'], rows) };
    }
  } else if (bd.keyNumbers && typeof bd.keyNumbers === 'object') {
    const kn = bd.keyNumbers;
    const rows = [];
    if (has(kn.opportunity)) rows.push(['Opportunity', kn.opportunity]);
    if (has(kn.complexity)) rows.push(['Complexity', kn.complexity]);
    if (has(kn.affected)) rows.push(['Affected', kn.affected]);
    if (rows.length) col2 = { header: 'Key Data', body: BK.table(['Metric', 'Value'], rows) };
  }

  // COL 3 — Open Questions → status list (question-item style rows)
  let questions = [];
  if (Array.isArray(research.openQuestions)) {
    questions = research.openQuestions.filter(has);
  }
  if (!questions.length && Array.isArray(bd.openQuestions)) {
    questions = bd.openQuestions
      .map(q => (typeof q === 'string' ? q : (q && q.question)))
      .filter(has);
  }
  const col3 = questions.length
    ? { header: 'Open Questions', body: BK.statusList(questions, 'needs') }
    : null;

  const columns = [col1, col2, col3].filter(Boolean);
  if (!columns.length) {
    return BK.col(hero + confNote + BK.empty('No outcomes scored yet.'));
  }
  return BK.col(hero + confNote + BK.cols(columns));
};
