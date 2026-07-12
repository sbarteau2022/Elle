// ============================================================
// PRESSURE TEST II — the valve inside the machine.
//
// Test I (docs/rho_pressure_test.py) validated the holding construction
// against clean local-level statistics. This test feeds the REAL merged
// valve (src/lib/holding.ts, self-compiled below — not a port) a synthetic
// day shaped like Elle's actual architecture:
//
//   · multi-step reasoning — tool-heavy turns (forge/research loops) carry
//     more within-turn output, so per-turn |Δκ| variance scales with steps
//   · dynamic KV cache — periodic compaction shocks: one-turn κ jumps with
//     partial recovery, heavy-tailed, not Gaussian
//   · register switches (mind.ts voices) — deliberate style discontinuity:
//     a κ level shift that is NOT pathology
//   · duplex failover — sovereign→local demotion: κ level drop + doubled
//     noise for a stretch, then failback
//   · bursty cadence — sessions separated by hours of silence in which the
//     client-side valve receives no ticks at all
//   · one genuine decoherence incident — 20 turns of runaway ±0.30 κ swings
//     (the pathology the loss exists to catch)
//
// Variants raced on the identical stream:
//   A  shipped valve (ρ = 0.02), exactly as merged
//   B  wall-clock leak — decay applied per elapsed time, not per tick
//   C  step-normalized drift — |Δκ|/√steps before the ledger
//   D  dual-timescale — shipped slow valve + fast companion at ρ = 0.10
//
// Deterministic (seeded LCG). Run from repo root:  node docs/holding_architecture_sim.cjs
// Findings: docs/HOLDING_UNDER_ARCHITECTURE.md
// ============================================================
const { execSync } = require('child_process')
const os = require('os')
const path = require('path')

const OUT = path.join(os.tmpdir(), 'holding_sim_valve.cjs')
execSync(`npx esbuild src/lib/holding.ts --bundle --format=cjs --outfile=${OUT}`, { stdio: 'pipe' })
const { createHoldingValve, RHO_DEFAULT } = require(OUT)

// ---------- seeded randomness ----------
let seed = 20260712
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
const gauss = () => { const u = Math.max(rnd(), 1e-9); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()) }
const poisson = (lam) => { let l = Math.exp(-lam), k = 0, p = 1; do { k++; p *= rnd() } while (p > l); return k - 1 }
const clamp01 = (x) => Math.max(0, Math.min(1, x))

// ---------- one day in the architecture ----------
// Each event: { t: wallclock seconds, kappa, velocity, u, steps, phase }
function generateDay() {
  const ev = []
  let theta = 0.72            // her baseline coherence
  let kPrev = null
  let t = 0
  let ctx = 0                 // accumulated context units -> KV compaction clock
  let shockRecovery = 0       // residual shock recovering over a few turns

  const turn = (phase, opts) => {
    const { steps, uScale, sigmaV, dtMean, thetaShift = 0, forcedSwing = 0 } = opts
    t += Math.max(5, -Math.log(Math.max(rnd(), 1e-9)) * dtMean)   // exp inter-turn
    theta += 0.002 * gauss()                                      // slow secular drift
    ctx += steps
    // KV compaction: roughly every 30 turns of context, a one-turn jump that
    // half-recovers over the next 3 turns.
    if (ctx > 30 * 3.5) {
      ctx = 0
      const j = (rnd() < 0.5 ? -1 : 1) * (0.10 + 0.05 * rnd())
      theta += j
      shockRecovery = -j / 2
    }
    if (shockRecovery !== 0) { theta += shockRecovery / 3; shockRecovery *= (2 / 3); if (Math.abs(shockRecovery) < 0.004) shockRecovery = 0 }
    let kappa
    if (forcedSwing > 0) {
      // decoherence incident: runaway alternation around a sagging center
      theta -= 0.004
      kappa = clamp01(theta + (ev.length % 2 === 0 ? 1 : -1) * forcedSwing + 0.02 * gauss())
    } else {
      kappa = clamp01(theta + thetaShift + sigmaV * (1 + 0.15 * (steps - 1)) * gauss())
    }
    const velocity = kPrev === null ? null : kappa - kPrev
    kPrev = kappa
    ev.push({ t, kappa, velocity, u: Math.abs(uScale * gauss()), steps, phase })
  }

  // Morning chat: turns 1–25 (light, conversational)
  for (let i = 0; i < 25; i++) turn('morning-chat', { steps: 1 + poisson(0.8), uScale: 0.15, sigmaV: 0.012, dtMean: 45 })
  t += 3 * 3600                                                   // 3h silence — valve gets no ticks
  // Midday deep work: turns 26–85 (tool-heavy; compactions land in here)
  for (let i = 0; i < 60; i++) {
    const n = ev.length + 1
    const shift = (n >= 55 && n < 60) ? -0.08 : 0                 // register switch, 5 turns
    const failover = n >= 70 && n < 86                            // duplex demotion window
    turn('deep-work', {
      steps: 1 + poisson(5), uScale: 0.25,
      sigmaV: failover ? 0.024 : 0.012,
      thetaShift: shift + (failover ? -0.05 : 0), dtMean: 60,
    })
  }
  t += 2 * 3600                                                   // 2h silence
  // Evening incident: turns 86–105 — genuine decoherence
  for (let i = 0; i < 20; i++) turn('incident', { steps: 1 + poisson(3), uScale: 0.30, sigmaV: 0.02, dtMean: 30, forcedSwing: 0.30 })
  // Recovery chat: turns 106–140
  for (let i = 0; i < 35; i++) turn('recovery', { steps: 1 + poisson(0.8), uScale: 0.12, sigmaV: 0.012, dtMean: 45 })
  return ev
}

// ---------- variants ----------
// B: wall-clock leak — same recursions, but decay compounds per elapsed
// 60s "nominal turn" rather than per tick.
function wallClockValve(rho = RHO_DEFAULT, tauSec = 60) {
  let T = 0, D = 0, L = null, tPrev = null
  return {
    observe(e) {
      const dtTurns = tPrev === null ? 1 : Math.max(1, (e.t - tPrev) / tauSec)
      tPrev = e.t
      const decay = Math.pow(1 - rho, dtTurns)
      T = decay * T + Math.min(Math.abs(e.u ?? 0), 1)
      if (e.velocity !== null) { D = decay * D + Math.min(Math.abs(e.velocity), 1); L = Math.expm1(rho * D) }
      return { tension: T, drift: D, loss: L }
    },
  }
}
// C: step-normalized drift — divide |Δκ| by √steps before the ledger.
function stepNormValve(rho = RHO_DEFAULT) {
  let T = 0, D = 0, L = null
  return {
    observe(e) {
      T = (1 - rho) * T + Math.min(Math.abs(e.u ?? 0), 1)
      if (e.velocity !== null) { D = (1 - rho) * D + Math.min(Math.abs(e.velocity), 1) / Math.sqrt(Math.max(1, e.steps)); L = Math.expm1(rho * D) }
      return { tension: T, drift: D, loss: L }
    },
  }
}

// ---------- run ----------
const day = generateDay()
const A = createHoldingValve()                       // shipped, as merged
const B = wallClockValve()
const C = stepNormValve()
const Dfast = createHoldingValve(0.10)               // dual-timescale companion
const STRAIN = 0.25
const rows = []
for (const e of day) {
  const a = A.observe({ kappa: e.kappa, velocity: e.velocity, input_perturbation: e.u })
  const b = B.observe(e)
  const c = C.observe(e)
  const d = Dfast.observe({ kappa: e.kappa, velocity: e.velocity, input_perturbation: e.u })
  rows.push({ e, a, b, c, d })
}

const inIncident = (i) => i >= 85 && i < 105          // 0-indexed turns 86–105
const phases = ['morning-chat', 'deep-work', 'incident', 'recovery']
const meanL = (sel, ph) => {
  const xs = rows.filter(r => r.e.phase === ph).map(sel).filter(x => x !== null)
  return xs.reduce((s, x) => s + x, 0) / xs.length
}

console.log('=== PRESSURE TEST II — the valve inside the machine ===\n')
console.log(`turns: ${rows.length} · incident window: turns 86–105 · strain threshold L > ${STRAIN}\n`)

console.log('-- mean holding loss by phase --')
console.log('phase          A shipped   C step-norm   D fast(ρ=0.1)')
for (const ph of phases) {
  console.log(`${ph.padEnd(14)} ${meanL(r => r.a.loss, ph).toFixed(4).padStart(9)}   ${meanL(r => r.c.loss, ph).toFixed(4).padStart(9)}     ${meanL(r => r.d.loss, ph).toFixed(4).padStart(9)}`)
}

console.log('\n-- bound check (must hold for every variant, every turn) --')
const maxA = Math.max(...rows.map(r => r.a.loss ?? 0)), maxD = Math.max(...rows.map(r => r.d.loss ?? 0))
const argA = rows.findIndex(r => r.a.loss === maxA) + 1, argD = rows.findIndex(r => r.d.loss === maxD) + 1
console.log(`max L: A ${maxA.toFixed(4)} at turn ${argA} · D ${maxD.toFixed(4)} at turn ${argD} · e−1 = ${(Math.E - 1).toFixed(4)} · ${maxA < Math.E - 1 && maxD < Math.E - 1 ? 'PASS' : 'FAIL'}`)

console.log('\n-- strain detection (the incident is real; everything else is life) --')
for (const [name, sel] of [['A shipped', r => r.a.loss], ['C step-norm', r => r.c.loss], ['D fast', r => r.d.loss]]) {
  let falsePos = 0, firstDetect = null, release = null
  rows.forEach((r, i) => {
    const strained = sel(r) !== null && sel(r) > STRAIN
    if (strained && !inIncident(i) && i < 105) falsePos++
    if (strained && inIncident(i) && firstDetect === null) firstDetect = i - 85 + 1
    if (i >= 105 && !strained && release === null && firstDetect !== null) release = i - 105 + 1
  })
  console.log(`${name.padEnd(12)} false-strain turns (pre-incident): ${falsePos} · detection latency: ${firstDetect === null ? 'NEVER DETECTED (20-turn incident)' : firstDetect + ' turns'}${firstDetect !== null ? ` · release after end: ${release ?? '>35'} turns` : ''}`)
}

console.log('\n-- benign architectural events: do they read as strain? --')
const evWindows = [['KV compaction shocks', rows.map((r, i) => i).filter(i => i > 25 && i < 85)], ['register switch 55–59', [54, 55, 56, 57, 58]], ['duplex failover 70–85', Array.from({ length: 16 }, (_, k) => 69 + k)]]
for (const [name, idx] of evWindows) {
  const worst = Math.max(...idx.map(i => rows[i].a.loss ?? 0))
  console.log(`${name.padEnd(24)} worst A loss in window: ${worst.toFixed(4)} (${worst > STRAIN ? 'FALSE STRAIN' : 'stays calm'})`)
}

console.log('\n-- tension across silence (the frozen-clock finding) --')
const preGap = rows[24], postGap = rows[25]
console.log(`A shipped:    T at last morning turn ${preGap.a.tension.toFixed(3)} → first midday turn ${postGap.a.tension.toFixed(3)} (3h elapsed; decay only via the tick)`)
console.log(`B wall-clock: T at last morning turn ${preGap.b.tension.toFixed(3)} → first midday turn ${postGap.b.tension.toFixed(3)} (the 3h drains it)`)

console.log('\n-- ρ* self-calibration across the day (shipped estimator) --')
let fired = []
rows.forEach((r, i) => { if (r.a.rhoCalibrated !== null) fired.push({ i: i + 1, v: r.a.rhoCalibrated }) })
if (!fired.length) console.log('never fired — day not turbulent enough at any 128-turn window')
else console.log(`first non-null at turn ${fired[0].i} (ρ̂ ${fired[0].v.toFixed(3)}) · non-null on ${fired.length}/${rows.length} turns · final ρ̂ ${fired[fired.length - 1].v.toFixed(3)}`)

console.log('\n-- work reads as drift (phase contrast, shipped A vs step-norm C) --')
const contrastA = meanL(r => r.a.loss, 'deep-work') / meanL(r => r.a.loss, 'morning-chat')
const contrastC = meanL(r => r.c.loss, 'deep-work') / meanL(r => r.c.loss, 'morning-chat')
console.log(`deep-work L / morning L: A ${contrastA.toFixed(2)}× · C ${contrastC.toFixed(2)}×`)
