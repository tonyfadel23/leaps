// Brief section — KPIs. Mirrors brief.html #slide-kpis, which is two-pane:
// the LEFT pane carries the hero (with a 'Goals-aligned' pill), strategic
// alignment, a prominent north-star card, kill criteria and the full
// Role/Metric breakdown table; the RIGHT pane carries the compact metric tree
// visual (north star → inputs → guardrails). LEAPs renders { left, right } as a
// resizable 2-pane automatically. When there's no tree-worthy data we collapse
// to a single string so the right pane isn't left empty.
// Every block guards independently — metric trees vary in completeness between
// ideas (some have no kill criteria, some no north star, some no metrics at all).
window.BriefSections = window.BriefSections || {};

window.BriefSections.kpis = (idea, bd) => {
  const BK = window.BK;
  const esc = window.H.esc;
  bd = bd || {};
  const has = (v) => v != null && String(v).trim() !== '';
  const m = bd.metrics;

  if (!m || typeof m !== 'object') {
    return BK.col(BK.empty('No metrics defined yet.'));
  }

  // Hero. The 'Goals-aligned' pill only shows when alignment data is present,
  // matching the brief slide's hero-strip pill.
  const ga = bd.goalsAlignment;
  const aligned = ga && typeof ga === 'object' && (has(ga.goal) || has(ga.mechanism));
  let out = BK.hero(
    'Success criteria',
    'Metric tree inherited from the outcome map',
    aligned ? BK.pill('Goals-aligned', 'pursue') : ''
  );

  // Strategic alignment — how this ladders up to a company goal.
  if (aligned) {
    const body = [ga.goal, ga.mechanism].filter(has).join(' — ');
    out += BK.callout('Strategic alignment', body, 'accent');
  }

  // North star — the single outcome the bet is judged on. Rendered as a
  // prominent card: name big, 'baseline → target' below, a confidence pill.
  const ns = m.northStar;
  const nsConf = ns && has(ns.confidence) ? confTone(ns.confidence) : '';
  if (ns && typeof ns === 'object' && (has(ns.name) || has(ns.baseline) || has(ns.target))) {
    out += BK.sub('North star');
    const flow = [ns.baseline, ns.target].filter(has).map(esc).join(' &rarr; ');
    out += `
      <div style="background:var(--surface-2);border-left:3px solid var(--accent);border-radius:6px;padding:11px 14px;margin-bottom:12px;">
        <div style="font-size:15px;font-weight:700;color:var(--ink-1);margin-bottom:5px;">${esc(has(ns.name) ? ns.name : 'North star')}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12.5px;color:var(--ink-2);">
          ${flow ? `<span>${flow}</span>` : ''}
          ${has(ns.confidence) ? BK.pill(String(ns.confidence).toLowerCase() + ' confidence', nsConf || 'needs') : ''}
        </div>
      </div>`;
  }

  // Kill criteria — the triggers to stop, as a kill-toned left-border list.
  const kills = Array.isArray(bd.killCriteria) ? bd.killCriteria.filter(k => k && has(k.condition)) : [];
  if (kills.length) {
    out += BK.sub('Kill criteria');
    out += BK.statusList(
      kills.map(k => String(k.condition).trim() + (has(k.timeframe) ? ' — ' + String(k.timeframe).trim() : '')),
      'kill'
    );
  }

  // Metric breakdown — the full table. inputs are the core; if guardrails exist
  // we add a Role column so the table mirrors brief.html's Role/Metric/... layout.
  const inputs = Array.isArray(m.inputs) ? m.inputs.filter(i => i && has(i.name)) : [];
  const guardrails = Array.isArray(m.guardrails) ? m.guardrails.filter(g => g && has(g.name)) : [];

  if (inputs.length || guardrails.length) {
    out += BK.sub('Metric breakdown');

    const cell = (v) => (has(v) ? v : '');
    if (guardrails.length) {
      // Role column variant: north star (if present) + inputs + guardrails.
      // Role cells are toned (accent for NS, pursue for inputs, kill for
      // guardrails); confidence cells toned high/medium/low — both via cellTone.
      const rows = [];
      if (ns && typeof ns === 'object' && has(ns.name)) {
        rows.push(['North star', ns.name, cell(ns.baseline), cell(ns.target), cell(ns.confidence)]);
      }
      inputs.forEach(i => rows.push(['Input', i.name, cell(i.baseline), cell(i.target), cell(i.confidence)]));
      guardrails.forEach(g => rows.push(['Guardrail', g.name, cell(g.baseline), cell(g.target), cell(g.confidence)]));
      const roleTone = { 'North star': 'accent', 'Input': 'pursue', 'Guardrail': 'kill' };
      const cellTone = (ri, ci, val) => (ci === 0 ? (roleTone[val] || 'accent') : ci === 4 ? confTone(val) : '');
      out += BK.table(['Role', 'Metric', 'Baseline', 'Target', 'Confidence'], rows, cellTone);
    } else {
      const rows = inputs.map(i => [i.name, cell(i.baseline), cell(i.target), cell(i.confidence)]);
      const cellTone = (ri, ci, val) => (ci === 3 ? confTone(val) : '');
      out += BK.table(['Metric', 'Baseline', 'Target', 'Confidence'], rows, cellTone);
    }
  }

  // Metric tree — compact visual that fills the RIGHT pane, mirroring
  // brief.html: north star on top, input metrics in a row, guardrails below,
  // joined by connector lines. It needs a north star to anchor the tree plus at
  // least one input or guardrail to branch into. When that data is absent (e.g.
  // lapsed-winback has inputs but no north star) we leave the right pane out
  // entirely and return the left content as a single string instead.
  const treeNs = (ns && typeof ns === 'object' && has(ns.name)) ? ns : null;
  if (treeNs && (inputs.length || guardrails.length)) {
    let right = BK.sub('Metric tree');
    right += metricTree(treeNs, inputs, guardrails, esc);
    return { left: BK.col(out), right: BK.col(right) };
  }

  return BK.col(out);
};

// Map a confidence string to a LEAPs tone (high→pursue, medium→needs, low→kill).
function confTone(val) {
  const v = String(val || '').toLowerCase();
  return v === 'high' ? 'high' : v === 'medium' ? 'medium' : v === 'low' ? 'low' : '';
}

// Build the metric-tree visual from inline LEAPs tokens only. Cards sit on
// var(--surface) over the pane; a left accent bar codes the metric's tier.
function metricTree(ns, inputs, guardrails, esc) {
  const dotColor = (conf) => {
    const t = confTone(conf);
    return t === 'high' ? 'var(--pursue)' : t === 'medium' ? 'var(--needs)' : t === 'low' ? 'var(--kill)' : 'var(--ink-3)';
  };
  const label = (t) => `<div style="font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3);text-align:center;">${esc(t)}</div>`;
  const line = `<div style="width:1px;height:12px;background:var(--border-2);margin:0 auto;"></div>`;
  const card = (name, valHtml) => `
    <div style="flex:1;min-width:0;background:var(--surface-2);border-radius:8px;padding:10px 12px;">
      <div style="font-size:13px;font-weight:700;color:var(--ink-1);margin-bottom:3px;">${esc(name)}</div>
      <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;font-size:11.5px;color:var(--ink-2);">${valHtml}</div>
    </div>`;
  const dot = (conf) => `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${dotColor(conf)};margin-right:3px;flex-shrink:0;"></span>`;
  const flow = (m, prefix) => {
    const parts = [m.baseline, m.target].filter(v => v != null && String(v).trim() !== '').map(esc);
    const txt = prefix ? (parts.length ? prefix + ' ' + parts.join(' &rarr; ') : '') : parts.join(' &rarr; ');
    return dot(m.confidence) + (txt ? `<span>${txt}</span>` : '');
  };

  // Chunk inputs into rows of two so wide trees stay compact.
  const rows = [];
  for (let i = 0; i < inputs.length; i += 2) rows.push(inputs.slice(i, i + 2));

  let html = `<div style="display:flex;flex-direction:column;gap:8px;align-items:stretch;padding:14px;background:var(--surface);border-radius:8px;margin-bottom:6px;">`;
  html += label('North star');
  html += `<div style="display:flex;">${card(ns.name, flow(ns))}</div>`;

  if (inputs.length) {
    html += line + label('Input metrics');
    rows.forEach(r => {
      html += `<div style="display:flex;gap:8px;">${r.map(i => card(i.name, flow(i))).join('')}</div>`;
    });
  }

  if (guardrails.length) {
    html += line + label('Guardrails (kill signals)');
    guardrails.forEach(g => {
      html += `<div style="display:flex;">${card(g.name, flow(g, 'Must stay:'))}</div>`;
    });
  }

  html += `</div>`;
  return html;
}
