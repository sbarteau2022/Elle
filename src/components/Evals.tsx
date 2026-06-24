import { useState } from 'react'

const tok = () => localStorage.getItem('elle_dev_jwt') || ''

// Scaffold for the training / eval bench. The κ estimator is a labelled stub
// behind a named seam; nothing downstream ranks on it until validate_kappa
// passes. This panel is where that gate gets run and watched — the quant
// ladder (Qwen2.5-7B across the quantization ladder) producing the κ-vs-
// reasoning-degradation curve. Wired read-only until the worker exposes an
// eval endpoint; runs against real journal phase data via /api/optimus-journal.
export default function Evals({ worker, accent }: any) {
  const [out, setOut] = useState('')
  const [loading, setLoading] = useState(false)

  const pull = async () => {
    if (loading) return; setLoading(true); setOut('')
    try {
      // sanity probe — confirm the workbench can reach the journal layer the
      // eval harness will read from.
      const r = await fetch(worker.url + '/api/optimus-journal', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ op: 'list' }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`)
      const ts = (d.threads || [])
      setOut(`journal reachable · ${ts.length} thread(s)\n` + ts.map((t: any) => `  · ${t.title} ${t.anchor_topic === 'elle-canvas' ? '(canvas)' : ''}`).join('\n'))
    } catch (e: any) { setOut('Error: ' + (e.message || e)) } finally { setLoading(false) }
  }

  const Card = ({ title, body }: { title: string; body: string }) => (
    <div style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 8, padding: 14 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: accent, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.6 }}>{body}</div>
    </div>
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 18, gap: 14, overflow: 'auto' }}>
      <div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--t1)', marginBottom: 4 }}>training · evals</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t3)' }}>
          the kill-or-build gate for κ — built next
        </div>
      </div>
      <Card title="validate_kappa" body="Does trajectory coherence (κ) predict reasoning-quality degradation? The gate κ must pass before anything ranks on it. Harness runs the quant ladder and scores the correlation; until it passes, κ is structure only." />
      <Card title="quant ladder" body="Qwen2.5-7B across the quantization ladder → κ-vs-degradation curve. Real run pending on M-series hardware; this bench will drive it and chart the result against the journal's stored phase series." />
      <Card title="data source" body="Reads the live phase trajectories the worker already computes (∫κdt, dκ/dt, d²κ/dt²) via /api/optimus-journal — the same numbers the Optimus tab renders." />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={pull} disabled={loading} style={{ padding: '7px 16px', borderRadius: 5, border: `0.5px solid ${accent}55`, background: accent + '22', color: accent, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11 }}>{loading ? 'probing…' : 'probe journal link ▸'}</button>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t4)' }}>confirms the eval data path is live</span>
      </div>
      {out && <pre style={{ background: 'var(--base)', border: '0.5px solid var(--b1)', borderRadius: 6, padding: 12, fontSize: 11.5, fontFamily: 'var(--mono)', color: 'var(--t2)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{out}</pre>}
    </div>
  )
}
