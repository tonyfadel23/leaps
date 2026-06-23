// Brief section — Decisions. Matches brief.html #slide-decisions:
//   LEFT  = Open + Resolved status lists.
//   RIGHT = decision log (Q&A grouped by skill phase).
// Returns {left, right} so LEAPs renders a resizable 2-pane. When there's no
// decision log, returns a single string instead so the right pane stays empty.
// Every block guards — sources are optional and null on some ideas. Never throws.
window.BriefSections = window.BriefSections || {};

window.BriefSections.decisions = (idea, bd) => {
  const BK = window.BK;
  const esc = window.H.esc;
  bd = bd || {};

  // ── LEFT — open + resolved status lists ──────────────────────────────────
  // Open questions — filter out resolved/answered. Items may be {question,...}
  // objects or plain strings. The brief shows just the question text.
  const oq = Array.isArray(bd.openQuestions) ? bd.openQuestions : [];
  const openTexts = oq
    .map(q => {
      if (q && typeof q === 'object') {
        const s = String(q.status || '').toLowerCase();
        if (s.indexOf('resolv') === 0 || s.indexOf('answer') === 0 || s === 'done') return null;
        return q.question != null ? String(q.question) : null;
      }
      return q != null && q !== '' ? String(q) : null;
    })
    .filter(Boolean);

  // Resolved — the strategic decisions ARE the resolved calls.
  const decisions = Array.isArray(bd.decisions) ? bd.decisions : [];
  const resolvedTexts = decisions
    .map(d => (d && d.decision != null ? String(d.decision) : null))
    .filter(Boolean);

  // Header mirrors the brief hero-strip subtitle: "N open · M resolved".
  let left = BK.section('Decisions', openTexts.length + ' open · ' + resolvedTexts.length + ' resolved');

  if (openTexts.length) {
    left += BK.sub('Open') + BK.statusList(openTexts, 'needs');
  }
  if (resolvedTexts.length) {
    left += BK.sub('Resolved') + BK.statusList(resolvedTexts, 'pursue');
  }
  if (!openTexts.length && !resolvedTexts.length) {
    left += BK.empty('No decisions recorded yet.');
  }

  // ── RIGHT — decision timeline, Q&A cards grouped by skill ─────────────────
  // Matches brief.html .decision-timeline: a skill-group-header per phase, then
  // numbered decision-cards (q-badge + question, answer in a muted box).
  // Entries number sequentially across every group.
  const log = Array.isArray(bd.decisionLog)
    ? bd.decisionLog.filter(g => g && Array.isArray(g.entries) && g.entries.length)
    : [];

  if (!log.length) {
    // No log — single pane (just the left content) so the right stays empty.
    return BK.col(left);
  }

  // Inline LEAPs-token styles — kit has no timeline primitive, so build it here.
  // Light, borderless entries: small mono group label, accent number badge,
  // bold question, answer in a subtle surface-2 box (no heavy card border).
  const HEADER = 'font-family:var(--font-mono);font-size:11px;font-weight:600;'
    + 'letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);'
    + 'margin:18px 0 9px;';
  const CARD = 'padding-left:14px;margin-bottom:14px;';
  const QROW = 'display:flex;gap:9px;align-items:flex-start;'
    + 'font-weight:600;color:var(--ink-1);font-size:13px;line-height:1.45;';
  const BADGE = 'flex:none;display:inline-flex;align-items:center;justify-content:center;'
    + 'width:18px;height:18px;border-radius:50%;background:var(--accent-weak);'
    + 'color:var(--accent);font-family:var(--font-mono);font-size:10.5px;'
    + 'font-weight:700;margin-top:1px;';
  const ANSWER = 'margin:7px 0 0 27px;padding:8px 11px;border-radius:6px;'
    + 'background:var(--surface-2);color:var(--ink-2);font-size:12.5px;line-height:1.5;';

  let right = BK.section('Decision log', 'Every question asked and answered');
  let n = 0;
  right += '<div class="bk-decision-timeline">';
  log.forEach(group => {
    const header = [group.skill, group.date].filter(Boolean).join(' — ');
    if (header) right += `<div style="${HEADER}">${esc(header)}</div>`;
    group.entries.forEach(e => {
      // Normalize entry to {q, a}. Tolerate strings and {text} shapes.
      let q = '', a = '';
      if (typeof e === 'string') { q = e; }
      else if (e && typeof e === 'object') {
        q = e.q != null ? String(e.q) : (e.text != null ? String(e.text) : '');
        a = e.a != null ? String(e.a) : '';
      }
      if (!q && !a) return;
      n += 1;
      right += `<div style="${CARD}">`
        + `<div style="${QROW}"><span style="${BADGE}">${n}</span><span>${esc(q)}</span></div>`
        + (a ? `<div style="${ANSWER}">${esc(a)}</div>` : '')
        + '</div>';
    });
  });
  right += '</div>';

  return { left: BK.col(left), right: BK.col(right) };
};
