import React from 'react';
import { useTheme } from './ThemeProvider';
import { Glass, Chip, H, Btn, Meter } from './primitives';

const ROWS = [
  { rank: 1, name: 'J. Okafor',   idx: 142, streak: 91, delta: '+6',  you: false },
  { rank: 2, name: 'R. Patel',    idx: 138, streak: 63, delta: '+3',  you: false },
  { rank: 3, name: 'M. Laurent',  idx: 134, streak: 48, delta: '+2',  you: false },
  { rank: 4, name: 'Stewart B.',  idx: 127, streak: 37, delta: '+12', you: true  },
  { rank: 5, name: 'A. Yamamoto', idx: 126, streak: 29, delta: '+1',  you: false },
  { rank: 6, name: 'T. Kowalski', idx: 124, streak: 44, delta: '-2',  you: false },
  { rank: 7, name: 'L. Osei',     idx: 121, streak: 52, delta: '+4',  you: false },
];

export function CohortView() {
  const t = useTheme();
  return (
    <div style={{ padding: '28px 48px 64px', maxWidth: 1100, margin: '0 auto', fontFamily: t.fonts.sans }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
        <H level={2}>Cohort · Cycle 14</H>
        <div style={{ display: 'flex', gap: 6 }}>
          <Chip>4,218 members</Chip>
          <Chip tone="accent">Top 12%</Chip>
        </div>
      </div>
      <Glass padding={0} style={{ overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 100px 80px 100px 80px',
          padding: '10px 20px', borderBottom: `1px solid ${t.border}`,
          fontSize: 11, color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          <div>#</div><div>Name</div><div>Cog-Idx</div><div>Streak</div><div>Δ Cycle</div><div></div>
        </div>
        {ROWS.map(r => (
          <div key={r.rank} style={{ display: 'grid', gridTemplateColumns: '48px 1fr 100px 80px 100px 80px',
            padding: '14px 20px', alignItems: 'center', borderBottom: `1px solid ${t.border}`,
            background: r.you ? t.accentSoft : 'transparent',
            borderLeft: r.you ? `3px solid ${t.accent}` : '3px solid transparent' }}>
            <div style={{ fontFamily: t.fonts.serif, fontSize: 22, color: r.rank <= 3 ? t.accent : t.ink3, letterSpacing: -0.5 }}>
              {r.rank}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: r.you ? t.accent : t.surfaceSoft,
                color: r.you ? '#fff' : t.ink2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: t.fonts.sans, fontSize: 11, fontWeight: 600 }}>
                {r.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <span style={{ fontSize: 14, color: t.ink, fontWeight: r.you ? 600 : 400 }}>{r.name}</span>
              {r.you && <Chip tone="accent" style={{ fontSize: 10 }}>you</Chip>}
            </div>
            <div>
              <div style={{ fontFamily: t.fonts.mono, fontSize: 14, color: t.ink, marginBottom: 3 }}>{r.idx}</div>
              <Meter value={r.idx} max={180} h={2} />
            </div>
            <div style={{ fontFamily: t.fonts.mono, fontSize: 13, color: t.ink2 }}>{r.streak}d</div>
            <div style={{ fontFamily: t.fonts.mono, fontSize: 13,
              color: r.delta.startsWith('+') ? t.success : t.danger }}>{r.delta}</div>
            {r.you ? (
              <Chip tone="accent">Active</Chip>
            ) : (
              <Btn variant="ghost" size="sm">Challenge</Btn>
            )}
          </div>
        ))}
      </Glass>
    </div>
  );
}
