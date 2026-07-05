'use strict';
// Runs under plain node: `node --test electron/native/providers/sovereign-kv-cache.test.cjs`
// No electron, no build step — the module lazy-requires electron only for its
// userData dir, which we override with ELLE_SOVEREIGN_KV_DIR.

const { test } = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

// Isolate the on-disk store to a throwaway dir before requiring the module.
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sov-kv-'));
process.env.ELLE_SOVEREIGN_KV_DIR = TMP;

const cache = require('./sovereign-kv-cache.cjs');
cache._resetBaseDir();

function sovereign(on) {
  if (on) process.env.ELLE_SOVEREIGN = 'true';
  else delete process.env.ELLE_SOVEREIGN;
}

// ── pure: dynamicBudget (parity with the worker) ──────────────
test('dynamicBudget: nothing for empty / trivial / sub-threshold', () => {
  assert.equal(cache.dynamicBudget(''), cache.BUDGET_MIN);
  assert.equal(cache.dynamicBudget('hi'), cache.BUDGET_MIN);
  assert.equal(cache.dynamicBudget('thanks'), cache.BUDGET_MIN);
  assert.equal(cache.dynamicBudget('the blue sky'), cache.BUDGET_MIN);
});

test('dynamicBudget: real questions warm a set, recall cues widen it', () => {
  const q = cache.dynamicBudget('what did the last trade return on close?');
  assert.ok(q > 0 && q <= cache.BUDGET_MAX);
  const plain = cache.dynamicBudget('summarize the current trading thesis in detail');
  const cued = cache.dynamicBudget('remember the current trading thesis we discussed in detail');
  assert.ok(cued > plain);
});

test('dynamicBudget: clamps to max and is deterministic', () => {
  const huge = 'remember ' + 'why does the model, and the plan, then also the risk? '.repeat(40);
  assert.ok(cache.dynamicBudget(huge) <= cache.BUDGET_MAX);
  const q = 'what did we decide about the risk posture, and why?';
  assert.equal(cache.dynamicBudget(q), cache.dynamicBudget(q));
});

// ── pure: normalization + keying ─────────────────────────────
test('normalizeQuery: collapses case/space/punct, keeps the question mark', () => {
  assert.equal(cache.normalizeQuery('  The Thesis, Please!  '), 'the thesis please');
  assert.equal(cache.normalizeQuery('“The Thesis”'), 'the thesis');
  assert.notEqual(cache.normalizeQuery('the thesis'), cache.normalizeQuery('the thesis?'));
});

test('workingSetKey: equivalent queries collapse, hash is 8 hex', () => {
  assert.equal(
    cache.workingSetKey('s1', 'What is the THESIS?'),
    cache.workingSetKey('s1', 'what   is the thesis?'),
  );
  assert.match(cache.hashKey('the thesis'), /^[0-9a-f]{8}$/);
});

// ── the sovereign gate ───────────────────────────────────────
test('gate: inert when not sovereign', async () => {
  sovereign(false);
  assert.equal(cache.isSovereign(), false);
  await cache.putCached('s-off', 'the thesis in full detail?', 'SECRET');
  assert.equal(await cache.getCached('s-off', 'the thesis in full detail?'), null);
  const ws = await cache.assembleWorkingSet('remember the whole thesis in detail?', 's-off', async () => 'RECALLED');
  assert.deepEqual(ws, { text: '', budget: 0, hit: false, cached: false });
});

// ── the store: round-trip, reuse, invalidate ─────────────────
test('store: miss builds via recall, repeat is a hit', async () => {
  sovereign(true);
  let calls = 0;
  const recall = async () => { calls++; return 'ASSEMBLED SET'; };
  const q = 'walk me through the current thesis and the open positions in detail?';

  const first = await cache.assembleWorkingSet(q, 's1', recall);
  assert.equal(first.hit, false);
  assert.equal(first.cached, true);
  assert.equal(first.text, 'ASSEMBLED SET');
  assert.ok(first.budget > 0);

  const second = await cache.assembleWorkingSet(q, 's1', recall);
  assert.equal(second.hit, true);
  assert.equal(second.text, 'ASSEMBLED SET');
  assert.equal(calls, 1, 'recall should run once — the repeat is served from disk');
});

test('store: invalidate drops the session set so the next turn rebuilds', async () => {
  sovereign(true);
  const q = 'remember what we decided about the risk posture and why, in detail?';
  await cache.assembleWorkingSet(q, 's2', async () => 'V1');
  assert.equal(await cache.getCached('s2', q), 'V1');
  await cache.invalidateWorkingSet('s2');
  assert.equal(await cache.getCached('s2', q), null);
});

test('store: sessions are isolated', async () => {
  sovereign(true);
  const q = 'summarize the thesis and the positions and the risk in detail?';
  await cache.assembleWorkingSet(q, 'sA', async () => 'A-SET');
  assert.equal(await cache.getCached('sB', q), null);
  const stats = await cache.stats('sA');
  assert.equal(stats.sovereign, true);
  assert.ok(stats.entries >= 1);
});

test('store: expired entries are not served', async () => {
  sovereign(true);
  const q = 'the whole thesis, the positions, and the risk posture, in full detail?';
  await cache.putCached('s3', q, 'STALE', -1); // already expired
  assert.equal(await cache.getCached('s3', q), null);
});
