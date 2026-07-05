'use strict';
// ============================================================
// SOVEREIGN DYNAMIC KV CACHE — electron/native/providers/sovereign-kv-cache.cjs
//
// The hosted worker (elle-worker/src/kv-cache.ts) runs a dynamic KV cache one
// layer above a HOSTED model: it sizes the durable-memory pull to the demand of
// the turn and amortizes recall across a session, backed by Cloudflare KV. That
// cache cannot follow Elle into the local build — its substrate is the edge.
//
// This is the same cache, ported down to the substrate the SOVEREIGN model
// owns: the local machine. The pure logic (dynamicBudget, normalization, keying)
// is identical to the worker's — a working set is a working set. What changes is
// the store: Cloudflare KV → the local filesystem under the app's userData dir,
// one JSON file per session, LRU + TTL evicted. And it is gated: unless the
// build is running sovereign (ELLE_SOVEREIGN / SOVEREIGN truthy — the flag that
// flips Elle off the hosted worker and onto the local model we train), every
// entry point is inert. This is the cache "just for the sovereign model": when
// the hosted worker is answering, its own KV cache does this job; the moment we
// go local, this one takes over with no code above it changing.
//
// Seam parity with the worker: assembleWorkingSet delegates the actual recall
// to an injected `recall(query, budget)` — the future sovereign memory kernel —
// exactly as the worker delegates to memory.ts::assembleContext. Until that
// kernel exists, the primitives (budgetFor / getCached / putCached) are exposed
// over IPC so the local-model orchestration can drive the cache directly.
//
// Best-effort by construction: a disk miss or error degrades to a live
// (uncached) assemble, never to a failed turn.
// ============================================================

const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const path = require('path');

// ── sovereign gate ───────────────────────────────────────────
// The one switch. Everything below is inert unless this is true, so the module
// is safe to register and expose in the hosted build — it simply never engages.
function isSovereign() {
  return process.env.ELLE_SOVEREIGN === 'true' || process.env.SOVEREIGN === 'true';
}

// Warm, not durable: a short window bounds staleness while catching the
// "keep going" / rephrase follow-ups that actually repeat the recall.
const WS_TTL_MS = 120 * 1000;
const WS_MAX_ENTRIES = 24;     // per session, before oldest is evicted

const BUDGET_MIN = 0;
const BUDGET_BASE = 900;
const BUDGET_MAX = 2400;

const RECALL_CUES = /\b(remember|recall|last time|earlier|before|you said|we (?:discussed|talked|agreed|decided)|previously|as i mentioned|going back|reminded?)\b/i;
const TRIVIAL = /^(?:hi|hey|hello|yo|sup|thanks|thank you|ty|ok|okay|k|cool|nice|great|got it|sounds good|yep|yeah|no|nope|lol|haha|good morning|good night|gm|gn)[\s!.?]*$/i;

// ── dynamic budget (pure — byte-for-byte the worker's logic) ─
function dynamicBudget(query, opts) {
  const max = Math.max(0, (opts && opts.max != null) ? opts.max : BUDGET_MAX);
  const q = String(query == null ? '' : query).trim();
  if (!q) return BUDGET_MIN;
  if (TRIVIAL.test(q)) return BUDGET_MIN;

  const words = q.split(/\s+/).filter(Boolean).length;
  const asks = (q.match(/\?/g) || []).length;
  const cued = RECALL_CUES.test(q);
  if (words < 4 && asks === 0 && !cued) return BUDGET_MIN;

  const sizeTerm = Math.min(1, words / 40);
  const clauses = (q.match(/[,;:]|\band\b|\bthen\b|\balso\b/gi) || []).length;
  let budget = BUDGET_BASE * (0.45 + 0.55 * sizeTerm);
  budget += Math.min(3, clauses) * 140;
  budget += Math.min(2, asks) * 120;
  if (cued) budget += 900;

  return Math.round(Math.max(BUDGET_MIN, Math.min(max, budget)));
}

// ── key normalization + hash (pure — parity with the worker) ─
function normalizeQuery(query) {
  return String(query == null ? '' : query)
    .toLowerCase()
    .replace(/[`'"“”‘’]/g, '')
    .replace(/[^a-z0-9?]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hashKey(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function workingSetKey(sessionId, query) {
  return hashKey(normalizeQuery(query));
}

// ── local store (the KV → filesystem swap) ───────────────────
// Base dir resolution, in order: an explicit override (tests / power users);
// Electron's per-user userData dir when running inside the app; else a temp
// dir. Lazy require of electron so this module is testable under plain node.
let _baseDir = null;
function baseDir() {
  if (_baseDir) return _baseDir;
  if (process.env.ELLE_SOVEREIGN_KV_DIR) {
    _baseDir = process.env.ELLE_SOVEREIGN_KV_DIR;
  } else {
    let userData = null;
    try { userData = require('electron').app.getPath('userData'); } catch { /* not in electron */ }
    _baseDir = path.join(userData || os.tmpdir(), 'sovereign-kv');
  }
  return _baseDir;
}

function sessionFile(sessionId) {
  const tag = hashKey('sess:' + String(sessionId || 'global'));
  return path.join(baseDir(), `wsc-${tag}.json`);
}

async function readSession(sessionId) {
  try {
    const raw = await fsp.readFile(sessionFile(sessionId), 'utf8');
    const doc = JSON.parse(raw);
    return (doc && typeof doc === 'object' && doc.entries) ? doc : { entries: {} };
  } catch {
    return { entries: {} };
  }
}

// Atomic-ish write: tmp file + rename, so a crash mid-write never leaves a
// half-written cache file that would poison every future read.
async function writeSession(sessionId, doc) {
  const file = sessionFile(sessionId);
  await fsp.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(doc), 'utf8');
  await fsp.rename(tmp, file);
}

// Drop expired entries and evict oldest beyond the cap. Returns the pruned doc.
function prune(doc, now) {
  const entries = doc.entries || {};
  const live = Object.entries(entries).filter(([, e]) => e && e.exp > now);
  live.sort((a, b) => a[1].at - b[1].at); // oldest first
  const kept = live.slice(Math.max(0, live.length - WS_MAX_ENTRIES));
  const next = {};
  for (const [k, e] of kept) next[k] = e;
  return { entries: next };
}

// ── primitives (what IPC exposes; recall-free) ───────────────

// Cache lookup. Returns the stored text or null. Non-fatal on any error.
async function getCached(sessionId, query) {
  if (!isSovereign()) return null;
  const key = workingSetKey(sessionId, query);
  const now = Date.now();
  const doc = await readSession(sessionId);
  const e = doc.entries && doc.entries[key];
  if (e && e.exp > now) return e.text;
  return null;
}

// Store an assembled set. Touches the entry (LRU), prunes, writes. Best-effort.
async function putCached(sessionId, query, text, ttlMs) {
  if (!isSovereign()) return;
  const key = workingSetKey(sessionId, query);
  const now = Date.now();
  let doc = await readSession(sessionId);
  doc.entries = doc.entries || {};
  doc.entries[key] = { text: String(text == null ? '' : text), at: now, exp: now + (ttlMs || WS_TTL_MS) };
  doc = prune(doc, now);
  try { await writeSession(sessionId, doc); } catch { /* the assemble still stands */ }
}

// Drop a session's whole working-set cache. Call after a durable memory write
// so the next turn rebuilds against the new state. Best-effort.
async function invalidateWorkingSet(sessionId) {
  if (!isSovereign()) return;
  try { await fsp.unlink(sessionFile(sessionId)); } catch { /* already gone */ }
}

// Cheap observability: live entry count for a session (post-expiry).
async function stats(sessionId) {
  const now = Date.now();
  const doc = prune(await readSession(sessionId), now);
  return { sovereign: isSovereign(), entries: Object.keys(doc.entries).length, baseDir: baseDir() };
}

// ── composed entry point (in-process; mirrors the worker) ────
// budget = demand of the turn; a hit reuses the set; a miss builds it via the
// injected recall and writes it back so the next repeat is hot. `recall` is the
// sovereign memory kernel — (query, budget) => Promise<string>. When we're not
// sovereign, or the budget is zero, we load nothing: the cheapest possible turn.
async function assembleWorkingSet(query, sessionId, recall, opts) {
  opts = opts || {};
  const budget = opts.budgetOverride != null
    ? Math.max(0, Math.min(BUDGET_MAX, Math.round(opts.budgetOverride)))
    : dynamicBudget(query);

  if (!isSovereign() || budget <= 0) {
    return { text: '', budget: isSovereign() ? budget : 0, hit: false, cached: false };
  }

  const cached = await getCached(sessionId, query);
  if (cached != null) return { text: cached, budget, hit: true, cached: false };

  let text = '';
  if (typeof recall === 'function') {
    try { text = String((await recall(query, budget)) || ''); } catch { text = ''; }
  }
  await putCached(sessionId, query, text, opts.ttlMs);
  return { text, budget, hit: false, cached: true };
}

// ── native-provider registration shape ──────────────────────
// Matches head-motion.cjs: id + platforms + available. Active only in sovereign
// mode, so capabilities.sovereignKvCache tells the renderer whether the local
// cache is live. No start/stop — it's a passive store, not a stream.
module.exports = {
  id: 'sovereignKvCache',
  platforms: ['darwin', 'win32', 'linux'],
  get available() { return isSovereign(); },

  // pure / testable
  isSovereign,
  dynamicBudget,
  normalizeQuery,
  hashKey,
  workingSetKey,
  BUDGET_MIN,
  BUDGET_MAX,

  // store
  getCached,
  putCached,
  invalidateWorkingSet,
  stats,
  assembleWorkingSet,

  // test hook: force base-dir re-resolution after changing env
  _resetBaseDir() { _baseDir = null; },
};
