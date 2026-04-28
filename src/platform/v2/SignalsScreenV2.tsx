import React, { useState, useEffect } from 'react';
import { useTheme } from './ThemeProvider';
import { Glass, Chip, H, Sparkle, Btn, Meter } from './primitives';
import { callEdge } from '../../lib/supabase';
import type { User, CommunitySignal } from '../../lib/types';

interface Props {
  user: User;
  token: string;
}

export function SignalsScreenV2({ user, token }: Props) {
  const t = useTheme();
  const [signals, setSignals] = useState<CommunitySignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    callEdge('elle-community-signals', { action: 'read' }, token)
      .then(d => setSignals((d.signals as CommunitySignal[]) || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const runAggregate = async () => {
    setRunning(true);
    try {
      const data = await callEdge('elle-community-signals', {
        action: 'aggregate',
        state: user.state || 'MO',
        time_window_hours: 48,
      }, token);
      setSignals(prev => [data as unknown as CommunitySignal, ...prev]);
    } catch {
      // fail silently
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ padding: '28px 48px 64px', maxWidth: 1100, margin: '0 auto', fontFamily: t.fonts.sans }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
        <div>
          <H level={2} style={{ marginBottom: 6 }}>Community intelligence</H>
          <div style={{ fontSize: 13, color: t.ink3, maxWidth: 540 }}>
            What the community is carrying. No individual exposed. Patterns only — drawn from suppression vectors across recent interactions.
          </div>
        </div>
        <Btn variant="primary" onClick={runAggregate} icon={<Sparkle size={11} color="#fff" />} style={{ opacity: running ? 0.5 : 1 }}>
          {running ? 'Aggregating…' : 'Run aggregation'}
        </Btn>
      </div>

      {loading && (
        <Glass padding={48} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: t.ink3, fontStyle: 'italic' }}>Loading signals…</div>
        </Glass>
      )}

      {!loading && signals.length === 0 && (
        <Glass padding={48} style={{ textAlign: 'center' }}>
          <H level={3} style={{ marginBottom: 8 }}>No signals yet</H>
          <div style={{ fontSize: 13, color: t.ink3 }}>
            Run an aggregation to compute community patterns from recent interactions.
          </div>
        </Glass>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {signals.map((s) => (
          <Glass key={s.id || s.computed_at} padding={22}>

            {/* Meta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Chip tone="accent">
                {new Date(s.computed_at).toLocaleString()}
              </Chip>
              <Chip>{s.signal_count} signals</Chip>
              <div style={{ flex: 1 }} />
              <Chip tone="ai" icon={<Sparkle size={10} />}>Aggregated</Chip>
            </div>

            {/* Synthesis */}
            {s.suppression_synthesis && (
              <div style={{
                padding: 16, borderRadius: 12,
                border: `1px dashed ${t.accent}60`, background: t.accentSoft,
                marginBottom: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Sparkle size={12} />
                  <span style={{ fontSize: 11, color: t.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Suppression synthesis
                  </span>
                </div>
                <div style={{ fontFamily: t.fonts.serif, fontSize: 16, color: t.ink2, lineHeight: 1.55, letterSpacing: -0.2 }}>
                  {s.suppression_synthesis}
                </div>
              </div>
            )}

            {/* Dominant axes */}
            {s.dominant_axes && s.dominant_axes.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                  Dominant axes
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {s.dominant_axes.map(a => (
                    <div key={a.axis} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 50px', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontSize: 13, color: t.ink, letterSpacing: -0.1 }}>{a.axis}</div>
                      <Meter value={a.pct} max={100} h={4} />
                      <div style={{ fontFamily: t.fonts.mono, fontSize: 12, color: t.ink2, textAlign: 'right' }}>{a.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dominant occupations */}
            {s.dominant_occupations && s.dominant_occupations.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  Dominant occupations
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {s.dominant_occupations.map(([occ, count]) => (
                    <Chip key={occ}>{occ} · {count}</Chip>
                  ))}
                </div>
              </div>
            )}
          </Glass>
        ))}
      </div>
    </div>
  );
}
