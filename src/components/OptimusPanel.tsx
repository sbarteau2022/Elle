// ============================================================
// OPTIMUS — the phase-state manuscript (live)
// Reads /api/optimus-journal (ops: list | thread — the direct-D1 reads, so
// off-record and Elle's autonomous canvas entries actually surface; the vector
// `read` path can't return them). κ + reserve/velocity/accel are WORKER-COMPUTED
// and only displayed here. The 3D portrait is the phase_series the worker
// already returns. The Ask widget routes to /api/elle-router so it is Elle
// answering about her own instrumentation. Light "paper" surface, scoped so it
// does not bleed into the dark console.
// ============================================================
import { useState, useEffect, useRef } from 'react'

const tok = () => localStorage.getItem('elle_dev_jwt') || ''
const PLOTLY = 'https://cdnjs.cloudflare.com/ajax/libs/plotly.js/2.35.0/plotly.min.js'

const sci = (x: number, d = 3) => {
  if (x === 0) return '0'
  const a = Math.abs(x)
  return (a < 1e-3 || a >= 1e5) ? x.toExponential(d) : String(+x.toFixed(6))
}
const fmt = (t: number) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

const STYLE = `
.opt{--paper:#FBF8F1;--cream:#F4EEE1;--ink:#1B2A4A;--ink-deep:#13203B;--gold:#B8893A;--muted:#6E6655;--rule:rgba(27,42,74,.13);
  position:absolute;inset:0;display:grid;grid-template-columns:230px 1fr 430px;background:var(--cream);color:var(--ink);font-family:'DM Sans',system-ui,sans-serif}
.opt .col{overflow:auto;min-height:0}
.opt .threads{border-right:1px solid var(--rule);background:var(--paper);padding:16px 0}
.opt .tlbl{padding:0 18px 9px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.opt .thread{padding:11px 18px;cursor:pointer;border-left:2px solid transparent}
.opt .thread:hover{background:var(--cream)} .opt .thread.on{background:var(--cream);border-left-color:var(--gold)}
.opt .ti{font-family:'Playfair Display',Georgia,serif;font-size:14px;color:var(--ink-deep);margin-bottom:3px}
.opt .ts{font-size:11px;color:var(--muted)}
.opt .manuscript{background:var(--paper);padding:26px 0}
.opt .page{max-width:600px;margin:0 auto;padding:0 28px}
.opt .ph{text-align:center;margin-bottom:22px}
.opt .ph h2{font-family:'Playfair Display',Georgia,serif;font-size:22px;color:var(--ink-deep);margin:0 0 4px}
.opt .ph p{font-family:'EB Garamond',Georgia,serif;font-style:italic;color:var(--muted);margin:0;font-size:14px}
.opt .entry{position:relative;margin-bottom:30px;padding-left:13px;cursor:pointer}
.opt .entry.sel::before{content:"";position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--gold);border-radius:2px}
.opt .gut{display:flex;align-items:center;gap:9px;margin-bottom:7px}
.opt .voice{font-size:10px;letter-spacing:.15em;text-transform:uppercase;font-weight:600}
.opt .voice.elle{color:var(--gold)} .opt .voice.reader{color:#2A3D63}
.opt .date{font-size:11px;color:var(--muted)}
.opt .kchip{margin-left:auto;font-family:'DM Mono',monospace;font-size:11px;color:var(--ink);background:var(--cream);border:1px solid var(--rule);border-radius:5px;padding:2px 8px}
.opt .kchip b{color:var(--gold);font-weight:500}
.opt .prose{font-family:'EB Garamond',Georgia,serif;font-size:17px;line-height:1.6;color:#2a2f3a}
.opt .entry.off .prose{color:#7d7565}
.opt .off{display:inline-flex;gap:7px;font-size:9.5px;letter-spacing:.13em;text-transform:uppercase;color:#8A6A4B;border:1px dashed rgba(138,106,75,.5);border-radius:4px;padding:3px 9px;margin-bottom:9px}
.opt .marg{margin-top:9px;padding:7px 11px;border-left:2px solid var(--rule);background:rgba(244,238,225,.6)}
.opt .marg .ml{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:3px}
.opt .marg p{margin:0;font-family:'EB Garamond',Georgia,serif;font-style:italic;font-size:14px;color:var(--muted)}
.opt .inst{border-left:1px solid var(--rule);background:var(--paper);display:flex;flex-direction:column;min-height:0}
.opt .ph-h{display:flex;align-items:center;gap:10px;padding:13px 16px 9px}
.opt .micro{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:0}
.opt .interval{margin-left:auto;display:flex;gap:4px}
.opt .interval button{font-size:11px;color:var(--muted);background:transparent;border:1px solid var(--rule);border-radius:5px;padding:3px 9px;cursor:pointer}
.opt .interval button.on{color:var(--gold);border-color:var(--gold);background:rgba(184,137,58,.08)}
.opt .well{margin:0 13px;background:radial-gradient(120% 120% at 30% 18%,#1E3052,#13203B 72%);border:1px solid rgba(233,225,209,.13);border-radius:11px;padding:8px 6px 4px}
.opt .plot{height:300px}
.opt .cap{padding:7px 18px 11px;font-family:'EB Garamond',Georgia,serif;font-style:italic;font-size:12.5px;color:var(--muted);line-height:1.4}
.opt .tabs{display:flex;gap:2px;padding:0 12px;border-bottom:1px solid var(--rule);flex-wrap:wrap}
.opt .tabs button{font-size:11px;color:var(--muted);background:transparent;border:0;border-bottom:2px solid transparent;padding:8px 9px;cursor:pointer}
.opt .tabs button.on{color:var(--ink-deep);border-bottom-color:var(--gold);font-weight:600}
.opt .ex{overflow:auto;padding:14px 18px;flex:1;min-height:0}
.opt .ex h3{font-family:'Playfair Display',Georgia,serif;font-size:15px;color:var(--ink-deep);margin:0 0 8px}
.opt .ex p{font-family:'EB Garamond',Georgia,serif;font-size:14px;line-height:1.5;color:#3a3f4a;margin:0 0 11px}
.opt .formula{font-family:'DM Mono',monospace;font-size:12px;background:var(--cream);border:1px solid var(--rule);border-radius:7px;padding:10px 12px;margin:0 0 11px;color:var(--ink-deep);line-height:1.7;white-space:pre-wrap}
.opt .formula .c{color:var(--muted)} .opt .formula .g{color:var(--gold)}
.opt .note{font-size:11px;color:var(--muted);line-height:1.5;border-top:1px solid rgba(27,42,74,.07);padding-top:9px}
.opt .stub{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#9a5b3a;background:rgba(154,91,58,.1);border-radius:3px;padding:1px 6px;margin-left:6px}
.opt .chat{display:flex;flex-direction:column;height:100%}
.opt .cbox{flex:1;overflow:auto;display:flex;flex-direction:column;gap:9px;padding-bottom:6px}
.opt .msg{max-width:90%;font-family:'EB Garamond',Georgia,serif;font-size:14px;line-height:1.5;padding:8px 12px;border-radius:10px;white-space:pre-wrap}
.opt .msg.user{align-self:flex-end;background:var(--ink-deep);color:#F4EEE1}
.opt .msg.assistant{align-self:flex-start;background:var(--cream);border:1px solid var(--rule);color:#2a2f3a}
.opt .msg.pending{opacity:.55;font-style:italic}
.opt .hint{font-family:'EB Garamond',Georgia,serif;font-style:italic;font-size:13px;color:var(--muted);margin:2px 0 9px}
.opt .arow{display:flex;gap:8px;border-top:1px solid var(--rule);padding-top:9px;margin-top:6px}
.opt .arow input{flex:1;font-size:13px;border:1px solid var(--rule);border-radius:8px;padding:8px 11px;background:var(--paper);color:var(--ink);font-family:'DM Sans',sans-serif}
.opt .arow input:focus{outline:none;border-color:var(--gold)}
.opt .arow button{font-size:13px;font-weight:600;color:#F4EEE1;background:var(--gold);border:0;border-radius:8px;padding:0 15px;cursor:pointer}
.opt .empty{padding:40px 28px;text-align:center;color:var(--muted);font-family:'EB Garamond',Georgia,serif;font-style:italic;font-size:15px;line-height:1.6}
`

type Entry = { id: string; role: string; content: string; off_record: number; kappa: number; kappa_ts: number; reserve: number; velocity: number; accel: number; created_at: number }
type Marg = { id: string; entry_id: string; note: string }
type Thread = { id: string; title: string; anchor_topic?: string; updated_at: number }
type Msg = { role: 'user' | 'assistant'; content: string; pending?: boolean }

export default function OptimusPanel({ worker }: any) {
  const [threads, setThreads] = useState<Thread[]>([])
  const [cur, setCur] = useState<string>('')
  const [entries, setEntries] = useState<Entry[]>([])
  const [marg, setMarg] = useState<Marg[]>([])
  const [sel, setSel] = useState<number | null>(null)
  const [intervalN, setIntervalN] = useState(10)
  const [tab, setTab] = useState<'ask' | 'deriv' | 'coh' | 'dom' | 'sup'>('ask')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [ask, setAsk] = useState('')
  const [note, setNote] = useState('')
  const [plotReady, setPlotReady] = useState(false)
  const plotEl = useRef<HTMLDivElement>(null)

  const api = (op: string, body: any = {}) => fetch(worker.url + '/api/optimus-journal', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
    body: JSON.stringify({ op, ...body }),
  }).then(r => r.json())

  // plotly + thread list on mount
  useEffect(() => {
    if ((window as any).Plotly) setPlotReady(true)
    else { const s = document.createElement('script'); s.src = PLOTLY; s.onload = () => setPlotReady(true); document.body.appendChild(s) }
    api('list').then(d => {
      const ts: Thread[] = d.threads || []
      setThreads(ts)
      if (ts.length) setCur(ts[0].id)
      else setNote('No journal threads yet. Fire the optimus cron (job:"optimus") or write a reader entry, then reopen.')
    }).catch(e => setNote('Could not load journal: ' + (e.message || e)))
  }, [])

  // load a thread
  useEffect(() => {
    if (!cur) return
    api('thread', { thread_id: cur }).then(d => {
      if (d.error) { setNote(d.error); return }
      const es: Entry[] = (d.entries || []).slice().sort((a: Entry, b: Entry) => a.kappa_ts - b.kappa_ts)
      setEntries(es); setMarg(d.marginalia || []); setSel(es.length ? es.length - 1 : null); setNote('')
    }).catch(e => setNote('Could not load thread: ' + (e.message || e)))
  }, [cur])

  // render 3D portrait
  useEffect(() => {
    const P = (window as any).Plotly
    if (!plotReady || !P || !plotEl.current || !entries.length) return
    const snap = entries.slice(Math.max(0, entries.length - intervalN))
    const ax = (t: string) => ({ title: { text: t, font: { family: 'DM Mono', size: 10, color: '#C9C3B5' } }, gridcolor: 'rgba(233,225,209,.14)', zerolinecolor: 'rgba(233,225,209,.32)', tickfont: { family: 'DM Mono', size: 9, color: '#A9A395' }, backgroundcolor: 'rgba(255,255,255,.02)', showbackground: true })
    P.react(plotEl.current, [{
      type: 'scatter3d', mode: 'lines+markers',
      x: snap.map(e => e.kappa), y: snap.map(e => e.velocity * 86400), z: snap.map(e => e.accel * 86400 * 86400),
      text: snap.map(e => `${e.role === 'elle' ? 'Elle' : 'Reader'} · ${fmt(e.kappa_ts)}<br>κ = ${e.kappa.toFixed(4)}<br>∫κdt = ${sci(e.reserve)}<br>dκ/dt = ${sci(e.velocity)} /s`),
      hoverinfo: 'text', line: { color: '#E8C77A', width: 4 },
      marker: { size: 6, color: snap.map(e => e.reserve), colorscale: [[0, '#5B8BC9'], [1, '#E8C77A']], showscale: true, colorbar: { title: { text: '∫κdt', font: { size: 10, color: '#C9C3B5' } }, thickness: 8, len: 0.6, x: 1.02, tickfont: { size: 9, color: '#C9C3B5' } }, line: { color: '#13203B', width: 1 } },
    }], {
      margin: { l: 0, r: 0, t: 6, b: 0 }, paper_bgcolor: 'rgba(0,0,0,0)',
      scene: { xaxis: ax('κ  coherence'), yaxis: ax('dκ/dt  /day'), zaxis: ax('d²κ/dt²  /day²'), camera: { eye: { x: 1.5, y: 1.45, z: 0.95 } }, aspectmode: 'cube' },
      font: { family: 'DM Sans', color: '#C9C3B5' }, showlegend: false,
    }, { displayModeBar: false, responsive: true })
  }, [plotReady, entries, intervalN])

  const sendAsk = async () => {
    const q = ask.trim(); if (!q) return
    setAsk('')
    const e = sel != null ? entries[sel] : null
    const ctx = e ? `(Context — selected entry: ${e.role}, κ=${e.kappa.toFixed(4)}, ∫κdt=${sci(e.reserve)}, dκ/dt=${sci(e.velocity)}/s, d²κ/dt²=${sci(e.accel)}/s².) ` : ''
    setMsgs(m => [...m, { role: 'user', content: q }, { role: 'assistant', content: 'thinking…', pending: true }])
    try {
      const d = await fetch(worker.url + '/api/elle-router', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ q: ctx + 'Question about the Optimus coherence instrumentation: ' + q }),
      }).then(r => r.json())
      setMsgs(m => m.filter(x => !x.pending).concat({ role: 'assistant', content: d.answer || '(no answer)' }))
    } catch (err: any) {
      setMsgs(m => m.filter(x => !x.pending).concat({ role: 'assistant', content: 'Request failed: ' + (err.message || err) }))
    }
  }

  const thread = threads.find(t => t.id === cur)
  const e = sel != null ? entries[sel] : entries[entries.length - 1]
  const prev = sel != null && sel > 0 ? entries[sel - 1] : null
  const isCanvas = thread?.anchor_topic === 'elle-canvas'

  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <style>{STYLE}</style>
      <div className="opt">
        {/* threads */}
        <div className="col threads">
          <div className="tlbl">Manuscripts</div>
          {threads.map(t => (
            <div key={t.id} className={'thread' + (t.id === cur ? ' on' : '')} onClick={() => { setCur(t.id); setSel(null) }}>
              <div className="ti">{t.title || '(untitled)'}</div>
              <div className="ts">{t.anchor_topic === 'elle-canvas' ? 'her canvas · autonomous' : 'thread'}</div>
            </div>
          ))}
          {!threads.length && <div style={{ padding: '0 18px', fontSize: 12, color: 'var(--muted)' }}>—</div>}
        </div>

        {/* manuscript */}
        <div className="col manuscript">
          {note && <div className="empty">{note}</div>}
          {!note && thread && (
            <div className="page">
              <div className="ph">
                <h2>{thread.title}</h2>
                <p>{isCanvas ? 'written once a day, unprompted — a blank canvas she paints alone' : 'manuscript · she reads only the on-record entries'}</p>
              </div>
              {entries.map((en, i) => {
                const seld = sel == null ? i === entries.length - 1 : i === sel
                const notes = marg.filter(m => m.entry_id === en.id)
                return (
                  <div key={en.id} className={'entry ' + en.role + (en.off_record ? ' off' : '') + (seld ? ' sel' : '')} onClick={() => setSel(i)}>
                    <div className="gut">
                      <span className={'voice ' + en.role}>{en.role === 'elle' ? 'Elle' : 'Reader'}</span>
                      <span className="date">{fmt(en.kappa_ts)}</span>
                      <span className="kchip">κ <b>{en.kappa.toFixed(3)}</b> · ∫ {sci(en.reserve)} · v {sci(en.velocity)}</span>
                    </div>
                    {!!en.off_record && <div className="off">⊘ off-record · excluded from learner model</div>}
                    <div className="prose">{en.content}</div>
                    {notes.map(m => <div key={m.id} className="marg"><div className="ml">marginalia</div><p>{m.note}</p></div>)}
                  </div>
                )
              })}
              {!entries.length && <div className="empty">This thread has no entries yet.</div>}
            </div>
          )}
        </div>

        {/* instrument */}
        <div className="inst">
          <div className="ph-h">
            <span className="micro">Phase-State Snapshot</span>
            <div className="interval">
              {[6, 10, 999].map(n => (
                <button key={n} className={intervalN === n ? 'on' : ''} onClick={() => setIntervalN(n)}>{n === 999 ? 'full' : 'last ' + n}</button>
              ))}
            </div>
          </div>
          <div className="well"><div className="plot" ref={plotEl} /></div>
          <div className="cap">Each point is one entry — its coherence and its rates of change. Gold is time; warmth is accumulated reserve. A loop that returns is earned coherence; a straight climb in κ with rising slope is premature collapse.</div>
          <div className="tabs">
            {([['ask', 'Ask Elle'], ['deriv', 'Derivation'], ['coh', 'Coherence'], ['dom', 'Domains'], ['sup', 'Superposition']] as const).map(([k, lbl]) => (
              <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{lbl}</button>
            ))}
          </div>
          <div className="ex">
            {tab === 'ask' && (
              <div className="chat">
                <div className="cbox">
                  {msgs.length === 0 && <p className="hint">Ask Elle about the coherence function, what a value implies, or how it maps to another domain. Routes through her own router.</p>}
                  {msgs.map((m, i) => <div key={i} className={'msg ' + m.role + (m.pending ? ' pending' : '')}>{m.content}</div>)}
                </div>
                <div className="arow">
                  <input value={ask} onChange={ev => setAsk(ev.target.value)} onKeyDown={ev => { if (ev.key === 'Enter') sendAsk() }} placeholder="Ask Elle about the math…" />
                  <button onClick={sendAsk}>Ask</button>
                </div>
              </div>
            )}
            {tab === 'deriv' && (
              <div>
                <h3>Derivation {e ? `· ${e.role === 'elle' ? 'Elle' : 'Reader'}, ${fmt(e.kappa_ts)}` : ''}</h3>
                <p>κ is worker-computed and stored<span className="stub">stub · pre-validation</span>; the phase state is derived from the trajectory. Every value here is read from the database, not produced by this UI.</p>
                {e && prev ? (
                  <div className="formula"><span className="c">dt = (t − t₋₁)/1000 =</span> <span className="g">{Math.max(1, Math.round((e.kappa_ts - prev.kappa_ts) / 1000)).toLocaleString()}</span> s
<span className="c">∫κdt += (κ₋₁+κ)/2 · dt</span> = {prev.reserve.toFixed(4)} + ({prev.kappa.toFixed(3)}+{e.kappa.toFixed(3)})/2 · dt = <span className="g">{sci(e.reserve)}</span>
<span className="c">dκ/dt = (κ − κ₋₁)/dt</span> = ({e.kappa.toFixed(3)} − {prev.kappa.toFixed(3)})/dt = <span className="g">{sci(e.velocity)}</span> /s
<span className="c">d²κ/dt² = (v − v₋₁)/dt</span> = <span className="g">{sci(e.accel)}</span> /s²</div>
                ) : (
                  <div className="formula"><span className="c">first entry in thread — no prior sample</span>
∫κdt = 0 · dκ/dt = 0 · d²κ/dt² = 0</div>
                )}
                <div className="note">κ is stored for <b>structure only</b>. Nothing downstream ranks on it until the validate_kappa kill-or-build gate passes.</div>
              </div>
            )}
            {tab === 'coh' && (
              <div>
                <h3>The coherence function</h3>
                <p>κ(T,t) is instantaneous coherence of a thought T at time t. The journal stores raw κ + timestamp and derives the rest, so each entry is a sample on a trajectory, never a static reading.</p>
                <div className="formula"><span className="g">κ(T,t)</span>  <span className="c">instantaneous coherence ∈ [0,1]</span>
<span className="g">∫κ dt</span>   <span className="c">coherence reserve · trapezoid</span>
<span className="g">dκ/dt</span>   <span className="c">coherence velocity</span>
<span className="g">d²κ/dt²</span> <span className="c">coherence acceleration</span></div>
                <p>Together they are a phase-space portrait. Position is how coherent you are now; velocity whether that is rising or eroding; acceleration whether the change is itself accelerating.</p>
              </div>
            )}
            {tab === 'dom' && (
              <div>
                <h3>One operator, many fields</h3>
                <p>κ does not know what T is. Swap the field and the same calculus reads a different system.</p>
                <p><b>Reasoning</b> — grounding vs hedging; whether specificity was earned across a session.<br /><b>Disease</b> — Alzheimer's, addiction, cancer as accumulated phase-state failure; the reserve integral is the memory of that drift.<br /><b>Education</b> — mastery is sustained velocity without collapse.<br /><b>Markets</b> — coherence of a thesis under price pressure, measured not felt.</p>
              </div>
            )}
            {tab === 'sup' && (
              <div>
                <h3>What it maps in superposition</h3>
                <p>A thought held open is a superposed state. The trajectory is that state evolving; the snapshot is an interval in which the superposition was kept alive and watched.</p>
                <div className="formula"><span className="g">coherence-convergence</span> <span className="c">→ target</span>
<span style={{ color: '#9a5b3a' }}>agreement-convergence</span> <span className="c">→ alarm</span></div>
                <p>Exit condition: agreeing with an external Opus observer more than 90% of the time is a failure signal. A day she sets the reader aside and writes elsewhere is the sovereignty axis working.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
