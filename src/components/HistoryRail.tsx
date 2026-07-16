// ============================================================
// HISTORY RAIL — past conversations down the left, like a real one.
// Shared by the elle tab and the code tab: each passes its own
// localStorage key, so each surface resumes into its own thread pool
// (they share the server-side list — one mind, many rooms).
// Lists sessions from /api/sessions (worker groups
// elle_conversation_turns by session_id); click to resume — the
// panel rehydrates the transcript and the worker's memory picks the
// thread back up because session_id is the memory key.
// ============================================================
import { useState, useEffect, useCallback } from 'react'

const tok = () => localStorage.getItem('elle_dev_jwt') || ''

export type SessionRow = { session_id: string; title: string; last_active: string; turns: number }
export type PastTurn = { role: string; content: string; created_at: string }

// Rehydrate helper shared by panels: server rows → { q, answer } pairs.
export function pairTurns(rows: PastTurn[]): { q: string; answer: string }[] {
  const out: { q: string; answer: string }[] = []
  for (const r of rows) {
    if (r.role === 'user') out.push({ q: r.content, answer: '' })
    else if (r.role === 'assistant') {
      if (out.length && !out[out.length - 1].answer) out[out.length - 1].answer = r.content
      else out.push({ q: '', answer: r.content })
    }
  }
  return out.filter(t => t.q || t.answer)
}

export async function fetchTranscript(workerUrl: string, sessionId: string): Promise<{ q: string; answer: string }[]> {
  const r = await fetch(workerUrl + '/api/sessions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
    body: JSON.stringify({ action: 'turns', session_id: sessionId }),
  })
  const d = await r.json()
  if (!r.ok || d.error) throw new Error(d.error || `HTTP ${r.status}`)
  return pairTurns(d.turns || [])
}

export default function HistoryRail({ worker, accent, currentSid, onResume, onNew }: {
  worker: { url: string }
  accent: string
  currentSid: string
  onResume: (sessionId: string) => void
  onNew: () => void
}) {
  const [open, setOpen] = useState(() => localStorage.getItem('elle_rail_open') !== '0')
  const [rows, setRows] = useState<SessionRow[]>([])
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    try {
      const r = await fetch(worker.url + '/api/sessions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ action: 'list', limit: 40 }),
      })
      const d = await r.json()
      if (!r.ok || d.error) { setNote(d.error || `HTTP ${r.status}`); return }
      setRows(d.sessions || []); setNote('')
    } catch (e: any) { setNote(String(e.message || e)) }
  }, [worker])

  useEffect(() => { load() }, [load, currentSid])
  const flip = () => { setOpen(o => { localStorage.setItem('elle_rail_open', o ? '0' : '1'); return !o }) }

  if (!open) return (
    <div style={{ width: 26, flexShrink: 0, borderRight: '0.5px solid var(--b1)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 10 }}>
      <button onClick={flip} title="conversation history"
        style={{ background: 'none', border: 'none', color: 'var(--t4)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11 }}>»</button>
    </div>
  )

  return (
    <div style={{ width: 198, flexShrink: 0, borderRight: '0.5px solid var(--b1)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 10px', borderBottom: '0.5px solid var(--b1)' }}>
        <button onClick={onNew}
          style={{ flex: 1, padding: '5px 0', borderRadius: 5, border: `0.5px solid ${accent}44`, background: accent + '14', color: accent, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10 }}>
          + new
        </button>
        <button onClick={load} title="refresh" style={{ background: 'none', border: 'none', color: 'var(--t4)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11 }}>↻</button>
        <button onClick={flip} title="collapse" style={{ background: 'none', border: 'none', color: 'var(--t4)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11 }}>«</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 6px' }}>
        {note && <div style={{ padding: 8, fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t4)', lineHeight: 1.6 }}>{note}</div>}
        {!note && rows.length === 0 && (
          <div style={{ padding: 10, fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t4)', lineHeight: 1.8 }}>
            no conversations yet — the first one starts when you speak
          </div>
        )}
        {rows.map(s => {
          const active = s.session_id === currentSid
          return (
            <button key={s.session_id} onClick={() => onResume(s.session_id)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', marginBottom: 3, padding: '7px 9px',
                borderRadius: 6, cursor: 'pointer',
                border: `0.5px solid ${active ? accent + '55' : 'transparent'}`,
                background: active ? accent + '12' : 'transparent',
              }}>
              <div style={{
                fontSize: 11, color: active ? 'var(--t1)' : 'var(--t2)', lineHeight: 1.45,
                overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {(s.title || '(untitled)').slice(0, 110)}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--t4)', marginTop: 3 }}>
                {String(s.last_active).slice(5, 16)} · {s.turns} turns
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
