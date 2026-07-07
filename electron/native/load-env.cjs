'use strict';
// ============================================================
// Minimal .env loader for the Electron MAIN process.
//
// The gap this closes: .env.example says "copy to .env", and Vite duly loads
// it — but only into the RENDERER, and only VITE_* keys. The native providers
// (sandbox agent, sovereign duplex) run in the main process and read plain
// process.env, so ELLE_SANDBOX_KEY in a .env file was silently invisible to
// them: the agent logged "idle — key not set" and the sandbox path never
// opened, even with a perfectly good .env sitting in the repo root.
//
// Dependency-free on purpose. Existing process.env values always win — a
// shell-exported variable outranks the file, so nothing already working
// changes behavior.
// ============================================================

const fs = require('fs');
const path = require('path');

// Pure: .env text → { KEY: value }. Supports comments, `export KEY=`,
// and single/double-quoted values. No inline comments after a value — a
// secret is allowed to contain '#'.
function parseDotEnv(text) {
  const out = {};
  for (const line of String(text == null ? '' : text).split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    const q = v.match(/^(['"])([\s\S]*)\1$/);
    if (q) v = q[2];
    out[m[1]] = v;
  }
  return out;
}

// Load the first .env found and lay it UNDER the current environment.
// Returns the number of keys applied (for the boot log).
function loadDotEnv(candidates) {
  const paths = candidates && candidates.length ? candidates : [
    path.join(__dirname, '..', '..', '.env'),  // repo root in dev (electron/native/ → root)
    path.join(process.cwd(), '.env'),          // wherever the app was launched from
  ];
  for (const p of paths) {
    let raw;
    try { raw = fs.readFileSync(p, 'utf8'); } catch { continue; }
    const parsed = parseDotEnv(raw);
    let applied = 0;
    for (const [k, v] of Object.entries(parsed)) {
      if (process.env[k] === undefined) { process.env[k] = v; applied++; }
    }
    try { console.log(`[env] loaded ${applied} var(s) from ${p}`); } catch { /* noop */ }
    return applied;
  }
  return 0;
}

module.exports = { parseDotEnv, loadDotEnv };
