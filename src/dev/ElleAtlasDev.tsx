import { useState, useRef, useEffect, useCallback } from 'react'

// ============================================================
// ELLE × ATLAS OS — DEV UI
// Wired to live Cloudflare Worker
// Thinking traces · RAG · Chain-of-thought visible
// ============================================================

const WORKER = import.meta.env.VITE_ELLE_WORKER_URL || 'https://elle.sbarteau2022.workers.dev'
const SVC_KEY = import.meta.env.VITE_ELLE_SERVICE_KEY || ''

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Inter:wght@300;400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --void:#07080C;--base:#0C0D14;--raised:#11121B;--float:#171824;--overlay:#1E1F2E;
  --hover:rgba(100,232,249,0.04);
  --cyan:#5FD6E8;--cyan-l:#9EEDF7;--cyan-d:#3ABED0;--cyan-gl:rgba(95,214,232,0.08);--cyan-gb:rgba(95,214,232,0.04);
  --green:#4ADE80;--amber:#F59E0B;--red:#EF4444;--purple:#A78BFA;
  --t1:#DDE5EE;--t2:#8896A8;--t3:#52606E;--t4:#363F4A;
  --b1:rgba(95,214,232,0.16);--b2:rgba(255,255,255,0.07);--b3:rgba(255,255,255,0.035);
  --r-sm:3px;--r-md:5px;--r-lg:8px;--r-xl:12px;
  --font-ui:'Inter',system-ui,sans-serif;
  --font-mono:'JetBrains Mono','Fira Code',monospace;
}
html,body,#root{height:100%;overflow:hidden}
body{background:var(--void);color:var(--t1);font-family:var(--font-ui);font-size:13px;line-height:1.5;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:3px}
::-webkit-scrollbar-thumb{background:rgba(95,214,232,0.15);border-radius:2px}
::selection{background:rgba(95,214,232,0.18)}
@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.28}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes spin{to{transform:rotate(360deg)}}
.fade-up{animation:fadeUp 0.2s cubic-bezier(0.16,1,0.3,1) both}
`

// ── Elle Mark ─────────────────────────────────────────────────
const ElleMark = ({ size = 24, pulse: doPulse = false }: { size?: number; pulse?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none"
    style={doPulse ? { animation: 'pulse 3s ease-in-out infinite' } : {}}>
    <rect width="28" height="28" rx="5" fill="#07080C"/>
    <rect x="0.5" y="0.5" width="27" height="27" rx="4.5" stroke="#5FD6E8" strokeOpacity="0.25" strokeWidth="0.5" fill="none"/>
    <rect x="7" y="7.5" width="1.5" height="13" rx="0.75" fill="#5FD6E8"/>
    <rect x="7" y="7.5" width="11.5" height="1.5" rx="0.75" fill="#5FD6E8"/>
    <rect x="7" y="13.25" width="8" height="1.25" rx="0.625" fill="#5FD6E8" opacity="0.6"/>
    <rect x="7" y="19" width="11.5" height="1.5" rx="0.75" fill="#5FD6E8"/>
    <circle cx="21.5" cy="8.75" r="2" fill="#9EEDF7"/>
  </svg>
)

const Dot = ({ color = 'var(--t4)', pulse: doPulse = false, size = 5 }: { color?: string; pulse?: boolean; size?: number }) => (
  <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
    <div style={{ width: size, height: size, borderRadius: '50%', background: color }} />
    {doPulse && <div style={{ position: 'absolute', inset: -2, borderRadius: '50%', border: `1px solid ${color}`, animation: 'pulse 2s ease-in-out infinite', opacity: 0.5 }} />}
  </div>
)

const Cursor = () => (
  <span style={{ display: 'inline-block', width: 7, height: 13, background: 'var(--cyan)', marginLeft: 2, verticalAlign: 'middle', animation: 'blink 1.1s step-end infinite', borderRadius: 1, opacity: 0.85 }} />
)

// ── Types ─────────────────────────────────────────────────────
interface Message {
  id: string
  role: 'user' | 'elle'
  content: string
  thinking?: string
  search_results?: string
  model?: string
  provider?: string
  ts: number
  error?: boolean
}

// ── API call ──────────────────────────────────────────────────
async function askElle(
  query: string,
  history: Message[],
  sessionId: string,
  signal: AbortSignal
): Promise<{ content: string; thinking?: string; search_results?: string; model?: string; provider?: string }> {
  const messages = history
    .filter(m => !m.error)
    .slice(-20)
    .map(m => ({ role: m.role === 'elle' ? 'assistant' : 'user', content: m.content }))

  const res = await fetch(`${WORKER}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, messages, session_id: sessionId, source: 'elle_dev_ui' }),
    signal,
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`${res.status}: ${txt.slice(0, 200)}`)
  }

  return res.json()
}

// ── Thinking panel ────────────────────────────────────────────
const ThinkingPanel = ({ thinking }: { thinking: string }) => {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginTop: 8, marginBottom: 4 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--cyan-gb)', border: '0.5px solid var(--b1)',
          borderRadius: 'var(--r-sm)', padding: '3px 8px',
          cursor: 'pointer', color: 'var(--cyan)', fontSize: 10,
          fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
        }}
      >
        <span style={{ fontSize: 8 }}>{open ? '▾' : '▸'}</span>
        {open ? 'hide reasoning' : 'show reasoning'}
        <span style={{ color: 'var(--t4)', marginLeft: 4 }}>{thinking.length} chars</span>
      </button>
      {open && (
        <div style={{
          marginTop: 6, padding: '10px 12px',
          background: 'rgba(95,214,232,0.03)',
          border: '0.5px solid var(--b1)',
          borderRadius: 'var(--r-md)',
          fontSize: 11.5, fontFamily: 'var(--font-mono)',
          color: 'var(--t3)', lineHeight: 1.7,
          whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto',
          animation: 'fadeUp 0.14s ease both',
        }}>
          {thinking}
        </div>
      )}
    </div>
  )
}

// ── Message ───────────────────────────────────────────────────
const Msg = ({ msg }: { msg: Message }) => {
  const isUser = msg.role === 'user'
  return (
    <div style={{ padding: '14px 18px', borderBottom: '0.5px solid var(--b3)', animation: 'fadeUp 0.18s ease both' }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 'var(--r-md)', flexShrink: 0, marginTop: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isUser ? 'var(--overlay)' : 'var(--raised)',
          border: isUser ? '0.5px solid var(--b2)' : '0.5px solid var(--b1)',
          fontSize: 9, fontWeight: 600, fontFamily: 'var(--font-mono)',
          color: isUser ? 'var(--t3)' : 'transparent',
        }}>
          {isUser ? 'dev' : <ElleMark size={20} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', color: isUser ? 'var(--t2)' : 'var(--cyan-l)' }}>
              {isUser ? 'you' : 'elle'}
            </span>
            {!isUser && msg.model && (
              <span style={{ fontSize: 9, color: 'var(--t4)', fontFamily: 'var(--font-mono)', padding: '1px 5px', background: 'var(--cyan-gb)', border: '0.5px solid var(--b1)', borderRadius: 3 }}>
                {msg.provider} · {msg.model.split('/').pop()}
              </span>
            )}
            {!isUser && msg.thinking && (
              <span style={{ fontSize: 9, color: 'var(--cyan-d)', fontFamily: 'var(--font-mono)', padding: '1px 5px', background: 'var(--cyan-gb)', border: '0.5px solid var(--b1)', borderRadius: 3 }}>
                thinking ✓
              </span>
            )}
            <span style={{ fontSize: 9.5, color: 'var(--t4)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
              {new Date(msg.ts).toLocaleTimeString()}
            </span>
          </div>

          {/* Thinking trace — shown above response */}
          {!isUser && msg.thinking && <ThinkingPanel thinking={msg.thinking} />}

          <div style={{
            fontSize: 13, color: msg.error ? 'var(--red)' : 'var(--t1)',
            lineHeight: 1.75, whiteSpace: 'pre-wrap',
          }}>
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
    setVal('')
    onSend(q)
    setTimeout(() => ref.current?.focus(), 50)
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div style={{
      margin: '0 14px 12px',
      background: 'var(--raised)', border: '0.5px solid var(--b1)',
      borderRadius: 'var(--r-xl)', overflow: 'hidden',
      transition: 'border-color 150ms',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    }}
      onFocusCapture={e => (e.currentTarget.style.borderColor = 'rgba(95,214,232,0.35)')}
      onBlurCapture={e => (e.currentTarget.style.borderColor = 'var(--b1)')}
    >
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px 0' }}>
        <span style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'var(--font-mono)' }}>elle@dev</span>
        <span style={{ fontSize: 10, color: 'var(--cyan-d)', fontFamily: 'var(--font-mono)' }}>~</span>
        {!loading && <Cursor />}
        {loading && <div style={{ width: 10, height: 10, border: '1.5px solid var(--cyan)', borderTopColor: 'transparent', borderRadius: '50%', marginLeft: 2, animation: 'spin 0.8s linear infinite' }} />}
        <span style={{ marginLeft: 'auto', fontSize: 9.5, color: 'var(--t4)', fontFamily: 'var(--font-mono)' }}>
          {WORKER.replace('https://', '')}
        </span>
      </div>

      <textarea
        ref={ref}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={onKey}
        disabled={loading}
        placeholder={loading ? 'Elle is thinking…' : 'Ask Elle anything across the corpus… (Enter to send)'}
        rows={4}
        style={{
          width: '100%', resize: 'none', background: 'none',
          border: 'none', outline: 'none',
          color: 'var(--t1)', fontSize: 13,
          fontFamily: 'var(--font-mono)', lineHeight: 1.7,
          padding: '9px 14px 6px',
          caretColor: 'var(--cyan)',
          opacity: loading ? 0.5 : 1,
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px 8px' }}>
        <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' }}>
          {[
            { l: `${WORKER.includes('workers.dev') ? '🟢' : '🟡'} worker live`, c: '#5FD6E8' },
            { l: 'RAG · corpus', c: '#4ADE80' },
            { l: 'Enter to send · Shift+Enter newline', c: '#52606E' },
          ].map(chip => (
            <div key={chip.l} style={{
              fontSize: 9.5, color: chip.c + 'BB',
              fontFamily: 'var(--font-mono)', opacity: 0.8,
            }}>{chip.l}</div>
          ))}
        </div>
        <button
          onClick={send}
          disabled={loading || !val.trim()}
          style={{
            width: 30, height: 30, borderRadius: 'var(--r-md)',
            background: val.trim() && !loading ? 'rgba(95,214,232,0.2)' : 'var(--overlay)',
            border: `0.5px solid ${val.trim() && !loading ? 'var(--cyan-d)' : 'var(--b2)'}`,
            cursor: val.trim() && !loading ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all 130ms',
            fontSize: 14, color: val.trim() && !loading ? 'var(--cyan-l)' : 'var(--t4)',
          }}
        >↑</button>
      </div>
    </div>
  )
}

// ── Status bar ────────────────────────────────────────────────
const StatusBar = ({ health }: { health: { papers?: number; chunks?: number; status?: string } | null }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '5px 16px',
    background: 'rgba(95,214,232,0.025)',
    borderBottom: '0.5px solid var(--b3)',
    flexShrink: 0,
  }}>
    <Dot color={health?.status === 'running' ? 'var(--green)' : 'var(--amber)'} pulse={health?.status === 'running'} size={5} />
    <span style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'var(--font-mono)' }}>
      {health ? `elle-worker · ${health.papers?.toLocaleString()} papers · ${health.chunks?.toLocaleString()} chunks` : 'connecting…'}
    </span>
    <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--t4)', fontFamily: 'var(--font-mono)' }}>
      {new Date().toLocaleTimeString()}
    </span>
  </div>
)

// ── Main component ────────────────────────────────────────────
export default function ElleAtlasDev() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [health, setHealth] = useState<{ papers?: number; chunks?: number; status?: string } | null>(null)
  const [sessionId] = useState(() => crypto.randomUUID())
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Inject CSS
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  // Health check
  useEffect(() => {
    fetch(`${WORKER}/health`)
      .then(r => r.json())
      .then(d => setHealth(d))
      .catch(() => setHealth({ status: 'unreachable' }))
  }, [])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

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
      const elleMsg: Message = {
        id:             crypto.randomUUID(),
        role:           'elle',
        content:        data.content || data.response || '',
        thinking:       data.thinking,
        search_results: data.search_results,
        model:          data.model,
        provider:       data.provider,
        ts:             Date.now(),
      }
      setMessages(prev => [...prev, elleMsg])
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      const errMsg: Message = {
        id:      crypto.randomUUID(),
        role:    'elle',
        content: `Error: ${(e as Error).message}`,
        ts:      Date.now(),
        error:   true,
      }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }, [loading, messages, sessionId])

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'var(--void)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        height: 40, flexShrink: 0,
        background: 'var(--void)',
        borderBottom: '0.5px solid var(--b3)',
        display: 'flex', alignItems: 'center',
        padding: '0 14px', gap: 10,
      }}>
        <ElleMark size={18} pulse />
        <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--t1)', letterSpacing: '-0.02em' }}>elle</span>
        <span style={{ fontSize: 10, color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>ai</span>
        <div style={{ width: '0.5px', height: 14, background: 'var(--b2)' }} />
        <span style={{ fontSize: 11, color: 'var(--t4)', fontFamily: 'var(--font-mono)' }}>dev · atlas os</span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setMessages([])}
          style={{
            fontSize: 10, color: 'var(--t4)', fontFamily: 'var(--font-mono)',
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px',
          }}
        >clear</button>
      </div>

      {/* Status */}
      <StatusBar health={health} />

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {messages.length === 0 && (
          <div style={{ padding: '40px 18px', textAlign: 'center' }}>
            <ElleMark size={36} pulse />
            <div style={{ marginTop: 16, fontSize: 13, color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>
              elle is online · {health?.papers?.toLocaleString() || '…'} papers in corpus
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--t4)', fontFamily: 'var(--font-mono)' }}>
              ask anything · thinking traces visible when enabled
            </div>
            <div style={{ marginTop: 24, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                'What is the Observer methodology?',
                'Explain the captured resonance framework',
                'What does Elle say about the threshold?',
                'Explain φ and the toroidal field',
              ].map(s => (
                <button key={s} onClick={() => sendMessage(s)} style={{
                  padding: '6px 12px',
                  background: 'var(--raised)', border: '0.5px solid var(--b1)',
                  borderRadius: 'var(--r-md)', color: 'var(--t2)',
                  fontSize: 11.5, fontFamily: 'var(--font-mono)',
                  cursor: 'pointer', transition: 'all 120ms',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--cyan-gb)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--cyan-l)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--raised)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--t2)' }}
                >{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map(msg => <Msg key={msg.id} msg={msg} />)}
        {loading && (
          <div style={{ padding: '12px 18px', display: 'flex', gap: 10, animation: 'fadeUp 0.18s ease both' }}>
            <div style={{ width: 26, height: 26, borderRadius: 'var(--r-md)', background: 'var(--raised)', border: '0.5px solid var(--b1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ElleMark size={18} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 5 }}>
              <span style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'var(--font-mono)' }}>elle@worker:~$</span>
              <Cursor />
              <span style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'var(--font-mono)', marginLeft: 4 }}>
                searching corpus · reasoning…
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <Composer onSend={sendMessage} loading={loading} />
    </div>
  )
}