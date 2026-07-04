'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// The renderer's bridge to native capabilities. Voice (TTS/STT) runs on the
// Web Speech + Web Audio APIs inside Chromium and needs no bridge — Bluetooth
// headphones are just the OS default audio device, so speaking and listening
// route through connected AirPods automatically. What DOES need the bridge:
// anything OS-native (head motion today), and the permission grants — main
// default-denies every Chromium permission request, and only an explicit
// user click in the workbench, relayed through setPermission, opens the mic.
contextBridge.exposeInMainWorld('elleNative', {
  isElectron: true,

  // { platform, headMotion, ... } — the live native capability map.
  getCapabilities: () => ipcRenderer.invoke('native:capabilities'),

  // Relay the user's consent decision to the main-process permission policy.
  // name: 'microphone' | 'camera'. Returns the full grants map.
  setPermission: (name, allow) => ipcRenderer.invoke('permissions:set', String(name), !!allow),
  getPermissions: () => ipcRenderer.invoke('permissions:get'),

  // AirPods (H2+) head pose via CMHeadphoneMotionManager. cb receives
  // { pitch, roll, yaw } in radians. Present only when capabilities.headMotion
  // is true (addon built, macOS 11+, AirPods Pro connected).
  onHeadMotion: (cb) => {
    ipcRenderer.on('head-motion', (_event, data) => cb(data));
  },
  offHeadMotion: () => {
    ipcRenderer.removeAllListeners('head-motion');
  },

  // Back-compat convenience for existing callers (usePresence) — equivalent
  // to (await getCapabilities()).headMotion.
  headMotionAvailable: async () => {
    const caps = await ipcRenderer.invoke('native:capabilities');
    return !!caps.headMotion;
  },
});
