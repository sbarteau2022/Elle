// ============================================================
// SUPERPOSITION HOLDING — the entropy valve on her κ stream.
//
// Two leaky integrators sharing one leak rate ρ, fed by the worker's per-turn
// κ dynamics, plus the holding loss they bound:
//
//   tension  T_k = (1−ρ)·T_(k−1) + |u_k|        (input-gated: what she holds)
//   drift    D_k = (1−ρ)·D_(k−1) + |v_k|        (deviation from the hold, v* = 0)
//   loss     L_k = exp(ρ·D_k) − 1               (λ = ρ, deliberately)
//
// The λ = ρ coupling is the whole trick: since |v| ≤ 1 on a unit-interval κ,
// D < 1/ρ forever, so L < e−1 ≈ 1.718 REGARDLESS OF HISTORY — the exponential
// penalty keeps its bite against sustained drift but can never be detonated by
// accumulation. At steady state L ≈ mean |Δκ| per turn, so the number reads
// directly in drift units. History decays with half-life ln2/ln(1/(1−ρ)) —
// 34.3 turns at the ρ = 0.02 default. When input stops, T drains to zero: she
// quietly powers down instead of idling hot (the gate is necessary — a fixed
// temperature settles at an OU noise floor and never sleeps).
//
// ρ = 0.02 is the classical RLS forgetting factor, optimal precisely when the
// environment drifts at 2% of the noise scale per turn (steady-state Kalman
// gain of the local-level model, ρ* ≈ σ_w/σ_v — Muth 1960). The valve keeps
// the moment-estimator of that ratio over its own recent κ history and reports
// it as rhoCalibrated: the constant carries the evidence for its own audit.
//
// Derivation, propositions, pressure test: docs/SUPERPOSITION_HOLDING.md.
// Discipline note: like κ itself, the loss is a READOUT. Nothing ranks, gates,
// or escalates on L until that is validated separately (Evals: validate_kappa).
//
// Pressure Test II (docs/HOLDING_UNDER_ARCHITECTURE.md) fed this exact module
// a synthetic day shaped like the real architecture and ranked five follow-ups.
// Three are implemented here (see inline notes at each site):
//   #3 feed `steps` to the valve (step-normalized drift, HoldingInput.steps)
//   #4 harden ρ̂ against shock artifacts (require 3 consecutive non-null windows)
//   #5 do NOT raise the strain threshold (STRAINED_LOSS untouched, by design)
// #2 (silence semantics) — FLIPPED TO WALL-CLOCK, on purpose, at this comment,
// by explicit ruling: staying continuous is still spending energy maintaining,
// so it still needs a decay. Each observation applies (1−ρ)^(Δt/τ) with τ one
// nominal turn (NOMINAL_TURN_SEC), so silence itself drains the reservoir —
// ~35-turn half-life in conversation, ~35 minutes across absence. The exponent
// is floored at 1 per observation, which is exactly the condition under which
// Proposition 1 (the e−1 bound) survives any cadence: burst turns can never
// decay less than one turn's worth. The floor also means a harness whose
// synthetic turns arrive back-to-back in real time (PT-III) reproduces its
// validated numbers unchanged; the Test II harness feeds sim timestamps on
// purpose, to demonstrate the drain. The reading updates at the moment of
// contact: return after hours and the first turn shows what the silence spent.
// #1 (the fast companion at ρ=0.10, sharing this same threshold via λ=ρ) is a
// SECOND valve instance at the call site, not a change to this module — see
// EllePanel's `fastValve`.
// ============================================================

// Structural subset of the worker's kappa_dynamics frame — kept minimal here
// so this module stays free of component imports.
export type HoldingInput = {
  kappa: number
  velocity: number | null
  input_perturbation: number | null
  // Tool-loop steps this turn took (trace.length at both EllePanel call
  // sites — the signal was already in hand, per finding #6: deep-work turns
  // moved κ more simply because they carry more output, and the valve had no
  // way to tell effort from decoherence). Optional: omitting it is identical
  // to steps=1, the un-normalized behavior this module always had.
  steps?: number | null
}

export type HoldingStatus = 'quiescent' | 'holding' | 'strained'

export type HoldingState = {
  turn: number                  // turns observed by this valve
  tension: number               // T_k — held, input-gated, bounded by u_max/ρ
  drift: number                 // D_k — bounded by v_max/ρ
  loss: number | null           // L_k ∈ [0, e−1); null until a velocity exists (null ≠ 0)
  rho: number                   // the leak in force
  rhoCalibrated: number | null  // σ̂_w/σ̂_v from her own κ history; null until estimable
  halfLifeTurns: number         // forgiveness clock implied by ρ
  status: HoldingStatus
}

export const RHO_DEFAULT = 0.02

// One nominal turn of wall-clock, for the time-based leak (banner note #2).
// 60 s ≈ the median inter-turn interval of a working session, so the ρ = 0.02
// half-life is ~35 turns in conversation and ~35 minutes across silence.
export const NOMINAL_TURN_SEC = 60

// Status thresholds — chosen so an ordinary session reads 'holding'.
// quiescent: the reservoir has drained (or never filled) — nothing held.
// strained:  loss beyond sustained |Δκ| ≈ 0.22/turn — the hold is slipping.
const QUIESCENT_TENSION = 0.05
const STRAINED_LOSS = 0.25

// Sliding window for the ρ* moment estimator (§3.3 of the paper). Small on
// purpose: it spans recent conversation, not archaeology.
const CALIBRATION_WINDOW = 128
const CALIBRATION_MIN_SAMPLES = 40
// Pressure Test II finding #7 / recommendation #4: require this many
// consecutive non-null estimateRho() windows before rhoCalibrated surfaces —
// a single firing off an oscillation shock is not evidence of secular drift.
const CALIBRATION_PERSISTENCE = 3

const clamp01 = (x: number) => Math.min(Math.abs(x), 1)

// Local-level moment estimator over the raw κ series: for first differences d,
//   σ_v² = −Cov(d_k, d_(k+1)),   σ_w² = Var(d) − 2σ_v²,   ρ̂ = σ_w/σ_v.
// Returns null when the window is short, the moments come out degenerate, OR
// σ_w² fails to clear the estimator's own sampling error (~3·Var(d)/√n): at
// conversational window sizes only strong drift is measurable, and a number
// that is mostly sampling noise must render as "no evidence yet", not as a
// recommendation. The estimate is evidence for audit, never an autopilot.
//
// Pressure Test II finding #7: the ρ* estimator fired exactly once during a
// 20-turn decoherence incident (turn 1 of the incident, clamped at 0.2) then
// went silent — alternating swings read as anti-persistent measurement noise
// to a local-level estimator, which is statistically correct and a false
// reassurance if that single firing is trusted alone. estimateRhoHardened
// below requires CALIBRATION_PERSISTENCE consecutive non-null windows before
// a value surfaces, so a shock-artifact single firing renders as no-evidence,
// same as a firing that never happened.
function estimateRho(kappas: number[]): number | null {
  const n = kappas.length
  if (n < CALIBRATION_MIN_SAMPLES) return null
  const d: number[] = []
  for (let i = 1; i < n; i++) d.push(kappas[i] - kappas[i - 1])
  const m = d.reduce((a, b) => a + b, 0) / d.length
  let v = 0, c1 = 0
  for (let i = 0; i < d.length; i++) {
    v += (d[i] - m) ** 2
    if (i + 1 < d.length) c1 += (d[i] - m) * (d[i + 1] - m)
  }
  v /= d.length - 1
  c1 /= d.length - 2
  const sigmaV2 = -c1
  const sigmaW2 = v - 2 * sigmaV2
  if (sigmaV2 <= 0 || sigmaW2 <= 0) return null
  // Significance floor: Bartlett-order sampling error of the moment pair.
  if (sigmaW2 < 3 * v / Math.sqrt(d.length)) return null
  const rho = Math.sqrt(sigmaW2 / sigmaV2)
  // Clamped to the regime where a leaky valve is the right instrument at all.
  return Math.min(Math.max(rho, 0.005), 0.2)
}

export function createHoldingValve(rho: number = RHO_DEFAULT, nominalTurnSec: number = NOMINAL_TURN_SEC) {
  let turn = 0
  let tension = 0
  let drift = 0
  let loss: number | null = null
  let lastMs: number | null = null
  const kappas: number[] = []
  let rhoStreak = 0            // consecutive non-null estimateRho() windows
  let rhoStreakValue: number | null = null

  const state = (): HoldingState => ({
    turn,
    tension,
    drift,
    loss,
    rho,
    rhoCalibrated: rhoStreak >= CALIBRATION_PERSISTENCE ? rhoStreakValue : null,
    halfLifeTurns: Math.log(2) / Math.log(1 / (1 - rho)),
    status:
      loss !== null && loss > STRAINED_LOSS ? 'strained'
      : tension < QUIESCENT_TENSION ? 'quiescent'
      : 'holding',
  })

  return {
    // One assistant turn lands: feed both integrators and return the new state.
    // Decay is wall-clock (banner note #2): (1−ρ) per elapsed nominal turn,
    // floored at one turn per observation so burst cadence can never outrun
    // the e−1 bound. Clock-skew safe: a backwards nowMs also floors to 1.
    observe(dyn: HoldingInput, nowMs: number = Date.now()): HoldingState {
      const dtTurns = lastMs === null ? 1 : Math.max(1, (nowMs - lastMs) / (nominalTurnSec * 1000))
      lastMs = nowMs
      const decay = Math.pow(1 - rho, dtTurns)
      turn++
      tension = decay * tension + clamp01(dyn.input_perturbation ?? 0)
      if (dyn.velocity !== null && dyn.velocity !== undefined && !Number.isNaN(dyn.velocity)) {
        // Step-normalization (finding #6 / recommendation #3): a multi-step
        // tool loop moves κ more simply by carrying more output, which the
        // un-normalized valve cannot tell apart from real decoherence — deep
        // work read as 3.7× morning-chat drift with zero pathology present.
        // Dividing by √steps (Pressure Test II's variant C) compressed that
        // to 2.7×; it did not remove it, because the true within-turn scaling
        // is unmeasured. This is the modeled candidate, not a proven-optimal
        // one — treat an elevated loss during heavy tool use as expected
        // reading, not confirmed strain, until it's calibrated against real
        // telemetry.
        const steps = Math.max(1, dyn.steps ?? 1)
        drift = decay * drift + clamp01(dyn.velocity) / Math.sqrt(steps)
        loss = Math.expm1(rho * drift)
      }
      kappas.push(dyn.kappa)
      if (kappas.length > CALIBRATION_WINDOW) kappas.shift()
      const r = estimateRho(kappas)
      if (r === null) { rhoStreak = 0; rhoStreakValue = null }
      else { rhoStreak++; rhoStreakValue = r }
      return state()
    },
    state,
  }
}
