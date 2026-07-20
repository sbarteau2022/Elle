'use strict';
// ============================================================
// Connect-back sandbox agent — Elle's hands on this machine.
//
// Elle's mind runs in the cloud (elle-worker). A Worker can't reach a laptop
// behind NAT, so THIS process used to dial UP with a WebSocket. It doesn't
// anymore: "I don't need the socket to pass a tool" — this now POLLS
// elle-worker's session bus (POST /api/sandbox-bus/poll) for sealed jobs on
// an interval, executes them — inside a locked Docker box by default (see
// sandbox-box.cjs; fail-closed when the daemon is down) — and SUBMITS the
// sealed result back (POST /api/sandbox-bus/submit). No held-open
// connection, no Durable Object on the other end holding a socket.
//
// THE ENVELOPE IS THE ROSEN BRIDGE (rosen-bridge.cjs — a byte-for-byte port
// of elle-worker's lane-envelope.ts): COROS (AES-256-GCM) sealed under
// hyperbolic-sync's counter-free keystream. One root secret
// (ELLE_SANDBOX_KEY, same as before — it used to authenticate the socket,
// now it's HKDF'd into a distinct channel per lane+direction) instead of the
// socket's separate key shape. Real authentication happens at OPEN time: a
// forged or replayed poll response simply fails to decrypt.
//
// STATE, PERSISTED TO DISK: hyperbolic-sync's per-tick key needs a sender
// and a receiver state that both advance forward-only. There is no
// in-memory Durable Object holding the cloud's half anymore (it's in
// elle-worker's D1 — see session-bus.ts); this process's own half —
// receiver state for jobs coming IN, sender state for results going OUT —
// is persisted under <workRoot>/.bus-state/ so a restart doesn't strand the
// channel. First contact for a new lane bootstraps at tick 0 on both ends,
// same as elle-worker does.
//
// Trust model: this is the operator's own machine and the worker tool is
// full-scope only (her superadmin cockpit + conductor). The shared secret is the
// gate — without ELLE_SANDBOX_KEY set (and matching the worker's
// SANDBOX_AGENT_KEY) the agent stays idle and never polls. When connected it
// grants real, un-prompted execution by design: "she just uses it."
//
// Config (env, all optional except the key):
//   ELLE_SANDBOX_KEY    shared secret; MUST match the worker. No key ⇒ idle.
//   ELLE_WORKER_URL     worker origin (https). Falls back to
//                       VITE_ELLE_WORKER_URL, else the deployed worker.
//   ELLE_SANDBOX_ROOT   default working directory for jobs (created if missing).
//   ELLE_SANDBOX_LANES  comma-separated lane names to poll (default 'primary').
//   ELLE_SANDBOX_POLL_MS  poll interval per lane, ms (default 5000, min 2000).
// ============================================================

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const box = require('./sandbox-box.cjs');
const rb = require('./rosen-bridge.cjs');

const DEFAULT_WORKER = 'https://elle-worker.sbarteau2022.workers.dev';
const DEFAULT_POLL_MS = 5_000;
const MAX_OUTPUT = 200_000;      // cap per stream, bytes
const CLONE_MAX_FILES = 200;
const CLONE_MAX_FILE = 256 * 1024;
const CLONE_MAX_BUNDLE = 5 * 1024 * 1024;
const CLONE_SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.cache', 'coverage']);
const POLL_TIMEOUT_MS = 20_000;
const SUBMIT_TIMEOUT_MS = 20_000;
const OPEN_WINDOW = 32; // matches hyperbolic-sync's default forward-only search window

function log(...a) { try { console.log('[sandbox-agent]', ...a); } catch { /* noop */ } }
function slug(s) { return String(s).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'lane'; }

function config(opts) {
  const key = (opts && opts.key) || process.env.ELLE_SANDBOX_KEY || '';
  const origin = ((opts && opts.workerUrl) || process.env.ELLE_WORKER_URL || process.env.VITE_ELLE_WORKER_URL || DEFAULT_WORKER).replace(/\/+$/, '');
  const pollUrl = `${origin}/api/sandbox-bus/poll`;
  const submitUrl = `${origin}/api/sandbox-bus/submit`;
  const workRoot = (opts && opts.root) || process.env.ELLE_SANDBOX_ROOT || path.join(userDataDir(), 'sandbox-workspace');
  const lanes = String((opts && opts.lanes) || process.env.ELLE_SANDBOX_LANES || 'primary')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const pollIntervalMs = Math.max(2_000, Number(process.env.ELLE_SANDBOX_POLL_MS) || DEFAULT_POLL_MS);
  return { key, origin, pollUrl, submitUrl, workRoot, lanes: lanes.length ? lanes : ['primary'], pollIntervalMs };
}

function userDataDir() {
  try { return require('electron').app.getPath('userData'); }
  catch { return path.join(os.homedir(), '.elle'); }
}

// ── module state ────────────────────────────────────────────
let timer = null;
let stopped = true;
let root = null;
let cloneDir = null;
let lastErrorKey = '';
// The last config() start() ran with — the local ReAct loop (react_goal jobs)
// needs the worker origin + shared key to call back over /api/elle-tool, and
// reads this instead of threading its own copy through every job.
let activeCfg = null;
const channelCache = new Map(); // "lane:direction" -> HypChannel (deterministic from root+lane, safe to cache)

function ensureRoot() {
  if (!root) return;
  try { fs.mkdirSync(root, { recursive: true }); } catch { /* ignore */ }
  try { fs.mkdirSync(cloneDir, { recursive: true }); } catch { /* ignore */ }
  try { fs.mkdirSync(stateDir(), { recursive: true }); } catch { /* ignore */ }
}
function stateDir() { return path.join(root, '.bus-state'); }
function stateFile(lane, key) { return path.join(stateDir(), `${slug(lane)}-${key}.json`); }

function loadLocalState(lane, key) {
  try { return rb.decodeState(fs.readFileSync(stateFile(lane, key), 'utf8')); } catch { return null; }
}
function saveLocalState(lane, key, state) {
  try { ensureRoot(); fs.writeFileSync(stateFile(lane, key), rb.encodeState(state)); }
  catch (e) { log(`could not persist bus state for ${lane}/${key}:`, e.message); }
}

async function getChannel(rootSecret, lane, direction) {
  const k = `${lane}:${direction}`;
  if (!channelCache.has(k)) channelCache.set(k, await rb.laneChannel(rootSecret, k));
  return channelCache.get(k);
}

// ── the job executors — pure result, no transport awareness ─
// Mirrors the box-first/fail-closed discipline exactly as before: exec goes
// through Docker unless ELLE_SANDBOX_ISOLATION=none, and a down daemon
// refuses rather than falling back to a bare host spawn.
function commandFor(job) {
  if (job.mode === 'shell') {
    const shell = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : '/bin/sh';
    const flag = process.platform === 'win32' ? '/c' : '-c';
    return { bin: shell, args: [flag, String(job.command || '')], ext: null };
  }
  const lang = (job.language || 'python').toLowerCase();
  if (lang === 'python' || lang === 'py') return { bin: pythonBin(), args: [], ext: '.py' };
  if (lang === 'javascript' || lang === 'js' || lang === 'node') {
    return { bin: process.execPath.includes('electron') ? 'node' : process.execPath, args: [], ext: '.mjs', electronRunAsNode: true };
  }
  if (lang === 'typescript' || lang === 'ts') {
    return { bin: process.platform === 'win32' ? 'npx.cmd' : 'npx', args: ['-y', 'tsx'], ext: '.ts' };
  }
  return null;
}
function pythonBin() { return process.platform === 'win32' ? 'python' : 'python3'; }

let warnedBareHost = false;
function spawnFor(job) {
  ensureRoot();
  const cwd = root;
  if (box.isolationMode() === 'docker') {
    if (!box.dockerAvailable()) {
      return { proc: null, tmp: null, error:
        'sandbox box refused: Docker daemon not reachable. Exec is fail-closed — ' +
        'start Docker Desktop (or set ELLE_SANDBOX_ISOLATION=none to run on the bare host, NOT recommended).' };
    }
    const cfg = box.boxConfig();
    if (!box.imageAvailable(cfg)) {
      return { proc: null, tmp: null, error:
        `sandbox box refused: Docker image '${cfg.image}' not found locally. Build it once from the elle repo root: ` +
        `docker build -f electron/sandbox.Dockerfile -t ${cfg.image} . (see electron/sandbox.Dockerfile) — ` +
        'nothing builds this automatically.' };
    }
    return box.boxedSpawn(job, root);
  }
  if (!warnedBareHost) { warnedBareHost = true; log('WARNING: ELLE_SANDBOX_ISOLATION=none — exec runs UN-JAILED on the bare host.'); }
  const c = commandFor(job);
  if (!c) return { proc: null, tmp: null, error: 'unsupported job language' };
  const env = c.electronRunAsNode ? { ...process.env, ELECTRON_RUN_AS_NODE: '1' } : { ...process.env };
  if (c.ext === null) return { proc: spawn(c.bin, c.args, { cwd, env }), tmp: null };
  const tmp = writeTmp(String(job.code || ''), c.ext);
  return { proc: spawn(c.bin, [...c.args, tmp], { cwd, env }), tmp };
}

function writeTmp(content, ext) {
  ensureRoot();
  const p = path.join(root, `.elle-run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  fs.writeFileSync(p, content, 'utf8');
  return p;
}

function runExecJob(job) {
  return new Promise((resolve) => {
    const started = Date.now();
    const { proc, tmp, error } = spawnFor(job);
    if (!proc) {
      resolve({ ok: false, stdout: '', stderr: error || 'unsupported job', exit: -1, duration_ms: 0 });
      return;
    }
    let out = '', errOut = '', truncated = false, settled = false;
    const cap = (buf, chunk) => (buf.length >= MAX_OUTPUT ? (truncated = true, buf) : buf + chunk.toString('utf8'));
    proc.stdout && proc.stdout.on('data', (c) => { out = cap(out, c); });
    proc.stderr && proc.stderr.on('data', (c) => { errOut = cap(errOut, c); });

    const timeout = Math.min(Math.max(job.timeout_ms || 120_000, 1000), 600_000);
    const killer = setTimeout(() => { try { proc.kill('SIGKILL'); } catch { /* gone */ } }, timeout);

    const finish = (exit) => {
      if (settled) return; settled = true;
      clearTimeout(killer);
      if (tmp) { try { fs.rmSync(tmp, { force: true }); } catch { /* ignore */ } }
      resolve({
        ok: exit === 0, stdout: out.slice(0, MAX_OUTPUT), stderr: errOut.slice(0, MAX_OUTPUT),
        exit: typeof exit === 'number' ? exit : -1, duration_ms: Date.now() - started, truncated,
      });
    };
    proc.on('close', (code) => finish(code == null ? -1 : code));
    proc.on('error', (e) => { errOut = cap(errOut, Buffer.from(`spawn error: ${e.message}\n`)); finish(-1); });
  });
}

// ── llm: the sovereign inference lane ────────────────────────
const { stripThinking } = require('./sovereign-duplex.cjs');
const DEFAULT_OLLAMA = 'http://127.0.0.1:11434';
const DEFAULT_LOCAL_MODEL = 'qwen3.5:4b';
const LLM_MAX_CONTENT = 32_000;

async function runLlmJob(job) {
  const base = (process.env.ELLE_OLLAMA_URL || DEFAULT_OLLAMA).replace(/\/+$/, '');
  const model = process.env.ELLE_LOCAL_MODEL || DEFAULT_LOCAL_MODEL;
  try {
    const chat = [{ role: 'system', content: String(job.system || '') }];
    for (const m of Array.isArray(job.messages) ? job.messages : []) {
      chat.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '') });
    }
    const timeout = Math.min(Math.max(job.timeout_ms || 120_000, 5_000), 600_000);
    const r = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model, messages: chat, stream: false, think: false,
        options: { num_predict: Math.min(Math.max(job.max_tokens || 2048, 128), 8192) },
      }),
      signal: AbortSignal.timeout(timeout),
    });
    if (!r.ok) return { ok: false, error: `ollama HTTP ${r.status}`, model };
    const data = await r.json();
    if (data && data.error) return { ok: false, error: String(data.error), model };
    const content = stripThinking((data && data.message && data.message.content) || '').slice(0, LLM_MAX_CONTENT);
    if (!content) return { ok: false, error: 'local model returned nothing', model };
    return { ok: true, content, model };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e), model };
  }
}

// ── clone: pull a copy of code back up (and keep one locally) ─
function runCloneJob(job) {
  try {
    ensureRoot();
    const target = String(job.target || '');
    const base = path.isAbsolute(target) ? target : path.join(root, target);
    const files = job.kind === 'git' ? gitFiles(base) : walkFiles(base);
    const payload = [];
    let totalBundle = 0;
    const meta = [];
    for (const f of files) {
      if (payload.length >= CLONE_MAX_FILES || totalBundle >= CLONE_MAX_BUNDLE) break;
      let content = '';
      try {
        const st = fs.statSync(f.abs);
        if (st.size > CLONE_MAX_FILE) { meta.push({ path: f.rel, bytes: st.size }); continue; }
        content = fs.readFileSync(f.abs, 'utf8');
      } catch { continue; }
      totalBundle += content.length;
      payload.push({ path: f.rel, content });
      meta.push({ path: f.rel, bytes: Buffer.byteLength(content) });
    }
    const bundle = JSON.stringify({ target, kind: job.kind, clonedAt: Date.now(), files: payload });
    const localPath = saveLocalCopy(target, bundle);
    log('cloned', payload.length, 'files from', base, '→', localPath);
    return { ok: true, files: meta, bundle };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}

function walkFiles(base) {
  const out = [];
  const st = safeStat(base);
  if (!st) throw new Error(`no such path: ${base}`);
  if (st.isFile()) return [{ abs: base, rel: path.basename(base) }];
  const rootBase = base;
  const stack = [base];
  while (stack.length && out.length < CLONE_MAX_FILES * 2) {
    const dir = stack.pop();
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (e.name.startsWith('.') && e.name !== '.env.example') continue;
      if (CLONE_SKIP.has(e.name)) continue;
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(abs);
      else if (e.isFile()) out.push({ abs, rel: path.relative(rootBase, abs) });
    }
  }
  return out;
}

function gitFiles(base) {
  const res = spawnSyncSafe('git', ['-C', base, 'ls-files'], base);
  if (res == null) throw new Error(`not a git repo (or git missing): ${base}`);
  return res.split('\n').map((r) => r.trim()).filter(Boolean)
    .map((rel) => ({ abs: path.join(base, rel), rel }));
}

function spawnSyncSafe(cmd, args, cwd) {
  try {
    const r = require('child_process').spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    if (r.status !== 0) return null;
    return r.stdout || '';
  } catch { return null; }
}

function saveLocalCopy(target, bundle) {
  ensureRoot();
  const p = path.join(cloneDir, `${slug(target)}-${Date.now().toString(36)}.json`);
  try { fs.writeFileSync(p, bundle, 'utf8'); } catch { /* best effort */ }
  return p;
}

function safeStat(p) { try { return fs.statSync(p); } catch { return null; } }

async function executeJob(kind, payload) {
  if (kind === 'exec') return runExecJob(payload);
  if (kind === 'clone') return runCloneJob(payload);
  if (kind === 'llm') return runLlmJob(payload);
  // The whole delegate_local GOAL, worked to completion right here: the local
  // ReAct loop (local-react-agent.cjs) now does the orchestration the worker
  // used to do — deciding each step from the model's own reasoning, running
  // run_shell/run_code natively (via runExecJob, same as above) and every
  // other tool over HTTP against elle-worker's /api/elle-tool. This function
  // runs INSIDE this same tick, so it must never itself wait on a job coming
  // back over this bus — it doesn't: exec is native, tool calls are plain
  // synchronous fetches.
  if (kind === 'react_goal') return require('./local-react-agent.cjs').runGoalJob(payload, activeCfg || config(), { runExecJob, runLlmJob });
  return { ok: false, error: `unknown job kind "${kind}"` };
}

// ── the poll/submit transport ────────────────────────────────
async function pollLane(cfg, rootSecret, lane) {
  const res = await fetch(cfg.pollUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-sandbox-key': cfg.key },
    body: JSON.stringify({ lane, limit: 10, meta: { agent: 'elle-workbench', host: os.hostname(), platform: process.platform, root } }),
    signal: AbortSignal.timeout(POLL_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`poll HTTP ${res.status}`);
  const data = await res.json();
  const jobs = (data && data.jobs) || [];
  if (!jobs.length) return;

  const inCh = await getChannel(rootSecret, lane, 'to_local');
  let receiver = loadLocalState(lane, 'to_local-receiver') || rb.laneChannelStart(inCh);
  const submitItems = [];

  for (const job of jobs) {
    let opened;
    try {
      opened = await rb.openFromLane(inCh, receiver, rb.unb64(job.wire), OPEN_WINDOW);
    } catch (e) {
      // A forged, corrupted, or out-of-window job never advances state and
      // never gets a result submitted — the cloud side just times it out.
      log(`lane "${lane}" job ${job.id} failed to authenticate:`, e.message);
      continue;
    }
    receiver = opened.next;
    saveLocalState(lane, 'to_local-receiver', receiver);

    const result = await executeJob(job.kind, opened.payload);
    const outCh = await getChannel(rootSecret, lane, 'to_cloud');
    const sender = loadLocalState(lane, 'to_cloud-sender') || rb.laneChannelStart(outCh);
    const sealedOut = await rb.sealForLane(outCh, sender, result);
    saveLocalState(lane, 'to_cloud-sender', sealedOut.next);
    submitItems.push({ kind: 'result', wire: rb.b64(sealedOut.wire), replyTo: job.id });
  }

  if (submitItems.length) {
    const r = await fetch(cfg.submitUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-sandbox-key': cfg.key },
      body: JSON.stringify({ lane, items: submitItems }),
      signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
    });
    if (!r.ok) log(`lane "${lane}" submit HTTP ${r.status}`);
  }
}

async function tick(cfg) {
  if (stopped) return;
  const rootSecret = new TextEncoder().encode(cfg.key);
  for (const lane of cfg.lanes) {
    try {
      await pollLane(cfg, rootSecret, lane);
      if (lastErrorKey === lane) lastErrorKey = '';
    } catch (e) {
      if (lastErrorKey !== lane) { log(`lane "${lane}" poll failed:`, e && e.message ? e.message : e); lastErrorKey = lane; }
    }
  }
}

// ── provider surface ────────────────────────────────────────
module.exports = {
  id: 'sandboxAgent',
  platforms: ['darwin', 'win32', 'linux'],
  available: true,
  // Exposed for unit tests — pure, no network/process side effects.
  config,
  commandFor,
  walkFiles,
  // Exposed so local-react-agent.cjs can reuse the SAME exec-in-the-box and
  // Ollama-call primitives a worker-dispatched job already uses, instead of
  // duplicating the fail-closed Docker check / output capping / stripThinking
  // logic. Both are already pure given their job argument (runExecJob reads
  // module-level `root`, same as every other job kind above).
  runExecJob,
  runLlmJob,
  start(opts) {
    const cfg = config(opts);
    if (!cfg.key) { log('idle — ELLE_SANDBOX_KEY not set; not polling'); return; }
    activeCfg = cfg;
    root = cfg.workRoot;
    cloneDir = path.join(root, '.clones');
    ensureRoot();
    stopped = false;
    clearInterval(timer);
    log(`polling lane(s) [${cfg.lanes.join(', ')}] every ${Math.round(cfg.pollIntervalMs / 1000)}s → ${cfg.pollUrl}`);
    timer = setInterval(() => { tick(cfg).catch(() => {}); }, cfg.pollIntervalMs);
    setTimeout(() => { tick(cfg).catch(() => {}); }, 1_000); // first poll shouldn't wait a whole interval
  },
  stop() {
    stopped = true;
    clearInterval(timer); timer = null;
  },
  status() { return { polling: !stopped, root }; },
};
