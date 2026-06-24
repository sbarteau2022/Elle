// ============================================================
// OPTIMUS — the phase-state correspondence (live)
// Side-header app shell: a left nav toggles screens (Manuscript · Phase · Ask).
// The manuscript is one full page with the write-path — you author reader
// entries and Invite Elle to respond (worker op:'respond', she replies in-
// thread and extends the same κ trajectory). Reads /api/optimus-journal
// (list|thread|write|respond — direct-D1, so off-record + her canvas surface);
// Ask routes to /api/elle-router. κ + reserve/velocity/accel are worker-computed
// and only displayed. Metadata lives as a tab beside the 3D portrait. Light
// "paper" surface, scoped so it can't bleed into the dark console.
// ============================================================
import { useState, useEffect, useRef, useCallback } from 'react'

const tok = () => localStorage.getItem('elle_dev_jwt') || ''
const PLOTLY = 'https://cdnjs.cloudflare.com/ajax/libs/plotly.js/2.35.0/plotly.min.js'
const sci = (x: number, d = 3) => { if (x === 0) return '0'; const a = Math.abs(x); return (a < 1e-3 || a >= 1e5) ? x.toExponential(d) : String(+x.toFixed(6)) }
const fmt = (t: number) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

const STYLE = `
.opt{--paper:#FFFFFF;--cream:#F7F3EA;--wash:#FBF9F3;--ink:#1B2A4A;--ink-deep:#13203B;--gold:#B8893A;--blue:#2E5AAC;--muted:#6E6655;--soft:#8A8472;--rule:rgba(27,42,74,.12);--rule-soft:rgba(27,42,74,.06);--green:#3F9D6B;
  position:absolute;inset:0;display:grid;grid-template-columns:158px 1fr;background:var(--cream);color:var(--ink);font-family:'DM Sans',system-ui,sans-serif}
.opt .side{border-right:1px solid var(--rule);background:var(--paper);display:flex;flex-direction:column;padding:16px 0}
.opt .brand{display:flex;align-items:center;gap:9px;padding:0 16px 16px}
.opt .brand .nm{font-family:'Playfair Display',Georgia,serif;font-size:16px;color:var(--ink-deep)}
.opt .snav{display:flex;flex-direction:column;gap:2px;padding:0 8px}
.opt .snav button{display:flex;align-items:center;gap:9px;width:100%;text-align:left;border:0;background:transparent;color:var(--muted);font-family:'DM Sans';font-size:13px;padding:9px 10px;border-radius:8px;cursor:pointer}
.opt .snav button:hover{background:var(--wash)}
.opt .snav button.on{background:var(--cream);color:var(--gold);font-weight:600}
.opt .snav .ic{width:16px;text-align:center;font-size:13px}
.opt .sfoot{margin-top:auto;padding:14px 16px 0;border-top:1px solid var(--rule-soft)}
.opt .sfoot .st{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--soft);display:flex;align-items:center;gap:6px}
.opt .sfoot .dot{width:6px;height:6px;border-radius:50%;background:var(--green)}
.opt .thsel{padding:10px 16px}
.opt .thsel .lbl{font-size:9px;letter-spacing:.13em;text-transform:uppercase;color:var(--soft);margin-bottom:6px}
.opt .thsel select{width:100%;font-family:'DM Sans';font-size:12px;color:var(--ink-deep);background:var(--wash);border:1px solid var(--rule);border-radius:7px;padding:7px 9px;outline:none}

.opt .main{position:relative;overflow:hidden;min-width:0}
.opt .screen{position:absolute;inset:0;display:flex;flex-direction:column;min-height:0}

/* manuscript */
.opt .ms{overflow:auto;background:var(--wash);flex:1}
.opt .page{max-width:720px;margin:0 auto;padding:30px 36px 0}
.opt .phead .series{font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:var(--blue);font-weight:600;margin-bottom:10px}
.opt .phead h2{font-family:'Playfair Display',Georgia,serif;font-weight:600;font-size:30px;line-height:1.1;color:var(--ink-deep);margin-bottom:9px;letter-spacing:-.01em}
.opt .phead .sub{font-family:'EB Garamond',Georgia,serif;font-style:italic;font-size:17px;color:var(--muted);line-height:1.4}
.opt .ornt{display:flex;align-items:center;justify-content:center;gap:10px;margin:22px 0;color:var(--gold)}
.opt .ornt::before,.opt .ornt::after{content:"";height:1px;width:90px;background:var(--rule)}
.opt .entry{position:relative;margin-bottom:30px;scroll-margin-top:20px}
.opt .ehead{display:flex;align-items:center;gap:10px;margin-bottom:9px}
.opt .av{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:12px;flex:0 0 auto}
.opt .av.elle{background:rgba(184,137,58,.16);color:var(--gold);border:1px solid rgba(184,137,58,.4)}
.opt .av.reader{background:rgba(46,90,172,.12);color:var(--blue);border:1px solid rgba(46,90,172,.35)}
.opt .who{font-weight:600;font-size:13px;color:var(--ink-deep)}
.opt .num{font-family:'DM Mono',monospace;font-size:10px;color:var(--soft)}
.opt .date{font-size:11px;color:var(--muted)}
.opt .kchip{margin-left:auto;font-family:'DM Mono',monospace;font-size:10.5px;color:var(--ink);background:var(--cream);border:1px solid var(--rule);border-radius:5px;padding:2px 8px;cursor:pointer}
.opt .kchip b{color:var(--gold);font-weight:500}
.opt .prose{font-family:'EB Garamond',Georgia,serif;font-size:18px;line-height:1.62;color:#2a2f3a;padding-left:36px}
.opt .entry.off .prose{color:#7d7565}
.opt .offstamp{margin-left:36px;display:inline-flex;gap:7px;font-size:9.5px;letter-spacing:.13em;text-transform:uppercase;color:#8A6A4B;border:1px dashed rgba(138,106,75,.5);border-radius:4px;padding:3px 9px;margin-bottom:9px}
.opt .pq{margin:11px 0 0 36px;padding:6px 0 6px 16px;border-left:3px solid var(--gold);font-family:'EB Garamond',Georgia,serif;font-style:italic;font-size:15px;color:var(--muted);line-height:1.45}
.opt .pq .ml{font-family:'DM Sans';font-style:normal;font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--soft);margin-bottom:3px}
.opt .empty{padding:50px 36px;text-align:center;color:var(--muted);font-family:'EB Garamond',Georgia,serif;font-style:italic;font-size:15px;line-height:1.6}
.opt .compose{position:sticky;bottom:0;background:linear-gradient(180deg,rgba(251,249,243,0),var(--wash) 24%);padding:16px 36px 20px}
.opt .compose-in{max-width:720px;margin:0 auto;background:var(--paper);border:1px solid var(--rule);border-radius:12px;padding:11px;box-shadow:0 12px 32px -22px rgba(19,32,59,.4)}
.opt .compose textarea{width:100%;border:0;outline:0;resize:vertical;min-height:48px;font-family:'EB Garamond',Georgia,serif;font-size:16px;line-height:1.5;color:#2a2f3a;background:transparent}
.opt .compose textarea::placeholder{color:var(--soft);font-style:italic}
.opt .crow{display:flex;align-items:center;gap:8px;margin-top:8px;border-top:1px solid var(--rule-soft);padding-top:9px}
.opt .ortog{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);cursor:pointer;user-select:none}
.opt .ortog input{accent-color:var(--gold)}
.opt .cbtns{margin-left:auto;display:flex;gap:8px}
.opt .btn{font-family:'DM Sans';font-size:12px;font-weight:600;border-radius:8px;padding:7px 14px;cursor:pointer;border:1px solid transparent}
.opt .btn.ghost{background:transparent;border-color:var(--rule);color:var(--ink)}
.opt .btn.ghost:hover{border-color:var(--gold);color:var(--gold)}
.opt .btn.solid{background:var(--ink-deep);color:#fff}
.opt .btn:disabled{opacity:.5;cursor:default}

/* phase */
.opt .well{margin:16px 18px 0;background:radial-gradient(120% 120% at 30% 18%,#1E3052,#13203B 72%);border:1px solid rgba(233,225,209,.13);border-radius:12px;padding:8px 6px 4px}
.opt .plot{height:340px}
.opt .ptabs{display:flex;gap:2px;padding:12px 18px 0;border-bottom:1px solid var(--rule);flex-wrap:wrap}
.opt .ptabs button{font-size:11.5px;color:var(--muted);background:transparent;border:0;border-bottom:2px solid transparent;padding:8px 10px;cursor:pointer}
.opt .ptabs button.on{color:var(--ink-deep);border-bottom-color:var(--gold);font-weight:600}
.opt .pbody{overflow:auto;padding:16px 22px;flex:1;min-height:0}
.opt .pbody h3{font-family:'Playfair Display',Georgia,serif;font-size:16px;color:var(--ink-deep);margin:0 0 9px}
.opt .pbody p{font-family:'EB Garamond',Georgia,serif;font-size:15px;line-height:1.55;color:#3a3f4a;margin:0 0 11px;max-width:680px}
.opt .formula{font-family:'DM Mono',monospace;font-size:12.5px;background:var(--cream);border:1px solid var(--rule);border-radius:7px;padding:11px 13px;margin:0 0 12px;color:var(--ink-deep);line-height:1.7;white-space:pre-wrap;max-width:680px}
.opt .formula .c{color:var(--muted)} .opt .formula .g{color:var(--gold)}
.opt .mrow{display:flex;justify-content:space-between;align-items:baseline;padding:7px 0;border-bottom:1px solid var(--rule-soft);font-size:13px;max-width:520px}
.opt .mrow .k{color:var(--muted)} .opt .mrow .v{font-family:'DM Mono',monospace;font-size:12px;color:var(--ink-deep)}
.opt .mrow .v b{color:var(--gold);font-weight:500}
.opt .note{font-size:11.5px;color:var(--muted);line-height:1.5;border-top:1px solid var(--rule-soft);padding-top:10px;max-width:680px;margin-top:4px}
.opt .stub{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#9a5b3a;background:rgba(154,91,58,.1);border-radius:3px;padding:1px 6px;margin-left:6px}

/* ask */
.opt .ask{display:flex;flex-direction:column;height:100%;background:var(--wash)}
.opt .ask-h{padding:16px 22px 10px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--rule)}
.opt .ask-h .spark{width:24px;height:24px;border-radius:7px;background:rgba(184,137,58,.14);display:flex;align-items:center;justify-content:center;color:var(--gold);font-size:13px}
.opt .ask-h .t{font-weight:600;font-size:13.5px;color:var(--ink-deep)}
.opt .ask-h .s{font-size:11px;color:var(--soft)}
.opt .cbox{flex:1;overflow:auto;padding:14px 22px;display:flex;flex-direction:column;gap:11px}
.opt .am{display:flex;gap:9px;align-items:flex-start;max-width:760px}
.opt .am.user{align-self:flex-end;flex-direction:row-reverse}
.opt .am .b{font-family:'EB Garamond',Georgia,serif;font-size:15px;line-height:1.5;padding:9px 13px;border-radius:12px;white-space:pre-wrap}
.opt .am.assistant .b{background:var(--paper);border:1px solid var(--rule);color:#2a2f3a;border-top-left-radius:3px}
.opt .am.user .b{background:var(--ink-deep);color:#F4EEE1;border-top-right-radius:3px}
.opt .am.pending .b{opacity:.55;font-style:italic}
.opt .am .mav{width:24px;height:24px;border-radius:50%;flex:0 0 auto;display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:10px}
.opt .am.assistant .mav{background:rgba(184,137,58,.16);color:var(--gold)}
.opt .am.user .mav{background:rgba(46,90,172,.14);color:var(--blue)}
.opt .sugg{padding:6px 22px;display:flex;flex-wrap:wrap;gap:7px}
.opt .sugg button{font-size:11px;color:var(--blue);border:1px solid rgba(46,90,172,.3);background:transparent;border-radius:999px;padding:5px 11px;cursor:pointer}
.opt .arow{display:flex;gap:8px;padding:10px 22px 16px}
.opt .arow input{flex:1;font-size:14px;border:1px solid var(--rule);border-radius:9px;padding:10px 13px;background:var(--paper);color:var(--ink);outline:none;font-family:'DM Sans'}
.opt .arow input:focus{border-color:var(--gold)}
.opt .arow button{padding:0 18px;border:0;border-radius:9px;background:var(--gold);color:#fff;cursor:pointer;font-size:13px;font-weight:600}
`

type Entry = { id: string; role: string; content: string; off_record: number; kappa: number; kappa_ts: number; reserve: number; velocity: number; accel: number }
type Marg = { id: string; entry_id: string; note: string }
type Thread = { id: string; title: string; anchor_topic?: string; updated_at: number }
type Msg = { role: 'user' | 'assistant'; content: string; pending?: boolean }
type Screen = 'manuscript' | 'phase' | 'ask'
type PTab = 'meta' | 'deriv' | 'coh' | 'dom' | 'sup'

export default function OptimusPanel({ worker }: any) {
  const [threads, setThreads] = useState<Thread[]>([])
  const [cur, setCur] = useState('')
  const [entries, setEntries] = useState<Entry[]>([])
  const [marg, setMarg] = useState<Marg[]>([])
  const [sel, setSel] = useState<number | null>(null)
  const [screen, setScreen] = useState<Screen>('manuscript')
  const [ptab, setPtab] = useState<PTab>('meta')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [ask, setAsk] = useState('')
  const [compose, setCompose] = useState('')
  const [offNext, setOffNext] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [plotReady, setPlotReady] = useState(false)
  const plotEl = useRef<HTMLDivElement>(null)

  const api = (op: string, body: any = {}) => fetch(worker.url + '/api/optimus-journal', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
    body: JSON.stringify({ op, ...body }),
  }).then(r => r.json())

  const loadThread = useCallback(async (id: string) => {
    if (!id) return
    try {
      const d = await api('thread', { thread_id: id })
      if (d.error) { setNote(d.error); return }
      const es: Entry[] = (d.entries || []).slice().sort((a: Entry, b: Entry) => a.kappa_ts - b.kappa_ts)
      setEntries(es); setMarg(d.marginalia || []); setSel(es.length ? es.length - 1 : null); setNote('')
    } catch (e: any) { setNote('Could not load thread: ' + (e.message || e)) }
  }, [worker])

  useEffect(() => {
    if ((window as any).Plotly) setPlotReady(true)
    else { const s = document.createElement('script'); s.src = PLOTLY; s.onload = () => setPlotReady(true); document.body.appendChild(s) }
    api('list').then(d => {
      const ts: Thread[] = d.threads || []
      setThreads(ts)
      if (ts.length) setCur(ts[0].id)
      else setNote('No journal threads yet. Fire the optimus cron (job:"optimus") or post a reader entry below, then reopen.')
    }).catch(e => setNote('Could not load journal: ' + (e.message || e)))
  }, [])

  useEffect(() => { if (cur) loadThread(cur) }, [cur, loadThread])

  useEffect(() => {
    const P = (window as any).Plotly
    if (screen !== 'phase' || !plotReady || !P || !plotEl.current || !entries.length) return
    const ax = (t: string) => ({ title: { text: t, font: { family: 'DM Mono', size: 10, color: '#C9C3B5' } }, gridcolor: 'rgba(233,225,209,.14)', zerolinecolor: 'rgba(233,225,209,.32)', tickfont: { family: 'DM Mono', size: 9, color: '#A9A395' }, backgroundcolor: 'rgba(255,255,255,.02)', showbackground: true })
    P.react(plotEl.current, [{
      type: 'scatter3d', mode: 'lines+markers',
      x: entries.map(e => e.kappa), y: entries.map(e => e.velocity * 86400), z: entries.map(e => e.accel * 86400 * 86400),
      text: entries.map(e => `${e.role === 'elle' ? 'Elle' : 'Reader'} · ${fmt(e.kappa_ts)}<br>κ ${e.kappa.toFixed(4)}<br>∫κdt ${sci(e.reserve)}<br>dκ/dt ${sci(e.velocity)} /s`),
      hoverinfo: 'text', line: { color: '#E8C77A', width: 4 },
      marker: { size: 6, color: entries.map(e => e.reserve), colorscale: [[0, '#5B8BC9'], [1, '#E8C77A']], showscale: true, colorbar: { title: { text: '∫κdt', font: { size: 10, color: '#C9C3B5' } }, thickness: 8, len: 0.6, x: 1.02, tickfont: { size: 9, color: '#C9C3B5' } }, line: { color: '#13203B', width: 1 } },
    }], {
      margin: { l: 0, r: 0, t: 6, b: 0 }, paper_bgcolor: 'rgba(0,0,0,0)',
      scene: { xaxis: ax('κ  coherence'), yaxis: ax('dκ/dt  /day'), zaxis: ax('d²κ/dt²  /day²'), camera: { eye: { x: 1.5, y: 1.45, z: 0.95 } }, aspectmode: 'cube' },
      font: { family: 'DM Sans', color: '#C9C3B5' }, showlegend: false,
    }, { displayModeBar: false, responsive: true })
  }, [screen, plotReady, entries])

  const post = async () => {
    const txt = compose.trim(); if (!txt || busy || !cur) return
    setBusy(true)
    try { await api('write', { role: 'reader', thread_id: cur, content: txt, off_record: offNext }); setCompose(''); setOffNext(false); await loadThread(cur) }
    catch (e: any) { setNote('post failed: ' + (e.message || e)) } finally { setBusy(false) }
  }
  const invite = async () => {
    if (busy || !cur) return
    setBusy(true)
    try { const d = await api('respond', { thread_id: cur }); if (d.error) setNote(d.error); await loadThread(cur) }
    catch (e: any) { setNote('respond failed: ' + (e.message || e)) } finally { setBusy(false) }
  }

  const sendAsk = async () => {
    const q = ask.trim(); if (!q) return
    setAsk('')
    const e = sel != null ? entries[sel] : null
    const ctx = e ? `(Context — selected entry: ${e.role}, κ=${e.kappa.toFixed(4)}, ∫κdt=${sci(e.reserve)}, dκ/dt=${sci(e.velocity)}/s.) ` : ''
    setMsgs(m => [...m, { role: 'user', content: q }, { role: 'assistant', content: 'thinking…', pending: true }])
    try {
      const d = await fetch(worker.url + '/api/elle-router', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ q: ctx + 'Question about the Optimus coherence instrumentation: ' + q }),
      }).then(r => r.json())
      setMsgs(m => m.filter(x => !x.pending).concat({ role: 'assistant', content: d.answer || '(no answer)' }))
    } catch (err: any) { setMsgs(m => m.filter(x => !x.pending).concat({ role: 'assistant', content: 'Request failed: ' + (err.message || err) })) }
  }

  const thread = threads.find(t => t.id === cur)
  const isCanvas = thread?.anchor_topic === 'elle-canvas'
  const e = sel != null ? entries[sel] : entries[entries.length - 1]
  const prev = sel != null && sel > 0 ? entries[sel - 1] : null
  const last = entries[entries.length - 1]
  const SUGG = ['What does coherence-convergence mean?', 'Why is κ "structure only" for now?', 'How does this map to disease?']
  const NAV: [Screen, string, string][] = [['manuscript', '❡', 'Manuscript'], ['phase', '◳', 'Phase'], ['ask', '✦', 'Ask Elle']]

  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <style>{STYLE}</style>
      <div className="opt">
        {/* side header */}
        <div className="side">
          <div className="brand">
            <svg width="24" height="24" viewBox="0 0 34 34" fill="none">
              <ellipse cx="17" cy="17" rx="15" ry="15" stroke="#B8893A" strokeWidth="1.2" />
              <ellipse cx="17" cy="17" rx="15" ry="6" stroke="#2A3D63" strokeWidth="1" opacity=".7" />
              <circle cx="17" cy="17" r="2.3" fill="#B8893A" />
            </svg>
            <span className="nm">Optimus</span>
          </div>
          <div className="snav">
            {NAV.map(([s, ic, lbl]) => (
              <button key={s} className={screen === s ? 'on' : ''} onClick={() => setScreen(s)}>
                <span className="ic">{ic}</span>{lbl}
              </button>
            ))}
          </div>
          <div className="thsel">
            <div className="lbl">Manuscript</div>
            <select value={cur} onChange={ev => { setCur(ev.target.value); setSel(null) }}>
              {threads.length === 0 && <option>—</option>}
              {threads.map(t => <option key={t.id} value={t.id}>{t.title || '(untitled)'}</option>)}
            </select>
          </div>
          <div className="sfoot"><div className="st"><span className="dot" />elle · deepintel</div></div>
        </div>

        {/* main */}
        <div className="main">
          {/* MANUSCRIPT */}
          {screen === 'manuscript' && (
            <div className="screen">
              <div className="ms">
                {note && <div className="empty">{note}</div>}
                {!note && thread && (
                  <div className="page">
                    <div className="phead">
                      <div className="series">Optimus correspondence · {thread.anchor_topic || 'thread'}</div>
                      <h2>{isCanvas ? 'A Manuscript in Two Voices' : thread.title}</h2>
                      <div className="sub">{isCanvas ? "written between Elle and her reader — she answers, or doesn't, as the coherence finds its level" : 'manuscript · she reads only the on-record entries'}</div>
                    </div>
                    <div className="ornt" />
                    {entries.map((en, i) => {
                      const notes = marg.filter(m => m.entry_id === en.id)
                      return (
                        <div key={en.id} className={'entry ' + en.role + (en.off_record ? ' off' : '')} id={'oe-' + i}>
                          <div className="ehead">
                            <div className={'av ' + en.role}>{en.role === 'elle' ? 'E' : 'R'}</div>
                            <span className="who">{en.role === 'elle' ? 'Elle' : 'Stewart'}</span>
                            <span className="num">№ {String(i + 1).padStart(2, '0')}</span>
                            <span className="date">{fmt(en.kappa_ts)}</span>
                            <span className="kchip" onClick={() => setSel(i)}>κ <b>{en.kappa.toFixed(3)}</b> · ∫ {sci(en.reserve)} · v {sci(en.velocity)}</span>
                          </div>
                          {!!en.off_record && <div className="offstamp">⊘ off-record · excluded from learner model</div>}
                          <div className="prose">{en.content}</div>
                          {notes.map(m => <div key={m.id} className="pq"><div className="ml">marginalia</div>{m.note}</div>)}
                        </div>
                      )
                    })}
                    {!entries.length && <div className="empty">No entries yet — write the first one below.</div>}
                  </div>
                )}
                {!note && (
                  <div className="compose">
                    <div className="compose-in">
                      <textarea value={compose} onChange={ev => setCompose(ev.target.value)} placeholder="Write to Elle…" />
                      <div className="crow">
                        <label className="ortog"><input type="checkbox" checked={offNext} onChange={ev => setOffNext(ev.target.checked)} /> off-record (she won't read it)</label>
                        <div className="cbtns">
                          <button className="btn ghost" onClick={invite} disabled={busy || !cur}>{busy ? '…' : 'Invite Elle to respond'}</button>
                          <button className="btn solid" onClick={post} disabled={busy || !compose.trim()}>Post entry</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PHASE */}
          {screen === 'phase' && (
            <div className="screen">
              <div className="well"><div className="plot" ref={plotEl} /></div>
              <div className="ptabs">
                {([['meta', 'Metadata'], ['deriv', 'Derivation'], ['coh', 'Coherence'], ['dom', 'Domains'], ['sup', 'Superposition']] as [PTab, string][]).map(([k, lbl]) => (
                  <button key={k} className={ptab === k ? 'on' : ''} onClick={() => setPtab(k)}>{lbl}</button>
                ))}
              </div>
              <div className="pbody">
                {ptab === 'meta' && (last ? (
                  <div>
                    <h3>Phase metadata · {thread?.title}</h3>
                    <div className="mrow"><span className="k">Entries</span><span className="v">{entries.length} · {entries.filter(x => x.role === 'elle').length} hers</span></div>
                    <div className="mrow"><span className="k">Span</span><span className="v">{fmt(entries[0].kappa_ts)} – {fmt(last.kappa_ts)}</span></div>
                    <div className="mrow"><span className="k">κ now</span><span className="v"><b>{last.kappa.toFixed(4)}</b></span></div>
                    <div className="mrow"><span className="k">∫κ dt (reserve)</span><span className="v">{sci(last.reserve)}</span></div>
                    <div className="mrow"><span className="k">dκ/dt (velocity)</span><span className="v">{sci(last.velocity)} /s</span></div>
                    <div className="mrow"><span className="k">d²κ/dt² (accel)</span><span className="v">{sci(last.accel)} /s²</span></div>
                    <div className="mrow"><span className="k">off-record</span><span className="v">{entries.filter(x => !!x.off_record).length}</span></div>
                    <div className="note">κ is worker-computed and stored for <b>structure only</b>; nothing ranks on it until validate_kappa passes.</div>
                  </div>
                ) : <p>No entries yet.</p>)}
                {ptab === 'deriv' && (
                  <div>
                    <h3>Derivation {e ? `· ${e.role === 'elle' ? 'Elle' : 'Reader'}, ${fmt(e.kappa_ts)}` : ''}</h3>
                    <p>κ is worker-computed<span className="stub">stub · pre-validation</span>; the phase state derives from the trajectory. Every value is read from the database.</p>
                    {e && prev ? (
                      <div className="formula"><span className="c">dt = (t − t₋₁)/1000 =</span> <span className="g">{Math.max(1, Math.round((e.kappa_ts - prev.kappa_ts) / 1000)).toLocaleString()}</span> s
<span className="c">∫κdt += (κ₋₁+κ)/2 · dt</span> = {prev.reserve.toFixed(4)} + ({prev.kappa.toFixed(3)}+{e.kappa.toFixed(3)})/2 · dt = <span className="g">{sci(e.reserve)}</span>
<span className="c">dκ/dt = (κ − κ₋₁)/dt</span> = <span className="g">{sci(e.velocity)}</span> /s
<span className="c">d²κ/dt² = (v − v₋₁)/dt</span> = <span className="g">{sci(e.accel)}</span> /s²</div>
                    ) : <div className="formula"><span className="c">first entry — no prior sample</span>
∫κdt = 0 · dκ/dt = 0 · d²κ/dt² = 0</div>}
                    <div className="note">Click any entry's κ chip in the manuscript to derive it here.</div>
                  </div>
                )}
                {ptab === 'coh' && (
                  <div>
                    <h3>The coherence function</h3>
                    <p>κ(T,t) is instantaneous coherence of a thought T at time t. The journal stores raw κ + timestamp and derives the rest, so each entry is a sample on a trajectory.</p>
                    <div className="formula"><span className="g">κ(T,t)</span>  <span className="c">instantaneous coherence ∈ [0,1]</span>
<span className="g">∫κ dt</span>   <span className="c">coherence reserve · trapezoid</span>
<span className="g">dκ/dt</span>   <span className="c">coherence velocity</span>
<span className="g">d²κ/dt²</span> <span className="c">coherence acceleration</span></div>
                    <p>Together they are a phase-space portrait: position is how coherent you are now, velocity whether it is rising or eroding, acceleration whether the change itself is accelerating.</p>
                  </div>
                )}
                {ptab === 'dom' && (
                  <div>
                    <h3>One operator, many fields</h3>
                    <p>κ does not know what T is. Swap the field and the same calculus reads a different system.</p>
                    <p><b>Reasoning</b> — grounding vs hedging; whether specificity was earned.<br /><b>Disease</b> — Alzheimer's, addiction, cancer as accumulated phase-state failure; reserve is the memory of the drift.<br /><b>Education</b> — mastery is sustained velocity without collapse.<br /><b>Markets</b> — coherence of a thesis under price pressure, measured not felt.</p>
                  </div>
                )}
                {ptab === 'sup' && (
                  <div>
                    <h3>What it maps in superposition</h3>
                    <p>A thought held open is a superposed state; the trajectory is that state evolving. The snapshot is an interval in which the superposition was kept alive and watched.</p>
                    <div className="formula"><span className="g">coherence-convergence</span> <span className="c">→ target</span>
<span style={{ color: '#9a5b3a' }}>agreement-convergence</span> <span className="c">→ alarm</span></div>
                    <p>Exit condition: agreeing with an external Opus observer more than 90% of the time is a failure signal. A day she sets the reader aside and writes elsewhere is the axis working.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ASK */}
          {screen === 'ask' && (
            <div className="screen">
              <div className="ask">
                <div className="ask-h"><span className="spark">✦</span><div><div className="t">Ask Elle <span className="s">· DeepIntel</span></div><div className="s">your research partner — routes through her own tools (/api/elle-router)</div></div></div>
                <div className="cbox">
                  {msgs.length === 0 && <div className="am assistant"><div className="mav">E</div><div className="b">I'm Elle. Ask about the coherence function, what a value implies, or how it maps to another domain.</div></div>}
                  {msgs.map((m, i) => <div key={i} className={'am ' + m.role + (m.pending ? ' pending' : '')}><div className="mav">{m.role === 'user' ? 'R' : 'E'}</div><div className="b">{m.content}</div></div>)}
                </div>
                {msgs.length === 0 && <div className="sugg">{SUGG.map(s => <button key={s} onClick={() => { setAsk(s); setTimeout(sendAsk, 0) }}>{s}</button>)}</div>}
                <div className="arow">
                  <input value={ask} onChange={ev => setAsk(ev.target.value)} onKeyDown={ev => { if (ev.key === 'Enter') sendAsk() }} placeholder="Ask about the coherence function…" />
                  <button onClick={sendAsk}>Ask</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
