// ============================================================
// CONDUCTOR — her autonomous work, visible.
// Left: the intent queue (standing goals the conductor runs on the clock —
// yours are filed active; hers arrive as proposals you can activate).
// Right: the run log — every unprompted run with its outcome and the full
// tool trace, so the morning shows you what she did in the night.
// ============================================================
import { useEffect, useState } from 'react'
import { WORKER, getToken } from '../lib/elle'

type Intent = { id: string; title: string; goal: string; status: string; priority: number; source: string; runs: number; last_run_at: number | null; last_outcome: string | null }
type Run = { id: string; intent_id: string; kind: string; started_at: number; finished_at: number; steps: number; outcome: string; trace_json: string }

const api = async (body: Record<string, unknown>) => {
  const r = await fetch(WORKER + '/api/elle-intents', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
  })
  const d = await r.json().catch(() => ({} as Record<string, unknown>))
  // Surface the failure instead of swallowing it: a 401 (not admin / stale
  // token) or any non-2xx used to return quietly and the caller would clear the
  // form as if it had worked. Now it throws with the reason so the panel shows it.
  if (!r.ok) throw new Error(String((d as { error?: string }).error || `HTTP ${r.status}`))
  return d as Record<string, unknown>
}

const MIN_GOAL = 20

const ago = (t: number | null) => {
  if (!t) return '—'
  const m = Math.round((Date.now() - t) / 60000)
  return m < 1 ? 'now' : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`
}

const STATUS_COLOR: Record<string, string> = { active: '#C9A84C', proposed: '#8B94A3', paused: '#525B69', ready: '#6EA8DE', done: '#4ADE80' }

export default function ConductorPanel({ accent }: any) {
  const [intents, setIntents] = useState<Intent[]>([])
  const [runs, setRuns] = useState<Run[]>([])
  const [openRun, setOpenRun] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [goal, setGoal] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  const load = async () => {
    try {
      const d = await api({ op: 'list' })
      setIntents((d.intents as Intent[]) || []); setRuns((d.runs as Run[]) || [])
    } catch (e: any) { setNote(String(e.message || e)) }
  }
  useEffect(() => { load(); const iv = setInterval(load, 45000); return () => clearInterval(iv) }, [])

  const create = async () => {
    if (busy) return
    if (!title.trim()) { setNote('title required'); return }
    if (goal.trim().length < MIN_GOAL) { setNote(`goal too short — say what done looks like (${goal.trim().length}/${MIN_GOAL})`); return }
    setBusy(true); setNote('')
    try {
      const d = await api({ op: 'create', title: title.trim(), goal: goal.trim() })
      // handleIntents returns { result: "<string>" }; a validation refusal comes
      // back as text, not a thrown error — catch it and keep the draft.
      const res = typeof d.result === 'string' ? d.result : ''
      if (/refused|error/i.test(res)) { setNote(res); return }
      setTitle(''); setGoal(''); await load()
    } catch (e: any) { setNote(String(e.message || e)) } finally { setBusy(false) }
  }
  const act = async (op: string, id: string) => { await api({ op, id }).catch(() => {}); await load() }

  return (
    <div style={{ flex: 1, display: 'flex', minWidth: 0, overflow: 'hidden' }}>
      {/* ── intents ── */}
      <div style={{ width: 380, flexShrink: 0, borderRight: '0.5px solid var(--b1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px 8px', fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t3)', letterSpacing: '.12em', textTransform: 'uppercase' }}>
          standing intents — the clock runs these
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {intents.length === 0 && <div style={{ padding: 16, fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t4)' }}>no intents yet — file one below and she'll pick it up on the half-hour</div>}
          {intents.map(it => (
            <div key={it.id} style={{ padding: '10px 12px', background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[it.status] || 'var(--t4)', flexShrink: 0, alignSelf: 'center' }} />
                <span style={{ fontSize: 12, color: 'var(--t1)', fontWeight: 500 }}>{it.title}</span>
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)' }}>p{it.priority}{it.source === 'elle' ? ' · hers' : ''}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.55, margin: '5px 0 7px', whiteSpace: 'pre-wrap' }}>{it.goal.slice(0, 220)}{it.goal.length > 220 ? '…' : ''}</div>
              {it.last_outcome && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)', borderLeft: `2px solid ${accent}55`, paddingLeft: 8, marginBottom: 7, lineHeight: 1.5 }}>{it.last_outcome.slice(0, 180)}</div>}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)' }}>{it.runs} run{it.runs === 1 ? '' : 's'} · {ago(it.last_run_at)}</span>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
                  {it.status !== 'active' && it.status !== 'done' && <Btn label="activate" color={accent} onClick={() => act('activate', it.id)} />}
                  {it.status === 'active' && <Btn label="pause" color="var(--t3)" onClick={() => act('pause', it.id)} />}
                  {it.status !== 'done' && <Btn label="done" color="#4ADE80" onClick={() => act('complete', it.id)} />}
                  {/* the kill switch — removes the intent from the queue entirely
                      (run history stays). Workbench-only verb; she can't self-erase. */}
                  <Btn label="✕ kill" color="#D06565"
                    onClick={() => { if (window.confirm(`Kill "${it.title}"?\n\nThis removes it from the queue permanently — the conductor will never run it again. Its run history stays.`)) act('delete', it.id) }} />
                </span>
              </div>
            </div>
          ))}
        </div>
        {/* file a new intent */}
        <div style={{ padding: 12, borderTop: '0.5px solid var(--b1)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {note && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#D06565' }}>{note}</div>}
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="intent title"
            style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, color: 'var(--t1)', padding: '7px 10px', fontSize: 11.5, fontFamily: 'var(--mono)', outline: 'none' }} />
          <textarea value={goal} onChange={e => setGoal(e.target.value)} rows={3}
            placeholder="the goal — concrete enough that a future run knows what DONE looks like"
            style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, color: 'var(--t1)', padding: '7px 10px', fontSize: 11.5, fontFamily: 'var(--ui)', resize: 'vertical', outline: 'none', lineHeight: 1.5 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'stretch' }}>
            {goal.trim().length > 0 && goal.trim().length < MIN_GOAL && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t4)' }}>
                goal {goal.trim().length}/{MIN_GOAL}
              </span>
            )}
            <button onClick={create} disabled={busy || !title.trim() || goal.trim().length < MIN_GOAL}
              style={{ marginLeft: 'auto', padding: '5px 14px', borderRadius: 6, border: `0.5px solid ${accent}55`,
                background: accent + '22', color: accent,
                cursor: (busy || !title.trim() || goal.trim().length < MIN_GOAL) ? 'not-allowed' : 'pointer',
                opacity: (!title.trim() || goal.trim().length < MIN_GOAL) ? 0.5 : 1,
                fontFamily: 'var(--mono)', fontSize: 10.5 }}>
              {busy ? '…' : 'file intent ▸'}
            </button>
          </div>
        </div>
      </div>

      {/* ── run log ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px 8px', fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t3)', letterSpacing: '.12em', textTransform: 'uppercase' }}>
          autonomous runs — what she did while you were away
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {runs.length === 0 && <div style={{ padding: 16, fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t4)' }}>no runs yet — the conductor ticks at :30 each hour when there's active work</div>}
          {runs.map(r => {
            let trace: any[] = []
            try { trace = JSON.parse(r.trace_json || '[]') } catch {}
            return (
              <div key={r.id} style={{ borderLeft: `2px solid ${accent}66`, paddingLeft: 14 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: accent }}>{r.kind}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t4)' }}>{r.intent_id}</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t4)' }}>
                    {r.steps} step{r.steps === 1 ? '' : 's'} · {Math.max(1, Math.round((r.finished_at - r.started_at) / 1000))}s · {ago(r.started_at)}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--t1)', lineHeight: 1.65, whiteSpace: 'pre-wrap', margin: '4px 0' }}>{r.outcome}</div>
                {trace.length > 0 && (
                  <>
                    <button onClick={() => setOpenRun(openRun === r.id ? null : r.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--t4)', fontFamily: 'var(--mono)', fontSize: 9.5, cursor: 'pointer', padding: 0 }}>
                      {(openRun === r.id ? '▾' : '▸') + ' ' + trace.map((s: any) => s.tool).join(' → ')}
                    </button>
                    {openRun === r.id && trace.map((s: any, j: number) => (
                      <div key={j} style={{ marginTop: 6, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)' }}>
                        <span style={{ color: accent }}>{s.tool}</span> <span style={{ color: 'var(--t4)' }}>{JSON.stringify(s.args)}</span>
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, maxHeight: 140, overflowY: 'auto', marginTop: 2 }}>{String(s.result || '')}</div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Btn({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ background: 'none', border: `0.5px solid ${color}44`, borderRadius: 4, color, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 9, padding: '2px 8px' }}>
      {label}
    </button>
  )
}
