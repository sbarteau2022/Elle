// ============================================================
// PRESSURE TEST IV — the bounded free-energy reform, three attempts.
//
// Pressure Test III tried a literal free-energy decomposition (complexity −
// accuracy) and found it unbounded (max F̄ = 6.0 vs the required <e−1) and
// wildly oversensitive (65 false-strain turns) — it fed the ALREADY-
// ACCUMULATED tension (bounded only by 1/ρ ≈ 50) into a raw leaky mean, with
// nothing to saturate it. This test tries the reform the finding called
// for: apply the SAME proof that bounds L (leaky-integrate a per-turn
// quantity clamped to magnitude ≤1, then exp(ρ·x)−1) to a genuinely
// different per-turn signal — the gap between this turn's complexity (raw
// perturbation) and accuracy (how close the observation came to the held
// state, v*=0).
//
// Per Pressure Test II/III's own discipline: an unvalidated construct stays
// quarantined in the throwaway sim, not in the shipped holding.ts — only
// steps-normalization and the hardened ρ̂ earned that (Test III). All three
// variants below live here, self-contained; none touch the real module.
//
//   E1  floored per turn:  gap = max(0, complexity - accuracy)
//   E2  signed ledger, magnitude read: freeEnergy = expm1(ρ·|feGap|)
//   E3  signed ledger, debt-only read: freeEnergy = expm1(ρ·max(0,feGap))
//
// Run from repo root: node docs/holding_pressure_test_iv.cjs
// ============================================================
const { execSync } = require('child_process')
const os = require('os')
const path = require('path')

const OUT = path.join(os.tmpdir(), 'holding_sim_valve_iv.cjs')
execSync(`npx esbuild src/lib/holding.ts --bundle --format=cjs --outfile=${OUT}`, { stdio: 'pipe' })
const { createHoldingValve, RHO_DEFAULT } = require(OUT)

// ---------- identical seeded generator to Test II / III ----------
let seed = 20260712
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
const gauss = () => { const u = Math.max(rnd(), 1e-9); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()) }
const poisson = (lam) => { let l = Math.exp(-lam), k = 0, p = 1; do { k++; p *= rnd() } while (p > l); return k - 1 }
const clamp01 = (x) => Math.max(0, Math.min(1, x))

function generateDay() {
  const ev = []
  let theta = 0.72, kPrev = null, t = 0, ctx = 0, shockRecovery = 0
  const turn = (phase, opts) => {
    const { steps, uScale, sigmaV, dtMean, thetaShift = 0, forcedSwing = 0 } = opts
    t += Math.max(5, -Math.log(Math.max(rnd(), 1e-9)) * dtMean)
    theta += 0.002 * gauss()
    ctx += steps
    if (ctx > 30 * 3.5) {
      ctx = 0
      const j = (rnd() < 0.5 ? -1 : 1) * (0.10 + 0.05 * rnd())
      theta += j; shockRecovery = -j / 2
    }
    if (shockRecovery !== 0) { theta += shockRecovery / 3; shockRecovery *= (2 / 3); if (Math.abs(shockRecovery) < 0.004) shockRecovery = 0 }
    let kappa
    if (forcedSwing > 0) { theta -= 0.004; kappa = clamp01(theta + (ev.length % 2 === 0 ? 1 : -1) * forcedSwing + 0.02 * gauss()) }
    else { kappa = clamp01(theta + thetaShift + sigmaV * (1 + 0.15 * (steps - 1)) * gauss()) }
    const velocity = kPrev === null ? null : kappa - kPrev
    kPrev = kappa
    ev.push({ t, kappa, velocity, u: Math.abs(uScale * gauss()), steps, phase })
  }
  for (let i = 0; i < 25; i++) turn('morning-chat', { steps: 1 + poisson(0.8), uScale: 0.15, sigmaV: 0.012, dtMean: 45 })
  t += 3 * 3600
  for (let i = 0; i < 60; i++) {
    const n = ev.length + 1
    const shift = (n >= 55 && n < 60) ? -0.08 : 0
    const failover = n >= 70 && n < 86
    turn('deep-work', { steps: 1 + poisson(5), uScale: 0.25, sigmaV: failover ? 0.024 : 0.012, thetaShift: shift + (failover ? -0.05 : 0), dtMean: 60 })
  }
  t += 2 * 3600
  for (let i = 0; i < 20; i++) turn('incident', { steps: 1 + poisson(3), uScale: 0.30, sigmaV: 0.02, dtMean: 30, forcedSwing: 0.30 })
  for (let i = 0; i < 35; i++) turn('recovery', { steps: 1 + poisson(0.8), uScale: 0.12, sigmaV: 0.012, dtMean: 45 })
  return ev
}

// ---------- three bounded free-energy variants (self-contained) ----------
function freeEnergyValve(read, rho = RHO_DEFAULT) {
  let feGap = 0
  return {
    observe(e) {
      if (e.velocity === null) return { freeEnergy: null, feGap }
      const v = clamp01(e.velocity)
      const complexity = clamp01(e.u ?? 0)
      const accuracy = 1 - v
      const rawGap = complexity - accuracy
      const gap = read === 'floored' ? Math.max(0, rawGap) : Math.max(-1, Math.min(1, rawGap))
      feGap = (1 - rho) * feGap + gap
      const freeEnergy =
        read === 'floored' ? Math.expm1(rho * feGap)
        : read === 'magnitude' ? Math.expm1(rho * Math.abs(feGap))
        : Math.expm1(rho * Math.max(0, feGap))   // 'debt-only'
      return { freeEnergy, feGap }
    },
  }
}

const day = generateDay()
const A = createHoldingValve()                        // shipped ρ=0.02 — the validated baseline
const Dfast = createHoldingValve(0.10)                 // fast companion — the already-wired engine
const E1 = freeEnergyValve('floored')
const E2 = freeEnergyValve('magnitude')
const E3 = freeEnergyValve('debt-only')

const rowsA = day.map(e => A.observe({ kappa: e.kappa, velocity: e.velocity, input_perturbation: e.u }))
const rowsD = day.map(e => Dfast.observe({ kappa: e.kappa, velocity: e.velocity, input_perturbation: e.u }))
const rowsE1 = day.map(e => E1.observe(e))
const rowsE2 = day.map(e => E2.observe(e))
const rowsE3 = day.map(e => E3.observe(e))

const inIncident = (i) => i >= 85 && i < 105
const mean = (rows, sel, ph) => {
  const xs = day.map((e, i) => [e, rows[i]]).filter(([e]) => e.phase === ph).map(([, r]) => sel(r)).filter(x => x !== null)
  return xs.reduce((s, x) => s + x, 0) / xs.length
}
const detectFalse = (rows, sel, threshold) => {
  let falsePos = 0, firstDetect = null, release = null
  day.forEach((e, i) => {
    const v = sel(rows[i])
    const strained = v !== null && v > threshold
    if (strained && !inIncident(i) && i < 105) falsePos++
    if (strained && inIncident(i) && firstDetect === null) firstDetect = i - 85 + 1
    if (i >= 105 && !strained && release === null && firstDetect !== null) release = i - 105 + 1
  })
  return { falsePos, firstDetect, release }
}

console.log('=== PRESSURE TEST IV — the bounded free-energy reform, three attempts ===\n')
console.log(`turns: ${day.length} · incident window: turns 86–105 · strain threshold 0.25\n`)

console.log('-- bound check: same construction as L (leaky-integrate a magnitude-≤1 term, exp(ρ·x)−1) --')
for (const [name, rows, sel] of [['E1 floored', rowsE1, r => r.freeEnergy], ['E2 magnitude', rowsE2, r => r.freeEnergy], ['E3 debt-only', rowsE3, r => r.freeEnergy]]) {
  const max = Math.max(...rows.map(r => sel(r) ?? 0))
  console.log(`${name.padEnd(14)} max: ${max.toFixed(4)} · e−1 = ${(Math.E - 1).toFixed(4)} · ${max < Math.E - 1 ? 'PASS' : 'FAIL'}`)
}

console.log('\n-- strain detection: L vs all three variants --')
for (const [name, rows, sel] of [['L (shipped)', rowsA, r => r.loss], ['E1 floored', rowsE1, r => r.freeEnergy], ['E2 magnitude', rowsE2, r => r.freeEnergy], ['E3 debt-only', rowsE3, r => r.freeEnergy]]) {
  const { falsePos, firstDetect, release } = detectFalse(rows, sel, 0.25)
  console.log(`${name.padEnd(14)} false-strain: ${String(falsePos).padStart(3)} · detection: ${firstDetect === null ? 'NEVER' : firstDetect + ' turns'}${firstDetect !== null ? ` · release ${release ?? '>35'} turns after end` : ''}`)
}

console.log('\n-- mean by phase, all three variants (why each one fails) --')
console.log('phase          E1 floored   E2 magnitude  E3 debt-only')
for (const ph of ['morning-chat', 'deep-work', 'incident', 'recovery']) {
  console.log(`${ph.padEnd(14)} ${mean(rowsE1, r => r.freeEnergy, ph).toFixed(4).padStart(11)}   ${mean(rowsE2, r => r.freeEnergy, ph).toFixed(4).padStart(11)}   ${mean(rowsE3, r => r.freeEnergy, ph).toFixed(4).padStart(11)}`)
}

console.log('\n-- for reference: the already-wired engine (slow L + fast D) on this day --')
let engineDetect = null, engineFalsePos = 0
day.forEach((e, i) => {
  const strained = (rowsA[i].loss !== null && rowsA[i].loss > 0.25) || (rowsD[i].loss !== null && rowsD[i].loss > 0.25)
  if (strained && !inIncident(i) && i < 105) engineFalsePos++
  if (strained && inIncident(i) && engineDetect === null) engineDetect = i - 85 + 1
})
console.log(`detects at: ${engineDetect ?? 'NEVER'} turns · false-strain: ${engineFalsePos} (this remains the shipped mechanism)`)
