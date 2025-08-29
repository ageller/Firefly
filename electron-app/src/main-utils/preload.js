const { contextBridge, ipcRenderer } = require('electron');

// expose the system file browser
contextBridge.exposeInMainWorld('electronAPI', {
    selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
    openLogViewer: () => ipcRenderer.send('open-log-viewer')
});