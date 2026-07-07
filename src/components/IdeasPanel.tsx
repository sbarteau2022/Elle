// ============================================================
// IDEAS — her to-explore cache and its build lane, as one column.
//
// The ideas stack vertically: each is a title bar that expands in place and
// contracts back to the title. The bar's color IS the stage — 'queued'
// (selected for the sandbox) deliberately reads apart from everything else;
// the color map comes from the worker (/api/elle-ideas op=column) so every
// surface paints the lane identically. Expanded, a card shows everything
// needed for reference: the mindmap (strategized build plan + improvements
// as short bullets), the cloned repo code surfaced to scope the build, the
// reference pointers, the spec's corpus id (ingested — embedded, queryable),
// the intent driving the build, the extend count against its cap of 2, the
// stage log, and the PFAR pressure-test fingerprint — the visual claims —
// once the test has run.
//
// The lane itself is enforced server-side (src/ideas.ts in elle-worker);
// this panel only ever asks for the legal next step, so the buttons a card
// shows are exactly the transitions its stage allows.
// ============================================================
import { useEffect, useState } from 'react'
import { WORKER, getToken } from '../lib/elle'

type Idea = {
  id: string; title: string; summary: string | null; details: string | null
  status: string
  plan: { plan?: string[]; improvements?: string[] } | null
  clones: Array<{ clone_key?: string; target?: string; title?: string; created_at?: number }>
  refs: Array<{ repo?: string; path?: string; note?: string }>
  spec_paper_id: string | null; intent_id: string | null
  extend_count: number; verdict: string | null
  pfar: Record<string, any> | null
  source: string; created_at: number; updated_at: number
}
type LogRow = { idea_id: string; stage: string; note: string; created_at: number }

const api = async (body: Record<string, unknown>) => {
  const r = await fetch(WORKER + '/api/elle-ideas', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
  })
  const d = await r.json().catch(() => ({} as Record<string, unknown>))
  if (!r.ok) throw new Error(String((d as { error?: string }).error || `HTTP ${r.status}`))
  return d as Record<string, unknown>
}

const ago = (t: number | null) => {
  if (!t) return '—'
  const m = Math.round((Date.now() - t) / 60000)
  return m < 1 ? 'now' : m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`
}

// Fallback only — the live map arrives with the column payload.
const FALLBACK_COLORS: Record<string, string> = {
  pondering: '#8B94A3', queued: '#C9A84C', scoping: '#7FB4D8', spec: '#B08FD8',
  building: '#5CC8C2', testing: '#E0A45C', held: '#4ADE80', killed: '#D06565',
}

const LANE = ['pondering', 'queued', 'scoping', 'spec', 'building', 'testing', 'held']

function Section({ label, children }: { label: string; children: any }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  )
}

function Bullets({ items, color }: { items: string[]; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {items.map((b, i) => (
        <div key={i} style={{ display: 'flex', gap: 7, fontSize: 11, color: 'var(--t2)', lineHeight: 1.5 }}>
          <span style={{ color, flexShrink: 0 }}>▪</span><span>{b}</span>
        </div>
      ))}
    </div>
  )
}

// The PFAR fingerprint, rendered as claims you can see instead of a JSON
// blob: rhetoric register/cadence/tactics from the pressure test, and the
// spectrum numbers when a series rode along.
function PfarClaims({ pfar, accent }: { pfar: Record<string, any>; accent: string }) {
  const rh = pfar.rhetoric?.rhetoric || pfar.rhetoric || null
  const sp = pfar.spectrum?.spectrum || pfar.spectrum || null
  const chip = (k: string, v: unknown) => (
    <span key={k} style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t2)', background: 'var(--float)', border: '0.5px solid var(--b2)', borderRadius: 5, padding: '3px 8px' }}>
      <span style={{ color: 'var(--t4)' }}>{k} </span>{String(v).slice(0, 60)}
    </span>
  )
  const rhetChips: Array<[string, unknown]> = rh && typeof rh === 'object'
    ? Object.entries(rh).filter(([, v]) => typeof v === 'string' || typeof v === 'number').slice(0, 6) as Array<[string, unknown]>
    : []
  const tactics: string[] = Array.isArray(rh?.tactics) ? rh.tactics.map(String) : []
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {rhetChips.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{rhetChips.map(([k, v]) => chip(k, v))}</div>}
      {tactics.length > 0 && <Bullets items={tactics.slice(0, 5)} color={accent} />}
      {sp && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {typeof sp.spectral_centroid === 'number' && chip('centroid', sp.spectral_centroid.toFixed(3))}
          {typeof sp.periodicity === 'number' && chip('periodicity', sp.periodicity.toFixed(3))}
          {Array.isArray(sp.peaks) && chip('peaks', sp.peaks.slice(0, 3).map((p: any) => p.freq?.toFixed?.(3)).join(', '))}
        </div>
      )}
      {!rhetChips.length && !tactics.length && !sp && (
        <pre style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t3)', whiteSpace: 'pre-wrap', maxHeight: 140, overflowY: 'auto' }}>{JSON.stringify(pfar, null, 1).slice(0, 1200)}</pre>
      )}
    </div>
  )
}

export default function IdeasPanel({ accent }: any) {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [logs, setLogs] = useState<LogRow[]>([])
  const [colors, setColors] = useState<Record<string, string>>(FALLBACK_COLORS)
  const [maxExtends, setMaxExtends] = useState(2)
  const [open, setOpen] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const d = await api({ op: 'column' })
      setIdeas((d.ideas as Idea[]) || [])
      setLogs((d.logs as LogRow[]) || [])
      if (d.colors) setColors(d.colors as Record<string, string>)
      if (d.max_extends) setMaxExtends(Number(d.max_extends))
      setNote('')
    } catch (e: any) { setNote(String(e.message || e)) }
  }
  useEffect(() => { load(); const iv = setInterval(load, 30000); return () => clearInterval(iv) }, [])

  const act = async (op: string, id: string, extra: Record<string, unknown> = {}) => {
    if (busy) return
    setBusy(true)
    try {
      const d = await api({ op, id, ...extra })
      const res = typeof d.result === 'string' ? d.result : ''
      if (/refused|not allowed|required/i.test(res)) setNote(res)
      await load()
    } catch (e: any) { setNote(String(e.message || e)) } finally { setBusy(false) }
  }

  const add = async () => {
    if (busy || !title.trim() || summary.trim().length < 12) return
    setBusy(true)
    try {
      const d = await api({ op: 'add', title: title.trim(), summary: summary.trim() })
      const res = typeof d.result === 'string' ? d.result : ''
      if (/refused/i.test(res)) { setNote(res); return }
      setTitle(''); setSummary(''); await load()
    } catch (e: any) { setNote(String(e.message || e)) } finally { setBusy(false) }
  }

  // The one legal next step per stage — mirrors the worker's lane exactly.
  const nextAction = (it: Idea): { op: string; label: string } | null => {
    switch (it.status) {
      case 'pondering': return { op: 'queue', label: 'queue for sandbox ▸' }
      case 'queued': return { op: 'select', label: 'select — surface the code ▸' }
      case 'scoping': return null   // spec is authored by her (or via the chat) — not a one-click
      case 'building': return null  // the conductor is on it
      case 'testing': return null   // verdict buttons render separately
      default: return null
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
      <div style={{ padding: '12px 18px 8px', display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t3)', letterSpacing: '.12em', textTransform: 'uppercase' }}>
          the idea queue — what she's pondering, and the lane to a build
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {LANE.map(s => (
            <span key={s} style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: colors[s] || 'var(--t4)' }}>● {s}</span>
          ))}
        </span>
      </div>

      {note && <div style={{ padding: '0 18px 6px', fontFamily: 'var(--mono)', fontSize: 10, color: '#D06565' }}>{note}</div>}

      {/* ── the column ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '2px 18px 14px', display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 860 }}>
        {ideas.length === 0 && (
          <div style={{ padding: 16, fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t4)' }}>
            the cache is empty — file the first thing worth pondering below, or ask her what she's been circling
          </div>
        )}
        {ideas.map(it => {
          const c = colors[it.status] || 'var(--t4)'
          const isOpen = open === it.id
          const ilog = logs.filter(l => l.idea_id === it.id)
          const next = nextAction(it)
          return (
            <div key={it.id} style={{ border: `0.5px solid ${isOpen ? c + '66' : 'var(--b1)'}`, borderRadius: 8, background: 'var(--raised)', overflow: 'hidden' }}>
              {/* the title bar — click expands / contracts */}
              <button onClick={() => setOpen(isOpen ? null : it.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0, boxShadow: it.status === 'queued' ? `0 0 8px ${c}` : 'none' }} />
                <span style={{ fontSize: 12.5, color: 'var(--t1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: c, border: `0.5px solid ${c}55`, borderRadius: 4, padding: '2px 7px', flexShrink: 0 }}>{it.status}</span>
                {it.extend_count > 0 && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', flexShrink: 0 }}>ext {it.extend_count}/{maxExtends}</span>}
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', flexShrink: 0 }}>
                  {it.source === 'elle' ? 'hers · ' : ''}{ago(it.updated_at)} · {isOpen ? '▾' : '▸'}
                </span>
              </button>

              {/* the expansion — every detail necessary for reference */}
              {isOpen && (
                <div className="rise" style={{ padding: '2px 14px 12px', borderTop: '0.5px solid var(--b2)' }}>
                  {it.summary && <div style={{ fontSize: 11.5, color: 'var(--t2)', lineHeight: 1.6, marginTop: 8 }}>{it.summary}</div>}

                  {it.plan?.plan && it.plan.plan.length > 0 && (
                    <Section label="build plan — the mindmap">
                      <Bullets items={it.plan.plan} color={c} />
                    </Section>
                  )}
                  {it.plan?.improvements && it.plan.improvements.length > 0 && (
                    <Section label="what improves">
                      <Bullets items={it.plan.improvements} color="#4ADE80" />
                    </Section>
                  )}

                  {it.clones.length > 0 && (
                    <Section label="cloned code scoping the build">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {it.clones.map((cl, i) => (
                          <div key={i} style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t3)' }}>
                            <span style={{ color: 'var(--t2)' }}>{cl.title || cl.target}</span>
                            {cl.clone_key && <span style={{ color: 'var(--t4)' }}> · kv {cl.clone_key}</span>}
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}
                  {it.refs.length > 0 && (
                    <Section label="reference code">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {it.refs.map((r, i) => (
                          <div key={i} style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t3)' }}>
                            {r.repo}{r.path ? `/${r.path}` : ''}{r.note ? ` — ${r.note}` : ''}
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {(it.spec_paper_id || it.intent_id) && (
                    <div style={{ display: 'flex', gap: 14, marginTop: 10, fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t4)' }}>
                      {it.spec_paper_id && <span>spec ingested · paper {it.spec_paper_id}</span>}
                      {it.intent_id && <span>intent {it.intent_id}</span>}
                    </div>
                  )}

                  {it.pfar && (
                    <Section label="pressure test — the pfar claims">
                      <PfarClaims pfar={it.pfar} accent={accent} />
                    </Section>
                  )}
                  {it.verdict && (
                    <div style={{ marginTop: 10, fontFamily: 'var(--mono)', fontSize: 10.5, color: c, borderLeft: `2px solid ${c}`, paddingLeft: 9 }}>{it.verdict}</div>
                  )}

                  {ilog.length > 0 && (
                    <Section label="the walk">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {ilog.map((l, i) => (
                          <div key={i} style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', lineHeight: 1.6 }}>
                            <span style={{ color: colors[l.stage] || 'var(--t3)' }}>{l.stage}</span> · {l.note.slice(0, 140)} · {ago(l.created_at)}
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* the legal next steps only */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                    {next && (
                      <button onClick={() => act(next.op, it.id)} disabled={busy}
                        style={{ padding: '4px 12px', borderRadius: 6, border: `0.5px solid ${c}55`, background: c + '22', color: c, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10 }}>
                        {next.label}
                      </button>
                    )}
                    {it.status === 'scoping' && (
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t4)', alignSelf: 'center' }}>
                        the spec is hers to cut — ask her to `idea op=spec` with the plan bullets
                      </span>
                    )}
                    {it.status === 'spec' && (
                      <button onClick={() => act('build', it.id)} disabled={busy}
                        style={{ padding: '4px 12px', borderRadius: 6, border: `0.5px solid ${c}55`, background: c + '22', color: c, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10 }}>
                        build — hand it to the conductor ▸
                      </button>
                    )}
                    {it.status === 'testing' && (
                      <>
                        <button onClick={() => act('verdict', it.id, { outcome: 'held' })} disabled={busy}
                          style={{ padding: '4px 12px', borderRadius: 6, border: '0.5px solid #4ADE8055', background: '#4ADE8022', color: '#4ADE80', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10 }}>
                          it holds — write it
                        </button>
                        <button onClick={() => act('verdict', it.id, { outcome: 'killed' })} disabled={busy}
                          style={{ padding: '4px 12px', borderRadius: 6, border: '0.5px solid #D0656555', background: '#D0656522', color: '#D06565', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10 }}>
                          it broke — kill it
                        </button>
                      </>
                    )}
                    {it.status !== 'killed' && it.status !== 'held' && it.status !== 'testing' && (
                      <button onClick={() => act('kill', it.id)} disabled={busy}
                        style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: 6, border: '0.5px solid var(--b1)', background: 'transparent', color: 'var(--t4)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 9.5 }}>
                        kill
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* file a new idea */}
      <div style={{ padding: 12, borderTop: '0.5px solid var(--b1)', display: 'flex', gap: 8, maxWidth: 860 }}>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="idea title"
          style={{ width: 220, background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, color: 'var(--t1)', padding: '7px 10px', fontSize: 11.5, fontFamily: 'var(--mono)', outline: 'none' }} />
        <input value={summary} onChange={e => setSummary(e.target.value)} placeholder="one sentence — what it is and why it's neat"
          style={{ flex: 1, background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, color: 'var(--t1)', padding: '7px 10px', fontSize: 11.5, fontFamily: 'var(--ui)', outline: 'none' }} />
        <button onClick={add} disabled={busy || !title.trim() || summary.trim().length < 12}
          style={{ padding: '5px 14px', borderRadius: 6, border: `0.5px solid ${accent}55`, background: accent + '22', color: accent,
            cursor: (busy || !title.trim() || summary.trim().length < 12) ? 'not-allowed' : 'pointer',
            opacity: (!title.trim() || summary.trim().length < 12) ? 0.5 : 1, fontFamily: 'var(--mono)', fontSize: 10.5 }}>
          {busy ? '…' : 'file idea ▸'}
        </button>
      </div>
    </div>
  )
}
