'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// The renderer's bridge to native capabilities. Voice (TTS/STT) runs on the
// Web Speech + Web Audio APIs inside Chromium and needs no bridge — Bluetooth
// headphones are just the OS default audio device, so speaking and listening
// route through connected AirPods automatically. What DOES need the bridge is
// anything OS-native — today that's head motion. `getCapabilities` exposes
// the full native capability map (see electron/native) so the renderer never
// hardcodes "macOS-only" assumptions; it just asks what's live.
contextBridge.exposeInMainWorld('elleNative', {
  isElectron: true,

  // { platform, headMotion, ... } — the live native capability map.
  getCapabilities: () => ipcRenderer.invoke('native:capabilities'),

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
