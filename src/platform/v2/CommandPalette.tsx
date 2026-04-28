import React, { useState, useEffect } from 'react';
import { useTheme } from './ThemeProvider';
import { Chip, Sparkle } from './primitives';
import type { Screen } from '../../lib/types';

const ITEMS: { k: string; icon: string; label: string; sub: string; tab: Screen }[] = [
  { k:'duel',     icon:'⚔', label:'Start a duel',             sub:'LR · Necessary Assumption',  tab:'warroom'  },
  { k:'warmup',   icon:'✦', label:'Warm up · 3 LR questions', sub:'~9 minutes',                  tab:'tutor'    },
  { k:'weakness', icon:'◎', label:'Drill my weakest axis',     sub:'Walkback — deficit 45',       tab:'tutor'    },
  { k:'autopsy',  icon:'✧', label:'Explain last autopsy',      sub:'WR-4402 · win · 14 turns',    tab:'replays'  },
  { k:'doctrine', icon:'✺', label:'Open doctrine library',     sub:'48 Laws + Art of War',        tab:'doctrine' },
  { k:'profile',  icon:'◈', label:'Jump to Cognitive Profile', sub:'Cog-Idx · your map',         tab:'profile'  },
];

export function CommandPalette({ open, onClose, setScreen }: {
  open: boolean; onClose: () => void; setScreen: (s: Screen) => void;
}) {
  const t = useTheme();
  const [q, setQ] = useState('');

  useEffect(() => {
    if (open) setTimeout(() => document.getElementById('elle2-pal')?.focus(), 50);
  }, [open]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  if (!open) return null;

  const items = ITEMS.filter(i => !q || i.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:50, background:'rgba(12,10,8,0.55)', backdropFilter:'blur(6px)', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:120 }}>
      <div onClick={e => e.stopPropagation()} style={{ width:560, background:t.surface, border:`1px solid ${t.borderStrong}`, borderRadius:16, boxShadow:'0 30px 80px rgba(0,0,0,0.3)', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', borderBottom:`1px solid ${t.border}` }}>
          <Sparkle size={16} />
          <input id="elle2-pal" value={q} onChange={e => setQ(e.target.value)}
            placeholder="Ask Elle anything — or jump somewhere"
            style={{ flex:1, background:'transparent', border:'none', outline:'none', fontFamily:t.fonts.sans, fontSize:15, color:t.ink, letterSpacing:-0.2 }} />
          <Chip>ESC</Chip>
        </div>
        <div style={{ padding:8, maxHeight:340, overflow:'auto' }}>
          {items.map((i,idx) => (
            <div key={i.k} onClick={() => { setScreen(i.tab); onClose(); setQ(''); }}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:10, cursor:'pointer', background:idx===0?t.accentSoft:'transparent' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background=t.surfaceSoft}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background=idx===0?t.accentSoft:'transparent'}>
              <div style={{ width:28, height:28, borderRadius:8, background:t.accentSoft, color:t.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>{i.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ color:t.ink, fontFamily:t.fonts.sans, fontSize:13, fontWeight:500 }}>{i.label}</div>
                <div style={{ color:t.ink3, fontSize:11, marginTop:1 }}>{i.sub}</div>
              </div>
              <span style={{ color:t.ink3, fontSize:11 }}>↵</span>
            </div>
          ))}
        </div>
        <div style={{ padding:'10px 16px', borderTop:`1px solid ${t.border}`, display:'flex', gap:14, fontSize:11, color:t.ink3, fontFamily:t.fonts.sans }}>
          <span>↑↓ navigate</span><span>↵ select</span><span>⌘K close</span>
          <span style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:4 }}><Sparkle size={10} /> Powered by reasoning trace</span>
        </div>
      </div>
    </div>
  );
}
