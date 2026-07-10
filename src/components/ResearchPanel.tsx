// ============================================================
// RESEARCH — a dedicated reading room for what she found on her own.
// Distinct from Library: no semantic-resolve search bar, no series picker —
// this is scoped to her autonomous research output specifically, listed
// newest-first, opened in a manuscript-style reader rather than a flat dump.
//
// RESEARCH_SERIES is deliberately an array of one today ('research', the
// hourly-cron series). If the still-unaudited "General" series turns out to
// also be her research output, folding it in is exactly one line here — each
// series is fetched and merged client-side since /api/corpus-papers matches
// on a single series per call.
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import { WORKER, getToken } from '../lib/elle'
import { Md, printAnswer, emailAnswer } from '../lib/md'

const RESEARCH_SERIES = ['research']

type Paper = { id: string; title: string; series: string; tag?: string; word_count?: number }
type Full = Paper & { abstract?: string; full_text: string }

const post = async (path: string, body: any) => {
  const r = await fetch(WORKER + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(body) })
  return r.json()
}

// Research titles are minted as `[Research YYYY-MM-DD] <topic>` (research.ts).
// Pull the dateline out so the list and reader can show it properly instead
// of a bracket prefix, and fall back gracefully for anything that doesn't match.
function splitTitle(title: string): { date: string | null; topic: string } {
  const m = (title || '').match(/^\[Research (\d{4}-\d{2}-\d{2})\]\s*(.*)$/)
  return m ? { date: m[1], topic: m[2] || '(untitled)' } : { date: null, topic: title }
}
function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
}

export default function ResearchPanel({ accent }: any) {
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [open, setOpen] = useState<Full | null>(null)
  const [openLoading, setOpenLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all(RESEARCH_SERIES.map(series => post('/api/corpus-papers', { series, limit: 500 })))
      .then(results => {
        const seen = new Set<string>()
        const merged: Paper[] = []
        for (const r of results) for (const p of (r.papers || []) as Paper[]) {
          if (seen.has(p.id)) continue
          seen.add(p.id); merged.push(p)
        }
        // /api/corpus-papers orders by title ASC; the embedded ISO date sorts
        // lexicographically too, so this reverse gives newest-first for free.
        merged.sort((a, b) => b.title.localeCompare(a.title))
        setPapers(merged)
      })
      .catch(() => setPapers([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return papers
    return papers.filter(p => p.title.toLowerCase().includes(q) || (p.tag || '').toLowerCase().includes(q))
  }, [papers, filter])

  const openPaper = async (id: string) => {
    setOpenLoading(true)
    try { const d = await post('/api/corpus-paper', { id }); if (d.paper) setOpen(d.paper) }
    finally { setOpenLoading(false) }
  }

  return (
    <div style={{ flex: 1, display: 'flex', minWidth: 0, overflow: 'hidden' }}>
      {/* ── list ── */}
      <div style={{ width: 320, flexShrink: 0, borderRight: '0.5px solid var(--b1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: 12, borderBottom: '0.5px solid var(--b1)' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 8 }}>
            {loading ? 'loading…' : `${papers.length} findings`}
          </div>
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="filter by topic or tag"
            style={{ width: '100%', background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, color: 'var(--t1)', padding: '8px 11px', fontSize: 11.5, fontFamily: 'var(--mono)', outline: 'none' }} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {!loading && filtered.length === 0 && (
            <div style={{ padding: 10, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t4)', lineHeight: 1.7 }}>
              {papers.length === 0 ? 'no research papers found yet — the hourly research cycle writes here as it runs' : 'nothing matches that filter'}
            </div>
          )}
          {filtered.map(p => {
            const { date, topic } = splitTitle(p.title)
            return (
              <button key={p.id} onClick={() => openPaper(p.id)}
                style={{ display: 'block', width: '100%', textAlign: 'left', background: open?.id === p.id ? 'var(--float)' : 'none', border: 'none', borderRadius: 6, padding: '8px 9px', cursor: 'pointer', color: 'var(--t1)' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: accent, letterSpacing: '.04em', marginBottom: 3 }}>{date ? formatDate(date) : p.series}</div>
                <div style={{ fontSize: 12, lineHeight: 1.4 }}>{topic}</div>
                {p.tag && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                    {p.tag.split(',').filter(Boolean).slice(0, 4).map(t => (
                      <span key={t} style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--t4)', border: '0.5px solid var(--b1)', borderRadius: 100, padding: '1px 7px' }}>{t.trim()}</span>
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── manuscript reader ── */}
      <div style={{ flex: 1, overflowY: 'auto', minWidth: 0, background: 'var(--void)' }}>
        {openLoading ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t4)', fontFamily: 'var(--mono)', fontSize: 11 }}>opening…</div>
        ) : !open ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t4)', fontFamily: 'var(--mono)', fontSize: 11, textAlign: 'center', padding: 30, lineHeight: 1.8 }}>
            pick a finding from the list — it opens in her reading room
          </div>
        ) : (
          <Manuscript paper={open} accent={accent} />
        )}
      </div>
    </div>
  )
}

function Manuscript({ paper, accent }: { paper: Full; accent: string }) {
  const { date, topic } = splitTitle(paper.title)
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px 80px', display: 'flex', justifyContent: 'center' }}>
      <style>{`
        .ms-page p:first-of-type::first-letter {
          float: left; font-family: var(--serif); font-size: 3.4em; line-height: 0.82;
          padding: 0.04em 0.09em 0 0; color: ${accent};
        }
        .ms-page pre, .ms-page code { font-family: var(--mono) !important; }
        .ms-page blockquote { color: var(--t2); }
      `}</style>
      <article className="ms-page" style={{
        width: '100%', maxWidth: 680, background: 'var(--raised)', border: '0.5px solid var(--b1)',
        borderRadius: 10, padding: '52px 58px 60px', boxShadow: '0 1px 2px rgba(0,0,0,.2), 0 16px 40px rgba(0,0,0,.25)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 26 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: accent, letterSpacing: '.08em', textTransform: 'uppercase' }}>
            {date ? formatDate(date) : paper.series} · her research, autonomous
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <button onClick={() => printAnswer(topic, paper.full_text)}
              style={{ background: 'none', border: '0.5px solid var(--b1)', borderRadius: 5, color: 'var(--t3)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 9.5, padding: '4px 10px' }}>print / pdf</button>
            <button onClick={() => emailAnswer(topic, paper.full_text)}
              style={{ background: 'none', border: '0.5px solid var(--b1)', borderRadius: 5, color: 'var(--t3)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 9.5, padding: '4px 10px' }}>email</button>
          </div>
        </div>

        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 600, color: 'var(--t1)', lineHeight: 1.22, margin: '0 0 14px', textWrap: 'balance' as any }}>{topic}</h1>

        {paper.tag && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {paper.tag.split(',').filter(Boolean).map(t => (
              <span key={t} style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', border: '0.5px solid var(--b1)', borderRadius: 100, padding: '2px 9px' }}>{t.trim()}</span>
            ))}
          </div>
        )}
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t4)', margin: '10px 0 30px', paddingBottom: 20, borderBottom: '0.5px solid var(--b1)' }}>
          {paper.word_count ? `${paper.word_count.toLocaleString()} words` : ''} · id {paper.id}
        </div>

        <div style={{ fontFamily: 'var(--serif)', fontSize: 16.5, lineHeight: 1.85, color: 'var(--t1)' }}>
          <Md text={paper.full_text} />
        </div>
      </article>
    </div>
  )
}
