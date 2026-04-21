'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let motionAddon = null;
try {
  motionAddon = require('./addons/headphone-motion/build/Release/headphone_motion');
} catch {
  // addon not built yet or not on macOS — head motion unavailable
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

  if (motionAddon) {
    motionAddon.startMotion((data) => {
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

app.on('window-all-closed', () => {
  if (motionAddon) {
    try { motionAddon.stopMotion(); } catch { /* ignore */ }
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (motionAddon) {
    try { motionAddon.stopMotion(); } catch { /* ignore */ }
  }
});

// Unused but required to suppress Electron's default menu IPC warnings
ipcMain.on('ping', (event) => { event.reply('pong'); });
