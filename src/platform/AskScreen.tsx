import React, { useState, useRef, useEffect } from 'react';
import { callEdge, SOVEREIGN } from '../lib/supabase';
import type { User, Message } from '../lib/types';
import { useHeadMotion } from './hooks/useHeadMotion';

interface Props {
  user: User;
  token: string;
}

export function AskScreen({ user: _user, token }: Props) {
  const { motion, available: motionAvailable } = useHeadMotion();
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
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || loading) return;

    const userMsg: Message = { role: 'user', content, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const data = await callEdge(
        SOVEREIGN ? 'elle-conversation' : 'elle-reasoning-engine',
        { query: content, conversation_id: convId, ...(motion ? { head_motion: motion } : {}) },
        token
      );

      const reply = String(data.response || data.content || 'Elle is thinking.');
      setMessages(prev => [...prev, {
        role: 'elle',
        content: reply,
        ts: Date.now(),
        axis: data.load_bearing_axis as number | undefined,
        method: data.method as string | undefined,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'elle',
        content: 'Something interrupted. Try again.',
        ts: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleVoice = () => {
    type SR = { new(): { continuous: boolean; interimResults: boolean; onresult: (e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => void; onend: () => void; start: () => void; stop: () => void } };
    const w = window as unknown as { webkitSpeechRecognition?: SR; SpeechRecognition?: SR };
    const SRClass = w.webkitSpeechRecognition || w.SpeechRecognition;

    if (!SRClass) return;
    if (voiceActive) { recognitionRef.current?.stop(); setVoiceActive(false); return; }

    const rec = new SRClass();
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => send(e.results[0][0].transcript);
    rec.onend = () => setVoiceActive(false);
    recognitionRef.current = rec as unknown as { stop: () => void };
    rec.start();
    setVoiceActive(true);
  };

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text.replace(/[#*`]/g, ''));
    utt.rate = 1.0;
    window.speechSynthesis.speak(utt);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: 800, padding: '48px 48px 0', animation: 'slideIn 0.4s ease forwards' }}>

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.6rem', letterSpacing: '0.2em', color: '#8B1A1A', textTransform: 'uppercase', margin: '0 0 4px' }}>
            Ask Elle {SOVEREIGN ? '· Sovereign · Local' : '· Millennium Falcon · 17 Axes'}
          </p>
          {motionAvailable && motion && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} title={`pitch ${motion.pitch.toFixed(2)} · roll ${motion.roll.toFixed(2)} · yaw ${motion.yaw.toFixed(2)}`}>
              {([
                { label: 'P', value: motion.pitch },
                { label: 'R', value: motion.roll },
                { label: 'Y', value: motion.yaw },
              ] as const).map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.4rem', color: '#8B1A1A' }}>{label}</span>
                  <div style={{ width: 3, height: 16, background: 'rgba(245,240,232,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      width: '100%',
                      height: `${Math.min(100, Math.abs(value / Math.PI) * 100)}%`,
                      background: Math.abs(value) > 0.3 ? '#C9A84C' : '#8B1A1A',
                      transition: 'height 0.1s ease',
                      marginTop: value < 0 ? 'auto' : 0,
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {motionAvailable && !motion && (
            <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.45rem', color: '#6a6a7a', letterSpacing: '0.1em' }}>
              AIRPODS · WAITING
            </span>
          )}
        </div>
        <p style={{ fontFamily: '"Barlow Condensed", sans-serif', color: '#6a6a7a', fontSize: '0.9rem', margin: 0 }}>
          Every query runs through full structural analysis. Bilateral suppression is always load-bearing.
        </p>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24 }}>
        {messages.map((m) => (
          <div key={m.ts} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '82%',
              padding: '16px 20px',
              ...(m.role === 'elle'
                ? { background: 'rgba(139,26,26,0.06)', border: '1px solid rgba(139,26,26,0.2)', borderRadius: '0 12px 12px 12px' }
                : { background: 'rgba(245,240,232,0.04)', border: '1px solid rgba(245,240,232,0.08)', borderRadius: '12px 0 12px 12px' }
              ),
            }}>
              {m.role === 'elle' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', color: '#8B1A1A' }}>Elle</span>
                  {m.axis && <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.5rem', color: '#6a6a7a' }}>· axis {m.axis}</span>}
                  {m.method && <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.5rem', color: '#6a6a7a' }}>· {m.method}</span>}
                  <button
                    onClick={() => speak(m.content)}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#6a6a7a', fontSize: '0.75rem', padding: '0 4px' }}
                    title="Speak response"
                  >▶</button>
                </div>
              )}
              <p style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1rem', color: 'rgba(245,240,232,0.9)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
                {m.content}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '16px 20px', background: 'rgba(139,26,26,0.06)', border: '1px solid rgba(139,26,26,0.2)', borderRadius: '0 12px 12px 12px' }}>
              <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.65rem', color: '#6a6a7a' }}>
                {SOVEREIGN ? 'thinking locally...' : 'thinking across 17 axes...'}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ border: '1px solid rgba(139,26,26,0.3)', background: '#13131f', display: 'flex', marginBottom: 24 }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }}}
          placeholder="What do you need to understand... (Enter to send)"
          rows={3}
          style={{ flex: 1, background: 'transparent', border: 'none', padding: '16px 20px', color: '#F5F0E8', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1rem', resize: 'none' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(139,26,26,0.2)' }}>
          <button
            onClick={toggleVoice}
            title="Voice input (uses device microphone — Bluetooth works via OS pairing)"
            style={{ flex: 1, padding: '0 16px', background: voiceActive ? 'rgba(139,26,26,0.2)' : 'transparent', border: 'none', color: voiceActive ? '#8B1A1A' : '#6a6a7a', cursor: 'pointer', fontSize: '1rem' }}
          >
            {voiceActive ? '⏹' : '🎤'}
          </button>
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            style={{ flex: 1, padding: '0 20px', background: input.trim() && !loading ? '#8B1A1A' : 'transparent', border: 'none', borderTop: '1px solid rgba(139,26,26,0.2)', color: input.trim() && !loading ? '#F5F0E8' : '#6a6a7a', cursor: input.trim() && !loading ? 'pointer' : 'default', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
