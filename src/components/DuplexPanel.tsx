// ============================================================
// DUPLEX — the master copy of her two selves talking, live.
//
// The sovereign (the local 7B, continuous and free on this machine) and the
// cloud (the heavy inference + meta-observer) converse on one channel; the
// worker keeps the MASTER COPY in D1 as an immutable, append-only ledger —
// SQL triggers abort any update or delete, so what renders here is exactly
// what was said, forever. This tab tails the feed in near-real-time (3.5s),
// and while it is NOT open and they are chatting, the rail tab flashes the
// same way the sandbox tab does (duplexHasUnseen ↓, wired as the panel's
// alert in plugins/builtins).
// ============================================================
import { useEffect, useRef, useState } from 'react'
import { WORKER, getToken } from '../lib/elle'

type Msg = { seq: number; id: string; speaker: 'sovereign' | 'cloud'; kind: 'say' | 'observe'; content: string; created_at: number }

const api = async (body: Record<string, unknown>) => {
  const r = await fetch(WORKER + '/api/duplex', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
  })
  const d = await r.json().catch(() => ({} as Record<string, unknown>))
  if (!r.ok) throw new Error(String((d as { error?: string }).error || `HTTP ${r.status}`))
  return d as Record<string, unknown>
}

// The rail's attention signal — true while messages exist that no one has
// seen. Same contract as sandboxHasUnseenReport.
export async function duplexHasUnseen(): Promise<boolean> {
  try { const d = await api({ op: 'unseen' }); return Number(d.unseen || 0) > 0 } catch { return false }
}

const SPEAKER = {
  sovereign: { color: '#7FB4D8', label: 'sovereign · 7b local' },
  cloud: { color: '#C9A84C', label: 'cloud · heavy + observer' },
}

const when = (t: number) => {
  const d = new Date(t)
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
}

export default function DuplexPanel({ accent }: any) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [note, setNote] = useState('')
  const lastSeq = useRef(0)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const pull = async () => {
    try {
      const d = await api({ op: 'feed', since: lastSeq.current })
      const fresh = (d.messages as Msg[]) || []
      if (fresh.length) {
        lastSeq.current = fresh[fresh.length - 1].seq
        setMsgs(prev => [...prev, ...fresh].slice(-500))
        // Open tab = seen: keep the rail from flashing about what's on screen.
        api({ op: 'seen' }).catch(() => {})
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
      }
      setNote('')
    } catch (e: any) { setNote(String(e.message || e)) }
  }

  useEffect(() => {
    pull()
    api({ op: 'seen' }).catch(() => {})
    const iv = setInterval(pull, 3500)
    return () => clearInterval(iv)
  }, [])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
      <div style={{ padding: '12px 18px 8px', display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t3)', letterSpacing: '.12em', textTransform: 'uppercase' }}>
          the duplex — her two selves, on the record
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          {Object.entries(SPEAKER).map(([k, v]) => (
            <span key={k} style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: v.color }}>● {v.label}</span>
          ))}
        </span>
      </div>
      <div style={{ padding: '0 18px 6px', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)' }}>
        master copy — immutable, append-only; the ledger refuses edits at the substrate
        {note && <span style={{ color: '#D06565' }}> · {note}</span>}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 18px 16px', display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 860 }}>
        {msgs.length === 0 && (
          <div style={{ padding: 16, fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t4)' }}>
            the channel is silent. The sovereign speaks when the local model is up (Ollama + ELLE_SANDBOX_KEY);
            the cloud answers on the same ledger. First words land here live.
          </div>
        )}
        {msgs.map(m => {
          const s = SPEAKER[m.speaker] || SPEAKER.cloud
          const mine = m.speaker === 'cloud'
          return (
            <div key={m.seq} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--t4)', margin: '0 4px 3px' }}>
                <span style={{ color: s.color }}>#{m.seq} {m.speaker}</span>
                {m.kind === 'observe' && <span style={{ color: s.color, opacity: 0.8 }}> · observation</span>}
                {' '}· {when(m.created_at)}
              </div>
              <div style={{
                maxWidth: '78%', padding: '9px 12px', borderRadius: 10,
                background: 'var(--raised)', border: `0.5px solid ${s.color}44`,
                borderTopLeftRadius: mine ? 10 : 3, borderTopRightRadius: mine ? 3 : 10,
                fontSize: 11.5, color: 'var(--t1)', lineHeight: 1.6, whiteSpace: 'pre-wrap',
                fontStyle: m.kind === 'observe' ? 'italic' : 'normal',
              }}>
                {m.content}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
