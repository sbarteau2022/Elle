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

  // Local embed — bge-large-en-v1.5 via Ollama, the SAME weights the worker's
  // Workers AI embedder runs, so vectors from this machine live in the same
  // 1024-dim space as the whole corpus. Returns { ok, vector, model } or
  // { ok:false, error } with a precise diagnosis (model not pulled, wrong
  // dims, Ollama down) — the intake helper falls back to server-side
  // embedding on any failure, and the failure is never silent.
  embedLocal: (text) => ipcRenderer.invoke('local-embed:text', String(text || '')),

  // Sovereign dynamic KV cache — the local-model working-set cache. Inert in
  // the hosted build (every call resolves to a no-op/empty result); live only
  // when running sovereign. The local-model orchestration uses these to size
  // the memory pull to the turn and reuse an assembled set across a session.
  sovereignKv: {
    budget: (query) => ipcRenderer.invoke('sovereign:kv-budget', String(query || '')),
    get: (sessionId, query) => ipcRenderer.invoke('sovereign:kv-get', sessionId, String(query || '')),
    put: (sessionId, query, text) => ipcRenderer.invoke('sovereign:kv-put', sessionId, String(query || ''), String(text || '')),
    invalidate: (sessionId) => ipcRenderer.invoke('sovereign:kv-invalidate', sessionId),
    stats: (sessionId) => ipcRenderer.invoke('sovereign:kv-stats', sessionId),
  },
});
