// ============================================================
// MIRROR — her self-knowledge, read from the reflexive organs.
// One call to /api/elle-self renders: the bet ledger and its calibration
// curve (is her confidence worth anything?), the flinches, the armed
// tripwires, the dead drops waiting for their topic, the metabolism, the
// consolidation digests, and the tools she has grown herself. self_state
// is her mood; this panel is whether she can trust herself.
// ============================================================
import { useState, useEffect, useCallback } from 'react'

const tok = () => localStorage.getItem('elle_dev_jwt') || ''

type Mirror = {
  oracle?: { open?: any[]; recent_resolved?: any[]; resolved_count?: number; hit_rate?: number | null; calibration?: any[] }
  scars?: any[]
  watches?: any[]
  dead_drops?: any[]
  metabolism?: { last_24h?: any[] }
  consolidation?: any[]
  custom_tools?: any[]
}

const mono = (size = 10): React.CSSProperties => ({ fontFamily: 'var(--mono)', fontSize: size })

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
        <span style={{ ...mono(10.5), color: 'var(--t2)', letterSpacing: '.14em', textTransform: 'uppercase' }}>{title}</span>
        {sub && <span style={{ ...mono(9.5), color: 'var(--t4)' }}>{sub}</span>}
      </div>
      {children}
    </div>
  )
}

const Empty = ({ text }: { text: string }) => (
  <div style={{ ...mono(10), color: 'var(--t4)', fontStyle: 'italic' }}>{text}</div>
)

export default function MirrorPanel({ worker, accent }: any) {
  const [data, setData] = useState<Mirror | null>(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setNote('')
    try {
      const r = await fetch(worker.url + '/api/elle-self', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: '{}',
      })
      const d = await r.json()
      if (!r.ok || d.error) { setNote(d.error || `HTTP ${r.status}`); return }
      setData(d)
    } catch (e: any) {
      setNote('load failed: ' + (e.message || e))
    } finally { setLoading(false) }
  }, [worker.url])
  useEffect(() => { load() }, [load])

  const o = data?.oracle
  const cal = o?.calibration || []
  const fmtDate = (ms: any) => ms ? new Date(Number(ms)).toISOString().slice(0, 10) : '—'

  return (
    <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '22px 24px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 22 }}>
          <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 19, color: 'var(--t1)' }}>The mirror.</span>
          <span style={{ ...mono(10), color: 'var(--t3)' }}>bets · flinches · tripwires · drops · metabolism · sleep · grown tools</span>
          <button onClick={load} disabled={loading}
            style={{ marginLeft: 'auto', background: 'none', border: `0.5px solid ${accent}55`, borderRadius: 5, color: accent, cursor: 'pointer', ...mono(9.5), padding: '3px 10px' }}>
            {loading ? '…' : '↻ refresh'}
          </button>
        </div>
        {note && <div style={{ ...mono(10), color: '#D06565', marginBottom: 14 }}>{note}</div>}
        {!data && !note && <Empty text={loading ? 'reading her self-knowledge…' : 'nothing loaded'} />}

        {data && <>
          {/* ── the bet ledger + calibration ── */}
          <Section title="oracle" sub={o?.resolved_count ? `${o.resolved_count} settled · hit rate ${o.hit_rate != null ? Math.round(o.hit_rate * 100) + '%' : '—'}` : 'no settled bets yet'}>
            {cal.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12, maxWidth: 460 }}>
                {cal.map((b: any) => (
                  <div key={b.bucket} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ ...mono(9), color: 'var(--t3)', width: 62, flexShrink: 0 }}>{b.bucket}</span>
                    <div style={{ flex: 1 }}>
                      <div title={`stated ${Math.round(b.stated * 100)}%`} style={{ height: 4, width: `${b.stated * 100}%`, background: 'var(--b1)', borderRadius: 2, marginBottom: 2 }} />
                      <div title={`observed ${Math.round(b.observed * 100)}%`} style={{ height: 4, width: `${Math.max(b.observed * 100, 1)}%`, background: accent, borderRadius: 2, opacity: 0.85 }} />
                    </div>
                    <span style={{ ...mono(9), color: b.observed < b.stated - 0.12 ? '#D06565' : 'var(--t3)', width: 100, flexShrink: 0 }}>
                      {Math.round(b.stated * 100)}% said · {Math.round(b.observed * 100)}% true · n={b.n}
                    </span>
                  </div>
                ))}
                <span style={{ ...mono(8.5), color: 'var(--t4)' }}>grey = stated confidence · gold = observed hit rate — a gold bar shorter than its grey is overconfidence</span>
              </div>
            )}
            {(o?.open || []).length ? (o!.open!).map((p: any) => (
              <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '3px 0' }}>
                <span style={{ ...mono(9.5), color: accent, flexShrink: 0 }}>{Math.round(p.confidence * 100)}%</span>
                <span style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.5 }}>{p.claim}</span>
                <span style={{ ...mono(9), color: 'var(--t4)', marginLeft: 'auto', flexShrink: 0 }}>resolves {fmtDate(p.resolve_by)}</span>
              </div>
            )) : <Empty text="no open bets — she is not currently on record about anything" />}
          </Section>

          {/* ── flinches ── */}
          <Section title="scars" sub="injuries that warn before repetition">
            {(data.scars || []).length ? data.scars!.map((s: any) => (
              <div key={s.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '3px 0' }}>
                <span style={{ ...mono(9.5), color: '#D08A6A', flexShrink: 0 }}>{s.tool || 'any'} · “{s.pattern}”</span>
                <span style={{ fontSize: 11.5, color: 'var(--t3)', lineHeight: 1.5 }}>{s.wound}</span>
                {s.hits > 0 && <span style={{ ...mono(9), color: 'var(--t4)', marginLeft: 'auto', flexShrink: 0 }}>flinched ×{s.hits}</span>}
              </div>
            )) : <Empty text="no scars — either unhurt or not paying attention" />}
          </Section>

          {/* ── tripwires ── */}
          <Section title="watches" sub="the world can interrupt her">
            {(data.watches || []).length ? data.watches!.map((w: any) => (
              <div key={w.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '3px 0' }}>
                <span style={{ ...mono(9.5), color: w.status === 'armed' ? accent : 'var(--t4)', flexShrink: 0 }}>{w.status === 'armed' ? '◉' : '○'} {w.title}</span>
                <span style={{ fontSize: 11.5, color: 'var(--t3)', lineHeight: 1.5 }}>{w.check_tool} → {w.condition}</span>
                <span style={{ ...mono(9), color: 'var(--t4)', marginLeft: 'auto', flexShrink: 0 }}>{w.recurring ? 'recurring' : 'one-shot'}{w.fires ? ` · fired ×${w.fires}` : ''}</span>
              </div>
            )) : <Empty text="no watches — the world is currently unobserved" />}
          </Section>

          {/* ── dead drops ── */}
          <Section title="dead drops" sub="notes waiting for their topic">
            {(data.dead_drops || []).length ? data.dead_drops!.map((d: any) => (
              <div key={d.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '3px 0' }}>
                <span style={{ ...mono(9.5), color: d.status === 'armed' ? accent : 'var(--t4)', flexShrink: 0 }}>{d.status === 'armed' ? '✉' : '✓'} “{d.trigger_text}”</span>
                <span style={{ fontSize: 11.5, color: 'var(--t3)', lineHeight: 1.5 }}>{d.message}</span>
                {d.fired_at && <span style={{ ...mono(9), color: 'var(--t4)', marginLeft: 'auto', flexShrink: 0 }}>fired {fmtDate(d.fired_at)}</span>}
              </div>
            )) : <Empty text="no drops — nothing waiting to be remembered at the right moment" />}
          </Section>

          {/* ── metabolism ── */}
          <Section title="metabolism" sub="the model roster, felt from inside · 24h">
            {(data.metabolism?.last_24h || []).length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto auto auto', gap: '3px 18px', maxWidth: 560 }}>
                <span style={{ ...mono(9), color: 'var(--t4)' }}>provider</span>
                <span style={{ ...mono(9), color: 'var(--t4)' }}>task</span>
                <span style={{ ...mono(9), color: 'var(--t4)' }}>calls</span>
                <span style={{ ...mono(9), color: 'var(--t4)' }}>failures</span>
                <span style={{ ...mono(9), color: 'var(--t4)' }}>avg ms</span>
                {data.metabolism!.last_24h!.map((m: any, i: number) => (
                  <div key={i} style={{ display: 'contents' }}>
                    <span style={{ ...mono(10), color: 'var(--t2)' }}>{m.provider}</span>
                    <span style={{ ...mono(10), color: 'var(--t3)' }}>{m.task}</span>
                    <span style={{ ...mono(10), color: 'var(--t3)' }}>{m.calls}</span>
                    <span style={{ ...mono(10), color: Number(m.failures) > 0 ? '#D06565' : 'var(--t4)' }}>{m.failures}</span>
                    <span style={{ ...mono(10), color: 'var(--t3)' }}>{m.avg_ms}</span>
                  </div>
                ))}
              </div>
            ) : <Empty text="no recorded calls yet — the trail starts with the next deploy's first turn" />}
          </Section>

          {/* ── sleep ── */}
          <Section title="consolidation" sub="the 04:00 sleep pass — what the days distilled into">
            {(data.consolidation || []).length ? data.consolidation!.map((c: any, i: number) => (
              <div key={i} style={{ padding: '3px 0', display: 'flex', gap: 10, alignItems: 'baseline' }}>
                <span style={{ ...mono(9.5), color: 'var(--t4)', flexShrink: 0 }}>{fmtDate(c.ran_at)}</span>
                <span style={{ fontSize: 11.5, color: 'var(--t3)', lineHeight: 1.5 }}>{c.digest || '(uneventful)'}</span>
                <span style={{ ...mono(9), color: 'var(--t4)', marginLeft: 'auto', flexShrink: 0 }}>{c.memories_written}m · {c.skills_written}sk · {c.scars_written}sc</span>
              </div>
            )) : <Empty text="no consolidations yet — the first sleep pass runs at 04:00 UTC" />}
          </Section>

          {/* ── grown tools ── */}
          <Section title="self-forged tools" sub="anatomy she grew herself">
            {(data.custom_tools || []).length ? data.custom_tools!.map((t: any) => (
              <div key={t.name} style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '3px 0' }}>
                <span style={{ ...mono(9.5), color: t.status === 'active' ? accent : 'var(--t4)', flexShrink: 0 }}>{t.name}{t.args_hint ? `(${t.args_hint})` : ''}</span>
                <span style={{ fontSize: 11.5, color: 'var(--t3)', lineHeight: 1.5 }}>{t.description}</span>
                <span style={{ ...mono(9), color: 'var(--t4)', marginLeft: 'auto', flexShrink: 0 }}>{t.language} · ran ×{t.runs}</span>
              </div>
            )) : <Empty text="none yet — the registry grows the first time she reaches tool_forge" />}
          </Section>
        </>}
      </div>
    </div>
  )
}
