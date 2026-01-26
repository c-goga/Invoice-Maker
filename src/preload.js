const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('api',
  {
    getCurrentCompany: () => ipcRenderer.invoke('get-current-company'),
    getCompanies: () => ipcRenderer.invoke('get-companies'),
    createCompany: (data) => ipcRenderer.invoke('create-company', data),
    createInitialCompany: (data) => ipcRenderer.invoke('create-initial-company', data),
    updateCompany: (data) => ipcRenderer.invoke('update-company', data),
    updateCurrentCompany: (data) => ipcRenderer.invoke('update-current-company', data),
    createFile: (data) => ipcRenderer.invoke('create-file', data),
    openFolderBox: (data) => ipcRenderer.invoke('open-folder', data),
    showSaveBox: () => ipcRenderer.invoke('show-save'),
    showSaveBeforeChangeBox: () => ipcRenderer.invoke('show-save-before-change'),
    showSaveBeforeExitBox: () => ipcRenderer.invoke('show-save-before-exit'),
    closeWindow: () => ipcRenderer.invoke('close-window'),
    deleteCompany: (data) => ipcRenderer.invoke('delete-company', data),
  }
)


