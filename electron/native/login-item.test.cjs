'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { supported, get, set, ensureDefaultOn } = require('./login-item.cjs');

function fakeApp(dir) {
  let openAtLogin = false;
  return {
    getPath: () => dir,
    getLoginItemSettings: () => ({ openAtLogin }),
    setLoginItemSettings: (opts) => { openAtLogin = !!opts.openAtLogin; },
  };
}

test('supported: macOS and Windows only', () => {
  assert.equal(supported('darwin'), true);
  assert.equal(supported('win32'), true);
  assert.equal(supported('linux'), false);
});

test('get/set: unsupported platform never touches the app', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'elle-login-item-'));
  const app = fakeApp(dir);
  assert.deepEqual(get(app, 'linux'), { supported: false, openAtLogin: false });
  assert.deepEqual(set(true, app, 'linux'), { supported: false, openAtLogin: false });
  assert.equal(fs.existsSync(path.join(dir, '.auto-launch-set')), false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('set: flips the OS setting and drops the marker file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'elle-login-item-'));
  const app = fakeApp(dir);
  assert.deepEqual(get(app, 'darwin'), { supported: true, openAtLogin: false });
  assert.deepEqual(set(true, app, 'darwin'), { supported: true, openAtLogin: true });
  assert.equal(fs.existsSync(path.join(dir, '.auto-launch-set')), true);
  assert.deepEqual(set(false, app, 'darwin'), { supported: true, openAtLogin: false });
  fs.rmSync(dir, { recursive: true, force: true });
});

test('ensureDefaultOn: turns it on exactly once, then leaves later state alone', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'elle-login-item-'));
  const app = fakeApp(dir);
  assert.deepEqual(ensureDefaultOn(app, 'win32'), { supported: true, openAtLogin: true });
  // the user turns it back off — a second ensureDefaultOn (e.g. next launch)
  // must not flip it back on, because the marker file already exists.
  set(false, app, 'win32');
  assert.deepEqual(ensureDefaultOn(app, 'win32'), { supported: true, openAtLogin: false });
  fs.rmSync(dir, { recursive: true, force: true });
});
