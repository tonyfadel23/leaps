// Brief section — Variations. LEFT pane of the Prototype slide (the live phone
// renders on the right, so this stays a clean single column — no phone here).
// Mirrors brief.html #slide-variations: a hero naming the chosen direction, the
// chosen variation as a highlighted card (name + PICK badge in the header, no
// dropped reason), then the rest under "Also explored" with a muted "Dropped:..."
// line. Each card is a selector: clicking it sets `selectedVariation`, which the
// phone on the right honours (ids match idea.variations from electron/main.js).
// Shape varies per idea — some carry a parsed array, some only an unparsed
// { raw } blob — so we guard for a real array and never throw.
window.BriefSections = window.BriefSections || {};

window.BriefSections.variations = (idea, bd, selected) => {
  const BK = window.BK;
  const esc = window.H.esc;
  bd = bd || {};
  const has = (v) => v != null && String(v).trim() !== '';

  const vars = Array.isArray(bd.variations)
    ? bd.variations.filter(v => v && (has(v.name) || has(v.concept)))
    : [];
  if (!vars.length) {
    return BK.col(BK.empty('No variations explored yet.'));
  }

  const name = (v) => (has(v.name) ? String(v.name).trim() : 'Untitled');
  // brief.html prefixes the id ("B ·") on explored cards — uppercased.
  const label = (v) => (has(v.id)
    ? String(v.id).trim().toUpperCase() + ' · ' + name(v)
    : name(v));
  const concept = (v) => (has(v.concept) ? String(v.concept).trim() : '');

  const chosen = vars.find(v => v && v.chosen) || vars[0];
  const rest = vars.filter(v => v !== chosen);

  // Which card drives the phone. Defaults to the chosen variation when nothing
  // is selected yet (matches the phone's own fallback in session.js).
  const selId = has(selected)
    ? String(selected)
    : (chosen && has(chosen.id) ? String(chosen.id) : null);
  const isActive = (v) => v && has(v.id) && String(v.id) === selId;

  // A variation card — header row (name + optional PICK badge), concept, and an
  // optional muted "Dropped: ..." line. `pick` flags the chosen direction (accent
  // wash + PICK badge); `active` is the currently-shown screen (accent ring). The
  // whole card is a `select-variation` button so clicking swaps the phone.
  const card = (id, title, conceptText, dropped, pick, active) => `
    <div ${has(id) ? `data-action="select-variation" data-var="${esc(String(id))}"` : ''} style="border-radius:12px;padding:14px;margin-bottom:8px;background:var(--surface);box-shadow:var(--shadow-sm);transition:outline .12s,background .12s;${has(id) ? 'cursor:pointer;' : ''}${pick ? 'background:var(--accent-weak);' : ''}${active ? 'outline:2px solid var(--accent);outline-offset:-2px;' : ''}">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="font-size:14px;font-weight:700;color:var(--ink-1);">${esc(title)}</span>
        ${pick ? `<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:100px;background:var(--accent);color:var(--accent-ink);letter-spacing:.03em;">PICK</span>` : ''}
      </div>
      ${conceptText ? `<div style="font-size:13px;color:var(--ink-2);line-height:1.45;">${esc(conceptText)}</div>` : ''}
      ${dropped ? `<div style="font-size:12px;color:var(--ink-3);font-style:italic;margin-top:6px;">Dropped: ${esc(dropped)}</div>` : ''}
    </div>`;

  let out = BK.hero(
    'Variations explored',
    'Chosen: ' + name(chosen) + (has(chosen.concept) ? ' — ' + concept(chosen) : '')
  );

  // Chosen direction — highlighted card, no dropped reason (it wasn't dropped).
  out += BK.sub('Chosen direction');
  out += card(chosen.id, name(chosen), concept(chosen), '', true, isActive(chosen));

  // Also explored — each shows concept + the reaction as a muted "Dropped:" line.
  if (rest.length) {
    out += BK.sub('Also explored');
    out += rest.map(v => card(
      v.id,
      label(v),
      concept(v),
      has(v.reaction) ? String(v.reaction).trim() : '',
      false,
      isActive(v)
    )).join('');
  }

  return BK.col(out);
};
