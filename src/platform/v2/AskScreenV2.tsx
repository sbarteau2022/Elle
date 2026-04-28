import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from './ThemeProvider';
import { Glass, Chip, H, Sparkle, Btn } from './primitives';
import { callEdge, SOVEREIGN } from '../../lib/supabase';
import type { User, Message } from '../../lib/types';
import { useHeadMotion } from '../hooks/useHeadMotion';

interface Props {
  user: User;
  token: string;
}

export function AskScreenV2({ user: _user, token }: Props) {
  const t = useTheme();
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
    <div style={{ padding: '28px 48px 64px', maxWidth: 900, margin: '0 auto', fontFamily: t.fonts.sans, height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <H level={2} style={{ marginBottom: 4 }}>Ask Elle</H>
          <div style={{ fontSize: 13, color: t.ink3, fontFamily: t.fonts.sans }}>
            {SOVEREIGN ? 'Sovereign · Local' : 'Millennium Falcon · 17 axes · full structural analysis'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {motionAvailable && motion && (
            <Chip tone="ai" icon={<Sparkle size={10} />}>AirPods · live</Chip>
          )}
          {SOVEREIGN ? <Chip tone="warn">Local</Chip> : <Chip tone="accent">17 axes</Chip>}
        </div>
      </div>

      {/* Messages */}
      <Glass padding={0} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div key={m.ts} style={{ display: 'flex', gap: 10, flexDirection: isUser ? 'row-reverse' : 'row' }}>
                <div style={{
                  flexShrink: 0, width: 28, height: 28, borderRadius: 9,
                  background: isUser ? t.accent : t.surfaceSoft,
                  color: isUser ? '#fff' : t.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 600, fontFamily: t.fonts.sans,
                }}>{isUser ? 'U' : <Sparkle size={12} color="#fff" />}</div>
                <div style={{ maxWidth: '78%' }}>
                  <div style={{
                    padding: '11px 14px', borderRadius: 14,
                    background: isUser ? t.accent : t.bgElev,
                    color: isUser ? '#fff' : t.ink,
                    border: isUser ? 'none' : `1px solid ${t.border}`,
                    fontSize: 14, lineHeight: 1.55, letterSpacing: -0.1,
                    whiteSpace: 'pre-wrap',
                    borderTopLeftRadius: !isUser ? 4 : 14, borderTopRightRadius: isUser ? 4 : 14,
                  }}>
                    {m.content}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                    {!isUser && m.axis && <Chip tone="ai">axis {m.axis}</Chip>}
                    {!isUser && m.method && <Chip>{m.method}</Chip>}
                    {!isUser && (
                      <button onClick={() => speak(m.content)} style={{ background: 'transparent', border: 'none', color: t.ink3, cursor: 'pointer', fontSize: 11, fontFamily: t.fonts.mono }}>
                        ▶ speak
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {loading && (
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 9, background: t.surfaceSoft, color: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkle size={12} />
              </div>
              <div style={{ padding: '11px 14px', borderRadius: 14, background: t.bgElev, border: `1px solid ${t.border}`, fontSize: 13, color: t.ink3, fontStyle: 'italic' }}>
                {SOVEREIGN ? 'thinking locally…' : 'thinking across 17 axes…'}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </Glass>

      {/* Composer */}
      <Glass padding={12} style={{ border: `1px solid ${t.accent}40`, boxShadow: `0 0 0 4px ${t.accentSoft}` }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }}}
          placeholder="What do you need to understand…"
          rows={3}
          style={{
            width: '100%', background: 'transparent', border: 'none', outline: 'none',
            fontFamily: t.fonts.sans, fontSize: 14, color: t.ink, lineHeight: 1.5, resize: 'none',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
          <Chip>↵ send · ⇧↵ newline</Chip>
          <button onClick={toggleVoice} style={{
            padding: '4px 10px', borderRadius: 8,
            background: voiceActive ? t.accentSoft : 'transparent',
            border: `1px solid ${voiceActive ? t.accent : t.border}`,
            color: voiceActive ? t.accent : t.ink3,
            fontFamily: t.fonts.sans, fontSize: 11, cursor: 'pointer',
          }}>{voiceActive ? '⏹ recording' : '🎤 voice'}</button>
          <div style={{ flex: 1 }} />
          <Btn variant="primary" icon={<span>↵</span>} onClick={() => send()} style={{ opacity: input.trim() && !loading ? 1 : 0.5 }}>
            Send
          </Btn>
        </div>
      </Glass>
    </div>
  );
}
