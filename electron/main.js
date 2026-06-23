const { app, BrowserWindow, ipcMain, dialog, shell, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

const reader = require('./engine/pipeline-reader');
const store = require('./engine/store');
const discovery = require('./engine/discovery');
const connectors = require('./engine/connectors');
const updater = require('./engine/update');
const settings = require('./engine/settings');
const context = require('./engine/context');
const design = require('./engine/design');
const pkg = require('../package.json');

// Check GitHub Releases for a newer version. `silent` suppresses the
// "you're up to date" / error dialogs (used for the quiet startup check).
async function runUpdateCheck(silent) {
  const res = await updater.checkForUpdates(pkg, app.getVersion());
  if (res.available) {
    const choice = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      message: `LEAPs ${res.latest} is available`,
      detail: `You're on ${res.current}. Running from source? Just \`git pull\`. Otherwise download the new build.`,
      buttons: ['Download', 'Later'],
      defaultId: 0, cancelId: 1,
    });
    if (choice.response === 0 && res.url) shell.openExternal(res.url);
  } else if (!silent) {
    dialog.showMessageBox(mainWindow, {
      type: res.error ? 'warning' : 'info',
      message: res.error ? 'Could not check for updates' : `You're up to date (${res.current})`,
      detail: res.error || '',
      buttons: ['OK'],
    });
  }
}

// One canonical product name everywhere — menu bar, dock, About panel, window.
const APP_NAME = 'LEAPs';
app.setName(APP_NAME);

let mainWindow;

// Where concepts live. Resolved relative to the app, never hardcoded.
//   PIPELINE_DIR — your own work (gitignored, may be empty on a fresh clone)
//   EXAMPLES_DIR — shipped sample concept(s), shown on first run
const PIPELINE_DIR = path.join(__dirname, '..', 'pipeline');
const EXAMPLES_DIR = path.join(__dirname, '..', 'examples');

// ── Config persistence (<userData>/config.json) ──

function configPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath(), 'utf8'));
  } catch {
    return {};
  }
}

function writeConfig(cfg) {
  fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2));
}

function getPipelineDir() {
  const configured = readConfig().pipelineDir;
  if (configured && fs.existsSync(configured)) return configured; // honor a valid chosen folder
  if (fs.existsSync(PIPELINE_DIR)) return PIPELINE_DIR;            // your local concepts
  if (fs.existsSync(EXAMPLES_DIR)) return EXAMPLES_DIR;            // fresh clone: show the sample
  return null;                                                    // empty state — pick/create a folder
}

// The reader keys ideas by slug, and the id IS the slug, so the idea's
// directory is just <pipelineDir>/<id>.
function slugForId(id) {
  return id;
}

// Resolve a concept's folder inside the active pipeline dir, with the same
// single-segment guard as deleteIdea. Returns null if invalid/missing.
function ideaDirFor(id) {
  const dir = getPipelineDir();
  if (!dir || !id || /[\/\\]|\.\./.test(String(id))) return null;
  const d = path.join(dir, slugForId(id));
  if (path.dirname(d) !== path.resolve(dir)) return null;
  return fs.existsSync(d) ? d : null;
}

// `claude --version` is stable for the session — probe once, cache the result.
let _claudeVersion;
function claudeVersionCached() {
  if (_claudeVersion !== undefined) return _claudeVersion;
  _claudeVersion = null;
  try {
    const { execFileSync } = require('child_process');
    const out = execFileSync(discovery.resolveClaudeBin(), ['--version'], { timeout: 5000, env: process.env });
    _claudeVersion = String(out).trim() || null;
  } catch { _claudeVersion = null; }
  return _claudeVersion;
}

// ── Window ──

const ICON_ICNS = path.join(__dirname, '..', 'build', 'icon.icns');
const ICON_PNG = path.join(__dirname, '..', 'build', 'icon.png');

function createWindow() {
  mainWindow = new BrowserWindow({
    title: APP_NAME,
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#FAFBFC',
    icon: fs.existsSync(ICON_ICNS) ? ICON_ICNS : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // Keep the OS window title pinned to LEAPs regardless of the page <title>.
  mainWindow.on('page-title-updated', (e) => { e.preventDefault(); mainWindow.setTitle(APP_NAME); });
  mainWindow.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
}

// Application menu — without this, the dev menu bar shows "Electron". Build a
// standard mac menu whose app menu is "LEAPs".
function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: APP_NAME,
      submenu: [
        { role: 'about', label: 'About ' + APP_NAME },
        { label: 'Check for Updates…', click: () => runUpdateCheck(false) },
        { type: 'separator' },
        { role: 'hide', label: 'Hide ' + APP_NAME },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: 'Quit ' + APP_NAME },
      ],
    }] : []),
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── IPC ──

function setupIpc() {
  ipcMain.handle('leaps:listIdeas', () => {
    try {
      const pipelineDir = getPipelineDir();
      if (!pipelineDir) return { ideas: [], killed: [] };
      return reader.listIdeas(pipelineDir);
    } catch (e) {
      console.warn('[leap] listIdeas failed:', e.message);
      return { ideas: [], killed: [] };
    }
  });

  ipcMain.handle('leaps:getIdea', (event, id) => {
    try {
      const pipelineDir = getPipelineDir();
      if (!pipelineDir) return null;
      const idea = reader.getIdea(pipelineDir, id);
      if (idea) {
        const ideaDir = path.join(pipelineDir, slugForId(id));
        const has = (rel) => fs.existsSync(path.join(ideaDir, rel));
        // attach absolute file URLs so the renderer can preview real HTML inline
        if (Array.isArray(idea.artifacts)) {
          idea.artifacts = idea.artifacts.map((a) => {
            if (!a.file) return a;
            const abs = path.isAbsolute(a.file) ? a.file : path.join(ideaDir, a.file);
            const isHtml = /\.html?$/i.test(a.file) && fs.existsSync(abs);
            return { ...a, fileAbs: abs, fileUrl: 'file://' + encodeURI(abs), isHtml };
          });
        }
        // which real doc backs each tab (renderer reads these via leaps:readFile)
        idea.docFiles = {
          journey: has('journey.md') ? 'journey.md' : has('explore.md') ? 'explore.md' : has('sketch.md') ? 'sketch.md' : null,
          sizing: has('metrics.md') ? 'metrics.md' : has('assess.md') ? 'assess.md' : has('define.md') ? 'define.md' : null,
          brief: has('brief.html') ? 'brief.html' : has('opportunity.md') ? 'opportunity.md' : null,
        };
        // full structured brief data — LEAPs renders these sections natively (reskinned)
        try {
          const bdPath = path.join(ideaDir, '.briefdata.json');
          idea.briefData = fs.existsSync(bdPath) ? JSON.parse(fs.readFileSync(bdPath, 'utf8')) : null;
        } catch { idea.briefData = null; }
        // phone-preview source: the RAW chosen variation screen (like brief.html),
        // not the final-showcase wrapper (which has its own phone chrome).
        try {
          const chosen = idea.briefData && Array.isArray(idea.briefData.variations)
            ? idea.briefData.variations.find(v => v && v.chosen) : null;
          const cands = [];
          if (chosen && chosen.id) cands.push(`sketches/variation-${chosen.id}.html`);
          cands.push('sketches/variation-a.html', 'sketches/journey.html', 'sketches/final-showcase.html');
          idea.prototypeUrl = null; idea.prototypeFile = null;
          for (const rel of cands) {
            if (fs.existsSync(path.join(ideaDir, rel))) {
              idea.prototypeUrl = 'file://' + encodeURI(path.join(ideaDir, rel));
              idea.prototypeFile = rel;
              break;
            }
          }
        } catch { idea.prototypeUrl = null; }
        // the variation screens, for the Prototype showcase (raw variation-*.html in a phone)
        try {
          const vars = idea.briefData && Array.isArray(idea.briefData.variations) ? idea.briefData.variations : [];
          idea.variations = vars.map(v => {
            const id = String(v.id || '').toLowerCase();
            const abs = path.join(ideaDir, `sketches/variation-${id}.html`);
            return {
              id: v.id, name: v.name, concept: v.concept, reaction: v.reaction,
              chosen: !!v.chosen, screens: v.screens,
              fileUrl: id && fs.existsSync(abs) ? 'file://' + encodeURI(abs) : null,
            };
          }).filter(v => v.name);
        } catch { idea.variations = []; }
      }
      return idea;
    } catch (e) {
      console.warn('[leap] getIdea failed:', e.message);
      return null;
    }
  });

  ipcMain.handle('leaps:setVerdict', (event, id, verdict, reason) => {
    try {
      const pipelineDir = getPipelineDir();
      if (!pipelineDir) return { ok: false };
      const ideaDir = path.join(pipelineDir, slugForId(id));
      store.writeSidecar(ideaDir, { verdictOverride: verdict, killReason: reason || null });
      return { ok: true };
    } catch (e) {
      console.warn('[leap] setVerdict failed:', e.message);
      return { ok: false };
    }
  });

  ipcMain.handle('leaps:openArtifact', (event, id, artifactId) => {
    try {
      const pipelineDir = getPipelineDir();
      if (!pipelineDir) return { ok: false };
      const idea = reader.getIdea(pipelineDir, id);
      if (!idea || !Array.isArray(idea.artifacts)) return { ok: false };
      const artifact = idea.artifacts.find(a => a.id === artifactId);
      if (!artifact || !artifact.file) return { ok: false };

      const ideaDir = path.join(pipelineDir, slugForId(id));
      const abs = path.isAbsolute(artifact.file)
        ? artifact.file
        : path.join(ideaDir, artifact.file);
      if (!fs.existsSync(abs)) return { ok: false };

      shell.openPath(abs);
      return { ok: true };
    } catch (e) {
      console.warn('[leap] openArtifact failed:', e.message);
      return { ok: false };
    }
  });

  ipcMain.handle('leaps:getPipelineDir', () => {
    return getPipelineDir();
  });

  // Open an external http(s) link (Looker/BQ/docs) in the system browser.
  ipcMain.handle('leaps:openExternal', (event, url) => {
    try {
      if (typeof url === 'string' && /^https?:\/\//i.test(url)) { shell.openExternal(url); return { ok: true }; }
      return { ok: false };
    } catch (e) { console.warn('[leap] openExternal failed:', e.message); return { ok: false }; }
  });

  // ── Live discovery ──
  // Drive the user's own `claude` CLI headless inside the idea folder, streaming
  // every step to the renderer. On completion, persist any sourced findings to the
  // sidecar and recompute conviction — the rigor gate does the rest.
  ipcMain.handle('leaps:startDiscovery', (event, id, prompt, opts) => {
    try {
      const pipelineDir = getPipelineDir();
      if (!pipelineDir || !id || !prompt) return { ok: false, error: 'no idea/prompt' };
      const ideaDir = path.join(pipelineDir, slugForId(id));
      if (!fs.existsSync(ideaDir)) return { ok: false, error: 'idea not found' };

      const wc = event.sender;
      const send = (payload) => { try { if (!wc.isDestroyed()) wc.send('leaps:discovery', payload); } catch {} };

      // Wire the connectors.yaml data sources into this run.
      let conn = { mcpServers: {}, promptBlock: '' };
      try { conn = connectors.readConnectors(pipelineDir); } catch {}

      // Which model grinds the idea: composer pick (opts.model) wins, else the
      // persisted default in leaps.config.json, else the CLI default.
      let model = (opts && opts.model) || '';
      if (!model) { try { model = (settings.loadSettings().discovery || {}).model || ''; } catch {} }

      // Turn-by-turn memory: each concept owns a stable Claude session id, stored in
      // its .leap.json sidecar. First run mints one (--session-id); later runs resume
      // it (--resume) so the conversation is remembered. Persisted, so it survives
      // app restarts. opts.fresh forces a new session (future "restart conversation").
      const sc = store.readSidecar(ideaDir);
      let sessionId = sc.claudeSessionId;
      let resume = !!sessionId && !(opts && opts.fresh);
      if (!sessionId || (opts && opts.fresh)) {
        sessionId = require('crypto').randomUUID();
        resume = false;
        store.writeSidecar(ideaDir, { claudeSessionId: sessionId });
      }

      // Project root (leap/) as cwd so the CLI discovers .claude/skills.
      const projectRoot = path.join(__dirname, '..');

      discovery.startDiscovery({
        id, ideaDir, projectRoot, prompt, model, sessionId, resume,
        mcpServers: conn.mcpServers, promptBlock: conn.promptBlock,
        onEvent: (card) => send({ id, phase: 'event', card }),
        onDone: ({ findings, result, error, sessionId: usedSession, sessionError }) => {
          let conviction = null;
          try {
            // Self-heal the session id: if the CLI minted a different valid one, store
            // it; if the resume id was stale/invalid, drop it so the next run is fresh.
            if (sessionError) store.writeSidecar(ideaDir, { claudeSessionId: null });
            else if (usedSession && usedSession !== sessionId) store.writeSidecar(ideaDir, { claudeSessionId: usedSession });
            // Non-destructive: discovered claims accumulate in the .leap.json sidecar.
            if (findings && Array.isArray(findings.claims) && findings.claims.length) {
              const prev = store.readSidecar(ideaDir).discoveredClaims || [];
              const fresh = findings.claims
                .filter((c) => c && c.text)
                .map((c) => ({ text: String(c.text), source: c.source ? String(c.source) : null, at: new Date().toISOString() }));
              store.writeSidecar(ideaDir, { discoveredClaims: prev.concat(fresh) });
            }
            const idea = reader.getIdea(pipelineDir, id);
            if (idea) conviction = {
              conviction: idea.conviction, verdict: idea.verdict, evidence: idea.evidence,
              dimensions: idea.dimensions, gap: idea.gap, verdictLine: idea.verdictLine,
            };
          } catch (e) { console.warn('[leap] discovery recompute failed:', e.message); }
          send({ id, phase: 'done', findings, result, error, conviction });
        },
      });
      return { ok: true };
    } catch (e) {
      console.warn('[leap] startDiscovery failed:', e.message);
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('leaps:stopDiscovery', (event, id) => {
    try { return { ok: discovery.stopDiscovery(id) }; }
    catch (e) { return { ok: false }; }
  });

  // The LEAPs skill catalog for the composer's slash-command menu. Each entry maps
  // a typed command to a skill that lives in .claude/skills/. We only surface
  // commands whose skill folder actually exists on disk.
  ipcMain.handle('leaps:listCommands', () => {
    const root = path.join(__dirname, '..');
    const has = (slug) => { try { return fs.existsSync(path.join(root, '.claude', 'skills', slug)); } catch { return false; } };
    const catalog = [
      { cmd: '/learn',   skill: 'learn',     label: 'Learn',     hint: 'idea', desc: 'Sharpen a fuzzy idea into a clear JTBD problem' },
      { cmd: '/explore', skill: 'explore',   label: 'Explore',   hint: 'idea', desc: 'Prototype solutions + journey maps before metrics' },
      { cmd: '/assess',  skill: 'assess',    label: 'Assess',    hint: 'idea', desc: 'Set success criteria, baselines, kill criteria' },
      { cmd: '/prove',   skill: 'prove',     label: 'Prove',     hint: 'idea', desc: 'Feasibility, dependencies, competing directions' },
      { cmd: '/ship',    skill: 'ship',      label: 'Ship',      hint: 'idea', desc: 'Mid-fi prototype + stress test + release checklist' },
      { cmd: '/grill-me',  skill: 'grill-me', label: 'Grill me', hint: 'idea', desc: 'Relentlessly interrogate assumptions and gaps' },
      { cmd: '/pipeline',  skill: 'pipeline', label: 'Pipeline', hint: '',     desc: 'Portfolio view across all concepts' },
      { cmd: '/landscape', skill: 'landscape',label: 'Landscape',hint: 'docs', desc: 'Source docs → JTBD landscape with sized bets' },
      { cmd: '/prd',       skill: 'prd',      label: 'PRD',      hint: '',     desc: 'Compile artifacts into a vibe-coding handoff' },
      { cmd: '/eval',      skill: 'eval',     label: 'Eval',     hint: '',     desc: 'Quality checks + conviction rigor audit' },
      { cmd: '/import',    skill: 'import',   label: 'Import',   hint: 'doc',  desc: 'Import an existing PRD / one-pager into the pipeline' },
      { cmd: '/archive',   skill: 'archive',  label: 'Archive',  hint: 'idea', desc: 'Archive or unarchive a concept' },
    ];
    return catalog.filter((c) => has(c.skill));
  });

  // ── Settings / status ──
  // App + engine state for the Settings panel: versions, login method, folder, runs.
  // Settings "Check for updates" button — returns the result for the renderer.
  ipcMain.handle('leaps:checkForUpdates', () => updater.checkForUpdates(pkg, app.getVersion()));

  // Verdict thresholds (leaps.config.json) — read + persist from Settings/onboarding.
  ipcMain.handle('leaps:getSettings', () => settings.loadSettings());
  ipcMain.handle('leaps:saveSettings', (event, patch) => settings.saveSettings(patch));

  // Company + role/goals context — read + persist from Settings/onboarding.
  ipcMain.handle('leaps:getContext', () => context.loadContext());
  ipcMain.handle('leaps:saveContext', (event, patch) => context.saveContext(patch));
  ipcMain.handle('leaps:listContextDocs', () => context.listDocs());
  ipcMain.handle('leaps:getContextDoc', (e, id) => context.getDoc(id));
  ipcMain.handle('leaps:saveContextDoc', (e, doc) => context.saveDoc(doc));
  ipcMain.handle('leaps:deleteContextDoc', (e, id) => context.deleteDoc(id));
  ipcMain.handle('leaps:toggleContextDoc', (e, id) => context.toggleDoc(id));

  // Org-specific model options the Claude CLI has cached for this account (e.g.
  // pinned versions and 1M-context variants like claude-opus-4-6[1m]). The picker
  // merges these on top of the family aliases so it follows what the org actually
  // offers. Returns enabled entries as { value (the --model string), label, description }.
  ipcMain.handle('leaps:getModelOptions', () => {
    try {
      const home = process.env.HOME || require('os').homedir();
      const j = JSON.parse(fs.readFileSync(path.join(home, '.claude.json'), 'utf8'));
      const opts = Array.isArray(j.additionalModelOptionsCache) ? j.additionalModelOptionsCache : [];
      return opts
        .filter((o) => o && o.value && !o.disabled)
        .map((o) => ({ value: String(o.value), label: String(o.label || o.value), description: o.description ? String(o.description) : '' }));
    } catch { return []; }
  });

  // Design system — the tokens the prototype builder uses. read / connect-figma / reset.
  ipcMain.handle('leaps:getDesign', () => design.getDesign());
  ipcMain.handle('leaps:saveFigmaUrl', (event, url) => design.saveFigmaUrl(url));
  ipcMain.handle('leaps:resetDesign', () => design.resetDesign());

  // Connect-your-own design system: run /setup --sync-design headless and stream
  // progress to the renderer, then mark the source as figma + push fresh state.
  ipcMain.handle('leaps:syncDesign', (event) => {
    const blocked = design.syncBlockedReason();
    if (blocked) return { ok: false, error: blocked };
    const wc = event.sender;
    const send = (payload) => { try { if (!wc.isDestroyed()) wc.send('leaps:designSync', payload); } catch {} };
    const projectRoot = path.join(__dirname, '..');
    discovery.runHeadlessSkill({
      projectRoot,
      prompt: '/setup --sync-design',
      onEvent: ({ text }) => send({ phase: 'event', text }),
      onDone: ({ ok, error }) => {
        let d = null;
        try { d = ok ? design.markSynced() : design.getDesign(); } catch {}
        send({ phase: 'done', ok, error, design: d });
      },
    });
    return { ok: true };
  });

  // Create a new concept folder in the active pipeline dir and return its id.
  ipcMain.handle('leaps:createIdea', (event, title) => {
    const dir = getPipelineDir();
    if (!dir) return { ok: false, error: 'No concepts folder selected. Pick one in Settings first.' };
    const base = String(title || '').toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'concept';
    let slug = base, n = 2;
    while (fs.existsSync(path.join(dir, slug))) slug = base + '-' + (n++);
    const ideaDir = path.join(dir, slug);
    try {
      fs.mkdirSync(ideaDir, { recursive: true });
      fs.writeFileSync(path.join(ideaDir, '.pipeline-id'), slug + '\n');
      fs.writeFileSync(path.join(ideaDir, '.briefdata.json'), JSON.stringify({
        title: String(title || '').trim() || slug,
        slug,
        meta: { slug, date: new Date().toISOString().slice(0, 10), stage: 'Empty' },
        executiveSummary: [],
      }, null, 2) + '\n');
    } catch (e) { return { ok: false, error: e.message }; }
    return { ok: true, id: slug };
  });

  // Delete a concept folder. Guards: id must be a single path segment and the
  // resolved dir must live directly inside the active pipeline folder.
  ipcMain.handle('leaps:deleteIdea', (event, id) => {
    const dir = getPipelineDir();
    if (!dir) return { ok: false, error: 'No concepts folder.' };
    if (!id || /[\/\\]|\.\./.test(String(id))) return { ok: false, error: 'Invalid id.' };
    const ideaDir = path.join(dir, id);
    if (path.dirname(ideaDir) !== path.resolve(dir)) return { ok: false, error: 'Refusing to delete outside the concepts folder.' };
    discovery.stopDiscovery(id);
    try { fs.rmSync(ideaDir, { recursive: true, force: true }); }
    catch (e) { return { ok: false, error: e.message }; }
    return { ok: true };
  });

  // Rename a concept's display title (in .briefdata.json). Keeps the folder slug
  // stable so links/ids don't break.
  ipcMain.handle('leaps:renameIdea', (event, id, title) => {
    const d = ideaDirFor(id); if (!d) return { ok: false, error: 'Unknown concept.' };
    const t = String(title || '').trim();
    if (!t) return { ok: false, error: 'Title required.' };
    const bp = path.join(d, '.briefdata.json');
    let bd = {};
    try { bd = JSON.parse(fs.readFileSync(bp, 'utf8')); } catch {}
    bd.title = t;
    try { fs.writeFileSync(bp, JSON.stringify(bd, null, 2) + '\n'); }
    catch (e) { return { ok: false, error: e.message }; }
    return { ok: true };
  });

  // Attach context to a concept — a typed note or a copied file — under
  // pipeline/{slug}/context/. Discovery reads this folder.
  ipcMain.handle('leaps:addContextNote', (event, id, title, body) => {
    const d = ideaDirFor(id); if (!d) return { ok: false, error: 'Unknown concept.' };
    const ctxDir = path.join(d, 'context');
    const name = (String(title || 'note').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'note') + '.md';
    try {
      fs.mkdirSync(ctxDir, { recursive: true });
      fs.writeFileSync(path.join(ctxDir, name), `# ${String(title || 'Note').trim()}\n\n${String(body || '').trim()}\n`);
    } catch (e) { return { ok: false, error: e.message }; }
    return { ok: true, name };
  });
  ipcMain.handle('leaps:addContextFiles', async (event, id) => {
    const d = ideaDirFor(id); if (!d) return { ok: false, error: 'Unknown concept.' };
    const res = await dialog.showOpenDialog(mainWindow, { title: 'Attach context files', properties: ['openFile', 'multiSelections'] });
    if (res.canceled || !res.filePaths.length) return { ok: false, canceled: true };
    const ctxDir = path.join(d, 'context');
    try {
      fs.mkdirSync(ctxDir, { recursive: true });
      for (const fp of res.filePaths) fs.copyFileSync(fp, path.join(ctxDir, path.basename(fp)));
    } catch (e) { return { ok: false, error: e.message }; }
    return { ok: true, count: res.filePaths.length };
  });
  ipcMain.handle('leaps:listContext', (event, id) => {
    const d = ideaDirFor(id); if (!d) return [];
    try { return fs.readdirSync(path.join(d, 'context')).filter((f) => !f.startsWith('.')); } catch { return []; }
  });

  ipcMain.handle('leaps:getStatus', () => {
    const bin = discovery.resolveClaudeBin();
    const subscription = discovery.hasSubscriptionLogin();
    const loginMethod = subscription ? 'subscription'
      : (process.env.ANTHROPIC_API_KEY ? 'api-key' : 'none');
    return {
      appVersion: app.getVersion(),
      appName: APP_NAME,
      claudeVersion: claudeVersionCached(),
      claudeBin: bin,
      loginMethod,
      account: discovery.readAccount(),
      pipelineDir: getPipelineDir(),
      runs: discovery.listRuns(),
      onboardingDone: readConfig().onboardingDone === true,
    };
  });

  // Mark first-run onboarding complete (persisted in <userData>/config.json).
  ipcMain.handle('leaps:completeOnboarding', () => {
    writeConfig({ ...readConfig(), onboardingDone: true });
    return { ok: true };
  });

  // Connectors — the semantic role→source bindings from connectors.yaml (in the project root).
  // This is what discovery actually resolves against, far clearer than a raw MCP dump.
  ipcMain.handle('leaps:getConnectors', () => {
    try { return connectors.readConnectors(getPipelineDir()); }
    catch (e) { return { ok: false, roles: [], sources: [], presets: [], count: 0 }; }
  });

  // Save edited connector roles back to connectors.yaml, then return the fresh view.
  ipcMain.handle('leaps:saveConnectors', (event, roles) => {
    try { connectors.writeConnectors(roles); } catch (e) {}
    return connectors.readConnectors(getPipelineDir());
  });

  // Apply a preset (presets/{name}.yaml -> connectors.yaml), then return the fresh view.
  ipcMain.handle('leaps:applyPreset', (event, name) => {
    try { connectors.applyPreset(name); } catch (e) {}
    return connectors.readConnectors(getPipelineDir());
  });

  // Export the current connector roles to a YAML file the user picks (e.g. to
  // share a team config or back it up). Serializes the in-app draft.
  ipcMain.handle('leaps:exportConnectors', async (event, roles) => {
    try {
      const res = await dialog.showSaveDialog(mainWindow, {
        title: 'Export data sources',
        defaultPath: path.join(app.getPath('documents'), 'connectors.yaml'),
        filters: [{ name: 'YAML', extensions: ['yaml', 'yml'] }],
      });
      if (res.canceled || !res.filePath) return { ok: false };
      fs.writeFileSync(res.filePath, connectors.serializeRoles(roles || []));
      return { ok: true, path: res.filePath };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  // Import a connectors.yaml the user picks → validate, make it the active config,
  // and return the fresh view for the editor.
  ipcMain.handle('leaps:importConnectors', async () => {
    try {
      const res = await dialog.showOpenDialog(mainWindow, {
        title: 'Import data sources',
        properties: ['openFile'],
        filters: [{ name: 'YAML', extensions: ['yaml', 'yml'] }],
      });
      if (res.canceled || !res.filePaths.length) return { ok: false };
      const raw = fs.readFileSync(res.filePaths[0], 'utf8');
      const roles = connectors.parseRoles(raw);
      if (!roles || !roles.length) return { ok: false, error: 'No connector roles found in that file.' };
      // Preserve the imported file verbatim as the active config (after validating it parses).
      fs.writeFileSync(path.join(__dirname, '..', 'connectors.yaml'), raw);
      return { ok: true, connectors: connectors.readConnectors(getPipelineDir()) };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  // Probe ACTUAL connection/auth health by asking the user's Claude CLI which MCP
  // servers it has and whether they connect (`claude mcp list` runs a health check).
  // Returns { ok, health: { <mcpName>: 'connected'|'failed'|'configured' } } so the
  // editor can show real status instead of just "bound in connectors.yaml".
  ipcMain.handle('leaps:checkConnectors', async () => {
    return await new Promise((resolve) => {
      try {
        const { spawn } = require('child_process');
        const child = spawn(discovery.resolveClaudeBin(), ['mcp', 'list'], { env: process.env });
        let out = '';
        child.stdout.on('data', (d) => { out += d.toString('utf8'); });
        child.stderr.on('data', (d) => { out += d.toString('utf8'); });
        const timer = setTimeout(() => { try { child.kill(); } catch {} }, 25000);
        child.on('error', (e) => { clearTimeout(timer); resolve({ ok: false, error: e.message, health: {} }); });
        child.on('close', () => {
          clearTimeout(timer);
          const health = {};
          out.split('\n').forEach((line) => {
            const m = /^\s*([A-Za-z0-9_.-]+):\s/.exec(line);
            if (!m) return;
            if (/✓|connected/i.test(line)) health[m[1]] = 'connected';
            else if (/✗|fail|error|disconnect|unauthor/i.test(line)) health[m[1]] = 'failed';
            else health[m[1]] = 'configured';
          });
          resolve({ ok: true, health });
        });
      } catch (e) {
        resolve({ ok: false, error: e.message, health: {} });
      }
    });
  });

  // One-click sign-in: launch `claude auth login` in Terminal so the user completes
  // the browser OAuth, then watch for the credentials file and tell the renderer when
  // the subscription is live. LEAPs never touches the credentials itself.
  ipcMain.handle('leaps:signIn', (event) => {
    try {
      const bin = discovery.resolveClaudeBin();
      const script = `tell application "Terminal"\nactivate\ndo script "${bin} auth login"\nend tell`;
      execFile('osascript', ['-e', script], { timeout: 8000 }, () => {});
      // Poll for the OAuth credentials file (written when login completes), up to 2 min.
      const wc = event.sender;
      const start = Date.now();
      const timer = setInterval(() => {
        if (discovery.hasSubscriptionLogin()) {
          clearInterval(timer);
          try { if (!wc.isDestroyed()) wc.send('leaps:authChanged', { loginMethod: 'subscription' }); } catch {}
        } else if (Date.now() - start > 120000) {
          clearInterval(timer);
        }
      }, 2000);
      return { ok: true };
    } catch (e) {
      console.warn('[leap] signIn failed:', e.message);
      return { ok: false, error: e.message };
    }
  });

  // Read a raw doc inside an idea folder (markdown/text/json/html). Sandboxed:
  // the resolved path must stay within <pipelineDir>/<id>. Size-capped.
  ipcMain.handle('leaps:readFile', (event, id, relPath) => {
    try {
      const pipelineDir = getPipelineDir();
      if (!pipelineDir || !relPath) return { ok: false };
      const ideaDir = path.join(pipelineDir, slugForId(id));
      const abs = path.resolve(ideaDir, relPath);
      if (abs !== ideaDir && !abs.startsWith(ideaDir + path.sep)) return { ok: false }; // no escape
      if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return { ok: false };
      const text = fs.readFileSync(abs, 'utf8');
      return { ok: true, text: text.length > 400000 ? text.slice(0, 400000) : text };
    } catch (e) {
      console.warn('[leap] readFile failed:', e.message);
      return { ok: false };
    }
  });

  ipcMain.handle('leaps:pickPipelineDir', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Choose or create your concepts folder',
        // createDirectory shows the native "New Folder" button; defaultPath starts
        // in the user's own Documents, not an arbitrary last-used location.
        properties: ['openDirectory', 'createDirectory'],
        defaultPath: app.getPath('documents'),
        buttonLabel: 'Use this folder',
      });
      if (result.canceled || !result.filePaths.length) return getPipelineDir();
      const dir = result.filePaths[0];
      writeConfig({ ...readConfig(), pipelineDir: dir });
      return dir;
    } catch (e) {
      console.warn('[leap] pickPipelineDir failed:', e.message);
      return getPipelineDir();
    }
  });

  // One-click default: create a LEAPs folder in the user's Documents and use it,
  // so a new user isn't stuck choosing — and concepts land in their own space.
  ipcMain.handle('leaps:createDefaultFolder', () => {
    try {
      const dir = path.join(app.getPath('documents'), 'LEAPs');
      fs.mkdirSync(dir, { recursive: true });
      writeConfig({ ...readConfig(), pipelineDir: dir });
      return dir;
    } catch (e) {
      console.warn('[leap] createDefaultFolder failed:', e.message);
      return getPipelineDir();
    }
  });
}

// ── App lifecycle ──

app.whenReady().then(() => {
  app.setAboutPanelOptions({
    applicationName: APP_NAME,
    applicationVersion: app.getVersion(),
    copyright: 'Local-first product discovery',
  });
  // Dock icon for the dev run (`electron .`), which otherwise shows the Electron logo.
  if (process.platform === 'darwin' && app.dock && fs.existsSync(ICON_PNG)) {
    try { app.dock.setIcon(nativeImage.createFromPath(ICON_PNG)); } catch {}
  }
  buildMenu();
  setupIpc();
  createWindow();

  // Quiet update check shortly after launch (never blocks startup).
  setTimeout(() => { runUpdateCheck(true).catch(() => {}); }, 3000);

  // Release-screenshot tooling: LEAPS_CAPTURE=/path.png captures the window and exits.
  // Optional LEAPS_CAPTURE_JS runs in the page first (e.g. open a panel) before capture.
  if (process.env.LEAPS_CAPTURE) {
    setTimeout(async () => {
      try {
        if (process.env.LEAPS_CAPTURE_JS) {
          try { await mainWindow.webContents.executeJavaScript(process.env.LEAPS_CAPTURE_JS); } catch {}
          await new Promise((r) => setTimeout(r, 1500)); // let async loads + render settle
        }
        const img = await mainWindow.webContents.capturePage();
        fs.writeFileSync(process.env.LEAPS_CAPTURE, img.toPNG());
      } catch (e) { console.error('[leap] capture failed', e); }
      app.quit();
    }, 2600);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Closing the app must kill every running session — no orphaned claude CLI
// processes. before-quit covers Cmd-Q / app.quit(); window-all-closed covers
// the last window closing on every platform.
app.on('before-quit', () => { try { discovery.stopAll(); } catch {} });

app.on('window-all-closed', () => {
  try { discovery.stopAll(); } catch {}
  if (process.platform !== 'darwin') app.quit();
});
