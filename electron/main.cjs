'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const native = require('./native');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// The renderer asks what's actually available on this machine instead of
// guessing from platform — one capability map (native/index.cjs), easy to
// extend as more native features land.
ipcMain.handle('native:capabilities', () => native.getCapabilities());

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
  createWindow();

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

app.on('before-quit', cleanupNative);
