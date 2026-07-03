// Diagnose — ported from the dev console (now deprecated). Paste an error or
// stack trace; elle-worker's diagnostic engine returns the on-stack fix.
import { useState } from 'react'
import { WORKER, getToken } from '../lib/elle'

export default function DiagnosePanel({ accent }: any) {
  const [err, setErr] = useState('')
  const [out, setOut] = useState('')
  const [loading, setLoading] = useState(false)

  const run = async () => {
    if (loading || !err.trim()) return; setLoading(true); setOut('')
    try {
      const r = await fetch(WORKER + '/api/diagnose', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ error: err }),
      })
      const d = await r.json()
      setOut(typeof d === 'string' ? d : JSON.stringify(d, null, 2))
    } catch (e: any) { setOut('Error: ' + (e.message || e)) } finally { setLoading(false) }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 14, gap: 10 }}>
      <textarea value={err} onChange={e => setErr(e.target.value)} placeholder="paste an error / stack trace…" rows={6}
        style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, color: 'var(--t1)', padding: '10px 12px', fontSize: 12, fontFamily: 'var(--mono)', resize: 'vertical', outline: 'none' }} />
      <button onClick={run} disabled={loading || !err.trim()}
        style={{ alignSelf: 'flex-start', padding: '6px 16px', borderRadius: 5, border: `0.5px solid ${accent}55`, background: accent + '22', color: accent, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11 }}>
        {loading ? 'diagnosing…' : 'diagnose ▸'}
      </button>
      <pre style={{ flex: 1, background: 'var(--base)', border: '0.5px solid var(--b1)', borderRadius: 6, padding: 12, fontSize: 11.5, fontFamily: 'var(--mono)', color: 'var(--t2)', whiteSpace: 'pre-wrap', overflow: 'auto', lineHeight: 1.6 }}>
        {out || '(diagnosis appears here)'}
      </pre>
    </div>
  )
}
