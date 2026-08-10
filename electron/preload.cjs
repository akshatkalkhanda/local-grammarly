const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (config) => ipcRenderer.invoke('config:save', config),
  getModels: (url) => ipcRenderer.invoke('ollama:models', url),
  generate: (action, text, tone, customInstruction, translationTarget) => ipcRenderer.invoke('ollama:generate', { action, text, tone, customInstruction, translationTarget }),
  generateStream: (action, text, tone, customInstruction, translationTarget, onChunk) => new Promise((resolve, reject) => {
    const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const listener = (_event, message) => {
      if (message.requestId !== requestId) return;
      if (message.type === 'chunk') onChunk(message.chunk);
      if (message.type === 'done') {
        ipcRenderer.removeListener('ollama:stream-response', listener);
        resolve(message.suggestion);
      }
      if (message.type === 'error') {
        ipcRenderer.removeListener('ollama:stream-response', listener);
        reject(new Error(message.message));
      }
    };
    ipcRenderer.on('ollama:stream-response', listener);
    ipcRenderer.send('ollama:generate-stream', { requestId, action, text, tone, customInstruction, translationTarget });
  }),
  getHistory: () => ipcRenderer.invoke('history:list'),
  clearHistory: () => ipcRenderer.invoke('history:clear'),
  hideWidget: () => ipcRenderer.send('widget:hide'),
  copyText: (text) => ipcRenderer.send('widget:copy', text),
  replaceText: (text) => ipcRenderer.send('widget:replace-text', text),
  onTextSelected: (callback) => {
    const listener = (_event, text) => callback(text);
    ipcRenderer.on('text-selected', listener);
    return () => ipcRenderer.removeListener('text-selected', listener);
  },
  onConfigUpdated: (callback) => {
    const listener = (_event, config) => callback(config);
    ipcRenderer.on('config-updated', listener);
    return () => ipcRenderer.removeListener('config-updated', listener);
  },
  ready: () => ipcRenderer.send('widget-ready')
});
