'use strict';
// ============================================================
// LANE HANDSHAKE — the laptop-side port of elle-worker's src/lane-handshake.ts
// (PQC Phase 1). Byte-for-byte mirror of the hybrid (X25519 + ML-KEM-768)
// lane-root agreement, so a root_lane derived here is bit-identical to the one
// the worker derives from the same handshake — the property that lets a v2 lane
// (initHypChannel(root_lane)) sealed on one side open on the other.
//
// Same discipline as rosen-bridge.cjs: Node 19+'s global crypto.subtle is the
// SAME WebCrypto the Worker runs, and @noble/post-quantum + @noble/curves are
// pinned to the SAME versions in both repos (see each package.json), so ML-KEM
// and X25519 outputs match too. The combiner (deriveLaneRoot) is deterministic
// over its byte inputs and is pinned by a shared known-answer vector — see the
// KAT test in lane-handshake.test.cjs and its twin in the worker's
// lane-handshake.test.ts (both assert the identical hex).
//
// This mirrors pqc-hybrid.ts's 'vetted' profile (the two audited legs). The
// experimental QC-MDPC leg is worker-only and not part of the lane handshake.
//
// SCOPE: the reviewed crypto core. It does NOT change sandbox-poller.cjs or the
// live bus — the laptop still speaks v1 (rosen-bridge.cjs) on the wire. Wiring
// v2 into the poller (epoch state, the /handshake round) is a separate pass, as
// on the worker side.
// ============================================================

const { ml_kem768 } = require('@noble/post-quantum/ml-kem.js');
const { x25519 } = require('@noble/curves/ed25519.js');
const rb = require('./rosen-bridge.cjs');

const enc = (s) => new TextEncoder().encode(s);
const ab = (u) => Uint8Array.from(u); // noble wants an ArrayBuffer-backed view
function u32be(n) {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n >>> 0, false);
  return b;
}
function concat(...parts) {
  let n = 0; for (const p of parts) n += p.length;
  const out = new Uint8Array(n); let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
const b64 = (u) => btoa(String.fromCharCode(...u));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// ── pqc-hybrid.ts mirror (vetted profile) ─────────────────────────────────────
// transcript / combine MUST match pqc-hybrid.ts byte-for-byte.
async function pqcTranscript(pk, ct) {
  const parts = [enc('elle-pqc-hybrid-v1|vetted|'), pk.mlkem, pk.x25519, ct.mlkem, ct.epk];
  const digest = await crypto.subtle.digest('SHA-256', concat(...parts));
  return new Uint8Array(digest);
}
async function combine(secrets, info) {
  const ikm = concat(...secrets);
  const base = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info }, base, 256,
  );
  return new Uint8Array(bits);
}
function pqcHybridKeygen() {
  const kem = ml_kem768.keygen();
  const xsk = x25519.utils.randomSecretKey();
  const xpk = x25519.getPublicKey(xsk);
  return {
    publicKey: { profile: 'vetted', mlkem: kem.publicKey, x25519: xpk },
    secretKey: { profile: 'vetted', mlkem: kem.secretKey, x25519: xsk },
  };
}
async function pqcHybridEncaps(pk) {
  const kem = ml_kem768.encapsulate(pk.mlkem);
  const esk = x25519.utils.randomSecretKey();
  const epk = x25519.getPublicKey(esk);
  const ssX = x25519.getSharedSecret(esk, ab(pk.x25519));
  const ct = { profile: 'vetted', mlkem: kem.cipherText, epk };
  return { ciphertext: ct, sharedSecret: await combine([kem.sharedSecret, ssX], await pqcTranscript(pk, ct)) };
}
async function pqcHybridDecaps(sk, pk, ct) {
  const ssKem = ml_kem768.decapsulate(ct.mlkem, sk.mlkem);
  const ssX = x25519.getSharedSecret(ab(sk.x25519), ab(ct.epk));
  return combine([ssKem, ssX], await pqcTranscript(pk, ct));
}

// ── lane-handshake.ts mirror ──────────────────────────────────────────────────
async function laneTranscript(lane, epoch, pk, ct) {
  const digest = await crypto.subtle.digest('SHA-256', concat(
    enc(`elle-lane-root-v2|${lane}|`), u32be(epoch), pk.mlkem, pk.x25519, ct.mlkem, ct.epk,
  ));
  return new Uint8Array(digest);
}

// The combiner — deterministic; pinned by the shared KAT.
async function deriveLaneRoot(preshared, hybridSecret, lane, epoch, pk, ct) {
  const salt = await laneTranscript(lane, epoch, pk, ct);
  const ikm = concat(hybridSecret, preshared); // ss ‖ preshared_root
  const base = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: enc(`elle-lane-root-v2:${lane}:${epoch}`) }, base, 256,
  );
  return new Uint8Array(bits);
}

// initiator (this laptop): generate the hybrid keypair for a HELLO.
function laneHandshakeClientKeys() { return pqcHybridKeygen(); }

// initiator finishes: decapsulate the worker's ACCEPT ciphertext → root_lane.
async function laneHandshakeClientFinish(preshared, lane, epoch, clientKeys, ciphertext) {
  const ss = await pqcHybridDecaps(clientKeys.secretKey, clientKeys.publicKey, ciphertext);
  return deriveLaneRoot(preshared, ss, lane, epoch, clientKeys.publicKey, ciphertext);
}

// responder (the worker's role — ported so this file is a complete, self-testable
// port, exactly like rosen-bridge.cjs ports both seal and open).
async function laneHandshakeAccept(preshared, lane, epoch, clientPub) {
  const { ciphertext, sharedSecret } = await pqcHybridEncaps(clientPub);
  const rootLane = await deriveLaneRoot(preshared, sharedSecret, lane, epoch, clientPub, ciphertext);
  return { ciphertext, rootLane };
}

// v2 lane channel: root_lane straight into the geodesic (reuses rosen-bridge's
// hyperbolic channel + seal/open — only the ROOT source changes).
async function laneChannelV2(rootLane) { return rb.initHypChannel(rootLane); }

// ── wire (de)serialization — matches lane-handshake.ts ────────────────────────
const LANE_PROTOCOL_V2 = 2;
function encodeHello(lane, epoch, pk) {
  return { v: LANE_PROTOCOL_V2, lane, epoch, mlkem: b64(pk.mlkem), x25519: b64(pk.x25519) };
}
function decodeHelloPub(w) { return { profile: 'vetted', mlkem: unb64(w.mlkem), x25519: unb64(w.x25519) }; }
function encodeAccept(ct) { return { v: LANE_PROTOCOL_V2, mlkem: b64(ct.mlkem), epk: b64(ct.epk) }; }
function decodeAcceptCt(w) { return { profile: 'vetted', mlkem: unb64(w.mlkem), epk: unb64(w.epk) }; }

module.exports = {
  LANE_PROTOCOL_V2,
  deriveLaneRoot,
  laneHandshakeClientKeys, laneHandshakeClientFinish, laneHandshakeAccept,
  laneChannelV2,
  encodeHello, decodeHelloPub, encodeAccept, decodeAcceptCt,
  // exposed for the interop test
  pqcHybridKeygen, pqcHybridEncaps, pqcHybridDecaps,
};
