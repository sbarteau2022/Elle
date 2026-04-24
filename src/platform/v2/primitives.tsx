import React, { useState } from 'react';
import { useTheme } from './ThemeProvider';

export function Glass({ children, style = {}, hover, onClick, padding = 18 }: {
  children: React.ReactNode; style?: React.CSSProperties;
  hover?: boolean; onClick?: () => void; padding?: number;
}) {
  const t = useTheme();
  const [h, setH] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        background: t.bgElev, backdropFilter: 'blur(22px) saturate(1.3)',
        WebkitBackdropFilter: 'blur(22px) saturate(1.3)',
        border: `1px solid ${h && hover ? t.borderStrong : t.border}`,
        borderRadius: 14, padding, position: 'relative',
        transition: 'border-color .15s, box-shadow .15s',
        boxShadow: h && hover ? '0 8px 24px rgba(0,0,0,0.08)' : 'none',
        cursor: onClick ? 'pointer' : undefined, ...style,
      }}>{children}</div>
  );
}

export function Chip({ children, tone = 'neutral', icon, onClick, style = {} }: {
  children: React.ReactNode; tone?: string; icon?: React.ReactNode;
  onClick?: () => void; style?: React.CSSProperties;
}) {
  const t = useTheme();
  const toneMap: Record<string, { bg: string; color: string; border: string }> = {
    neutral: { bg: t.surfaceSoft, color: t.ink2, border: t.border },
    accent:  { bg: t.accentSoft, color: t.accent, border: `${t.accent}33` },
    success: { bg: t.success + '1a', color: t.success, border: t.success + '33' },
    warn:    { bg: t.warn + '1a', color: t.warn, border: t.warn + '33' },
    danger:  { bg: t.danger + '1a', color: t.danger, border: t.danger + '33' },
    ai:      { bg: 'transparent', color: t.accent, border: t.accent + '44' },
  };
  const m = toneMap[tone] || toneMap.neutral;
  return (
    <span onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 500,
      letterSpacing: 0.2, background: m.bg, color: m.color,
      border: `1px solid ${m.border}`, fontFamily: t.fonts.sans,
      whiteSpace: 'nowrap', cursor: onClick ? 'pointer' : undefined, ...style,
    }}>{icon}{children}</span>
  );
}

export function H({ level = 1, children, style = {}, mono }: {
  level?: number; children: React.ReactNode; style?: React.CSSProperties; mono?: boolean;
}) {
  const t = useTheme();
  const sizes: Record<number,number> = { 1:42,2:28,3:22,4:18,5:15 };
  const weights: Record<number,number> = { 1:400,2:400,3:500,4:500,5:600 };
  return (
    <div style={{
      fontFamily: mono ? t.fonts.mono : t.fonts.serif,
      fontSize: sizes[level], fontWeight: weights[level],
      color: t.ink, letterSpacing: level <= 2 ? -0.8 : -0.2, lineHeight: 1.1, ...style,
    }}>{children}</div>
  );
}

export function Sparkle({ size = 14, color, style = {} }: { size?: number; color?: string; style?: React.CSSProperties }) {
  const t = useTheme();
  const id = `sp${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" style={style}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color || t.accent} />
          <stop offset="1" stopColor={color || t.accent2} />
        </linearGradient>
      </defs>
      <path d="M7 0L8.4 5.6L14 7L8.4 8.4L7 14L5.6 8.4L0 7L5.6 5.6z" fill={`url(#${id})`} />
    </svg>
  );
}

export function Btn({ children, variant = 'primary', size = 'md', icon, iconRight, onClick, style = {} }: {
  children: React.ReactNode; variant?: 'primary'|'ghost'|'ai'; size?: 'sm'|'md'|'lg';
  icon?: React.ReactNode; iconRight?: React.ReactNode; onClick?: () => void; style?: React.CSSProperties;
}) {
  const t = useTheme();
  const [h, setH] = useState(false);
  const paddings = { sm:'6px 12px', md:'9px 16px', lg:'12px 22px' };
  const fs = { sm:12, md:13, lg:14 };
  const variants = {
    primary: { background: h ? t.accent : t.aiGrad, color:'#fff', border:`1px solid ${t.accent}`, boxShadow:`0 4px 16px ${t.accent}40` },
    ghost:   { background: h ? t.surfaceSoft : 'transparent', color:t.ink, border:`1px solid ${t.border}` },
    ai:      { background: h ? t.accentTint : t.accentSoft, color:t.accent, border:`1px solid ${t.accent}40` },
  };
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        display:'inline-flex', alignItems:'center', gap:7,
        padding: paddings[size], fontSize: fs[size], fontWeight:500,
        fontFamily: t.fonts.sans, borderRadius:10, cursor:'pointer',
        transition:'all .15s', letterSpacing:-0.1,
        ...variants[variant], ...style,
      }}>{icon}{children}{iconRight}</button>
  );
}

export function Meter({ value, max = 100, h = 3, color, track, style = {} }: {
  value: number; max?: number; h?: number; color?: string; track?: string; style?: React.CSSProperties;
}) {
  const t = useTheme();
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div style={{ height:h, background: track||t.surfaceSoft, borderRadius:h, overflow:'hidden', ...style }}>
      <div style={{ height:'100%', width:`${pct*100}%`, background:color||t.aiGrad, borderRadius:h, transition:'width .3s ease' }} />
    </div>
  );
}

export function Caret() {
  const t = useTheme();
  return <span style={{ display:'inline-block', width:7, height:14, background:t.accent, marginLeft:2, verticalAlign:'middle', animation:'elle2Blink 1s step-end infinite' }} />;
}
