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
// ============================================================

import type { CSSProperties } from 'react'

export type KappaDynamics = {
  step_index: number
  kappa: number
  velocity: number | null
  acceleration: number | null
  jerk: number | null
  reserve: number
  input_perturbation: number | null
} | null

// "—" for null (insufficient data), otherwise the number to `d` decimals. A
// genuine 0 prints as "0.000", never "—".
const f = (x: number | null | undefined, d = 3): string =>
  (x === null || x === undefined || Number.isNaN(x)) ? '—' : x.toFixed(d)

export default function KappaHeader({ dyn }: { dyn: KappaDynamics }) {
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

  if (!dyn) {
    return (
      <div style={row} title="coherence dynamics — appears once Elle has answered">
        <span style={{ opacity: 0.6 }}>κ dynamics</span>
        <span style={{ opacity: 0.45 }}>— awaiting first turn</span>
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
    </div>
  )
}
