// ============================================================
// THE MILLENNIUM FALCON — the workbench face of elle-worker's src/falcon.ts.
//
// Point it at a direction — a market, a problem, a domain, an idea. The
// worker fires 16 axes across three tiers and returns the full interference
// pattern in one call (no SSE on this door yet — the axis grid below fills
// in an honest crawl while the request is in flight, then snaps to the real
// result the instant it lands; it never claims done before the response does).
//
//   Tier 1 — Material Ground     (axes 1-6,  parallel)
//   Tier 2 — Observer Reading    (axes 7-15, parallel, reads Tier 1)
//   Tier 3 — Validation          (adversarial check on 1-15, fires first)
//          — The Rupture (16)    (the earned collapse, fires last)
//
// Every run is stored (falcon_analyses / falcon_ruptures / falcon_reasoning_log
// in elle-worker); the Archive tab below reads past runs back, and the outcome
// form under a completed Rupture is the training signal the spec calls the
// most valuable data — what actually got built, against what the engine named.
// ============================================================
import { useCallback, useRef, useState } from 'react'
import { WORKER, getToken } from '../lib/elle'

type AxisResult = { n: number; id: string; label: string; data: Record<string, any>; model?: string; provider?: string }
type Validation = Record<string, any>
type Rupture = Record<string, any>
type ArchiveRow = { id: string; direction: string; created_at: string; discomfort_index: number | null; first_thing_to_build: string | null }

type RunResult = {
  analysis_id: string
  rupture_id?: string
  direction: string
  tier1: AxisResult[]
  tier2: AxisResult[]
  validation: Validation
  rupture: Rupture
  created_at?: string
  outcome?: { what_was_built?: string; comparison_to_rupture?: string; founder_notes?: string } | null
}

const TIER1_LABELS = ['MARKET REALITY', 'FINANCIAL ARCHITECTURE', 'NETWORK MAP', 'PRIOR CHAIN', 'SCALAR STRUCTURE', 'DOCUMENTED IMPACT']
const TIER2_LABELS = ['DOMINANT SUPPRESSION', 'RESISTANCE ROMANCE', 'BILATERAL SUPPRESSION', 'TEMPORAL COMPRESSION', 'REFLEXIVE', 'EMERGENCE SIGNAL', 'PRODUCT FORM', 'UX PRINCIPLE', 'TRANSMISSION VECTOR']
const TIER1_COLOR = '#C9A84C'   // gold — Material Ground
const TIER2_COLOR = '#7FA8D8'   // blue — Observer Reading
const VALIDATION_COLOR = '#D4795A' // amber-red — the adversarial check
const RUPTURE_COLOR = '#E8C878' // bright gold — the earned collapse

const api = async (body: Record<string, unknown>) => {
  const r = await fetch(WORKER + '/api/falcon', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
  })
  const d = await r.json().catch(() => ({} as Record<string, unknown>))
  if (!r.ok) throw new Error(String((d as { error?: string }).error || `HTTP ${r.status}`))
  return d as Record<string, unknown>
}

// A slot is either a real axis (1-15), the validation check ('V'), or the
// Rupture (16) — one shape for the grid, the nav, and the detail viewer.
type Slot = { key: string; n: string; label: string; color: string; kind: 'axis' | 'validation' | 'rupture' }

function slotsFor(tier1: AxisResult[], tier2: AxisResult[]): Slot[] {
  const axisSlots: Slot[] = [...tier1, ...tier2].map(a => ({
    key: a.id, n: String(a.n), label: a.label, color: a.n <= 6 ? TIER1_COLOR : TIER2_COLOR, kind: 'axis',
  }))
  return [
    ...axisSlots,
    { key: 'validation', n: 'V', label: 'VALIDATION TIER', color: VALIDATION_COLOR, kind: 'validation' },
    { key: 'rupture', n: '16', label: 'THE RUPTURE', color: RUPTURE_COLOR, kind: 'rupture' },
  ]
}

// While the (single, non-streaming) run request is in flight, crawl the pip
// grid so the field reads as firing rather than frozen — capped one short of
// full so it can never claim completion the response hasn't confirmed yet.
function useCrawl(total: number) {
  const [n, setN] = useState(0)
  const timer = useRef<number | null>(null)
  const start = useCallback(() => {
    setN(0)
    let i = 0
    timer.current = window.setInterval(() => {
      i = Math.min(i + 1, total - 1)
      setN(i)
    }, 750)
  }, [total])
  const stop = useCallback((final: number) => {
    if (timer.current) { window.clearInterval(timer.current); timer.current = null }
    setN(final)
  }, [])
  return { n, start, stop }
}

function fieldRow(k: string, v: unknown, color: string) {
  if (v == null || v === '') return null
  return (
    <div key={k} style={{ marginTop: 10 }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
        {k.replace(/_/g, ' ')}
      </span>
      {Array.isArray(v) ? (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {v.map((item, i) => (
            <li key={i} style={{ display: 'flex', gap: 7, fontSize: 11.5, color: 'var(--t2)', lineHeight: 1.65, padding: '2px 0' }}>
              <span style={{ color, flexShrink: 0 }}>—</span>
              <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
            </li>
          ))}
        </ul>
      ) : typeof v === 'object' ? (
        <pre style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', whiteSpace: 'pre-wrap' }}>{JSON.stringify(v, null, 1)}</pre>
      ) : (
        <p style={{ fontSize: 11.5, color: 'var(--t2)', lineHeight: 1.7, margin: 0 }}>{String(v)}</p>
      )}
    </div>
  )
}

export default function FalconPanel({ accent }: { accent: string }) {
  const [direction, setDirection] = useState('')
  const [phase, setPhase] = useState<'idle' | 'running' | 'complete'>('idle')
  const [result, setResult] = useState<RunResult | null>(null)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [view, setView] = useState<'ship' | 'archive'>('ship')
  const [archive, setArchive] = useState<ArchiveRow[]>([])
  const [archiveBusy, setArchiveBusy] = useState(false)
  const [outcome, setOutcome] = useState({ what_was_built: '', comparison_to_rupture: '', founder_notes: '' })
  const [outcomeSaved, setOutcomeSaved] = useState(false)

  const slots = result ? slotsFor(result.tier1, result.tier2) : []
  const crawl = useCrawl(17)

  const engage = useCallback(async () => {
    const dir = direction.trim()
    if (!dir || phase === 'running') return
    setPhase('running'); setResult(null); setActiveKey(null); setNote(''); setOutcomeSaved(false)
    setOutcome({ what_was_built: '', comparison_to_rupture: '', founder_notes: '' })
    crawl.start()
    try {
      const d = await api({ action: 'run', direction: dir })
      crawl.stop(17)
      setResult(d as unknown as RunResult)
      setPhase('complete')
    } catch (e: any) {
      crawl.stop(0)
      setNote(String(e.message || e))
      setPhase('idle')
    }
  }, [direction, phase, crawl])

  const reset = () => {
    setPhase('idle'); setResult(null); setActiveKey(null); setNote(''); setDirection('')
  }

  const loadArchive = useCallback(async () => {
    setArchiveBusy(true)
    try {
      const d = await api({ action: 'list', limit: 40 })
      setArchive((d.analyses as ArchiveRow[]) || [])
    } catch (e: any) { setNote(String(e.message || e)) } finally { setArchiveBusy(false) }
  }, [])

  const openArchived = useCallback(async (id: string) => {
    setArchiveBusy(true); setNote('')
    try {
      const d = await api({ action: 'get', analysis_id: id })
      setResult(d as unknown as RunResult)
      setOutcome({
        what_was_built: d.outcome ? String((d.outcome as any).what_was_built || '') : '',
        comparison_to_rupture: d.outcome ? String((d.outcome as any).comparison_to_rupture || '') : '',
        founder_notes: d.outcome ? String((d.outcome as any).founder_notes || '') : '',
      })
      setOutcomeSaved(!!d.outcome)
      setPhase('complete')
      setActiveKey('rupture')
      setView('ship')
    } catch (e: any) { setNote(String(e.message || e)) } finally { setArchiveBusy(false) }
  }, [])

  const saveOutcome = useCallback(async () => {
    if (!result?.analysis_id) return
    try {
      await api({ action: 'outcome', analysis_id: result.analysis_id, ...outcome })
      setOutcomeSaved(true)
    } catch (e: any) { setNote(String(e.message || e)) }
  }, [result, outcome])

  const active = slots.find(s => s.key === activeKey) || null
  const activeAxis = active?.kind === 'axis' ? [...(result?.tier1 || []), ...(result?.tier2 || [])].find(a => a.id === active.key) : null

  const CSS = `
@keyframes falcon-breathe{0%,100%{opacity:.35}50%{opacity:1}}
@keyframes falcon-scan{0%{left:-40%}100%{left:100%}}
.falcon-pip-dot{width:6px;height:6px;border-radius:50%;background:var(--b1);transition:all .25s}
.falcon-pip-dot.loading{animation:falcon-breathe .8s ease-in-out infinite}
.falcon-loadbar{position:relative;height:1px;background:var(--b1);overflow:hidden}
.falcon-loadbar::after{content:'';position:absolute;height:100%;width:40%;background:${accent};animation:falcon-scan 1.1s ease-in-out infinite}
.falcon-rise{animation:falcon-rise .5s ease both}
@keyframes falcon-rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  `

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
      <style>{CSS}</style>

      {/* header */}
      <div style={{ padding: '12px 18px 8px', display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.3em', color: accent, textTransform: 'uppercase' }}>
          The Millennium Falcon
        </span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', letterSpacing: '.08em' }}>
          16-axis product intelligence · 3 tiers · NECAI-F v2
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <button onClick={() => { setView('ship') }} disabled={view === 'ship'}
            style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: view === 'ship' ? accent : 'var(--t4)', background: 'transparent', border: 'none', cursor: view === 'ship' ? 'default' : 'pointer', letterSpacing: '.1em' }}>
            SHIP
          </button>
          <button onClick={() => { setView('archive'); loadArchive() }} disabled={view === 'archive'}
            style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: view === 'archive' ? accent : 'var(--t4)', background: 'transparent', border: 'none', cursor: view === 'archive' ? 'default' : 'pointer', letterSpacing: '.1em' }}>
            ARCHIVE
          </button>
        </span>
      </div>

      {note && <div style={{ padding: '0 18px 6px', fontFamily: 'var(--mono)', fontSize: 10, color: '#D06565' }}>{note}</div>}

      <div style={{ flex: 1, overflowY: 'auto', padding: '2px 18px 20px' }}>

        {view === 'archive' ? (
          <div style={{ maxWidth: 860 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t3)', letterSpacing: '.08em', marginBottom: 10 }}>
              past runs — every Rupture named, waiting on what actually got built
            </div>
            {archiveBusy && <div className="falcon-loadbar" style={{ marginBottom: 10 }} />}
            {!archiveBusy && archive.length === 0 && (
              <div style={{ padding: 16, fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t4)' }}>
                no runs yet — point the ship at a direction on the SHIP tab
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {archive.map(row => (
                <button key={row.id} onClick={() => openArchived(row.id)}
                  style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '0.5px solid var(--b1)', borderRadius: 8, background: 'var(--raised)', cursor: 'pointer' }}>
                  <span style={{ fontSize: 12, color: 'var(--t1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.direction}</span>
                  {row.discomfort_index != null && (
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: RUPTURE_COLOR, border: `0.5px solid ${RUPTURE_COLOR}55`, borderRadius: 4, padding: '2px 7px' }}>DI {row.discomfort_index}/10</span>
                  )}
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)' }}>{new Date(row.created_at).toLocaleDateString()}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* axis grid */}
            {(phase !== 'idle') && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(17,1fr)', gap: 3, marginBottom: 10, maxWidth: 900 }}>
                {(phase === 'complete' ? slots : Array.from({ length: 17 }, (_, i) => ({
                  key: String(i), n: i < 6 ? String(i + 1) : i < 15 ? String(i + 1) : i === 15 ? 'V' : '16',
                  label: '', color: i < 6 ? TIER1_COLOR : i < 15 ? TIER2_COLOR : i === 15 ? VALIDATION_COLOR : RUPTURE_COLOR, kind: 'axis' as const,
                }))).map((s, i) => {
                  const done = phase === 'complete' || i <= crawl.n - 1
                  const isLoading = phase === 'running' && i === crawl.n
                  return (
                    <div key={s.key} title={s.label || `axis ${s.n}`}
                      onClick={() => phase === 'complete' && setActiveKey(s.key)}
                      style={{
                        height: 26, border: `1px solid ${activeKey === s.key ? accent : 'var(--b1)'}`, borderRadius: 3,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                        cursor: phase === 'complete' ? 'pointer' : 'default',
                      }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t4)' }}>{s.n}</span>
                      <span className={`falcon-pip-dot ${isLoading ? 'loading' : ''}`} style={{ background: done ? s.color : 'var(--b1)', boxShadow: done && s.kind === 'rupture' ? `0 0 6px ${s.color}` : 'none' }} />
                    </div>
                  )
                })}
              </div>
            )}

            {phase === 'running' && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t3)', marginBottom: 14, letterSpacing: '.06em' }}>
                {crawl.n < 6 ? 'TIER 1 — MATERIAL GROUND FIRING' : crawl.n < 15 ? 'TIER 2 — OBSERVER READING FIRING' : crawl.n === 15 ? 'VALIDATION TIER — ADVERSARIAL CHECK' : 'HOLDING THE FIELD — THE RUPTURE'}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: phase === 'complete' ? '1fr 1fr' : '1fr', gap: 14, alignItems: 'start', maxWidth: 1100 }}>
              {/* left — input */}
              <div>
                <div style={{ border: '0.5px solid var(--b1)', borderRadius: 8, background: 'var(--raised)' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.15em', color: 'var(--t4)', padding: '10px 12px 4px', display: 'block', textTransform: 'uppercase' }}>
                    Point the ship
                  </span>
                  <textarea
                    value={direction}
                    onChange={e => setDirection(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); engage() } }}
                    disabled={phase === 'running'}
                    placeholder="Describe the product direction, market, or problem — e.g. 'recovery support for people who don't trust institutions'"
                    rows={4}
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: '6px 12px 10px', fontFamily: 'var(--ui)', fontSize: 13, color: 'var(--t1)', resize: 'vertical' }}
                  />
                  {phase !== 'running' ? (
                    <button onClick={engage} disabled={!direction.trim()}
                      style={{ width: '100%', background: 'transparent', border: 'none', borderTop: '0.5px solid var(--b1)', padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '.2em', textTransform: 'uppercase', cursor: direction.trim() ? 'pointer' : 'not-allowed', color: direction.trim() ? accent : 'var(--t4)' }}>
                      {phase === 'complete' ? 'Engage — new run ▸' : 'Engage all axes ▸'}
                    </button>
                  ) : (
                    <div style={{ padding: '10px 12px', borderTop: '0.5px solid var(--b1)' }}>
                      <div className="falcon-loadbar" />
                    </div>
                  )}
                  {phase === 'complete' && (
                    <button onClick={reset}
                      style={{ width: '100%', background: 'transparent', border: 'none', borderTop: '0.5px solid var(--b1)', padding: '7px 12px', fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '.15em', color: 'var(--t4)', cursor: 'pointer' }}>
                      reset ship
                    </button>
                  )}
                </div>

                {/* axis nav */}
                {phase === 'complete' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, marginTop: 10 }}>
                    {slots.map(s => (
                      <button key={s.key} onClick={() => setActiveKey(s.key)}
                        style={{
                          padding: '5px 4px', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.04em',
                          background: 'transparent', border: `0.5px solid ${activeKey === s.key ? s.color : 'var(--b1)'}`,
                          color: activeKey === s.key ? s.color : 'var(--t3)', cursor: 'pointer', borderRadius: 5, textAlign: 'center',
                        }}>
                        {s.n}. {s.label.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                )}

                {/* architecture note */}
                <div style={{ marginTop: 14, padding: '10px 12px', border: '0.5px solid var(--b2)', borderRadius: 8 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>Engine architecture</div>
                  {[
                    ['Tier 1 — Material Ground', 'Axes 1-6, simultaneous. Who controls what, what flows where, the economics of independence.'],
                    ['Tier 2 — Observer Reading', 'Axes 7-15, simultaneous, reads Tier 1. The load-bearing field — axis 9 — is what both the dominant and resistance narratives suppress at once.'],
                    ['Tier 3 — Validation + Rupture', 'The adversarial check fires first; axis 16 — the earned collapse — fires only once the field has held.'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ marginBottom: 6 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)' }}>{k} — </span>
                      <span style={{ fontSize: 10.5, color: 'var(--t4)', fontStyle: 'italic' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* right — detail viewer */}
              {phase === 'complete' && (
                <div className="falcon-rise" style={{ border: '0.5px solid var(--b1)', borderRadius: 8, minHeight: 220 }}>
                  <div style={{ borderBottom: '0.5px solid var(--b1)', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {active ? (
                      <>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: active.color }}>{active.n}</span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '.1em', color: 'var(--t3)' }}>{active.label}</span>
                      </>
                    ) : (
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t4)' }}>select an axis to inspect</span>
                    )}
                  </div>
                  <div style={{ padding: '12px 14px', maxHeight: 480, overflowY: 'auto' }}>
                    {!active && (
                      <div style={{ color: 'var(--t4)', fontSize: 11, fontStyle: 'italic', padding: 8 }}>
                        Click any pip in the grid, or a button below the ship, to inspect its interference pattern.
                      </div>
                    )}
                    {active?.kind === 'axis' && activeAxis && (
                      <>
                        {Object.entries(activeAxis.data).filter(([k]) => k !== 'signal_strength' && k !== 'error').map(([k, v]) => fieldRow(k, v, active.color))}
                        {typeof activeAxis.data.signal_strength === 'number' && (
                          <div style={{ marginTop: 12, fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)' }}>SIGNAL {Math.round(activeAxis.data.signal_strength * 100)}%</div>
                        )}
                      </>
                    )}
                    {active?.kind === 'validation' && result?.validation && (
                      <>
                        {result.validation.field_held === true && (
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: '#4ADE80', marginBottom: 8 }}>● FIELD HELD CLEAN</div>
                        )}
                        {Object.entries(result.validation).filter(([k]) => k !== 'field_held' && k !== 'error').map(([k, v]) => fieldRow(k, v, VALIDATION_COLOR))}
                      </>
                    )}
                    {active?.kind === 'rupture' && result?.rupture && (
                      <>
                        {result.rupture.rupture && <p style={{ fontSize: 13, color: RUPTURE_COLOR, lineHeight: 1.75, marginBottom: 10 }}>{result.rupture.rupture}</p>}
                        {Object.entries(result.rupture).filter(([k]) => !['rupture', 'discomfort_index', 'ux_rollout_sequence'].includes(k)).map(([k, v]) => fieldRow(k, v, RUPTURE_COLOR))}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* the Rupture panel */}
            {phase === 'complete' && result?.rupture && !result.rupture.error && (
              <div className="falcon-rise" style={{ border: `0.5px solid ${RUPTURE_COLOR}44`, borderRadius: 10, marginTop: 16, maxWidth: 1100 }}>
                <div style={{ borderBottom: '0.5px solid var(--b1)', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.2em', color: RUPTURE_COLOR, textTransform: 'uppercase' }}>Axis 16 — The Rupture</span>
                  {typeof result.rupture.discomfort_index === 'number' && (
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: RUPTURE_COLOR }}>DISCOMFORT {result.rupture.discomfort_index}/10</span>
                  )}
                </div>
                <div style={{ padding: '14px 16px' }}>
                  {result.rupture.rupture && <p style={{ fontSize: 14, lineHeight: 1.85, color: 'var(--t1)', marginBottom: 14 }}>{result.rupture.rupture}</p>}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
                    {result.rupture.surface_it_breaks_through && (
                      <div><span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', letterSpacing: '.1em', textTransform: 'uppercase' }}>Surface it breaks through</span>
                        <p style={{ fontSize: 11.5, color: 'var(--t2)', lineHeight: 1.7, marginTop: 4, fontStyle: 'italic' }}>{result.rupture.surface_it_breaks_through}</p></div>
                    )}
                    {result.rupture.what_exists_after && (
                      <div><span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', letterSpacing: '.1em', textTransform: 'uppercase' }}>What exists after</span>
                        <p style={{ fontSize: 11.5, color: 'var(--t2)', lineHeight: 1.7, marginTop: 4, fontStyle: 'italic' }}>{result.rupture.what_exists_after}</p></div>
                    )}
                  </div>
                  {result.rupture.first_thing_to_build && (
                    <div style={{ border: `0.5px solid ${RUPTURE_COLOR}33`, borderRadius: 8, padding: '10px 14px', marginTop: 6 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: RUPTURE_COLOR, letterSpacing: '.12em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>First thing to build</span>
                      <span style={{ fontSize: 12.5, color: 'var(--t1)' }}>{result.rupture.first_thing_to_build}</span>
                    </div>
                  )}
                  {Array.isArray(result.rupture.ux_rollout_sequence) && result.rupture.ux_rollout_sequence.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', letterSpacing: '.1em', textTransform: 'uppercase' }}>UX rollout sequence — allow the form to find itself</span>
                      <ol style={{ listStyle: 'none', padding: 0, marginTop: 6, counterReset: 'falcon-step' }}>
                        {result.rupture.ux_rollout_sequence.map((step: string, i: number) => (
                          <li key={i} style={{ display: 'flex', gap: 10, padding: '4px 0', fontSize: 11.5, color: 'var(--t2)', lineHeight: 1.6 }}>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: RUPTURE_COLOR, flexShrink: 0, width: 16 }}>{i + 1}</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* outcome tracking — the training signal */}
            {phase === 'complete' && result?.analysis_id && result?.rupture && !result.rupture.error && (
              <div style={{ border: '0.5px solid var(--b1)', borderRadius: 10, marginTop: 12, maxWidth: 1100, padding: '12px 14px' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t3)', letterSpacing: '.1em', marginBottom: 8, textTransform: 'uppercase' }}>
                  Outcome — what actually got built {outcomeSaved && <span style={{ color: '#4ADE80' }}>· saved</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <textarea value={outcome.what_was_built} onChange={e => setOutcome(o => ({ ...o, what_was_built: e.target.value }))}
                    placeholder="what was actually built" rows={2}
                    style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, color: 'var(--t1)', padding: '7px 10px', fontSize: 11.5, fontFamily: 'var(--ui)', outline: 'none', resize: 'vertical' }} />
                  <textarea value={outcome.comparison_to_rupture} onChange={e => setOutcome(o => ({ ...o, comparison_to_rupture: e.target.value }))}
                    placeholder="how it compares to the named Rupture — where it matched, where it diverged" rows={2}
                    style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, color: 'var(--t1)', padding: '7px 10px', fontSize: 11.5, fontFamily: 'var(--ui)', outline: 'none', resize: 'vertical' }} />
                  <textarea value={outcome.founder_notes} onChange={e => setOutcome(o => ({ ...o, founder_notes: e.target.value }))}
                    placeholder="founder notes" rows={2}
                    style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, color: 'var(--t1)', padding: '7px 10px', fontSize: 11.5, fontFamily: 'var(--ui)', outline: 'none', resize: 'vertical' }} />
                  <button onClick={saveOutcome} disabled={!outcome.what_was_built.trim()}
                    style={{ alignSelf: 'flex-start', padding: '6px 14px', borderRadius: 6, border: `0.5px solid ${accent}55`, background: accent + '22', color: accent, cursor: outcome.what_was_built.trim() ? 'pointer' : 'not-allowed', fontFamily: 'var(--mono)', fontSize: 10.5 }}>
                    log outcome ▸
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
