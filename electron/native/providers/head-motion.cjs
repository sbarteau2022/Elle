'use strict';
// AirPods (H2+) head pose via CMHeadphoneMotionManager — macOS only, and only
// when the native addon has been built (see electron/addons/headphone-motion).
// Absence is normal (Windows/Linux, addon not built, no AirPods connected)
// and is reported through `available`, never thrown.
const path = require('path');

let addon = null;
try {
  addon = require(path.join(__dirname, '..', '..', 'addons', 'headphone-motion', 'build', 'Release', 'headphone_motion'));
} catch {
  // addon not built yet, or not on macOS — head motion unavailable
}

module.exports = {
  id: 'headMotion',
  platforms: ['darwin'],
  available: !!addon,
  start(onData) {
    if (!addon) return;
    addon.startMotion(onData);
  },
  stop() {
    if (!addon) return;
    try { addon.stopMotion(); } catch { /* ignore */ }
  },
};
