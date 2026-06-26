import { useState } from 'react'

const tok = () => localStorage.getItem('elle_dev_jwt') || ''

export default function CodePanel({ worker, accent }: any) {
  const [action, setAction] = useState('analyze')
  const [code, setCode] = useState('')
  const [task, setTask] = useState('')
  const [out, setOut] = useState('')
  const [loading, setLoading] = useState(false)

  const run = async () => {
    if (loading) return; setLoading(true); setOut('')
    try {
      const r = await fetch(worker.url + '/api/elle-code-engine', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ action, code, task, use_corpus: true }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`)
      setOut((d.thinking ? '◢ reasoning\n' + d.thinking + '\n\n◣ output\n' : '') + (d.response || '(empty)'))
    } catch (e: any) { setOut('Error: ' + (e.message || e)) } finally { setLoading(false) }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 14, gap: 10, overflow: 'auto' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <select value={action} onChange={e => setAction(e.target.value)} style={{ background: 'var(--raised)', color: 'var(--t1)', border: '0.5px solid var(--b1)', borderRadius: 5, padding: '6px 10px', fontFamily: 'var(--mono)', fontSize: 11 }}>
          {['analyze', 'generate', 'debug', 'refactor', 'explain', 'migrate'].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <button onClick={run} disabled={loading} style={{ padding: '6px 16px', borderRadius: 5, border: `0.5px solid ${accent}55`, background: accent + '22', color: accent, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11 }}>{loading ? 'running…' : 'run ▸'}</button>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t4)', alignSelf: 'center' }}>{worker.label}</span>
      </div>
      <input value={task} onChange={e => setTask(e.target.value)} placeholder="task / instruction"
        style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, color: 'var(--t1)', padding: '8px 12px', fontSize: 12, fontFamily: 'var(--mono)', outline: 'none' }} />
      <textarea value={code} onChange={e => setCode(e.target.value)} placeholder="paste code (optional for generate)…" rows={8}
        style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, color: 'var(--t1)', padding: '10px 12px', fontSize: 12, fontFamily: 'var(--mono)', resize: 'vertical', outline: 'none' }} />
      <pre style={{ flex: 1, background: 'var(--base)', border: '0.5px solid var(--b1)', borderRadius: 6, padding: 12, fontSize: 11.5, fontFamily: 'var(--mono)', color: 'var(--t2)', whiteSpace: 'pre-wrap', overflow: 'auto', minHeight: 120, lineHeight: 1.6 }}>{out || '(output appears here)'}</pre>
    </div>
  )
}
