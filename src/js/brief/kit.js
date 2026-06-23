// Brief design kit — reusable, LEAPs-styled render helpers. Every brief section
// composes from these so the whole pane stays visually consistent.
// All return HTML strings; all text is escaped via window.H.esc.
window.BK = (() => {
  const esc = window.H.esc;

  const toneColor = (t) => ({
    pursue: 'var(--pursue)', needs: 'var(--needs)', kill: 'var(--kill)',
    accent: 'var(--accent)', ok: 'var(--pursue)', warn: 'var(--needs)',
    high: 'var(--pursue)', medium: 'var(--needs)', low: 'var(--kill)',
    strong: 'var(--pursue)', partial: 'var(--needs)', absent: 'var(--ink-3)',
  }[String(t || '').toLowerCase()] || 'var(--ink-3)');
  const toneWeak = (t) => ({
    pursue: 'var(--pursue-weak)', needs: 'var(--needs-weak)', kill: 'var(--kill-weak)',
    accent: 'var(--accent-weak)', high: 'var(--pursue-weak)', medium: 'var(--needs-weak)', low: 'var(--kill-weak)',
  }[String(t || '').toLowerCase()] || 'var(--surface-2)');

  // section wrapper + header. lede optional.
  const section = (eyebrow, title, lede) => `
    <div class="bk-sec">
      ${eyebrow ? `<div class="eyebrow">${esc(eyebrow)}</div>` : ''}
      ${title ? `<h2 class="bk-title">${esc(title)}</h2>` : ''}
      ${lede ? `<p class="bk-lede">${esc(lede)}</p>` : ''}
    </div>`;

  // wrap a whole tab's content
  const col = (inner) => `<div class="brief-col bk-col">${inner}</div>`;

  // small caps sub-heading inside a section
  const sub = (t) => `<div class="bk-sub">${esc(t)}</div>`;

  // stat cards row. items: [{v, l, tone?}]
  const stats = (items) => `
    <div class="bk-stats">
      ${items.map(s => `
        <div class="bk-stat">
          <div class="bk-stat-v"${s.tone ? ` style="color:${toneColor(s.tone)}"` : ''}>${esc(s.v)}</div>
          <div class="bk-stat-l">${esc(s.l)}</div>
        </div>`).join('')}
    </div>`;

  // insight / concept cards. items: [{icon?, title, text, highlight?, tone?}]
  const cards = (items) => `
    <div class="bk-cards">
      ${items.map(c => `
        <div class="bk-card${c.highlight ? ' hl' : ''}">
          ${c.title ? `<div class="bk-card-t">${esc(c.title)}</div>` : ''}
          ${c.text ? `<div class="bk-card-x">${esc(c.text)}</div>` : ''}
        </div>`).join('')}
    </div>`;

  // generic table. cols: [labels]; rows: [[cells]]. cellTone(rowIdx,colIdx,val)
  // optional → tone string. rawCols: optional [colIdx] whose cells are already
  // safe HTML (caller escaped them) and must not be re-escaped.
  const table = (cols, rows, cellTone, rawCols) => {
    const raw = new Set(rawCols || []);
    return `
    <div class="bk-table-wrap">
      <table class="bk-table">
        <thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
        <tbody>${rows.map((r, ri) => `<tr>${r.map((cell, ci) => {
          const tone = cellTone && cellTone(ri, ci, cell);
          return `<td${tone ? ` style="color:${toneColor(tone)};font-weight:600"` : ''}>${raw.has(ci) ? cell : esc(cell)}</td>`;
        }).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>`;
  };

  // key/value rows. pairs: [[k, v]]
  const kv = (pairs) => `
    <div class="bk-kv">
      ${pairs.map(([k, v]) => `<div class="bk-kv-row"><span class="bk-kv-k">${esc(k)}</span><span class="bk-kv-v">${esc(v)}</span></div>`).join('')}
    </div>`;

  // bullet list. items: [string] or [{text, tone?}]
  const list = (items) => `
    <ul class="bk-list">
      ${items.map(it => {
        const o = typeof it === 'object' ? it : { text: it };
        return `<li><span class="bk-dot"${o.tone ? ` style="background:${toneColor(o.tone)}"` : ''}></span>${esc(o.text)}</li>`;
      }).join('')}
    </ul>`;

  // pill. tone → color
  const pill = (text, tone) => `<span class="bk-pill" style="background:${toneWeak(tone)};color:${toneColor(tone)}"><span class="bk-pill-dot"></span>${esc(text)}</span>`;

  // a soft callout box (e.g. the bet, strategic read). tone sets the wash.
  const callout = (label, body, tone) => `
    <div class="bk-callout" style="background:${toneWeak(tone || 'accent')}">
      ${label ? `<div class="bk-callout-l" style="color:${toneColor(tone || 'accent')}">${esc(label)}</div>` : ''}
      <div class="bk-callout-b">${esc(body)}</div>
    </div>`;

  // section hero — title + subtitle + optional pills row (matches brief.html hero-strip)
  const hero = (title, subtitle, pillsHtml) => `
    <div class="bk-hero">
      <h2 class="bk-hero-t">${esc(title)}</h2>
      ${subtitle ? `<p class="bk-hero-s">${esc(subtitle)}</p>` : ''}
      ${pillsHtml ? `<div class="bk-hero-pills">${pillsHtml}</div>` : ''}
    </div>`;

  // dimension pills — [{label, value}]
  const dimPills = (items) => `
    <div class="bk-dimpills">
      ${items.filter(d => d && d.value).map(d => `<span class="bk-dimpill"><span class="bk-dimpill-l">${esc(d.label)}</span>${esc(d.value)}</span>`).join('')}
    </div>`;

  // multi-column layout — [{header, body}] (used for the 3-col Opportunities page)
  const cols = (columns) => `
    <div class="bk-cols">
      ${columns.map(c => `<div class="bk-colpane">${c.header ? `<div class="bk-sub">${esc(c.header)}</div>` : ''}${c.body || ''}</div>`).join('')}
    </div>`;

  // status items — colored left-border list. items: [string]; tone sets the accent.
  const statusList = (items, tone) => `
    <div class="bk-statuslist">
      ${items.map(t => `<div class="bk-statusitem" style="border-left-color:${toneColor(tone)}">${esc(t)}</div>`).join('')}
    </div>`;

  // outcome cards — [{text, opp, step}] coloured by opportunity score
  const outcomeCards = (items) => `
    <div class="bk-outcomes">
      ${items.map(o => {
        const t = o.opp >= 5 ? 'pursue' : o.opp >= 4 ? 'needs' : 'low';
        return `<div class="bk-outcome" style="border:none;border-left:3px solid ${toneColor(t)};background:var(--surface-2)">
          <div class="bk-outcome-t">${esc(o.text)}</div>
          <div class="bk-outcome-m">${o.opp != null ? `<span class="bk-pill" style="background:${toneWeak(t)};color:${toneColor(t)}">Opp ${esc(o.opp)}</span>` : ''}${o.step ? `<span class="bk-outcome-step">${esc(o.step)}</span>` : ''}</div>
        </div>`;
      }).join('')}
    </div>`;

  // competitor/comparison matrix — uniform CSS-drawn dots (full / half / ring), all same size.
  // headers: [string]; rows: [{ label, cells: [valueString] }] where value maps to a dot/tone.
  const DOTCLASS = { strong: 'mx-full', highlight: 'mx-full', partial: 'mx-half', absent: 'mx-ring', '': 'mx-ring' };
  const matrix = (headers, rows) => `
    <div class="bk-table-wrap">
      <table class="bk-table bk-matrix">
        <thead><tr>${headers.map((h, i) => `<th${i === 0 ? '' : ' class="cc"'}>${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => `<tr>
          <td class="mx-label">${esc(r.label)}</td>
          ${r.cells.map(v => { const k = String(v || '').toLowerCase(); return `<td class="cc"><span class="mx-dot ${DOTCLASS[k] || 'mx-ring'}" style="color:${toneColor(k === 'highlight' ? 'accent' : k)}"></span></td>`; }).join('')}
        </tr>`).join('')}</tbody>
      </table>
    </div>`;

  // source link — a real clickable external link (Looker/BQ/docs). Opens in the
  // system browser (intercepted in app.js → leaps:openExternal). Plain muted text
  // when there's no URL.
  const srcLink = (text, url) => url
    ? `<a class="bk-src" href="${esc(url)}" data-ext="1" target="_blank" rel="noopener">${esc(text || 'source')}</a>`
    : `<span class="bk-src bk-src-plain">${esc(text || '')}</span>`;

  // empty fallback
  const empty = (msg) => `<p class="tab-p">${esc(msg)}</p>`;

  return { esc, toneColor, toneWeak, section, col, sub, stats, cards, table, kv, list, pill, callout, hero, dimPills, cols, statusList, outcomeCards, matrix, srcLink, empty };
})();
