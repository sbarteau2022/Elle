// Health — ported from the dev console (now deprecated), self-polling.
// Watches every backend the old console watched: elle-worker + both RAPID²AI
// workers, 30s cadence while the tab is open.
import { useEffect, useState } from 'react'
import { HEALTH_TARGETS } from '../lib/elle'

type Status = { ok: boolean; status: number; data: any }

export default function HealthPanel({ accent }: any) {
  const [health, setHealth] = useState<Record<string, Status>>({})

  useEffect(() => {
    let alive = true
    const check = async () => {
      const out: Record<string, Status> = {}
      await Promise.all(HEALTH_TARGETS.map(async w => {
        try {
          const r = await fetch(w.url, { signal: AbortSignal.timeout(8000) })
          out[w.key] = { ok: r.ok, status: r.status, data: r.ok ? await r.json().catch(() => null) : null }
        } catch { out[w.key] = { ok: false, status: 0, data: null } }
      }))
      if (alive) setHealth(out)
    }
    check(); const iv = setInterval(check, 30000)
    return () => { alive = false; clearInterval(iv) }
  }, [])

  return (
    <div style={{ flex: 1, padding: 14, overflow: 'auto' }}>
      {HEALTH_TARGETS.map(w => {
        const h = health[w.key]
        return (
          <div key={w.key} style={{ marginBottom: 10, padding: 12, background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11 }}>{h ? (h.ok ? '🟢' : h.status === 0 ? '⚫' : '🔴') : '…'}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>{w.label}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t4)', marginLeft: 'auto' }}>{w.url.replace('https://', '').replace('/health', '')}</span>
            </div>
            {h?.data && <pre style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--t3)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{JSON.stringify(h.data, null, 2)}</pre>}
            {h && !h.ok && <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--t4)' }}>HTTP {h.status || '—'}</span>}
          </div>
        )
      })}
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t4)', marginTop: 8 }}>polling every 30s · accent {accent}</div>
    </div>
  )
}
