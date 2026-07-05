'use strict';

const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const native = require('./native/index.cjs');

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

  // Elle's hands on this box: dial the connect-back sandbox UP to the worker.
  // Idle unless ELLE_SANDBOX_KEY is set (and matches the worker's
  // SANDBOX_AGENT_KEY). Lives for the whole app session, not per-window, so it
  // is stopped only on quit — not when a window closes.
  native.getProvider('sandboxAgent')?.start();

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
});
