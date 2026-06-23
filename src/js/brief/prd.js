// Brief section — PRD. The vibe-coding handoff doc. Mirrors brief.html #slide-prd:
// a single-column rendered-markdown document (Build headline + Who this is for /
// The problem / What to build / Don't build) with a copy button top-right. Source
// is bd.prd, a markdown string compiled by /prd. Rendered via window.MD so the
// `[data: Looker]` inline-code tags and headings/lists carry the app's .md styles.
window.BriefSections = window.BriefSections || {};

window.BriefSections.prd = (idea, bd) => {
  const BK = window.BK;
  const md = bd && bd.prd;
  if (!md || !String(md).trim()) {
    return BK.col(BK.empty('No PRD compiled yet. Run /prd to generate the vibe-coding handoff.'));
  }
  const html = (window.MD && window.MD.render) ? window.MD.render(md) : `<pre>${BK.esc(md)}</pre>`;
  const copyIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  return `
    <div class="brief-col bk-prd-wrap">
      <div class="bk-prd-head">
        <span class="bk-sub" style="margin:0">Ready for handoff</span>
        <button class="ghost-btn" data-action="copy-prd">${copyIcon} Copy</button>
      </div>
      <div class="bk-prd md">${html}</div>
    </div>`;
};
