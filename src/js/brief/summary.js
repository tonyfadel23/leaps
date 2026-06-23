// Brief — Summary tab. Reskins an idea's structured brief data into a calm,
// scannable overview that mirrors the LEFT pane of brief.html #slide-summary:
// slug eyebrow → bet headline → context line → 3 stat chips → exec summary →
// evidence list → seeking → footer. The prototype phone lives in the split's
// right pane (added by LEAPs), so this stays a clean single column — no phone.
// Every block guards its own data: missing fields are skipped, never rendered
// as empty shells, and nothing here is allowed to throw. Bespoke bits use LEAPs
// CSS variables only — no raw hex, no additions to app.css.
window.BriefSections = window.BriefSections || {};

window.BriefSections.summary = (idea, bd) => {
  const BK = window.BK;
  const esc = window.H.esc;
  bd = bd || {};
  const blocks = [];

  // only emit when there's real content
  const has = (v) => v != null && String(v).trim() !== '';

  // confidence wash: green→pursue (pursue), yellow→needs, red→kill
  const mapConfColor = (c) =>
    ({ green: 'pursue', yellow: 'needs', red: 'kill' }[String(c || '').toLowerCase()] || 'needs');

  // render **bold** lead-in (brief evidence uses a bold opener + em-dash body).
  // splits on the FIRST **…** run, escapes both halves, leaves the rest plain.
  const boldLead = (raw) => {
    const s = String(raw);
    const m = s.match(/^\s*\*\*(.+?)\*\*(.*)$/s);
    if (m) return `<strong style="color:var(--ink-1);font-weight:600">${esc(m[1])}</strong>${esc(m[2])}`;
    return esc(s);
  };

  // BK.srcLink is the canonical source renderer; degrade to plain esc if absent.
  const srcLink = (BK && BK.srcLink) || ((t) => esc(t || ''));

  const meta = bd.meta || {};

  // 1. Slug eyebrow — uppercase, tracked, tertiary (brief .bet-slug)
  const slug = meta.slug || bd.title;
  if (has(slug)) {
    blocks.push(
      `<div style="font-family:var(--font-mono);font-size:11px;font-weight:600;color:var(--ink-3);` +
      `text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">${esc(slug)}</div>`
    );
  }

  // 2. Bet headline — bold ~19px heading, NOT a callout box (brief .bet-headline)
  if (has(bd.betHeadline)) {
    blocks.push(
      `<h2 style="font-size:19px;font-weight:700;color:var(--ink-1);line-height:1.3;` +
      `letter-spacing:-0.01em;margin:0 0 10px">${esc(bd.betHeadline)}</h2>`
    );
  }

  // 3. Context line — Stage pill + occasion + opportunity, middot-separated (brief .bet-context)
  const ctxParts = [];
  if (has(meta.stage)) ctxParts.push(BK.pill(meta.stage, 'accent'));
  if (has(bd.occasionLabel)) ctxParts.push(`<span style="color:var(--ink-2)">${esc(bd.occasionLabel)}</span>`);
  if (has(bd.opportunityLabel)) ctxParts.push(`<span style="color:var(--ink-2)">${esc(bd.opportunityLabel)}</span>`);
  if (ctxParts.length) {
    const mid = `<span style="color:var(--ink-3)">·</span>`;
    blocks.push(
      `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px;margin-bottom:18px">` +
      ctxParts.join(mid) + `</div>`
    );
  }

  // 4. Stats strip — Opportunity, Complexity, Confidence (toned chip) (brief .stats-strip)
  const kn = bd.keyNumbers;
  const conf = bd.confidence;
  const stats = [];
  if (kn && typeof kn === 'object') {
    if (has(kn.opportunity)) stats.push({ v: kn.opportunity, l: 'Opportunity' });
    if (has(kn.complexity)) stats.push({ v: kn.complexity, l: 'Complexity' });
  }
  if (conf && typeof conf === 'object' && has(conf.label)) {
    stats.push({ v: conf.label, l: 'Confidence', tone: mapConfColor(conf.color) });
  }
  if (stats.length) blocks.push(BK.stats(stats));

  // 5. Exec summary — JTBD in a subtle surface-2 box, no border (brief .exec-summary)
  if (has(bd.jtbd)) {
    blocks.push(
      `<div style="font-size:13px;line-height:1.6;color:var(--ink-2);padding:14px 16px;` +
      `background:var(--surface-2);border-radius:8px;margin-bottom:18px">${esc(bd.jtbd)}</div>`
    );
  }

  // 6. Evidence — bold lead-in + body in soft surface-2 cards; source rendered
  //    via BK.srcLink (real clickable link, muted-text fallback) (brief .evidence-list)
  if (Array.isArray(bd.executiveSummary)) {
    const items = bd.executiveSummary.filter((e) => e && has(e.text));
    if (items.length) {
      blocks.push(BK.sub('Evidence'));
      const lis = items.map((e) => {
        const src = has(e.source)
          ? `<div style="margin-top:6px;font-size:11px">${srcLink(e.source, e.sourceUrl)}</div>`
          : '';
        return `<div style="padding:11px 14px;background:var(--surface-2);border-radius:8px;` +
          `font-size:13px;line-height:1.55;color:var(--ink-2)">${boldLead(e.text)}${src}</div>`;
      });
      blocks.push(`<div style="display:flex;flex-direction:column;gap:8px;margin:8px 0 4px">${lis.join('')}</div>`);
    }
  }

  // 7. Seeking — needs-toned box with a small label (brief .seeking-line)
  if (has(bd.seeking)) {
    blocks.push(
      `<div style="margin-top:18px;padding:10px 14px;background:var(--needs-weak);border-radius:8px">` +
      `<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;` +
      `color:var(--needs);margin-bottom:4px">Seeking</div>` +
      `<div style="font-size:13px;font-weight:500;color:var(--ink-2);line-height:1.5">${esc(bd.seeking)}</div></div>`
    );
  }

  // 8. Footer — 'N sessions · ~$X' (brief .metadata-footer)
  const pc = bd.pipelineCost;
  if (pc && typeof pc === 'object') {
    const bits = [];
    if (has(pc.sessions)) bits.push(`${esc(pc.sessions)} session${String(pc.sessions) === '1' ? '' : 's'}`);
    if (has(pc.estCost)) bits.push(esc(pc.estCost));
    if (bits.length) {
      blocks.push(
        `<div style="margin-top:18px;padding-top:14px;border-top:1px solid var(--border);` +
        `font-size:12px;color:var(--ink-3)">${bits.join(' · ')}</div>`
      );
    }
  }

  if (!blocks.length) return BK.col(BK.empty('No summary data yet.'));
  return BK.col(blocks.join('\n'));
};
