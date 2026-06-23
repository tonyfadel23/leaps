// Tab bar — a persistent Home tab plus one tab per open card/session. Rendered
// above the board/session content as a sibling, so rebuilding it never tears down
// the session's brief <iframe>. Each card tab runs its own discovery session; a
// running session shows a live dot, and closing a running tab confirms first.
window.TabsView = (() => {
  const { esc } = window.H;

  function render(s) {
    const tabs = s.tabs || [];
    const home = `<button class="tabx home ${s.activeTabId == null ? 'on' : ''}" data-action="activate-tab" data-id="" title="Pipeline">Home</button>`;
    const items = tabs.map((t) => {
      // The active tab's live run state is top-level (s.discovery); the entry's
      // copy is only synced on tab switch.
      const disc = s.activeTabId === t.id ? s.discovery : t.discovery;
      const running = !!(disc && disc.running);
      const on = s.activeTabId === t.id;
      const name = (t.idea && t.idea.name) || t.id;
      // Confirming a close → a self-sizing chip (no activate action on it, so a
      // stray click doesn't navigate). Plain, legible labels.
      if (s.confirmCloseTab === t.id) {
        return `<div class="tabx confirming ${on ? 'on' : ''}" title="Stop this run and close the tab?">`
          + `<span class="tabx-q">Stop run &amp; close?</span>`
          + `<button class="tabx-stop" data-action="confirm-close-tab" data-id="${esc(t.id)}">Stop</button>`
          + `<button class="tabx-cancel" data-action="cancel-close-tab" data-id="${esc(t.id)}">Keep</button>`
          + `</div>`;
      }
      return `<div class="tabx ${on ? 'on' : ''} ${running ? 'running' : ''}" data-action="activate-tab" data-id="${esc(t.id)}" title="${esc(name)}">`
        + `${running ? '<span class="tabx-dot"></span>' : ''}`
        + `<span class="tabx-name">${esc(name)}</span>`
        + `<button class="tabx-close" data-action="close-tab" data-id="${esc(t.id)}" title="Close tab">×</button>`
        + `</div>`;
    }).join('');
    return `<div class="app-tabs">${home}${items}</div>`;
  }

  return { render };
})();
