// ============================================================
// CODE — Elle's coding cockpit
// The old panel was a form bolted to one endpoint (/api/elle-code-engine,
// pick an action, paste code, pray). This is a conversation with the same
// ends and more: every turn goes to /api/elle-router (full scope), where she
// can run_code in a real sandbox, run_shell, read any GitHub repo, search the
// corpus, and remember the thread (its own session, separate from the elle
// tab). Left: the conversation. Right: the working artifact — an editor she
// can fill (apply her fenced code) and you can hand back to her (attach).
// The old action buttons live on as one-tap prompt templates: same ends,
// spoken instead of submitted.
// ============================================================
import { useState, useRef, useEffect } from 'react'
import { Md } from '../lib/md'

const tok = () => localStorage.getItem('elle_dev_jwt') || ''

type Turn = { q: string; answer: string; trace: any[]; open: boolean; pending: boolean }

// The artifact heuristic: her answer may show fragments before the real thing —
// take the LARGEST fenced block as the working code.
function extractLargestCode(text: string): { code: string; lang: string } | null {
  const re = /```(\w+)?\n([\s\S]*?)```/g
  let best: { code: string; lang: string } | null = null
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const code = m[2].trimEnd()
    if (!best || code.length > best.code.length) best = { code, lang: m[1] || '' }
  }
  return best
}

const QUICK: [string, string][] = [
  ['debug', 'Debug this. Find what is actually wrong — run it in the sandbox if that settles it faster than reading — and give me the fixed version in one fenced block.'],
  ['refactor', 'Refactor this for clarity and tightness without changing behavior. Fixed version in one fenced block, then a short list of what you changed and why.'],
  ['explain', 'Explain what this code actually does — the load-bearing parts, the sharp edges, anything that would bite the next person.'],
  ['test it', 'Write tests for this, then RUN them in the sandbox and show me real pass/fail output — not tests you merely believe in.'],
  ['run it', 'Run this in the sandbox exactly as-is and report real stdout/stderr/exit code. If it fails, diagnose and hand back a fixed block.'],
  ['review', 'Review this like you mean it: correctness bugs first, then design smells. Be specific — line-level, not vibes.'],
]

export default function CodePanel({ worker, accent }: any) {
  const [q, setQ] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState('')
  const [code, setCode] = useState('')
  const [lang, setLang] = useState('typescript')
  const [attach, setAttach] = useState(true)
  const [history, setHistory] = useState<string[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  // A coding thread has its own memory, separate from the elle tab.
  const sid = () => {
    let s = localStorage.getItem('elle_code_session')
    if (!s) { s = crypto.randomUUID?.() || `c_${Date.now()}`; localStorage.setItem('elle_code_session', s) }
    return s
  }
  const newThread = () => {
    localStorage.setItem('elle_code_session', crypto.randomUUID?.() || `c_${Date.now()}`)
    setTurns([]); setNote('')
  }

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [turns])

  const ask = async (override?: string) => {
    const text = (override ?? q).trim()
    if (loading || !text) return
    setLoading(true); setNote(''); if (!override) setQ('')
    // Attach the working artifact so "fix this" always has a this.
    const question = attach && code.trim()
      ? `${text}\n\n\`\`\`${lang}\n${code}\n\`\`\``
      : text
    const idx = turns.length
    setTurns(t => [...t, { q: text, answer: '', trace: [], open: false, pending: true }])
    try {
      const r = await fetch(worker.url + '/api/elle-router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ q: question, session_id: sid() }),
      })
      const d = await r.json()
      if (!r.ok || d.error) setNote(d.error || `HTTP ${r.status}`)
      setTurns(t => t.map((x, i) => i === idx
        ? { ...x, answer: d.answer || '(no answer)', trace: d.trace || [], pending: false } : x))
    } catch (e: any) {
      setNote('Error: ' + (e.message || e))
      setTurns(t => t.map((x, i) => i === idx ? { ...x, answer: '(request failed)', pending: false } : x))
    } finally { setLoading(false) }
  }
  const toggle = (i: number) => setTurns(t => t.map((x, j) => j === i ? { ...x, open: !x.open } : x))

  const lastArtifact = (() => {
    for (let i = turns.length - 1; i >= 0; i--) {
      if (!turns[i].pending) {
        const a = extractLargestCode(turns[i].answer)
        if (a) return a
      }
    }
    return null
  })()

  const applyArtifact = () => {
    if (!lastArtifact) return
    setHistory(h => [...h, code])
    setCode(lastArtifact.code)
    if (lastArtifact.lang) setLang(lastArtifact.lang)
  }
  const undo = () => {
    const last = history[history.length - 1]
    if (last === undefined) return
    setCode(last); setHistory(h => h.slice(0, -1))
  }

  const chipStyle: React.CSSProperties = { background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 12, padding: '4px 10px', color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap' }

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

      {/* ── left: the conversation ── */}
      <div style={{ flex: 1.15, display: 'flex', flexDirection: 'column', minWidth: 0, borderRight: '0.5px solid var(--b1)' }}>
        <div style={{ padding: '8px 14px', borderBottom: '0.5px solid var(--b1)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {QUICK.map(([label, prompt]) => (
            <button key={label} onClick={() => ask(prompt)} disabled={loading || (!code.trim() && label !== 'review')} style={chipStyle}>{label}</button>
          ))}
          <button onClick={newThread} title="fresh thread — clears her memory of this one"
            style={{ ...chipStyle, marginLeft: 'auto' }}>↺ new thread</button>
        </div>
        {note && <div style={{ padding: '6px 14px', fontSize: 10.5, fontFamily: 'var(--mono)', color: '#e07070' }}>{note}</div>}
        <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {turns.length === 0 && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--t3)', fontFamily: 'var(--mono)', fontSize: 10.5, lineHeight: 2, padding: 20 }}>
              talk your way to working code —<br />
              she runs it in a real sandbox · reads any GitHub repo · remembers this thread<br />
              editor code rides along when “attach” is on
            </div>
          )}
          {turns.map((t, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: accent, letterSpacing: '.12em' }}>YOU</span>
                <span style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.55 }}>{t.q}</span>
              </div>
              <div style={{ borderLeft: `2px solid ${t.pending ? 'var(--b1)' : accent + '99'}`, paddingLeft: 14, fontSize: 12.5, color: 'var(--t1)', lineHeight: 1.7, opacity: t.pending ? 0.5 : 1 }}>
                {t.pending ? 'working…' : <Md text={t.answer} />}
              </div>
              {t.trace.length > 0 && (
                <div style={{ paddingLeft: 16 }}>
                  <button onClick={() => toggle(i)} style={{ background: 'none', border: 'none', color: 'var(--t4)', fontFamily: 'var(--mono)', fontSize: 9.5, cursor: 'pointer', padding: 0 }}>
                    {(t.open ? '▾' : '▸') + ' ' + t.trace.length + ' step' + (t.trace.length === 1 ? '' : 's') + ' · ' + t.trace.map((s: any) => s.tool).join(' → ')}
                  </button>
                  {t.open && t.trace.map((s: any, j: number) => (
                    <div key={j} style={{ marginTop: 6, paddingLeft: 10, borderLeft: '1px solid var(--b1)' }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: accent }}>{s.tool}<span style={{ color: 'var(--t4)' }}>{'  ' + JSON.stringify(s.args)}</span></div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, whiteSpace: 'pre-wrap', color: 'var(--t3)', lineHeight: 1.5, maxHeight: 160, overflowY: 'auto' }}>{String(s.result || '')}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderTop: '0.5px solid var(--b1)' }}>
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') ask() }}
            placeholder='e.g. "why does this throw on empty input — run it and see"'
            style={{ flex: 1, background: 'var(--raised)', border: '0.5px solid var(--b1)', borderRadius: 6, color: 'var(--t1)', padding: '9px 12px', fontSize: 12, fontFamily: 'var(--mono)', outline: 'none' }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--mono)', fontSize: 9.5, color: code.trim() && attach ? accent : 'var(--t4)', cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={attach} onChange={e => setAttach(e.target.checked)} style={{ accentColor: accent }} />attach
          </label>
          <button onClick={() => ask()} disabled={loading || !q.trim()}
            style={{ padding: '6px 14px', borderRadius: 5, border: `0.5px solid ${accent}55`, background: accent + '22', color: accent, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, whiteSpace: 'nowrap' }}>
            {loading ? '…' : 'ask ▸'}
          </button>
        </div>
      </div>

      {/* ── right: the working artifact ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ padding: '8px 12px', borderBottom: '0.5px solid var(--b1)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <select value={lang} onChange={e => setLang(e.target.value)}
            style={{ background: 'var(--raised)', color: 'var(--t2)', border: '0.5px solid var(--b1)', borderRadius: 5, padding: '4px 8px', fontFamily: 'var(--mono)', fontSize: 10.5 }}>
            {['typescript', 'javascript', 'python', 'sql', 'bash', 'json', 'css', 'html'].map(l => <option key={l}>{l}</option>)}
          </select>
          {lastArtifact && (
            <button onClick={applyArtifact}
              style={{ padding: '4px 10px', borderRadius: 5, border: `0.5px solid ${accent}88`, background: accent + '22', color: accent, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600 }}>
              ← apply her code ({lastArtifact.code.split('\n').length} lines)
            </button>
          )}
          {history.length > 0 && (
            <button onClick={undo} style={{ padding: '4px 8px', borderRadius: 5, border: '0.5px solid var(--b1)', background: 'transparent', color: 'var(--t3)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10 }}>↩ undo</button>
          )}
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t4)' }}>
            {code ? code.split('\n').length + ' lines' : 'editor'}
          </span>
          {code && (
            <>
              <button onClick={() => navigator.clipboard?.writeText(code)} style={{ background: 'none', border: 'none', color: 'var(--t4)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10 }}>⧉</button>
              <button onClick={() => { setHistory(h => [...h, code]); setCode('') }} style={{ background: 'none', border: 'none', color: 'var(--t4)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10 }}>clear</button>
            </>
          )}
        </div>
        <textarea value={code} onChange={e => setCode(e.target.value)} spellCheck={false}
          placeholder={'// the working artifact\n// paste code, or "apply her code" from the chat\n// with attach on, it rides along on every message'}
          onKeyDown={e => { if (e.key === 'Tab') { e.preventDefault(); const s = e.currentTarget; const i = s.selectionStart; s.value = s.value.slice(0, i) + '  ' + s.value.slice(s.selectionEnd); s.selectionStart = s.selectionEnd = i + 2; setCode(s.value) } }}
          style={{ flex: 1, background: 'var(--void)', border: 'none', color: '#C8D3E0', padding: '12px 14px', fontSize: 12.5, fontFamily: 'var(--mono)', resize: 'none', outline: 'none', lineHeight: 1.6, tabSize: 2 }}
        />
      </div>
    </div>
  )
}
