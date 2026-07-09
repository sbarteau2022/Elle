'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const agent = require('./sandbox-agent.cjs');

test('config: builds a wss URL from an https worker origin, key url-encoded', () => {
  const cfg = agent.config({ key: 'a b&c', workerUrl: 'https://example.workers.dev/' });
  assert.equal(cfg.key, 'a b&c');
  assert.equal(cfg.wsUrl, 'wss://example.workers.dev/api/sandbox-agent/connect?key=a%20b%26c');
});

test('config: http origin becomes ws, trailing slashes trimmed', () => {
  const cfg = agent.config({ key: 'k', workerUrl: 'http://localhost:8787///' });
  assert.equal(cfg.wsUrl, 'ws://localhost:8787/api/sandbox-agent/connect?key=k');
});

test('config: falls back to the deployed worker default when no origin given', () => {
  const prev = { ELLE_WORKER_URL: process.env.ELLE_WORKER_URL, VITE_ELLE_WORKER_URL: process.env.VITE_ELLE_WORKER_URL };
  delete process.env.ELLE_WORKER_URL;
  delete process.env.VITE_ELLE_WORKER_URL;
  try {
    const cfg = agent.config({ key: 'k' });
    assert.match(cfg.wsUrl, /^wss:\/\/elle-worker\.sbarteau2022\.workers\.dev\/api\/sandbox-agent\/connect\?key=k$/);
  } finally {
    if (prev.ELLE_WORKER_URL !== undefined) process.env.ELLE_WORKER_URL = prev.ELLE_WORKER_URL;
    if (prev.VITE_ELLE_WORKER_URL !== undefined) process.env.VITE_ELLE_WORKER_URL = prev.VITE_ELLE_WORKER_URL;
  }
});

test('config: an unset key still builds a URL (start() is what refuses to connect)', () => {
  const prev = process.env.ELLE_SANDBOX_KEY;
  delete process.env.ELLE_SANDBOX_KEY;
  try {
    const cfg = agent.config({ workerUrl: 'https://x.dev' });
    assert.equal(cfg.key, '');
    assert.equal(cfg.wsUrl, 'wss://x.dev/api/sandbox-agent/connect?key=');
  } finally {
    if (prev !== undefined) process.env.ELLE_SANDBOX_KEY = prev;
  }
});

test('commandFor: shell mode on this platform', () => {
  const c = agent.commandFor({ mode: 'shell', command: 'echo hi' });
  assert.equal(c.ext, null);
  if (process.platform === 'win32') {
    assert.deepEqual(c.args, ['/c', 'echo hi']);
  } else {
    assert.equal(c.bin, '/bin/sh');
    assert.deepEqual(c.args, ['-c', 'echo hi']);
  }
});

test('commandFor: code mode defaults to python when no language given', () => {
  const c = agent.commandFor({ mode: 'code', code: 'print(1)' });
  assert.equal(c.ext, '.py');
});

test('commandFor: javascript/js/node all map to a node runner with ELECTRON_RUN_AS_NODE', () => {
  for (const lang of ['javascript', 'js', 'node']) {
    const c = agent.commandFor({ mode: 'code', language: lang, code: '1' });
    assert.equal(c.ext, '.mjs');
    assert.equal(c.electronRunAsNode, true);
  }
});

test('commandFor: typescript runs via npx tsx', () => {
  const c = agent.commandFor({ mode: 'code', language: 'ts', code: '1' });
  assert.equal(c.ext, '.ts');
  assert.deepEqual(c.args, ['-y', 'tsx']);
});

test('commandFor: an unknown language is refused, not guessed at', () => {
  assert.equal(agent.commandFor({ mode: 'code', language: 'rust', code: 'fn main(){}' }), null);
});

test('walkFiles: skips node_modules/.git/dist and dotfiles, keeps .env.example', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sandbox-agent-test-'));
  try {
    fs.mkdirSync(path.join(dir, 'node_modules'));
    fs.writeFileSync(path.join(dir, 'node_modules', 'x.js'), '1');
    fs.mkdirSync(path.join(dir, 'src'));
    fs.writeFileSync(path.join(dir, 'src', 'index.ts'), 'export {}');
    fs.writeFileSync(path.join(dir, '.env'), 'SECRET=1');
    fs.writeFileSync(path.join(dir, '.env.example'), 'SECRET=');
    fs.writeFileSync(path.join(dir, 'README.md'), '# hi');

    const files = agent.walkFiles(dir).map((f) => f.rel).sort();
    assert.deepEqual(files, ['.env.example', 'README.md', 'src/index.ts']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('walkFiles: a single file target returns just that file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sandbox-agent-test-'));
  try {
    const f = path.join(dir, 'solo.py');
    fs.writeFileSync(f, 'print(1)');
    const files = agent.walkFiles(f);
    assert.equal(files.length, 1);
    assert.equal(files[0].abs, f);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('walkFiles: a missing path throws rather than silently returning nothing', () => {
  assert.throws(() => agent.walkFiles('/no/such/path/at/all'), /no such path/);
});
