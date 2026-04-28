import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from './ThemeProvider';
import { Glass, Chip, H, Sparkle, Btn } from './primitives';
import { callEdge } from '../../lib/supabase';
import type { User } from '../../lib/types';

interface ReplayRow {
  id: string;
  opp: string;
  scene: string;
  result: string;
  turns: number;
  comp: number;
}

interface KeyMoment { turn: number; label: string; analysis: string; }
interface Autopsy { key_moments?: KeyMoment[]; pattern?: string; recommendation?: string; }
interface DuelDetail {
  id: string; opponent: string; scenario: string; result: string;
  turns: { side: string; text: string; tactic?: { name?: string } }[];
  score?: { composure: number; recognition: number; walkback: number; framework: number };
  autopsy: Autopsy | null;
  ended_at?: string;
}

interface Props { user: User; token: string; }

export function ReplaysView({ user, token }: Props) {
  const t = useTheme();
  const [rows, setRows] = useState<ReplayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<DuelDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await callEdge('elle-replays', { action: 'list', user_id: user.id, page: 0 }, token);
      setRows((data.replays as ReplayRow[]) || []);
    } finally {
      setLoading(false);
    }
  }, [user.id, token]);

  useEffect(() => { load(); }, [load]);

  const open = async (id: string) => {
    setDetailLoading(true);
    try {
      const data = await callEdge('elle-replays', { action: 'get', duel_id: id }, token);
      setSel(data as unknown as DuelDetail);
    } finally {
      setDetailLoading(false);
    }
  };

  if (sel) {
    return (
      <div style={{ padding: '28px 48px 64px', maxWidth: 1100, margin: '0 auto', fontFamily: t.fonts.sans }}>
        <button onClick={() => setSel(null)} style={{
          background: 'transparent', border: 'none', color: t.ink3, fontFamily: t.fonts.sans,
          fontSize: 12, cursor: 'pointer', marginBottom: 14, padding: 0,
        }}>← Back to replays</button>

        <Glass padding={24} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
            <Chip tone={sel.result === 'win' ? 'success' : sel.result === 'loss' ? 'danger' : 'neutral'}>
              {sel.result?.toUpperCase() || 'ENDED'}
            </Chip>
            <H level={2} style={{ marginBottom: 0 }}>vs {sel.opponent}</H>
          </div>
          <div style={{ fontFamily: t.fonts.serif, fontSize: 17, color: t.ink2, lineHeight: 1.5, letterSpacing: -0.2 }}>
            {sel.scenario}
          </div>
        </Glass>

        {sel.autopsy && (
          <Glass padding={22} style={{ marginBottom: 14, border: `1px dashed ${t.accent}60`, background: t.accentSoft }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Sparkle size={12} />
              <span style={{ fontSize: 11, color: t.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Elle · autopsy</span>
            </div>
            {sel.autopsy.pattern && (
              <div style={{ fontFamily: t.fonts.serif, fontSize: 16, color: t.ink2, lineHeight: 1.55, marginBottom: 14 }}>
                {sel.autopsy.pattern}
              </div>
            )}
            {sel.autopsy.key_moments && sel.autopsy.key_moments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                {sel.autopsy.key_moments.map((m, i) => (
                  <div key={i} style={{ padding: 12, borderRadius: 8, background: t.bgElev, border: `1px solid ${t.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Chip>turn {m.turn}</Chip>
                      <span style={{ fontSize: 12, color: t.ink, fontWeight: 500 }}>{m.label}</span>
                    </div>
                    <div style={{ fontSize: 13, color: t.ink2, lineHeight: 1.5 }}>{m.analysis}</div>
                  </div>
                ))}
              </div>
            )}
            {sel.autopsy.recommendation && (
              <div style={{ padding: 12, borderRadius: 8, background: t.surface, border: `1px solid ${t.accent}40` }}>
                <div style={{ fontSize: 11, color: t.accent, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Next focus</div>
                <div style={{ fontSize: 14, color: t.ink, fontWeight: 500 }}>{sel.autopsy.recommendation}</div>
              </div>
            )}
          </Glass>
        )}

        <Glass padding={22}>
          <div style={{ fontSize: 11, color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Transcript</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sel.turns.map((tn, i) => {
              const isUser = tn.side === 'u';
              return (
                <div key={i} style={{ display: 'flex', gap: 10, flexDirection: isUser ? 'row-reverse' : 'row' }}>
                  <div style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 8,
                    background: isUser ? t.accent : t.surfaceSoft,
                    color: isUser ? '#fff' : t.accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: t.fonts.sans, fontSize: 10, fontWeight: 600 }}>
                    {isUser ? 'U' : 'C'}
                  </div>
                  <div style={{ maxWidth: '78%' }}>
                    <div style={{ padding: '10px 13px', borderRadius: 12,
                      background: isUser ? t.accent : t.bgElev,
                      color: isUser ? '#fff' : t.ink,
                      border: isUser ? 'none' : `1px solid ${t.border}`,
                      fontSize: 13, lineHeight: 1.5 }}>
                      {tn.text}
                    </div>
                    {tn.tactic?.name && !isUser && (
                      <div style={{ marginTop: 4 }}>
                        <Chip tone="warn">{tn.tactic.name}</Chip>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Glass>
      </div>
    );
  }

  return (
    <div style={{ padding: '28px 48px 64px', maxWidth: 1100, margin: '0 auto', fontFamily: t.fonts.sans }}>
      <H level={2} style={{ marginBottom: 14 }}>Replays</H>

      {loading && <Glass padding={28} style={{ textAlign: 'center', color: t.ink3, fontStyle: 'italic' }}>Loading…</Glass>}

      {!loading && rows.length === 0 && (
        <Glass padding={48} style={{ textAlign: 'center' }}>
          <H level={3} style={{ marginBottom: 8 }}>No replays yet</H>
          <div style={{ fontSize: 13, color: t.ink3 }}>Run a duel in the War Room to populate your replays.</div>
        </Glass>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(r => (
          <Glass key={r.id} padding={16} style={{ cursor: 'pointer' }}>
            <div onClick={() => open(r.id)} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 80px 80px 100px', alignItems: 'center', gap: 14 }}>
              <Chip tone={r.result === 'WIN' ? 'success' : r.result === 'LOSS' ? 'danger' : 'neutral'}>{r.result}</Chip>
              <div>
                <div style={{ fontSize: 13, color: t.ink, fontWeight: 500, marginBottom: 2 }}>vs {r.opp}</div>
                <div style={{ fontSize: 12, color: t.ink3 }}>{r.scene}</div>
              </div>
              <div style={{ fontFamily: t.fonts.mono, fontSize: 12, color: t.ink3 }}>{r.turns} turns</div>
              <div style={{ fontFamily: t.fonts.mono, fontSize: 12, color: t.ink3 }}>{Math.round(r.comp * 100)}% comp</div>
              <Btn variant="ghost" size="sm" onClick={() => open(r.id)} style={{ opacity: detailLoading ? 0.5 : 1 }}>
                Open →
              </Btn>
            </div>
          </Glass>
        ))}
      </div>
    </div>
  );
}
