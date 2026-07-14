// Security — the adversarial security network's tactical dashboard.
// Reads elle-worker's admin-gated /api/elle-security-status: the rolling
// ledger of classified signals (auth failures, SSRF blocks, cyber findings,
// malware uploads), the posture spread across recent actors, and which
// doctrine tactics (48 Laws + Art of War — the same deck the War Room
// teaches as rhetoric, read as attacker tactics) have actually fired.
// Self-polling at 30s like Health; read-only — posture changes itself
// happen worker-side as scores accrue and decay.
import { useEffect, useState } from 'react'
import { worker, getToken } from '../lib/elle'

interface SecEvent {
  id: string; actor_key: string; source: string; kind: string
  tactic_ids: string; severity_weight: number; posture: string; detail: string; created_at: string
}
interface TacticRow {
  id: string; name: string; category: string; src: string; ref: string; counter: string; hits: number
}
interface SecStatus {
  recent: SecEvent[]
  posture_counts: { normal: number; watch: number; throttled: number; blocked: number }
  by_tactic: TacticRow[]
}

const POSTURE_COLOR: Record<string, string> = {
  normal: 'var(--good)', watch: 'var(--gold)', throttled: '#E09A4C', blocked: '#D06565',
}

const ago = (ts: string) => {
  const d = Math.floor((Date.now() - new Date(ts + (ts.endsWith('Z') ? '' : 'Z')).getTime()) / 1000)
  if (!Number.isFinite(d) || d < 0) return ts
  if (d < 60) return `${d}s ago`
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}

export default function SecurityPanel({ accent }: any) {
  const [data, setData] = useState<SecStatus | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const r = await fetch(worker.url + '/api/elle-security-status', {
          headers: { Authorization: `Bearer ${getToken()}` },
          signal: AbortSignal.timeout(10000),
        })
        const d = await r.json().catch(() => null)
        if (!alive) return
        if (!r.ok) { setNote(d?.error || `HTTP ${r.status}`); return }
        setData(d); setNote('')
      } catch (e: any) {
        if (alive) setNote('load failed: ' + (e?.message || e))
      }
    }
    load(); const iv = setInterval(load, 30000)
    return () => { alive = false; clearInterval(iv) }
  }, [])

  const counts = data?.posture_counts
  const quiet = data && data.recent.length === 0

  return (
    <div style={{ flex: 1, padding: 14, overflow: 'auto' }}>
      {note && (
        <div style={{ marginBottom: 10, padding: 10, background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 8, fontFamily: 'var(--mono)', fontSize: 11, color: '#D06565' }}>
          {note}
        </div>
      )}

      {/* posture spread across the actors in the recent window */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
        {(['normal', 'watch', 'throttled', 'blocked'] as const).map(p => (
          <div key={p} style={{ padding: '10px 8px', textAlign: 'center', background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 8 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 600, color: POSTURE_COLOR[p] }}>
              {counts ? counts[p] : '…'}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t4)', letterSpacing: '0.08em', marginTop: 2 }}>{p.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* doctrine tactics that have actually fired, most-hit first */}
      <div style={{ marginBottom: 12, padding: 12, background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 8 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: accent || 'var(--gold)', letterSpacing: '0.1em', marginBottom: 8 }}>
          TACTICS OBSERVED — 48 LAWS · ART OF WAR
        </div>
        {!data ? (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t4)' }}>…</span>
        ) : data.by_tactic.length === 0 ? (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t4)' }}>none in the recent window — the terrain is quiet</span>
        ) : data.by_tactic.map(t => (
          <div key={t.id} style={{ padding: '7px 0', borderBottom: '0.5px solid var(--b1)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, fontWeight: 600, color: 'var(--t1)' }}>{t.name}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t4)' }}>{t.src} {t.ref} · {t.category}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--gold)', marginLeft: 'auto' }}>×{t.hits}</span>
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', marginTop: 3, lineHeight: 1.5 }}>
              counter: {t.counter}
            </div>
          </div>
        ))}
      </div>

      {/* the ledger — recent classified signals */}
      <div style={{ padding: 12, background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 8 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: accent || 'var(--gold)', letterSpacing: '0.1em', marginBottom: 8 }}>
          EVENT LEDGER
        </div>
        {!data ? (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t4)' }}>…</span>
        ) : quiet ? (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t4)' }}>no classified signals yet</span>
        ) : data.recent.map(e => (
          <div key={e.id} style={{ padding: '6px 0', borderBottom: '0.5px solid var(--b1)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: POSTURE_COLOR[e.posture] || 'var(--t2)' }}>{e.kind}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t4)' }}>{e.actor_key}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t4)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{ago(e.created_at)}</span>
            </div>
            {e.detail && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {e.detail}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t4)', marginTop: 8 }}>
        polling every 30s · posture decays worker-side, one point per hour
      </div>
    </div>
  )
}

// Rail-tab attention signal: flash while any recent actor sits at blocked.
export async function securityHasBlocked(): Promise<boolean> {
  try {
    const r = await fetch(worker.url + '/api/elle-security-status', {
      headers: { Authorization: `Bearer ${getToken()}` },
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) return false
    const d = await r.json() as SecStatus
    return (d.posture_counts?.blocked || 0) > 0
  } catch { return false }
}
