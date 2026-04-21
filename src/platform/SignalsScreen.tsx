import React, { useState, useEffect } from 'react';
import { callEdge } from '../lib/supabase';
import type { User, CommunitySignal } from '../lib/types';

interface Props {
  user: User;
  token: string;
}

export function SignalsScreen({ user, token }: Props) {
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
    <div style={{ padding: '48px', maxWidth: 800, animation: 'slideIn 0.4s ease forwards' }}>

      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.6rem', letterSpacing: '0.2em', color: '#8B1A1A', textTransform: 'uppercase', marginBottom: 4, margin: '0 0 4px' }}>
            Community Intelligence
          </p>
          <p style={{ fontFamily: '"Barlow Condensed", sans-serif', color: '#6a6a7a', fontSize: '0.9rem', margin: 0 }}>
            What the community is carrying. No individual exposed. Patterns only.
          </p>
        </div>
        <button
          onClick={runAggregate}
          disabled={running}
          style={{ background: running ? 'transparent' : '#8B1A1A', border: '1px solid rgba(139,26,26,0.3)', color: running ? '#6a6a7a' : '#F5F0E8', padding: '10px 20px', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.8rem', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: running ? 'default' : 'pointer' }}
        >
          {running ? 'Aggregating...' : 'Run Now'}
        </button>
      </div>

      {loading && (
        <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.65rem', color: '#6a6a7a' }}>Loading signals...</p>
      )}

      {!loading && signals.length === 0 && (
        <div style={{ padding: 48, textAlign: 'center', border: '1px solid rgba(139,26,26,0.2)' }}>
          <p style={{ fontFamily: '"Playfair Display", serif', color: '#F5F0E8', fontSize: '1.1rem', marginBottom: 8 }}>No signals yet.</p>
          <p style={{ fontFamily: '"Barlow Condensed", sans-serif', color: '#6a6a7a' }}>
            Run an aggregation to compute community patterns from recent interactions.
          </p>
        </div>
      )}

      {signals.map((s) => (
        <div key={s.id || s.computed_at} style={{ padding: 24, background: '#13131f', border: '1px solid rgba(139,26,26,0.2)', marginBottom: 12 }}>
          <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.5rem', color: '#8B1A1A', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12, margin: '0 0 12px' }}>
            {new Date(s.computed_at).toLocaleString()} · {s.signal_count} signals
          </p>

          {s.suppression_synthesis && (
            <p style={{ fontFamily: '"Playfair Display", serif', color: '#F5F0E8', fontSize: '1rem', lineHeight: 1.6, marginBottom: 16, fontStyle: 'italic', margin: '0 0 16px' }}>
              "{s.suppression_synthesis}"
            </p>
          )}

          {s.dominant_axes && s.dominant_axes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {s.dominant_axes.map(a => (
                <div key={a.axis}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', color: '#6a6a7a' }}>{a.axis}</span>
                    <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', color: '#C9A84C' }}>{a.pct}%</span>
                  </div>
                  <div style={{ height: 2, background: 'rgba(245,240,232,0.05)' }}>
                    <div style={{ height: '100%', background: '#8B1A1A', width: `${a.pct}%`, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
