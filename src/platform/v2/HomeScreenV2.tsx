import React from 'react';
import { useTheme } from './ThemeProvider';
import { Glass, Chip, H, Sparkle, Btn, Meter, Caret } from './primitives';
import type { User, CognitiveMap, Screen } from '../../lib/types';

const SUGGESTIONS = [
  { icon: '⚔', label: 'Start a duel', sub: 'LR · Necessary Assumption', tab: 'warroom' as Screen },
  { icon: '✦', label: 'Warm up · 3 LR questions', sub: '~9 minutes', tab: 'tutor' as Screen },
  { icon: '◎', label: 'Drill weakest axis', sub: 'Walkback — deficit 45', tab: 'tutor' as Screen },
  { icon: '✺', label: 'Open doctrine library', sub: '48 Laws + Art of War', tab: 'doctrine' as Screen },
];

const SPARKLINE = [150, 152, 153, 155, 156, 157, 158, 159, 161, 163, 164, 165];

function MiniSparkline({ scores, accent }: { scores: number[]; accent: string }) {
  const min = Math.min(...scores), max = Math.max(...scores);
  const w = 200, h = 48;
  const pts = scores.map((v, i) => {
    const x = (i / (scores.length - 1)) * w;
    const y = h - ((v - min) / (max - min + 1)) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="spkGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={accent} stopOpacity="0.2" />
          <stop offset="1" stopColor={accent} stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke={`url(#spkGrad)`} strokeWidth={2} strokeLinejoin="round" />
      {scores.map((v, i) => {
        const x = (i / (scores.length - 1)) * w;
        const y = h - ((v - min) / (max - min + 1)) * h;
        return i === scores.length - 1 ? <circle key={i} cx={x} cy={y} r={3} fill={accent} /> : null;
      })}
    </svg>
  );
}

export function HomeScreenV2({ user, cogMap, setScreen }: {
  user: User; cogMap: CognitiveMap | null; setScreen: (s: Screen) => void;
}) {
  const t = useTheme();
  const name = user.display_name || user.email.split('@')[0];
  const iq = cogMap?.iq_index ?? 127;
  const eq = cogMap?.eq_index ?? 94;
  const thr = cogMap?.threshold_index ?? 88;

  return (
    <div style={{ padding: '28px 48px 64px', maxWidth: 1320, margin: '0 auto', fontFamily: t.fonts.sans }}>
      {/* Hero greeting */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12, color: t.ink3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>
          Good morning
        </div>
        <H level={1} style={{ fontSize: 52, letterSpacing: -2, marginBottom: 10 }}>
          {name}<span style={{ color: t.accent }}>.</span>
        </H>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Chip tone="accent">Streak 37 days</Chip>
          <Chip>Cycle 14</Chip>
          <Chip tone="ai" icon={<Sparkle size={10} />}>CogIdx {iq}</Chip>
        </div>
      </div>

      {/* Top stats + sparkline */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.4fr', gap: 14, marginBottom: 14 }}>
        <Glass padding={18}>
          <div style={{ fontSize: 11, color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>IQ Index</div>
          <div style={{ fontFamily: t.fonts.serif, fontSize: 44, color: t.ink, letterSpacing: -2, marginBottom: 4 }}>{iq}</div>
          <div style={{ fontSize: 12, color: t.success }}>▲ +12 this cycle</div>
        </Glass>
        <Glass padding={18}>
          <div style={{ fontSize: 11, color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>EQ Index</div>
          <div style={{ fontFamily: t.fonts.serif, fontSize: 44, color: t.ink, letterSpacing: -2, marginBottom: 4 }}>{eq}</div>
          <div style={{ fontSize: 12, color: t.ink3 }}>Composure · social modeling</div>
        </Glass>
        <Glass padding={18}>
          <div style={{ fontSize: 11, color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Threshold</div>
          <div style={{ fontFamily: t.fonts.serif, fontSize: 44, color: t.ink, letterSpacing: -2, marginBottom: 4 }}>{thr}</div>
          <div style={{ fontSize: 12, color: t.ink3 }}>Pressure tolerance</div>
        </Glass>
        <Glass padding={18}>
          <div style={{ fontSize: 11, color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>LSAT Trajectory</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
            <div style={{ fontFamily: t.fonts.serif, fontSize: 44, color: t.ink, letterSpacing: -2 }}>165</div>
            <div style={{ fontSize: 13, color: t.ink3 }}>→ <span style={{ color: t.accent }}>188</span></div>
          </div>
          <MiniSparkline scores={SPARKLINE} accent={t.accent} />
        </Glass>
      </div>

      {/* Suggestions + reasoning */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Glass padding={20}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Sparkle size={14} />
            <span style={{ fontSize: 11, color: t.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Suggested next</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SUGGESTIONS.map((s, i) => (
              <div key={s.label} onClick={() => setScreen(s.tab)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, cursor: 'pointer',
                  background: i === 0 ? t.accentSoft : t.bgElev,
                  border: `1px solid ${i === 0 ? t.accent + '44' : t.border}` }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = t.surfaceSoft}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = i === 0 ? t.accentSoft : t.bgElev}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: t.accentSoft, color: t.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{s.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: t.ink, fontWeight: 500 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: t.ink3, marginTop: 2 }}>{s.sub}</div>
                </div>
                <span style={{ color: t.ink3, fontSize: 12 }}>→</span>
              </div>
            ))}
          </div>
        </Glass>

        <Glass padding={20}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Sparkle size={14} />
            <span style={{ fontSize: 11, color: t.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Elle · morning brief</span>
          </div>
          <div className="elle2-stream" style={{ fontFamily: t.fonts.serif, fontSize: 16, color: t.ink2, lineHeight: 1.6, letterSpacing: -0.2 }}>
            <div>Your biggest lever this cycle is walkback discipline — you're leaving 4.2 points on the table per duel when you re-engage after conceding.</div>
            <div style={{ marginTop: 10, color: t.ink3, fontSize: 14 }}>
              Cerberus-03 exploits §37 (appeal to consequence) against you 3× per match on average. Name the fallacy and deny the structural claim.
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: t.accent }}>17-point LSAT gap. Projected close: Cycle 16.<Caret /></div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <Btn variant="ai" size="sm" icon={<Sparkle size={11} />} onClick={() => setScreen('warroom')}>Start duel</Btn>
            <Btn variant="ghost" size="sm" onClick={() => setScreen('profile')}>View profile</Btn>
          </div>
        </Glass>
      </div>

      {/* Cognitive indices detail */}
      {cogMap && (
        <Glass padding={20}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
            <H level={3}>Cognitive map snapshot</H>
            <Chip tone="ai" icon={<Sparkle size={10} />}>Live calibration</Chip>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { k: 'IQ Index', v: iq, note: cogMap.learning_modality },
              { k: 'EQ Index', v: eq, note: cogMap.communication_style },
              { k: 'Threshold', v: thr, note: cogMap.confidence },
            ].map(g => (
              <div key={g.k}>
                <div style={{ fontSize: 11, color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{g.k}</div>
                <Meter value={g.v} max={180} h={4} style={{ marginBottom: 6 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: t.ink2 }}>{g.note || '—'}</span>
                  <span style={{ fontFamily: t.fonts.mono, color: t.ink }}>{g.v}</span>
                </div>
              </div>
            ))}
          </div>
          {cogMap.growth_arc && (
            <div style={{ marginTop: 14, display: 'flex', gap: 16, padding: 12, borderRadius: 10, background: t.bgElev, border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 12, color: t.ink3 }}>Growth arc · {cogMap.growth_arc.sessions_since_baseline} sessions</div>
              {[
                { k: 'IQ Δ', v: cogMap.growth_arc.iq_delta },
                { k: 'EQ Δ', v: cogMap.growth_arc.eq_delta },
                { k: 'THR Δ', v: cogMap.growth_arc.threshold_delta },
              ].map(d => (
                <div key={d.k} style={{ display: 'flex', gap: 6, fontSize: 12 }}>
                  <span style={{ color: t.ink3 }}>{d.k}</span>
                  <span style={{ fontFamily: t.fonts.mono, color: d.v >= 0 ? t.success : t.danger }}>{d.v >= 0 ? '+' : ''}{d.v}</span>
                </div>
              ))}
            </div>
          )}
        </Glass>
      )}
    </div>
  );
}
