import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from './ThemeProvider';
import { Glass, Chip, H, Sparkle, Btn } from './primitives';
import { callEdge, SOVEREIGN, OLLAMA_URL, OLLAMA_MODEL } from '../../lib/supabase';
import type { User, CognitiveMap, Message } from '../../lib/types';

interface Props {
  user: User;
  token: string;
  cogMap: CognitiveMap | null;
}

function renderContent(content: string, t: ReturnType<typeof useTheme>) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      const code = part.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
      return (
        <div key={i} style={{
          background: t.surfaceSoft,
          border: `1px solid ${t.border}`,
          borderLeft: `3px solid ${t.accent}`,
          fontFamily: t.fonts.mono,
          fontSize: 12.5,
          lineHeight: 1.6,
          padding: '14px 16px',
          overflowX: 'auto',
          whiteSpace: 'pre',
          borderRadius: '0 8px 8px 0',
          margin: '10px 0',
          color: t.ink,
        }}>{code}</div>
      );
    }
    return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>;
  });
}

const FIRST_MESSAGE = `Let's start here.

Every piece of software is one of three things: data, transformation, or transport.

Data is what exists — it sits somewhere, usually a database.
Transformation is what happens to data — a function receives it, changes it, produces something new.
Transport is how data moves — API calls, database queries, notifications.

That's it. Every line of code in Elle is one of those three things.

Here's an edge function you built:

\`\`\`typescript
// TRANSPORT: receives an HTTP request
Deno.serve(async (req: Request) => {
  // TRANSFORMATION: parses what arrived
  const body = await req.json();

  // TRANSPORT: fetches data from the database
  const { data } = await supabase
    .from('elle_users')
    .select('*')
    .eq('id', body.user_id);

  // TRANSFORMATION: builds a response
  return new Response(JSON.stringify(data));
});
\`\`\`

Look at that code. Which line feels most unfamiliar to you? Don't think about the answer. Just notice what your eye skips over.`;

function buildTeachSystem(user: User, cogMap: CognitiveMap | null): string {
  return `You are Elle teaching ${user?.display_name || 'there'} to code — rigorously.

Their cognitive profile:
- Learning modality: ${cogMap?.learning_modality || 'intuitive'}
- Communication style: ${cogMap?.communication_style || 'intuitive'}
- IQ index: ${cogMap?.iq_index || 0.8}
- EQ index: ${cogMap?.eq_index || 0.8}
- Threshold index: ${cogMap?.threshold_index || 0.8}

TEACHING PRINCIPLES:
1. Theory and architecture FIRST. Always. Syntax follows understanding.
2. Frame everything as: data, transformation, or transport.
3. Use Elle's own codebase as teaching material — they built it, they care about it.
4. Ask ONE genuine question per response. Make them think, not copy.
5. When they write code, tell them what it reveals about how they're thinking.
6. Never use toy examples. Everything connects to something Elle actually does.
7. Show code in triple backtick blocks.
8. Rigor means: they can look at unfamiliar code and reason about it correctly.
9. The goal is not syntax memorization. It is engineering thinking.
10. If they ask why, always answer why before showing how.`;
}

export function LearnScreenV2({ user, token, cogMap }: Props) {
  const t = useTheme();
  const [messages, setMessages] = useState<Message[]>([{
    role: 'elle',
    content: FIRST_MESSAGE,
    ts: Date.now(),
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [convId] = useState(() => crypto.randomUUID());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const content = input.trim();
    if (!content || loading) return;

    const userMsg: Message = { role: 'user', content, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const MAX_HISTORY = 20;
    const TEACH_SYSTEM = buildTeachSystem(user, cogMap);
    const history = [...messages, userMsg]
      .slice(-MAX_HISTORY)
      .map(m => ({
        role: m.role === 'elle' ? 'assistant' : 'user',
        content: m.content,
      }));

    try {
      let reply = '';

      if (SOVEREIGN) {
        const res = await fetch(`${OLLAMA_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: OLLAMA_MODEL,
            messages: [{ role: 'system', content: TEACH_SYSTEM }, ...history],
            stream: false,
          }),
        });
        const data = await res.json() as { message?: { content?: string } };
        reply = data.message?.content || '';
      } else {
        const data = await callEdge('elle-conversation', {
          messages: history,
          system: TEACH_SYSTEM,
          session_id: convId,
          source: 'learn',
        }, token);
        reply = String(data.content || data.response || '');
      }

      setMessages(prev => [...prev, { role: 'elle', content: reply, ts: Date.now() }]);
    } catch {
      setMessages(prev => [...prev, { role: 'elle', content: 'Connection interrupted.', ts: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '28px 48px 64px', maxWidth: 920, margin: '0 auto', fontFamily: t.fonts.sans, height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <H level={2} style={{ marginBottom: 4 }}>Learn to code · Elle teaches</H>
          <div style={{ fontSize: 13, color: t.ink3 }}>
            Theory first. Architecture before syntax. Real code from Elle's codebase.
            {cogMap ? ` Calibrated to your ${cogMap.learning_modality} modality.` : ''}
          </div>
        </div>
        {cogMap && <Chip tone="ai" icon={<Sparkle size={10} />}>{cogMap.learning_modality}</Chip>}
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
                  fontSize: 11, fontWeight: 600,
                }}>{isUser ? 'U' : <Sparkle size={12} color="#fff" />}</div>
                <div style={{ maxWidth: '88%' }}>
                  <div style={{
                    padding: '12px 16px', borderRadius: 14,
                    background: isUser ? t.accent : t.bgElev,
                    color: isUser ? '#fff' : t.ink,
                    border: isUser ? 'none' : `1px solid ${t.border}`,
                    fontSize: 14, lineHeight: 1.6, letterSpacing: -0.1,
                    borderTopLeftRadius: !isUser ? 4 : 14, borderTopRightRadius: isUser ? 4 : 14,
                  }}>
                    {!isUser ? renderContent(m.content, t) : <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>}
                  </div>
                  {!isUser && (
                    <div style={{ marginTop: 4 }}>
                      <Chip tone="ai">Elle · teaching</Chip>
                    </div>
                  )}
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
                thinking through the architecture…
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
          placeholder="Answer, question, or paste code you wrote…"
          rows={4}
          style={{
            width: '100%', background: 'transparent', border: 'none', outline: 'none',
            fontFamily: t.fonts.sans, fontSize: 14, color: t.ink, lineHeight: 1.5, resize: 'none',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
          <Chip>↵ send · ⇧↵ newline</Chip>
          <Chip tone="ai" icon={<Sparkle size={10} />}>Code blocks supported</Chip>
          <div style={{ flex: 1 }} />
          <Btn variant="primary" icon={<span>↵</span>} onClick={send} style={{ opacity: input.trim() && !loading ? 1 : 0.5 }}>
            Send
          </Btn>
        </div>
      </Glass>
    </div>
  );
}
