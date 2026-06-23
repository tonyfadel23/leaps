const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('leap', {
  listIdeas: () => ipcRenderer.invoke('leaps:listIdeas'),
  getIdea: (id) => ipcRenderer.invoke('leaps:getIdea', id),
  setVerdict: (id, verdict, reason) => ipcRenderer.invoke('leaps:setVerdict', id, verdict, reason),
  openArtifact: (id, artifactId) => ipcRenderer.invoke('leaps:openArtifact', id, artifactId),
  pickPipelineDir: () => ipcRenderer.invoke('leaps:pickPipelineDir'),
  getPipelineDir: () => ipcRenderer.invoke('leaps:getPipelineDir'),
  checkForUpdates: () => ipcRenderer.invoke('leaps:checkForUpdates'),
  getSettings: () => ipcRenderer.invoke('leaps:getSettings'),
  saveSettings: (patch) => ipcRenderer.invoke('leaps:saveSettings', patch),
  completeOnboarding: () => ipcRenderer.invoke('leaps:completeOnboarding'),
  saveConnectors: (roles) => ipcRenderer.invoke('leaps:saveConnectors', roles),
  applyPreset: (name) => ipcRenderer.invoke('leaps:applyPreset', name),
  getContext: () => ipcRenderer.invoke('leaps:getContext'),
  saveContext: (patch) => ipcRenderer.invoke('leaps:saveContext', patch),
  listContextDocs: () => ipcRenderer.invoke('leaps:listContextDocs'),
  getContextDoc: (id) => ipcRenderer.invoke('leaps:getContextDoc', id),
  saveContextDoc: (doc) => ipcRenderer.invoke('leaps:saveContextDoc', doc),
  deleteContextDoc: (id) => ipcRenderer.invoke('leaps:deleteContextDoc', id),
  toggleContextDoc: (id) => ipcRenderer.invoke('leaps:toggleContextDoc', id),
  createIdea: (title) => ipcRenderer.invoke('leaps:createIdea', title),
  deleteIdea: (id) => ipcRenderer.invoke('leaps:deleteIdea', id),
  renameIdea: (id, title) => ipcRenderer.invoke('leaps:renameIdea', id, title),
  addContextNote: (id, title, body) => ipcRenderer.invoke('leaps:addContextNote', id, title, body),
  addContextFiles: (id) => ipcRenderer.invoke('leaps:addContextFiles', id),
  listContext: (id) => ipcRenderer.invoke('leaps:listContext', id),
  readFile: (id, relPath) => ipcRenderer.invoke('leaps:readFile', id, relPath),
  openExternal: (url) => ipcRenderer.invoke('leaps:openExternal', url),

  // Settings / status
  getStatus: () => ipcRenderer.invoke('leaps:getStatus'),
  getConnectors: () => ipcRenderer.invoke('leaps:getConnectors'),
  signIn: () => ipcRenderer.invoke('leaps:signIn'),
  onAuthChanged: (cb) => {
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on('leaps:authChanged', listener);
    return () => ipcRenderer.removeListener('leaps:authChanged', listener);
  },

  // Design system — read tokens, connect a Figma file, reset to neutral default.
  getDesign: () => ipcRenderer.invoke('leaps:getDesign'),
  saveFigmaUrl: (url) => ipcRenderer.invoke('leaps:saveFigmaUrl', url),
  resetDesign: () => ipcRenderer.invoke('leaps:resetDesign'),
  syncDesign: () => ipcRenderer.invoke('leaps:syncDesign'),
  onDesignSync: (cb) => {
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on('leaps:designSync', listener);
    return () => ipcRenderer.removeListener('leaps:designSync', listener);
  },

  // Live discovery — drives the local claude CLI, streams events back.
  startDiscovery: (id, prompt, opts) => ipcRenderer.invoke('leaps:startDiscovery', id, prompt, opts),
  stopDiscovery: (id) => ipcRenderer.invoke('leaps:stopDiscovery', id),
  listCommands: () => ipcRenderer.invoke('leaps:listCommands'),
  onDiscovery: (cb) => {
    const listener = (_e, payload) => cb(payload);
    ipcRenderer.on('leaps:discovery', listener);
    return () => ipcRenderer.removeListener('leaps:discovery', listener);
  },
});
