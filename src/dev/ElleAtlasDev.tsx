import { useState, useRef, useEffect, useCallback } from 'react'

// ============================================================
// ELLE · DEV CONSOLE
// Desktop build. Wired to the live Cloudflare Worker.
// Styled to render like the public site (ink · oxblood · gold ·
// cream · Playfair / Barlow / Space Mono — see src/index.css).
// Stripped to the one surface that matters here: conversation.
// ============================================================

const WORKER = import.meta.env.VITE_ELLE_WORKER_URL || 'https://elle.sbarteau2022.workers.dev'

// site palette (mirrors :root in index.css so this stays in lockstep with the site)
const INK = 'var(--ink)', CARD = 'var(--card)', GOLD = 'var(--gold)', CREAM = 'var(--cream)'
const DIM = 'var(--dim)', RED = 'var(--red)', BORDER = 'var(--border)'
const SERIF = "'Playfair Display', serif"
const BODY  = "'Barlow Condensed', sans-serif"
const MONO  = "'Space Mono', monospace"

const CSS = `
html,body,#root{height:100%}
.elle-dev *{box-sizing:border-box}
.elle-dev ::-webkit-scrollbar{width:4px}
.elle-dev ::-webkit-scrollbar-thumb{background:rgba(201,168,76,0.25);border-radius:3px}
.elle-dev ::selection{background:rgba(201,168,76,0.22)}
@keyframes elleFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes elleBlink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes elleSpin{to{transform:rotate(360deg)}}
@keyframes ellePulse{0%,100%{opacity:1}50%{opacity:0.35}}
`

// ── Elle mark (gold) ──────────────────────────────────────────
const ElleMark = ({ size = 24, pulse = false }: { size?: number; pulse?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none"
    style={pulse ? { animation: 'ellePulse 3s ease-in-out infinite' } : {}}>
    <rect width="28" height="28" rx="5" fill="#0f0f1a" />
    <rect x="0.5" y="0.5" width="27" height="27" rx="4.5" stroke="#C9A84C" strokeOpacity="0.3" strokeWidth="0.5" fill="none" />
    <rect x="7" y="7.5" width="1.5" height="13" rx="0.75" fill="#C9A84C" />
    <rect x="7" y="7.5" width="11.5" height="1.5" rx="0.75" fill="#C9A84C" />
    <rect x="7" y="13.25" width="8" height="1.25" rx="0.625" fill="#C9A84C" opacity="0.6" />
    <rect x="7" y="19" width="11.5" height="1.5" rx="0.75" fill="#C9A84C" />
    <circle cx="21.5" cy="8.75" r="2" fill="#E4C97A" />
  </svg>
)

const Cursor = () => (
  <span style={{ display: 'inline-block', width: 7, height: 13, background: GOLD, marginLeft: 2, verticalAlign: 'middle', animation: 'elleBlink 1.1s step-end infinite', borderRadius: 1, opacity: 0.85 }} />
)

// ── Types ─────────────────────────────────────────────────────
interface Message {
  id: string
  role: 'user' | 'elle'
  content: string
  thinking?: string
  model?: string
  provider?: string
  ts: number
  error?: boolean
}

class AuthError extends Error {}

// ── API call (pure — no React state touched here) ─────────────
async function askElle(
  query: string,
  history: Message[],
  sessionId: string,
  signal: AbortSignal
): Promise<Partial<Message>> {
  const messages = history
    .filter(m => !m.error)
    .slice(-20)
    .map(m => ({ role: m.role === 'elle' ? 'assistant' : 'user', content: m.content }))

  const res = await fetch(`${WORKER}/api/elle-conversation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('elle_dev_token') || ''}`,
    },
    body: JSON.stringify({ query, messages, session_id: sessionId, source: 'elle_dev_ui' }),
    signal,
  })

  if (res.status === 401) throw new AuthError('Session expired — please sign in again')
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`${res.status}: ${txt.slice(0, 200)}`)
  }
  const d = await res.json()
  return { content: d.content || d.response || '', thinking: d.thinking, model: d.model, provider: d.provider }
}

// ── Thinking trace (collapsible) ──────────────────────────────
const ThinkingPanel = ({ thinking }: { thinking: string }) => {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginTop: 8, marginBottom: 6 }}>
      <button onClick={() => setOpen(v => !v)} style={{
        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        background: 'rgba(201,168,76,0.05)', border: `0.5px solid ${BORDER}`,
        borderRadius: 4, padding: '3px 9px', color: GOLD, fontSize: 11,
        fontFamily: MONO, letterSpacing: '0.03em',
      }}>
        <span style={{ fontSize: 8 }}>{open ? '▾' : '▸'}</span>
        {open ? 'hide reasoning' : 'show reasoning'}
        <span style={{ color: DIM, marginLeft: 4 }}>{thinking.length} chars</span>
      </button>
      {open && (
        <div style={{
          marginTop: 6, padding: '11px 13px', background: 'rgba(201,168,76,0.03)',
          border: `0.5px solid ${BORDER}`, borderRadius: 6, fontSize: 12.5,
          fontFamily: MONO, color: DIM, lineHeight: 1.7, whiteSpace: 'pre-wrap',
          maxHeight: 300, overflow: 'auto', animation: 'elleFade 0.14s ease both',
        }}>{thinking}</div>
      )}
    </div>
  )
}

// ── Message ───────────────────────────────────────────────────
const Msg = ({ msg }: { msg: Message }) => {
  const isUser = msg.role === 'user'
  return (
    <div style={{ padding: '16px 0', borderBottom: `0.5px solid ${BORDER}`, animation: 'elleFade 0.18s ease both' }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6, flexShrink: 0, marginTop: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isUser ? 'rgba(245,240,232,0.04)' : 'rgba(201,168,76,0.06)',
          border: isUser ? `0.5px solid rgba(245,240,232,0.10)` : `0.5px solid ${BORDER}`,
          fontSize: 10, fontWeight: 600, fontFamily: MONO, color: isUser ? DIM : 'transparent',
        }}>{isUser ? 'you' : <ElleMark size={20} />}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: 13, fontWeight: 600, fontFamily: MONO, letterSpacing: '0.02em', color: isUser ? CREAM : GOLD }}>
              {isUser ? 'you' : 'elle'}
            </span>
            {!isUser && msg.model && (
              <span style={{ fontSize: 9.5, color: DIM, fontFamily: MONO, padding: '1px 6px', background: 'rgba(201,168,76,0.05)', border: `0.5px solid ${BORDER}`, borderRadius: 3 }}>
                {msg.provider ? `${msg.provider} · ` : ''}{msg.model.split('/').pop()}
              </span>
            )}
            <span style={{ fontSize: 10, color: DIM, marginLeft: 'auto', fontFamily: MONO }}>
              {new Date(msg.ts).toLocaleTimeString()}
            </span>
          </div>

          {!isUser && msg.thinking && <ThinkingPanel thinking={msg.thinking} />}

          <div style={{ fontSize: 15.5, color: msg.error ? '#d98a8a' : CREAM, lineHeight: 1.75, whiteSpace: 'pre-wrap', fontFamily: BODY }}>
            {msg.content}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Composer ──────────────────────────────────────────────────
const Composer = ({ onSend, loading }: { onSend: (q: string) => void; loading: boolean }) => {
  const [val, setVal] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  const send = () => {
    const q = val.trim()
    if (!q || loading) return
    setVal(''); onSend(q)
    setTimeout(() => ref.current?.focus(), 50)
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div style={{ flexShrink: 0, borderTop: `0.5px solid ${BORDER}`, background: 'rgba(245,240,232,0.015)' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '14px 22px 18px' }}>
        <div style={{
          background: CARD, border: `0.5px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden',
          transition: 'border-color 150ms', boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
        }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.45)')}
          onBlurCapture={e => (e.currentTarget.style.borderColor = BORDER)}
        >
          <textarea
            ref={ref} value={val} onChange={e => setVal(e.target.value)} onKeyDown={onKey}
            disabled={loading} rows={3}
            placeholder={loading ? 'Elle is thinking…' : 'Ask Elle anything across the corpus…  (Enter to send)'}
            style={{
              width: '100%', resize: 'none', background: 'none', border: 'none', outline: 'none',
              color: CREAM, fontSize: 15, fontFamily: BODY, lineHeight: 1.6,
              padding: '12px 15px 4px', caretColor: GOLD, opacity: loading ? 0.5 : 1,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px 9px' }}>
            <span style={{ fontSize: 10.5, color: DIM, fontFamily: MONO }}>
              {WORKER.includes('workers.dev') ? '● ' : '○ '}worker · RAG · corpus
            </span>
            {loading && <div style={{ width: 11, height: 11, border: `1.5px solid ${GOLD}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'elleSpin 0.8s linear infinite' }} />}
            <button onClick={send} disabled={loading || !val.trim()} style={{
              marginLeft: 'auto', width: 32, height: 32, borderRadius: 7,
              background: val.trim() && !loading ? 'rgba(201,168,76,0.18)' : 'rgba(245,240,232,0.04)',
              border: `0.5px solid ${val.trim() && !loading ? GOLD : BORDER}`,
              cursor: val.trim() && !loading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 130ms', fontSize: 15,
              color: val.trim() && !loading ? '#E4C97A' : DIM,
            }}>↑</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────
export default function ElleAtlasDev() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [health, setHealth] = useState<{ papers?: number; chunks?: number; status?: string } | null>(null)
  const [sessionId] = useState(() => {
    try {
      let s = localStorage.getItem('elle_dev_session')
      if (!s) { s = crypto.randomUUID(); localStorage.setItem('elle_dev_session', s) }
      return s
    } catch { return crypto.randomUUID() }
  })
  const [token, setToken] = useState(() => localStorage.getItem('elle_dev_token') || '')
  const [authEmail, setAuthEmail] = useState('')
  const [authPass, setAuthPass] = useState('')
  const [authErr, setAuthErr] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = CSS
    document.head.appendChild(el)
    return () => { document.head.removeChild(el) }
  }, [])

  useEffect(() => {
    fetch(`${WORKER}/health`).then(r => r.json()).then(setHealth).catch(() => setHealth({ status: 'unreachable' }))
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const signOut = useCallback(() => {
    localStorage.removeItem('elle_dev_token')
    setToken('')
  }, [])

  const sendMessage = useCallback(async (query: string) => {
    if (loading) return
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: query, ts: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const data = await askElle(query, [...messages, userMsg], sessionId, ctrl.signal)
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: 'elle',
        content: data.content || '', thinking: data.thinking,
        model: data.model, provider: data.provider, ts: Date.now(),
      }])
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      if (e instanceof AuthError) { signOut() }
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: 'elle',
        content: `Error: ${(e as Error).message}`, ts: Date.now(), error: true,
      }])
    } finally {
      setLoading(false)
    }
  }, [loading, messages, sessionId, signOut])

  const doLogin = async () => {
    if (!authEmail.trim() || !authPass.trim() || authLoading) return
    setAuthLoading(true); setAuthErr('')
    try {
      const res = await fetch(`${WORKER}/api/elle-auth`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email: authEmail.trim(), password: authPass }),
      })
      const data = await res.json() as { access_token?: string; error?: string }
      if (!res.ok || !data.access_token) { setAuthErr(data.error || 'Invalid credentials'); return }
      localStorage.setItem('elle_dev_token', data.access_token)
      setToken(data.access_token)
    } catch (e) {
      setAuthErr((e as Error).message)
    } finally {
      setAuthLoading(false)
    }
  }

  // ── Sign-in ──
  if (!token) {
    const inputStyle: React.CSSProperties = {
      background: CARD, border: `0.5px solid ${BORDER}`, borderRadius: 6, color: CREAM,
      fontFamily: MONO, fontSize: 13, padding: '10px 14px', width: 280, outline: 'none',
    }
    return (
      <div className="elle-dev" style={{ width: '100vw', height: '100vh', background: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
        <ElleMark size={40} pulse />
        <div style={{ fontFamily: SERIF, fontSize: 30, color: CREAM, letterSpacing: '-0.01em', marginTop: 2 }}>Elle</div>
        <div style={{ fontSize: 11, color: DIM, fontFamily: MONO, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6 }}>dev console</div>
        <input type="email" placeholder="email" value={authEmail} autoFocus
          onChange={e => setAuthEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && doLogin()} style={inputStyle} />
        <input type="password" placeholder="password" value={authPass}
          onChange={e => setAuthPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && doLogin()} style={inputStyle} />
        {authErr && <div style={{ fontSize: 11.5, color: '#d98a8a', fontFamily: MONO }}>{authErr}</div>}
        <button onClick={doLogin} disabled={authLoading || !authEmail.trim() || !authPass.trim()} style={{
          background: 'rgba(201,168,76,0.16)', border: `0.5px solid ${GOLD}`, borderRadius: 6,
          color: authLoading ? DIM : '#E4C97A', fontFamily: MONO, fontSize: 12.5,
          padding: '9px 24px', cursor: 'pointer', width: 280, letterSpacing: '0.04em',
        }}>{authLoading ? 'signing in…' : 'sign in'}</button>
      </div>
    )
  }

  // ── Console ──
  return (
    <div className="elle-dev" style={{ width: '100vw', height: '100vh', background: INK, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* header (draggable on desktop) */}
      <div style={{ height: 46, flexShrink: 0, borderBottom: `0.5px solid ${BORDER}`, display: 'flex', alignItems: 'center', padding: '0 18px', gap: 11, ['WebkitAppRegion' as any]: 'drag' }}>
        <ElleMark size={20} pulse />
        <span style={{ fontFamily: SERIF, fontSize: 19, color: CREAM, letterSpacing: '-0.01em' }}>Elle</span>
        <span style={{ fontSize: 10.5, color: GOLD, fontFamily: MONO, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 3 }}>dev</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10.5, color: DIM, fontFamily: MONO }}>
          {health?.status === 'unreachable'
            ? 'worker unreachable'
            : health
              ? `${health.papers?.toLocaleString() ?? '…'} papers · ${health.chunks?.toLocaleString() ?? '…'} chunks`
              : 'connecting…'}
        </span>
        <button onClick={() => setMessages([])} style={{ fontSize: 10.5, color: DIM, fontFamily: MONO, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', ['WebkitAppRegion' as any]: 'no-drag' }}>clear</button>
        <button onClick={signOut} style={{ fontSize: 10.5, color: DIM, fontFamily: MONO, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', ['WebkitAppRegion' as any]: 'no-drag' }}>sign out</button>
      </div>

      {/* messages */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 22px' }}>
          {messages.length === 0 && (
            <div style={{ padding: '8vh 12px 4vh', textAlign: 'center' }}>
              <ElleMark size={40} pulse />
              <div style={{ marginTop: 18, fontFamily: SERIF, fontSize: 26, color: CREAM }}>Good to see you.</div>
              <div style={{ marginTop: 8, fontSize: 14.5, color: DIM, fontFamily: BODY, lineHeight: 1.6, maxWidth: 460, margin: '8px auto 0' }}>
                {health?.papers ? `${health.papers.toLocaleString()} papers in corpus · ` : ''}full RAG, persistent memory, Observer reasoning. Ask anything.
              </div>
              <div style={{ marginTop: 26, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {[
                  'What is the Observer methodology?',
                  'Explain captured resonance',
                  'What does Elle say about the threshold?',
                  'Explain φ and the toroidal field',
                ].map(s => (
                  <button key={s} onClick={() => sendMessage(s)} style={{
                    padding: '7px 13px', background: CARD, border: `0.5px solid ${BORDER}`,
                    borderRadius: 7, color: DIM, fontSize: 12.5, fontFamily: MONO,
                    cursor: 'pointer', transition: 'all 120ms',
                  }}
                    onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = '#E4C97A'; b.style.borderColor = GOLD }}
                    onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = DIM; b.style.borderColor = 'var(--border)' }}
                  >{s}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map(m => <Msg key={m.id} msg={m} />)}

          {loading && (
            <div style={{ padding: '16px 0', display: 'flex', gap: 12, animation: 'elleFade 0.18s ease both' }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(201,168,76,0.06)', border: `0.5px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ElleMark size={20} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, paddingTop: 6 }}>
                <span style={{ fontSize: 11, color: DIM, fontFamily: MONO }}>searching corpus · reasoning</span>
                <Cursor />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <Composer onSend={sendMessage} loading={loading} />
    </div>
  )
}
