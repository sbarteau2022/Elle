import React from 'react';
import { useTheme } from './ThemeProvider';
import { Glass, Chip, H, Btn, Meter } from './primitives';

const ROWS = [
  { id: 'WR-4417', opp: 'Cerberus-03', result: 'LIVE',  turns: 8,  comp: 0.89, scene: 'LR · Necessary Assumption' },
  { id: 'WR-4402', opp: 'Specter-02',  result: 'WIN',   turns: 14, comp: 0.84, scene: 'LR · Flaw · ambiguity' },
  { id: 'WR-4398', opp: 'Magistrate',  result: 'LOSS',  turns: 11, comp: 0.52, scene: 'LR · Strengthen' },
  { id: 'WR-4389', opp: 'Cerberus-03', result: 'WIN',   turns: 16, comp: 0.77, scene: 'RC · Legal passage' },
  { id: 'WR-4376', opp: 'Socratic-M',  result: 'DRAW',  turns: 20, comp: 0.68, scene: 'LR · Parallel reasoning' },
  { id: 'WR-4371', opp: 'Duelist-04',  result: 'LOSS',  turns: 9,  comp: 0.41, scene: 'LR · Necessary Assumption' },
];

export function ReplaysView() {
  const t = useTheme();
  return (
    <div style={{ padding: '28px 48px 64px', maxWidth: 1320, margin: '0 auto', fontFamily: t.fonts.sans }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
        <H level={2}>Replays &amp; autopsies</H>
        <div style={{ display: 'flex', gap: 6 }}>
          <Chip tone="accent">214 total</Chip>
          <Chip>3 new autopsies</Chip>
        </div>
      </div>
      <Glass padding={0} style={{ overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 150px 60px 120px 90px 100px',
          padding: '10px 18px', borderBottom: `1px solid ${t.border}`,
          fontSize: 11, color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          <div>Duel</div><div>Scenario</div><div>Opponent</div>
          <div>Turns</div><div>Composure</div><div>Result</div><div></div>
        </div>
        {ROWS.map(r => (
          <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 150px 60px 120px 90px 100px',
            padding: '14px 18px', alignItems: 'center', borderBottom: `1px solid ${t.border}`, fontSize: 13 }}>
            <div style={{ fontFamily: t.fonts.mono, color: t.ink2, fontSize: 12 }}>{r.id}</div>
            <div style={{ color: t.ink }}>{r.scene}</div>
            <div style={{ color: t.ink2 }}>{r.opp}</div>
            <div style={{ fontFamily: t.fonts.mono, color: t.ink3 }}>{r.turns}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Meter value={r.comp} max={1} h={3} style={{ width: 60 }} />
              <span style={{ fontFamily: t.fonts.mono, color: t.ink2, fontSize: 11 }}>{Math.round(r.comp * 100)}</span>
            </div>
            <Chip tone={r.result === 'WIN' ? 'success' : r.result === 'LOSS' ? 'danger' : r.result === 'LIVE' ? 'accent' : 'neutral'}>
              {r.result}
            </Chip>
            <Btn variant="ghost" size="sm">Open</Btn>
          </div>
        ))}
      </Glass>
    </div>
  );
}
