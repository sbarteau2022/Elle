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
// ============================================================

// Structural subset of the worker's kappa_dynamics frame — kept minimal here
// so this module stays free of component imports.
export type HoldingInput = {
  kappa: number
  velocity: number | null
  input_perturbation: number | null
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

// Status thresholds — chosen so an ordinary session reads 'holding'.
// quiescent: the reservoir has drained (or never filled) — nothing held.
// strained:  loss beyond sustained |Δκ| ≈ 0.22/turn — the hold is slipping.
const QUIESCENT_TENSION = 0.05
const STRAINED_LOSS = 0.25

// Sliding window for the ρ* moment estimator (§3.3 of the paper). Small on
// purpose: it spans recent conversation, not archaeology.
const CALIBRATION_WINDOW = 128
const CALIBRATION_MIN_SAMPLES = 40

const clamp01 = (x: number) => Math.min(Math.abs(x), 1)

// Local-level moment estimator over the raw κ series: for first differences d,
//   σ_v² = −Cov(d_k, d_(k+1)),   σ_w² = Var(d) − 2σ_v²,   ρ̂ = σ_w/σ_v.
// Returns null when the window is short, the moments come out degenerate, OR
// σ_w² fails to clear the estimator's own sampling error (~3·Var(d)/√n): at
// conversational window sizes only strong drift is measurable, and a number
// that is mostly sampling noise must render as "no evidence yet", not as a
// recommendation. The estimate is evidence for audit, never an autopilot.
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

export function createHoldingValve(rho: number = RHO_DEFAULT) {
  let turn = 0
  let tension = 0
  let drift = 0
  let loss: number | null = null
  const kappas: number[] = []

  const state = (): HoldingState => ({
    turn,
    tension,
    drift,
    loss,
    rho,
    rhoCalibrated: estimateRho(kappas),
    halfLifeTurns: Math.log(2) / Math.log(1 / (1 - rho)),
    status:
      loss !== null && loss > STRAINED_LOSS ? 'strained'
      : tension < QUIESCENT_TENSION ? 'quiescent'
      : 'holding',
  })

  return {
    // One assistant turn lands: feed both integrators and return the new state.
    observe(dyn: HoldingInput): HoldingState {
      turn++
      tension = (1 - rho) * tension + clamp01(dyn.input_perturbation ?? 0)
      if (dyn.velocity !== null && dyn.velocity !== undefined && !Number.isNaN(dyn.velocity)) {
        drift = (1 - rho) * drift + clamp01(dyn.velocity)
        loss = Math.expm1(rho * drift)
      }
      kappas.push(dyn.kappa)
      if (kappas.length > CALIBRATION_WINDOW) kappas.shift()
      return state()
    },
    state,
  }
}
