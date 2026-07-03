// ============================================================
// LIBRARY — the corpus + everything she writes.
// Left: search. A plain description resolves semantically to the right full
// document (no title needed — /api/corpus-resolve); a title/keyword filters
// the browse list. A series filter narrows to her research or dream output.
// Right: the open document, full text. Bottom-left: her dream/libre artifacts.
// ============================================================
import { useEffect, useState } from 'react'
import { WORKER, getToken } from '../lib/elle'

type Paper = { id: string; title: string; series: string; word_count?: number }
type Full = { id: string; title: string; series: string; full_text: string; word_count?: number }
type Artifact = { id: string; type: string; title: string; genesis: string; status: string; surface_priority: number }

const post = async (path: string, body: any) => {
  const r = await fetch(WORKER + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(body) })
  return r.json()
}

export default function LibraryPanel({ accent }: any) {
  const [q, setQ] = useState('')
  const [series, setSeries] = useState('')
  const [seriesList, setSeriesList] = useState<{ series: string; count: number }[]>([])
  const [papers, setPapers] = useState<Paper[]>([])
  const [open, setOpen] = useState<Full | null>(null)
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'papers' | 'dream'>('papers')

  useEffect(() => {
    post('/api/corpus-series', {}).then(d => setSeriesList(d.series || [])).catch(() => {})
    post('/api/elle-sandbox', { action: 'list' }).then(d => setArtifacts(d.items || [])).catch(() => {})
    browse('')
  }, [])

  const browse = async (query: string, ser = series) => {
    setLoading(true)
    try { const d = await post('/api/corpus-papers', { q: query || undefined, series: ser || undefined, limit: 100 }); setPapers(d.papers || []) }
    finally { setLoading(false) }
  }

  // Enter = semantic resolve (pull the right full doc by meaning); typing filters.
  const resolve = async () => {
    if (!q.trim()) return browse('')
    setLoading(true)
    try {
      const d = await post('/api/corpus-resolve', { q: q.trim(), open: true })
      if (d.auto_opened && d.paper) { setOpen(d.paper); setPapers(d.candidates || []) }
      else { setPapers(d.candidates?.length ? d.candidates : []); if (!d.candidates?.length) browse(q.trim()) }
    } finally { setLoading(false) }
  }

  const openPaper = async (id: string) => {
    const d = await post('/api/corpus-paper', { id })
    if (d.paper) setOpen(d.paper)
  }
  const openArtifact = async (id: string) => {
    const d = await post('/api/elle-sandbox', { action: 'get', item_id: id })
    if (d.item) setOpen({ id: d.item.id, title: d.item.title, series: d.item.type, full_text: d.item.content, word_count: undefined })
  }

  return (
    <div style={{ flex: 1, display: 'flex', minWidth: 0, overflow: 'hidden' }}>
      {/* ── search + list ── */}
      <div style={{ width: 340, flexShrink: 0, borderRight: '0.5px solid var(--b1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '0.5px solid var(--b1)' }}>
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') resolve() }}
            placeholder="describe it → Enter pulls the doc; type filters titles"
            style={{ background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, color: 'var(--t1)', padding: '8px 11px', fontSize: 11.5, fontFamily: 'var(--mono)', outline: 'none' }} />
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <select value={series} onChange={e => { setSeries(e.target.value); browse(q.trim(), e.target.value) }}
              style={{ flex: 1, background: 'var(--raised)', color: 'var(--t2)', border: '0.5px solid var(--b1)', borderRadius: 5, padding: '5px 8px', fontFamily: 'var(--mono)', fontSize: 10.5 }}>
              <option value="">all series</option>
              {seriesList.map(s => <option key={s.series} value={s.series}>{s.series} ({s.count})</option>)}
            </select>
            <Toggle on={mode === 'papers'} onClick={() => setMode('papers')} accent={accent}>corpus</Toggle>
            <Toggle on={mode === 'dream'} onClick={() => setMode('dream')} accent={accent}>dreams</Toggle>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {loading && <div style={{ padding: 10, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t4)' }}>…</div>}
          {mode === 'papers' && papers.map(p => (
            <button key={p.id} onClick={() => openPaper(p.id)}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: open?.id === p.id ? 'var(--float)' : 'none', border: 'none', borderRadius: 6, padding: '7px 9px', cursor: 'pointer', color: 'var(--t1)' }}>
              <div style={{ fontSize: 12, lineHeight: 1.4 }}>{p.title}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', marginTop: 2 }}>{p.series}{p.word_count ? ` · ${p.word_count}w` : ''}</div>
            </button>
          ))}
          {mode === 'dream' && artifacts.map(art => (
            <button key={art.id} onClick={() => openArtifact(art.id)}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: open?.id === art.id ? 'var(--float)' : 'none', border: 'none', borderRadius: 6, padding: '7px 9px', cursor: 'pointer', color: 'var(--t1)' }}>
              <div style={{ fontSize: 12, lineHeight: 1.4 }}>{art.title}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', marginTop: 2 }}>{art.type} · {art.status} · pri {art.surface_priority}</div>
            </button>
          ))}
          {mode === 'dream' && artifacts.length === 0 && <div style={{ padding: 10, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t4)' }}>no dream artifacts yet</div>}
        </div>
      </div>

      {/* ── open document ── */}
      <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
        {!open ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t4)', fontFamily: 'var(--mono)', fontSize: 11, textAlign: 'center', padding: 30, lineHeight: 1.8 }}>
            describe a document and press Enter — she'll pull the whole thing by meaning,<br />no title needed. or pick one from the list.
          </div>
        ) : (
          <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 30px' }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--t1)', lineHeight: 1.3 }}>{open.title}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: accent, margin: '8px 0 20px', letterSpacing: '.05em' }}>
              {open.series}{open.word_count ? ` · ${open.word_count} words` : ''} · id {open.id}
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--t1)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{open.full_text}</div>
          </div>
        )}
      </div>
    </div>
  )
}

function Toggle({ on, onClick, accent, children }: any) {
  return (
    <button onClick={onClick}
      style={{ padding: '5px 9px', borderRadius: 5, border: `0.5px solid ${on ? accent + '55' : 'var(--b1)'}`, background: on ? accent + '1f' : 'transparent', color: on ? accent : 'var(--t3)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 9.5 }}>
      {children}
    </button>
  )
}
