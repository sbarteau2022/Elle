import React, { useState } from 'react';
import { useTheme } from './ThemeProvider';
import { Glass, Chip, H, Sparkle, Btn, Meter, Caret } from './primitives';
import { callEdge } from '../../lib/supabase';
import type { User, DuelTurn, DuelScore } from '../../lib/types';

interface Props {
  user: User;
  token: string;
}

interface DuelState {
  duel_id: string | null;
  opponent: string;
  scenario: string;
  question_type: string;
  turns: DuelTurn[];
  score: DuelScore | null;
  status: 'idle' | 'active' | 'complete';
  synthesis?: string;
  result?: string;
}

const EMPTY: DuelState = {
  duel_id: null, opponent: '—', scenario: 'No active duel.',
  question_type: '—', turns: [], score: null, status: 'idle',
};

function TurnBubble({ turn }: { turn: DuelTurn }) {
  const t = useTheme();
  const isUser = turn.side === 'u';
  return (
    <div style={{ display: 'flex', gap: 10, flexDirection: isUser ? 'row-reverse' : 'row' }}>
      <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 9,
        background: isUser ? t.accent : t.surfaceSoft, color: isUser ? '#fff' : t.ink,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 600, fontFamily: t.fonts.sans,
        border: isUser ? `1px solid ${t.accent}` : `1px solid ${t.border}` }}>
        {isUser ? 'U' : '✦'}
      </div>
      <div style={{ maxWidth: '82%' }}>
        <div style={{ padding: '10px 14px', borderRadius: 14,
          background: isUser ? t.accent : t.bgElev, color: isUser ? '#fff' : t.ink,
          border: isUser ? 'none' : `1px solid ${t.border}`,
          fontSize: 13.5, lineHeight: 1.55, letterSpacing: -0.1,
          borderTopLeftRadius: !isUser ? 4 : 14, borderTopRightRadius: isUser ? 4 : 14 }}>
          {turn.text}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
          <span style={{ fontSize: 10, color: t.ink3, fontFamily: t.fonts.mono }}>T{String(turn.n).padStart(2, '0')}</span>
          {turn.tactic && <Chip tone="danger">{turn.tactic.src} {turn.tactic.ref} · {turn.tactic.name}</Chip>}
          {turn.composure != null && <Chip tone="success">Composure {Math.round(turn.composure * 100)}</Chip>}
        </div>
      </div>
    </div>
  );
}

function WRScore({ score }: { score: DuelScore }) {
  const t = useTheme();
  const gauges = [
    { k: 'Composure', v: score.composure },
    { k: 'Recognition', v: score.recognition },
    { k: 'Walkback', v: score.walkback },
    { k: 'Framework', v: score.framework },
  ];
  return (
    <Glass padding={16}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {gauges.map(g => (
          <div key={g.k}>
            <div style={{ fontSize: 10, color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{g.k}</div>
            <div style={{ fontFamily: t.fonts.serif, fontSize: 28, color: t.ink, letterSpacing: -1 }}>{Math.round(g.v * 100)}</div>
            <Meter value={g.v} max={1} style={{ marginTop: 4 }} />
          </div>
        ))}
      </div>
    </Glass>
  );
}

export function WarRoomView({ user, token }: Props) {
  const t = useTheme();
  const [state, setState] = useState<DuelState>(EMPTY);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const startDuel = async () => {
    setBusy(true);
    try {
      const data = await callEdge('elle-duel-engine', { action: 'start', user_id: user.id }, token);
      setState({
        duel_id: (data.duel_id as string) || null,
        opponent: (data.opponent as string) || 'Cerberus-03',
        scenario: (data.scenario as string) || '',
        question_type: (data.question_type as string) || 'Necessary Assumption',
        turns: (data.turns as DuelTurn[]) || [],
        score: null,
        status: 'active',
      });
    } catch (err) {
      console.error('start failed', err);
    } finally {
      setBusy(false);
    }
  };

  const sendTurn = async () => {
    if (!draft.trim() || !state.duel_id || state.status !== 'active') return;
    setBusy(true);
    const text = draft.trim();
    const userTurn: DuelTurn = {
      n: state.turns.length + 1, side: 'u', text, composure: 0.85,
    };
    setState(s => ({ ...s, turns: [...s.turns, userTurn] }));
    setDraft('');

    try {
      const data = await callEdge('elle-duel-engine', {
        action: 'turn', duel_id: state.duel_id, user_text: text,
      }, token);
      const opp = data.turn as DuelTurn | undefined;
      if (opp) {
        setState(s => ({ ...s, turns: [...s.turns, opp] }));
      }
    } catch (err) {
      console.error('turn failed', err);
    } finally {
      setBusy(false);
    }
  };

  const endDuel = async () => {
    if (!state.duel_id) return;
    setBusy(true);
    try {
      const data = await callEdge('elle-duel-engine', { action: 'end', duel_id: state.duel_id }, token);
      setState(s => ({
        ...s, status: 'complete',
        score: data.score as DuelScore,
        synthesis: data.synthesis as string,
        result: data.result as string,
      }));
    } catch (err) {
      console.error('end failed', err);
    } finally {
      setBusy(false);
    }
  };

  if (state.status === 'idle') {
    return (
      <div style={{ padding: '28px 48px 64px', maxWidth: 900, margin: '0 auto', fontFamily: t.fonts.sans }}>
        <H level={2} style={{ marginBottom: 8 }}>War Room</H>
        <div style={{ fontSize: 13, color: t.ink3, marginBottom: 24 }}>
          Duel an AI opponent in a structured LSAT-style debate. Cerberus deploys real rhetorical tactics; you learn to recognize and counter them.
        </div>
        <Glass padding={28} style={{ textAlign: 'center' }}>
          <H level={3} style={{ marginBottom: 12 }}>Ready when you are</H>
          <div style={{ fontSize: 13, color: t.ink3, marginBottom: 20 }}>
            A scenario will be selected, Cerberus will open. Score is computed at the end.
          </div>
          <Btn variant="primary" icon={<Sparkle size={11} color="#fff" />} onClick={startDuel} style={{ opacity: busy ? 0.5 : 1 }}>
            {busy ? 'Spinning up Cerberus…' : 'Start a duel'}
          </Btn>
        </Glass>
      </div>
    );
  }

  return (
    <div style={{ padding: '18px 24px 48px', fontFamily: t.fonts.sans,
      display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 14, maxWidth: 1400, margin: '0 auto' }}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Glass padding={16}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            {state.status === 'active' && (
              <div style={{ width: 8, height: 8, borderRadius: 4, background: t.accent, animation: 'elle2Pulse 1.4s ease-in-out infinite' }} />
            )}
            <span style={{ fontSize: 11, color: state.status === 'active' ? t.accent : t.ink3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              {state.status === 'active' ? 'Live duel' : 'Complete'}
            </span>
            <Chip tone="neutral" style={{ marginLeft: 'auto' }}>{state.duel_id?.slice(0, 8)}</Chip>
          </div>
          <H level={3} style={{ marginBottom: 8, lineHeight: 1.25, fontSize: 19 }}>
            {state.scenario}
          </H>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: t.ink3, fontSize: 13 }}>
            <span>vs <span style={{ color: t.ink }}>{state.opponent}</span></span>
            <span>·</span>
            <span>Turn {state.turns.length}</span>
            <span>·</span>
            <span>{state.question_type}</span>
          </div>
        </Glass>

        {state.status === 'complete' && state.synthesis && (
          <Glass padding={20} style={{ border: `1px dashed ${t.accent}60`, background: t.accentSoft }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Sparkle size={12} />
              <span style={{ fontSize: 11, color: t.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Elle · synthesis · {state.result?.toUpperCase()}
              </span>
            </div>
            <div style={{ fontFamily: t.fonts.serif, fontSize: 16, color: t.ink2, lineHeight: 1.6, letterSpacing: -0.2 }}>
              {state.synthesis}
            </div>
          </Glass>
        )}

        <Glass padding={16}>
          <H level={4} style={{ fontSize: 14, marginBottom: 8 }}>Tactics deployed</H>
          {state.turns.filter(x => x.tactic).length === 0 ? (
            <div style={{ fontSize: 12, color: t.ink3 }}>No tactics tagged yet.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {state.turns.filter(x => x.tactic).map(x => (
                <div key={x.n} style={{ padding: 12, borderRadius: 10, border: `1px solid ${t.border}`, background: t.bgElev }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Chip tone="danger">{x.tactic!.src} {x.tactic!.ref}</Chip>
                    <span style={{ fontSize: 10, color: t.ink3, fontFamily: t.fonts.mono }}>T{String(x.n).padStart(2, '0')}</span>
                  </div>
                  <div style={{ fontSize: 13, color: t.ink, marginBottom: 3 }}>{x.tactic!.name}</div>
                  {x.tactic!.fallacy && <div style={{ fontSize: 11, color: t.warn }}>↳ {x.tactic!.fallacy}</div>}
                </div>
              ))}
            </div>
          )}
        </Glass>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {state.score && <WRScore score={state.score} />}

        <Glass padding={0} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 400 }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <H level={4} style={{ fontSize: 14 }}>Transcript</H>
            <Chip tone="ai" icon={<Sparkle size={10} />}>Auto-tag on</Chip>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 460 }}>
            {state.turns.map(turn => <TurnBubble key={turn.n} turn={turn} />)}
            {busy && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: t.bgElev, border: `1px solid ${t.border}`, fontSize: 12, color: t.ink3, fontStyle: 'italic' }}>
                {state.status === 'active' ? 'Cerberus is responding…' : 'Scoring…'}<Caret />
              </div>
            )}
          </div>
        </Glass>

        {state.status === 'active' ? (
          <Glass padding={14} style={{ border: `1px solid ${t.accent}60`, boxShadow: `0 0 0 4px ${t.accentSoft}` }}>
            <div style={{ fontSize: 10, color: t.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              Your response · Turn {state.turns.length + 1}
            </div>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTurn(); } }}
              placeholder="Make your move…"
              style={{
                width: '100%', minHeight: 60, background: 'transparent', border: 'none', outline: 'none',
                fontFamily: t.fonts.sans, fontSize: 14, color: t.ink, lineHeight: 1.5, resize: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip tone="ai" icon={<Sparkle size={10} />}>↵ deploy</Chip>
              <div style={{ flex: 1 }} />
              <Btn variant="ghost" size="sm" onClick={endDuel}>End duel</Btn>
              <Btn variant="primary" icon={<span>↵</span>} onClick={sendTurn} style={{ opacity: draft.trim() && !busy ? 1 : 0.5 }}>Deploy</Btn>
            </div>
          </Glass>
        ) : (
          <Glass padding={14} style={{ textAlign: 'center' }}>
            <Btn variant="primary" onClick={() => setState(EMPTY)} icon={<Sparkle size={11} color="#fff" />}>Start another duel</Btn>
          </Glass>
        )}
      </div>
    </div>
  );
}
