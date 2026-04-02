import React from 'react';
import type { User, CognitiveMap, Screen } from '../lib/types';

interface Props {
  user: User;
  cogMap: CognitiveMap | null;
  setScreen: (s: Screen) => void;
}

export function HomeScreen({ user, cogMap, setScreen }: Props) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const cards: { label: string; desc: string; screen: Screen }[] = [
    { label: 'Ask Elle',         desc: 'Run a question through the Millennium Falcon — 17 axes, full depth.',   screen: 'ask'     },
    { label: 'Learn to Code',    desc: 'Theory first. Elle calibrates to how you think, not how you type.',      screen: 'learn'   },
    { label: 'Community Signals', desc: 'What the community is carrying. Patterns, not individuals.',            screen: 'signals' },
  ];

  return (
    <div style={{ padding: '48px', maxWidth: 900, animation: 'slideIn 0.4s ease forwards' }}>

      {/* Greeting */}
      <div style={{ marginBottom: 48 }}>
        <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.6rem', letterSpacing: '0.2em', color: '#8B1A1A', textTransform: 'uppercase', marginBottom: 12, margin: '0 0 12px' }}>
          {greeting}
        </p>
        <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#F5F0E8', fontWeight: 400, lineHeight: 1.2, margin: 0 }}>
          {user.display_name || user.email.split('@')[0]}.
        </h1>
      </div>

      {/* Cognitive map */}
      {cogMap && (
        <div style={{ marginBottom: 48, padding: 28, background: '#13131f', border: '1px solid rgba(139,26,26,0.2)' }}>
          <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', letterSpacing: '0.2em', color: '#8B1A1A', textTransform: 'uppercase', marginBottom: 20, margin: '0 0 20px' }}>
            Cognitive Map — {cogMap.confidence} confidence
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginBottom: cogMap.growth_arc ? 16 : 0 }}>
            {([
              { label: 'IQ Index',   val: cogMap.iq_index        },
              { label: 'EQ Index',   val: cogMap.eq_index        },
              { label: 'Threshold',  val: cogMap.threshold_index },
            ] as { label: string; val: number }[]).map(m => (
              <div key={m.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', color: '#6a6a7a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{m.label}</span>
                  <span style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.7rem', color: '#C9A84C' }}>{Math.round(m.val * 100)}</span>
                </div>
                <div style={{ height: 2, background: 'rgba(245,240,232,0.06)' }}>
                  <div style={{ height: '100%', background: '#8B1A1A', width: `${m.val * 100}%`, transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)' }} />
                </div>
              </div>
            ))}
          </div>

          {cogMap.growth_arc && (
            <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.55rem', color: '#6a6a7a', letterSpacing: '0.08em', marginTop: 16, margin: '16px 0 0' }}>
              {cogMap.growth_arc.sessions_since_baseline} sessions since baseline ·
              IQ {cogMap.growth_arc.iq_delta >= 0 ? '+' : ''}{cogMap.growth_arc.iq_delta.toFixed(2)} ·
              EQ {cogMap.growth_arc.eq_delta >= 0 ? '+' : ''}{cogMap.growth_arc.eq_delta.toFixed(2)} ·
              Threshold {cogMap.growth_arc.threshold_delta >= 0 ? '+' : ''}{cogMap.growth_arc.threshold_delta.toFixed(2)}
            </p>
          )}

          {cogMap.course_recommendation_vector && (
            <p style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.95rem', color: 'rgba(245,240,232,0.6)', marginTop: 16, fontStyle: 'italic', margin: '16px 0 0' }}>
              "{cogMap.course_recommendation_vector}"
            </p>
          )}
        </div>
      )}

      {!cogMap && (
        <div style={{ marginBottom: 48, padding: 24, border: '1px solid rgba(139,26,26,0.2)', background: 'rgba(139,26,26,0.04)' }}>
          <p style={{ fontFamily: '"Playfair Display", serif', color: '#F5F0E8', fontSize: '1rem', margin: '0 0 8px' }}>No cognitive map yet.</p>
          <p style={{ fontFamily: '"Barlow Condensed", sans-serif', color: '#6a6a7a', fontSize: '0.9rem', margin: '0 0 16px' }}>
            Go to Profile → Update Mapping so Elle can learn how you think.
          </p>
          <button
            onClick={() => setScreen('profile')}
            style={{ background: '#8B1A1A', border: 'none', color: '#F5F0E8', padding: '10px 24px', fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.8rem', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            Begin Mapping
          </button>
        </div>
      )}

      {/* Quick nav cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 2, background: 'rgba(139,26,26,0.15)' }}>
        {cards.map(c => (
          <button
            key={c.label}
            onClick={() => setScreen(c.screen)}
            style={{ background: '#13131f', border: 'none', padding: '28px 24px', textAlign: 'left', cursor: 'pointer', transition: 'background 0.15s ease' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(139,26,26,0.12)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#13131f'}
          >
            <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.6rem', color: '#8B1A1A', marginBottom: 12, margin: '0 0 12px' }}>→</p>
            <p style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.15rem', color: '#F5F0E8', fontWeight: 400, marginBottom: 8, margin: '0 0 8px' }}>{c.label}</p>
            <p style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '0.9rem', color: '#6a6a7a', margin: 0 }}>{c.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
