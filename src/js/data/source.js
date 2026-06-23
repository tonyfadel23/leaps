// Data source abstraction.
//   - In Electron, window.leap.* (the IPC bridge, Phase 2) reads real pipeline/{slug}/.
//   - In a browser, falls back to window.SEED so the UI runs standalone for verification.
// Both return the same view-model shape (see seed.js for the contract).

window.DataSource = (() => {
  const hasBridge = () => typeof window.leap !== 'undefined' && !!window.leap.listIdeas;

  async function getBoard() {
    if (hasBridge()) {
      try { return await window.leap.listIdeas(); }
      catch (e) { console.warn('[leap] bridge listIdeas failed, using seed', e); }
    }
    return { ideas: window.SEED.ideas, killed: window.SEED.killed };
  }

  async function getIdea(id) {
    if (hasBridge()) {
      try { return await window.leap.getIdea(id); }
      catch (e) { console.warn('[leap] bridge getIdea failed, using seed', e); }
    }
    return window.SEED.ideas.find(i => i.id === id) || window.SEED.ideas[0];
  }

  // Persist a verdict / kill reason. No-op (in-memory) without a bridge.
  async function setVerdict(id, verdict, reason) {
    if (hasBridge() && window.leap.setVerdict) {
      try { return await window.leap.setVerdict(id, verdict, reason); } catch (e) { console.warn(e); }
    }
    const idea = window.SEED.ideas.find(i => i.id === id);
    if (idea) idea.verdict = verdict;
    return { ok: true };
  }

  // Open an artifact file (html prototype, brief) full-screen / externally.
  async function openArtifact(id, artifactId) {
    if (hasBridge() && window.leap.openArtifact) {
      try { return await window.leap.openArtifact(id, artifactId); } catch (e) { console.warn(e); }
    }
    return { ok: false, inline: true };
  }

  async function getPipelineDir() {
    if (hasBridge() && window.leap.getPipelineDir) {
      try { return await window.leap.getPipelineDir(); } catch (e) { console.warn(e); }
    }
    return null;
  }

  async function pickPipelineDir() {
    if (hasBridge() && window.leap.pickPipelineDir) {
      try { return await window.leap.pickPipelineDir(); } catch (e) { console.warn(e); }
    }
    return null;
  }
  async function createDefaultFolder() {
    if (hasBridge() && window.leap.createDefaultFolder) {
      try { return await window.leap.createDefaultFolder(); } catch (e) { console.warn(e); }
    }
    return null;
  }

  // Raw doc content for a file inside an idea folder. Returns string or null.
  async function readFile(id, relPath) {
    if (hasBridge() && window.leap.readFile) {
      try { const r = await window.leap.readFile(id, relPath); return r && r.ok ? r.text : null; }
      catch (e) { console.warn(e); }
    }
    return null;
  }

  async function openExternal(url) {
    if (hasBridge() && window.leap.openExternal) {
      try { return await window.leap.openExternal(url); } catch (e) { console.warn(e); }
    }
    try { window.open(url, '_blank', 'noopener'); } catch {} // browser fallback
    return { ok: true };
  }

  // ── Settings / status ──
  async function getStatus() {
    if (hasBridge() && window.leap.getStatus) {
      try { return await window.leap.getStatus(); } catch (e) { console.warn(e); }
    }
    return null;
  }
  async function getConnectors() {
    if (hasBridge() && window.leap.getConnectors) {
      try { return await window.leap.getConnectors(); } catch (e) { console.warn(e); }
    }
    return { ok: false, sources: [], roles: [], presets: [], count: 0 };
  }
  async function saveConnectors(roles) {
    if (hasBridge() && window.leap.saveConnectors) {
      try { return await window.leap.saveConnectors(roles); } catch (e) { console.warn(e); }
    }
    return { ok: false, sources: [], roles: roles || [], presets: [], count: 0 };
  }
  async function applyPreset(name) {
    if (hasBridge() && window.leap.applyPreset) {
      try { return await window.leap.applyPreset(name); } catch (e) { console.warn(e); }
    }
    return { ok: false, sources: [], roles: [], presets: [], count: 0 };
  }
  async function exportConnectors(roles) {
    if (hasBridge() && window.leap.exportConnectors) {
      try { return await window.leap.exportConnectors(roles); } catch (e) { console.warn(e); }
    }
    return { ok: false, error: 'Export needs the desktop app.' };
  }
  async function importConnectors() {
    if (hasBridge() && window.leap.importConnectors) {
      try { return await window.leap.importConnectors(); } catch (e) { console.warn(e); }
    }
    return { ok: false, error: 'Import needs the desktop app.' };
  }
  async function checkConnectors() {
    if (hasBridge() && window.leap.checkConnectors) {
      try { return await window.leap.checkConnectors(); } catch (e) { console.warn(e); }
    }
    return { ok: false, error: 'Connection check needs the desktop app.', health: {} };
  }
  async function signIn() {
    if (hasBridge() && window.leap.signIn) {
      try { return await window.leap.signIn(); } catch (e) { console.warn(e); }
    }
    return { ok: false };
  }
  function onAuthChanged(cb) {
    if (hasBridge() && window.leap.onAuthChanged) {
      try { return window.leap.onAuthChanged(cb); } catch (e) { console.warn(e); }
    }
    return () => {};
  }
  async function getSettings() {
    if (hasBridge() && window.leap.getSettings) {
      try { return await window.leap.getSettings(); } catch (e) { console.warn(e); }
    }
    return { verdict: { killBelow: 50, pursueFrom: 70, pursueMinEvidence: 3 } };
  }
  async function saveSettings(patch) {
    if (hasBridge() && window.leap.saveSettings) {
      try { return await window.leap.saveSettings(patch); } catch (e) { console.warn(e); }
    }
    return patch;
  }
  async function getModelOptions() {
    if (hasBridge() && window.leap.getModelOptions) {
      try { return await window.leap.getModelOptions(); } catch (e) { console.warn(e); }
    }
    return [];
  }
  async function completeOnboarding() {
    if (hasBridge() && window.leap.completeOnboarding) {
      try { return await window.leap.completeOnboarding(); } catch (e) { console.warn(e); }
    }
    return { ok: true };
  }
  async function checkForUpdates() {
    if (hasBridge() && window.leap.checkForUpdates) {
      try { return await window.leap.checkForUpdates(); } catch (e) { console.warn(e); }
    }
    return { available: false, error: 'Updates check needs the desktop app.' };
  }
  async function getContext() {
    if (hasBridge() && window.leap.getContext) {
      try { return await window.leap.getContext(); } catch (e) { console.warn(e); }
    }
    return { company: '', markets: '', role: '', scope: '', goals: '' };
  }
  async function saveContext(patch) {
    if (hasBridge() && window.leap.saveContext) {
      try { return await window.leap.saveContext(patch); } catch (e) { console.warn(e); }
    }
    return patch || {};
  }
  async function listContextDocs() {
    if (hasBridge() && window.leap.listContextDocs) { try { return await window.leap.listContextDocs(); } catch (e) { console.warn(e); } }
    return [];
  }
  async function getContextDoc(id) {
    if (hasBridge() && window.leap.getContextDoc) { try { return await window.leap.getContextDoc(id); } catch (e) { console.warn(e); } }
    return null;
  }
  async function saveContextDoc(doc) {
    if (hasBridge() && window.leap.saveContextDoc) { try { return await window.leap.saveContextDoc(doc); } catch (e) { console.warn(e); } }
    return { ok: false };
  }
  async function deleteContextDoc(id) {
    if (hasBridge() && window.leap.deleteContextDoc) { try { return await window.leap.deleteContextDoc(id); } catch (e) { console.warn(e); } }
    return { ok: false };
  }
  async function toggleContextDoc(id) {
    if (hasBridge() && window.leap.toggleContextDoc) { try { return await window.leap.toggleContextDoc(id); } catch (e) { console.warn(e); } }
    return { ok: false };
  }
  async function createIdea(title) {
    if (hasBridge() && window.leap.createIdea) {
      try { return await window.leap.createIdea(title); } catch (e) { console.warn(e); return { ok: false, error: String(e) }; }
    }
    return { ok: false, error: 'Creating concepts needs the desktop app.' };
  }
  async function deleteIdea(id) {
    if (hasBridge() && window.leap.deleteIdea) {
      try { return await window.leap.deleteIdea(id); } catch (e) { console.warn(e); return { ok: false, error: String(e) }; }
    }
    return { ok: false, error: 'Deleting concepts needs the desktop app.' };
  }
  async function renameIdea(id, title) {
    if (hasBridge() && window.leap.renameIdea) {
      try { return await window.leap.renameIdea(id, title); } catch (e) { console.warn(e); return { ok: false, error: String(e) }; }
    }
    return { ok: false };
  }
  async function addContextNote(id, title, body) {
    if (hasBridge() && window.leap.addContextNote) { try { return await window.leap.addContextNote(id, title, body); } catch (e) { console.warn(e); } }
    return { ok: false };
  }
  async function addContextFiles(id) {
    if (hasBridge() && window.leap.addContextFiles) { try { return await window.leap.addContextFiles(id); } catch (e) { console.warn(e); } }
    return { ok: false };
  }
  async function listContext(id) {
    if (hasBridge() && window.leap.listContext) { try { return await window.leap.listContext(id); } catch (e) { console.warn(e); } }
    return [];
  }

  // ── Live discovery ──
  async function startDiscovery(id, prompt, opts) {
    if (hasBridge() && window.leap.startDiscovery) {
      try { return await window.leap.startDiscovery(id, prompt, opts || {}); } catch (e) { console.warn(e); return { ok: false }; }
    }
    return { ok: false, error: 'Live discovery needs the desktop app.' };
  }
  async function listCommands() {
    if (hasBridge() && window.leap.listCommands) {
      try { return await window.leap.listCommands(); } catch (e) { console.warn(e); }
    }
    return [];
  }
  async function stopDiscovery(id) {
    if (hasBridge() && window.leap.stopDiscovery) {
      try { return await window.leap.stopDiscovery(id); } catch (e) { console.warn(e); }
    }
    return { ok: false };
  }
  // Subscribe to streamed discovery events. Returns an unsubscribe fn (no-op in browser).
  function onDiscovery(cb) {
    if (hasBridge() && window.leap.onDiscovery) {
      try { return window.leap.onDiscovery(cb); } catch (e) { console.warn(e); }
    }
    return () => {};
  }

  // ── Design system ──
  async function getDesign() {
    if (hasBridge() && window.leap.getDesign) {
      try { return await window.leap.getDesign(); } catch (e) { console.warn(e); }
    }
    return { source: 'default', preset: null, figmaUrl: null, colors: [], lastSynced: null };
  }
  async function saveFigmaUrl(url) {
    if (hasBridge() && window.leap.saveFigmaUrl) {
      try { return await window.leap.saveFigmaUrl(url); } catch (e) { console.warn(e); }
    }
    return getDesign();
  }
  async function resetDesign() {
    if (hasBridge() && window.leap.resetDesign) {
      try { return await window.leap.resetDesign(); } catch (e) { console.warn(e); }
    }
    return getDesign();
  }
  async function syncDesign() {
    if (hasBridge() && window.leap.syncDesign) {
      try { return await window.leap.syncDesign(); } catch (e) { console.warn(e); }
    }
    return { ok: false, error: 'Design sync needs the desktop app.' };
  }
  function onDesignSync(cb) {
    if (hasBridge() && window.leap.onDesignSync) {
      try { return window.leap.onDesignSync(cb); } catch (e) { console.warn(e); }
    }
    return () => {};
  }

  return { getBoard, getIdea, setVerdict, openArtifact, getPipelineDir, pickPipelineDir, createDefaultFolder, readFile, openExternal,
    getStatus, getConnectors, saveConnectors, applyPreset, exportConnectors, importConnectors, checkConnectors, signIn, onAuthChanged,
    getSettings, saveSettings, getModelOptions, completeOnboarding, checkForUpdates, getContext, saveContext,
    listContextDocs, getContextDoc, saveContextDoc, deleteContextDoc, toggleContextDoc,
    createIdea, deleteIdea, renameIdea, addContextNote, addContextFiles, listContext,
    getDesign, saveFigmaUrl, resetDesign, syncDesign, onDesignSync,
    startDiscovery, stopDiscovery, onDiscovery, listCommands, hasBridge };
})();
