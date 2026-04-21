import React, { useState, useRef, useEffect } from 'react';
import { callEdge, SOVEREIGN, OLLAMA_URL, OLLAMA_MODEL } from '../lib/supabase';
import type { User, CognitiveMap, Message } from '../lib/types';

interface Props {
  user: User;
  token: string;
  cogMap: CognitiveMap | null;
}

function renderContent(content: string) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      const code = part.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
      return (
        <div key={i} style={{
          background: 'rgba(0,0,0,0.5)',
          border: '1px solid rgba(139,26,26,0.25)',
          borderLeft: '3px solid #8B1A1A',
          fontFamily: '"Space Mono", monospace',
          fontSize: '0.75rem',
          lineHeight: 1.6,
          padding: '14px 18px',
          overflowX: 'auto',
          whiteSpace: 'pre',
          borderRadius: '0 4px 4px 0',
          margin: '10px 0',
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

function buildTeachSystem(user: Props['user'], cogMap: Props['cogMap']): string {
  return `You are Elle teaching ${user.display_name || 'there'} to code — rigorously.

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

export function LearnScreen({ user, token, cogMap }: Props) {
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: 820, padding: '48px 48px 0', animation: 'slideIn 0.4s ease forwards' }}>

      <div style={{ marginBottom: 24 }}>
        <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.6rem', letterSpacing: '0.2em', color: '#8B1A1A', textTransform: 'uppercase', marginBottom: 4, margin: '0 0 4px' }}>
          Learn to Code · Elle Teaches
        </p>
        <p style={{ fontFamily: '"Barlow Condensed", sans-serif', color: '#6a6a7a', fontSize: '0.9rem', margin: 0 }}>
          Theory first. Architecture before syntax. Real code from Elle's codebase.
          {cogMap ? ` Calibrated to your ${cogMap.learning_modality} modality.` : ''}
        </p>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24 }}>
        {messages.map((m) => (
          <div key={m.ts} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '92%',
              padding: '16px 20px',
              ...(m.role === 'elle'
                ? { background: 'rgba(139,26,26,0.06)', border: '1px solid rgba(139,26,26,0.2)', borderRadius: '0 12px 12px 12px' }
                : { background: 'rgba(245,240,232,0.04)', border: '1px solid rgba(245,240,232,0.08)', borderRadius: '12px 0 12px 12px' }
              ),
            }}>
              {m.role === 'elle' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', color: '#8B1A1A' }}>Elle · Teaching</span>
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
            <div style={{ padding: '16px 20px', background: 'rgba(139,26,26,0.06)', border: '1px solid rgba(139,26,26,0.2)', borderRadius: '0 12px 12px 12px' }}>
              <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.65rem', color: '#6a6a7a' }}>thinking through the architecture...</span>
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
          placeholder="Answer, question, or paste code you wrote... (Enter to send)"
          rows={4}
          style={{ flex: 1, background: 'transparent', border: 'none', padding: '16px 20px', color: '#F5F0E8', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1rem', resize: 'none' }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{ padding: '0 24px', background: input.trim() && !loading ? '#8B1A1A' : 'transparent', border: 'none', borderLeft: '1px solid rgba(139,26,26,0.2)', color: input.trim() && !loading ? '#F5F0E8' : '#6a6a7a', cursor: input.trim() && !loading ? 'pointer' : 'default', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
