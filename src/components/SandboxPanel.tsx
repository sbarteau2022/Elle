// ============================================================
// SANDBOX — the connect-back box, watched live.
// Left: what she's doing on the machine right now — path OPEN/CLOSED, and every
// run_code / run_shell / clone with its real stdout/stderr/exit.
// Right: what she brought IN (clones, titled by her), her chain of thought (the
// sandbox steps off the event bus, indexed with the runs by run_id), and the
// reports she surfaces — the ones that flash this tab until it's opened.
// All fed by /api/elle-sandbox-runs on the worker.
// ============================================================
import { useEffect, useState } from 'react'
import { WORKER, getToken } from '../lib/elle'

type PathState = { open: boolean; meta?: { host?: string; platform?: string; root?: string; lastSeen?: number } }
type Run = {
  id: string; run_id: string | null; source: string | null; kind: string; language: string | null
  command: string | null; code_preview: string | null; target: string | null; title: string | null
  clone_key: string | null; exit: number | null; stdout_preview: string | null; stderr_preview: string | null
  ok: number; path_open: number; duration_ms: number | null; created_at: number
}
type Clone = { id: string; run_id: string | null; title: string | null; target: string; clone_key: string | null; ok: number; created_at: number }
type Thought = { id: string; run_id: string | null; source: string | null; tool: string | null; args: string | null; result_preview: string | null; duration_ms: number | null; created_at: number }
type Report = { id: string; run_id: string | null; title: string; body: string; seen: number; created_at: number }

const api = async (body: Record<string, unknown>) => {
  const r = await fetch(WORKER + '/api/elle-sandbox-runs', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
  })
  const d = await r.json().catch(() => ({} as Record<string, unknown>))
  if (!r.ok) throw new Error(String((d as { error?: string }).error || `HTTP ${r.status}`))
  return d as Record<string, unknown>
}

// Polled by the rail (App.tsx) to flash the tab when a report is waiting.
export async function sandboxHasUnseenReport(): Promise<boolean> {
  try { const d = await api({ op: 'unseen' }); return Number(d.unseen || 0) > 0 } catch { return false }
}

const ago = (t: number | null) => {
  if (!t) return '—'
  const s = Math.round((Date.now() - t) / 1000)
  return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)}m ago` : s < 86400 ? `${Math.round(s / 3600)}h ago` : `${Math.round(s / 86400)}d ago`
}

const KIND_GLYPH: Record<string, string> = { code: '⟩', shell: '$', clone: '⇡', status: '◦', report: '★' }

export default function SandboxPanel({ accent }: any) {
  const [path, setPath] = useState<PathState | null>(null)
  const [runs, setRuns] = useState<Run[]>([])
  const [brought, setBrought] = useState<Clone[]>([])
  const [thoughts, setThoughts] = useState<Thought[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [openRun, setOpenRun] = useState<string | null>(null)
  const [err, setErr] = useState('')

  const load = async () => {
    try {
      const d = await api({})
      setPath((d.path as PathState) || null)
      setRuns((d.runs as Run[]) || [])
      setBrought((d.brought_in as Clone[]) || [])
      setThoughts((d.thoughts as Thought[]) || [])
      setReports((d.reports as Report[]) || [])
      setErr('')
    } catch (e: any) { setErr(String(e.message || e)) }
  }

  // Opening the console clears the unseen-report flash, then we watch live.
  useEffect(() => {
    api({ op: 'seen' }).catch(() => {})
    load()
    const iv = setInterval(load, 3000)
    return () => clearInterval(iv)
  }, [])

  const open = !!path?.open
  const m = path?.meta || {}

  return (
    <div style={{ flex: 1, display: 'flex', minWidth: 0, overflow: 'hidden' }}>
      {/* ── left: live sandbox ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', borderRight: '0.5px solid var(--b1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px 8px' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t3)', letterSpacing: '.12em', textTransform: 'uppercase' }}>
            sandbox — the box, live
          </span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7 }}
            title={open ? `${m.host || 'laptop'} · ${m.platform || '?'} · ${m.root || ''}` : 'the laptop agent is not connected'}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: open ? 'var(--good)' : '#D06565', boxShadow: open ? '0 0 8px var(--good)' : 'none', animation: open ? 'breathe 3.2s ease-in-out infinite' : 'none' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: open ? 'var(--good)' : '#D06565', letterSpacing: '.06em' }}>
              {open ? `path open · ${m.host || 'laptop'}` : 'path closed'}
            </span>
          </span>
        </div>
        {err && <div style={{ padding: '0 18px 6px', fontFamily: 'var(--mono)', fontSize: 10, color: '#D06565' }}>{err}</div>}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {runs.length === 0 && <Empty>nothing has run on the box yet — she reaches for it with run_code / run_shell</Empty>}
          {runs.map(r => {
            const failed = r.path_open === 0 ? null : r.ok === 0
            const label = r.kind === 'clone' ? (r.title || r.target || 'clone')
              : r.kind === 'shell' ? (r.command || '')
              : (r.code_preview || '')
            const hasOut = !!(r.stdout_preview || r.stderr_preview)
            return (
              <div key={r.id} style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 8, padding: '9px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: accent, width: 12 }}>{KIND_GLYPH[r.kind] || '·'}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>{r.kind}{r.language ? `·${r.language}` : ''}</span>
                  {r.path_open === 0
                    ? <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#D06565' }}>path was closed</span>
                    : <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: failed ? '#D06565' : 'var(--good)' }}>exit {r.exit ?? '—'}</span>}
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)' }}>
                    {r.duration_ms != null ? `${r.duration_ms}ms · ` : ''}{ago(r.created_at)}
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t1)', lineHeight: 1.5, margin: '5px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 68, overflow: 'hidden' }}>
                  {label.slice(0, 300)}
                </div>
                {hasOut && (
                  <>
                    <button onClick={() => setOpenRun(openRun === r.id ? null : r.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--t4)', fontFamily: 'var(--mono)', fontSize: 9.5, cursor: 'pointer', padding: '4px 0 0' }}>
                      {openRun === r.id ? '▾ output' : '▸ output'}
                    </button>
                    {openRun === r.id && (
                      <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {r.stdout_preview && <Stream label="stdout" body={r.stdout_preview} color="var(--t2)" />}
                        {r.stderr_preview && <Stream label="stderr" body={r.stderr_preview} color="#D0908C" />}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── right: brought in · chain of thought · reports ── */}
      <div style={{ width: 400, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* surfaced reports (the flash) */}
          {reports.length > 0 && (
            <Section title="reports she surfaced">
              {reports.map(rep => (
                <div key={rep.id} style={{ background: 'var(--gold-dim)', border: `0.5px solid ${accent}66`, borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ color: accent, fontSize: 11 }}>★</span>
                    <span style={{ fontSize: 12, color: 'var(--t1)', fontWeight: 600 }}>{rep.title}</span>
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)' }}>{ago(rep.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--t2)', lineHeight: 1.6, marginTop: 6, whiteSpace: 'pre-wrap' }}>{rep.body}</div>
                </div>
              ))}
            </Section>
          )}

          {/* what she brought in */}
          <Section title="brought in — titled by her">
            {brought.length === 0 && <Empty>nothing cloned back yet — sandbox_clone pulls code UP, named</Empty>}
            {brought.map(c => (
              <div key={c.id} style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 7, padding: '8px 11px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ color: accent, fontFamily: 'var(--mono)', fontSize: 11 }}>⇡</span>
                  <span style={{ fontSize: 11.5, color: 'var(--t1)', fontWeight: 500 }}>{c.title || c.target}</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)' }}>{ago(c.created_at)}</span>
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t3)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.target}</div>
                {c.clone_key && <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--t4)', marginTop: 2 }}>cached · {c.clone_key}</div>}
              </div>
            ))}
          </Section>

          {/* chain of thought */}
          <Section title="chain of thought — the replay stream">
            {thoughts.length === 0 && <Empty>her sandbox reasoning steps will stream here as she works</Empty>}
            {thoughts.map(t => (
              <div key={t.id} style={{ borderLeft: `2px solid ${accent}44`, paddingLeft: 10 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: accent }}>{t.tool}</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--t4)' }}>{ago(t.created_at)}</span>
                </div>
                {t.args && <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 34, overflow: 'hidden' }}>{t.args}</div>}
                {t.result_preview && <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t3)', lineHeight: 1.45, whiteSpace: 'pre-wrap', maxHeight: 54, overflow: 'hidden', marginTop: 2 }}>{t.result_preview}</div>}
              </div>
            ))}
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', letterSpacing: '.12em', textTransform: 'uppercase' }}>{title}</div>
      {children}
    </div>
  )
}
function Empty({ children }: { children: any }) {
  return <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t4)', lineHeight: 1.5 }}>{children}</div>
}
function Stream({ label, body, color }: { label: string; body: string; color: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--t4)', letterSpacing: '.08em' }}>{label}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 160, overflowY: 'auto', marginTop: 2 }}>{body}</div>
    </div>
  )
}
