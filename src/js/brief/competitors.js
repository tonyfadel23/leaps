// Brief section — Competitors. Mirrors brief.html #slide-competitors: a hero
// (strategic read) with table-stakes pills, then two columns — Key Takeaways and
// a Differentiators matrix. Competitor columns are derived from the data (they
// vary per idea: us / competitor A / competitor B / competitor C),
// so nothing is hardcoded. Every field is guarded; this never throws.
window.BriefSections = window.BriefSections || {};

window.BriefSections.competitors = (idea, bd) => {
  const BK = window.BK;
  const c = bd && bd.competitors;
  if (!c || typeof c !== 'object') return BK.empty('No competitive analysis yet.');

  const has = (v) => v != null && String(v).trim() !== '';
  const esc = BK.esc;
  const blocks = [];

  // Hero — strategic read + table-stakes pills underneath the subtitle.
  // The strategic read is the load-bearing line, so render it as a calm hero
  // (~13.5px, airy) rather than a boxed callout. Table-stakes are small accent
  // pills beneath it. We override the kit's hero divider to a hairline so the
  // page reads soft rather than "AI-bordered".
  const stakes = Array.isArray(c.tableStakes) ? c.tableStakes.filter(has) : [];
  const stakesPills = stakes.map(t => BK.pill(t, 'accent')).join('');
  const hero = BK.hero('Competitive landscape', c.strategicRead || '', stakesPills || null)
    .replace('class="bk-hero"', 'class="bk-hero" style="border-bottom:1px solid var(--surface-3);padding-bottom:16px"')
    .replace('class="bk-hero-s"', 'class="bk-hero-s" style="font-size:13.5px"');
  blocks.push(hero);

  // Differentiator matrix — derive competitor columns from the row keys.
  const diffs = Array.isArray(c.differentiators) ? c.differentiators : [];
  const compNames = [];
  diffs.forEach(d => Object.keys(d || {}).forEach(k => {
    if (k !== 'name' && !compNames.includes(k)) compNames.push(k);
  }));
  // Soften the matrix: drop the kit's 1px boxed wrapper for a borderless table
  // sitting on a quiet --surface-2 fill, with hairline row dividers. The dot
  // rendering (mx-full / mx-half / mx-ring) is left untouched.
  const matrixHtml = (diffs.length && compNames.length)
    ? BK.matrix(['Differentiator', ...compNames], diffs.map(d => ({
        label: d.name || '',
        cells: compNames.map(k => d[k] != null ? d[k] : ''),
      })))
      .replace('class="bk-table-wrap"', 'class="bk-table-wrap" style="border:none;border-radius:10px;background:var(--surface-2)"')
      .replace('class="bk-table bk-matrix"', 'class="bk-table bk-matrix" style="font-size:13px"')
    : '';

  // Key takeaways — items are either strings or {insight, data, source, sourceUrl}
  // objects (varies per idea). Keep the insight as the body and render the source
  // as a real clickable link (mirrors brief.html's .evidence-source), not folded
  // into plain parenthetical text.
  const rawTakeaways = (Array.isArray(c.takeaways) ? c.takeaways : []).filter(t =>
    (t && typeof t === 'object') ? has(t.insight) : has(t));
  // One <li>: bold the lead clause up to the em-dash (a quiet headline), then the
  // rest, then the clickable source. We inject our own <strong>/link markup, so
  // the escaped insight is passed as raw HTML.
  const renderTakeaway = (t) => {
    const o = (t && typeof t === 'object') ? t : { insight: String(t == null ? '' : t) };
    const insight = String(o.insight || '').replace(/\*\*/g, '').trim();
    const m = insight.split(/\s+—\s+/);
    const lead = m.length > 1
      ? `<strong style="color:var(--ink-1)">${esc(m[0])}</strong> - ${esc(m.slice(1).join(' - '))}`
      : esc(insight);
    const src = (has(o.source) || has(o.sourceUrl))
      ? ` <span class="ev-src">${BK.srcLink(o.source || 'source', o.sourceUrl)}</span>`
      : '';
    return `<li style="font-size:13px"><span class="bk-dot"></span><span>${lead}${src}</span></li>`;
  };
  const takeawaysHtml = rawTakeaways.length
    ? `<ul class="bk-list">${rawTakeaways.map(renderTakeaway).join('')}</ul>`
    : '';

  // Two columns when both sides have content; otherwise render whatever exists.
  // The Differentiators matrix is wide (one column per competitor), so give it the
  // larger share via the `cols-comp` proportion rather than the default even split.
  if (takeawaysHtml && matrixHtml) {
    blocks.push(BK.cols([
      { header: 'Key takeaways', body: takeawaysHtml },
      { header: 'Differentiators', body: matrixHtml },
    ]).replace('class="bk-cols"', 'class="bk-cols cols-comp"'));
  } else if (takeawaysHtml) {
    blocks.push(BK.sub('Key takeaways') + takeawaysHtml);
  } else if (matrixHtml) {
    blocks.push(BK.sub('Differentiators') + matrixHtml);
  }

  // Wider page cap than the default 720 — the matrix needs the room to breathe.
  return BK.col(blocks.join('\n')).replace('class="brief-col bk-col"', 'class="brief-col bk-col bk-col-wide"');
};
