'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const box = require('./sandbox-box.cjs');

const CFG = {
  image: 'elle-sandbox:latest', network: 'none', memory: '2g',
  cpus: '2', pids: '512', user: '1000:1000', dockerBin: 'docker',
};

test('isolationMode: defaults to docker, only explicit "none" opts out', () => {
  const prev = process.env.ELLE_SANDBOX_ISOLATION;
  try {
    delete process.env.ELLE_SANDBOX_ISOLATION;
    assert.equal(box.isolationMode(), 'docker');
    process.env.ELLE_SANDBOX_ISOLATION = 'none';
    assert.equal(box.isolationMode(), 'none');
    process.env.ELLE_SANDBOX_ISOLATION = 'NONE';
    assert.equal(box.isolationMode(), 'none');
    process.env.ELLE_SANDBOX_ISOLATION = 'docker';
    assert.equal(box.isolationMode(), 'docker');
    process.env.ELLE_SANDBOX_ISOLATION = 'garbage'; // typo → safe default
    assert.equal(box.isolationMode(), 'docker');
  } finally {
    if (prev === undefined) delete process.env.ELLE_SANDBOX_ISOLATION;
    else process.env.ELLE_SANDBOX_ISOLATION = prev;
  }
});

test('containerCommandFor: shell uses /bin/sh -c, no temp file', () => {
  const c = box.containerCommandFor({ mode: 'shell', command: 'npm test' });
  assert.equal(c.bin, '/bin/sh');
  assert.deepEqual(c.args, ['-c', 'npm test']);
  assert.equal(c.ext, null);
});

test('containerCommandFor: python is the code default, generic linux bin', () => {
  const c = box.containerCommandFor({ mode: 'code', code: 'print(1)' });
  assert.equal(c.bin, 'python3');
  assert.equal(c.ext, '.py');
});

test('containerCommandFor: js/ts map to container node/npx (not host paths)', () => {
  assert.equal(box.containerCommandFor({ mode: 'code', language: 'javascript', code: '' }).bin, 'node');
  const ts = box.containerCommandFor({ mode: 'code', language: 'typescript', code: '' });
  assert.equal(ts.bin, 'npx');
  assert.deepEqual(ts.args, ['-y', 'tsx']);
});

test('containerCommandFor: unknown language returns null', () => {
  assert.equal(box.containerCommandFor({ mode: 'code', language: 'brainfuck', code: '' }), null);
});

test('dockerRunArgs: bind-mounts the workspace at /work and nothing else of the host', () => {
  const args = box.dockerRunArgs({ bin: 'python3', args: ['/work/x.py'] }, '/Users/op/.elle/sandbox-workspace', CFG);
  const vIdx = args.indexOf('-v');
  assert.ok(vIdx !== -1, 'has a -v mount');
  assert.equal(args[vIdx + 1], '/Users/op/.elle/sandbox-workspace:/work');
  // exactly ONE mount — the host is otherwise invisible
  assert.equal(args.filter((a) => a === '-v').length, 1);
  assert.deepEqual(args.slice(-2), ['python3', '/work/x.py']);
});

test('dockerRunArgs: network denied, privileges dropped, resources capped by default', () => {
  const args = box.dockerRunArgs({ bin: '/bin/sh', args: ['-c', 'id'] }, '/root', CFG);
  const flag = (name) => args[args.indexOf(name) + 1];
  assert.equal(flag('--network'), 'none');
  assert.equal(flag('--memory'), '2g');
  assert.equal(flag('--pids-limit'), '512');
  assert.equal(flag('--user'), '1000:1000');
  assert.ok(args.includes('--cap-drop') && flag('--cap-drop') === 'ALL');
  assert.ok(args.includes('--security-opt') && flag('--security-opt') === 'no-new-privileges');
  assert.ok(args.includes('--read-only'), 'container FS is read-only');
  assert.ok(args.includes('--rm'), 'container is throwaway');
});

test('imageAvailable: reports false rather than throwing when docker/the image is unreachable', () => {
  // No real daemon in CI/this sandbox — this only asserts the probe fails
  // closed (false) instead of throwing, same contract as dockerAvailable.
  assert.equal(box.imageAvailable({ ...CFG, dockerBin: 'definitely-not-a-real-binary-xyz' }), false);
});

test('dockerRunArgs: honors an allowlisted network / custom caps when configured', () => {
  const cfg = { ...CFG, network: 'elle-allowlist', memory: '1g', cpus: '1', pids: '256', image: 'x:1' };
  const args = box.dockerRunArgs({ bin: 'node', args: [] }, '/w', cfg);
  const flag = (name) => args[args.indexOf(name) + 1];
  assert.equal(flag('--network'), 'elle-allowlist');
  assert.equal(flag('--memory'), '1g');
  assert.equal(args[args.indexOf('-w') + 1], '/work');
  // the image sits right before the inner command, which is the argv tail
  assert.equal(args[args.indexOf('x:1') + 1], 'node');
  assert.equal(args[args.length - 1], 'node');
});
