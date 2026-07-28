'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const term = require('./terminal.cjs');

const { defaultShell, shellArgs, sessionEnv, resolveCwd } = term;

test('defaultShell: honours $SHELL, falls back per platform', () => {
  assert.equal(defaultShell('darwin', { SHELL: '/opt/homebrew/bin/fish' }), '/opt/homebrew/bin/fish');
  assert.equal(defaultShell('darwin', {}), '/bin/zsh');
  assert.equal(defaultShell('linux', {}), '/bin/bash');
});

test('defaultShell: Windows uses COMSPEC, never $SHELL', () => {
  assert.equal(defaultShell('win32', { COMSPEC: 'C:\\Windows\\System32\\cmd.exe' }), 'C:\\Windows\\System32\\cmd.exe');
  // A stray $SHELL (git-bash leaves one) must not become the Windows shell.
  assert.equal(defaultShell('win32', { SHELL: '/usr/bin/bash' }), 'cmd.exe');
});

test('shellArgs: login shell under a pty, interactive when piped', () => {
  // -l is what makes PATH match the user's real terminal.
  assert.deepEqual(shellArgs('darwin', true), ['-l']);
  assert.deepEqual(shellArgs('linux', false), ['-i']);
  // cmd.exe takes neither.
  assert.deepEqual(shellArgs('win32', true), []);
  assert.deepEqual(shellArgs('win32', false), []);
});

test('sessionEnv: TERM tells the truth about what the shell is attached to', () => {
  assert.equal(sessionEnv({}, true).TERM, 'xterm-256color');
  assert.equal(sessionEnv({}, false).TERM, 'dumb');
  assert.equal(sessionEnv({}, true).ELLE_TERMINAL, '1');
});

test('sessionEnv: copies rather than mutates the process environment', () => {
  const base = { PATH: '/usr/bin', TERM: 'screen' };
  const env = sessionEnv(base, true);
  assert.equal(env.PATH, '/usr/bin');
  assert.equal(base.TERM, 'screen', 'the caller env must be left alone');
  assert.equal(base.ELLE_TERMINAL, undefined);
});

test('resolveCwd: a bad or missing cwd lands in home, never throws', () => {
  const exists = (p) => p === '/work/elle';
  assert.equal(resolveCwd('/work/elle', '/home/s', exists), '/work/elle');
  assert.equal(resolveCwd('/gone', '/home/s', exists), '/home/s');
  assert.equal(resolveCwd(undefined, '/home/s', exists), '/home/s');
  assert.equal(resolveCwd('', '/home/s', exists), '/home/s');
  assert.equal(resolveCwd(42, '/home/s', exists), '/home/s');
});

test('provider shape: registers cross-platform and reports its backend', () => {
  assert.equal(term.id, 'terminal');
  assert.deepEqual(term.platforms.sort(), ['darwin', 'linux', 'win32']);
  assert.equal(term.available, true);
  assert.equal(typeof term.ptyBacked(), 'boolean');
});

test('write/resize/kill on an unknown session are silent no-ops', () => {
  // The renderer can race a session's exit; none of these may throw.
  assert.doesNotThrow(() => term.write('nope', 'ls\n'));
  assert.doesNotThrow(() => term.resize('nope', 80, 24));
  assert.doesNotThrow(() => term.kill('nope'));
  assert.deepEqual(term.list(), []);
});
