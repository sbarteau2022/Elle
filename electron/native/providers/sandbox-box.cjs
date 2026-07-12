'use strict';
// ============================================================
// The box — Docker isolation for sandbox exec on this machine.
//
// Until now every run_code / run_shell job spawned straight onto the real OS
// with the operator's full environment and network: cwd was a default folder,
// not a jail — `cd ..`, an absolute path, or a `curl` all walked right out.
// That was fine while the ONLY thing deciding what ran was the cloud brain
// (every command visible in the dispatch payload). It stops being fine the
// moment a SECOND, locally-reasoning brain (see local-agent.ts in the worker)
// starts issuing commands of its own.
//
// So exec goes through here instead. Each job runs inside a throwaway Docker
// container: the sandbox workspace is bind-mounted at /work (and NOTHING else
// of the host is visible), the network is denied by default, privileges are
// dropped, and CPU/memory/pids are capped. "Build to the moon inside /work,
// can't touch the rest of the machine, can't phone out."
//
// FAIL-CLOSED: when isolation is 'docker' (the default) and the Docker daemon
// is not reachable, exec is REFUSED — it never silently falls back to a bare
// host spawn. A broken box can only ever become "no exec", never "no box".
// The only way to run on the bare host is to set ELLE_SANDBOX_ISOLATION=none
// explicitly (loudly logged, not recommended).
//
// NOTE (Apple Silicon): the LOCAL MODEL does NOT run in here — Docker Desktop
// on an M-series Mac has no Metal passthrough, so inference stays native on the
// host (see sandbox-agent.cjs handleLlm / sovereign-duplex). Only the exec of
// shell/code is jailed. That split is deliberate: fast inference, contained
// hands.
//
// Config (env, all optional):
//   ELLE_SANDBOX_ISOLATION  'docker' (default) | 'none' (bare host, opt-out)
//   ELLE_SANDBOX_IMAGE      container image (default 'elle-sandbox:latest') —
//                           must have python3 + node + npx on PATH.
//   ELLE_SANDBOX_NET        docker --network value (default 'none')
//   ELLE_SANDBOX_MEMORY     --memory   (default '2g')
//   ELLE_SANDBOX_CPUS       --cpus     (default '2')
//   ELLE_SANDBOX_PIDS       --pids-limit (default '512')
//   ELLE_SANDBOX_USER       --user     (default '1000:1000')
//   ELLE_DOCKER_BIN         docker binary (default 'docker'; e.g. 'podman')
// ============================================================

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  image: 'elle-sandbox:latest',
  network: 'none',
  memory: '2g',
  cpus: '2',
  pids: '512',
  user: '1000:1000',
  dockerBin: 'docker',
};

// 'docker' unless the operator has explicitly opted out with 'none'. Any other
// value is treated as 'docker' — the safe default wins on a typo.
function isolationMode() {
  const m = String(process.env.ELLE_SANDBOX_ISOLATION || 'docker').toLowerCase().trim();
  return m === 'none' ? 'none' : 'docker';
}

function boxConfig() {
  return {
    image:     process.env.ELLE_SANDBOX_IMAGE  || DEFAULTS.image,
    network:   process.env.ELLE_SANDBOX_NET    || DEFAULTS.network,
    memory:    process.env.ELLE_SANDBOX_MEMORY || DEFAULTS.memory,
    cpus:      process.env.ELLE_SANDBOX_CPUS   || DEFAULTS.cpus,
    pids:      process.env.ELLE_SANDBOX_PIDS   || DEFAULTS.pids,
    user:      process.env.ELLE_SANDBOX_USER   || DEFAULTS.user,
    dockerBin: process.env.ELLE_DOCKER_BIN     || DEFAULTS.dockerBin,
  };
}

// Pure: the container-side command for a job, using generic Linux binaries
// (NOT the host's electron/npx.cmd paths commandFor picks). ext === null means
// "shell, no temp file". Returns null for an unsupported language.
function containerCommandFor(job) {
  if (job.mode === 'shell') {
    return { bin: '/bin/sh', args: ['-c', String(job.command || '')], ext: null };
  }
  const lang = (job.language || 'python').toLowerCase();
  if (lang === 'python' || lang === 'py') return { bin: 'python3', args: [], ext: '.py' };
  if (lang === 'javascript' || lang === 'js' || lang === 'node') return { bin: 'node', args: [], ext: '.mjs' };
  if (lang === 'typescript' || lang === 'ts') return { bin: 'npx', args: ['-y', 'tsx'], ext: '.ts' };
  return null;
}

// Pure: build the argv (everything AFTER the docker binary) that runs `inner`
// ({ bin, args }, already pointed at /work paths) inside a locked container
// with `root` bind-mounted at /work. Kept pure so the jail flags are unit
// testable without a Docker daemon.
function dockerRunArgs(inner, root, cfg) {
  const c = cfg || boxConfig();
  return [
    'run', '--rm', '-i',
    '--network', c.network,
    '--memory', c.memory,
    '--memory-swap', c.memory,          // no swap headroom beyond the cap
    '--cpus', String(c.cpus),
    '--pids-limit', String(c.pids),
    '--user', c.user,
    '--cap-drop', 'ALL',
    '--security-opt', 'no-new-privileges',
    '--read-only',                       // container FS is read-only …
    '--tmpfs', '/tmp:rw,size=64m',       // … except a small scratch /tmp
    '-v', `${root}:/work`,               // … and the workspace at /work (rw)
    '-w', '/work',
    '-e', 'HOME=/work',                  // pip/npm/npx caches land in the writable mount, not the read-only root
    c.image,
    inner.bin, ...inner.args,
  ];
}

// Is the Docker daemon actually reachable? Cached briefly so we don't shell out
// on every single exec, but a DOWN daemon is re-checked every call (we never
// cache "up" long enough to matter, and never cache "down" at all).
let _probe = { at: 0, ok: false };
function dockerAvailable(cfg) {
  const c = cfg || boxConfig();
  const now = Date.now();
  if (_probe.ok && now - _probe.at < 30_000) return true;
  let ok = false;
  try {
    const r = spawnSync(c.dockerBin, ['version', '--format', '{{.Server.Version}}'],
      { encoding: 'utf8', timeout: 8_000 });
    ok = r.status === 0 && !!String(r.stdout || '').trim();
  } catch { ok = false; }
  _probe = { at: now, ok };
  return ok;
}

function writeTmp(root, content, ext) {
  const p = path.join(root, `.elle-run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  fs.writeFileSync(p, content, 'utf8');
  return p;
}

// Spawn a job inside the box. Mirrors sandbox-agent.spawnFor's contract:
// returns { proc, tmp, error }. `proc` is null (with `error` set) when the job
// can't be boxed — the caller turns that into a failed result, never a bare
// spawn. `tmp` (a host path inside `root`, hence visible at /work in the
// container) is returned for the caller to clean up, exactly as before.
function boxedSpawn(job, root, cfg) {
  const c = cfg || boxConfig();
  const cc = containerCommandFor(job);
  if (!cc) return { proc: null, tmp: null, error: 'unsupported job language for the box' };

  let tmp = null;
  const innerArgs = [...cc.args];
  if (cc.ext !== null) {
    try { tmp = writeTmp(root, String(job.code || ''), cc.ext); }
    catch (e) { return { proc: null, tmp: null, error: `could not stage code into the box: ${e && e.message ? e.message : e}` }; }
    innerArgs.push(`/work/${path.basename(tmp)}`);
  }
  const args = dockerRunArgs({ bin: cc.bin, args: innerArgs }, root, c);
  try {
    const proc = spawn(c.dockerBin, args, { cwd: root, env: { ...process.env } });
    return { proc, tmp };
  } catch (e) {
    if (tmp) { try { fs.rmSync(tmp, { force: true }); } catch { /* ignore */ } }
    return { proc: null, tmp: null, error: `docker spawn failed: ${e && e.message ? e.message : e}` };
  }
}

module.exports = {
  isolationMode,
  boxConfig,
  containerCommandFor,
  dockerRunArgs,
  dockerAvailable,
  boxedSpawn,
};
