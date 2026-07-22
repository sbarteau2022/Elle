'use strict';
// ============================================================
// Auto-launch at login — wires Elle to open automatically when you log into
// this machine, so the connect-back sandbox agent (main.cjs's
// sandboxAgent.start(), which only runs once the app itself is running) is
// actually live without anyone remembering to open the app by hand.
//
// Electron's app.setLoginItemSettings() persists this at the OS level
// itself — a Login Items entry on macOS, a registry Run key on Windows —
// so there is no separate on/off flag to keep in sync here. Linux has no
// equivalent through Electron; this degrades to "unsupported" there rather
// than pretending to work.
//
// Defaults ON exactly once: a marker file under userData records that we've
// already made that call, so a user who deliberately turns it back off
// (through the workbench toggle, or the OS's own login items UI) stays off
// across restarts instead of being silently re-enabled every launch.
// ============================================================
const fs = require('fs');
const path = require('path');

function supported(platform = process.platform) {
  return platform === 'darwin' || platform === 'win32';
}

function electronApp() {
  try { return require('electron').app; } catch { return null; }
}

function markerFile(app) {
  return path.join(app.getPath('userData'), '.auto-launch-set');
}

function get(app = electronApp(), platform = process.platform) {
  if (!supported(platform) || !app) return { supported: false, openAtLogin: false };
  return { supported: true, openAtLogin: !!app.getLoginItemSettings().openAtLogin };
}

function set(enable, app = electronApp(), platform = process.platform) {
  if (!supported(platform) || !app) return { supported: false, openAtLogin: false };
  app.setLoginItemSettings({ openAtLogin: !!enable, openAsHidden: false });
  try { fs.writeFileSync(markerFile(app), String(Date.now())); } catch { /* best effort */ }
  return get(app, platform);
}

function ensureDefaultOn(app = electronApp(), platform = process.platform) {
  if (!supported(platform) || !app) return get(app, platform);
  if (fs.existsSync(markerFile(app))) return get(app, platform);
  return set(true, app, platform);
}

module.exports = { supported, get, set, ensureDefaultOn };
