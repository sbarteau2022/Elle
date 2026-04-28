import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from './ThemeProvider';
import { Glass, Chip, H, Sparkle, Btn } from './primitives';
import { callEdge } from '../../lib/supabase';
import type { User } from '../../lib/types';

interface Row {
  rank: number;
  user_id: string;
  name: string;
  idx: number;
  streak: number;
  delta: string;
  you: boolean;
}

interface Props { user: User; token: string; }

export function CohortView({ user, token }: Props) {
  const t = useTheme();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [your_rank, setYourRank] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [challenging, setChallenging] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await callEdge('elle-cohort', { action: 'leaderboard', user_id: user.id, limit: 20 }, token);
      setRows((data.rows as Row[]) || []);
      setYourRank((data.your_rank as number) ?? null);
      setTotal((data.total as number) ?? 0);
    } finally {
      setLoading(false);
    }
  }, [user.id, token]);

  useEffect(() => { load(); }, [load]);

  const challenge = async (oppId: string) => {
    setChallenging(oppId);
    try {
      await callEdge('elle-cohort', { action: 'challenge', user_id: user.id, opponent_user_id: oppId }, token);
      // In a fuller impl, this would route to WarRoom — for now, just confirm
    } finally {
      setChallenging(null);
    }
  };

  return (
    <div style={{ padding: '28px 48px 64px', maxWidth: 1000, margin: '0 auto', fontFamily: t.fonts.sans }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
        <div>
          <H level={2} style={{ marginBottom: 6 }}>Cohort</H>
          <div style={{ fontSize: 13, color: t.ink3 }}>
            Cognitive index across all Elle users. {total > 0 && `${total} ranked.`}
            {your_rank && ` You are #${your_rank}.`}
          </div>
        </div>
      </div>

      {loading && <Glass padding={28} style={{ textAlign: 'center', color: t.ink3, fontStyle: 'italic' }}>Loading leaderboard…</Glass>}

      {!loading && rows.length === 0 && (
        <Glass padding={48} style={{ textAlign: 'center' }}>
          <H level={3} style={{ marginBottom: 8 }}>No cohort data yet</H>
          <div style={{ fontSize: 13, color: t.ink3 }}>Cohort populates as users complete cognitive mapping.</div>
        </Glass>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map(r => (
          <Glass key={r.user_id} padding={14} style={{
            background: r.you ? t.accentSoft : t.bgElev,
            borderColor: r.you ? t.accent : t.border,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 90px 70px 70px 100px', alignItems: 'center', gap: 14 }}>
              <div style={{
                fontFamily: t.fonts.mono, fontSize: 14,
                color: r.rank <= 3 ? t.accent : t.ink2,
                fontWeight: r.rank <= 3 ? 700 : 500,
              }}>
                #{r.rank}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8,
                  background: r.you ? t.accent : t.surfaceSoft,
                  color: r.you ? '#fff' : t.ink2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: t.fonts.sans, fontSize: 11, fontWeight: 600 }}>
                  {r.name.slice(0, 2).toUpperCase()}
                </div>
                <span style={{ fontSize: 13, color: t.ink, fontWeight: r.you ? 600 : 500 }}>
                  {r.name}{r.you && ' (you)'}
                </span>
              </div>
              <div style={{ fontFamily: t.fonts.mono, fontSize: 13, color: t.ink, fontWeight: 500 }}>{r.idx}</div>
              <div style={{ fontFamily: t.fonts.mono, fontSize: 12, color: t.success }}>{r.delta}</div>
              <div style={{ fontFamily: t.fonts.mono, fontSize: 12, color: t.ink3 }}>{r.streak}🔥</div>
              {!r.you ? (
                <Btn variant="ghost" size="sm" onClick={() => challenge(r.user_id)}
                  style={{ opacity: challenging === r.user_id ? 0.5 : 1 }}
                  icon={<Sparkle size={9} />}>
                  {challenging === r.user_id ? '…' : 'Challenge'}
                </Btn>
              ) : (
                <Chip tone="accent">You</Chip>
              )}
            </div>
          </Glass>
        ))}
      </div>
    </div>
  );
}
