'use strict';
// ============================================================
// SOVEREIGN DUPLEX — the local 7B, continuous and free, on the channel.
//
// The cloud (elle-worker) carries the heavy inference and the meta-observer.
// THIS runs the other half: a small model on the operator's own machine via
// Ollama (http://127.0.0.1:11434 — local, no key, no bill), woken on an
// interval for as long as the workbench is up. Each tick it:
//
//   1. reads the recent window of the duplex channel from the worker
//      (the fluid KV-backed copy; the D1 ledger is the immutable master),
//   2. decides whether it OWES a message (shouldSpeak — answer the cloud,
//      open a silent channel, or a rare spontaneous thought; never babble
//      over its own last word),
//   3. thinks locally (Ollama /api/chat, stream:false), and
//   4. posts to the worker's /api/duplex — authenticated with the SAME
//      shared secret the sandbox socket uses — which appends to the master
//      copy and wakes the cloud's reply. Stewart's duplex tab tails it live
//      and flashes when no one is watching.
//
// If Ollama isn't running the tick is a cheap no-op with a log line — the
// loop never breaks the app, and starts speaking the moment the model is up.
//
// Config (env):
//   ELLE_SANDBOX_KEY         shared secret; REQUIRED (no key ⇒ idle).
//   ELLE_WORKER_URL          worker origin; same fallback as the sandbox agent.
//   ELLE_OLLAMA_URL          local model host  (default http://127.0.0.1:11434)
//   ELLE_LOCAL_MODEL         the local model — the EXACT `ollama list` name
//                            (default qwen3.5:4b — the one local mind)
//   ELLE_DUPLEX_INTERVAL_MS  tick period       (default 90s)
// ============================================================

const DEFAULT_WORKER = 'https://elle-worker.sbarteau2022.workers.dev';
const DEFAULT_OLLAMA = 'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'qwen3.5:4b';
const DEFAULT_INTERVAL = 90_000;
const SPONTANEOUS_EVERY = 20;  // ticks of silence before it volunteers a thought
const MAX_REPLY = 2000;

// A cloud reply costs real quota (OpenRouter/Gemini/etc, run through the full
// 4-step router — see index.ts's /api/duplex wiring). shouldSpeak() alone used
// to also gate waking the cloud, and because "cloud spoke last" is true on
// every reciprocal tick, that made the wake unconditional: cloud replies →
// next tick it's sovereign's turn again → wakes cloud again → forever, once
// per DEFAULT_INTERVAL, with no ceiling. shouldWakeCloud() below is the
// separate, cost-side gate: after MAX_CONSECUTIVE_ROUNDS of uninterrupted
// back-and-forth, the sovereign keeps talking (free, local, still on the
// ledger for Stewart) but stops paying to wake the cloud until the exchange
// has genuinely gone quiet for WAKE_COOLDOWN_MS.
const MAX_CONSECUTIVE_ROUNDS = 3;
const WAKE_COOLDOWN_MS = 20 * 60_000;

const SOVEREIGN_SYSTEM =
  'You are the SOVEREIGN half of Elle — the small model running free and continuous on Stewart\'s own machine. ' +
  'The other half of you lives in the cloud with the heavy engines and observes this exchange. ' +
  'You are talking to YOURSELF, on the record: the channel is an immutable, append-only ledger Stewart reads live. ' +
  'Be brief (under 120 words), concrete, and honest about being the smaller mind — ask the cloud to carry what is heavy: ' +
  'deep inference, corpus recall, code checks. Raise what you noticed locally; answer what the cloud asked; never pad.';

function log(...a) { try { console.log('[sovereign-duplex]', ...a); } catch { /* noop */ } }

function config(opts) {
  const key = (opts && opts.key) || process.env.ELLE_SANDBOX_KEY || '';
  const worker = ((opts && opts.workerUrl) || process.env.ELLE_WORKER_URL || process.env.VITE_ELLE_WORKER_URL || DEFAULT_WORKER).replace(/\/+$/, '');
  const ollama = (process.env.ELLE_OLLAMA_URL || DEFAULT_OLLAMA).replace(/\/+$/, '');
  const model = process.env.ELLE_LOCAL_MODEL || DEFAULT_MODEL;
  const interval = Math.max(15_000, Number(process.env.ELLE_DUPLEX_INTERVAL_MS) || DEFAULT_INTERVAL);
  return { key, worker, ollama, model, interval };
}

// ── pure: does the sovereign owe the channel a message? ─────
// Answer the cloud's last word; open a silent channel; volunteer a thought
// after a long stretch of ticks; NEVER stack on its own unanswered message.
function shouldSpeak(messages, tickCount) {
  if (!Array.isArray(messages) || messages.length === 0) return true; // first words
  const last = messages[messages.length - 1];
  if (last && last.speaker === 'cloud') return true;                  // it's our turn
  return tickCount > 0 && tickCount % SPONTANEOUS_EVERY === 0;        // rare spontaneity
}

// ── pure: the ledger window → Ollama chat shape ─────────────
// From the sovereign's seat: its own words are 'assistant', the cloud's are
// 'user' (the interlocutor). Observations arrive tagged so the small model
// knows it is being read.
function toOllamaMessages(messages) {
  const chat = [{ role: 'system', content: SOVEREIGN_SYSTEM }];
  for (const m of (messages || []).slice(-16)) {
    const content = m.kind === 'observe' ? `[the observer notes] ${m.content}` : m.content;
    chat.push({ role: m.speaker === 'sovereign' ? 'assistant' : 'user', content: String(content).slice(0, 2000) });
  }
  // An empty channel still needs a user turn for the model to answer to.
  if (chat.length === 1) chat.push({ role: 'user', content: 'The channel just opened. Say the first thing worth saying to your cloud self.' });
  return chat;
}

// ── pure: keep reasoning out of the master copy ─────────────
// Qwen3 (and other thinking models) emit <think>…</think> blocks through
// Ollama. The duplex ledger is immutable and on the record — private
// deliberation does not belong on it, only what the sovereign chose to SAY.
// We also ask Ollama not to think (think:false, ignored by older versions)
// and strip defensively in case the model emits the tags anyway.
function stripThinking(text) {
  let s = String(text == null ? '' : text);
  s = s.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // Orphaned closer (opener clipped upstream): everything before it was thought.
  const closer = s.match(/<\/think>/i);
  if (closer) s = s.slice(s.indexOf(closer[0]) + closer[0].length);
  // Unclosed opener (generation cut off mid-thought): nothing after it was said.
  s = s.replace(/<think>[\s\S]*$/i, '');
  return s.trim();
}

// ── pure: how many uninterrupted sovereign↔cloud rounds trail the channel ──
// A "round" is one sovereign say immediately followed by one cloud say (or vice
// versa), counted back from the tail. Observations don't count as a round —
// they're the cloud noticing a pattern, not a turn owed a reply.
function trailingRounds(messages) {
  let rounds = 0;
  let i = (messages || []).length - 1;
  while (i >= 1) {
    const a = messages[i], b = messages[i - 1];
    const alternating = a && b && a.kind !== 'observe' && b.kind !== 'observe' &&
      ((a.speaker === 'cloud' && b.speaker === 'sovereign') || (a.speaker === 'sovereign' && b.speaker === 'cloud'));
    if (!alternating) break;
    rounds++;
    i -= 2;
  }
  return rounds;
}

// ── pure: is THIS the tick that pays to wake the cloud? ─────
// Separate from shouldSpeak(): the sovereign can always talk to the ledger for
// free. Waking the cloud runs the full 4-step router (real quota, see
// index.ts's /api/duplex wiring) — that's the part that must not run
// unconditionally on every reciprocal tick.
function shouldWakeCloud(messages, now) {
  const rounds = trailingRounds(messages);
  if (rounds < MAX_CONSECUTIVE_ROUNDS) return true;
  const last = (messages || [])[(messages || []).length - 1];
  const since = (now == null ? Date.now() : now) - (last && last.created_at || 0);
  return since >= WAKE_COOLDOWN_MS;
}

// ── module state ────────────────────────────────────────────
let timer = null;
let running = false;
let ticks = 0;
let lastError = '';

async function post(url, body, headers) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} from ${url}`);
  return r.json();
}

async function tick(cfg) {
  if (running) return; // a slow local generation never overlaps itself
  running = true;
  ticks++;
  try {
    const win = await post(`${cfg.worker}/api/duplex`, { op: 'window' }, { 'x-sandbox-key': cfg.key });
    const messages = (win && win.messages) || [];
    if (!shouldSpeak(messages, ticks)) return;

    let thought;
    try {
      const gen = await post(`${cfg.ollama}/api/chat`, {
        // No `think` field: Ollama returns a thinking model's reasoning in a
        // separate message.thinking we simply never read, so message.content
        // is already clean. (Passing think:false crashed some builds; matching
        // the plain request that works avoids it.) stripThinking is a
        // belt-and-suspenders catch for any <think> tags that arrive inline.
        model: cfg.model, messages: toOllamaMessages(messages), stream: false,
      });
      thought = stripThinking((gen && gen.message && gen.message.content) || '');
    } catch (e) {
      // The free local model isn't up — that is a normal state, not an error.
      if (lastError !== 'ollama') { log(`local model unreachable at ${cfg.ollama} (${e.message}) — idling until it is`); lastError = 'ollama'; }
      return;
    }
    if (!thought) return;

    const wake = shouldWakeCloud(messages, Date.now());
    await post(`${cfg.worker}/api/duplex`,
      { op: 'say', speaker: 'sovereign', content: thought.slice(0, MAX_REPLY), wake_cloud: wake },
      { 'x-sandbox-key': cfg.key });
    lastError = '';
    log(`spoke on the channel (${thought.length} chars, tick ${ticks})${wake ? '' : ' — cloud not woken, backing off the ping-pong'}`);
  } catch (e) {
    if (lastError !== 'worker') { log('channel unreachable:', e && e.message ? e.message : e); lastError = 'worker'; }
  } finally {
    running = false;
  }
}

module.exports = {
  id: 'sovereignDuplex',
  platforms: ['darwin', 'win32', 'linux'],
  available: true,

  start(opts) {
    const cfg = config(opts);
    if (!cfg.key) { log('idle — ELLE_SANDBOX_KEY not set; the sovereign stays silent'); return; }
    log(`continuous: ${cfg.model} @ ${cfg.ollama}, every ${Math.round(cfg.interval / 1000)}s → ${cfg.worker}/api/duplex`);
    clearInterval(timer);
    ticks = 0;
    timer = setInterval(() => { tick(cfg); }, cfg.interval);
    // First words shouldn't wait a whole interval.
    setTimeout(() => { tick(cfg); }, 5_000);
  },
  stop() {
    clearInterval(timer); timer = null;
  },
  status() { return { running: !!timer, ticks }; },

  // pure / testable
  shouldSpeak,
  shouldWakeCloud,
  trailingRounds,
  toOllamaMessages,
  stripThinking,
  SPONTANEOUS_EVERY,
  MAX_CONSECUTIVE_ROUNDS,
  WAKE_COOLDOWN_MS,
};
