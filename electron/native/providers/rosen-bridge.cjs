'use strict';
// ============================================================
// ROSEN BRIDGE — the laptop-side port of elle-worker's lane-envelope.ts
// ============================================================
//
// This is a byte-for-byte port of three files in the elle-worker repo:
// src/helix.ts (COROS, exact-mode seal/open only — the ratchet/frames/golden
// -jitter parts of COROS are unused by this protocol and not ported), src/
// hyperbolic-sync.ts (the "Rosen bridge" — a shared secret geodesic in the
// Poincaré disk, counter-free per-tick keys), and src/lane-envelope.ts (the
// per-lane HKDF derivation). Same algorithm, same constants, same info
// strings — this is what lets a wire sealed on one side open on the other.
//
// WHY THIS IS SAFE TO PORT LINE-FOR-LINE: Node 19+ exposes globalThis.crypto
// as the SAME WebCrypto API Cloudflare Workers runs (crypto.subtle,
// crypto.getRandomValues — no Node-specific crypto module needed), and
// btoa/atob are global here too. Both runtimes are spec-compliant
// implementations of the same standards (HKDF, AES-GCM, AES-CTR), so
// identical inputs produce identical outputs — verified by a real
// cross-runtime interop test (rosen-bridge.test.cjs), not assumed.
//
// This module is the CLOUD<->LAPTOP hop's envelope, consumed by
// sandbox-poller.cjs. See elle-worker's docs/SESSION_BUS.md for the full
// wiring and the honest scope: this seals and authenticates one HTTP hop,
// nothing more.
// ============================================================

const PHI_INV = (Math.sqrt(5) - 1) / 2; // 0.6180339887…

const enc = (s) => new TextEncoder().encode(s);
const dec = new TextDecoder();

function u32be(n) {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n >>> 0, false);
  return b;
}
function readU32be(b, off = 0) {
  return new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(off, false);
}
function xorBytes(a, b) {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i % b.length];
  return out;
}
function concat(...parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
function b64(bytes) { return btoa(String.fromCharCode(...bytes)); }
function unb64(s) { return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); }

// ── COROS, exact-mode only (BLOCK/LEN_PREFIX/NONCE_BYTES match helix.ts) ───
const NONCE_BYTES = 16;
const LEN_PREFIX = 4;
const BLOCK = 256;

async function deriveKeys(master, nonce) {
  const base = await crypto.subtle.importKey('raw', master, 'HKDF', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: nonce, info: enc('elle-coros-v1') }, base, 8 * (32 + 32 + 12),
  ));
  const encRaw = bits.slice(0, 32);
  const shapeRaw = bits.slice(32, 64);
  const iv = bits.slice(64, 76);
  const encKey = await crypto.subtle.importKey('raw', encRaw, 'AES-GCM', false, ['encrypt', 'decrypt']);
  const shapeKey = await crypto.subtle.importKey('raw', shapeRaw, 'AES-CTR', false, ['encrypt']);
  return { encKey, shapeKey, iv };
}

async function whitenStream(shapeKey, len) {
  const counter = new Uint8Array(16);
  const zeros = new Uint8Array(len);
  const ks = await crypto.subtle.encrypt({ name: 'AES-CTR', counter, length: 64 }, shapeKey, zeros);
  return new Uint8Array(ks);
}

// seal: plaintext -> wire, ALWAYS exact-mode (padded to the minimum BLOCK
// multiple, no golden jitter) — the only mode hyperbolic-sync's hypSeal uses.
async function seal(master, plaintext) {
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_BYTES));
  const { encKey, shapeKey, iv } = await deriveKeys(master, nonce);
  const padLen = Math.max(1, Math.ceil((plaintext.length + LEN_PREFIX) / BLOCK)) * BLOCK;
  const buf = new Uint8Array(padLen);
  buf.set(u32be(plaintext.length), 0);
  buf.set(plaintext, LEN_PREFIX);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, encKey, buf));
  const masked = xorBytes(ct, await whitenStream(shapeKey, ct.length));
  return concat(nonce, masked);
}

async function open(master, wire) {
  if (wire.length < NONCE_BYTES + 16 + LEN_PREFIX) throw new Error('coros: wire too short');
  const nonce = wire.slice(0, NONCE_BYTES);
  const masked = wire.slice(NONCE_BYTES);
  const { encKey, shapeKey, iv } = await deriveKeys(master, nonce);
  const ct = xorBytes(masked, await whitenStream(shapeKey, masked.length));
  const buf = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, encKey, ct)); // throws on tamper
  const L = readU32be(buf, 0);
  if (L > buf.length - LEN_PREFIX) throw new Error('coros: length header exceeds container');
  return buf.slice(LEN_PREFIX, LEN_PREFIX + L);
}

// ── Poincaré-disk primitives (curvature -1) — matches hyperbolic-sync.ts ───
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const norm2 = (a) => dot(a, a);
const norm = (a) => Math.sqrt(norm2(a));
const scale = (a, s) => Float64Array.from(a, (x) => x * s);
const neg = (a) => scale(a, -1);

function mobiusAdd(x, y) {
  const xy = dot(x, y), xx = norm2(x), yy = norm2(y);
  const cX = 1 + 2 * xy + yy;
  const cY = 1 - xx;
  const den = 1 + 2 * xy + xx * yy;
  return Float64Array.from([(cX * x[0] + cY * y[0]) / den, (cX * x[1] + cY * y[1]) / den]);
}

function geodesicStep(p, u, s) {
  const un = norm(u) || 1;
  const t = Math.tanh(s / 2);
  return mobiusAdd(p, Float64Array.from([(u[0] / un) * t, (u[1] / un) * t]));
}

const R_MAX = 0.9;
const RETRACT = 0.5;
function bound(p) {
  const r = norm(p);
  if (r <= R_MAX) return p;
  const uhat = Float64Array.from([p[0] / r, p[1] / r]);
  return mobiusAdd(scale(uhat, -RETRACT), p);
}

const STEP = 0.5;
function advancePoint(p, tick, phi0) {
  const ang = 2 * Math.PI * ((phi0 + tick * PHI_INV) % 1);
  const u = Float64Array.from([Math.cos(ang), Math.sin(ang)]);
  return bound(geodesicStep(p, u, STEP));
}

function quantizePoint(p) {
  const out = new Uint8Array(p.length * 2);
  const dv = new DataView(out.buffer);
  for (let i = 0; i < p.length; i++) {
    const q = Math.max(0, Math.min(65535, Math.round(((Math.max(-1, Math.min(1, p[i])) + 1) / 2) * 65535)));
    dv.setUint16(i * 2, q, false);
  }
  return out;
}

async function hkdf(master, infoBytes, bytesLen) {
  const base = await crypto.subtle.importKey('raw', master, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: infoBytes }, base, bytesLen * 8,
  ));
}

async function initHypChannel(master) {
  const raw = await hkdf(master, enc('coros-hyp-origin-v1'), 12);
  const dv = new DataView(raw.buffer);
  const ang = (dv.getUint32(0, false) / 4294967296) * 2 * Math.PI;
  const rad = (dv.getUint32(4, false) / 4294967296) * 0.5;
  const phi0 = dv.getUint32(8, false) / 4294967296;
  const origin = Float64Array.from([rad * Math.cos(ang), rad * Math.sin(ang)]);
  return { master, origin, phi0 };
}

function hypStart(ch) { return { point: Float64Array.from(ch.origin), tick: 0 }; }
function hypAdvance(ch, s) { return { point: advancePoint(s.point, s.tick + 1, ch.phi0), tick: s.tick + 1 }; }

async function keyFromState(ch, s) {
  return hkdf(ch.master, concat(enc('coros-hyp-key-v1'), u32be(s.tick), quantizePoint(s.point)), 32);
}

async function hypSeal(ch, s, plaintext) {
  const wire = await seal(await keyFromState(ch, s), plaintext);
  return { wire, next: hypAdvance(ch, s) };
}

async function hypOpen(ch, state, wire, window = 32) {
  if (window < 1) throw new Error('hyperbolic-sync: window must be >= 1');
  const cands = [];
  let cur = state;
  for (let k = 0; k < window; k++) { cands.push(cur); cur = hypAdvance(ch, cur); }
  const keys = await Promise.all(cands.map((c) => keyFromState(ch, c)));
  let hit = null;
  for (let k = 0; k < window; k++) {
    try {
      const pt = await open(keys[k], wire);
      if (hit === null) hit = { plaintext: pt, state: cands[k] };
    } catch { /* wrong position -> noise; keep the window constant-work */ }
  }
  if (!hit) throw new Error('hyperbolic-sync: no in-window geodesic position authenticated');
  return { plaintext: hit.plaintext, next: hypAdvance(ch, hit.state) };
}

// ── per-lane derivation — matches lane-envelope.ts ──────────────────────────
async function laneMaster(rootSecret, lane) {
  const base = await crypto.subtle.importKey('raw', rootSecret, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: enc(`elle-lane-bridge-v1:${lane}`) }, base, 256,
  );
  return new Uint8Array(bits);
}

async function laneChannel(rootSecret, lane) {
  return initHypChannel(await laneMaster(rootSecret, lane));
}

function laneChannelStart(ch) { return hypStart(ch); }

async function sealForLane(ch, state, payload) {
  return hypSeal(ch, state, enc(JSON.stringify(payload)));
}

async function openFromLane(ch, state, wire, window = 32) {
  const { plaintext, next } = await hypOpen(ch, state, wire, window);
  return { payload: JSON.parse(dec.decode(plaintext)), next };
}

// ── state (de)serialization — matches session-bus.ts's encode/decodeState,
// so a saved state file round-trips identically on either side ────────────
function encodeState(s) { return JSON.stringify({ tick: s.tick, point: [s.point[0], s.point[1]] }); }
function decodeState(raw) {
  const o = JSON.parse(raw);
  return { tick: o.tick, point: Float64Array.from(o.point) };
}

module.exports = {
  PHI_INV,
  mobiusAdd, geodesicStep, bound, advancePoint, quantizePoint,
  laneChannel, laneChannelStart, sealForLane, openFromLane,
  hypStart, hypAdvance,
  encodeState, decodeState,
  b64, unb64,
  // exposed for the interop test only
  seal, open, initHypChannel, hypSeal, hypOpen,
};
