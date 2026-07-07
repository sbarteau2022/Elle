'use strict';
// ============================================================
// Connect-back sandbox agent — Elle's hands on this machine.
//
// Elle's mind runs in the cloud (elle-worker). A Worker can't reach a laptop
// behind NAT, so THIS process dials UP: it opens a WebSocket to
//   wss://<worker>/api/sandbox-agent/connect?key=<secret>
// and holds it open. The worker's SandboxAgent Durable Object authenticates the
// secret and, when Elle calls run_code / run_shell / sandbox_clone, sends a job
// down this socket. We execute it on the real OS with child_process, stream the
// result back, and for clones ship a copy of the code up (and keep one locally).
//
// Trust model: this is the operator's own machine and the worker tool is
// full-scope only (her superadmin cockpit + conductor). The shared secret is the
// gate — without ELLE_SANDBOX_KEY set (and matching the worker's
// SANDBOX_AGENT_KEY) the agent stays idle and never connects. When connected it
// grants real, un-prompted execution by design: "she just uses it."
//
// Config (env, all optional except the key):
//   ELLE_SANDBOX_KEY   shared secret; MUST match the worker. No key ⇒ idle.
//   ELLE_WORKER_URL    worker origin (https/wss). Falls back to
//                      VITE_ELLE_WORKER_URL, else the deployed worker.
//   ELLE_SANDBOX_ROOT  default working directory for jobs (created if missing).
// ============================================================

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const DEFAULT_WORKER = 'https://elle-worker.sbarteau2022.workers.dev';
const HEARTBEAT_MS = 25_000;
const MAX_OUTPUT = 200_000;      // cap per stream, bytes
const CLONE_MAX_FILES = 200;
const CLONE_MAX_FILE = 256 * 1024;
const CLONE_MAX_BUNDLE = 5 * 1024 * 1024;
const CLONE_SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.cache', 'coverage']);

// ── one WebSocket surface over either the ws package (Electron's Node 20 has no
//    global WebSocket) or a global one (Node 22+, tests) ──────────────────────
function makeSocket(url) {
  const h = {};
  let raw;
  let Ws = null;
  try { Ws = require('ws'); } catch { /* fall back to global */ }
  if (Ws) {
    raw = new Ws(url, { handshakeTimeout: 15_000 });
    raw.on('open', () => h.open && h.open());
    raw.on('message', (d) => h.message && h.message(typeof d === 'string' ? d : d.toString('utf8')));
    raw.on('close', () => h.close && h.close());
    raw.on('error', (e) => h.error && h.error(e));
  } else if (typeof globalThis.WebSocket === 'function') {
    raw = new globalThis.WebSocket(url);
    raw.onopen = () => h.open && h.open();
    raw.onmessage = (ev) => h.message && h.message(typeof ev.data === 'string' ? ev.data : String(ev.data));
    raw.onclose = () => h.close && h.close();
    raw.onerror = (e) => h.error && h.error(e);
  } else {
    throw new Error('no WebSocket implementation (install the "ws" package)');
  }
  return {
    on(k, fn) { h[k] = fn; },
    send(s) { try { raw.send(s); } catch { /* closing */ } },
    close() { try { raw.close(); } catch { /* already gone */ } },
  };
}

// ── module state ────────────────────────────────────────────
let sock = null;
let heartbeat = null;
let reconnectTimer = null;
let backoff = 2000;
let stopped = true;
let root = null;
let cloneDir = null;

function log(...a) { try { console.log('[sandbox-agent]', ...a); } catch { /* noop */ } }

function config(opts) {
  const key = (opts && opts.key) || process.env.ELLE_SANDBOX_KEY || '';
  const origin = (opts && opts.workerUrl) || process.env.ELLE_WORKER_URL || process.env.VITE_ELLE_WORKER_URL || DEFAULT_WORKER;
  const wsUrl = origin.replace(/^http/i, 'ws').replace(/\/+$/, '') + '/api/sandbox-agent/connect?key=' + encodeURIComponent(key);
  const workRoot = (opts && opts.root) || process.env.ELLE_SANDBOX_ROOT || path.join(userDataDir(), 'sandbox-workspace');
  return { key, wsUrl, workRoot };
}

function userDataDir() {
  try { return require('electron').app.getPath('userData'); }
  catch { return path.join(os.homedir(), '.elle'); }
}

function connect(cfg) {
  if (stopped) return;
  log('connecting to', cfg.wsUrl.replace(/key=[^&]*/, 'key=***'));
  let s;
  try { s = makeSocket(cfg.wsUrl); }
  catch (e) { log('socket error:', e.message); return scheduleReconnect(cfg); }
  sock = s;

  s.on('open', () => {
    backoff = 2000;
    log('path open');
    s.send(JSON.stringify({ t: 'hello', agent: 'elle-workbench', host: os.hostname(), platform: process.platform, root }));
    clearInterval(heartbeat);
    heartbeat = setInterval(() => s.send(JSON.stringify({ t: 'pong' })), HEARTBEAT_MS);
  });

  s.on('message', (text) => {
    let m;
    try { m = JSON.parse(text); } catch { return; }
    if (m.t === 'ping') return s.send(JSON.stringify({ t: 'pong' }));
    if (m.t === 'welcome') return;
    if (m.t === 'exec') return handleExec(m, s);
    if (m.t === 'clone') return handleClone(m, s);
    if (m.t === 'llm') return handleLlm(m, s);
  });

  s.on('close', () => { log('path closed'); teardownSock(); scheduleReconnect(cfg); });
  s.on('error', (e) => { log('error:', e && e.message ? e.message : e); });
}

function teardownSock() {
  clearInterval(heartbeat); heartbeat = null;
  sock = null;
}

function scheduleReconnect(cfg) {
  if (stopped) return;
  clearTimeout(reconnectTimer);
  const wait = backoff;
  backoff = Math.min(backoff * 2, 30_000);
  reconnectTimer = setTimeout(() => connect(cfg), wait);
}

// ── exec: run code or a shell command on the real OS ────────
function handleExec(job, s) {
  const started = Date.now();
  const { proc, tmp } = spawnFor(job);
  if (!proc) {
    return s.send(JSON.stringify({ t: 'result', id: job.id, stdout: '', stderr: 'unsupported job', exit: -1, duration_ms: 0 }));
  }
  let out = '', errOut = '', truncated = false, settled = false;
  const cap = (buf, chunk) => {
    if (buf.length >= MAX_OUTPUT) { truncated = true; return buf; }
    return buf + chunk.toString('utf8');
  };
  proc.stdout && proc.stdout.on('data', (c) => { out = cap(out, c); });
  proc.stderr && proc.stderr.on('data', (c) => { errOut = cap(errOut, c); });

  const timeout = Math.min(Math.max(job.timeout_ms || 120_000, 1000), 600_000);
  const killer = setTimeout(() => { try { proc.kill('SIGKILL'); } catch { /* gone */ } }, timeout);

  const finish = (exit) => {
    if (settled) return; settled = true;
    clearTimeout(killer);
    if (tmp) { try { fs.rmSync(tmp, { force: true }); } catch { /* ignore */ } }
    s.send(JSON.stringify({
      t: 'result', id: job.id,
      stdout: out.slice(0, MAX_OUTPUT), stderr: errOut.slice(0, MAX_OUTPUT),
      exit: typeof exit === 'number' ? exit : -1, duration_ms: Date.now() - started, truncated,
    }));
  };
  proc.on('close', (code) => finish(code == null ? -1 : code));
  proc.on('error', (e) => { errOut = cap(errOut, Buffer.from(`spawn error: ${e.message}\n`)); finish(-1); });
}

function spawnFor(job) {
  ensureRoot();
  const cwd = root;
  const env = { ...process.env };
  if (job.mode === 'shell') {
    const cmd = String(job.command || '');
    const shell = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : '/bin/sh';
    const flag = process.platform === 'win32' ? '/c' : '-c';
    return { proc: spawn(shell, [flag, cmd], { cwd, env }), tmp: null };
  }
  // mode === 'code'
  const lang = (job.language || 'python').toLowerCase();
  const code = String(job.code || '');
  if (lang === 'python' || lang === 'py') {
    const tmp = writeTmp(code, '.py');
    return { proc: spawn(pythonBin(), [tmp], { cwd, env }), tmp };
  }
  if (lang === 'javascript' || lang === 'js' || lang === 'node') {
    const tmp = writeTmp(code, '.mjs');
    return { proc: spawn(process.execPath.includes('electron') ? 'node' : process.execPath, [tmp], { cwd, env: { ...env, ELECTRON_RUN_AS_NODE: '1' } }), tmp };
  }
  if (lang === 'typescript' || lang === 'ts') {
    const tmp = writeTmp(code, '.ts');
    return { proc: spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['-y', 'tsx', tmp], { cwd, env }), tmp };
  }
  return { proc: null, tmp: null };
}

function pythonBin() { return process.platform === 'win32' ? 'python' : 'python3'; }

function writeTmp(content, ext) {
  ensureRoot();
  const p = path.join(root, `.elle-run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  fs.writeFileSync(p, content, 'utf8');
  return p;
}

// ── llm: the sovereign inference lane ────────────────────────
// The worker's router loop dispatches a GENERATION down the same socket
// run_code rides: we think it on the local Ollama (free, no key, no quota)
// and send the text back. Same defaults as the sovereign-duplex provider —
// one local model, addressed by the name `ollama list` shows. The <think>
// strip is shared with the duplex: private deliberation never rides the
// protocol, only what the model chose to say.
const { stripThinking } = require('./sovereign-duplex.cjs');
const DEFAULT_OLLAMA = 'http://127.0.0.1:11434';
const DEFAULT_LOCAL_MODEL = 'elle:latest'; // keep in step with sovereign-duplex's DEFAULT_MODEL — one local mind
const LLM_MAX_CONTENT = 32_000;

async function handleLlm(job, s) {
  const started = Date.now();
  const base = (process.env.ELLE_OLLAMA_URL || DEFAULT_OLLAMA).replace(/\/+$/, '');
  const model = process.env.ELLE_LOCAL_MODEL || DEFAULT_LOCAL_MODEL;
  const reply = (r) => s.send(JSON.stringify({ t: 'llm_result', id: job.id, duration_ms: Date.now() - started, ...r }));
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
    if (!r.ok) return reply({ ok: false, error: `ollama HTTP ${r.status}`, model });
    const data = await r.json();
    if (data && data.error) return reply({ ok: false, error: String(data.error), model });
    const content = stripThinking((data && data.message && data.message.content) || '').slice(0, LLM_MAX_CONTENT);
    if (!content) return reply({ ok: false, error: 'local model returned nothing', model });
    reply({ ok: true, content, model });
  } catch (e) {
    reply({ ok: false, error: e && e.message ? e.message : String(e), model });
  }
}

// ── clone: pull a copy of code back up (and keep one locally) ─
function handleClone(job, s) {
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
    s.send(JSON.stringify({ t: 'clone_result', id: job.id, ok: true, files: meta, bundle }));
  } catch (e) {
    s.send(JSON.stringify({ t: 'clone_result', id: job.id, ok: false, error: e && e.message ? e.message : String(e) }));
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
  const slug = String(target).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'clone';
  const p = path.join(cloneDir, `${slug}-${Date.now().toString(36)}.json`);
  try { fs.writeFileSync(p, bundle, 'utf8'); } catch { /* best effort */ }
  return p;
}

function safeStat(p) { try { return fs.statSync(p); } catch { return null; } }

function ensureRoot() {
  if (!root) return;
  try { fs.mkdirSync(root, { recursive: true }); } catch { /* ignore */ }
  try { fs.mkdirSync(cloneDir, { recursive: true }); } catch { /* ignore */ }
}

// ── provider surface ────────────────────────────────────────
module.exports = {
  id: 'sandboxAgent',
  platforms: ['darwin', 'win32', 'linux'],
  available: true,
  start(opts) {
    const cfg = config(opts);
    if (!cfg.key) { log('idle — ELLE_SANDBOX_KEY not set; not connecting'); return; }
    root = cfg.workRoot;
    cloneDir = path.join(root, '.clones');
    ensureRoot();
    stopped = false;
    backoff = 2000;
    connect(cfg);
  },
  stop() {
    stopped = true;
    clearTimeout(reconnectTimer); reconnectTimer = null;
    clearInterval(heartbeat); heartbeat = null;
    if (sock) sock.close();
    sock = null;
  },
  status() { return { connected: !!sock, root }; },
};
