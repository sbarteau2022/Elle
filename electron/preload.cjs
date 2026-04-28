'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('elleNative', {
  isElectron: true,

  onHeadMotion: (cb) => {
    ipcRenderer.on('head-motion', (_event, data) => cb(data));
  },

  offHeadMotion: () => {
    ipcRenderer.removeAllListeners('head-motion');
  },
});
