// Tiny observable store. setState(patch) merges and notifies subscribers.
window.Store = (() => {
  const state = {
    // shell
    view: 'board',          // 'board' | 'session'
    // Theme persists across launches (renderer-local UI pref).
    theme: (() => { try { return localStorage.getItem('leap-theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; } })(),
    accent: 'indigo',       // 'indigo' | 'teal' | 'violet'
    loading: false,

    // board
    boardView: 'kanban',    // 'kanban' | 'grid' — landing-page layout (kanban is default)
    boardFilter: 'all',     // all | pursue | needs | killed
    board: null,            // { ideas, killed }
    pipelineDir: null,      // current pipeline folder (for display + picker)

    // settings panel (opened from the board)
    settingsOpen: false,
    settingsTab: 'account', // account | context | connectors | conviction
    settings: null,         // { appVersion, claudeVersion, loginMethod, account, pipelineDir, runs }
    connectors: null,       // null = not loaded, 'loading', or { sources, roles, presets, count }
    connectorsDraft: null,  // editable copy of roles for the in-panel connectors editor
    connectorsSaved: false, // brief "Saved ✓" state after writing connectors.yaml
    signingIn: false,       // sign-in flow launched, waiting on the browser OAuth

    // first-run onboarding (setup) + the standalone Guide reference
    onboarding: false,      // true = show the welcome/setup wizard
    onboardingStep: 0,      // 0..3
    guideOpen: false,       // the in-depth PM guide (topbar Guide button)
    guideSection: 'Overview',
    thresholds: null,       // verdict thresholds { killBelow, pursueFrom, pursueMinEvidence }

    // company/role context (Settings + onboarding)
    context: null,          // loaded { company, markets, role, scope, goals }
    contextDraft: null,     // editable copy
    contextSaved: false,    // brief "Saved ✓" after writing business-context.md

    // create a concept
    newIdeaOpen: false,     // new-concept modal
    newIdeaTitle: '',       // draft title
    newIdeaError: null,     // create error (e.g. no folder)
    confirmDelete: false,    // delete-concept confirm modal (id to delete, or false)
    cardMenu: null,          // right-click menu on a board card: { id, name, x, y }
    renameFor: null,         // rename modal: { id, name } or null
    renameTitle: '',
    contextFiles: [],        // names of files in the open concept's context/ folder
    noteOpen: false,         // add-context-note modal
    noteTitle: '', noteBody: '',

    // in-app update check
    updateState: null,      // result of a Check-for-updates
    updateChecking: false,  // in flight

    // open session tabs. Each card opens in its own tab running its own session.
    // The top-level session keys below (sessionId, idea, draft, discovery, …) are
    // a PROJECTION of the active tab — object-valued keys (idea, discovery) share
    // references with the active tab entry; scalars are snapshotted on tab switch.
    tabs: [],               // [{ id, idea, draft, discovery, activeTab, model, … }]
    activeTabId: null,      // id of the foreground tab; null = Home/board
    confirmCloseTab: null,  // tab id pending a "Stop & close?" confirm (running guard)

    // session (active-tab projection)
    sessionId: null,
    idea: null,             // full idea view-model
    activeTab: 'summary',   // summary | opportunities | ... | decisions
    verdictOpen: false,     // verdict drawer (opened from the topbar pill)
    activeDim: null,        // steers conversation; null = not steering
    draft: '',
    expanded: null,         // artifact id open in modal, or null

    // live discovery (drives the local claude CLI)
    discovery: {
      running: false,       // a run is in flight
      runId: null,          // idea id of the active run
      activity: null,       // current activity line ("Reading metrics.md…")
      cost: null,           // last run cost (usd)
    },

    // session pane layout (Finder/VS Code style)
    convWidth: 460,         // px width of the conversation (left) pane
    convCollapsed: false,   // when true, conversation pane is hidden
    tasksCollapsed: true,   // phase task strip starts collapsed (shows active phase inline)
    selectedVariation: null,// which variation screen is shown in the Prototype showcase
  };

  const subs = new Set();
  const get = () => state;
  const set = (patch) => {
    Object.assign(state, typeof patch === 'function' ? patch(state) : patch);
    subs.forEach(fn => fn(state));
  };
  const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };

  return { get, set, subscribe };
})();
