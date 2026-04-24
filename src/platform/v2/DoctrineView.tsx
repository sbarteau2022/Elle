import React, { useState } from 'react';
import { useTheme } from './ThemeProvider';
import { Glass, Chip, H, Sparkle, Btn, Meter, Caret } from './primitives';
import type { DoctrineItem } from '../../lib/types';

const DOCTRINE_48: DoctrineItem[] = [
  { n: 3,  name: 'Conceal your intentions',             mastery: 0.78, ctx: 'Frame reveal' },
  { n: 8,  name: 'Make others come to you',             mastery: 0.84, ctx: 'Bait onto terrain' },
  { n: 15, name: 'Crush your enemy totally',            mastery: 0.42, ctx: 'Closing duels' },
  { n: 21, name: 'Play a sucker to catch a sucker',     mastery: 0.60, ctx: 'Feint naivety' },
  { n: 24, name: 'Play the perfect courtier',           mastery: 0.71, ctx: 'Appeal to authority' },
  { n: 33, name: "Discover each man's thumbscrew",      mastery: 0.58, ctx: 'Pressure point' },
  { n: 37, name: 'Create compelling spectacles',        mastery: 0.49, ctx: 'Appeal to consequence' },
  { n: 48, name: 'Assume formlessness',                 mastery: 0.35, ctx: 'Avoid commitment' },
];

const DOCTRINE_AOW: DoctrineItem[] = [
  { n: 'I.5',    name: 'Energy · orthodox vs extraordinary', mastery: 0.62 },
  { n: 'III.18', name: 'Know enemy and know yourself',       mastery: 0.80 },
  { n: 'VI.23',  name: 'Ground · narrow defiles',            mastery: 0.55 },
  { n: 'VII.7',  name: 'Tortuous course straightens',        mastery: 0.48 },
];

export function DoctrineView() {
  const t = useTheme();
  const [tab, setTab] = useState<'48' | 'aow'>('48');
  const [sel, setSel] = useState<DoctrineItem>(DOCTRINE_48[2]);
  const list = tab === '48' ? DOCTRINE_48 : DOCTRINE_AOW;

  return (
    <div style={{ padding: '28px 48px 64px', maxWidth: 1320, margin: '0 auto', fontFamily: t.fonts.sans,
      display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14 }}>
      <Glass padding={0} style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 18px', borderBottom: `1px solid ${t.border}` }}>
          <H level={3}>Doctrine library</H>
          <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
            {([{ k: '48', label: '48 Laws · 48' }, { k: 'aow', label: 'Art of War · 13' }] as const).map(x => (
              <button key={x.k} onClick={() => setTab(x.k)}
                style={{ padding: '6px 12px', borderRadius: 8, border: 'none',
                  background: tab === x.k ? t.accentSoft : 'transparent',
                  color: tab === x.k ? t.accent : t.ink2,
                  fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }}>{x.label}</button>
            ))}
          </div>
        </div>
        <div style={{ maxHeight: 620, overflow: 'auto' }}>
          {list.map(l => (
            <div key={String(l.n)} onClick={() => setSel(l)}
              style={{ padding: '14px 18px', borderBottom: `1px solid ${t.border}`, cursor: 'pointer',
                background: sel === l ? t.accentSoft : 'transparent',
                borderLeft: sel === l ? `2px solid ${t.accent}` : '2px solid transparent' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                <span style={{ fontFamily: t.fonts.mono, fontSize: 11, color: t.accent }}>
                  {tab === '48' ? '§' + l.n : l.n}
                </span>
                <span style={{ fontSize: 13, color: t.ink, flex: 1, letterSpacing: -0.1 }}>{l.name}</span>
                <span style={{ fontFamily: t.fonts.mono, fontSize: 11, color: t.ink3 }}>{Math.round(l.mastery * 100)}</span>
              </div>
              <Meter value={l.mastery} max={1} h={2} />
            </div>
          ))}
        </div>
      </Glass>

      <Glass padding={26}>
        <Chip tone="accent">{tab === '48' ? '§' + sel.n : sel.n}</Chip>
        <H level={1} style={{ fontSize: 42, letterSpacing: -1.5, marginTop: 10, marginBottom: 16 }}>
          <span style={{ fontStyle: 'italic' }}>{sel.name}</span>
        </H>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Your mastery</div>
            <div style={{ fontFamily: t.fonts.serif, fontSize: 40, color: t.ink, letterSpacing: -1 }}>{Math.round(sel.mastery * 100)}</div>
            <Meter value={sel.mastery} max={1} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Context</div>
            <div style={{ fontSize: 14, color: t.ink }}>{sel.ctx || 'General'}</div>
            <div style={{ fontSize: 12, color: t.ink3, marginTop: 4 }}>Deployed 14× against you this cycle</div>
          </div>
        </div>
        <div style={{ padding: 16, borderRadius: 12, border: `1px dashed ${t.accent}60`, background: t.accentSoft }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Sparkle size={12} />
            <span style={{ fontSize: 11, color: t.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Elle · synthesis</span>
          </div>
          <div style={{ fontFamily: t.fonts.serif, fontSize: 17, color: t.ink2, lineHeight: 1.5, letterSpacing: -0.2 }}>
            This law shows up in <span style={{ color: t.accent }}>appeal-to-consequence</span> attacks — Cerberus uses it three times per duel on average. Counter by naming the fallacy and demanding a structural claim. Your recognition improves 28% when you verbalize the tactic first.<Caret />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <Btn variant="primary" icon={<Sparkle size={11} color="#fff" />}>Drill this law · 12 reps</Btn>
          <Btn variant="ghost">See deployments (14)</Btn>
        </div>
      </Glass>
    </div>
  );
}
