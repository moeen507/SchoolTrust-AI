const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('umeedDesktop', Object.freeze({
  isDesktopApp: true,
  getVersion: () => ipcRenderer.invoke('app-version'),
  printA5: () => ipcRenderer.invoke('umeed-print-a5'),
  exportJson: payload => ipcRenderer.invoke('umeed-export-json', payload),
  importJson: () => ipcRenderer.invoke('umeed-import-json')
}));
