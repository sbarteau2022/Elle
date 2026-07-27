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

  // Auto-launch at login (macOS/Windows only — { supported: false } on
  // Linux). get() reads the OS's actual login-item state; set() flips it.
  loginItem: {
    get: () => ipcRenderer.invoke('login-item:get'),
    set: (enable) => ipcRenderer.invoke('login-item:set', !!enable),
  },

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

  // Integrated terminal — real shells, the way an IDE has them. create()
  // returns { id, shell, cwd, pty }: `pty` false means node-pty didn't build
  // here and the session is piped (line-oriented commands only), which the
  // terminal panel surfaces rather than hides. Output arrives on onData;
  // onExit fires once when the shell ends. Both listeners are per-session
  // filtered here so one terminal tab never sees another's bytes.
  terminal: {
    create: (opts) => ipcRenderer.invoke('terminal:create', opts || {}),
    write: (id, data) => ipcRenderer.invoke('terminal:write', String(id), String(data)),
    resize: (id, cols, rows) => ipcRenderer.invoke('terminal:resize', String(id), cols | 0, rows | 0),
    kill: (id) => ipcRenderer.invoke('terminal:kill', String(id)),
    list: () => ipcRenderer.invoke('terminal:list'),
    // Returns an unsubscribe fn — panels must call it on unmount, or a
    // remounted tab stacks duplicate handlers and doubles every keystroke.
    onData: (id, cb) => {
      const h = (_e, sid, data) => { if (sid === id) cb(data); };
      ipcRenderer.on('terminal:data', h);
      return () => ipcRenderer.removeListener('terminal:data', h);
    },
    onExit: (id, cb) => {
      const h = (_e, sid, code) => { if (sid === id) cb(code); };
      ipcRenderer.on('terminal:exit', h);
      return () => ipcRenderer.removeListener('terminal:exit', h);
    },
  },

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
