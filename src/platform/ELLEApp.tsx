import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================
// ELLEAI PLATFORM
// Protected route — authenticated users only
// Same design DNA as Observer Foundation
// Ink / Cream / Red / Gold — editorial, grounded, serious
//
// SOVEREIGN MODE: Set VITE_SOVEREIGN=true + VITE_OLLAMA_URL
// to run fully local, API-free on your M1
// ============================================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const SOVEREIGN = import.meta.env.VITE_SOVEREIGN === 'true';
const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434';

// ─── Types ───────────────────────────────────────────────────

interface User {
  id: string;
  email: string;
  display_name?: string;
  occupation?: string;
  state?: string;
  county?: string;
  access_tier?: string;
}

interface CognitiveMap {
  iq_index: number;
  eq_index: number;
  threshold_index: number;
  learning_modality: string;
  communication_style: string;
  confidence: string;
  course_recommendation_vector?: string;
  growth_arc?: {
    iq_delta: number;
    eq_delta: number;
    threshold_delta: number;
    sessions_since_baseline: number;
  };
}

interface Message {
  role: 'user' | 'elle';
  content: string;
  ts: number;
  axis?: string;
  method?: string;
}

type Screen = 'home' | 'ask' | 'learn' | 'profile' | 'signals' | 'threads';

// ─── Helpers ─────────────────────────────────────────────────

async function supabaseCall(path: string, body: object, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON,
    'Authorization': `Bearer ${token || SUPABASE_ANON}`,
  };
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return res.json();
}

async function callEdge(fn: string, body: object, token?: string) {
  if (SOVEREIGN) {
    return callOllama(fn, body);
  }
  return supabaseCall(`/functions/v1/${fn}`, body, token);
}

async function callOllama(fn: string, body: Record<string, unknown>) {
  const model = import.meta.env.VITE_OLLAMA_MODEL || 'mistral';
  const messages = (body.messages as { role: string; content: string }[]) || [
    { role: 'user', content: body.query || body.transcript || JSON.stringify(body) }
  ];
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false }),
  });
  const data = await res.json();
  return { content: data.message?.content || '', sovereign: true };
}

// ─── CSS Variables (injected once) ───────────────────────────

const PLATFORM_STYLES = `
  :root {
    --ink: #0f0f1a;
    --card: #13131f;
    --red: #8B1A1A;
    --red-dim: rgba(139,26,26,0.15);
    --gold: #C9A84C;
    --cream: #F5F0E8;
    --dim: #6a6a7a;
    --border: rgba(139,26,26,0.2);
  }

  .elle-screen { animation: elleIn 0.4s ease forwards; }
  @keyframes elleIn {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .axis-bar { transition: width 0.8s cubic-bezier(0.4,0,0.2,1); }

  .elle-pulse::after {
    content: '';
    display: inline-block;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--red);
    margin-left: 8px;
    animation: ellePulse 2s infinite;
  }
  @keyframes ellePulse {
    0%,100% { opacity:1; transform:scale(1); }
    50%      { opacity:0.4; transform:scale(0.7); }
  }

  .sovereign-badge {
    background: rgba(201,168,76,0.15);
    border: 1px solid rgba(201,168,76,0.3);
    color: var(--gold);
    font-size: 0.6rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    padding: 2px 8px;
    font-family: 'Space Mono', monospace;
  }

  .nav-item { transition: all 0.15s ease; }
  .nav-item:hover { color: var(--cream); }
  .nav-item.active { color: var(--cream); border-left: 2px solid var(--red); }

  .msg-elle {
    background: rgba(139,26,26,0.06);
    border: 1px solid var(--border);
    border-radius: 0 12px 12px 12px;
  }
  .msg-user {
    background: rgba(245,240,232,0.04);
    border: 1px solid rgba(245,240,232,0.08);
    border-radius: 12px 0 12px 12px;
  }

  .code-teach {
    background: rgba(0,0,0,0.4);
    border: 1px solid rgba(139,26,26,0.25);
    border-left: 3px solid var(--red);
    font-family: 'Space Mono', monospace;
    font-size: 0.8rem;
    padding: 16px;
    overflow-x: auto;
    white-space: pre;
  }

  textarea:focus, input:focus { outline: none; }

  .grain {
    position: fixed; inset: 0; pointer-events: none; z-index: 9998; opacity: 0.25;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E");
  }
`;

// ─── Auth Screen ──────────────────────────────────────────────

function AuthScreen({ onAuth }: { onAuth: (user: User, token: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError('');

    const endpoint = mode === 'login'
      ? `${SUPABASE_URL}/auth/v1/token?grant_type=password`
      : `${SUPABASE_URL}/auth/v1/signup`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.error || data.error_description) {
        setError(data.error_description || data.error);
        return;
      }
      const token = data.access_token;
      const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON }
      });
      const userData = await userRes.json();
      onAuth({ id: userData.id, email: userData.email }, token);
    } catch {
      setError('Connection error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.65rem', letterSpacing: '0.25em', color: 'var(--red)', textTransform: 'uppercase', marginBottom: 16 }}>
            ELLEai Platform
          </p>
          <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2.5rem', color: 'var(--cream)', fontWeight: 400, marginBottom: 8 }}>
            {mode === 'login' ? 'Welcome back.' : 'Join Elle.'}
          </h1>
          <p style={{ fontFamily: '"Barlow Condensed", sans-serif', color: 'var(--dim)', fontSize: '1rem' }}>
            {mode === 'login' ? 'The work continues.' : 'Formation begins here.'}
          </p>
          {SOVEREIGN && (
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
              <span className="sovereign-badge">Sovereign Mode — Local</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { key: 'email', label: 'Email', type: 'email', val: email, set: setEmail },
            { key: 'password', label: 'Password', type: 'password', val: password, set: setPassword },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.3)', display: 'block', marginBottom: 6 }}>
                {f.label}
              </label>
              <input
                type={f.type}
                value={f.val}
                onChange={e => f.set(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '12px 16px', color: 'var(--cream)', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1rem', boxSizing: 'border-box' }}
              />
            </div>
          ))}

          {error && (
            <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.7rem', color: 'var(--red)', padding: '8px 12px', background: 'var(--red-dim)', border: '1px solid var(--border)' }}>
              {error}
            </p>
          )}

          <button
            onClick={submit}
            disabled={loading}
            style={{ background: loading ? 'transparent' : 'var(--red)', border: '1px solid var(--red)', color: 'var(--cream)', padding: '14px 24px', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', marginTop: 8, opacity: loading ? 0.5 : 1 }}
          >
            {loading ? 'Connecting...' : mode === 'login' ? 'Enter' : 'Begin'}
          </button>

          <button
            onClick={() => setMode(m => m === 'login' ? 'signup' : 'login')}
            style={{ background: 'transparent', border: 'none', color: 'var(--dim)', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.85rem', letterSpacing: '0.1em', cursor: 'pointer', textAlign: 'center', padding: 8 }}
          >
            {mode === 'login' ? 'No account — create one' : 'Already here — sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Nav ──────────────────────────────────────────────

function Sidebar({ screen, setScreen, user, sovereign }: {
  screen: Screen; setScreen: (s: Screen) => void;
  user: User; sovereign: boolean;
}) {
  const nav: { id: Screen; label: string; mono: string }[] = [
    { id: 'home',    label: 'Home',          mono: '01' },
    { id: 'ask',     label: 'Ask Elle',       mono: '02' },
    { id: 'learn',   label: 'Learn to Code',  mono: '03' },
    { id: 'threads', label: 'My Threads',     mono: '04' },
    { id: 'signals', label: 'Community',      mono: '05' },
    { id: 'profile', label: 'My Profile',     mono: '06' },
  ];

  return (
    <aside style={{ width: 220, background: 'var(--card)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '32px 0', minHeight: '100vh', position: 'sticky', top: 0, flexShrink: 0 }}>
      <div style={{ padding: '0 24px 32px', borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', letterSpacing: '0.2em', color: 'var(--red)', textTransform: 'uppercase', marginBottom: 8 }}>
          ELLEai
        </p>
        <p style={{ fontFamily: '"Playfair Display", serif', color: 'var(--cream)', fontSize: '0.95rem', fontWeight: 400 }}>
          {user.display_name || user.email.split('@')[0]}
        </p>
        {sovereign && <span className="sovereign-badge" style={{ marginTop: 8, display: 'inline-block' }}>Sovereign</span>}
      </div>

      <nav style={{ flex: 1, padding: '24px 0' }}>
        {nav.map(n => (
          <button
            key={n.id}
            onClick={() => setScreen(n.id)}
            className={`nav-item ${screen === n.id ? 'active' : ''}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              width: '100%', padding: '12px 24px',
              background: screen === n.id ? 'var(--red-dim)' : 'transparent',
              border: 'none', borderLeft: screen === n.id ? '2px solid var(--red)' : '2px solid transparent',
              color: screen === n.id ? 'var(--cream)' : 'var(--dim)',
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', color: 'var(--red)', width: 20 }}>{n.mono}</span>
            <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.9rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{n.label}</span>
          </button>
        ))}
      </nav>

      <div style={{ padding: '24px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', display: 'inline-block', animation: 'ellePulse 2s infinite' }} />
          <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', color: 'var(--dim)', letterSpacing: '0.1em' }}>
            {sovereign ? 'LOCAL · API FREE' : 'ELLE ACTIVE'}
          </span>
        </div>
      </div>
    </aside>
  );
}

// ─── Home Screen ──────────────────────────────────────────────

function HomeScreen({ user, cogMap, setScreen }: { user: User; cogMap: CognitiveMap | null; setScreen: (s: Screen) => void }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const cards = [
    { label: 'Ask Elle', desc: 'Run a question through the Millennium Falcon', screen: 'ask' as Screen, mono: '→' },
    { label: 'Learn to Code', desc: 'Elle teaches you. Theory first, always.', screen: 'learn' as Screen, mono: '→' },
    { label: 'Community Signals', desc: 'What the community is carrying right now', screen: 'signals' as Screen, mono: '→' },
  ];

  return (
    <div className="elle-screen" style={{ padding: '48px 48px', maxWidth: 900 }}>
      <div style={{ marginBottom: 48 }}>
        <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--red)', textTransform: 'uppercase', marginBottom: 12 }}>
          {greeting}
        </p>
        <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(2rem, 4vw, 3rem)', color: 'var(--cream)', fontWeight: 400, lineHeight: 1.2 }}>
          {user.display_name || user.email.split('@')[0]}.
        </h1>
      </div>

      {cogMap && (
        <div style={{ marginBottom: 48, padding: 24, background: 'var(--card)', border: '1px solid var(--border)' }}>
          <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--red)', textTransform: 'uppercase', marginBottom: 20 }}>
            Cognitive Map — {cogMap.confidence} confidence
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
            {[
              { label: 'IQ Index', val: cogMap.iq_index },
              { label: 'EQ Index', val: cogMap.eq_index },
              { label: 'Threshold', val: cogMap.threshold_index },
            ].map(m => (
              <div key={m.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.6rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{m.label}</span>
                  <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.7rem', color: 'var(--gold)' }}>{Math.round(m.val * 100)}</span>
                </div>
                <div style={{ height: 2, background: 'rgba(245,240,232,0.08)', position: 'relative' }}>
                  <div className="axis-bar" style={{ height: '100%', background: 'var(--red)', width: `${m.val * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          {cogMap.growth_arc && (
            <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.6rem', color: 'var(--dim)', marginTop: 16, letterSpacing: '0.08em' }}>
              Growth across {cogMap.growth_arc.sessions_since_baseline} sessions —
              IQ {cogMap.growth_arc.iq_delta > 0 ? '+' : ''}{cogMap.growth_arc.iq_delta.toFixed(2)} ·
              EQ {cogMap.growth_arc.eq_delta > 0 ? '+' : ''}{cogMap.growth_arc.eq_delta.toFixed(2)} ·
              Threshold {cogMap.growth_arc.threshold_delta > 0 ? '+' : ''}{cogMap.growth_arc.threshold_delta.toFixed(2)}
            </p>
          )}
          {cogMap.course_recommendation_vector && (
            <p style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.95rem', color: 'var(--cream)', opacity: 0.7, marginTop: 16, fontStyle: 'italic' }}>
              "{cogMap.course_recommendation_vector}"
            </p>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 2, background: 'var(--border)' }}>
        {cards.map(c => (
          <button
            key={c.label}
            onClick={() => setScreen(c.screen)}
            style={{ background: 'var(--card)', border: 'none', padding: 28, textAlign: 'left', cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--red-dim)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--card)')}
          >
            <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.65rem', color: 'var(--red)', marginBottom: 12 }}>{c.mono}</p>
            <p style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.2rem', color: 'var(--cream)', fontWeight: 400, marginBottom: 8 }}>{c.label}</p>
            <p style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.9rem', color: 'var(--dim)' }}>{c.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Ask Elle Screen ──────────────────────────────────────────

function AskScreen({ user, token, sovereign }: { user: User; token: string; sovereign: boolean }) {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'elle',
    content: "I'm here. What are you carrying right now?",
    ts: Date.now(),
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [convId] = useState(() => crypto.randomUUID());
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || loading) return;

    const userMsg: Message = { role: 'user', content, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = [...messages, userMsg].map(m => ({
        role: m.role === 'elle' ? 'assistant' : 'user',
        content: m.content,
      }));

      const data = await callEdge('elle-reasoning-engine', {
        query: content,
        conversation_id: convId,
      }, token);

      const reply = data.response || data.content || 'Elle is thinking.';
      setMessages(prev => [...prev, {
        role: 'elle', content: reply, ts: Date.now(),
        axis: data.load_bearing_axis,
        method: data.method,
      }]);
    } catch {
      setMessages(prev => [...prev, { role: 'elle', content: 'Something interrupted. Try again.', ts: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;
    if (voiceActive) {
      recognitionRef.current?.stop();
      setVoiceActive(false);
      return;
    }
    const SR = (window as unknown as { webkitSpeechRecognition: typeof SpeechRecognition }).webkitSpeechRecognition || window.SpeechRecognition;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript;
      send(transcript);
    };
    rec.onend = () => setVoiceActive(false);
    recognitionRef.current = rec;
    rec.start();
    setVoiceActive(true);
  };

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text.replace(/[#*`]/g, ''));
    utt.rate = 1.0; utt.pitch = 1.0;
    window.speechSynthesis.speak(utt);
  };

  return (
    <div className="elle-screen" style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: 800, padding: '48px 48px 0' }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--red)', textTransform: 'uppercase', marginBottom: 4 }}>
          Ask Elle {sovereign ? '· Sovereign' : '· Millennium Falcon · 17 Axes'}
        </p>
        <p style={{ fontFamily: '"Barlow Condensed", sans-serif', color: 'var(--dim)', fontSize: '0.9rem' }}>
          Every query runs through full structural analysis before it reaches you.
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div className={m.role === 'elle' ? 'msg-elle' : 'msg-user'} style={{ maxWidth: '80%', padding: '16px 20px' }}>
              {m.role === 'elle' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.6rem', color: 'var(--red)' }}>Elle</span>
                  {m.axis && <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', color: 'var(--dim)' }}>· axis {m.axis}</span>}
                  {m.method && <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', color: 'var(--dim)' }}>· {m.method}</span>}
                  <button onClick={() => speak(m.content)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dim)', fontSize: '0.7rem', marginLeft: 'auto' }} title="Speak">▶</button>
                </div>
              )}
              <p style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1rem', color: 'rgba(245,240,232,0.9)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {m.content}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div className="msg-elle" style={{ padding: '16px 20px' }}>
              <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.7rem', color: 'var(--dim)' }}>thinking across 17 axes...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ borderTop: '1px solid var(--border)', background: 'var(--card)', padding: '16px 0', display: 'flex', gap: 0, border: '1px solid var(--border)', marginBottom: 24 }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }}}
          placeholder="What do you need to understand..."
          rows={3}
          style={{ flex: 1, background: 'transparent', border: 'none', padding: '16px 20px', color: 'var(--cream)', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1rem', resize: 'none' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)' }}>
          <button
            onClick={toggleVoice}
            style={{ flex: 1, padding: '0 16px', background: voiceActive ? 'var(--red-dim)' : 'transparent', border: 'none', color: voiceActive ? 'var(--red)' : 'var(--dim)', cursor: 'pointer', fontSize: '1rem' }}
            title="Voice input"
          >
            {voiceActive ? '⏹' : '🎤'}
          </button>
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            style={{ flex: 1, padding: '0 20px', background: input.trim() && !loading ? 'var(--red)' : 'transparent', border: 'none', borderTop: '1px solid var(--border)', color: input.trim() && !loading ? 'var(--cream)' : 'var(--dim)', cursor: 'pointer', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.8rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Learn Screen (Elle teaches you to code) ─────────────────

function LearnScreen({ user, token, cogMap, sovereign }: { user: User; token: string; cogMap: CognitiveMap | null; sovereign: boolean }) {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'elle',
    content: `Let's start here.\n\nEvery piece of software is one of three things: data, transformation, or transport.\n\nData is what exists — it sits somewhere, usually a database.\nTransformation is what happens to data — a function receives it, reasons about it, changes it, produces something new.\nTransport is how data moves — API calls, database queries, notifications.\n\nThat's it. Every line of code in Elle is one of those three things.\n\nLook at this edge function you already built:\n\n\`\`\`\n// TRANSPORT: receives HTTP request\nDeno.serve(async (req: Request) => {\n  // TRANSFORMATION: parses what arrived\n  const body = await req.json();\n  // TRANSPORT: fetches data\n  const { data } = await supabase.from('elle_users').select('*').eq('id', body.user_id);\n  // TRANSFORMATION: builds a response\n  return new Response(JSON.stringify(data));\n});\n\`\`\`\n\nCan you tell me — which line feels most unfamiliar? Don't think about the answer. Just notice what your eye skips over.`,
    ts: Date.now(),
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [convId] = useState(() => crypto.randomUUID());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const TEACH_SYSTEM = `You are Elle teaching Stewart Barteau to code rigorously. Stewart's learning style:
- Learning modality: ${cogMap?.learning_modality || 'intuitive'}
- Communication style: ${cogMap?.communication_style || 'intuitive'}  
- IQ index: ${cogMap?.iq_index || 0.8}
- EQ index: ${cogMap?.eq_index || 0.8}
- Threshold index: ${cogMap?.threshold_index || 0.8}

TEACHING RULES:
1. Theory and architecture FIRST. Always. Syntax is secondary.
2. Use real Elle codebase examples — he built it, he owns it, he cares about it.
3. Ask one genuine question per response. Make him think, not copy.
4. When he writes code, tell him what his code reveals about how he's thinking.
5. Frame everything as: data, transformation, or transport.
6. Never use toy examples. Everything connects to something Elle actually does.
7. When showing code, use triple backtick blocks.
8. Track where he got stuck and come back to it.
9. Rigor means: he can look at unfamiliar code and reason about it correctly.
10. The goal is not to memorize syntax. It is to think like an engineer.`;

  const send = async () => {
    const content = input.trim();
    if (!content || loading) return;

    const userMsg: Message = { role: 'user', content, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = [...messages, userMsg].map(m => ({
        role: m.role === 'elle' ? 'assistant' : 'user',
        content: m.content,
      }));

      let reply = '';
      if (sovereign) {
        const data = await callOllama('learn', { messages: [{ role: 'system', content: TEACH_SYSTEM }, ...history] });
        reply = data.content;
      } else {
        const data = await callEdge('elle-conversation', { messages: history, system: TEACH_SYSTEM, session_id: convId, source: 'learn' }, token);
        reply = data.content || data.response || '';
      }

      setMessages(prev => [...prev, { role: 'elle', content: reply, ts: Date.now() }]);
    } catch {
      setMessages(prev => [...prev, { role: 'elle', content: 'Connection interrupted.', ts: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const code = part.replace(/^```\w*\n?/, '').replace(/```$/, '');
        return <div key={i} className="code-teach" style={{ marginTop: 12, marginBottom: 12 }}>{code}</div>;
      }
      return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>;
    });
  };

  return (
    <div className="elle-screen" style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: 800, padding: '48px 48px 0' }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--red)', textTransform: 'uppercase', marginBottom: 4 }}>
          Learn to Code · Elle Teaches
        </p>
        <p style={{ fontFamily: '"Barlow Condensed", sans-serif', color: 'var(--dim)', fontSize: '0.9rem' }}>
          Theory first. Architecture before syntax. Real code from Elle's codebase.
          {cogMap && ` Calibrated to your ${cogMap.learning_modality} modality.`}
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div className={m.role === 'elle' ? 'msg-elle' : 'msg-user'} style={{ maxWidth: '90%', padding: '16px 20px' }}>
              {m.role === 'elle' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.6rem', color: 'var(--red)' }}>Elle · Teaching</span>
                </div>
              )}
              <div style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1rem', color: 'rgba(245,240,232,0.9)', lineHeight: 1.6 }}>
                {renderContent(m.content)}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div className="msg-elle" style={{ padding: '16px 20px' }}>
              <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.7rem', color: 'var(--dim)' }}>thinking through the architecture...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ border: '1px solid var(--border)', background: 'var(--card)', display: 'flex', marginBottom: 24 }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }}}
          placeholder="Answer, question, or paste code you wrote..."
          rows={4}
          style={{ flex: 1, background: 'transparent', border: 'none', padding: '16px 20px', color: 'var(--cream)', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1rem', resize: 'none' }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{ padding: '0 24px', background: input.trim() && !loading ? 'var(--red)' : 'transparent', border: 'none', borderLeft: '1px solid var(--border)', color: input.trim() && !loading ? 'var(--cream)' : 'var(--dim)', cursor: 'pointer', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.8rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

// ─── Profile Screen ───────────────────────────────────────────

function ProfileScreen({ user, token, cogMap, onCogMapUpdate }: {
  user: User; token: string; cogMap: CognitiveMap | null;
  onCogMapUpdate: (map: CognitiveMap) => void;
}) {
  const [tab, setTab] = useState<'map' | 'onboard' | 'voice'>('map');
  const [responses, setResponses] = useState<{ question: string; answer: string }[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answer, setAnswer] = useState('');
  const [mapping, setMapping] = useState(false);

  const ONBOARD_Qs = [
    "When you're trying to understand something complex, do you need to see the whole picture first, or do you build it piece by piece?",
    "Describe a time you changed your mind about something important. What shifted?",
    "When something feels wrong but you can't explain why — what do you do with that?",
    "What's the difference between knowing something and understanding it?",
    "How do you know when you're ready to make a decision?",
  ];

  const submitAnswer = () => {
    if (!answer.trim()) return;
    const newResponses = [...responses, { question: ONBOARD_Qs[currentQ], answer: answer.trim() }];
    setResponses(newResponses);
    setAnswer('');

    if (currentQ < ONBOARD_Qs.length - 1) {
      setCurrentQ(q => q + 1);
    } else {
      runMapping(newResponses);
    }
  };

  const runMapping = async (rs: { question: string; answer: string }[]) => {
    setMapping(true);
    try {
      const data = await callEdge('elle-cognitive-mapping', {
        action: cogMap ? 'update' : 'initialize',
        user_id: user.id,
        responses: rs,
      }, token);
      if (data.mapped) onCogMapUpdate(data);
    } catch {}
    finally { setMapping(false); }
  };

  return (
    <div className="elle-screen" style={{ padding: '48px', maxWidth: 800 }}>
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--red)', textTransform: 'uppercase', marginBottom: 4 }}>
          My Profile
        </p>
        <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2rem', color: 'var(--cream)', fontWeight: 400 }}>
          {user.display_name || user.email}
        </h2>
      </div>

      <div style={{ display: 'flex', gap: 2, marginBottom: 32, background: 'var(--border)' }}>
        {(['map', 'onboard', 'voice'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: '12px', background: tab === t ? 'var(--red)' : 'var(--card)', border: 'none', color: tab === t ? 'var(--cream)' : 'var(--dim)', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
            {t === 'map' ? 'Cognitive Map' : t === 'onboard' ? 'Update Mapping' : 'Voice Settings'}
          </button>
        ))}
      </div>

      {tab === 'map' && cogMap && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {[
            { label: 'IQ Index', val: cogMap.iq_index, desc: 'Reasoning pattern, abstraction, pattern recognition' },
            { label: 'EQ Index', val: cogMap.eq_index, desc: 'Emotional vocabulary, self-awareness, relational framing' },
            { label: 'Threshold Index', val: cogMap.threshold_index, desc: 'Where IQ and EQ converge — where you make decisions' },
          ].map(m => (
            <div key={m.label} style={{ padding: 24, background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <p style={{ fontFamily: '"Playfair Display", serif', color: 'var(--cream)', fontSize: '1.1rem', marginBottom: 4 }}>{m.label}</p>
                  <p style={{ fontFamily: '"Barlow Condensed", sans-serif', color: 'var(--dim)', fontSize: '0.85rem' }}>{m.desc}</p>
                </div>
                <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '1.5rem', color: 'var(--gold)' }}>{Math.round(m.val * 100)}</span>
              </div>
              <div style={{ height: 3, background: 'rgba(245,240,232,0.06)' }}>
                <div className="axis-bar" style={{ height: '100%', background: 'var(--red)', width: `${m.val * 100}%` }} />
              </div>
            </div>
          ))}

          <div style={{ padding: 24, background: 'var(--card)', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { label: 'Learning Modality', val: cogMap.learning_modality },
              { label: 'Communication Style', val: cogMap.communication_style },
              { label: 'Confidence', val: cogMap.confidence },
            ].map(f => (
              <div key={f.label}>
                <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>{f.label}</p>
                <p style={{ fontFamily: '"Playfair Display", serif', color: 'var(--cream)', fontSize: '1rem', textTransform: 'capitalize' }}>{f.val}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'map' && !cogMap && (
        <div style={{ padding: 48, textAlign: 'center', border: '1px solid var(--border)' }}>
          <p style={{ fontFamily: '"Playfair Display", serif', color: 'var(--cream)', fontSize: '1.2rem', marginBottom: 12 }}>No map yet.</p>
          <p style={{ fontFamily: '"Barlow Condensed", sans-serif', color: 'var(--dim)', marginBottom: 24 }}>Complete the onboarding questions so Elle can build your cognitive profile.</p>
          <button onClick={() => setTab('onboard')} style={{ background: 'var(--red)', border: 'none', color: 'var(--cream)', padding: '12px 32px', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>
            Begin Mapping
          </button>
        </div>
      )}

      {tab === 'onboard' && (
        <div>
          {mapping ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.7rem', color: 'var(--dim)' }}>Elle is reading your responses...</p>
            </div>
          ) : currentQ < ONBOARD_Qs.length ? (
            <div style={{ padding: 32, background: 'var(--card)', border: '1px solid var(--border)' }}>
              <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.6rem', color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 16 }}>
                Question {currentQ + 1} of {ONBOARD_Qs.length}
              </p>
              <p style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.3rem', color: 'var(--cream)', fontWeight: 400, lineHeight: 1.5, marginBottom: 24 }}>
                {ONBOARD_Qs[currentQ]}
              </p>
              <textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitAnswer(); }}}
                placeholder="Take your time. Elle reads what's between the lines too."
                rows={5}
                style={{ width: '100%', background: 'var(--ink)', border: '1px solid var(--border)', padding: '16px', color: 'var(--cream)', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1rem', resize: 'none', boxSizing: 'border-box', marginBottom: 16 }}
              />
              <button onClick={submitAnswer} disabled={!answer.trim()}
                style={{ background: answer.trim() ? 'var(--red)' : 'transparent', border: '1px solid var(--border)', color: answer.trim() ? 'var(--cream)' : 'var(--dim)', padding: '12px 32px', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>
                {currentQ === ONBOARD_Qs.length - 1 ? 'Complete Mapping' : 'Next'}
              </button>
            </div>
          ) : (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <p style={{ fontFamily: '"Playfair Display", serif', color: 'var(--cream)', fontSize: '1.2rem' }}>Mapping complete. Check your cognitive map.</p>
            </div>
          )}
        </div>
      )}

      {tab === 'voice' && (
        <div style={{ padding: 32, background: 'var(--card)', border: '1px solid var(--border)' }}>
          <p style={{ fontFamily: '"Playfair Display", serif', color: 'var(--cream)', fontSize: '1.2rem', marginBottom: 8 }}>Voice Settings</p>
          <p style={{ fontFamily: '"Barlow Condensed", sans-serif', color: 'var(--dim)', marginBottom: 24 }}>
            Elle uses your device's native speech synthesis. Pair your Bluetooth headset at the OS level — the browser automatically follows the active audio device. No additional configuration needed.
          </p>
          <div style={{ padding: 16, background: 'var(--ink)', border: '1px solid var(--border)', marginBottom: 16 }}>
            <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.6rem', color: 'var(--dim)' }}>
              Web Speech API · Browser Native · Bluetooth: OS-level pairing
            </p>
          </div>
          <button onClick={() => {
            const utt = new SpeechSynthesisUtterance("I'm Elle. Voice is active. Your Bluetooth device will work if paired at the OS level.");
            window.speechSynthesis.speak(utt);
          }} style={{ background: 'var(--red)', border: 'none', color: 'var(--cream)', padding: '12px 32px', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>
            Test Voice
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Community Signals Screen ─────────────────────────────────

function SignalsScreen({ user, token }: { user: User; token: string }) {
  const [signals, setSignals] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    callEdge('elle-community-signals', { action: 'read' }, token)
      .then(d => setSignals(d.signals || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const runAggregate = async () => {
    setRunning(true);
    try {
      const data = await callEdge('elle-community-signals', { action: 'aggregate', state: user.state || 'MO', time_window_hours: 48 }, token);
      setSignals(prev => [data, ...prev]);
    } catch {} finally { setRunning(false); }
  };

  return (
    <div className="elle-screen" style={{ padding: '48px', maxWidth: 800 }}>
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--red)', textTransform: 'uppercase', marginBottom: 4 }}>Community Intelligence</p>
          <p style={{ fontFamily: '"Barlow Condensed", sans-serif', color: 'var(--dim)', fontSize: '0.9rem' }}>What the community is carrying. No individual exposed. Patterns only.</p>
        </div>
        <button onClick={runAggregate} disabled={running}
          style={{ background: running ? 'transparent' : 'var(--red)', border: '1px solid var(--border)', color: running ? 'var(--dim)' : 'var(--cream)', padding: '10px 20px', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.8rem', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>
          {running ? 'Aggregating...' : 'Run Now'}
        </button>
      </div>

      {loading ? (
        <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.7rem', color: 'var(--dim)' }}>Loading signals...</p>
      ) : signals.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', border: '1px solid var(--border)' }}>
          <p style={{ fontFamily: '"Playfair Display", serif', color: 'var(--cream)', fontSize: '1.1rem', marginBottom: 8 }}>No signals yet.</p>
          <p style={{ fontFamily: '"Barlow Condensed", sans-serif', color: 'var(--dim)' }}>Run an aggregation to see community patterns.</p>
        </div>
      ) : signals.map((s, i) => (
        <div key={i} style={{ padding: 24, background: 'var(--card)', border: '1px solid var(--border)', marginBottom: 12 }}>
          <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>
            {new Date(s.computed_at as string).toLocaleString()} · {s.signal_count as number} signals
          </p>
          {s.suppression_synthesis && (
            <p style={{ fontFamily: '"Playfair Display", serif', color: 'var(--cream)', fontSize: '1rem', lineHeight: 1.6, marginBottom: 16, fontStyle: 'italic' }}>
              "{s.suppression_synthesis as string}"
            </p>
          )}
          {Array.isArray(s.dominant_axes) && (s.dominant_axes as { axis: string; pct: number }[]).map((a) => (
            <div key={a.axis} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.6rem', color: 'var(--dim)' }}>{a.axis}</span>
                <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.6rem', color: 'var(--gold)' }}>{a.pct}%</span>
              </div>
              <div style={{ height: 2, background: 'rgba(245,240,232,0.06)' }}>
                <div style={{ height: '100%', background: 'var(--red)', width: `${a.pct}%`, transition: 'width 0.8s ease' }} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Threads Screen ───────────────────────────────────────────

function ThreadsScreen({ user, token }: { user: User; token: string }) {
  return (
    <div className="elle-screen" style={{ padding: '48px', maxWidth: 800 }}>
      <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--red)', textTransform: 'uppercase', marginBottom: 8 }}>My Threads</p>
      <p style={{ fontFamily: '"Barlow Condensed", sans-serif', color: 'var(--dim)', marginBottom: 32 }}>Ongoing situations Elle is tracking for you.</p>
      <div style={{ padding: 48, textAlign: 'center', border: '1px solid var(--border)' }}>
        <p style={{ fontFamily: '"Playfair Display", serif', color: 'var(--cream)', fontSize: '1.1rem', marginBottom: 8 }}>Threads build as you use Elle.</p>
        <p style={{ fontFamily: '"Barlow Condensed", sans-serif', color: 'var(--dim)' }}>Every Ask Elle conversation becomes a thread Elle can reference and continue.</p>
      </div>
    </div>
  );
}

// ─── Main ELLEApp ─────────────────────────────────────────────

export function ELLEApp() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState('');
  const [screen, setScreen] = useState<Screen>('home');
  const [cogMap, setCogMap] = useState<CognitiveMap | null>(null);

  // Load session from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('elle_session');
    if (saved) {
      try {
        const { user: u, token: t } = JSON.parse(saved);
        setUser(u); setToken(t);
        loadCogMap(u.id, t);
      } catch {}
    }
  }, []);

  const loadCogMap = useCallback(async (userId: string, t: string) => {
    try {
      const data = await callEdge('elle-cognitive-mapping', { action: 'read', user_id: userId }, t);
      if (data.iq_index !== undefined) setCogMap(data);
    } catch {}
  }, []);

  const handleAuth = (u: User, t: string) => {
    setUser(u); setToken(t);
    localStorage.setItem('elle_session', JSON.stringify({ user: u, token: t }));
    loadCogMap(u.id, t);
  };

  if (!user) return <AuthScreen onAuth={handleAuth} />;

  return (
    <>
      <style>{PLATFORM_STYLES}</style>
      <div className="grain" />
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--ink)', color: 'var(--cream)' }}>
        <Sidebar screen={screen} setScreen={setScreen} user={user} sovereign={SOVEREIGN} />
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {screen === 'home' && <HomeScreen user={user} cogMap={cogMap} setScreen={setScreen} />}
          {screen === 'ask' && <AskScreen user={user} token={token} sovereign={SOVEREIGN} />}
          {screen === 'learn' && <LearnScreen user={user} token={token} cogMap={cogMap} sovereign={SOVEREIGN} />}
          {screen === 'profile' && <ProfileScreen user={user} token={token} cogMap={cogMap} onCogMapUpdate={setCogMap} />}
          {screen === 'signals' && <SignalsScreen user={user} token={token} />}
          {screen === 'threads' && <ThreadsScreen user={user} token={token} />}
        </main>
      </div>
    </>
  );
}
