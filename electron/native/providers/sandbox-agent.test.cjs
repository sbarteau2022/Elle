'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const agent = require('./sandbox-agent.cjs');
const lh = require('./lane-handshake.cjs');
const rb = require('./rosen-bridge.cjs');

test('config: builds poll/submit URLs from an https worker origin, trailing slash trimmed', () => {
  const cfg = agent.config({ key: 'a b&c', workerUrl: 'https://example.workers.dev/' });
  assert.equal(cfg.key, 'a b&c');
  assert.equal(cfg.pollUrl, 'https://example.workers.dev/api/sandbox-bus/poll');
  assert.equal(cfg.submitUrl, 'https://example.workers.dev/api/sandbox-bus/submit');
});

test('config: http origin stays http (no socket to upgrade to wss anymore), trailing slashes trimmed', () => {
  const cfg = agent.config({ key: 'k', workerUrl: 'http://localhost:8787///' });
  assert.equal(cfg.pollUrl, 'http://localhost:8787/api/sandbox-bus/poll');
  assert.equal(cfg.submitUrl, 'http://localhost:8787/api/sandbox-bus/submit');
});

test('config: falls back to the deployed worker default when no origin given', () => {
  const prev = { ELLE_WORKER_URL: process.env.ELLE_WORKER_URL, VITE_ELLE_WORKER_URL: process.env.VITE_ELLE_WORKER_URL };
  delete process.env.ELLE_WORKER_URL;
  delete process.env.VITE_ELLE_WORKER_URL;
  try {
    const cfg = agent.config({ key: 'k' });
    assert.equal(cfg.pollUrl, 'https://elle-worker.sbarteau2022.workers.dev/api/sandbox-bus/poll');
  } finally {
    if (prev.ELLE_WORKER_URL !== undefined) process.env.ELLE_WORKER_URL = prev.ELLE_WORKER_URL;
    if (prev.VITE_ELLE_WORKER_URL !== undefined) process.env.VITE_ELLE_WORKER_URL = prev.VITE_ELLE_WORKER_URL;
  }
});

test('config: an unset key still builds URLs (start() is what refuses to poll)', () => {
  const prev = process.env.ELLE_SANDBOX_KEY;
  delete process.env.ELLE_SANDBOX_KEY;
  try {
    const cfg = agent.config({ workerUrl: 'https://x.dev' });
    assert.equal(cfg.key, '');
    assert.equal(cfg.pollUrl, 'https://x.dev/api/sandbox-bus/poll');
  } finally {
    if (prev !== undefined) process.env.ELLE_SANDBOX_KEY = prev;
  }
});

test('config: lanes default to ["primary"], or split from a comma-separated list', () => {
  assert.deepEqual(agent.config({ key: 'k', workerUrl: 'https://x.dev' }).lanes, ['primary']);
  assert.deepEqual(agent.config({ key: 'k', workerUrl: 'https://x.dev', lanes: 'alpha, beta ,, ' }).lanes, ['alpha', 'beta']);
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

// ── PQC v2: the hybrid lane handshake, this agent's initiator half ──────────

test('laptopWantsV2: follows the worker advertisement, honors the v1 rollback lever', () => {
  const prev = process.env.ELLE_LANE_PROTOCOL;
  try {
    delete process.env.ELLE_LANE_PROTOCOL;
    assert.equal(agent.laptopWantsV2({ supported: [1, 2] }), true);
    assert.equal(agent.laptopWantsV2({ supported: [1] }), false);   // worker v2 off
    assert.equal(agent.laptopWantsV2(null), false);
    process.env.ELLE_LANE_PROTOCOL = 'v1';
    assert.equal(agent.laptopWantsV2({ supported: [1, 2] }), false); // forced v1 even if offered
  } finally {
    if (prev === undefined) delete process.env.ELLE_LANE_PROTOCOL; else process.env.ELLE_LANE_PROTOCOL = prev;
  }
});

test('planHandshake: established at the worker epoch ⇒ no handshake', () => {
  const plan = agent.planHandshake({ v2: true, epoch: 3 }, { epoch: 3 }, { epoch: 3 }, 3);
  assert.equal(plan.handshake, false);
  assert.equal(plan.epoch, 3);
});

test('planHandshake: first contact (worker has no roots) ⇒ handshake at epoch 1', () => {
  const plan = agent.planHandshake({ v2: false, epoch: 0 }, null, null, 0);
  assert.equal(plan.handshake, true);
  assert.equal(plan.epoch, 1);
});

test('planHandshake: out of sync ⇒ a strictly-newer epoch than anyone has seen', () => {
  // worker advertises epoch 5, our counter is 4, a stale root sits at 5 → next is 6
  const plan = agent.planHandshake({ v2: true, epoch: 5 }, { epoch: 5 }, { epoch: 4 }, 4);
  assert.equal(plan.handshake, true);
  assert.equal(plan.epoch, 6);
});

test('performHandshake: the initiator derives the SAME roots as the (ported) worker responder, and a v2 channel round-trips', async () => {
  const preshared = crypto.getRandomValues(new Uint8Array(32));
  const lane = 'primary', epoch = 7;
  const workerRoots = {}; // what the responder derived, keyed by channel id

  // `post` stands in for POST /api/sandbox-bus/handshake: the worker responder,
  // whose role rosen-bridge's sibling lane-handshake.cjs also ports.
  const post = async (hellos) => {
    assert.equal(hellos.length, 2);
    return Promise.all(hellos.map(async (hello) => {
      const pub = lh.decodeHelloPub(hello);
      const { ciphertext, rootLane } = await lh.laneHandshakeAccept(preshared, hello.lane, hello.epoch, pub);
      workerRoots[hello.lane] = rootLane;
      return lh.encodeAccept(ciphertext);
    }));
  };

  const roots = await agent.performHandshake(preshared, lane, epoch, post);

  for (const d of ['to_local', 'to_cloud']) {
    const laptopRoot = roots[d];
    const workerRoot = workerRoots[`${lane}:${d}`];
    assert.ok(laptopRoot && workerRoot, `both sides produced a root for ${d}`);
    assert.equal(Buffer.from(laptopRoot).toString('hex'), Buffer.from(workerRoot).toString('hex'),
      `laptop and worker agree on root_lane for ${d}`);

    // the agreed root drives a working v2 lane channel across the two sides
    const chWorker = await lh.laneChannelV2(workerRoot);
    const chLaptop = await lh.laneChannelV2(laptopRoot);
    const job = { kind: 'exec', code: 'print(7)' };
    const sealed = await rb.sealForLane(chWorker, rb.laneChannelStart(chWorker), job);
    const opened = await rb.openFromLane(chLaptop, rb.laneChannelStart(chLaptop), sealed.wire, 8);
    assert.deepEqual(opened.payload, job);
  }
});

test('performHandshake: a wrong-length ACCEPT batch is rejected, not silently used', async () => {
  const preshared = crypto.getRandomValues(new Uint8Array(32));
  await assert.rejects(
    () => agent.performHandshake(preshared, 'primary', 1, async () => [{ v: 2 }]), // only one accept for two hellos
    /expected 2 accepts/,
  );
});
