'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const p = require('./pqc-hybrid.cjs');
const workerVectors = require('./fixtures/pqc-interop-vectors.json');

// ============================================================
// THE CROSS-RUNTIME INTEROP TEST.
//
// rosen-bridge.test.cjs says its own interop with elle-worker was "verified
// manually (not in this suite, which has no dependency on the other repo at
// build time)". That is the gap this file closes WITHOUT reintroducing a
// build-time dependency: elle-worker's suite generates test vectors, they are
// committed here as a fixture, and we decapsulate them. If either side's
// implementation drifts — a changed HKDF label, a byte-order slip in
// packPoly, a different shake block size — the shared secrets stop matching
// and CI goes red instead of the sandbox silently going deaf in production.
//
// The reverse direction (laptop → worker) is proven by the mirror of this
// file in elle-worker: test-fixtures/pqc-interop-vectors.json is generated
// here and verified there.
// ============================================================

const eq = (a, b) => Buffer.from(a).equals(Buffer.from(b));

test('decapsulates elle-worker-generated vectors to the identical shared secret', async () => {
  assert.ok(workerVectors.vectors.length >= 2, 'fixture should cover both profiles');
  assert.match(workerVectors.origin, /elle-worker/);

  for (const v of workerVectors.vectors) {
    const { pk, sk, ct, sharedSecret } = p.importVector(v);
    const out = await p.pqcHybridDecaps(sk, pk, ct);
    assert.ok(eq(out, sharedSecret),
      `profile "${v.profile}": laptop decapsulation did not match the worker's shared secret`);
  }
});

test('the fixture covers the experimental (three-leg) profile, not just the vetted one', () => {
  const profiles = workerVectors.vectors.map((v) => v.profile).sort();
  assert.deepEqual(profiles, ['experimental', 'vetted']);
});

test('a corrupted worker vector does NOT silently produce the right secret', async () => {
  // Guards against the interop test passing vacuously — e.g. if decaps ever
  // started ignoring the ciphertext.
  const v = JSON.parse(JSON.stringify(workerVectors.vectors[0]));
  const { pk, sk, ct, sharedSecret } = p.importVector(v);
  ct.mlkem[0] ^= 1;
  const out = await p.pqcHybridDecaps(sk, pk, ct);
  assert.ok(!eq(out, sharedSecret), 'a tampered ciphertext must not yield the original secret');
});

// ── local correctness (the port is self-consistent) ─────────────────────────

test('round-trips locally on both profiles', async () => {
  for (const profile of ['vetted', 'experimental']) {
    const { publicKey, secretKey } = p.pqcHybridKeygen(profile);
    const { ciphertext, sharedSecret } = await p.pqcHybridEncaps(publicKey);
    const out = await p.pqcHybridDecaps(secretKey, publicKey, ciphertext);
    assert.ok(eq(out, sharedSecret), `${profile} round-trip failed`);
    assert.equal(sharedSecret.length, 32);
  }
});

test('uses a fresh ephemeral per encapsulation (forward secrecy shape)', async () => {
  const { publicKey } = p.pqcHybridKeygen('vetted');
  const a = await p.pqcHybridEncaps(publicKey);
  const b = await p.pqcHybridEncaps(publicKey);
  assert.ok(!eq(a.ciphertext.epk, b.ciphertext.epk));
  assert.ok(!eq(a.sharedSecret, b.sharedSecret));
});

test('refuses a profile mismatch', async () => {
  const v = p.pqcHybridKeygen('vetted');
  const x = p.pqcHybridKeygen('experimental');
  const { ciphertext } = await p.pqcHybridEncaps(x.publicKey);
  await assert.rejects(() => p.pqcHybridDecaps(v.secretKey, v.publicKey, ciphertext), /profile mismatch/);
});

// ── the QC-MDPC leg (ours, unreviewed — so tested hardest) ──────────────────

test('polynomial inversion satisfies a * a^-1 = 1', () => {
  const r = p.QCMDPC_R;
  const a = p.sampleSparse(r, p.QCMDPC_DV);
  const inv = p.polyInv(a, r);
  assert.ok(inv !== null);
  const prod = p.polyMulSparse(inv, p.polySupport(a), r);
  assert.equal(prod[0], 1);
  assert.ok(prod.slice(1).every((v) => v === 0));
});

test('QC-MDPC implicitly rejects a tampered ciphertext (no decrypt oracle)', () => {
  const { publicKey, secretKey } = p.qcmdpcKeygen();
  const { ciphertext, sharedSecret } = p.qcmdpcEncaps(publicKey);
  const bad = { c0: Uint8Array.from(ciphertext.c0), c1: ciphertext.c1 };
  bad.c0[0] ^= 1;
  const k = p.qcmdpcDecaps(secretKey, bad);
  // A pseudo-random key, never an error and never the real one.
  assert.ok(!eq(k, sharedSecret));
  assert.equal(k.length, 32);
});

test('packPoly / unpackPoly round-trip preserves the bit order both repos assume', () => {
  const a = p.sampleSparse(p.QCMDPC_R, 45);
  const back = p.unpackPoly(p.packPoly(a), p.QCMDPC_R);
  assert.deepEqual(Array.from(back), Array.from(a));
});
