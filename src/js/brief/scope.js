// Brief section — Scope. Matches brief.html #slide-scope: a hero strip, then two
// columns (Build | Don't build + Later), then a full-width Build context table.
// Each block guards independently — early-stage ideas may have scope lists but no
// build context, and vice versa. Returns a STRING (single pane). Bespoke rows use
// LEAPs CSS variables only — no raw hex, no additions to app.css.
window.BriefSections = window.BriefSections || {};
window.BriefSections.scope = (idea, bd) => {
  const BK = window.BK;
  const esc = BK.esc;
  bd = bd || {};

  const build = Array.isArray(bd.whatToBuild) ? bd.whatToBuild.filter(t => t != null && t !== '' && t !== '--') : [];
  const dont = Array.isArray(bd.dontBuild) ? bd.dontBuild.filter(t => t != null && t !== '') : [];
  const later = Array.isArray(bd.later) ? bd.later.filter(l => l && l.item) : [];
  const ctx = Array.isArray(bd.buildContext) ? bd.buildContext.filter(c => c && (c.component || c.status || c.notes)) : [];

  if (!build.length && !dont.length && !later.length && !ctx.length) {
    return BK.col(BK.empty('No scope defined yet.'));
  }

  // Light scope row — a small toned dot + text. Calmer than bk-statusitem's
  // bordered block when stacking many items: scannable, airy, no heavy wash.
  const scopeRow = (text, tone) => {
    const c = BK.toneColor(tone);
    return `<div style="display:flex;gap:10px;align-items:baseline;font-size:13px;line-height:1.5;color:var(--ink-1);padding:5px 0">` +
      `<span style="flex-shrink:0;width:6px;height:6px;border-radius:50%;background:${c};transform:translateY(-2px)"></span>` +
      `<span>${esc(text)}</span></div>`;
  };
  const scopeRows = (items, tone) =>
    `<div style="display:flex;flex-direction:column">${items.map(t => scopeRow(t, tone)).join('')}</div>`;

  // Hero — chosen direction name + Phase 1.
  const dir = (bd.chosenDirection && bd.chosenDirection.name) || (bd.direction && bd.direction.name) || '';
  let out = BK.hero('Scope', dir ? `${dir} — Phase 1` : 'Phase 1');

  // Two columns: Build (pursue) | Don't build (kill) + Later beneath it.
  const left = build.length ? scopeRows(build, 'pursue') : BK.empty('Nothing scoped to build yet.');

  let rightBody = '';
  if (dont.length) rightBody += scopeRows(dont, 'kill');
  if (later.length) {
    // Later — deferred items as aligned rows: a fixed-width accent phase badge so
    // the badges form a clean left column, then item + muted reason in --ink-3.
    // Phase/reason are optional (some ideas leave them blank) — guard each. Only
    // reserve the badge column when at least one item carries a phase; otherwise
    // (every phase blank) the spacer would just indent text 54px for nothing, so
    // we fall back to a plain dot row that reads as a clean list.
    const anyPhase = later.some(l => l.phase);
    const laterRows = later.map(l => {
      const badge = l.phase
        ? `<span style="display:inline-flex;align-items:center;justify-content:center;min-width:54px;height:19px;` +
          `font-family:var(--font-mono);font-size:9.5px;font-weight:700;letter-spacing:.03em;padding:0 7px;border-radius:100px;` +
          `background:var(--accent-weak);color:var(--accent);flex-shrink:0">${esc(l.phase)}</span>`
        : anyPhase
          ? `<span style="min-width:54px;flex-shrink:0"></span>`
          : `<span style="flex-shrink:0;width:6px;height:6px;border-radius:50%;background:var(--accent);transform:translateY(-2px)"></span>`;
      const reason = l.reason
        ? ` <span style="color:var(--ink-3)">- ${esc(l.reason)}</span>`
        : '';
      return `<div style="display:flex;gap:10px;align-items:baseline;font-size:13px;line-height:1.5;color:var(--ink-2);padding:5px 0">` +
        `${badge}<span>${esc(l.item)}${reason}</span></div>`;
    }).join('');
    rightBody += `<div style="margin-top:14px">${BK.sub('Later')}` +
      `<div style="display:flex;flex-direction:column;margin-top:8px">${laterRows}</div></div>`;
  }
  if (!rightBody) rightBody = BK.empty('Nothing excluded yet.');

  out += BK.cols([
    { header: 'Build', body: left },
    { header: "Don't build", body: rightBody },
  ]);

  // Build context — full-width table below the columns. The Status cell pairs a
  // colored dot (green→pursue, yellow/amber→needs, red→kill) with the label in an
  // inline-flex so the dot and text align cleanly across rows. The cell is pre-
  // built HTML, so it's exempt from cellTone escaping via the rawCols arg.
  if (ctx.length) {
    const statusCell = (sc, label) => {
      const t = ({ green: 'pursue', yellow: 'needs', amber: 'needs', red: 'kill' })[String(sc || '').toLowerCase()] || '';
      const color = t ? BK.toneColor(t) : 'var(--ink-3)';
      const dot = `<span style="flex-shrink:0;width:7px;height:7px;border-radius:50%;background:${color}"></span>`;
      return `<span style="display:inline-flex;gap:8px;align-items:center">${dot}<span>${esc(label)}</span></span>`;
    };
    const rows = ctx.map(c => [
      c.component != null ? c.component : '',
      statusCell(c.statusColor, c.status != null ? c.status : ''),
      c.notes != null ? c.notes : '',
    ]);
    out += `<div style="margin-top:18px">${BK.sub('Build context')}` +
      BK.table(['Component', 'Status', 'Notes'], rows, null, [1]) + `</div>`;
  }

  return BK.col(out);
};
