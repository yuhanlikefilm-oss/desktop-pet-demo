const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petAPI', {
  moveBy: (dx, dy) => ipcRenderer.invoke('pet:move-by', dx, dy),
  getBounds: () => ipcRenderer.invoke('pet:get-bounds'),
  getAnimationManifest: () => ipcRenderer.invoke('pet:get-animation-manifest'),
  getSettings: () => ipcRenderer.invoke('pet:get-settings'),
  onSettingsUpdated: (callback) => {
    const handler = (_, payload) => callback(payload);
    ipcRenderer.on('settings:updated', handler);
    return () => ipcRenderer.removeListener('settings:updated', handler);
  }
});
