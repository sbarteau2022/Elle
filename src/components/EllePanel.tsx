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
import VoiceOrb from './VoiceOrb'
import { useWorkbenchVoice } from '../lib/VoiceContext'
import { on } from '../lib/commands'
import { Md, printAnswer, emailAnswer } from '../lib/md'
import { fetchRegisters, getRegister, setRegister, FALLBACK_REGISTERS, type Register } from '../lib/registers'

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
// The real full-scope catalog, grouped as the worker renders it (router.ts
// TOOL_LINES). Keep this list in step with the worker — every chip here is a
// tool the router can actually dispatch.
const TOOLS: [string, string][] = [
  // mind & memory
  ['search_corpus', 'published corpus + papers · semantic'],
  ['find_document', 'pull a full doc by description'],
  ['fetch_document', 'one corpus paper by id'],
  ['read_sql', 'SELECT-only over every D1 table'],
  ['recall_memory', 'semantic search of prior sessions'],
  ['remember', 'deliberate long-term memory · write'],
  ['self_state', 'her own phase · one-call introspection'],
  ['scratchpad_write', 'short-TTL working memory · write'],
  ['scratchpad_read', 'short-TTL working memory · read'],
  // world
  ['web_search', 'live web · grounded'],
  ['fetch_url', 'read one http(s) page'],
  ['calc', 'exact deterministic arithmetic'],
  ['diagnose', 'root-cause a stack/build error'],
  ['code_engine', 'analyze·generate·debug·refactor code'],
  // real execution
  ['run_code', 'ACTUALLY execute · python/js/ts'],
  ['run_shell', 'shell in the sandbox'],
  // reasoning about herself
  ['constraint_analyzer', 'find the one binding constraint'],
  // her codebase & the forge
  ['repo_read', 'her own source · any file'],
  ['repo_search', 'code search her repos'],
  ['github_read_file', 'read any GitHub repo'],
  ['github_list_files', 'list any repo directory'],
  ['github_search_code', 'search code in any repo'],
  ['forge_open', 'cut an elle/* work branch'],
  ['forge_write', 'commit one file to the branch'],
  ['forge_check', 'CI verdict + failing logs'],
  ['forge_pr', 'request acceptance · never merges'],
  // skills
  ['skill_list', 'her skill library index'],
  ['skill_read', 'load a distilled procedure'],
  ['skill_write', 'author/refine a skill'],
  // mcp
  ['mcp_add', 'mount an MCP server by URL'],
  ['mcp_tools', 'mounted external tool servers'],
  ['mcp_call', 'call any MCP tool · HF pre-mounted'],
  // autonomy
  ['intent', 'file standing work for the conductor'],
  ['review_runs', 'read her own autonomous runs'],
  // journal
  ['journal_read', 'journal · semantic'],
  ['journal_thread', 'manuscript + phase series'],
  ['journal_write', 'Optimus entry · κ computed'],
  ['journal_annotate', 'marginalia on a paragraph'],
  // hospitality (native rapid2ai-db)
  ['rapid_report', 'hospitality intel · narrated'],
  ['rapid_costs', 'invoice lines · per-unit'],
  ['rapid_variance', 'price variance by SKU'],
  ['rapid_pos', 'POS daily close · 14d'],
  ['rapid_menu', 'menu performance · 30d'],
  // writes / sensitive
  ['ingest_paper', 'add to corpus · 2-check gate'],
  ['trigger_dream', 'run one libre/dream cycle'],
  ['trade_execute', 'Alpaca · buy/sell/close'],
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

  // The workbench's one voice/mic/presence pipeline (VoiceContext). This
  // panel is the conversation surface, so it's the one that subscribes to
  // dictation and to the confirm/cancel verbs — spoken or gestured.
  const wv = useWorkbenchVoice()
  const { voice, presence } = wv
  const [interim, setInterim] = useState('')

  // Prose register — which of her five voices answers. Persisted; sent per turn.
  const [registers, setRegisters] = useState<Register[]>(FALLBACK_REGISTERS)
  const [register, setReg] = useState<string>(getRegister())
  useEffect(() => { fetchRegisters().then(setRegisters) }, [])
  const pickRegister = (id: string) => { setReg(id); setRegister(id) }

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [turns])

  // Presence: if you turn away from the screen mid-sentence, she stops talking —
  // the way a person would trail off when you leave the room.
  useEffect(() => { if (presence.away && voice.speaking) voice.stopSpeaking() }, [presence.away, voice.speaking])

  // Listen-mode plumbing. Dictation lands in the composer (appended, never
  // auto-sent); "send"/nod submit it; "cancel"/shake wipe it. Subscribed once —
  // refs keep the handlers on the latest composer state without resubscribing
  // per keystroke.
  const qRef = useRef(q); qRef.current = q
  const askRef = useRef<() => void>(() => {}); askRef.current = () => { void ask() }
  useEffect(() => {
    const subs = [
      on('dictation', ({ text }) => { setInterim(''); setQ(prev => (prev ? prev + ' ' : '') + text) }),
      on('dictation.interim', ({ text }) => setInterim(text)),
      on('send', () => { if (qRef.current.trim()) askRef.current() }),
      on('cancel', () => { setQ(''); setInterim('') }),
      on('gesture.nod', () => { if (qRef.current.trim()) askRef.current() }),
      on('gesture.shake', () => { setQ(''); setInterim('') }),
    ]
    return () => subs.forEach(off => off())
  }, [])

  const ask = async (override?: string) => {
    const question = (override ?? q).trim()
    if (loading || !question) return
    voice.stopSpeaking()
    setLoading(true); setNote(''); setQ('')
    if (taRef.current) taRef.current.style.height = 'auto'
    const idx = turns.length
    setTurns(t => [...t, { q: question, answer: '', trace: [], open: false, pending: true }])
    try {
      const r = await fetch(worker.url + '/api/elle-router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ q: question, session_id: sid(), voice: register }),
      })
      const d = await r.json()
      if (!r.ok || d.error) setNote(d.error || `HTTP ${r.status}`)
      if (d.kappa_dynamics) setDyn(d.kappa_dynamics)
      const answer = d.answer || '(no answer)'
      setTurns(t => t.map((x, i) => i === idx
        ? { ...x, answer, trace: d.trace || [], pending: false } : x))
      if (voice.enabled && !d.error) voice.speak(answer)   // she reads it back
    } catch (e: any) {
      setNote('Error: ' + (e.message || e))
      setTurns(t => t.map((x, i) => i === idx ? { ...x, answer: '(request failed)', pending: false } : x))
    } finally { setLoading(false) }
  }
  const toggle = (i: number) => setTurns(t => t.map((x, j) => j === i ? { ...x, open: !x.open } : x))

  // Push-to-talk: transcribe into the composer; on a final phrase, send it.
  // Consent-gated — the first press opens the PermissionGate, never the mic.
  // While workbench listen mode is live this button hands off to it instead
  // of fighting over the one recognition session.
  const mic = async () => {
    if (wv.listenMode) { wv.toggleListenMode(); return }
    if (voice.listening) { voice.stopListening(); return }
    const ok = await wv.requestMic()
    if (!ok) return
    voice.startListening(
      (finalText) => { setQ(''); ask(finalText) },
      (t) => setQ(t),
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
      {/* κ instrument line — her live coherence readout */}
      <KappaHeader dyn={dyn} />

      {/* header row: label + tool drawer + voice */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 22px 0' }}>
        <VoiceOrb accent={accent} speaking={voice.speaking} listening={voice.listening} presence={presence} />
        <button onClick={() => setShowTools(s => !s)}
          style={{ background: 'none', border: 'none', color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 10.5, cursor: 'pointer', padding: 0 }}>
          {(showTools ? '▾ ' : '▸ ') + TOOLS.length + ' tools she can reach'}
        </button>
        {note && <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: '#D06565' }}>{note}</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* prose register — which of her five voices answers */}
          <select value={register} onChange={e => pickRegister(e.target.value)}
            title={registers.find(r => r.id === register)?.blurb || 'her prose register'}
            style={{ background: 'var(--raised)', color: register === 'stewart' ? 'var(--t2)' : accent, border: `0.5px solid ${register === 'stewart' ? 'var(--b1)' : accent + '55'}`, borderRadius: 5, fontFamily: 'var(--mono)', fontSize: 9.5, padding: '3px 6px', cursor: 'pointer', outline: 'none', maxWidth: 168 }}>
            {registers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          {presence.available && (
            <span title="AirPods head tracking is live" style={{ fontFamily: 'var(--mono)', fontSize: 9, color: presence.away ? 'var(--t4)' : accent, letterSpacing: '.05em' }}>
              {presence.away ? 'away' : 'present'}
            </span>
          )}
          {voice.ttsSupported && (
            <button onClick={() => voice.setEnabled(!voice.enabled)}
              title={voice.enabled ? 'she reads answers aloud — click to mute' : 'click to have her read answers aloud'}
              style={{ background: voice.enabled ? accent + '1f' : 'none', border: `0.5px solid ${voice.enabled ? accent + '55' : 'var(--b1)'}`, borderRadius: 5, color: voice.enabled ? accent : 'var(--t3)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 9.5, padding: '3px 9px' }}>
              {voice.speaking ? '◼ speaking' : voice.enabled ? '🔊 voice on' : '🔇 voice off'}
            </button>
          )}
        </div>
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
              <div style={{ borderLeft: `2px solid ${t.pending ? 'var(--b1)' : accent + '99'}`, paddingLeft: 16, fontSize: 13.5, color: 'var(--t1)', lineHeight: 1.75, opacity: t.pending ? 0.45 : 1, transition: 'opacity .2s' }}>
                {t.pending ? 'thinking…' : <Md text={t.answer} />}
              </div>
              {/* export rail — print/PDF via the browser dialog, email via mailto, copy */}
              {!t.pending && t.answer && (
                <div style={{ paddingLeft: 18, display: 'flex', gap: 12 }}>
                  {([['⎙ print / pdf', () => printAnswer(t.q.slice(0, 80) || 'Elle', t.answer)],
                     ['✉ email', () => emailAnswer('Elle — ' + (t.q.slice(0, 60) || 'notes'), t.answer)],
                     ['⧉ copy', () => { navigator.clipboard?.writeText(t.answer) }]] as [string, () => void][]).map(([label, fn]) => (
                    <button key={label} onClick={fn}
                      style={{ background: 'none', border: 'none', color: 'var(--t4)', fontFamily: 'var(--mono)', fontSize: 9.5, cursor: 'pointer', padding: 0, letterSpacing: '.05em' }}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
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
        {/* words still forming while she listens — visible before they commit */}
        {interim && (
          <div style={{ maxWidth: 760, margin: '0 auto 6px', padding: '0 14px', fontFamily: 'var(--mono)', fontSize: 10.5, fontStyle: 'italic', color: 'var(--t3)' }}>
            {interim}…
          </div>
        )}
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', gap: 8, alignItems: 'flex-end', background: 'var(--raised)', border: `0.5px solid ${wv.listenMode ? '#D0656555' : 'var(--b1)'}`, borderRadius: 10, padding: '4px 4px 4px 14px' }}>
          <textarea ref={taRef} value={q} rows={1}
            onChange={e => { setQ(e.target.value); e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, 140) + 'px' }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask() } }}
            placeholder={wv.listenMode ? 'listening — dictate, then say "send" or nod' : voice.listening ? 'listening…' : 'speak, or hold the mic — she decides what to reach for'}
            style={{ flex: 1, background: 'none', border: 'none', color: 'var(--t1)', padding: '8px 0', fontSize: 13, fontFamily: 'var(--ui)', resize: 'none', outline: 'none', lineHeight: 1.6, maxHeight: 140 }} />
          {voice.sttSupported && (
            <button onClick={mic} title={voice.listening ? 'stop listening' : 'talk to her'}
              style={{ width: 34, height: 34, borderRadius: 8, border: `0.5px solid ${voice.listening ? '#D06565' : accent}55`, background: voice.listening ? '#D0656522' : 'transparent', color: voice.listening ? '#D06565' : 'var(--t2)', cursor: 'pointer', fontSize: 14, flexShrink: 0, animation: voice.listening ? 'orbSpeak 1s ease-in-out infinite' : 'none' }}>
              {voice.listening ? '◉' : '🎙'}
            </button>
          )}
          <button onClick={() => ask()} disabled={loading || !q.trim()}
            style={{ width: 34, height: 34, borderRadius: 8, border: `0.5px solid ${accent}55`, background: loading ? 'transparent' : accent + '22', color: accent, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 13, flexShrink: 0 }}>
            {loading ? '…' : '↑'}
          </button>
        </div>
      </div>
    </div>
  )
}
