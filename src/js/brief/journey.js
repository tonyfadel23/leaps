// Brief section — Journey. Mirrors brief.html #slide-journey: a hero (chosen
// direction), Key Insights cards, the Customer Story storyboard rendered as a
// single horizontal row of scene panels (overflow-x:auto, no wrapping) with
// arrow connectors, then a Service Blueprint swimlane.
//
// Each storyboard panel = a tidy card: emoji icon, the thought in quotes, a bold
// caption, a muted detail, and an emotion pill toned by emotionClass||emotion
// (negative→kill, positive→pursue, else accent). Intervention steps
// (isIntervention||intervention) get an accent highlight + an 'Intervention' pill.
//
// The blueprint is a CSS-grid swimlane: stages as column headers across the top,
// then one row per present layer (Customer / Frontstage / Backstage / Support)
// with a left label column. Field shapes vary per idea, so every block guards its
// own data and nothing here is allowed to throw.
window.BriefSections = window.BriefSections || {};

window.BriefSections.journey = (idea, bd) => {
  const BK = window.BK;
  const esc = BK.esc;
  bd = bd || {};
  const has = (v) => v != null && String(v).trim() !== '';

  const blocks = [];

  // Hero — chosen direction (name + description).
  const dir = (bd.direction && typeof bd.direction === 'object') ? bd.direction : {};
  blocks.push(BK.hero(has(dir.name) ? dir.name : 'Customer journey', has(dir.description) ? dir.description : ''));

  const j = (bd.journey && typeof bd.journey === 'object') ? bd.journey : {};

  // ── Key insights → token-styled chip + bold title + muted text; highlighted
  // card uses the accent wash (matches .insight-card.highlight in brief.html).
  if (Array.isArray(j.insights)) {
    const ins = j.insights.filter(i => i && (has(i.title) || has(i.text)));
    if (ins.length) {
      blocks.push(BK.sub('Key insights'));
      const cards = ins.map(i => {
        const hl = !!i.highlight;
        const chip = has(i.icon)
          ? `<span style="display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;width:22px;height:22px;border-radius:6px;background:${hl ? 'var(--accent-weak)' : 'var(--surface-2)'};color:${hl ? 'var(--accent)' : 'var(--ink-3)'};font-family:var(--font-mono);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.02em;">${esc(String(i.icon).slice(0, 3))}</span>`
          : '';
        return `
          <div style="flex:1;min-width:0;display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:8px;background:${hl ? 'var(--accent-weak)' : 'var(--surface-2)'};${hl ? 'box-shadow:inset 0 0 0 1px var(--accent);' : ''}">
            ${chip}
            <div style="min-width:0;">
              ${has(i.title) ? `<div style="font-size:13px;font-weight:700;margin-bottom:3px;color:${hl ? 'var(--accent)' : 'var(--ink-1)'};">${esc(i.title)}</div>` : ''}
              ${has(i.text) ? `<div style="font-size:12px;line-height:1.5;color:var(--ink-2);">${esc(i.text)}</div>` : ''}
            </div>
          </div>`;
      });
      blocks.push(`<div style="display:flex;gap:12px;flex-wrap:wrap;">${cards.join('')}</div>`);
    }
  }

  // ── Customer story → single horizontal row of scene panels that scrolls
  // (overflow-x:auto, no wrap). Each panel: emoji icon + thought in quotes →
  // bold caption → muted detail → emotion pill. Subtle → connector between.
  if (Array.isArray(j.storyboard)) {
    const emoTone = (cls) => {
      const k = String(cls || '').toLowerCase();
      if (k === 'negative') return { fg: 'var(--kill)', bg: 'var(--kill-weak)' };
      if (k === 'positive') return { fg: 'var(--pursue)', bg: 'var(--pursue-weak)' };
      return { fg: 'var(--accent)', bg: 'var(--accent-weak)' };
    };
    const cap = (s) => has(s) ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '';

    const steps = j.storyboard.filter(s => s && (has(s.caption) || has(s.thought) || has(s.detail) || has(s.icon)));
    if (steps.length) {
      blocks.push(BK.sub('Customer story'));

      const panels = steps.map(s => {
        const cls = has(s.emotionClass) ? s.emotionClass : s.emotion;
        const tone = emoTone(cls);
        const intervention = !!(s.intervention || s.isIntervention);
        const cardStyle = intervention
          ? 'box-shadow:inset 0 0 0 1.5px var(--accent);background:var(--accent-weak);'
          : 'background:var(--surface-2);';
        const emoFg = intervention ? 'var(--accent)' : tone.fg;
        const emoBg = intervention ? 'var(--accent)' : tone.bg;
        const emoLabel = has(s.emotion) ? cap(s.emotion) : '';

        const head = (has(s.icon) || has(s.thought))
          ? `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:9px;">
               ${has(s.icon) ? `<div style="font-size:26px;line-height:1;flex-shrink:0;">${esc(s.icon)}</div>` : ''}
               ${has(s.thought) ? `<div style="flex:1;min-width:0;padding:5px 8px;border-radius:8px 8px 8px 2px;background:var(--surface-1);font-size:11px;line-height:1.35;font-style:italic;color:var(--ink-2);">${esc('“' + s.thought + '”')}</div>` : ''}
             </div>`
          : '';

        // Emotion pill + (when intervention) a small 'Intervention' pill.
        const pills = [];
        if (has(emoLabel)) {
          pills.push(`<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;background:${tone.bg};color:${tone.fg};"><span style="width:5px;height:5px;border-radius:50%;background:${tone.fg};"></span>${esc(emoLabel)}</span>`);
        }
        if (intervention) {
          pills.push(`<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;background:var(--accent);color:var(--surface-1);">Intervention</span>`);
        }
        const pillRow = pills.length ? `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:9px;">${pills.join('')}</div>` : '';

        return `
          <div style="flex:1 1 170px;min-width:170px;display:flex;flex-direction:column;padding:14px;border-radius:10px;${cardStyle}">
            ${head}
            ${has(s.caption) ? `<div style="font-size:12px;font-weight:700;line-height:1.35;color:var(--ink-1);margin-bottom:5px;">${esc(s.caption)}</div>` : ''}
            ${has(s.detail) ? `<div style="font-size:11px;line-height:1.45;color:var(--ink-3);">${esc(s.detail)}</div>` : ''}
            ${pillRow}
          </div>`;
      });

      // Interleave panels with subtle arrow connectors; the whole row scrolls.
      const arrow = `<div style="display:flex;align-items:center;flex-shrink:0;color:var(--ink-3);opacity:.5;font-size:15px;">→</div>`;
      const seq = panels.reduce((acc, p, i) => acc + (i ? arrow : '') + p, '');

      blocks.push(`<div style="display:flex;gap:10px;align-items:stretch;overflow-x:auto;padding:14px;border-radius:10px;background:var(--surface);">${seq}</div>`);
    }
  }

  // ── Service blueprint → swimlane grid. Stages as column headers across the
  // top, then one row per present layer with a left label column. Only render
  // layers that exist and are non-empty arrays.
  const bp = (j.blueprint && typeof j.blueprint === 'object') ? j.blueprint : null;
  if (bp) {
    const stages = Array.isArray(bp.stages) ? bp.stages : [];
    const layerDefs = [
      ['customer', 'Customer'],
      ['frontstage', 'Frontstage'],
      ['backstage', 'Backstage'],
      ['support', 'Support'],
    ];
    const L = (bp.layers && typeof bp.layers === 'object') ? bp.layers : {};
    const rows = layerDefs.filter(([k]) => Array.isArray(L[k]) && L[k].length);

    if (stages.length && rows.length) {
      blocks.push(BK.sub('Service blueprint'));

      // Grid: a fixed label column + one column per stage.
      const n = stages.length;
      const gridCols = `minmax(96px,120px) repeat(${n}, minmax(150px,1fr))`;
      const cellPad = 'padding:9px 11px;';
      const divider = 'border-top:1px solid var(--border);';
      const vDivider = 'border-left:1px solid var(--border);';

      const cells = [];

      // Header row: empty corner + stage names.
      cells.push(`<div style="${cellPad}background:var(--surface-2);"></div>`);
      stages.forEach(st => {
        cells.push(`<div style="${cellPad}${vDivider}background:var(--surface-2);font-family:var(--font-mono);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-2);">${esc(st)}</div>`);
      });

      // One row per present layer.
      rows.forEach(([key, label]) => {
        const arr = L[key];
        cells.push(`<div style="${cellPad}${divider}background:var(--surface-2);font-family:var(--font-mono);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-3);display:flex;align-items:center;">${esc(label)}</div>`);
        for (let i = 0; i < n; i++) {
          const v = arr[i];
          const empty = !has(v) || /^n\/a/i.test(String(v).trim());
          const bg = (key === 'customer' || key === 'frontstage') ? 'var(--surface)' : 'var(--surface-2)';
          cells.push(`<div style="${cellPad}${divider}${vDivider}background:${bg};font-size:11px;line-height:1.45;color:${empty ? 'var(--ink-3)' : 'var(--ink-2)'};">${empty ? '<span style="opacity:.5;">-</span>' : esc(v)}</div>`);
        }
      });

      blocks.push(`<div style="overflow-x:auto;border-radius:10px;"><div style="display:grid;grid-template-columns:${gridCols};min-width:max-content;">${cells.join('')}</div></div>`);
    }
  }

  const hasInsights = Array.isArray(j.insights) && j.insights.length;
  const hasStory = Array.isArray(j.storyboard) && j.storyboard.length;
  const hasBlueprint = bp && Array.isArray(bp.stages) && bp.stages.length;
  if (!hasInsights && !hasStory && !hasBlueprint) {
    return BK.col(blocks.join('\n') + BK.empty('No journey mapped yet.'));
  }
  // Wide page — the storyboard row and blueprint swimlane need the room (a 720
  // cap clipped them). Panels flex to fill, so all scenes stay visible.
  return BK.col(blocks.join('\n')).replace('class="brief-col bk-col"', 'class="brief-col bk-col bk-col-wide"');
};
