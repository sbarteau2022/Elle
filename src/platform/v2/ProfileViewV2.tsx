import React from 'react';
import { useTheme } from './ThemeProvider';
import { Glass, Chip, H, Sparkle, Btn, Meter } from './primitives';
import type { User, CognitiveMap, Screen } from '../../lib/types';

const MOCK_AXES = [
  { k: 'Necessary Assumption', v: 72, d: +8 },
  { k: 'Sufficient Assumption', v: 68, d: +4 },
  { k: 'Flaw recognition', v: 81, d: +11 },
  { k: 'Strengthen / Weaken', v: 75, d: +6 },
  { k: 'Parallel Reasoning', v: 63, d: +3 },
  { k: 'Reading Comp', v: 78, d: +9 },
  { k: 'Inference', v: 70, d: +5 },
  { k: 'Principle', v: 65, d: +2 },
  { k: 'Walkback discipline', v: 55, d: -2 },
  { k: 'Composure under pressure', v: 88, d: +12 },
];

const MOCK_PLAN = [
  { rank: 1, axis: 'Walkback discipline', deficit: 45, drill: '10-turn walkback sprint', eta: '~22 min', prio: 'critical' as const },
  { rank: 2, axis: 'Parallel Reasoning',  deficit: 37, drill: '5 LR parallel sets',     eta: '~18 min', prio: 'high' as const },
  { rank: 3, axis: 'Principle',           deficit: 35, drill: 'Doctrine §37 drill',      eta: '~12 min', prio: 'high' as const },
  { rank: 4, axis: 'Sufficient Assumption', deficit: 32, drill: 'Negate-the-bridge set', eta: '~15 min', prio: 'med' as const },
  { rank: 5, axis: 'Inference',           deficit: 28, drill: '6-question timed set',    eta: '~14 min', prio: 'med' as const },
];

function RadarChart({ axes }: { axes: typeof MOCK_AXES }) {
  const t = useTheme();
  const cx = 220, cy = 210, r = 160;
  const n = axes.length;
  const pt = (i: number, v: number): [number, number] => {
    const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
    const rad = (v / 100) * r;
    return [cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad];
  };
  const poly = axes.map((a, i) => pt(i, a.v).join(',')).join(' ');

  return (
    <svg width="100%" viewBox="0 0 440 420">
      <defs>
        <radialGradient id="v2radar">
          <stop offset="0" stopColor={t.accent} stopOpacity="0.4" />
          <stop offset="1" stopColor={t.accent} stopOpacity="0.06" />
        </radialGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map(f => (
        <polygon key={f} points={axes.map((_, i) => pt(i, f * 100).join(',')).join(' ')}
          fill="none" stroke={t.border} strokeWidth={1} />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pt(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={t.border} strokeWidth={0.8} />;
      })}
      <polygon points={poly} fill="url(#v2radar)" stroke={t.accent} strokeWidth={2} />
      {axes.map((a, i) => {
        const [x, y] = pt(i, a.v);
        return <circle key={a.k} cx={x} cy={y} r={3} fill={t.accent} />;
      })}
      {axes.map((a, i) => {
        const [x, y] = pt(i, 120);
        const ta = i === 0 ? 'middle' : x > cx ? 'start' : 'end';
        return (
          <text key={a.k} x={x} y={y} fontSize={10} fill={t.ink3} textAnchor={ta} fontFamily={t.fonts.mono}>
            {a.k.split(' ')[0].slice(0, 11).toUpperCase()}
          </text>
        );
      })}
    </svg>
  );
}

export function ProfileViewV2({ user, cogMap, setScreen }: {
  user: User; cogMap: CognitiveMap | null; setScreen: (s: Screen) => void;
}) {
  const t = useTheme();
  const name = user?.display_name || (user?.email ? user.email.split('@')[0] : 'friend');
  const iq = cogMap?.iq_index ?? 127;
  const eq = cogMap?.eq_index ?? 94;
  const thr = cogMap?.threshold_index ?? 88;
  const growthIq = cogMap?.growth_arc?.iq_delta ?? 12;

  return (
    <div style={{ padding: '28px 48px 64px', maxWidth: 1320, margin: '0 auto', fontFamily: t.fonts.sans }}>
      {/* Hero row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Glass padding={22}>
          <div style={{ fontSize: 11, color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
            {name} · Cycle 14
          </div>
          <H level={1} style={{ fontSize: 52, letterSpacing: -2, marginBottom: 8 }}>
            The <span style={{ fontStyle: 'italic', color: t.accent }}>Architect</span>
          </H>
          <div style={{ fontFamily: t.fonts.serif, fontSize: 17, color: t.ink2, lineHeight: 1.5, letterSpacing: -0.2, maxWidth: 480 }}>
            Strong structural instincts and tactic recognition. Walkback discipline and endurance past minute 38 are the two levers for the next cycle.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <Chip tone="accent">Elite Tier</Chip>
            <Chip>214 sessions</Chip>
            <Chip>Streak 37</Chip>
          </div>
        </Glass>
        <Glass padding={20}>
          <div style={{ fontSize: 11, color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Cognitive Index</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
            <H level={1} style={{ fontSize: 60, letterSpacing: -2.5 }}>{iq}</H>
            <span style={{ color: t.success, fontSize: 13 }}>▲ +{growthIq} cycle</span>
          </div>
          <Meter value={iq} max={180} style={{ marginBottom: 6 }} />
          <div style={{ fontSize: 12, color: t.ink3 }}>
            {cogMap?.learning_modality || 'Visual-Structural'} · top 12% cohort
          </div>
        </Glass>
        <Glass padding={20}>
          <div style={{ fontSize: 11, color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>LSAT Trajectory</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <H level={1} style={{ fontSize: 52, letterSpacing: -2 }}>165</H>
            <span style={{ color: t.ink3, fontSize: 13 }}>→ <span style={{ color: t.accent }}>188</span></span>
          </div>
          <div style={{ fontSize: 12, color: t.ink3, marginBottom: 10 }}>23pt gap · projected cycle 16</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: t.ink3, marginBottom: 3 }}>EQ</div>
              <div style={{ fontFamily: t.fonts.mono, fontSize: 18, color: t.ink }}>{eq}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: t.ink3, marginBottom: 3 }}>THRESHOLD</div>
              <div style={{ fontFamily: t.fonts.mono, fontSize: 18, color: t.ink }}>{thr}</div>
            </div>
          </div>
        </Glass>
      </div>

      {/* Radar + axes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Glass padding={22}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <H level={3}>10-axis profile</H>
            <Chip tone="ai" icon={<Sparkle size={10} />}>Live calibration</Chip>
          </div>
          <RadarChart axes={MOCK_AXES} />
        </Glass>
        <Glass padding={22}>
          <H level={3} style={{ marginBottom: 14 }}>Axis breakdown</H>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MOCK_AXES.map(a => (
              <div key={a.k} style={{ display: 'grid', gridTemplateColumns: '1.6fr 2fr 48px 36px', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 12, color: t.ink, letterSpacing: -0.1 }}>{a.k}</div>
                <Meter value={a.v} h={4} />
                <div style={{ fontFamily: t.fonts.mono, fontSize: 12, color: t.ink, textAlign: 'right' }}>{a.v}</div>
                <div style={{ fontFamily: t.fonts.mono, fontSize: 11, color: a.d >= 0 ? t.success : t.danger, textAlign: 'right' }}>
                  {a.d >= 0 ? '+' : ''}{a.d}
                </div>
              </div>
            ))}
          </div>
        </Glass>
      </div>

      {/* Plan of attack */}
      <Glass padding={22}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <H level={3}>Today's plan</H>
          <div style={{ display: 'flex', gap: 6 }}>
            <Chip tone="ai" icon={<Sparkle size={10} />}>Ranked by EV</Chip>
            <Chip>5 drills queued</Chip>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MOCK_PLAN.map(p => (
            <div key={p.rank} style={{
              display: 'grid', gridTemplateColumns: '30px 1.2fr 2fr 100px 100px 80px', alignItems: 'center', gap: 14,
              padding: '12px 14px', borderRadius: 10, background: t.bgElev, border: `1px solid ${t.border}`,
            }}>
              <div style={{ fontFamily: t.fonts.serif, fontSize: 22, color: t.accent, letterSpacing: -0.5 }}>{p.rank}</div>
              <div style={{ fontSize: 14, color: t.ink, fontWeight: 500 }}>{p.axis}</div>
              <div style={{ fontSize: 13, color: t.ink2 }}>{p.drill}</div>
              <Chip tone={p.prio === 'critical' ? 'danger' : p.prio === 'high' ? 'warn' : 'neutral'}>{p.prio}</Chip>
              <div style={{ fontFamily: t.fonts.mono, fontSize: 12, color: t.ink3 }}>{p.eta}</div>
              <Btn variant="ai" size="sm" onClick={() => setScreen('tutor')}>Start</Btn>
            </div>
          ))}
        </div>
      </Glass>

      {/* Cognitive map detail */}
      {cogMap && (
        <Glass padding={20} style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
            <H level={3}>Supabase cognitive map</H>
            <Chip tone="neutral">v{cogMap.map_version ?? 1}</Chip>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: t.ink3, marginBottom: 4 }}>Learning modality</div>
              <div style={{ fontSize: 14, color: t.ink }}>{cogMap.learning_modality || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: t.ink3, marginBottom: 4 }}>Communication style</div>
              <div style={{ fontSize: 14, color: t.ink }}>{cogMap.communication_style || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: t.ink3, marginBottom: 4 }}>Confidence</div>
              <div style={{ fontSize: 14, color: t.ink }}>{cogMap.confidence || '—'}</div>
            </div>
          </div>
          {cogMap.mapping_notes && (
            <div style={{ padding: 14, borderRadius: 10, background: t.bgElev, border: `1px solid ${t.border}`, fontSize: 13, color: t.ink2, lineHeight: 1.5 }}>
              {cogMap.mapping_notes}
            </div>
          )}
        </Glass>
      )}
    </div>
  );
}
