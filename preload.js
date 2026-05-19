const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petAPI', {
  moveBy: (dx, dy) => ipcRenderer.invoke('pet:move-by', dx, dy),
  getBounds: () => ipcRenderer.invoke('pet:get-bounds')
});
