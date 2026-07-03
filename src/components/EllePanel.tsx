// ============================================================
// ELLE — unified conversation surface
// Collapses the old chat / ask / corpus tabs into one window. Every turn goes
// to /api/elle-router (the full-scope ReAct loop): she picks the tools AND the
// engine per step, executes, cross-references, and answers. The per-turn tool
// trace renders as a timeline; the κ line above the conversation is her live
// coherence readout (worker-computed, dt = 1 turn).
// ============================================================
import { useState, useRef, useEffect } from 'react'
import KappaHeader, { type KappaDynamics } from './KappaHeader'

const tok = () => localStorage.getItem('elle_dev_jwt') || ''

// Stable per-browser session id so the router loads prior turns and persists
// this exchange — without it every message was a cold start and she forgot
// who you told her to be one turn ago.
const SID_KEY = 'elle_router_session'
const sid = () => {
  let s = localStorage.getItem(SID_KEY)
  if (!s) { s = crypto.randomUUID(); localStorage.setItem(SID_KEY, s) }
  return s
}

// Inventory mirrors the router's system-prompt tool set (worker/src/router.ts).
const TOOLS: [string, string][] = [
  ['search_corpus', '70+ papers · semantic'],
  ['find_document', 'pull a full doc by description'],
  ['read_sql', 'SELECT over every D1 table'],
  ['web_search', 'live web'],
  ['fetch_url', 'read a page'],
  ['fetch_document', 'R2 documents'],
  ['recall_memory', 'prior sessions'],
  ['run_code', 'real execution · sandbox'],
  ['run_shell', 'shell in the sandbox'],
  ['calc', 'exact arithmetic'],
  ['scratchpad_write', 'working memory'],
  ['rapid_report', 'restaurant intel · native'],
  ['github_read_file', 'read any repo'],
  ['intent', 'file autonomous work'],
  ['self_state', 'her own phase · introspection'],
  ['remember', 'deliberate long-term memory'],
  ['code_engine', 'run code'],
  ['diagnose', 'root-cause this stack'],
  ['query_rapid2ai', 'restaurant intel bridge'],
  ['rapid_data', 'structured POS/invoice figures'],
  ['ingest_paper', 'add to corpus'],
  ['trigger_dream', 'libre sweep'],
  ['trade_execute', 'Alpaca · paper'],
  ['journal_write', 'Optimus entry'],
  ['journal_read', 'journal semantic'],
  ['journal_thread', 'manuscript + phase'],
  ['journal_annotate', 'marginalia'],
  ['rapid_data', 'structured hospitality figures'],
  ['memory_write', 'her durable memory · write'],
  ['memory_recall', 'her durable memory · recall'],
  ['page_read', 'paged tool output · fetch tail'],
  ['delegate', 'fork a bounded sub-run'],
  ['self_schedule', 'note to her future self'],
  ['repo_read', 'her own source · any file'],
  ['repo_search', 'code search her repos'],
  ['forge_open', 'cut a work branch'],
  ['forge_write', 'commit to the sandbox branch'],
  ['forge_check', 'CI verdict + failing logs'],
  ['forge_pr', 'request acceptance · never merges'],
  ['skill_read', 'her distilled procedures'],
  ['skill_write', 'she authors new skills'],
  ['mcp_tools', 'mounted external tool servers'],
  ['mcp_call', 'call any MCP tool · HF pre-mounted'],
  ['mcp_add', 'mount a new MCP server by URL'],
]

type Turn = { q: string; answer: string; trace: any[]; open: boolean; pending: boolean }

export default function EllePanel({ worker, accent }: any) {
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])
  const [showTools, setShowTools] = useState(false)
  const [note, setNote] = useState('')
  const [dyn, setDyn] = useState<KappaDynamics>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [turns])

  const ask = async () => {
    const question = q.trim()
    if (loading || !question) return
    setLoading(true); setNote(''); setQ('')
    if (taRef.current) taRef.current.style.height = 'auto'
    const idx = turns.length
    setTurns(t => [...t, { q: question, answer: '', trace: [], open: false, pending: true }])
    try {
      const r = await fetch(worker.url + '/api/elle-router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ q: question, session_id: sid() }),
      })
      const d = await r.json()
      if (!r.ok || d.error) setNote(d.error || `HTTP ${r.status}`)
      if (d.kappa_dynamics) setDyn(d.kappa_dynamics)
      setTurns(t => t.map((x, i) => i === idx
        ? { ...x, answer: d.answer || '(no answer)', trace: d.trace || [], pending: false } : x))
    } catch (e: any) {
      setNote('Error: ' + (e.message || e))
      setTurns(t => t.map((x, i) => i === idx ? { ...x, answer: '(request failed)', pending: false } : x))
    } finally { setLoading(false) }
  }
  const toggle = (i: number) => setTurns(t => t.map((x, j) => j === i ? { ...x, open: !x.open } : x))

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
      {/* κ instrument line — her live coherence readout */}
      <KappaHeader dyn={dyn} />

      {/* header row: label + tool drawer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 22px 0' }}>
        <button onClick={() => setShowTools(s => !s)}
          style={{ background: 'none', border: 'none', color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 10.5, cursor: 'pointer', padding: 0 }}>
          {(showTools ? '▾ ' : '▸ ') + '22 tools she can reach'}
        </button>
        {note && <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: '#D06565' }}>{note}</span>}
      </div>
      {showTools && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 22px 0' }}>
          {TOOLS.map(([name, desc]) => (
            <span key={name} title={desc}
              style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t2)', background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 4, padding: '2.5px 7px' }}>
              {name}
            </span>
          ))}
        </div>
      )}

      {/* conversation — editorial column */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '18px 0 10px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 22px', display: 'flex', flexDirection: 'column', gap: 26 }}>
          {turns.length === 0 && (
            <div style={{ paddingTop: '16vh', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 19, fontStyle: 'italic', color: 'var(--t2)', lineHeight: 1.6 }}>
                One window.
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t3)', marginTop: 10, lineHeight: 1.9 }}>
                the corpus · every D1 table · the live web · her own source and the forge<br />
                trading · the journal · skills · mounted MCP servers — she picks the instruments
              </div>
            </div>
          )}
          {turns.map((t, i) => (
            <div key={i} className="rise" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* the question — a marginal note, not a bubble */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: accent, letterSpacing: '.12em' }}>YOU</span>
                <span style={{ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.6 }}>{t.q}</span>
              </div>
              {/* her answer — prose on the page, one gold hairline */}
              <div style={{ borderLeft: `2px solid ${t.pending ? 'var(--b1)' : accent + '99'}`, paddingLeft: 16, fontSize: 13.5, color: 'var(--t1)', whiteSpace: 'pre-wrap', lineHeight: 1.75, opacity: t.pending ? 0.45 : 1, transition: 'opacity .2s' }}>
                {t.pending ? 'thinking…' : t.answer}
              </div>
              {/* tool trace — a timeline, folded by default */}
              {t.trace.length > 0 && (
                <div style={{ paddingLeft: 18 }}>
                  <button onClick={() => toggle(i)}
                    style={{ background: 'none', border: 'none', color: 'var(--t4)', fontFamily: 'var(--mono)', fontSize: 9.5, cursor: 'pointer', padding: 0, letterSpacing: '.05em' }}>
                    {(t.open ? '▾' : '▸') + ' ' + t.trace.length + ' step' + (t.trace.length === 1 ? '' : 's') + ' · ' + t.trace.map((s: any) => s.tool).join(' → ')}
                  </button>
                  {t.open && (
                    <div style={{ marginTop: 8, borderLeft: '1px solid var(--b1)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {t.trace.map((s: any, j: number) => (
                        <div key={j} style={{ paddingLeft: 14, position: 'relative' }}>
                          <span style={{ position: 'absolute', left: -3, top: 5, width: 5, height: 5, borderRadius: '50%', background: accent + 'AA' }} />
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: accent }}>
                            {s.tool}<span style={{ color: 'var(--t4)' }}>{'  ' + JSON.stringify(s.args)}</span>
                          </div>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, whiteSpace: 'pre-wrap', color: 'var(--t3)', lineHeight: 1.55, marginTop: 2, maxHeight: 180, overflowY: 'auto' }}>
                            {String(s.result || '')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* composer */}
      <div style={{ padding: '10px 22px 18px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', gap: 8, alignItems: 'flex-end', background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 10, padding: '4px 4px 4px 14px' }}>
          <textarea ref={taRef} value={q} rows={1}
            onChange={e => { setQ(e.target.value); e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, 140) + 'px' }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask() } }}
            placeholder="speak — she decides what to reach for"
            style={{ flex: 1, background: 'none', border: 'none', color: 'var(--t1)', padding: '8px 0', fontSize: 13, fontFamily: 'var(--ui)', resize: 'none', outline: 'none', lineHeight: 1.6, maxHeight: 140 }} />
          <button onClick={ask} disabled={loading || !q.trim()}
            style={{ width: 34, height: 34, borderRadius: 8, border: `0.5px solid ${accent}55`, background: loading ? 'transparent' : accent + '22', color: accent, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 13, flexShrink: 0 }}>
            {loading ? '…' : '↑'}
          </button>
        </div>
      </div>
    </div>
  )
}
