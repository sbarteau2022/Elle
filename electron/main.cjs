'use strict';

// FIRST, before anything reads process.env: lay the repo's .env under the
// environment. Vite loads .env for the renderer only (and only VITE_* keys);
// the native providers below run HERE in the main process, so without this
// an ELLE_SANDBOX_KEY sitting in .env was invisible to the sandbox agent and
// the sovereign duplex — "idle, key not set", path never opens.
require('./native/load-env.cjs').loadDotEnv();

const { app, BrowserWindow, ipcMain, session, shell } = require('electron');
const path = require('path');
const native = require('./native/index.cjs');
const loginItem = require('./native/login-item.cjs');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// The renderer asks what's actually available on this machine instead of
// guessing from platform — one capability map (native/index.cjs), easy to
// extend as more native features land.
ipcMain.handle('native:capabilities', () => native.getCapabilities());

// ── sovereign dynamic KV cache (local model only) ──────────────────────────
// The renderer / local-model orchestration drives the working-set cache over
// these channels. Every handler is inert unless the build is running sovereign
// (see native/providers/sovereign-kv-cache.cjs) — in the hosted build the
// worker's own KV cache does this job, so these no-op. Recall stays caller-side
// (the renderer supplies the assembled text via put), matching the worker's
// injected-recall seam across the IPC boundary.
const sovKv = native.getProvider('sovereignKvCache');
ipcMain.handle('sovereign:kv-budget', (_e, query) => sovKv ? sovKv.dynamicBudget(query) : 0);
ipcMain.handle('sovereign:kv-get', (_e, sessionId, query) => sovKv ? sovKv.getCached(sessionId, query) : null);
ipcMain.handle('sovereign:kv-put', (_e, sessionId, query, text) => sovKv ? sovKv.putCached(sessionId, query, text) : undefined);
ipcMain.handle('sovereign:kv-invalidate', (_e, sessionId) => sovKv ? sovKv.invalidateWorkingSet(sessionId) : undefined);
ipcMain.handle('sovereign:kv-stats', (_e, sessionId) => sovKv ? sovKv.stats(sessionId) : { sovereign: false, entries: 0 });

// ── local embed (bge-large via Ollama — same weights as the worker) ────────
// The multimodal intake lane's embedding step. Renderer sends text, gets a
// 1024-dim vector or a precise error; the renderer's intake helper decides
// whether to fall back to server-side embedding. No Ollama → clean error,
// never a hang (30s timeout inside the provider).
const localEmbed = native.getProvider('localEmbed');
ipcMain.handle('local-embed:text', (_e, text) =>
  localEmbed ? localEmbed.embedText(String(text || '')) : { ok: false, error: 'local embed provider unavailable' });

// ── device permissions: deny by default, granted only by the user ──────────
// Electron's default permission handler GRANTS everything, silently. That is
// the opposite of "permissioned, never auto accept", so we replace it: every
// Chromium permission request is denied unless the user has explicitly
// clicked allow in the workbench's PermissionGate, which lands here over IPC.
// The grants live in the main process on purpose — renderer code (or anything
// injected into it) cannot flip them without going through this channel, and
// they reset to denied on every launch until the renderer re-asserts a
// consent the user actually gave.
const grants = { microphone: false, camera: false };

ipcMain.handle('permissions:set', (_e, name, allow) => {
  if (Object.prototype.hasOwnProperty.call(grants, name)) grants[name] = !!allow;
  return { ...grants };
});
ipcMain.handle('permissions:get', () => ({ ...grants }));

// ── auto-launch at login ────────────────────────────────────────────────
// Reflects and flips the OS-level login item (see native/login-item.cjs).
// { supported: false, openAtLogin: false } on platforms Electron can't do
// this on (Linux) — the toggle just hides itself in that case.
ipcMain.handle('login-item:get', () => loginItem.get());
ipcMain.handle('login-item:set', (_e, enable) => loginItem.set(!!enable));

// Map Chromium's permission vocabulary onto our two grants. Returns null for
// permissions that aren't media at all (handled separately below).
function mediaAllowed(permission, details) {
  if (permission === 'microphone' || permission === 'audioCapture') return grants.microphone;
  if (permission === 'camera' || permission === 'videoCapture') return grants.camera;
  if (permission === 'media') {
    const types = (details && (details.mediaTypes || (details.mediaType ? [details.mediaType] : []))) || [];
    if (!types.length) return grants.microphone || grants.camera;
    return types.every((t) =>
      t === 'audio' ? grants.microphone : t === 'video' ? grants.camera : false
    );
  }
  return null;
}

function installPermissionPolicy(ses) {
  ses.setPermissionRequestHandler((_wc, permission, callback, details) => {
    const media = mediaAllowed(permission, details);
    if (media !== null) return callback(media);
    // The copy button writes to the clipboard from a user click — allow that
    // one; everything else (notifications, geolocation, midi, …) is denied.
    if (permission === 'clipboard-sanitized-write') return callback(true);
    callback(false);
  });
  ses.setPermissionCheckHandler((_wc, permission, _origin, details) => {
    const media = mediaAllowed(permission, details);
    if (media !== null) return media;
    if (permission === 'clipboard-sanitized-write') return true;
    return false;
  });
}

// Lock the privileged window to its own content. The renderer holds the
// preload bridge (native capabilities + permission grants) and IPC, so it
// must never become attacker-controlled web content. Two Electron-security-
// checklist guards:
//   • window.open / target=_blank → DENY a new Electron window (which would
//     not inherit the secure webPreferences); http(s) links open in the OS
//     browser instead, everything else is dropped.
//   • navigation away from the app's own origin (the Vite dev server, or the
//     file:// bundle) is refused — a stray or injected link can't steer the
//     main frame onto a remote page that then holds the bridge.
function hardenNavigation(win) {
  const wc = win.webContents;
  wc.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });
  const allowedOrigin = isDev ? 'http://localhost:5173' : 'file://';
  wc.on('will-navigate', (event, url) => {
    if (!url.startsWith(allowedOrigin)) event.preventDefault();
  });
  // Same rule for sub-frames / redirects.
  wc.on('will-redirect', (event, url) => {
    if (!url.startsWith(allowedOrigin)) event.preventDefault();
  });
  wc.on('will-attach-webview', (event) => event.preventDefault()); // no <webview> at all
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f0f1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  hardenNavigation(win);

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  const headMotion = native.getProvider('headMotion');
  if (headMotion) {
    headMotion.start((data) => {
      if (!win.isDestroyed()) {
        win.webContents.send('head-motion', data);
      }
    });
  }

  return win;
}

app.whenReady().then(() => {
  installPermissionPolicy(session.defaultSession);
  createWindow();

  // First launch on this machine only: turn on "open at login" so the
  // sandbox agent below is actually live without opening the app by hand.
  // A no-op on Linux (unsupported) and a no-op on every later launch (the
  // marker file is already there) — see native/login-item.cjs.
  loginItem.ensureDefaultOn();

  // Elle's hands on this box: dial the connect-back sandbox UP to the worker.
  // Idle unless ELLE_SANDBOX_KEY is set (and matches the worker's
  // SANDBOX_AGENT_KEY). Lives for the whole app session, not per-window, so it
  // is stopped only on quit — not when a window closes.
  native.getProvider('sandboxAgent')?.start();

  // The sovereign half of the duplex channel: the local 7B (Ollama), woken on
  // an interval, speaking to the cloud half on the immutable ledger. Same
  // shared secret as the sandbox agent; idle without it (or without Ollama).
  native.getProvider('sovereignDuplex')?.start();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

function cleanupNative() {
  native.getProvider('headMotion')?.stop();
}

app.on('window-all-closed', () => {
  cleanupNative();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  cleanupNative();
  native.getProvider('sandboxAgent')?.stop();
  native.getProvider('sovereignDuplex')?.stop();
});
