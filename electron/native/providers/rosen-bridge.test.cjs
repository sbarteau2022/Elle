'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const rb = require('./rosen-bridge.cjs');

// Cross-runtime interop with elle-worker's src/lane-envelope.ts was verified
// manually (not in this suite, which has no dependency on the other repo at
// build time): a fixed root secret + lane sealed here opened correctly under
// elle-worker's TypeScript openFromLane (matching origin/phi0 bit-for-bit —
// Node 19+'s global crypto.subtle is the same WebCrypto standard Workers
// runs, so identical HKDF/AES-GCM/AES-CTR inputs produce identical outputs),
// and a TS-sealed reply opened correctly back here. This suite instead
// proves the port is internally self-consistent, the same way
// lane-envelope.ts's own self-test proves the TS side.

test('seal -> open round-trips real dispatch-shaped payloads in lock-step', async () => {
  const root = crypto.getRandomValues(new Uint8Array(32));
  const ch = await rb.laneChannel(root, 'alpha:to_local');
  let sender = rb.laneChannelStart(ch);
  let receiver = rb.laneChannelStart(ch);
  const jobs = [{ kind: 'exec', code: 'print(1)' }, { kind: 'exec', code: 'print(2)' }];
  for (const job of jobs) {
    const sealedOut = await rb.sealForLane(ch, sender, job);
    sender = sealedOut.next;
    const opened = await rb.openFromLane(ch, receiver, sealedOut.wire, 32);
    receiver = opened.next;
    assert.deepEqual(opened.payload, job);
  }
});

test('two lanes off the same root walk distinct geodesics', async () => {
  const root = crypto.getRandomValues(new Uint8Array(32));
  const chA = await rb.laneChannel(root, 'alpha:to_local');
  const chB = await rb.laneChannel(root, 'beta:to_local');
  const distinct = chA.origin[0] !== chB.origin[0] || chA.origin[1] !== chB.origin[1] || chA.phi0 !== chB.phi0;
  assert.equal(distinct, true);
});

test('a wire sealed on one lane does not open on another', async () => {
  const root = crypto.getRandomValues(new Uint8Array(32));
  const chA = await rb.laneChannel(root, 'alpha:to_cloud');
  const chB = await rb.laneChannel(root, 'beta:to_cloud');
  const sealedOut = await rb.sealForLane(chA, rb.laneChannelStart(chA), { probe: true });
  await assert.rejects(rb.openFromLane(chB, rb.laneChannelStart(chB), sealedOut.wire, 8));
});

test('resyncs after a run of lost messages within the forward-only window', async () => {
  const root = crypto.getRandomValues(new Uint8Array(32));
  const ch = await rb.laneChannel(root, 'alpha:to_local');
  let s5 = rb.laneChannelStart(ch);
  for (let i = 0; i < 5; i++) s5 = rb.hypAdvance(ch, s5);
  const sealedOut = await rb.sealForLane(ch, s5, { probe: true });
  const opened = await rb.openFromLane(ch, rb.laneChannelStart(ch), sealedOut.wire, 8);
  assert.equal(opened.payload.probe, true);
});

test('a wrong root secret is rejected outright', async () => {
  const root = crypto.getRandomValues(new Uint8Array(32));
  const other = crypto.getRandomValues(new Uint8Array(32));
  const ch = await rb.laneChannel(root, 'alpha:to_local');
  const chWrong = await rb.laneChannel(other, 'alpha:to_local');
  const sealedOut = await rb.sealForLane(ch, rb.laneChannelStart(ch), { x: 1 });
  await assert.rejects(rb.openFromLane(chWrong, rb.laneChannelStart(chWrong), sealedOut.wire, 8));
});

test('state encode/decode round-trips exactly (what a saved state file carries)', async () => {
  const root = crypto.getRandomValues(new Uint8Array(32));
  const ch = await rb.laneChannel(root, 'alpha:to_local');
  const s = rb.hypAdvance(ch, rb.hypAdvance(ch, rb.laneChannelStart(ch)));
  const decoded = rb.decodeState(rb.encodeState(s));
  assert.equal(decoded.tick, s.tick);
  assert.equal(decoded.point[0], s.point[0]);
  assert.equal(decoded.point[1], s.point[1]);
});
