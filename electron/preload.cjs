'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// The renderer's bridge to native capabilities. Voice (TTS/STT) runs on the
// Web Speech + Web Audio APIs inside Chromium and needs no bridge — Bluetooth
// headphones are just the OS default audio device, so speaking and listening
// route through connected AirPods automatically. What DOES need the bridge is
// head motion, which only the native CoreMotion addon can read.
contextBridge.exposeInMainWorld('elleNative', {
  isElectron: true,

  // AirPods (H2+) head pose via CMHeadphoneMotionManager. cb receives
  // { pitch, roll, yaw } in radians. Present only when the addon is built on
  // macOS 11+ and AirPods Pro are connected.
  onHeadMotion: (cb) => {
    ipcRenderer.on('head-motion', (_event, data) => cb(data));
  },
  offHeadMotion: () => {
    ipcRenderer.removeAllListeners('head-motion');
  },

  // Did the native head-motion addon load? The renderer uses this to decide
  // whether presence features can light up at all.
  headMotionAvailable: () => ipcRenderer.invoke('head-motion-available'),
});
