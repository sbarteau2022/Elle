'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const lh = require('./lane-handshake.cjs');
const rb = require('./rosen-bridge.cjs');

const hex = (u) => Buffer.from(u).toString('hex');

// ── THE cross-runtime byte-parity proof ───────────────────────────────────────
// This is the identical hex the worker's src/lane-handshake.test.ts asserts from
// the SAME fixed inputs. deriveLaneRoot is deterministic (the KEM randomness is
// upstream), so both runtimes reproducing this exact value is the proof that the
// combiner — transcript + HKDF over ss ‖ preshared — is bit-for-bit identical
// across workerd and Node. If this ever diverges, the two ends can no longer
// derive a shared lane root and v2 must NOT be relied on. Keep the two in lockstep.
const KAT_ROOT = '8a9ade83ccae5ba3fbe95446854706d163844c7895d278ec6d599d4aecf2af32';

test('deriveLaneRoot reproduces the canonical cross-runtime vector', async () => {
  const preshared = new Uint8Array(32).fill(0x01);
  const ss = new Uint8Array(32).fill(0x02);
  const pk = { profile: 'vetted', mlkem: Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]), x25519: Uint8Array.from([9, 10, 11, 12]) };
  const ct = { profile: 'vetted', mlkem: Uint8Array.from([13, 14, 15, 16]), epk: Uint8Array.from([17, 18, 19, 20]) };
  const root = await lh.deriveLaneRoot(preshared, ss, 'alpha:to_local', 7, pk, ct);
  assert.equal(hex(root), KAT_ROOT);
});

test('the two-role hybrid handshake agrees on one root_lane', async () => {
  const preshared = crypto.getRandomValues(new Uint8Array(32));
  const client = await lh.laneHandshakeClientKeys();
  const { ciphertext, rootLane: workerRoot } = await lh.laneHandshakeAccept(preshared, 'beta:to_cloud', 3, client.publicKey);
  const clientRoot = await lh.laneHandshakeClientFinish(preshared, 'beta:to_cloud', 3, client, ciphertext);
  assert.equal(hex(workerRoot), hex(clientRoot));
});

test('the ACCEPT carries a real ML-KEM ciphertext + fresh X25519 ephemeral', async () => {
  const preshared = crypto.getRandomValues(new Uint8Array(32));
  const client = await lh.laneHandshakeClientKeys();
  const { ciphertext } = await lh.laneHandshakeAccept(preshared, 'l', 1, client.publicKey);
  assert.ok(ciphertext.mlkem.length > 1000); // ML-KEM-768 ciphertext ≈ 1088 bytes
  assert.equal(ciphertext.epk.length, 32);
});

test('the derived root drives a working v2 lane channel (seal -> open)', async () => {
  const preshared = crypto.getRandomValues(new Uint8Array(32));
  const client = await lh.laneHandshakeClientKeys();
  const { ciphertext, rootLane } = await lh.laneHandshakeAccept(preshared, 'alpha:to_local', 9, client.publicKey);
  const peerRoot = await lh.laneHandshakeClientFinish(preshared, 'alpha:to_local', 9, client, ciphertext);
  const chSend = await lh.laneChannelV2(rootLane);
  const chRecv = await lh.laneChannelV2(peerRoot);
  const job = { kind: 'exec', code: 'print(42)' };
  const sealed = await rb.sealForLane(chSend, rb.laneChannelStart(chSend), job);
  const opened = await rb.openFromLane(chRecv, rb.laneChannelStart(chRecv), sealed.wire, 8);
  assert.deepEqual(opened.payload, job);
});

test('a different pre-shared secret yields a different root_lane', async () => {
  const client = await lh.laneHandshakeClientKeys();
  const p1 = crypto.getRandomValues(new Uint8Array(32));
  const p2 = crypto.getRandomValues(new Uint8Array(32));
  const { ciphertext, rootLane: r1 } = await lh.laneHandshakeAccept(p1, 'l', 1, client.publicKey);
  const r2 = await lh.laneHandshakeClientFinish(p2, 'l', 1, client, ciphertext);
  assert.notEqual(hex(r1), hex(r2));
});

test('a tampered ACCEPT ciphertext cannot reproduce the root', async () => {
  const preshared = crypto.getRandomValues(new Uint8Array(32));
  const client = await lh.laneHandshakeClientKeys();
  const { ciphertext, rootLane } = await lh.laneHandshakeAccept(preshared, 'l', 1, client.publicKey);
  const tampered = { ...ciphertext, mlkem: Uint8Array.from(ciphertext.mlkem) };
  tampered.mlkem[0] ^= 1;
  const guess = await lh.laneHandshakeClientFinish(preshared, 'l', 1, client, tampered);
  assert.notEqual(hex(guess), hex(rootLane));
});

test('HELLO / ACCEPT wire bodies round-trip through (de)serialization', async () => {
  const preshared = crypto.getRandomValues(new Uint8Array(32));
  const client = await lh.laneHandshakeClientKeys();
  const hello = lh.decodeHelloPub(lh.encodeHello('alpha:to_local', 5, client.publicKey));
  assert.equal(hex(hello.mlkem), hex(client.publicKey.mlkem));
  const { ciphertext, rootLane } = await lh.laneHandshakeAccept(preshared, 'l', 2, hello);
  const ct = lh.decodeAcceptCt(lh.encodeAccept(ciphertext));
  const r = await lh.laneHandshakeClientFinish(preshared, 'l', 2, client, ct);
  assert.equal(hex(r), hex(rootLane));
});
