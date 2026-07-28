'use strict';
// ============================================================
// TERMINAL — real shells inside the workbench.
//
// The renderer gets a Cursor-style integrated terminal (xterm.js in the
// drawer/panel); THIS is the half that actually runs the shell. Two modes,
// chosen at require time:
//
//   pty  — node-pty (optionalDependencies). A true TTY: prompts, colors,
//          readline editing, vim/htop/ssh, resize — the full terminal.
//   pipe — child_process fallback when node-pty didn't build on this
//          machine. Line-oriented commands still work end to end; TERM is
//          set to 'dumb' so well-behaved CLIs drop the TTY tricks. The
//          renderer is told which mode it got (create() → { pty }) and
//          shows a quiet badge instead of pretending.
//
// Degrading instead of dying is the house rule (see local-embed, sandbox
// agent): a missing native module must never take the tab down with it.
//
// Sessions live here in the main process, keyed by id. The renderer drives
// them over IPC (main.cjs terminal:* channels) and receives output/exit as
// events. Everything spawned runs as the logged-in user, same as any
// terminal app — this is the superadmin's own machine, and the workbench is
// already the room where her hands are trusted.
// ============================================================

const os = require('os');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');

let pty = null;
try { pty = require('node-pty'); } catch { /* pipe fallback below */ }

// ── pure: which shell is "the user's shell" on this box ─────────────────
function defaultShell(platform, env) {
  if (platform === 'win32') return env.COMSPEC || 'cmd.exe';
  if (env.SHELL) return env.SHELL;
  return platform === 'darwin' ? '/bin/zsh' : '/bin/bash';
}

// ── pure: how to invoke it ──────────────────────────────────────────────
// A pty gets a login shell (-l) so PATH/rc files match the user's real
// terminal — the #1 "why doesn't `node` exist here" bug in integrated
// terminals. cmd.exe takes no such flag. Pipe mode gets -i so the shell
// still prints prompts and reads line-by-line.
function shellArgs(platform, ptyMode) {
  if (platform === 'win32') return [];
  return ptyMode ? ['-l'] : ['-i'];
}

// ── pure: the child's environment ───────────────────────────────────────
function sessionEnv(baseEnv, ptyMode) {
  const env = { ...baseEnv };
  if (ptyMode) env.TERM = 'xterm-256color';
  else env.TERM = 'dumb';
  // Mark the session so rc files / tooling can detect the workbench.
  env.ELLE_TERMINAL = '1';
  return env;
}

// ── pure: a safe starting directory ─────────────────────────────────────
function resolveCwd(requested, home, exists) {
  if (requested && typeof requested === 'string' && exists(requested)) return requested;
  return home;
}

const sessions = new Map(); // id → { kind, proc, shell, cwd, cols, rows }
let onDataCb = null;  // (id, dataString)
let onExitCb = null;  // (id, exitCode)

function emitData(id, data) { if (onDataCb) { try { onDataCb(id, data); } catch { /* renderer gone */ } } }
function emitExit(id, code) { if (onExitCb) { try { onExitCb(id, code); } catch { /* renderer gone */ } } }

function create(opts) {
  const o = opts && typeof opts === 'object' ? opts : {};
  const id = crypto.randomUUID();
  const shell = defaultShell(process.platform, process.env);
  const cwd = resolveCwd(o.cwd, os.homedir(), (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } });
  const cols = Number.isInteger(o.cols) && o.cols > 0 ? o.cols : 80;
  const rows = Number.isInteger(o.rows) && o.rows > 0 ? o.rows : 24;

  if (pty) {
    const proc = pty.spawn(shell, shellArgs(process.platform, true), {
      name: 'xterm-256color', cols, rows, cwd, env: sessionEnv(process.env, true),
    });
    proc.onData((data) => emitData(id, data));
    proc.onExit(({ exitCode }) => { sessions.delete(id); emitExit(id, exitCode); });
    sessions.set(id, { kind: 'pty', proc, shell, cwd, cols, rows });
  } else {
    const proc = spawn(shell, shellArgs(process.platform, false), {
      cwd, env: sessionEnv(process.env, false), stdio: ['pipe', 'pipe', 'pipe'],
    });
    proc.stdout.on('data', (b) => emitData(id, b.toString('utf8')));
    proc.stderr.on('data', (b) => emitData(id, b.toString('utf8')));
    proc.on('exit', (code) => { sessions.delete(id); emitExit(id, code == null ? -1 : code); });
    proc.on('error', (err) => { emitData(id, `\r\n[terminal] failed to start ${shell}: ${err.message}\r\n`); sessions.delete(id); emitExit(id, -1); });
    sessions.set(id, { kind: 'pipe', proc, shell, cwd, cols, rows });
  }
  return { id, shell, cwd, pty: !!pty };
}

function write(id, data) {
  const s = sessions.get(id);
  if (!s) return;
  const text = String(data);
  if (s.kind === 'pty') s.proc.write(text);
  else if (s.proc.stdin.writable) s.proc.stdin.write(text);
}

function resize(id, cols, rows) {
  const s = sessions.get(id);
  if (!s || !Number.isInteger(cols) || !Number.isInteger(rows) || cols <= 0 || rows <= 0) return;
  s.cols = cols; s.rows = rows;
  if (s.kind === 'pty') { try { s.proc.resize(cols, rows); } catch { /* racing exit */ } }
  // pipe mode: nothing to resize — there is no tty.
}

function kill(id) {
  const s = sessions.get(id);
  if (!s) return;
  sessions.delete(id);
  try { s.kind === 'pty' ? s.proc.kill() : s.proc.kill('SIGHUP'); } catch { /* already gone */ }
}

function list() {
  return [...sessions.entries()].map(([id, s]) => ({ id, shell: s.shell, cwd: s.cwd, pty: s.kind === 'pty' }));
}

function disposeAll() {
  for (const id of [...sessions.keys()]) kill(id);
}

module.exports = {
  id: 'terminal',
  platforms: ['darwin', 'win32', 'linux'],
  available: true,

  create, write, resize, kill, list, disposeAll,
  onData(cb) { onDataCb = cb; },
  onExit(cb) { onExitCb = cb; },
  ptyBacked: () => !!pty,

  // pure / testable
  defaultShell, shellArgs, sessionEnv, resolveCwd,
};
