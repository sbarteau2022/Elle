'use strict';
// ============================================================
// Native capability registry — the cross-platform base main.cjs and
// preload.cjs build on. Before this, main.cjs hardcoded one macOS-only
// addon load; the renderer had one single-purpose IPC channel
// (`head-motion-available`) that only ever meant one thing.
//
// Now: a "provider" is any native feature gated by platform/hardware
// (today just headMotion). main.cjs asks this registry for capabilities and
// active providers instead of knowing about addons directly, so adding the
// next native feature — gesture input, a future vision provider on
// Windows/Linux — means adding one file under providers/ and one line here,
// not touching main.cjs or preload.cjs.
// ============================================================
const headMotion = require('./providers/head-motion.cjs');
const sandboxAgent = require('./providers/sandbox-agent.cjs');
const sovereignKvCache = require('./providers/sovereign-kv-cache.cjs');
const sovereignDuplex = require('./providers/sovereign-duplex.cjs');

const providers = [headMotion, sandboxAgent, sovereignKvCache, sovereignDuplex];

function isActive(provider) {
  return provider.platforms.includes(process.platform) && provider.available;
}

function activeProviders() {
  return providers.filter(isActive);
}

// { platform, headMotion: bool, ... } — one map the renderer can trust,
// instead of probing per feature or guessing from platform strings.
function getCapabilities() {
  const caps = { platform: process.platform };
  for (const p of providers) caps[p.id] = isActive(p);
  return caps;
}

function getProvider(id) {
  return activeProviders().find((p) => p.id === id) || null;
}

module.exports = { getCapabilities, getProvider, providers };
