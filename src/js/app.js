// LEAPs bootstrap — router, render loop, event delegation.
(() => {
  const root = document.getElementById('leap-root');
  const Store = window.Store, DS = window.DataSource;

  // ── tabs ──
  // The top-level session keys are a projection of the active tab. These are the
  // keys a tab owns; on switch we snapshot them from top-level back into the
  // outgoing tab, then project the incoming tab's values onto top-level. idea and
  // discovery are objects shared by reference while a tab is active.
  const TAB_KEYS = ['idea', 'draft', 'activeTab', 'model', 'resolvedModel', 'tokens',
    'activeDim', 'expanded', 'verdictOpen', 'selectedVariation', 'modelMenuOpen', 'plusOpen', 'contextFiles', 'discovery'];

  function getTab(s, id) { return (s.tabs || []).find(t => t.id === id); }
  function getActiveTab(s) { return getTab(s, s.activeTabId); }

  // Copy the live top-level session keys back into the active tab entry before we
  // leave it, so a background tab keeps the latest messages/draft/discovery.
  function snapshotActiveTab() {
    const s = Store.get();
    const t = getActiveTab(s);
    if (!t) return;
    for (const k of TAB_KEYS) t[k] = s[k];
  }

  function persistOpenTabs() {
    const s = Store.get();
    try { localStorage.setItem('leap-open-tabs', JSON.stringify({ ids: (s.tabs || []).map(t => t.id), activeId: s.activeTabId })); } catch {}
  }

  // Make `id` the foreground tab (null = Home/board). Snapshots the current tab,
  // then projects the target's session state onto the top-level keys.
  function activateTab(id) {
    snapshotActiveTab();
    if (id == null) {
      Store.set({ activeTabId: null, sessionId: null, view: 'board', expanded: null });
      persistOpenTabs();
      return;
    }
    const t = getTab(Store.get(), id);
    if (!t) { Store.set({ activeTabId: null, sessionId: null, view: 'board' }); persistOpenTabs(); return; }
    const patch = { activeTabId: id, sessionId: id, view: 'session' };
    for (const k of TAB_KEYS) patch[k] = t[k];
    Store.set(patch);
    persistOpenTabs();
  }

  // Close a tab. A running session confirms first; idle tabs close immediately.
  function closeTab(id) {
    const s = Store.get();
    const tab = getTab(s, id);
    if (!tab) return;
    // The active tab's live run state is top-level (s.discovery); the entry's copy
    // is only synced on switch, so read the authoritative source.
    const disc = id === s.activeTabId ? s.discovery : tab.discovery;
    if (disc && disc.running && s.confirmCloseTab !== id) {
      Store.set({ confirmCloseTab: id });
      return;
    }
    try { DS.stopDiscovery(id); } catch {}
    const idx = (s.tabs || []).findIndex(t => t.id === id);
    const tabs = (s.tabs || []).filter(t => t.id !== id);
    Store.set({ tabs, confirmCloseTab: null });
    if (s.activeTabId === id) {
      const neighbor = tabs[idx] || tabs[idx - 1] || null; // tab to the right, else left, else Home
      activateTab(neighbor ? neighbor.id : null);
    } else {
      persistOpenTabs();
      Store.set({}); // refresh the tab bar
    }
  }

  // ── render ──
  function applyThemeClasses(s) {
    root.className = 'leap' + (s.theme === 'dark' ? ' is-dark' : '') +
      (s.accent === 'teal' ? ' accent-teal' : s.accent === 'violet' ? ' accent-violet' : '') +
      (s.loading ? ' is-loading' : '');
  }

  // Signature of everything the BRIEF PANE's content depends on. While it's
  // stable we keep the live .pane.brief node (and its prototype <iframe>) in place
  // and only refresh the chrome around it — so toggling the verdict drawer,
  // collapsing the conversation, switching theme, or streaming a message never
  // reloads the iframe (which is what caused the page to flicker). Overlay/chrome
  // state (verdictOpen, convCollapsed, expanded, modals, theme, contextFiles) is
  // deliberately EXCLUDED — it's handled by the in-place sessionPartial path.
  function briefSig(s) {
    const i = s.idea || {};
    return JSON.stringify([
      s.view, s.sessionId, s.activeTab, i.conviction, i.verdict,
      (i.dimensions || []).map(d => d.score), s.selectedVariation,
      i.prototypeUrl, (i.artifacts || []).length,
    ]);
  }

  // Signature of the CONVERSATION SCROLL's content (messages + chips). While it's
  // stable we keep the live .conv-scroll node in place during a partial render, so
  // chrome-only changes (opening the + sheet, the model menu, the verdict drawer,
  // theme) don't tear down and rebuild the whole message list — which is what made
  // the chat flicker. Captures the last message's growth (work steps / streamed
  // text) so live streaming still refreshes.
  function convSig(s) {
    const m = (s.idea && s.idea.messages) || [];
    const last = m[m.length - 1] || {};
    return JSON.stringify([
      m.length, last.kind, !!last.running, !!last.ask,
      (last.steps || []).length, (last.text || '').length,
      (s.idea && s.idea.chips) || [],
      !!(s.discovery && s.discovery.running),
    ]);
  }

  // Everything the board BEHIND the overlays depends on. While this is stable we
  // can swap only the overlay layer (settings tab, guide section, modals) without
  // re-rendering the board — no flicker.
  function boardSig(s) {
    const b = s.board || {};
    // NOTE: overlay state (settings, cardMenu, renameFor, confirmDelete, …) is
    // deliberately EXCLUDED — those change the overlay layer only, which we swap
    // in place. This signature is just the board behind the overlays.
    return JSON.stringify([
      // theme is EXCLUDED — applyThemeClasses() retints the whole app via CSS vars
      // on every render, so a theme switch needs no board/overlay rebuild (which
      // would re-toggle the open Settings modal).
      s.view, s.boardView, s.boardFilter, s.pipelineDir, s.accent, s.loading,
      (b.ideas || []).map(i => [i.id, i.verdict, i.conviction, i.name]), (b.killed || []).length,
    ]);
  }

  // WHICH overlays are open (not their contents). While this is stable, an
  // in-session settings change (save, add fallback, sign-in, update check) only
  // needs the settings BODY repainted — not the whole overlay layer re-mounted,
  // which replays the modal's entry animation and makes the screen "toggle".
  function overlaySig(s) {
    return JSON.stringify([
      !!s.settingsOpen, !!s.newIdeaOpen, !!s.guideOpen, !!s.confirmDelete,
      s.cardMenu ? (s.cardMenu.id || 1) : 0, s.renameFor ? (s.renameFor.id || 1) : 0,
    ]);
  }

  let mountedView = null, mountedSession = null, lastBriefSig = null, lastBoardSig = null, lastConvSig = null, lastOverlaySig = null;
  let shellBuilt = false;

  // The app shell: a persistent tab bar host + a content host. The board/session
  // render into the content host; the tab bar is a SIBLING so rebuilding it never
  // touches (and reloads) the session's brief <iframe>. Returns the content host.
  function ensureShell() {
    if (!shellBuilt || !root.querySelector('.content-host')) {
      root.innerHTML = '<div class="tabbar-host"></div><div class="content-host"></div><div class="global-overlay-host"></div>';
      shellBuilt = true;
      mountedView = null; mountedSession = null; lastBriefSig = null; lastBoardSig = null; lastOverlaySig = null;
    }
    return root.querySelector('.content-host');
  }

  // Render the app-global modals (Settings, Guide) into the shell host so they
  // open over ANY view. Swap the settings body in place when only its content
  // changed, so a tab switch / save doesn't re-mount the modal (entry-anim flicker).
  function renderGlobalOverlays(s) {
    const gHost = root.querySelector('.global-overlay-host');
    if (!gHost) return;
    const osig = overlaySig(s);
    const setBody = gHost.querySelector('.set-modal .set-main-body');
    if (s.settingsOpen && setBody && osig === lastOverlaySig) {
      const tab = s.settingsTab || 'account';
      const top = setBody.scrollTop;
      setBody.innerHTML = window.BoardView.settingsBody(s);
      setBody.scrollTop = top;
      const head = gHost.querySelector('.set-modal .set-main-head .t');
      if (head) head.textContent = window.BoardView.settingsTabLabel(tab);
      gHost.querySelectorAll('.set-modal .set-tab').forEach(t => t.classList.toggle('on', t.dataset.tab === tab));
    } else {
      gHost.innerHTML = window.BoardView.globalOverlays(s);
    }
    lastOverlaySig = osig;
  }

  // Patch a live message list against a freshly-rendered one WITHOUT recreating
  // unchanged nodes. Recreating them replays each message's CSS entrance animation
  // (lp-fade/lp-pop), which is what made the conversation flicker as text streamed
  // in or a card expanded. Only changed messages update (in place where possible)
  // and genuinely new messages append.
  function reconcileMessages(live, fresh) {
    const liveKids = Array.from(live.children);
    const freshKids = Array.from(fresh.children);
    for (let i = 0; i < freshKids.length; i++) {
      const lk = liveKids[i], fk = freshKids[i];
      if (!lk) { live.appendChild(fk); continue; }          // new → append (animates once)
      if (lk.outerHTML === fk.outerHTML) continue;          // unchanged → keep live node
      if (lk.tagName === fk.tagName && lk.className === fk.className) {
        lk.innerHTML = fk.innerHTML;                        // same node, new content → no re-animation
      } else {
        lk.replaceWith(fk);                                 // structurally different → swap
      }
    }
    for (let i = freshKids.length; i < liveKids.length; i++) liveKids[i].remove(); // surplus → drop
  }

  // Refresh the session view in place WITHOUT recreating the brief pane. Moving or
  // re-creating its <iframe> reloads the prototype and flashes the page, so we keep
  // the live .pane.brief node exactly where it is and swap only the topbar, the
  // conversation side of the body, and the overlay layer (drawer/modals) around it.
  function sessionPartial(host, s) {
    const tmp = document.createElement('div');
    tmp.innerHTML = window.SessionView.render(s);
    const liveView = host.querySelector('.view');
    const freshView = tmp.querySelector('.view');
    const liveBrief = liveView && liveView.querySelector('.pane.brief');
    const liveBody = liveBrief && liveBrief.parentElement;
    const freshBody = freshView && freshView.querySelector('.session-body');
    // Anything unexpected → fall back to a full swap rather than risk a broken tree.
    if (!liveView || !freshView || !liveBrief || !liveBody || !freshBody) {
      host.innerHTML = tmp.innerHTML;
      return;
    }

    // 1) topbar (verdict pill state, collapse toggle state, title)
    const liveTop = liveView.querySelector('.topbar.session');
    const freshTop = freshView.querySelector('.topbar.session');
    if (liveTop && freshTop) liveTop.replaceWith(freshTop);

    // 2) body — match the collapsed class, rebuild every child EXCEPT the brief pane.
    // First, preserve the live message list (.conv-scroll) when its content is
    // unchanged: move the existing node into the fresh conversation pane so a
    // chrome-only update (+ sheet, model menu, drawer) never re-creates the
    // messages — that re-creation is what made the chat flicker.
    const liveScroll = liveBody.querySelector('.pane.conversation .conv-scroll');
    const freshScroll = freshBody.querySelector('.pane.conversation .conv-scroll');
    if (liveScroll && freshScroll) {
      reconcileMessages(liveScroll, freshScroll); // patch only changed/new messages — no full re-animate
      freshScroll.replaceWith(liveScroll);         // keep the live (scrolled, reconciled) node in the tree
    }

    liveBody.className = freshBody.className;
    Array.from(liveBody.children).forEach(c => { if (c !== liveBrief) c.remove(); });
    Array.from(freshBody.children).forEach(fc => {
      if (fc.classList.contains('brief')) return; // keep the live brief in place
      liveBody.insertBefore(fc, liveBrief);
    });

    // 3) overlays (verdict drawer, modals) live after the body — drop old, add fresh
    while (liveView.lastElementChild && liveView.lastElementChild !== liveBody) {
      liveView.lastElementChild.remove();
    }
    Array.from(freshView.children).forEach(fc => {
      if (fc.classList.contains('topbar') || fc.classList.contains('session-body')) return;
      liveView.appendChild(fc);
    });
  }

  function render() {
    const s = Store.get();
    applyThemeClasses(s);
    // First-run onboarding takes over the whole window until finished/skipped.
    if (s.onboarding) {
      root.innerHTML = window.OnboardingView.render(s);
      shellBuilt = false; // rebuild the shell once onboarding finishes
      mountedView = 'onboarding'; mountedSession = null; lastBriefSig = null;
      return;
    }
    const host = ensureShell();
    // Tab bar — cheap, rebuilt each pass. It's a sibling of the content host, so
    // this never re-parents the brief <iframe>.
    const tb = root.querySelector('.tabbar-host');
    if (tb) tb.innerHTML = window.TabsView.render(s);
    // App-global modals (Settings, Guide) — render over whatever view is mounted.
    renderGlobalOverlays(s);

    const sig = briefSig(s);
    // Partial update when we're in the same session and the brief content is
    // unchanged — only chrome/overlay state moved (verdict drawer, conversation
    // collapse, theme, modals) or the conversation streamed a new card.
    const canPartial = s.view === 'session' && mountedView === 'session'
      && mountedSession === s.activeTabId && sig === lastBriefSig
      && host.querySelector('.pane.brief');

    // preserve composer focus + caret across re-render
    const active = document.activeElement;
    const wasComposer = active && active.id === 'composer-input';
    const caret = wasComposer ? active.selectionStart : null;

    // Was the conversation pinned to the bottom BEFORE this update? Measure now,
    // before any DOM mutation. If so, we re-pin after so streaming text follows
    // smoothly; if the user scrolled up to read, we leave them where they are.
    let stickBottom = false;
    if (s.view === 'session') {
      const sc = host.querySelector('.conv-scroll');
      stickBottom = !sc || (sc.scrollHeight - sc.scrollTop - sc.clientHeight) < 80;
    }

    // Board overlay-only update: same board, only an overlay/modal changed → swap
    // just the .overlays layer so the board behind doesn't flash.
    const bsig = boardSig(s);
    const canBoardPartial = s.view === 'board' && mountedView === 'board'
      && bsig === lastBoardSig && host.querySelector('.overlays');

    if (canPartial) {
      sessionPartial(host, s);
    } else if (canBoardPartial) {
      // Same board behind the overlays — only a board overlay/modal changed. Swap
      // just the .overlays layer so the board doesn't flash. (Settings/Guide are
      // app-global now and handled by renderGlobalOverlays above.)
      host.querySelector('.overlays').innerHTML = window.BoardView.overlays(s);
    } else {
      host.innerHTML = s.view === 'session' ? window.SessionView.render(s) : window.BoardView.render(s);
    }
    mountedView = s.view; mountedSession = s.activeTabId; lastBriefSig = sig; lastBoardSig = bsig; lastConvSig = convSig(s);

    if (wasComposer) {
      const input = document.getElementById('composer-input');
      if (input) { input.focus(); try { input.setSelectionRange(caret, caret); } catch {} autoGrow(input); }
    }

    // Re-pin to the latest as discovery streams in — only if we were already at the
    // bottom (measured pre-mutation). This makes text stream smoothly instead of the
    // view jumping, and never yanks the user down while they're reading earlier messages.
    if (s.view === 'session' && stickBottom) {
      const scroll = host.querySelector('.conv-scroll');
      if (scroll) scroll.scrollTop = scroll.scrollHeight;
    }
  }
  Store.subscribe(render);
  DS.onDiscovery(handleDiscovery); // live discovery stream → conversation + conviction
  DS.onDesignSync((payload) => { // design-token sync stream → progress log + refreshed swatches
    if (!payload) return;
    const s = Store.get();
    if (payload.phase === 'event' && payload.text) {
      Store.set({ designSyncLog: (s.designSyncLog || []).concat(payload.text).slice(-200) });
    } else if (payload.phase === 'done') {
      const log = (s.designSyncLog || []).concat(
        payload.ok ? 'Done — tokens updated.' : ('Failed: ' + (payload.error || 'unknown'))).slice(-200);
      Store.set({ designSyncing: false, designSyncLog: log, design: payload.design || s.design });
    }
  });
  DS.onAuthChanged(() => { // subscription sign-in completed in the terminal
    Store.set({ signingIn: false });
    if (Store.get().settingsOpen || Store.get().onboarding) refreshSettings();
  });

  // ── navigation ──
  // Open a card in a tab. If a tab for it is already open, just bring it forward;
  // otherwise load it, create a tab, and activate it. Each tab carries its own
  // session state and runs its own discovery.
  async function openIdea(id) {
    if (getTab(Store.get(), id)) { activateTab(id); return; }
    Store.set({ loading: true });
    const [idea, contextFiles, commands, cx, cfg] = await Promise.all([
      DS.getIdea(id), DS.listContext(id), DS.listCommands(), DS.getConnectors(), DS.getSettings(),
    ]);
    const tab = {
      id, idea, activeTab: 'summary', draft: '',
      discovery: { running: false, runId: null, activity: null, cost: null },
      activeDim: null, expanded: null, verdictOpen: false, selectedVariation: null,
      model: (cfg && cfg.discovery && cfg.discovery.model) || '', resolvedModel: '', tokens: 0,
      modelMenuOpen: false, plusOpen: false, contextFiles: contextFiles || [],
    };
    const s = Store.get();
    Store.set({ tabs: (s.tabs || []).concat([tab]), loading: false, confirmDelete: false, noteOpen: false,
      commands: commands || [], connectedSources: (cx && cx.sources) || [] });
    activateTab(id);
  }
  async function refreshContext() {
    const id = Store.get().sessionId;
    if (id) Store.set({ contextFiles: (await DS.listContext(id)) || [] });
  }
  function openBoard() {
    Store.set({ cardMenu: null, renameFor: null, confirmDelete: null });
    activateTab(null);
  }

  // Let the user point LEAPs at their pipeline folder; reload the board after.
  async function pickFolder() {
    const dir = await DS.pickPipelineDir();
    if (!dir) return;
    Store.set({ pipelineDir: dir, loading: true });
    const board = await DS.getBoard();
    Store.set({ board, loading: false });
    if (Store.get().settingsOpen) refreshSettings();
  }
  async function createDefaultFolder() {
    const dir = await DS.createDefaultFolder();
    if (!dir) return;
    Store.set({ pipelineDir: dir, loading: true });
    const board = await DS.getBoard();
    Store.set({ board, loading: false });
    if (Store.get().settingsOpen) refreshSettings();
  }

  // ── settings ──
  const cloneRoles = (cx) => (((cx && cx.roles) || [])).map((r) =>
    Object.assign({}, r, { fallbacks: (r.fallbacks || []).map((f) => Object.assign({}, f)) }));

  async function openSettings() {
    Store.set({ settingsOpen: true, settingsTab: 'account', settings: null, connectors: 'loading',
      design: null, designSyncing: false, designSyncLog: [], figmaDraft: null, figmaSaved: false });
    const [st, cx, sg, ctx, dz] = await Promise.all([
      DS.getStatus(), DS.getConnectors(), DS.getSettings(), DS.getContext(), DS.getDesign()]);
    Store.set({ settings: st, connectors: cx || { sources: [], roles: [], presets: [], count: 0 },
      connectorsDraft: cloneRoles(cx), connectorsSaved: false,
      thresholds: (sg && sg.verdict) || Store.get().thresholds,
      context: ctx, contextDraft: Object.assign({}, ctx || {}), contextSaved: false, updateState: null,
      contextDocs: await DS.listContextDocs(), editingDoc: null, design: dz });
  }
  // Swap the settings tab in place — update the body + active states only, so the
  // modal node persists (no re-mount, no entry-animation flicker).
  function switchSettingsTab(tab) {
    Store.get().settingsTab = tab; // mutate quietly — no full re-render
    const body = document.querySelector('.set-modal .set-main-body');
    if (!body) { Store.set({ settingsTab: tab }); return; }
    body.innerHTML = window.BoardView.settingsBody(Store.get());
    const head = document.querySelector('.set-modal .set-main-head .t');
    if (head) head.textContent = window.BoardView.settingsTabLabel(tab);
    document.querySelectorAll('.set-modal .set-tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === tab));
    // Lazy-load design state the first time the tab is opened, then re-render it.
    if (tab === 'design' && Store.get().design == null) {
      DS.getDesign().then((d) => { Store.get().design = d; if (Store.get().settingsTab === 'design') switchSettingsTab('design'); });
    }
  }
  function switchGuideSection(sec) {
    Store.get().guideSection = sec;
    const body = document.querySelector('.guide-modal .set-main-body');
    if (!body) { Store.set({ guideSection: sec }); return; }
    body.innerHTML = window.GuideView.body(sec);
    const head = document.querySelector('.guide-modal .set-main-head .t');
    if (head) head.textContent = sec;
    document.querySelectorAll('.guide-modal .set-tab').forEach((t) => t.classList.toggle('on', t.dataset.section === sec));
  }

  async function refreshSettings() {
    const st = await DS.getStatus();
    Store.set({ settings: st });
  }
  async function refreshConnectors() {
    Store.set({ connectors: 'loading' });
    const cx = await DS.getConnectors();
    Store.set({ connectors: cx || { sources: [], roles: [], presets: [], count: 0 }, connectorsDraft: cloneRoles(cx) });
  }
  async function signIn() {
    Store.set({ signingIn: true });
    const r = await DS.signIn();
    if (!r || !r.ok) Store.set({ signingIn: false });
  }

  // Right-click a board card → context menu (Open / Rename / Delete).
  root.addEventListener('contextmenu', (e) => {
    const card = e.target.closest('.idea-card[data-id]');
    if (!card) return;
    e.preventDefault();
    const s = Store.get();
    const id = card.dataset.id;
    const idea = ((s.board && s.board.ideas) || []).find(i => i.id === id);
    const x = Math.min(e.clientX, window.innerWidth - 180);
    const y = Math.min(e.clientY, window.innerHeight - 140);
    Store.set({ cardMenu: { id, name: idea ? idea.name : id, x, y } });
  });

  // ── event delegation ──
  root.addEventListener('click', async (e) => {
    // external links (Looker/BQ/docs) — open in the system browser, never navigate the app
    const link = e.target.closest('a[href^="http"]');
    if (link) { e.preventDefault(); DS.openExternal(link.getAttribute('href')); return; }

    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action;
    const s = Store.get();

    switch (a) {
      case 'toggle-theme': Store.set({ theme: s.theme === 'dark' ? 'light' : 'dark' }); break;
      case 'set-theme': {
        const t = el.dataset.theme === 'dark' ? 'dark' : 'light';
        try { localStorage.setItem('leap-theme', t); } catch {}
        Store.set({ theme: t });
        break;
      }
      case 'pick-folder': pickFolder(); break;
      case 'create-default-folder': createDefaultFolder(); break;
      case 'open-settings': openSettings(); break;
      case 'close-settings': Store.set({ settingsOpen: false }); break;
      case 'settings-tab': switchSettingsTab(el.dataset.tab); break;
      case 'save-figma-url': {
        const input = document.querySelector('.set-modal [data-figma-url]');
        const url = input ? input.value.trim() : (s.figmaDraft || '');
        const d = await DS.saveFigmaUrl(url);
        Store.set({ design: d, figmaDraft: url, figmaSaved: true });
        break;
      }
      case 'reset-design': {
        const d = await DS.resetDesign();
        Store.set({ design: d, figmaDraft: '', figmaSaved: false, designSyncLog: [] });
        break;
      }
      case 'sync-design': {
        // Persist whatever is in the field first so the headless run has the URL.
        const input = document.querySelector('.set-modal [data-figma-url]');
        if (input && input.value.trim()) { await DS.saveFigmaUrl(input.value.trim()); }
        const res = await DS.syncDesign();
        if (!res || res.ok === false) {
          Store.set({ designSyncLog: [(res && res.error) || 'Could not start sync.'] });
        } else {
          Store.set({ designSyncing: true, designSyncLog: ['Starting sync…'] });
        }
        break;
      }
      case 'onboarding-next': {
        // Leaving the Design step (index 2) with a URL typed → persist it.
        if ((s.onboardingStep || 0) === 2) {
          const input = document.querySelector('.onboard [data-figma-url]');
          if (input && input.value.trim()) { await DS.saveFigmaUrl(input.value.trim()); }
        }
        Store.set({ onboardingStep: Math.min(4, (s.onboardingStep || 0) + 1) });
        break;
      }
      case 'onboarding-back': Store.set({ onboardingStep: Math.max(0, (s.onboardingStep || 0) - 1) }); break;
      case 'onboarding-skip': case 'onboarding-finish': closeWizard(); break;
      case 'guide': Store.set({ guideOpen: true, guideSection: 'Overview' }); break;
      case 'guide-section': switchGuideSection(el.dataset.section); break;
      case 'close-guide': Store.set({ guideOpen: false }); break;
      case 'new-idea': openNewIdea(); break;
      case 'close-new-idea': Store.set({ newIdeaOpen: false }); break;
      case 'create-idea': createIdeaFromInput(); break;
      case 'save-context': saveContextDraft(); break;
      case 'context-new': Store.set({ editingDoc: { title: '', summary: '', body: '', active: true } }); break;
      case 'context-edit': openContextDoc(el.dataset.id); break;
      case 'context-cancel': Store.set({ editingDoc: null }); break;
      case 'context-save': saveContextDoc(); break;
      case 'context-delete': deleteContextDoc(el.dataset.id); break;
      case 'context-toggle': toggleContextDoc(el.dataset.id); break;
      case 'check-updates': checkUpdates(); break;
      // concept menu: open / rename / delete
      case 'header-menu': {
        const r = el.getBoundingClientRect();
        Store.set({ cardMenu: { id: s.sessionId, name: (s.idea && s.idea.name) || '', x: Math.round(r.right - 160), y: Math.round(r.bottom + 6) } });
        break;
      }
      case 'close-card-menu': Store.set({ cardMenu: null }); break;
      case 'rename-idea': {
        const name = el.dataset.name || (s.cardMenu && s.cardMenu.name) || '';
        Store.set({ renameFor: { id: el.dataset.id, name }, renameTitle: name, cardMenu: null });
        focusEl('rename-input');
        break;
      }
      case 'close-rename': Store.set({ renameFor: null }); break;
      case 'save-rename': await doRename(el.dataset.id); break;
      case 'ask-delete': Store.set({ confirmDelete: { id: el.dataset.id, name: el.dataset.name || (s.cardMenu && s.cardMenu.name) || '' }, cardMenu: null }); break;
      case 'delete-idea': Store.set({ confirmDelete: { id: s.sessionId, name: (s.idea && s.idea.name) || '' } }); break;
      case 'cancel-delete': Store.set({ confirmDelete: null }); break;
      case 'confirm-delete': await doDeleteIdea(el.dataset.id); break;
      case 'add-context-file': Store.set({ plusOpen: false }); await addContextFiles(); break;
      case 'add-context-note': Store.set({ noteOpen: true, noteTitle: '', noteBody: '', plusOpen: false }); break;
      case 'cancel-note': Store.set({ noteOpen: false }); break;
      case 'save-note': await saveNote(); break;
      case 'refresh-connectors': refreshConnectors(); break;
      case 'check-connectors': {
        Store.set({ connectorsChecking: true });
        const res = await DS.checkConnectors();
        Store.set({ connectorsChecking: false, connectorHealth: (res && res.health) || {} });
        break;
      }
      case 'add-fallback': {
        const d = Store.get().connectorsDraft || [];
        const row = d[+el.dataset.idx];
        if (row) { row.fallbacks = (row.fallbacks || []).concat([{ mcp: '', url: '', transport: 'http', hint: '' }]); Store.set({ connectorsDraft: d.slice(), connectorsSaved: false }); }
        break;
      }
      case 'remove-fallback': {
        const d = Store.get().connectorsDraft || [];
        const row = d[+el.dataset.idx];
        if (row && row.fallbacks) { row.fallbacks.splice(+el.dataset.fb, 1); Store.set({ connectorsDraft: d.slice(), connectorsSaved: false }); }
        break;
      }
      case 'apply-preset': {
        const cx = await DS.applyPreset(el.dataset.name);
        Store.set({ connectors: cx, connectorsDraft: cloneRoles(cx), connectorsSaved: false });
        break;
      }
      case 'save-connectors': {
        const cx = await DS.saveConnectors(Store.get().connectorsDraft || []);
        Store.set({ connectors: cx, connectorsDraft: cloneRoles(cx), connectorsSaved: true });
        setTimeout(() => { if (Store.get().connectorsSaved) Store.set({ connectorsSaved: false }); }, 1600);
        break;
      }
      case 'export-connectors': await DS.exportConnectors(Store.get().connectorsDraft || []); break;
      case 'import-connectors': {
        const res = await DS.importConnectors();
        if (res && res.ok && res.connectors) {
          Store.set({ connectors: res.connectors, connectorsDraft: cloneRoles(res.connectors), connectorsSaved: false });
        }
        break;
      }
      case 'sign-in': signIn(); break;
      case 'kill-run': await DS.stopDiscovery(el.dataset.id); refreshSettings(); break;
      case 'filter': Store.set({ boardFilter: el.dataset.filter }); break;
      case 'board-view': Store.set({ boardView: el.dataset.view }); break;
      case 'open-idea': openIdea(el.dataset.id); break;
      case 'open-board': openBoard(); break;
      case 'activate-tab': { e.stopPropagation(); const id = el.dataset.id; if (id) openIdea(id); else activateTab(null); break; }
      case 'close-tab': e.stopPropagation(); closeTab(el.dataset.id); break;
      case 'confirm-close-tab': e.stopPropagation(); closeTab(el.dataset.id); break;
      case 'cancel-close-tab': e.stopPropagation(); Store.set({ confirmCloseTab: null }); break;
      case 'tab': Store.set({ activeTab: el.dataset.tab }); break;
      case 'select-variation': Store.set({ selectedVariation: el.dataset.var }); break;
      case 'copy-prd': {
        const md = s.idea && s.idea.briefData && s.idea.briefData.prd;
        if (md && navigator.clipboard) {
          navigator.clipboard.writeText(md).then(() => {
            const orig = el.innerHTML;
            el.textContent = 'Copied';
            setTimeout(() => { el.innerHTML = orig; }, 1400);
          }).catch(() => {});
        }
        break;
      }
      case 'toggle-conv': Store.set({ convCollapsed: !s.convCollapsed }); break;
      case 'toggle-tasks': Store.set({ tasksCollapsed: !s.tasksCollapsed }); break;
      case 'toggle-verdict': Store.set({ verdictOpen: !s.verdictOpen }); break;
      case 'close-verdict': Store.set({ verdictOpen: false }); break;
      case 'steer': Store.set({ activeDim: el.dataset.dim, draft: '' }); break;
      case 'clear-steer': Store.set({ activeDim: null }); break;
      case 'chip': Store.set({ draft: el.dataset.chip }); focusComposer(); break;
      case 'expand': Store.set({ expanded: el.dataset.exp }); break;
      case 'open-external': DS.openArtifact(s.sessionId, el.dataset.art); break;
      case 'close-modal':
        if (a === 'close-modal' && e.target.closest('[data-stop]') && !e.target.closest('[data-action="close-modal"]')) break;
        Store.set({ expanded: null }); break;
      case 'set-verdict': {
        const v = el.dataset.verdict;
        const idea = Object.assign({}, s.idea, { verdict: v });
        Store.set({ idea });
        await DS.setVerdict(s.sessionId, v);
        // reflect on the board copy too
        if (s.board) {
          const bi = s.board.ideas.find(i => i.id === s.sessionId);
          if (bi) bi.verdict = v;
        }
        break;
      }
      case 'stop-discovery':
        DS.stopDiscovery(s.sessionId);
        Store.set({ discovery: { running: false, runId: null, activity: null, cost: null } });
        break;
      case 'send': sendDraft(); break;
      case 'plus-sheet': Store.set({ plusOpen: !s.plusOpen, modelMenuOpen: false }); break;
      case 'open-connectors':
        Store.set({ plusOpen: false });
        await openSettings();
        switchSettingsTab('connectors');
        break;
      case 'model-menu': Store.set({ modelMenuOpen: !s.modelMenuOpen, plusOpen: false }); break;
      case 'set-model': {
        const m = el.dataset.model || '';
        Store.set({ model: m, modelMenuOpen: false });
        DS.saveSettings({ discovery: { model: m } });
        break;
      }
      case 'insert-source':
        insertIntoComposer('@' + (el.dataset.src || '') + ' ');
        Store.set({ plusOpen: false });
        focusComposer();
        break;
      case 'slash-open': {
        const ta = document.getElementById('composer-input');
        const cur = (ta ? ta.value : Store.get().draft) || '';
        if (!cur.trim().startsWith('/')) setComposerValue('/' + cur.replace(/^\s+/, ''));
        Store.set({ plusOpen: false });
        focusComposer();
        requestAnimationFrame(updateSlashMenu);
        break;
      }
      case 'slash-pick':
        setComposerValue((el.dataset.cmd || '') + ' ');
        hideSlashMenu();
        focusComposer();
        break;
      case 'toggle-work': {
        const mi = +el.dataset.mi;
        if (s.idea && s.idea.messages && s.idea.messages[mi]) {
          s.idea.messages[mi].expanded = !s.idea.messages[mi].expanded;
          Store.set({ idea: s.idea });
        }
        break;
      }
    }
  });

  // Clicks on inert content inside a modal/drawer shouldn't bubble to the overlay
  // and close it — but actionable elements inside it must still run their action.
  root.addEventListener('click', (e) => {
    const stop = e.target.closest('[data-stop]');
    if (!stop) return;
    const action = e.target.closest('[data-action]');
    if (!action || !stop.contains(action)) e.stopPropagation(); // only block inert/overlay clicks
  }, true);

  // splitter drag — resize the conversation pane live, commit width on release
  root.addEventListener('mousedown', (e) => {
    const sp = e.target.closest('[data-action="splitter"]');
    if (!sp) return;
    e.preventDefault();
    const body = root.querySelector('.session-body');
    const pane = root.querySelector('.pane.conversation');
    if (!body || !pane) return;
    sp.classList.add('dragging'); body.classList.add('resizing');
    const startX = e.clientX;
    const startW = pane.getBoundingClientRect().width;
    const max = Math.min(820, body.getBoundingClientRect().width - 360);
    const move = (ev) => {
      const w = Math.max(300, Math.min(max, startW + (ev.clientX - startX)));
      pane.style.width = w + 'px';
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      sp.classList.remove('dragging'); body.classList.remove('resizing');
      Store.get().convWidth = Math.round(pane.getBoundingClientRect().width); // persist without a re-render flash
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });

  root.addEventListener('input', (e) => {
    if (e.target.id === 'composer-input') { // no re-render on keystroke — grow + slash menu in place
      Store.get().draft = e.target.value;
      autoGrow(e.target);
      updateSlashMenu();
      return;
    }
    if (e.target.id === 'new-idea-input') { Store.get().newIdeaTitle = e.target.value; return; }
    if (e.target.id === 'note-title') { Store.get().noteTitle = e.target.value; return; }
    if (e.target.id === 'note-body') { Store.get().noteBody = e.target.value; return; }
    if (e.target.id === 'rename-input') { Store.get().renameTitle = e.target.value; return; }
    // Context fields (Settings + onboarding): mutate the draft in place, no re-render.
    if (e.target.dataset && e.target.dataset.ctxField) {
      const d = Store.get().contextDraft || {};
      d[e.target.dataset.ctxField] = e.target.value;
      Store.get().contextDraft = d;
      return;
    }
    // Context doc editor fields: mutate the editing draft in place, no re-render.
    if (e.target.dataset && e.target.dataset.docField) {
      const d = Store.get().editingDoc || {};
      d[e.target.dataset.docField] = e.target.value;
      Store.get().editingDoc = d;
      return;
    }
    // Threshold slider: live in-place update (mutate store, paint DOM — no re-render).
    if (e.target.dataset && e.target.dataset.action === 'set-threshold') {
      const t = readThresholdsFromDOM();
      Store.get().thresholds = t;
      paintThresholds(t);
      return;
    }
    // Figma URL field (Settings + onboarding): mutate the draft in place, no re-render.
    if (e.target.dataset && e.target.dataset.figmaUrl != null) {
      Store.get().figmaDraft = e.target.value;
      Store.get().figmaSaved = false;
      return;
    }
    // Connector field edits: mutate the draft in place (no re-render → keeps focus).
    if (e.target.dataset && e.target.dataset.connField) setConnField(e.target);
  });
  // Persist the threshold on release (no re-render; reflects when Settings closes).
  root.addEventListener('change', (e) => {
    if (e.target.dataset && e.target.dataset.action === 'set-threshold') commitThresholds();
    if (e.target.dataset && e.target.dataset.connField) setConnField(e.target); // selects fire change, not input
  });

  // Close the model popover / plus sheet when clicking outside them or their trigger.
  root.addEventListener('mousedown', (e) => {
    const s = Store.get();
    if (!s.modelMenuOpen && !s.plusOpen) return;
    if (e.target.closest('.pop') || e.target.closest('.plus-sheet')
      || e.target.closest('[data-action="model-menu"]') || e.target.closest('[data-action="plus-sheet"]')) return;
    Store.set({ modelMenuOpen: false, plusOpen: false });
  });

  // Write a connector field into the draft — primary or a nested fallback.
  function setConnField(el) {
    const d = Store.get().connectorsDraft;
    const row = d && d[+el.dataset.connIdx];
    if (!row) return;
    if (el.dataset.fbIdx != null) {
      const f = (row.fallbacks || [])[+el.dataset.fbIdx];
      if (f) f[el.dataset.connField] = el.value;
    } else {
      row[el.dataset.connField] = el.value;
    }
  }
  root.addEventListener('keydown', (e) => {
    if (e.target.id === 'composer-input') {
      if (handleSlashKey(e)) return;                 // slash menu owns arrows/enter/esc when open
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendDraft(); } // Shift+Enter = newline
      return;
    }
    if (e.target.id === 'new-idea-input' && e.key === 'Enter') { e.preventDefault(); createIdeaFromInput(); }
    if (e.key === 'Escape') {
      const s = Store.get();
      if (s.modelMenuOpen || s.plusOpen) Store.set({ modelMenuOpen: false, plusOpen: false });
      else if (s.newIdeaOpen) Store.set({ newIdeaOpen: false });
      else if (s.noteOpen) Store.set({ noteOpen: false });
      else if (s.confirmDelete) Store.set({ confirmDelete: false });
      else if (s.guideOpen) Store.set({ guideOpen: false });
      else if (s.settingsOpen) Store.set({ settingsOpen: false });
      else if (s.expanded) Store.set({ expanded: null });
      else if (s.verdictOpen) Store.set({ verdictOpen: false });
      else if (s.view === 'session') openBoard();
    }
  });

  function focusComposer() {
    requestAnimationFrame(() => {
      const input = document.getElementById('composer-input');
      if (input) { input.focus(); const v = input.value; input.value = ''; input.value = v; autoGrow(input); }
    });
  }

  // ── composer: auto-grow textarea + slash-command menu ──
  let slashSel = 0;
  function autoGrow(ta) {
    if (!ta || ta.tagName !== 'TEXTAREA') return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(200, ta.scrollHeight) + 'px';
  }
  function setComposerValue(v) {
    Store.get().draft = v;
    const ta = document.getElementById('composer-input');
    if (ta) { ta.value = v; autoGrow(ta); }
  }
  function insertIntoComposer(text) {
    const ta = document.getElementById('composer-input');
    const cur = (ta ? ta.value : Store.get().draft) || '';
    setComposerValue((cur ? cur.replace(/\s*$/, '') + ' ' : '') + text);
  }
  function slashEl() { return document.getElementById('slash-menu'); }
  function hideSlashMenu() { const m = slashEl(); if (m) { m.hidden = true; m.innerHTML = ''; } }
  // Slash menu shows only while the whole draft is a single "/token" (no spaces yet).
  function slashQuery() {
    const ta = document.getElementById('composer-input');
    const m = /^\/(\S*)$/.exec(((ta ? ta.value : '') || '').trim());
    return m ? m[1].toLowerCase() : null;
  }
  function filteredCommands(q) {
    const cmds = Store.get().commands || [];
    if (q == null) return [];
    if (!q) return cmds;
    return cmds.filter(c => c.cmd.slice(1).toLowerCase().startsWith(q)
      || c.skill.toLowerCase().startsWith(q) || c.label.toLowerCase().includes(q));
  }
  function updateSlashMenu() {
    const m = slashEl(); if (!m) return;
    const q = slashQuery();
    const items = filteredCommands(q);
    if (q == null || !items.length) { hideSlashMenu(); return; }
    if (slashSel >= items.length) slashSel = 0;
    m.innerHTML = items.map((c, i) => `
      <button class="slash-item${i === slashSel ? ' sel' : ''}" data-action="slash-pick" data-cmd="${c.cmd}">
        <span class="sc-cmd">${c.cmd}${c.hint ? ` <i>${c.hint}</i>` : ''}</span>
        <span class="sc-desc">${c.desc}</span>
      </button>`).join('');
    m.hidden = false;
  }
  function handleSlashKey(e) {
    const m = slashEl();
    if (!m || m.hidden) return false;
    const items = filteredCommands(slashQuery());
    if (!items.length) return false;
    if (e.key === 'ArrowDown') { e.preventDefault(); slashSel = (slashSel + 1) % items.length; updateSlashMenu(); return true; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); slashSel = (slashSel - 1 + items.length) % items.length; updateSlashMenu(); return true; }
    if (e.key === 'Enter')     { e.preventDefault(); setComposerValue(items[slashSel].cmd + ' '); hideSlashMenu(); return true; }
    if (e.key === 'Escape')    { e.preventDefault(); hideSlashMenu(); return true; }
    return false;
  }
  // Clean a streamed assistant block: drop the structured findings JSON and any
  // inherited "★ Insight" callout blocks / decorative rules so the PM sees prose.
  function stripFindings(t) {
    return String(t || '')
      .replace(/```leap-findings[\s\S]*?```/gi, '')
      .replace(/★\s*Insight[^\n]*\n[\s\S]*?\n[─—=-]{5,}[^\n]*\n?/g, '') // header rule → points → closing rule
      .replace(/^[─—=]{5,}\s*$/gm, '')                                   // stray separator rules
      .replace(/^\s*★[^\n]*$/gm, '')                                     // leftover ★ marker lines
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // Pull a trailing ```leap-ask``` block out of an assistant turn. The block is a
  // short bullet list of the answers/next-steps the skill is proposing — those
  // become the contextual chips, and the block's presence marks this turn as an
  // active question. Returns { body, chips }: body is the prose with the block
  // removed; chips is [] when no block is present.
  function parseAsk(t) {
    const text = String(t || '');
    const m = text.match(/```leap-ask\s*([\s\S]*?)```/i);
    if (!m) return { body: text, chips: [] };
    const chips = m[1].split('\n')
      .map(l => l.replace(/^\s*[-*+]\s+/, '').trim())
      .filter(Boolean)
      .slice(0, 4);
    const body = text.replace(m[0], '').replace(/\n{3,}/g, '\n\n').trim();
    return { body, chips };
  }

  // Total tokens occupying the context window this turn (input + cache + output).
  function tokensUsed(u) {
    if (!u) return 0;
    return (u.input_tokens || 0) + (u.output_tokens || 0)
      + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
  }

  // Collapse the most recent still-running work group (the run moved past tool calls).
  function closeWork(msgs) {
    for (let i = (msgs || []).length - 1; i >= 0; i--) {
      if (msgs[i] && msgs[i].kind === 'work') { msgs[i].running = false; return; }
    }
  }

  // Mirror the reader's chip logic so chips refresh when the gap moves.
  function chipsForGap(gap) {
    const map = { evidence: 'Pull the missing evidence', size: 'Tighten the sizing', problem: 'Validate the problem', feasibility: 'Pressure-test feasibility' };
    const t = gap && gap.dim; const out = [];
    if (map[t]) out.push(map[t]); else if (t) out.push('Close the ' + t + ' gap');
    out.push('Define kill criteria'); out.push('Draft the test');
    return out;
  }

  // Fold the steered dimension into the prompt so "Steer toward X" actually focuses the run.
  function buildPrompt(s, text) {
    const idea = s.idea;
    if (text.trim().startsWith('/')) return text; // slash command — pass through verbatim
    if (s.activeDim) {
      const d = (idea.dimensions || []).find(x => x.key === s.activeDim);
      if (d) return `Focus your investigation on the "${d.label}" dimension — ${d.note || ''}\n\n${text}`;
    }
    return text;
  }

  // Route a streamed discovery payload into the right tab's conversation +
  // conviction — even when that tab is in the background. For the active tab the
  // top-level session keys are authoritative (so the view updates); for a
  // background tab we mutate its entry and nudge a render so the tab bar's running
  // dot reflects it. The accumulated messages are preserved either way.
  function handleDiscovery(payload) {
    const s = Store.get();
    if (!payload) return;
    const active = payload.id === s.activeTabId;
    const tab = active ? null : getTab(s, payload.id);
    if (active) { if (!s.idea || s.idea.id !== payload.id) return; }
    else if (!tab) return; // event for a closed/unknown tab — drop it

    const idea = active ? s.idea : tab.idea;
    const disc = active ? s.discovery : tab.discovery;
    // Commit a patch of session-key updates: top-level for the active tab (drives
    // the live view), or onto the tab entry for a background one. idea is mutated
    // in place, so it need not be in the patch.
    const commit = (patch) => {
      patch = patch || {};
      if (active) Store.set(Object.assign({ idea }, patch));
      else { for (const k in patch) tab[k] = patch[k]; Store.set({}); }
    };

    if (payload.phase === 'event') {
      const c = payload.card; if (!c) return;
      if (c.type === 'activity') {
        idea.messages = idea.messages || [];
        if (c.kind === 'init') {
          // Quiet one-line status, not a chatty "33 tools" message. Remember the
          // model the CLI actually resolved to, so the topbar can name it.
          closeWork(idea.messages);
          idea.messages = idea.messages.concat([{ role: 'ai', kind: 'status', model: c.model || (active ? s.model : tab.model) || '', mcp: c.mcp || [], tools: c.tools || 0 }]);
          commit(Object.assign({ discovery: Object.assign({}, disc, { activity: c.text }) }, c.model ? { resolvedModel: c.model } : {}));
        } else {
          // Fold consecutive tool calls into one live "work" group.
          const lastm = idea.messages[idea.messages.length - 1];
          if (lastm && lastm.kind === 'work' && lastm.running) {
            lastm.steps = (lastm.steps || []).concat([{ text: c.text, tool: c.tool, kind: c.kind }]);
          } else {
            idea.messages = idea.messages.concat([{ role: 'ai', kind: 'work', running: true, expanded: false, steps: [{ text: c.text, tool: c.tool, kind: c.kind }] }]);
          }
          commit({ discovery: Object.assign({}, disc, { activity: c.text }) });
        }
      } else if (c.type === 'text') {
        const { body, chips } = parseAsk(stripFindings(c.text));
        closeWork(idea.messages || []);
        if (body) {
          // A turn is an "ask" when it ships a leap-ask block, or (fallback) when
          // its prose ends in a question. Highlight that message and, when chips
          // were proposed, make them the contextual suggestions.
          const ask = chips.length > 0 || /\?\s*$/.test(body);
          idea.messages = (idea.messages || []).concat([{ role: 'ai', kind: 'live-text', text: body, ask }]);
          if (chips.length) { idea.chips = chips; idea._askThisTurn = true; }
        }
        commit();
      } else if (c.type === 'todos') {
        // Live phase checklist (from the skill's TodoWrite). Ambient state, not a
        // chat message — it updates in place and persists between turns.
        idea.todos = Array.isArray(c.todos) ? c.todos : [];
        commit();
      } else if (c.type === 'usage') {
        commit({ tokens: tokensUsed(c.usage) });
      } else if (c.type === 'result') {
        commit(Object.assign({ discovery: Object.assign({}, disc, { cost: c.cost }) }, c.usage ? { tokens: tokensUsed(c.usage) } : {}));
      } else if (c.type === 'error') {
        idea.messages = (idea.messages || []).concat([{ role: 'ai', kind: 'error', text: c.text }]); commit();
      }
      return;
    }

    if (payload.phase === 'done') {
      closeWork(idea.messages || []);
      if (payload.conviction) {
        Object.assign(idea, {
          conviction: payload.conviction.conviction,
          verdict: payload.conviction.verdict,
          evidence: payload.conviction.evidence,
          dimensions: payload.conviction.dimensions,
          gap: payload.conviction.gap,
          verdictLine: payload.conviction.verdictLine,
          // Prefer the chips the skill proposed this turn (leap-ask); only fall
          // back to gap-derived chips when the turn offered none.
          chips: idea._askThisTurn ? idea.chips : chipsForGap(payload.conviction.gap),
        });
        idea._askThisTurn = false;
        if (s.board) {
          const bi = s.board.ideas.find(i => i.id === idea.id);
          if (bi) { bi.verdict = idea.verdict; bi.conviction = idea.conviction; bi.evidence = idea.evidence; }
        }
      }
      const f = payload.findings || {};
      const count = Array.isArray(f.claims) ? f.claims.length : 0;
      idea.messages = (idea.messages || []).concat([{
        role: 'ai', kind: 'result',
        cost: (disc && disc.cost) || null,
        summary: f.summary || '', count,
        error: payload.error || null,
      }]);
      commit({ discovery: { running: false, runId: null, activity: null, cost: null } });
    }
  }

  // Start a discovery run on the current idea. `userText` shows as the user's
  // message (or null for an auto-kickoff); `prompt` is what the agent receives.
  async function runDiscovery(userText, prompt) {
    const s = Store.get();
    const idea = s.idea;
    if (!idea || (s.discovery && s.discovery.running)) return;
    if (userText) idea.messages = (idea.messages || []).concat([{ role: 'user', text: userText }]);

    if (DS.hasBridge && DS.hasBridge()) {
      Store.set({ idea, draft: '', activeDim: null, tokens: 0,
        discovery: { running: true, runId: idea.id, activity: 'Starting discovery…', cost: null } });
      const r = await DS.startDiscovery(idea.id, prompt, { model: s.model || '' });
      if (!r || !r.ok) {
        idea.messages = idea.messages.concat([{ role: 'ai', kind: 'error', text: (r && r.error) || 'Could not start discovery.' }]);
        Store.set({ idea, discovery: { running: false, runId: null, activity: null, cost: null } });
      }
    } else {
      idea.messages = idea.messages.concat([{ role: 'ai', kind: 'error', text: 'Live discovery runs in the LEAPs desktop app.' }]);
      Store.set({ idea, draft: '', activeDim: null });
    }
  }

  async function sendDraft() {
    const input = document.getElementById('composer-input');
    const text = (input ? input.value : Store.get().draft).trim();
    if (!text) return;
    hideSlashMenu();
    await runDiscovery(text, buildPrompt(Store.get(), text));
  }

  // The opening prompt for a freshly-created concept — kicks off /learn-style discovery.
  function kickoffPrompt(title) {
    return `New concept: "${title}".\n\n`
      + `Don't run a full investigation yet. In ONE short turn: give a one-sentence read `
      + `of what this idea seems to be about, then ask me the single most important framing `
      + `question to sharpen it (who it's for, what triggers it, or what outcome it should `
      + `drive). Then stop and wait for my answer — we'll grind it from there.`;
  }

  // ── delete / rename / context ──
  function focusEl(id) { requestAnimationFrame(() => { const e = document.getElementById(id); if (e) { e.focus(); e.select && e.select(); } }); }

  async function doDeleteIdea(id) {
    id = id || (Store.get().confirmDelete && Store.get().confirmDelete.id) || Store.get().sessionId;
    const wasOpen = Store.get().sessionId === id;
    const r = await DS.deleteIdea(id);
    Store.set({ confirmDelete: null });
    if (r && r.ok) {
      const board = await DS.getBoard();
      Store.set({ board });
      if (wasOpen) openBoard();
    }
  }
  async function doRename(id) {
    const t = ((document.getElementById('rename-input') || {}).value || Store.get().renameTitle || '').trim();
    if (!t) { focusEl('rename-input'); return; }
    const r = await DS.renameIdea(id, t);
    Store.set({ renameFor: null, renameTitle: '' });
    if (r && r.ok) {
      const board = await DS.getBoard();
      Store.set({ board });
      if (Store.get().sessionId === id) { const idea = Store.get().idea; if (idea) { idea.name = t; Store.set({ idea }); } }
    }
  }
  async function addContextFiles() {
    const id = Store.get().sessionId;
    const r = await DS.addContextFiles(id);
    if (r && r.ok) refreshContext();
  }
  async function saveNote() {
    const t = (document.getElementById('note-title') || {}).value || Store.get().noteTitle;
    const b = (document.getElementById('note-body') || {}).value || Store.get().noteBody;
    if (!String(b || '').trim() && !String(t || '').trim()) { Store.set({ noteOpen: false }); return; }
    await DS.addContextNote(Store.get().sessionId, t, b);
    Store.set({ noteOpen: false, noteTitle: '', noteBody: '' });
    refreshContext();
  }

  // ── onboarding ──
  async function closeWizard() {
    const d = Store.get().contextDraft;
    if (d) await DS.saveContext(d);          // persist any context edits
    await DS.completeOnboarding();
    Store.set({ onboarding: false, onboardingStep: 0 });
  }

  // ── create concept ──
  function focusNewIdea() {
    requestAnimationFrame(() => { const i = document.getElementById('new-idea-input'); if (i) i.focus(); });
  }
  function openNewIdea() { Store.set({ newIdeaOpen: true, newIdeaTitle: '', newIdeaError: null }); focusNewIdea(); }
  async function createIdeaFromInput() {
    const input = document.getElementById('new-idea-input');
    const title = (input ? input.value : Store.get().newIdeaTitle || '').trim();
    if (!title) { focusNewIdea(); return; }
    const r = await DS.createIdea(title);
    if (r && r.ok) {
      Store.set({ newIdeaOpen: false, newIdeaTitle: '' });
      const board = await DS.getBoard();
      Store.set({ board });
      await openIdea(r.id);
      // Auto-start discovery so a new concept begins grinding immediately.
      await runDiscovery(null, kickoffPrompt(title));
    } else {
      Store.set({ newIdeaError: (r && r.error) || 'Could not create concept.' });
    }
  }

  // ── context wiki handlers ──
  async function openContextDoc(id) {
    const doc = await DS.getContextDoc(id);
    Store.set({ editingDoc: doc || { title: '', summary: '', body: '', active: true } });
  }
  async function saveContextDoc() {
    const ed = Store.get().editingDoc; if (!ed || !ed.title) return;
    await DS.saveContextDoc(ed);
    Store.set({ contextDocs: await DS.listContextDocs(), editingDoc: null });
  }
  async function deleteContextDoc(id) {
    await DS.deleteContextDoc(id);
    Store.set({ contextDocs: await DS.listContextDocs() });
  }
  async function toggleContextDoc(id) {
    await DS.toggleContextDoc(id);
    Store.set({ contextDocs: await DS.listContextDocs() });
  }

  // ── context + updates ──
  async function saveContextDraft() {
    const saved = await DS.saveContext(Store.get().contextDraft || {});
    Store.set({ context: saved, contextDraft: Object.assign({}, saved), contextSaved: true });
    setTimeout(() => { if (Store.get().contextSaved) Store.set({ contextSaved: false }); }, 1600);
  }
  async function checkUpdates() {
    Store.set({ updateChecking: true });
    const r = await DS.checkForUpdates();
    Store.set({ updateChecking: false, updateState: r });
  }
  // Threshold sliders update in place (no full re-render → no flicker). Read the
  // live slider values, paint the bands/labels, persist on release, and refresh
  // the board into the store — it shows when Settings closes.
  function readThresholdsFromDOM() {
    const t = Object.assign({ killBelow: 50, pursueFrom: 70, pursueMinEvidence: 3 }, Store.get().thresholds || {});
    document.querySelectorAll('[data-action="set-threshold"]').forEach((inp) => {
      const v = parseInt(inp.value, 10);
      if (!isNaN(v)) t[inp.dataset.key] = v;
    });
    return t;
  }
  function paintThresholds(t) {
    const r = document.getElementById('leap-root');
    const v = r.querySelectorAll('.onb-v');
    const n = v.length;
    if (n >= 3) {
      v[n - 3].textContent = 'Kill < ' + t.killBelow;
      v[n - 2].textContent = 'Needs ' + t.killBelow + '–' + (t.pursueFrom - 1);
      v[n - 1].textContent = 'Pursue ≥ ' + t.pursueFrom;
    }
    const b = r.querySelectorAll('.onb-slider-l b');
    if (b.length >= 2) { b[b.length - 2].textContent = t.killBelow; b[b.length - 1].textContent = t.pursueFrom; }
  }
  async function commitThresholds() {
    const t = readThresholdsFromDOM();
    if (t.killBelow >= t.pursueFrom) t.killBelow = t.pursueFrom - 1; // keep bands ordered
    Store.get().thresholds = t;                         // mutate, no re-render
    await DS.saveSettings({ verdict: t });
    if (Store.get().settingsOpen) Store.get().board = await DS.getBoard(); // reflects on close
  }

  // ── boot ──
  async function boot() {
    Store.set({ view: 'board', loading: true });
    const [board, pipelineDir, status, modelOptions] = await Promise.all([
      DS.getBoard(), DS.getPipelineDir(), DS.getStatus(), DS.getModelOptions()]);
    Store.set({ board, pipelineDir, loading: false, modelOptions: modelOptions || [] });
    // First run? (only in the desktop app, where we can persist completion.)
    if (status && status.onboardingDone !== true) {
      const [settings, cx, ctx] = await Promise.all([DS.getSettings(), DS.getConnectors(), DS.getContext()]);
      Store.set({ onboarding: true, onboardingStep: 0, settings: status,
        connectors: cx || { sources: [], roles: [], presets: [], count: 0 },
        thresholds: (settings && settings.verdict) || null,
        context: ctx, contextDraft: Object.assign({}, ctx || {}) });
      return;
    }
    await restoreTabs(board);
  }

  // Reopen the tabs that were open last session (with their on-disk conversation
  // history). Sessions resume lazily on the next message via the per-idea sidecar;
  // nothing is auto-run here.
  async function restoreTabs(board) {
    let saved;
    try { saved = JSON.parse(localStorage.getItem('leap-open-tabs') || 'null'); } catch { saved = null; }
    if (!saved || !Array.isArray(saved.ids) || !saved.ids.length) return;
    const present = new Set([].concat((board && board.ideas) || [], (board && board.killed) || []).map(i => i.id));
    for (const id of saved.ids) {
      if (present.has(id) && !getTab(Store.get(), id)) await openIdea(id);
    }
    if (saved.activeId && getTab(Store.get(), saved.activeId)) activateTab(saved.activeId);
    else activateTab(null);
  }
  boot();
})();
