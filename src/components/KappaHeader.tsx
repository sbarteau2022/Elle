// ============================================================
// κ HEADER — a discrete, single-row coherence readout for the chat.
// Sits above the conversation window and updates live each assistant turn.
// Deliberately quiet: small mono type, muted colour, one line. It is a readout,
// not a dashboard. Values come from the worker's per-turn dynamics
// (kappa_dynamics on the /api/elle-router and /api/chat responses), computed
// over the model OUTPUT ONLY with dt = 1 step.
//
// null ≠ 0: a derivative that does not yet have enough turns to exist renders
// as "—", distinct from a real 0.
//
// The T / L cells are the superposition-holding valve (src/lib/holding.ts,
// derivation in docs/SUPERPOSITION_HOLDING.md): held tension and holding loss,
// both leaky at ρ. L is bounded by e−1 by construction and reads ≈ mean |Δκ|
// per turn at steady state; it turns amber only when the hold is strained.
// Like κ, it is a readout — nothing ranks on it.
// ============================================================

import type { CSSProperties } from 'react'
import type { HoldingState } from '../lib/holding'

export type KappaDynamics = {
  step_index: number
  kappa: number
  velocity: number | null
  acceleration: number | null
  jerk: number | null
  reserve: number
  input_perturbation: number | null
} | null

// The durable κ MEMORY state (worker's /api/kappa-state). Distinct from the
// per-turn dynamics above: this is the substrate the bending traces accumulate
// in, and the seam that governs whether κ RANKS anything yet. While the gate is
// closed (provisional=true, ranks=false) κ is computing and visible but sorts
// nothing — the readout says so, so the number is never mistaken for validated.
export type KappaMemory = {
  provisional: boolean
  ranks: boolean
  r_estimate: number | null
  reserve: number | null
  trace_count: number
  note: string
} | null

// "—" for null (insufficient data), otherwise the number to `d` decimals. A
// genuine 0 prints as "0.000", never "—".
const f = (x: number | null | undefined, d = 3): string =>
  (x === null || x === undefined || Number.isNaN(x)) ? '—' : x.toFixed(d)

export default function KappaHeader({ dyn, mem, hold }: { dyn: KappaDynamics; mem?: KappaMemory; hold?: HoldingState | null }) {
  const row: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'nowrap',
    fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t3)',
    padding: '5px 10px', borderBottom: '0.5px solid var(--b1)',
    letterSpacing: '.02em', userSelect: 'none', whiteSpace: 'nowrap', overflow: 'hidden',
  }
  const sep = <span style={{ opacity: 0.35 }}>·</span>
  const cell = (label: string, val: string) => (
    <span><span style={{ opacity: 0.6 }}>{label}</span> {val}</span>
  )

  // The memory segment. Rendered whenever the worker has reported κ-state, even
  // before the first turn's dynamics exist. The "prov" pill is the honest badge:
  // κ is accumulating and its contraction rate is computed, but it ranks nothing
  // until the seam clears — amber for provisional, green once it goes live.
  // The holding segment. Two cells: T (held tension, input-gated) and L (the
  // holding loss). L colours amber only while the valve reports 'strained' —
  // otherwise it stays as muted as the rest of the row. The tooltip carries
  // the valve's constants so the numbers are auditable in place.
  const holdSeg = hold ? (
    <>
      {sep}
      <span title={`superposition holding — ρ ${hold.rho} (half-life ${hold.halfLifeTurns.toFixed(1)} turns)`
        + ` · status ${hold.status}`
        + (hold.rhoCalibrated !== null ? ` · ρ* from this session ${hold.rhoCalibrated.toFixed(4)}` : ' · ρ* not yet estimable')
        + ` · L < e−1 by construction — docs/SUPERPOSITION_HOLDING.md`}>
        <span style={{ opacity: 0.6 }}>T</span> {f(hold.tension, 2)}
        {' '}<span style={{ opacity: 0.35 }}>·</span>{' '}
        <span style={{ opacity: 0.6 }}>L</span>{' '}
        <span style={hold.status === 'strained' ? { color: '#D9A441' } : undefined}>{f(hold.loss)}</span>
      </span>
    </>
  ) : null

  const memSeg = mem ? (() => {
    const live = mem.ranks
    const pill: CSSProperties = {
      fontSize: 9, letterSpacing: '.04em', textTransform: 'uppercase',
      padding: '1px 5px', borderRadius: 3,
      color: live ? 'var(--good, #4ADE80)' : '#D9A441',
      border: `0.5px solid ${live ? 'var(--good, #4ADE80)' : '#D9A441'}`,
      opacity: 0.85,
    }
    return (
      <>
        {sep}
        <span style={pill} title={mem.note}>{live ? 'live' : 'prov'}</span>
        {cell('r', f(mem.r_estimate))}
        {cell('mem', String(mem.trace_count))}
      </>
    )
  })() : null

  if (!dyn) {
    return (
      <div style={row} title="coherence dynamics — appears once Elle has answered">
        <span style={{ opacity: 0.6 }}>κ dynamics</span>
        <span style={{ opacity: 0.45 }}>— awaiting first turn</span>
        {holdSeg}
        {memSeg}
      </div>
    )
  }

  return (
    <div style={row}
      title={`coherence dynamics over the model output (dt = 1 turn, step ${dyn.step_index})`
        + (dyn.input_perturbation != null ? ` · input shift ${f(dyn.input_perturbation)}` : '')}>
      {cell('κ', f(dyn.kappa))}
      {sep}{cell('v', f(dyn.velocity))}
      {sep}{cell('a', f(dyn.acceleration))}
      {sep}{cell('j', f(dyn.jerk))}
      {sep}{cell('∫', f(dyn.reserve, 2))}
      {holdSeg}
      {memSeg}
    </div>
  )
}
